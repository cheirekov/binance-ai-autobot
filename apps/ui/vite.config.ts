import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";

export default defineConfig(() => {
  const apiBaseUrlFromEnv = process.env.API_BASE_URL ?? "http://localhost:8148";
  const host = process.env.VITE_HOST ?? "localhost";
  const port = Number.parseInt(process.env.VITE_PORT ?? "4173", 10);

  const dataDir = process.env.DATA_DIR ?? path.resolve(process.cwd(), "../../data");
  const configPath = path.join(dataDir, "config.json");
  const disk = (() => {
    try {
      if (!fs.existsSync(configPath)) return undefined;
      const raw = fs.readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(raw) as { advanced?: { apiKey?: string; apiBaseUrl?: string } };
      return { apiKeyFromDisk: parsed.advanced?.apiKey, apiBaseUrlFromDisk: parsed.advanced?.apiBaseUrl };
    } catch {
      return undefined;
    }
  })();
  const apiKeyFromDisk = disk?.apiKeyFromDisk;
  const apiBaseUrl = disk?.apiBaseUrlFromDisk ?? apiBaseUrlFromEnv;

  return {
    plugins: [react()],
    build: {
      commonjsOptions: {
        include: [/node_modules/, /packages\/shared\/dist/]
      }
    },
    server: {
      host,
      port,
      proxy: {
        "/api": {
          target: apiBaseUrl,
          changeOrigin: true,
          headers: apiKeyFromDisk ? { "x-api-key": apiKeyFromDisk } : undefined,
          rewrite: (p) => p.replace(/^\/api/, "")
        }
      }
    },
    preview: {
      host,
      port
    }
  };
});
