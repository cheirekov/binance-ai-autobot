import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { json } from "express";

import { AppModule } from "./modules/app.module";
import { createLogger } from "./modules/logging/pino-logger";

async function bootstrap(): Promise<void> {
  const logger = createLogger();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false
  });

  app.use(json({ limit: "2mb" }));

  const pinoHttp = await import("pino-http");
  app.use(pinoHttp.default({ logger }));

  app.useLogger({
    log: (message) => logger.info({ msg: message }),
    error: (message, trace) => logger.error({ msg: message, trace }),
    warn: (message) => logger.warn({ msg: message }),
    debug: (message) => logger.debug({ msg: message }),
    verbose: (message) => logger.trace({ msg: message })
  });

  const port = Number.parseInt(process.env.PORT ?? "3000", 10);
  await app.listen(port, "0.0.0.0");

  logger.info({ msg: "API listening", port });
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
