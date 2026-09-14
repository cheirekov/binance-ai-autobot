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
var import_node_path = __toESM(require("path"));
var import_basic_auth = __toESM(require("basic-auth"));
var import_bcryptjs = __toESM(require("bcryptjs"));
var import_express = __toESM(require("express"));
var import_http_proxy_middleware = require("http-proxy-middleware");
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
  const defaultApiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8148";
  const authEnabled = (process.env.UI_AUTH_ENABLED ?? "true").toLowerCase() !== "false";
  const authUsername = process.env.UI_AUTH_USERNAME ?? "";
  const authPasswordHash = process.env.UI_AUTH_PASSWORD_HASH ?? "";
  if (authEnabled && (!authUsername || !/^\$2[aby]\$/.test(authPasswordHash))) {
    throw new Error("UI authentication is enabled but username or bcrypt password hash is missing");
  }
  app.use((req, res, next) => {
    if (!authEnabled) return next();
    const creds = (0, import_basic_auth.default)(req);
    if (!creds?.name || !creds.pass) {
      logAuthFailure(req, "missing credentials");
      return unauthorized(res);
    }
    if (creds.name !== authUsername) {
      logAuthFailure(req, "username mismatch", creds.name);
      return unauthorized(res);
    }
    if (!import_bcryptjs.default.compareSync(creds.pass, authPasswordHash)) {
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
      router: () => defaultApiBaseUrl
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
