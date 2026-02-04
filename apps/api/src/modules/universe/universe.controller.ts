import { Controller, Get, Post } from "@nestjs/common";
import type { UniverseSnapshot } from "@autobot/shared";

import { UniverseService } from "./universe.service";

@Controller("universe")
export class UniverseController {
  constructor(private readonly universe: UniverseService) {}

  @Get("latest")
  async latest(): Promise<UniverseSnapshot> {
    return await this.universe.getLatest();
  }

  @Post("scan")
  async scan(): Promise<{ ok: true; started: boolean }> {
    const started = await this.universe.triggerScan();
    return { ok: true, started };
  }
}

