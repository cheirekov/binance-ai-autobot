import fs from "node:fs";
import path from "node:path";

import type { AppConfig } from "@autobot/shared";
import { AppConfigSchema } from "@autobot/shared";
import basicAuth from "basic-auth";
import bcrypt from "bcryptjs";
import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

type ConfigCache = {
  mtimeMs: number;
  config: AppConfig;
};

function loadConfig(dataDir: string, cache: ConfigCache | null): ConfigCache | null {
  const configPath = path.join(dataDir, "config.json");
  if (!fs.existsSync(configPath)) return null;

  const stat = fs.statSync(configPath);
  if (cache && cache.mtimeMs === stat.mtimeMs) return cache;

  const raw = fs.readFileSync(configPath, "utf-8");
  const config = AppConfigSchema.parse(JSON.parse(raw));
  return { mtimeMs: stat.mtimeMs, config };
}

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
  const dataDir = process.env.DATA_DIR ?? path.resolve(process.cwd(), "../../data");
  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8148";

  let cache: ConfigCache | null = null;

  app.use((req, res, next) => {
    cache = loadConfig(dataDir, cache);

    if (!cache?.config.basic.uiAuth.enabled) return next();

    const creds = basicAuth(req);
    if (!creds?.name || !creds.pass) {
      logAuthFailure(req, "missing credentials");
      return unauthorized(res);
    }

    const { username, passwordHash } = cache.config.basic.uiAuth;
    if (creds.name !== username) {
      logAuthFailure(req, "username mismatch", creds.name);
      return unauthorized(res);
    }
    if (!bcrypt.compareSync(creds.pass, passwordHash)) {
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
      target: apiBaseUrl,
      changeOrigin: true,
      pathRewrite: { "^/api": "" },
      on: {
        proxyReq: (proxyReq) => {
          cache = loadConfig(dataDir, cache);
          const apiKey = cache?.config.advanced.apiKey;
          if (apiKey) {
            proxyReq.setHeader("x-api-key", apiKey);
          }
        }
      },
      logLevel: "silent"
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
