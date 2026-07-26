# cliynab

A YNAB CLI built with [Bun](https://bun.sh) and TypeScript, compiled to a standalone Windows executable.

## Setup

1. Register an OAuth application with YNAB at
   [ynab.com/settings/developer](https://app.ynab.com/settings/developer) → OAuth Applications →
   New Application. Set the Redirect URI to exactly:

   ```
   http://127.0.0.1:51739/callback
   ```

2. Run:

   ```
   bun install
   cliynab login
   ```

   The first run prompts for the Client ID / Client Secret from step 1 (or set `YNAB_CLIENT_ID`
   / `YNAB_CLIENT_SECRET` env vars to skip the prompt) and stores them in
   `~/.cliynab/config.json`. It then opens your browser to authorize with YNAB, spins up a
   short-lived local server on port `51739` to catch the redirect, and exchanges the code for an
   access + refresh token pair, also saved to the config file. Access tokens are refreshed
   automatically as needed — you shouldn't need to re-run `login` unless the refresh token itself
   is revoked.

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

This produces `dist/cliynab.exe`, a standalone binary (no Bun/Node install required to run it).

To make it available anywhere on your machine, put `dist/` on your `PATH`, or copy the exe into
a directory that's already on `PATH`. After that, whenever you pull changes or make edits, just
re-run `bun run build` to update the binary in place.

## Commands

- `cliynab login` — authorize with YNAB via OAuth
- `cliynab budgets list` — list your budgets (smoke test for API connectivity)
