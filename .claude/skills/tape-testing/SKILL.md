---
name: tape-testing
description: Write and maintain tape-based (VCR-style) tests for cliynab command executors — recording real YNAB API calls to fixture files ("tapes"), anonymizing them, and replaying them offline in bun test. Use when adding a new command, adding a new code path to an existing command, or when a tape needs to be re-recorded because the API response shape changed.
---

# Tape testing for cliynab

Tests in this repo hit a fake local HTTP server (via [`talkback`](https://github.com/ijpiantanida/talkback))
that replays a recorded, anonymized fixture ("tape") instead of the real YNAB API. This makes
`bun test` fast, offline, and safe to run in pre-commit without needing real credentials.

## Scope: test executors, not the CLI

Test the **command executor function** (the plain async function that takes a client and returns
data — e.g. `listBudgets(client)` in `src/commands/budgets.ts`), not the `commander` `.action()`
wiring around it. The CLI argument-parsing/wiring layer is low-risk (it's a thin pass-through to
the executor) and expensive to test meaningfully (would mean spawning the built CLI or mocking
stdin/stdout/process.exit). Every command file should export its executor function separately from
the `Command` object specifically so it can be imported directly in tests.

## The workflow

Follow all five steps for every new test — don't skip the record/anonymize steps by hand-writing
a tape from scratch. Hand-written tapes drift from what the real API actually returns.

### 1. Write the test first, pointing at an empty tapes directory

Create `src/commands/<name>.test.ts` next to the command file, and a
`src/commands/<name>.test.tapes/` directory next to it (this exact naming — `*.test.tapes/` — is
covered by `.oxignore` so oxlint/oxfmt don't try to treat fixtures as source). Use `withTape` from
`src/testing/tape.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { withTape } from "../testing/tape";
import { listBudgets } from "./budgets";

describe("listBudgets", () => {
  test("returns each budget's id and name", async () => {
    await withTape(`${import.meta.dir}/budgets.test.tapes`, async ({ client }) => {
      const budgets = await listBudgets(client);
      expect(budgets.map((b) => ({ id: b.id, name: b.name }))).toEqual([
        // fill in after recording + anonymizing, see below
      ]);
    });
  });
});
```

Write real (or best-guess) assertions if you can, but it's fine to leave a placeholder — you'll
fix it against the anonymized data in step 4 anyway.

### 2. Record a real tape

You need a real, currently-valid access token. Get one from `~/.cliynab/config.json` (the
`accessToken` field) after running `cliynab login`, or generate one fresh if it's expired.

```
TAPE_RECORD=1 YNAB_RECORD_TOKEN=<real access token> bun test src/commands/<name>.test.ts
```

This makes a real request to `https://api.ynab.com` through the talkback proxy and writes the raw
response to `src/commands/<name>.test.tapes/unnamed-<timestamp>.json5`. The test will likely
*fail* at this point since your assertions don't match real account data yet — that's expected,
ignore it for now.

### 3. Anonymize the tape into a minimal reproducing example

Open the recorded `.json5` file and edit it by hand:

- **Strip response headers down to the essentials.** Real responses carry a pile of
  Heroku/Cloudflare tracing headers (`x-request-id`, `cf-ray`, `heroku-dyno-id`, `report-to`,
  `nel`, etc.) that are irrelevant noise. Keep only `content-type` (needed so the client parses
  the body as JSON) unless a specific test cares about another header.
- **Replace every real value with an obviously-fake one**, while keeping the JSON *shape*
  identical to what the real API returned: budget/account/category/payee names → things like
  `"Test Budget"`, `"Second Budget"`; UUIDs → easy-to-read patterns like
  `"11111111-1111-1111-1111-111111111111"`, `"22222222-..."`; real dates → any plausible fake
  date; dollar amounts → round fake numbers. Never let a real token, real account name, or real
  dollar amount end up in a committed tape.
- **Trim to the minimum needed to exercise the behavior under test.** If the executor only reads
  `id` and `name`, you can still keep the other required fields (the response schema requires
  them), but don't preserve every incidental detail from the real response if it doesn't matter —
  e.g. collapse to 1-2 example budgets instead of however many the real account had.
- **Rename the file** from `unnamed-<timestamp>.json5` to something descriptive, e.g.
  `list-two-budgets.json5`. The filename doesn't affect matching (talkback matches by request
  method+url+body, not filename) — it's purely for humans browsing the directory.
- Leave `req.headers` as `{}` — the harness (see below) already discards all request headers when
  storing tapes, so there's nothing to anonymize there.

Look at `src/commands/budgets.test.tapes/list-two-budgets.json5` for a worked example.

### 4. Fix up the test's assertions

Update the test to assert against the anonymized values you just wrote into the tape, not the
real values from step 2.

### 5. Verify it passes fully offline

```
bun test src/commands/<name>.test.ts
```

No `TAPE_RECORD`, no token needed. If it fails with something like "Tape for ... not found and
recording is disabled", the request the executor made didn't match anything in the tape
directory — check the tape's `req.url`/`req.method`/`req.body` against what the executor actually
sends.

## Re-recording an existing tape

Same process: delete or move aside the old tape file(s) in the relevant `*.test.tapes/`
directory, then repeat steps 2-5. Do this when the API response shape changes (new fields, a
schema migration) or when a test needs to cover a new scenario (error response, empty list,
pagination, etc.) — each distinct scenario should generally get its own named tape file within
the same directory.

## Why the harness looks the way it does

`src/testing/tape.ts` wraps `talkback` with a few non-obvious settings — don't remove them without
understanding why they're there:

- `allowHeaders: []` — tapes are matched (and stored) by method+url+body only, ignoring all
  headers. Without this, the `Authorization` header (a real token while recording, a placeholder
  string while replaying) would make every replay fail to match, and `User-Agent` (which embeds
  the Bun version) would make tapes break on every Bun upgrade.
- `requestDecorator` forcing `Accept-Encoding: identity` — Bun's `fetch` negotiates gzip by
  default, and talkback's local replay server can't correctly re-serve a gzip-compressed body to
  a Bun HTTP client (a Bun/talkback interaction bug, not anything YNAB-specific). Requesting
  identity encoding on the real upstream request during recording avoids ever hitting this.
- `responseDecorator` stripping `transfer-encoding` — Bun's `node:http` server compat doesn't
  correctly replay a raw body under a copied `transfer-encoding: chunked` header from a tape;
  dropping it lets Bun's own server decide framing when serving the response.

These are all test-harness-only workarounds for Bun/talkback quirks — production code
(`src/ynabClient.ts`) is untouched by any of this.
