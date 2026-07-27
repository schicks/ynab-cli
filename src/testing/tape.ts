import talkback from "talkback";
import type { Req } from "talkback/types";
import type Tape from "talkback/tape";
import { createYnabClient, type YnabClient } from "../ynabClient";

const YNAB_HOST = "https://api.ynab.com";

export interface TapeHandle {
  client: YnabClient;
}

/**
 * Runs `fn` against a YNAB client backed by a talkback tape proxy rooted at `tapeDir`.
 *
 * By default (no TAPE_RECORD env var) the proxy never touches the network: it replays
 * whatever's on disk in `tapeDir` and fails loudly if a request has no matching tape. Set
 * TAPE_RECORD=1 (with YNAB_RECORD_TOKEN set to a real access token) to record new tapes for
 * requests that aren't on disk yet - see the tape-testing skill for the full record/anonymize
 * workflow.
 */
export async function withTape<T>(
  tapeDir: string,
  fn: (tape: TapeHandle) => Promise<T>,
): Promise<T> {
  const recording = process.env.TAPE_RECORD === "1";
  const record = recording ? talkback.Options.RecordMode.NEW : talkback.Options.RecordMode.DISABLED;

  const server = talkback({
    host: YNAB_HOST,
    port: 0,
    path: tapeDir,
    record,
    silent: true,
    summary: false,
    // Match/store requests by method+url+body only. Headers like Authorization (a real token
    // while recording, a placeholder while replaying) or User-Agent (varies with the Bun
    // version) would otherwise break matching or leak into the saved tape.
    allowHeaders: [],
    // Bun's fetch negotiates gzip by default, but the local proxy server can't correctly
    // replay a compressed body back to a Bun http client. Requesting identity encoding on the
    // upstream leg avoids the problem entirely instead of trying to route around it later.
    requestDecorator: (req: Req) => {
      req.headers["accept-encoding"] = "identity";
      return req;
    },
    // Bun's http server compat doesn't correctly replay a raw body under a copied
    // "transfer-encoding: chunked" header from the recorded tape; stripping it lets Bun's own
    // server pick correct framing when serving the response.
    responseDecorator: (tape: Tape) => {
      delete tape.res?.headers["transfer-encoding"];
      return tape;
    },
  });

  const httpServer = await server.start();
  const address = httpServer.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to determine tape proxy port");
  }

  const token = recording ? requireRecordingToken() : "tape-token";
  const client = createYnabClient(token, `http://127.0.0.1:${address.port}/v1`);

  try {
    return await fn({ client });
  } finally {
    await new Promise<void>((resolve) => server.close(resolve));
  }
}

function requireRecordingToken(): string {
  const token = process.env.YNAB_RECORD_TOKEN;
  if (!token) {
    throw new Error(
      "TAPE_RECORD=1 requires YNAB_RECORD_TOKEN set to a real YNAB access token " +
        "(e.g. the accessToken field from ~/.cliynab/config.json after `cliynab login`).",
    );
  }
  return token;
}
