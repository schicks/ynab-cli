import { describe, expect, test } from "bun:test";
import { withTape } from "../testing/tape";
import { listAccounts } from "./accounts";

describe("listAccounts", () => {
  test("returns each account's id, name, and cleared/uncleared balances", async () => {
    await withTape(`${import.meta.dir}/accounts.test.tapes`, async ({ client }) => {
      const accounts = await listAccounts(client);

      expect(accounts).toEqual([
        {
          id: "11111111-1111-1111-1111-111111111111",
          name: "Test Checking",
          cleared: 1234.56,
          uncleared: 0,
        },
        {
          id: "22222222-2222-2222-2222-222222222222",
          name: "Test Credit Card",
          cleared: -543.21,
          uncleared: 0,
        },
        {
          id: "55555555-5555-5555-5555-555555555555",
          name: "Test Pending Transfer",
          cleared: -50,
          uncleared: 75,
        },
      ]);
    });
  });
});
