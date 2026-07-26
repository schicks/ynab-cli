# cliynab

A YNAB CLI built with [Bun](https://bun.sh) and TypeScript, compiled to a standalone Windows executable.

## Setup

1. Register an OAuth application with YNAB at
   [ynab.com/settings/developer](https://app.ynab.com/settings/developer) → OAuth Applications →
   New Application. Set the Redirect URI to exactly:

   ```
   http://127.0.0.1:51739/callback
   ```

2. Create a `.env` file in the repo root with the Client ID from step 1:

   ```
   YNAB_CLIENT_ID=your-client-id
   ```

   The Client ID isn't a secret (it's a public identifier for the app), but it's still kept out
   of git — it's a property of *this build* of the app, not something that varies per user. It
   gets baked directly into the compiled executable at build time (see below), so end users of
   the built `cliynab.exe` never need this file.

3. Run:

   ```
   bun install
   bun run src/index.ts login
   ```

   This uses the [OAuth Implicit Grant](https://api.ynab.com/#outh-applications) flow (no client
   secret involved — appropriate for a distributed CLI, which can't keep a secret confidential
   anyway). It opens your browser to authorize with YNAB, spins up a short-lived local server on
   port `51739` to catch the redirect, and saves the resulting access token to
   `~/.cliynab/config.json`. The token lasts about 2 hours and there's no refresh token in this
   flow, so you'll need to re-run `login` periodically when it expires.

## Development

```
bun run src/index.ts <command>   # run from source, no build needed
bun run typecheck                # tsc --noEmit
bun run lint                     # oxlint
bun run fmt                      # oxfmt, writes fixes in place
bun run fmt:check                # oxfmt --check, no writes
```

`bun install` points git at `.githooks` (via the `postinstall` script), so a `pre-commit` hook
runs typecheck, lint, and format checks (all on their default rules/config) before every commit
and blocks it on failure. To bypass in a pinch: `git commit --no-verify`.

## Building / updating the executable

```
bun run build
```

This reads `YNAB_CLIENT_ID` from `.env`, bakes it into the bundle at compile time, and produces
`dist/cliynab.exe` — a standalone binary (no Bun/Node install, and no `.env`, required to run it).

To make it available anywhere on your machine, put `dist/` on your `PATH`, or copy the exe into
a directory that's already on `PATH`. After that, whenever you pull changes or make edits, just
re-run `bun run build` to update the binary in place.

## Commands

- `cliynab login` — authorize with YNAB via OAuth
- `cliynab budgets list` — list your budgets (smoke test for API connectivity)
