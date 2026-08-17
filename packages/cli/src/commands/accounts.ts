import { Command } from "commander";
import { addOutputOption, printTable } from "../output";
import { getClient, type YnabClient } from "../ynabClient";

export interface AccountRow {
  id: string;
  name: string;
  cleared: number | null;
  uncleared: number | null;
}

export async function listAccounts(
  client: YnabClient,
  budgetId = "last-used",
): Promise<AccountRow[]> {
  const { data, error } = await client.GET("/plans/{plan_id}/accounts", {
    params: { path: { plan_id: budgetId } },
  });
  if (error) {
    throw new Error(`Failed to list accounts: ${JSON.stringify(error)}`);
  }
  return data.data.accounts.map((account) => ({
    id: account.id,
    name: account.name,
    cleared: account.cleared_balance_currency ?? null,
    uncleared: account.uncleared_balance_currency ?? null,
  }));
}

export const accountsCommand = new Command("accounts");

addOutputOption(accountsCommand.command("list"))
  .description("List accounts with cleared and uncleared balances, one row per account")
  .argument("[budgetId]", "Budget id (defaults to the last-used budget)", "last-used")
  .action(async (budgetId: string, opts: { tsv?: boolean }) => {
    const client = await getClient();
    const accounts = await listAccounts(client, budgetId);
    printTable(accounts, opts);
  });
