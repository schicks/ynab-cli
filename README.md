# cliynab

A YNAB CLI built with [Bun](https://bun.sh) and TypeScript, compiled to a standalone Windows or Linux
executable.

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
bun run test                     # bun test
```

A `flake.nix` is provided for a reproducible toolchain (pins the Bun version
used locally and in CI). If you have [Nix](https://nixos.org) with flakes
enabled, run `nix develop` to drop into a shell with `bun` available, then
use the commands above as normal. It also exposes the compiled binaries as
package derivations — see [Building via Nix](#building-via-nix) below.

`bun install` points git at `.githooks` (via the `postinstall` script), so a `pre-commit` hook
runs typecheck, lint, format checks, and tests (all on their default rules/config) before every
commit and blocks it on failure. To bypass in a pinch: `git commit --no-verify`.

### Testing

Command executors (the plain functions behind each CLI command, e.g. `listBudgets` in
`src/commands/budgets.ts`) are tested against recorded, anonymized fixtures ("tapes") of real
YNAB API responses, replayed offline via [`talkback`](https://github.com/ijpiantanida/talkback) —
`bun test` never touches the real network or needs credentials. The CLI wiring itself
(`commander` argument parsing) isn't tested — see `.claude/skills/tape-testing/SKILL.md` for the
full record → anonymize → replay workflow and the reasoning behind it.

### Regenerating YNAB API types

`src/generated/ynab-openapi.d.ts` is generated from `openapi/ynab.yaml` (YNAB's published spec,
vendored into the repo) via [`openapi-typescript`](https://openapi-ts.dev). To pull a newer spec
and regenerate:

```
curl -sSL https://api.ynab.com/papi/open_api_spec.yaml -o openapi/ynab.yaml
bun run generate:types
```

Both the spec and the generated types are committed so the project builds without network access.

### The `.claude/skills/cliynab` skill and `cliynab skill install`

`.claude/skills/cliynab/` (`SKILL.md` plus its `assets/`) is a whole folder, and `cliynab skill
install` treats it as one — running from source, it reads that directory off disk directly, so
adding, removing, or editing a file there needs no code change and nothing to regenerate.
Compiled into `dist/cliynab.exe`, there's no source tree to read at runtime, so it falls back to
`src/generated/skill-files.ts`, a static-import manifest of the same folder that `bun run build`
regenerates automatically (`prebuild` script) before compiling. That generated file is also
committed so a fresh clone typechecks/tests without needing to run anything first; if you ever
need to refresh it by hand: `bun run generate:skill-manifest`.

## Building / updating the executable

```
bun run build              # -> dist/cliynab.exe (Windows)
bun run build -- linux     # -> dist/cliynab (Linux)
```

Both read `YNAB_CLIENT_ID` from `.env` and bake it into the bundle at compile time, producing a
standalone binary (no Bun/Node install, and no `.env`, required to run it).

To make it available anywhere on your machine, put `dist/` on your `PATH`, or copy the binary into
a directory that's already on `PATH`. After that, whenever you pull changes or make edits, just
re-run the build command to update the binary in place.

### Building via Nix

`flake.nix` also exposes both targets as real, hermetic package derivations — everything needed
(vendored `node_modules`, and for the Windows target, bun's cross-compile runtime) is fetched once
into content-addressed Fixed-Output Derivations, so the actual compile step runs with no network
access:

```
YNAB_CLIENT_ID=your-client-id nix build .#linux   --impure --no-eval-cache
YNAB_CLIENT_ID=your-client-id nix build .#windows --impure --no-eval-cache
```

`--impure` is required because the Client ID is threaded in from the environment (it's baked into
the binary but isn't a build secret — see above); `--no-eval-cache` avoids Nix serving back a
stale evaluation from a previous run with a different (or unset) `YNAB_CLIENT_ID`. Output lands at
`result/bin/cliynab` / `result/bin/cliynab.exe`.

## Commands

Data-returning commands print a JSON array by default (pipe with `from json` in
[nushell](https://www.nushell.sh) for a fully-typed table — numbers stay numbers, `null` stays
`null`), or pass `--tsv` for headered tab-separated output instead. See
`.claude/skills/cliynab/SKILL.md` for the full convention and example pipelines.

- `cliynab login` — authorize with YNAB via OAuth
- `cliynab budgets list [--tsv]` — list your budgets as `{ id, name }` rows (also a smoke test for
  API connectivity). Internally calls YNAB's `/plans` endpoint — YNAB's current API renamed
  "budgets" to "plans", but the CLI keeps the user-facing term "budgets" since that's still what
  the YNAB product itself calls them.
- `cliynab accounts list [budgetId] [--tsv]` — list accounts as `{ id, name, cleared, uncleared }`
  rows. `budgetId` defaults to `last-used`.
- `cliynab categories targets [budgetId] [--tsv]` — list categories that have a target/goal set,
  as `{ id, name, goalType, target, percentComplete, stillNeeded }` rows. Categories without a
  goal, and deleted categories, are excluded. `budgetId` defaults to `last-used`.
- `cliynab skill install [path]` — write the `cliynab` skill (the same folder linked above,
  `SKILL.md` plus its `assets/`) to `path` (default `.claude/skills/cliynab`) in any project, so
  an AI assistant working there immediately knows how to use `cliynab`.
