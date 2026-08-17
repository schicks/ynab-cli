import { Command } from "commander";
import { addOutputOption, printTable } from "../output";
import { getClient, type YnabClient } from "../ynabClient";

export interface CategoryTargetRow {
  id: string;
  name: string;
  goalType: string | null;
  target: number | null;
  percentComplete: number | null;
  stillNeeded: number | null;
}

export async function listCategoryTargets(
  client: YnabClient,
  budgetId = "last-used",
): Promise<CategoryTargetRow[]> {
  const { data, error } = await client.GET("/plans/{plan_id}/categories", {
    params: { path: { plan_id: budgetId } },
  });
  if (error) {
    throw new Error(`Failed to list categories: ${JSON.stringify(error)}`);
  }
  return data.data.category_groups
    .flatMap((group) => group.categories)
    .filter((category) => category.goal_type != null && !category.deleted)
    .map((category) => ({
      id: category.id,
      name: category.name,
      goalType: category.goal_type ?? null,
      target: category.goal_target_currency ?? null,
      percentComplete: category.goal_percentage_complete ?? null,
      stillNeeded: category.goal_under_funded_currency ?? null,
    }));
}

export const categoriesCommand = new Command("categories");

addOutputOption(categoriesCommand.command("targets"))
  .description("List categories with a target, one row per category")
  .argument("[budgetId]", "Budget id (defaults to the last-used budget)", "last-used")
  .action(async (budgetId: string, opts: { tsv?: boolean }) => {
    const client = await getClient();
    const categories = await listCategoryTargets(client, budgetId);
    printTable(categories, opts);
  });
