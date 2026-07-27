import { describe, expect, test } from "bun:test";
import { withTape } from "../testing/tape";
import { listBudgets } from "./budgets";

describe("listBudgets", () => {
  test("returns each budget's id and name", async () => {
    await withTape(`${import.meta.dir}/budgets.test.tapes`, async ({ client }) => {
      const budgets = await listBudgets(client);

      expect(budgets).toEqual([
        { id: "11111111-1111-1111-1111-111111111111", name: "Test Budget" },
        { id: "22222222-2222-2222-2222-222222222222", name: "Second Budget" },
      ]);
    });
  });
});
