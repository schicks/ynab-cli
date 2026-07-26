import * as ynab from "ynab";
import { getValidAccessToken } from "./oauth";

export async function getClient(): Promise<ynab.API> {
  const accessToken = await getValidAccessToken();
  return new ynab.API(accessToken);
}
