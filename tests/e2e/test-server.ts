import { setup } from "./setup-db";
import { app } from "../../src/server/index";

let server: any = null;

export async function startE2EServer(port: number = 3001) {
  if (server) return server;
  await setup();
  server = Bun.serve({
    port,
    fetch: app.fetch,
  });
  console.log(`E2E Server listening on http://127.0.0.1:${port}`);
  return server;
}

export function stopE2EServer() {
  if (server) {
    server.stop();
    server = null;
  }
}
