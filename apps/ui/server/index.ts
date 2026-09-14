import path from "node:path";
import basicAuth from "basic-auth";
import bcrypt from "bcryptjs";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

function unauthorized(res: express.Response): void {
  res.setHeader("WWW-Authenticate", 'Basic realm="Autobot UI"');
  res.status(401).send("Unauthorized");
}

function logAuthFailure(req: express.Request, reason: string, username?: string): void {
  const ip = req.ip ?? "unknown";
  const ua = req.headers["user-agent"] ?? "unknown";
  const path = req.originalUrl ?? req.url;
  console.warn(`[ui] auth failed: ${reason}`, { ip, path, username, ua });
}

async function start(): Promise<void> {
  const app = express();

  const host = process.env.HOST ?? "localhost";
  const port = Number.parseInt(process.env.PORT ?? "4173", 10);
  const defaultApiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8148";
  const authEnabled = (process.env.UI_AUTH_ENABLED ?? "true").toLowerCase() !== "false";
  const authUsername = process.env.UI_AUTH_USERNAME ?? "";
  const authPasswordHash = process.env.UI_AUTH_PASSWORD_HASH ?? "";
  if (authEnabled && (!authUsername || !/^\$2[aby]\$/.test(authPasswordHash))) {
    throw new Error("UI authentication is enabled but username or bcrypt password hash is missing");
  }

  app.use((req, res, next) => {
    if (!authEnabled) return next();

    const creds = basicAuth(req);
    if (!creds?.name || !creds.pass) {
      logAuthFailure(req, "missing credentials");
      return unauthorized(res);
    }

    if (creds.name !== authUsername) {
      logAuthFailure(req, "username mismatch", creds.name);
      return unauthorized(res);
    }
    if (!bcrypt.compareSync(creds.pass, authPasswordHash)) {
      logAuthFailure(req, "password mismatch", creds.name);
      return unauthorized(res);
    }

    return next();
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  });

  app.use(
    "/api",
    createProxyMiddleware({
      target: defaultApiBaseUrl,
      changeOrigin: true,
      pathRewrite: { "^/api": "" },
      router: () => defaultApiBaseUrl
    })
  );

  const distDir = path.join(process.cwd(), "dist");
  app.use(express.static(distDir));
  app.get("*", (_req, res) => res.sendFile(path.join(distDir, "index.html")));

  app.listen(port, host, () => {
    console.log(`[ui] listening on http://${host}:${port}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
