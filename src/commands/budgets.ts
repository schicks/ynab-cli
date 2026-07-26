import { Command } from "commander";
import { getClient } from "../ynabClient";

export const budgetsCommand = new Command("budgets");

budgetsCommand
  .command("list")
  .description("List your YNAB budgets (smoke test for API connectivity)")
  .action(async () => {
    const client = await getClient();
    const { data } = await client.budgets.getBudgets();

    for (const budget of data.budgets) {
      console.log(`${budget.id}  ${budget.name}`);
    }
  });
