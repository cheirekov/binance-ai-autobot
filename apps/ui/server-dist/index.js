"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/index.ts
var import_node_fs = __toESM(require("fs"));
var import_node_path = __toESM(require("path"));
var import_shared = require("@autobot/shared");
var import_basic_auth = __toESM(require("basic-auth"));
var import_bcryptjs = __toESM(require("bcryptjs"));
var import_express = __toESM(require("express"));
var import_http_proxy_middleware = require("http-proxy-middleware");
function loadConfig(dataDir, cache) {
  const configPath = import_node_path.default.join(dataDir, "config.json");
  if (!import_node_fs.default.existsSync(configPath)) return null;
  const stat = import_node_fs.default.statSync(configPath);
  if (cache && cache.mtimeMs === stat.mtimeMs) return cache;
  const raw = import_node_fs.default.readFileSync(configPath, "utf-8");
  const config = import_shared.AppConfigSchema.parse(JSON.parse(raw));
  return { mtimeMs: stat.mtimeMs, config };
}
function unauthorized(res) {
  res.setHeader("WWW-Authenticate", 'Basic realm="Autobot UI"');
  res.status(401).send("Unauthorized");
}
function logAuthFailure(req, reason, username) {
  const ip = req.ip ?? "unknown";
  const ua = req.headers["user-agent"] ?? "unknown";
  const path2 = req.originalUrl ?? req.url;
  console.warn(`[ui] auth failed: ${reason}`, { ip, path: path2, username, ua });
}
async function start() {
  const app = (0, import_express.default)();
  const host = process.env.HOST ?? "localhost";
  const port = Number.parseInt(process.env.PORT ?? "4173", 10);
  const dataDir = process.env.DATA_DIR ?? import_node_path.default.resolve(process.cwd(), "../../data");
  const defaultApiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8148";
  let cache = null;
  app.use((req, res, next) => {
    cache = loadConfig(dataDir, cache);
    if (!cache?.config.basic.uiAuth.enabled) return next();
    const creds = (0, import_basic_auth.default)(req);
    if (!creds?.name || !creds.pass) {
      logAuthFailure(req, "missing credentials");
      return unauthorized(res);
    }
    const { username, passwordHash } = cache.config.basic.uiAuth;
    if (creds.name !== username) {
      logAuthFailure(req, "username mismatch", creds.name);
      return unauthorized(res);
    }
    if (!import_bcryptjs.default.compareSync(creds.pass, passwordHash)) {
      logAuthFailure(req, "password mismatch", creds.name);
      return unauthorized(res);
    }
    return next();
  });
  app.get("/health", (_req, res) => {
    res.json({ ok: true, ts: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.use(
    "/api",
    (0, import_http_proxy_middleware.createProxyMiddleware)({
      target: defaultApiBaseUrl,
      changeOrigin: true,
      pathRewrite: { "^/api": "" },
      router: () => {
        cache = loadConfig(dataDir, cache);
        const override = cache?.config.advanced.apiBaseUrl?.trim();
        return override ? override : defaultApiBaseUrl;
      },
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
  const distDir = import_node_path.default.join(process.cwd(), "dist");
  app.use(import_express.default.static(distDir));
  app.get("*", (_req, res) => res.sendFile(import_node_path.default.join(distDir, "index.html")));
  app.listen(port, host, () => {
    console.log(`[ui] listening on http://${host}:${port}`);
  });
}
start().catch((err) => {
  console.error(err);
  process.exit(1);
});
