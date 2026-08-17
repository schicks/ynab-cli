import { Command } from "commander";
import { addOutputOption, printTable } from "../output";
import { getClient, type YnabClient } from "../ynabClient";

export interface BudgetRow {
  id: string;
  name: string;
}

export async function listBudgets(client: YnabClient): Promise<BudgetRow[]> {
  const { data, error } = await client.GET("/plans");
  if (error) {
    throw new Error(`Failed to list budgets: ${JSON.stringify(error)}`);
  }
  return data.data.plans.map((plan) => ({ id: plan.id, name: plan.name }));
}

export const budgetsCommand = new Command("budgets");

addOutputOption(budgetsCommand.command("list"))
  .description("List your YNAB budgets (smoke test for API connectivity)")
  .action(async (opts: { tsv?: boolean }) => {
    const client = await getClient();
    const budgets = await listBudgets(client);
    printTable(budgets, opts);
  });
