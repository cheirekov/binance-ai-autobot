import { Controller, Get } from "@nestjs/common";

import type { WalletSnapshot } from "./portfolio.service";
import { PortfolioService } from "./portfolio.service";

@Controller("portfolio")
export class PortfolioController {
  constructor(private readonly portfolioService: PortfolioService) {}

  @Get("wallet")
  async getWallet(): Promise<WalletSnapshot> {
    return await this.portfolioService.getWallet();
  }
}

