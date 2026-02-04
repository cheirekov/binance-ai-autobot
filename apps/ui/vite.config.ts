import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";

export default defineConfig(() => {
  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8148";
  const host = process.env.VITE_HOST ?? "localhost";
  const port = Number.parseInt(process.env.VITE_PORT ?? "4173", 10);

  const dataDir = process.env.DATA_DIR ?? path.resolve(process.cwd(), "../../data");
  const configPath = path.join(dataDir, "config.json");
  const apiKeyFromDisk = (() => {
    try {
      if (!fs.existsSync(configPath)) return undefined;
      const raw = fs.readFileSync(configPath, "utf-8");
      const parsed = JSON.parse(raw) as { advanced?: { apiKey?: string } };
      return parsed.advanced?.apiKey;
    } catch {
      return undefined;
    }
  })();

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
