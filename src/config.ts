import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), ".cliynab");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

interface Config {
  clientId?: string;
  clientSecret?: string;
  accessToken?: string;
  refreshToken?: string;
  /** Unix ms timestamp when accessToken expires. */
  expiresAt?: number;
}

function readConfig(): Config {
  if (!existsSync(CONFIG_PATH)) return {};
  return JSON.parse(readFileSync(CONFIG_PATH, "utf-8")) as Config;
}

function writeConfig(config: Config): void {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export function getClientCredentials(): { clientId: string; clientSecret: string } | undefined {
  const envId = process.env.YNAB_CLIENT_ID;
  const envSecret = process.env.YNAB_CLIENT_SECRET;
  if (envId && envSecret) return { clientId: envId, clientSecret: envSecret };

  const config = readConfig();
  if (config.clientId && config.clientSecret) {
    return { clientId: config.clientId, clientSecret: config.clientSecret };
  }
  return undefined;
}

export function storeClientCredentials(clientId: string, clientSecret: string): void {
  const config = readConfig();
  config.clientId = clientId;
  config.clientSecret = clientSecret;
  writeConfig(config);
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export function storeTokens(tokens: TokenResponse): void {
  const config = readConfig();
  config.accessToken = tokens.access_token;
  config.refreshToken = tokens.refresh_token;
  config.expiresAt = Date.now() + tokens.expires_in * 1000;
  writeConfig(config);
}

export function getStoredTokens():
  | { accessToken: string; refreshToken: string; expiresAt: number }
  | undefined {
  const config = readConfig();
  if (!config.accessToken || !config.refreshToken || !config.expiresAt) return undefined;
  return {
    accessToken: config.accessToken,
    refreshToken: config.refreshToken,
    expiresAt: config.expiresAt,
  };
}

export const configPath = CONFIG_PATH;
