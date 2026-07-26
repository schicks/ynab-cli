import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), ".cliynab");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

interface Config {
  accessToken?: string;
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

export interface TokenResponse {
  access_token: string;
  expires_in: number;
}

export function storeToken(token: TokenResponse): void {
  const config = readConfig();
  config.accessToken = token.access_token;
  config.expiresAt = Date.now() + token.expires_in * 1000;
  writeConfig(config);
}

export function getStoredToken(): { accessToken: string; expiresAt: number } | undefined {
  const config = readConfig();
  if (!config.accessToken || !config.expiresAt) return undefined;
  return { accessToken: config.accessToken, expiresAt: config.expiresAt };
}

export const configPath = CONFIG_PATH;
