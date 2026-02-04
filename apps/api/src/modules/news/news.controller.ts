import { Controller, Get } from "@nestjs/common";

import type { NewsSnapshot } from "./news.service";
import { NewsService } from "./news.service";

@Controller("news")
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get("latest")
  async latest(): Promise<NewsSnapshot> {
    return await this.newsService.getLatest();
  }
}

