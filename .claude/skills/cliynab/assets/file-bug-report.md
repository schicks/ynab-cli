# Filing user feedback about cliynab as a GitHub issue

A workflow for turning a bug report, unexpected behavior, or feature request about `cliynab`
into a GitHub issue on its repo (`schicks/ynab-cli`), using `gh`.

## Before filing anything

Filing a GitHub issue is a real, public, visible action on a shared repo — not a local, reversible
one. Always show the user the drafted title and body and get their go-ahead before actually
running `gh issue create`. Don't file silently just because you have the information needed to.

Confirm `gh` is authenticated first: `gh auth status`. If it isn't, that's a blocker to resolve
before anything else here (see this repo's own README for how `gh auth login` was set up, if
relevant).

## 1. Gather what a good report needs

- **The exact command that was run** (e.g. `cliynab accounts list --tsv`), including whether it
  was run from source (`bun run src/index.ts ...`) or a compiled binary (`cliynab.exe` on Windows,
  `cliynab` on Linux).
- **What happened** — the actual output/error text, verbatim, not paraphrased.
- **What was expected instead.**
- **Steps to reproduce**, if it's not a one-shot command (e.g. "ran `login`, then waited 2 hours,
  then ran `budgets list`").
- **Version**: `cliynab --version` (or `cliynab -V`).
- **Environment**: OS (Windows or Linux — this project doesn't target macOS), and whether `.env`/
  `~/.cliynab/config.json` state might matter (don't include the actual contents of either — see
  below).

## 2. Check for an existing issue first

Avoid filing a duplicate:

```
gh issue list --repo schicks/ynab-cli --state all --search "<a few keywords from the problem>"
```

If a matching open or recently-closed issue exists, prefer commenting on it
(`gh issue comment <number> --repo schicks/ynab-cli --body "..."`) over opening a new one, unless
the report is meaningfully different.

## 3. Never include secrets in the report

Strip or redact before drafting: OAuth Client ID/Secret, access tokens, and anything from
`~/.cliynab/config.json` or `.env`. If the bug is auth-related, describe the *symptom* (e.g. "login
completes but budgets list returns 401") rather than pasting the actual token/response.

## 4. Draft and file the issue

Use `--body-file -` with a heredoc to avoid shell-quoting problems, same convention as PR bodies
in this repo:

```
gh issue create --repo schicks/ynab-cli \
  --title "Short, specific summary of the problem" \
  --label bug \
  --body-file - <<'EOF'
## What happened

<verbatim output/error>

## Expected behavior

<what should have happened instead>

## Steps to reproduce

1. ...
2. ...

## Environment

- cliynab version: <from `cliynab --version`>
- Running from: source / compiled binary
- OS: Windows / Linux

EOF
```

Use `--label enhancement` instead of `--label bug` for feature requests rather than actual defects
(both labels already exist on this repo — check with `gh label list --repo schicks/ynab-cli` if
unsure what's available).

## 5. Report back

After creation, `gh issue create` prints the new issue's URL — share that with the user directly
so they can follow up on it themselves.
