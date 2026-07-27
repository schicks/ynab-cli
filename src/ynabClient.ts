import createClient, { type Client } from "openapi-fetch";
import { getValidAccessToken } from "./oauth";
import type { paths } from "./generated/ynab-openapi";

export type YnabClient = Client<paths>;

const BASE_URL = "https://api.ynab.com/v1";

export function createYnabClient(accessToken: string, baseUrl: string = BASE_URL): YnabClient {
  return createClient<paths>({
    baseUrl,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function getClient(): Promise<YnabClient> {
  const accessToken = await getValidAccessToken();
  return createYnabClient(accessToken);
}
