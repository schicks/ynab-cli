import { randomBytes } from "node:crypto";
import { getStoredToken, storeToken } from "./config";

const AUTHORIZE_URL = "https://app.ynab.com/oauth/authorize";
const REDIRECT_HOST = "127.0.0.1";
const REDIRECT_PORT = 51739;
export const REDIRECT_URI = `http://${REDIRECT_HOST}:${REDIRECT_PORT}/callback`;

const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;
const EXPIRY_SKEW_MS = 60 * 1000;

// Implicit grant returns the token in the URL fragment, which browsers never send to the
// server. This page relays it to us via a same-origin fetch that carries it as a query string.
const CALLBACK_HTML = `<!doctype html>
<html>
  <body>
    <script>
      const params = new URLSearchParams(window.location.hash.slice(1));
      fetch("/token?" + params.toString())
        .then(() => {
          document.body.textContent = "Authorization complete. You can close this tab and return to the terminal.";
        })
        .catch(() => {
          document.body.textContent = "Something went wrong. Return to the terminal for details.";
        });
    </script>
  </body>
</html>`;

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

function getClientId(): string {
  const clientId = process.env.YNAB_CLIENT_ID;
  if (!clientId) {
    throw new Error(
      "Missing YNAB_CLIENT_ID. This is baked in at build time via `bun run build`; " +
        "if you're running from source, set it in .env.",
    );
  }
  return clientId;
}

interface CallbackResult {
  accessToken: string;
  expiresIn: number;
}

function waitForCallback(expectedState: string): Promise<CallbackResult> {
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

        if (url.pathname === "/callback") {
          return new Response(CALLBACK_HTML, { headers: { "Content-Type": "text/html" } });
        }

        if (url.pathname !== "/token") {
          return new Response("Not found", { status: 404 });
        }

        const accessToken = url.searchParams.get("access_token");
        const expiresIn = Number(url.searchParams.get("expires_in"));
        const state = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        clearTimeout(timeout);
        queueMicrotask(() => server.stop());

        if (error) {
          reject(new Error(`YNAB authorization failed: ${error}`));
          return new Response("error", { status: 400 });
        }
        if (!accessToken || !expiresIn || state !== expectedState) {
          reject(new Error("Invalid OAuth callback (missing token or state mismatch)."));
          return new Response("invalid callback", { status: 400 });
        }

        resolve({ accessToken, expiresIn });
        return new Response("ok");
      },
    });
  });
}

export async function login(): Promise<void> {
  const clientId = getClientId();

  const state = randomBytes(16).toString("hex");
  const authorizeUrl = new URL(AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authorizeUrl.searchParams.set("response_type", "token");
  authorizeUrl.searchParams.set("state", state);

  console.log(
    `Opening your browser to authorize cliynab with YNAB...\nIf it doesn't open automatically, visit:\n${authorizeUrl}\n`,
  );

  const callback = waitForCallback(state);
  openBrowser(authorizeUrl.toString());
  const { accessToken, expiresIn } = await callback;

  storeToken({ access_token: accessToken, expires_in: expiresIn });
  console.log("Authorization successful. Token saved.");
}

export async function getValidAccessToken(): Promise<string> {
  const token = getStoredToken();
  if (!token) {
    console.error("Not logged in. Run `cliynab login` first.");
    process.exit(1);
  }

  if (Date.now() >= token.expiresAt - EXPIRY_SKEW_MS) {
    console.error("Access token expired. Run `cliynab login` to reauthorize.");
    process.exit(1);
  }

  return token.accessToken;
}
