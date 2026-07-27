import { describe, expect, test } from "bun:test";
import { withTape } from "../testing/tape";
import { listCategoryTargets } from "./categories";

describe("listCategoryTargets", () => {
  test("returns only categories with a goal, with target fields", async () => {
    await withTape(`${import.meta.dir}/categories.test.tapes`, async ({ client }) => {
      const categories = await listCategoryTargets(client);

      expect(categories).toEqual([
        {
          id: "22222222-2222-2222-2222-222222222222",
          name: "Test Streaming",
          goalType: "NEED",
          target: 60,
          percentComplete: 0,
          stillNeeded: 60,
        },
        {
          id: "33333333-3333-3333-3333-333333333333",
          name: "Test Monthly Fund",
          goalType: "MF",
          target: 32,
          percentComplete: 100,
          stillNeeded: 0,
        },
        {
          id: "44444444-4444-4444-4444-444444444444",
          name: "Test Future Goal",
          goalType: "NEED",
          target: 60,
          percentComplete: null,
          stillNeeded: null,
        },
      ]);
    });
  });
});
