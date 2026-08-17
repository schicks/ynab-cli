import { createYnabClient, type YnabClient } from "ynab-client";
import { getValidAccessToken } from "./oauth";

export type { YnabClient };

export async function getClient(): Promise<YnabClient> {
  const accessToken = await getValidAccessToken();
  return createYnabClient(accessToken);
}
