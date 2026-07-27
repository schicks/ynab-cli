# Evaluating whether a category's Target is correct

A workflow for deciding whether a category's target ("goal" in the YNAB API) is set too high,
too low, or is well-calibrated — by comparing it against actual historical spending in that
category, rather than guessing from the target alone.

## Why look at history at all

A target is just a number someone typed in once. It can go stale: spending habits change, a
subscription's price goes up, a "just in case" target never gets used. Comparing it against
several months of real `activity` in that category is what actually tells you whether it's still
the right number.

## Data needed

1. **The target itself** — `cliynab categories targets` gives `{ id, name, goalType, target,
   percentComplete, stillNeeded }` for every category that has one. Find the category by name to
   get its `id`, `goalType`, and `target`.

   Caveat: `goalType` alone doesn't tell you the goal's *cadence* (monthly vs. weekly vs. yearly)
   or whether it's a "Set aside" vs. "Refill" NEED goal — the API exposes `goal_cadence`,
   `goal_cadence_frequency`, and `goal_needs_whole_amount` for that, but `cliynab` doesn't
   currently have a command surfacing them. If the cadence matters for the comparison you're
   doing, fetch `GET /plans/{plan_id}/categories/{category_id}` directly for those fields.

2. **Historical monthly spend for that category** — not yet exposed by any `cliynab` command
   (categories targets only gives current-month goal progress, not a history). Until a command
   exists for it, pull it directly from the YNAB API: `GET
   /plans/{plan_id}/months/{month}/categories/{category_id}`, one call per month, reading
   `data.category.activity_currency` (negative = money spent out of the category, positive =
   inflow/refund). Auth uses the same access token `cliynab` already stored after `login`, at
   `~/.cliynab/config.json` (`accessToken` field) — no separate credential needed.

## Steps

1. **Find the category.**
   ```
   cliynab categories targets | from json | where name =~ "groceries"
   ```
2. **Pick a comparison window.** 6-12 months is usually enough to average out one-off months
   without averaging away real seasonality (e.g. a "Gifts" category spiking every December should
   stay visible at 12 months, not get smoothed out). Skip the current, still-in-progress month —
   it's not comparable to a completed month.
3. **Pull the history and compute summary stats** (verified working against the real API in this
   nu version — see the script below). Use both average and median: a single large medical bill
   or annual renewal shouldn't single-handedly justify raising a monthly target, and median is
   more robust to that than average.
4. **Compare against the target, by goal type:**
   - **NEED, "Set aside" (`goal_needs_whole_amount: true`), monthly cadence** — compare the target
     directly to average/median monthly spend. Spend consistently well below target → target's
     probably too high (money sits unused every month). Spend consistently at or above target →
     too low (chronic overspend/underfunding).
   - **NEED, "Refill" (`goal_needs_whole_amount: false`)** — expect more month-to-month
     carryover by design; lean on median and on whether the balance is trending toward zero over
     the window rather than reacting to any single low-spend month.
   - **MF (Monthly Funding)** — same average-vs-target comparison as "Set aside" NEED goals;
     monthly cadence is inherent to this goal type.
   - **TB / TBD (Target Category Balance / by Date)** — these fund toward a one-time total, not a
     recurring monthly amount. Compare the target to the total remaining need for that known
     expense (e.g. a planned purchase), not to typical monthly `activity` — monthly averaging is
     the wrong lens here and will produce a misleading recommendation.
   - **DEBT** — the target generally mirrors a linked loan account's balance/payment schedule;
     compare against that account's data (`cliynab accounts list`), not category spending history.
5. **Cross-check current-month progress.** If `percentComplete`/`stillNeeded` from `cliynab
   categories targets` is chronically stuck near 0% partway through the funding period, that's a
   second signal — though note it can also mean a budgeting/funding-priority problem rather than
   a wrong target, so don't treat it as conclusive on its own.
6. **Report the numbers, not just a verdict.** State the target, the average, the median, and the
   window used, and let the delta speak for itself — a human should confirm before anything about
   the target actually gets changed (`cliynab` has no write commands yet regardless).

## Nushell script (verified against the real API)

```nu
let token = (open ~/.cliynab/config.json | get accessToken)
let category_id = "<category id from step 1>"
let budget = "last-used"
let now = (date now | date to-record)

# Last 6 calendar months, oldest-safe (handles month-length/year-boundary correctly,
# unlike subtracting a fixed N * 30day duration which drifts).
let months = (0..5 | each { |i|
  let total_months = ($now.year * 12 + ($now.month - 1) - $i)
  let year = ($total_months // 12)
  let month = ($total_months mod 12) + 1
  $"($year)-($month | fill -a right -c '0' -w 2)-01"
})

let history = ($months | each { |m|
  let res = (http get $"https://api.ynab.com/v1/plans/($budget)/months/($m)/categories/($category_id)" -H [Authorization $"Bearer ($token)"])
  { month: $m, spent: ($res.data.category.activity_currency * -1) }
})

$history
{ avg: ($history | get spent | math avg), median: ($history | get spent | math median) }
```

Example output shape (synthetic numbers, not a real budget):

```
╭───┬────────────┬────────╮
│ # │   month    │ spent  │
├───┼────────────┼────────┤
│ 0 │ 2026-07-01 │ 480.00 │
│ 1 │ 2026-06-01 │ 512.30 │
│ 2 │ 2026-05-01 │ 398.75 │
│ 3 │ 2026-04-01 │ 505.10 │
│ 4 │ 2026-03-01 │ 610.40 │
│ 5 │ 2026-02-01 │ 470.00 │
╰───┴────────────┴────────╯

╭────────┬────────╮
│ avg    │ 496.09 │
│ median │ 489.15 │
╰────────┴────────╯
```

If the category's target were, say, `700`, this would suggest it's set noticeably higher than
actual need (~40% above both average and median) — worth flagging as a candidate to lower, with
these exact numbers as the justification.
