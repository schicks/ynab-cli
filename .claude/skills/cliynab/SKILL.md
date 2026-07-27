---
name: cliynab
description: How to use the cliynab YNAB CLI - piping its output through nushell for filtering/sorting/reporting on budget data, and filing user feedback about the tool itself as a GitHub issue. Use whenever asked to inspect, analyze, or report on YNAB budgets/accounts/categories via cliynab, or when a user reports a bug, unexpected behavior, or feature request about cliynab.
---

# Using cliynab

`cliynab` is a CLI for YNAB (You Need A Budget). It needs a one-time `cliynab login` (OAuth,
opens a browser) before any other command works — if a command errors about not being logged in
or an expired token, that's the fix.

## Output convention

Every data-returning command follows the same shape:

- **Table commands** (return a list of rows) print a **JSON array by default**. Pipe with
  `from json` to get a fully-typed nushell table — numbers stay numbers, `null` stays `null`,
  no manual type coercion needed. Pass `--tsv` instead to get headered tab-separated output (a
  header row, then one row per line) if you need it for something other than nushell.
- **Scalar commands** (return a single answer, not a table) print plain, unquoted text to stdout.
  Capture directly with `(cliynab ...)` — no `from json` needed.

`cliynab` never prompts interactively for these commands and never mixes log/status lines into
stdout, so its output is always safe to pipe directly.

## Commands and their fields

- `cliynab budgets list [--tsv]` → `{ id, name }[]`
- `cliynab accounts list [budgetId] [--tsv]` → `{ id, name, cleared, uncleared }[]` (`cleared`/
  `uncleared` are decimal currency amounts, e.g. `-543.21`, not milliunits). `budgetId` defaults
  to `last-used`.
- `cliynab categories targets [budgetId] [--tsv]` →
  `{ id, name, goalType, target, percentComplete, stillNeeded }[]`. Only categories with a target
  ("goal" in the API) set are included; `goalType` is one of `TB`, `TBD`, `MF`, `NEED`, `DEBT`.
  `percentComplete`/`stillNeeded` come back `null` when a goal exists but hasn't started funding
  this month yet. `budgetId` defaults to `last-used`.
- `cliynab skill install [path]` — (re-)installs this skill (this file plus its `assets/`) into
  `path` (default `.claude/skills/cliynab`) in any project.

## Example pipelines

```
# Accounts currently in the red, sorted worst-first
cliynab accounts list | from json | where cleared < 0 | sort-by cleared

# NEED-type category goals that still need funding this month, worst-first
# (stillNeeded can be null - guard it before comparing, or nushell errors on the comparison)
cliynab categories targets | from json | where goalType == "NEED" and stillNeeded != null and stillNeeded > 0 | sort-by stillNeeded --reverse

# Total cleared balance across all accounts
cliynab accounts list | from json | get cleared | math sum

# TSV instead, for something other than nushell
cliynab accounts list --tsv > accounts.tsv
```

## Notes

- `budgetId`/`plan_id` arguments accept a real budget UUID (from `cliynab budgets list`) or the
  literal string `last-used`, which the YNAB API resolves server-side — you usually don't need to
  look up an ID first.
- Field names are intentionally short and camelCase, not the raw YNAB API's snake_case
  (`cleared_balance_currency` → `cleared`) — these are the exact keys to use in `where`/`get`/
  `sort-by`.

## Assets

- `assets/evaluate-target.md` — a workflow for deciding whether a category's target is set too
  high, too low, or is well-calibrated, by comparing it against several months of actual spending
  in that category. Open this whenever asked to evaluate, sanity-check, or recommend a change to
  a category's target/goal.
- `assets/file-bug-report.md` — a workflow for turning a bug report, unexpected behavior, or
  feature request about `cliynab` into a GitHub issue on its repo via `gh`. Open this whenever a
  user reports something wrong with `cliynab`, or asks to file/report/submit feedback about it.
