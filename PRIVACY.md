# Privacy Policy

`cliynab` is a personal, open-source command-line tool for interacting with your own [YNAB](https://www.ynab.com)
budget via the official YNAB API. This policy describes how it handles data.

## What data it accesses

When you authorize `cliynab` with your YNAB account via OAuth, it can read (and, for commands
that support it, modify) budget data in your YNAB account, scoped to whatever the YNAB API
exposes to authorized applications.

## What data it stores

All data is stored **locally on your own machine**, in `~/.cliynab/config.json`:

- Your YNAB OAuth application's Client ID and Client Secret (which you provide)
- Your OAuth access token and refresh token

`cliynab` does not transmit this data anywhere except directly to YNAB's own API
(`api.ynab.com`) and OAuth endpoints (`app.ynab.com`) to perform the actions you request.

## What this tool does not do

- It does not run as a hosted service; there is no backend server operated by the author.
- It does not collect analytics, telemetry, or usage data.
- It does not share, sell, or transmit your data to any third party.
- It does not store your data anywhere other than your local machine.

## Source code

`cliynab` is open source. You can review exactly what it does at
<https://github.com/schicks/ynab-cli>.

## Contact

Questions about this policy can be directed to the repository owner via GitHub issues at
<https://github.com/schicks/ynab-cli/issues>.
