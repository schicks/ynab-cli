import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import {
  getClientCredentials,
  getStoredTokens,
  storeClientCredentials,
  storeTokens,
  type TokenResponse,
} from "./config";

const AUTHORIZE_URL = "https://app.ynab.com/oauth/authorize";
const TOKEN_URL = "https://app.ynab.com/oauth/token";
const REDIRECT_HOST = "127.0.0.1";
const REDIRECT_PORT = 51739;
export const REDIRECT_URI = `http://${REDIRECT_HOST}:${REDIRECT_PORT}/callback`;

const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;
const EXPIRY_SKEW_MS = 60 * 1000;

function openBrowser(url: string): void {
  switch (process.platform) {
    case "win32":
      Bun.spawn(["rundll32", "url.dll,FileProtocolHandler", url], {
        stdio: ["ignore", "ignore", "ignore"],
      });
      break;
    case "darwin":
      Bun.spawn(["open", url], { stdio: ["ignore", "ignore", "ignore"] });
      break;
    default:
      Bun.spawn(["xdg-open", url], { stdio: ["ignore", "ignore", "ignore"] });
  }
}

async function ensureClientCredentials(): Promise<{ clientId: string; clientSecret: string }> {
  const existing = getClientCredentials();
  if (existing) return existing;

  console.log(
    "No YNAB OAuth application configured yet.\n" +
      "Register one at https://app.ynab.com/settings/developer -> OAuth Applications -> New Application.\n" +
      `Set the Redirect URI to exactly: ${REDIRECT_URI}\n`,
  );

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const clientId = (await rl.question("Client ID: ")).trim();
  const clientSecret = (await rl.question("Client Secret: ")).trim();
  rl.close();

  if (!clientId || !clientSecret) {
    throw new Error("Client ID and Client Secret are required.");
  }

  storeClientCredentials(clientId, clientSecret);
  return { clientId, clientSecret };
}

function waitForCallback(expectedState: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      server.stop(true);
      reject(new Error("Timed out waiting for YNAB authorization in the browser."));
    }, CALLBACK_TIMEOUT_MS);

    const server = Bun.serve({
      hostname: REDIRECT_HOST,
      port: REDIRECT_PORT,
      fetch(req) {
        const url = new URL(req.url);
        if (url.pathname !== "/callback") {
          return new Response("Not found", { status: 404 });
        }

        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        clearTimeout(timeout);
        queueMicrotask(() => server.stop());

        if (error) {
          reject(new Error(`YNAB authorization failed: ${error}`));
          return new Response(`Authorization failed: ${error}. You can close this tab.`);
        }
        if (!code || state !== expectedState) {
          reject(new Error("Invalid OAuth callback (missing code or state mismatch)."));
          return new Response("Invalid callback. You can close this tab.", { status: 400 });
        }

        resolve(code);
        return new Response(
          "Authorization complete. You can close this tab and return to the terminal.",
        );
      },
    });
  });
}

async function exchangeToken(body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    throw new Error(`YNAB token request failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

export async function login(): Promise<void> {
  const { clientId, clientSecret } = await ensureClientCredentials();

  const state = randomBytes(16).toString("hex");
  const authorizeUrl = new URL(AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("state", state);

  console.log(
    `Opening your browser to authorize cliynab with YNAB...\nIf it doesn't open automatically, visit:\n${authorizeUrl}\n`,
  );

  const callback = waitForCallback(state);
  openBrowser(authorizeUrl.toString());
  const code = await callback;

  const tokens = await exchangeToken(
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
      code,
    }),
  );

  storeTokens(tokens);
  console.log("Authorization successful. Tokens saved.");
}

export async function getValidAccessToken(): Promise<string> {
  const tokens = getStoredTokens();
  if (!tokens) {
    console.error("Not logged in. Run `cliynab login` first.");
    process.exit(1);
  }

  if (Date.now() < tokens.expiresAt - EXPIRY_SKEW_MS) {
    return tokens.accessToken;
  }

  const credentials = getClientCredentials();
  if (!credentials) {
    console.error("Missing OAuth client credentials. Run `cliynab login` again.");
    process.exit(1);
  }

  const refreshed = await exchangeToken(
    new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      grant_type: "refresh_token",
      refresh_token: tokens.refreshToken,
    }),
  );

  storeTokens(refreshed);
  return refreshed.access_token;
}
