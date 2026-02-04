import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

import { ConfigService } from "../config/config.service";

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const path = req.path ?? req.url;

    if (path === "/health") {
      return true;
    }

    const config = this.configService.load();
    if (!config) {
      if (path.startsWith("/setup")) {
        return true;
      }
      throw new UnauthorizedException("Bot is not initialized. Complete /setup first.");
    }

    if (path === "/setup/status") {
      return true;
    }

    const apiKey = req.header("x-api-key");
    if (!apiKey) {
      throw new UnauthorizedException("Missing x-api-key header.");
    }

    if (apiKey !== config.advanced.apiKey) {
      throw new UnauthorizedException("Invalid API key.");
    }

    return true;
  }
}
