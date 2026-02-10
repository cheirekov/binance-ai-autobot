import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { RequestHandler } from "express";
import { json } from "express";

import { AppModule } from "./modules/app.module";
import { ConfigService } from "./modules/config/config.service";
import { createLogger } from "./modules/logging/pino-logger";

async function bootstrap(): Promise<void> {
  const logger = createLogger();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: false
  });

  app.use(json({ limit: "2mb" }));

  const pinoHttpModule = await import("pino-http");
  const pinoHttp = pinoHttpModule.default as unknown as (opts: unknown) => RequestHandler;
  app.use(pinoHttp({ logger }));

  app.useLogger({
    log: (message) => logger.info({ msg: message }),
    error: (message, trace) => logger.error({ msg: message, trace }),
    warn: (message) => logger.warn({ msg: message }),
    debug: (message) => logger.debug({ msg: message }),
    verbose: (message) => logger.trace({ msg: message })
  });

  const configService = app.get(ConfigService);
  const migration = configService.migrateOnStartup();
  if (migration.migrated) {
    logger.info({ msg: "Config startup migration applied", reason: migration.reason });
  }

  const port = Number.parseInt(process.env.PORT ?? "8148", 10);
  await app.listen(port, "0.0.0.0");

  logger.info({ msg: "API listening", port });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
