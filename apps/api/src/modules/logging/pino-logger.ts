import fs from "node:fs";
import path from "node:path";

import pino from "pino";

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function createLogger(): pino.Logger {
  const dataDir = process.env.DATA_DIR ?? path.resolve(process.cwd(), "../../data");
  const logDir = process.env.LOG_DIR ?? path.join(dataDir, "logs");
  ensureDir(logDir);

  const destination = pino.destination({
    dest: path.join(logDir, "api.log"),
    sync: false
  });

  return pino(
    {
      level: process.env.LOG_LEVEL ?? "info",
      base: undefined
    },
    pino.multistream([{ stream: process.stdout }, { stream: destination }])
  );
}
