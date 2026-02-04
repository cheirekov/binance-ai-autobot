import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import Parser from "rss-parser";

export type NewsItem = {
  id: string;
  source: string;
  title: string;
  link?: string;
  publishedAt?: string;
  summary?: string;
};

export type NewsSnapshot = {
  fetchedAt: string;
  items: NewsItem[];
  errors: Array<{ feed: string; error: string }>;
};

function atomicWriteFile(filePath: string, data: string): void {
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, data, { encoding: "utf-8" });
  fs.renameSync(tmpPath, filePath);
}

function sourceFromUrl(feedUrl: string): string {
  try {
    const u = new URL(feedUrl);
    return u.hostname;
  } catch {
    return feedUrl;
  }
}

function stableId(feed: string, fallback: string): string {
  return crypto.createHash("sha256").update(`${feed}::${fallback}`).digest("hex").slice(0, 24);
}

@Injectable()
export class NewsService {
  private cached: NewsSnapshot | null = null;
  private cachedAtMs = 0;

  private readonly dataDir = process.env.DATA_DIR ?? path.resolve(process.cwd(), "../../data");
  private readonly cachePath = path.join(this.dataDir, "news.json");

  private get feedUrls(): string[] {
    const envFeeds = process.env.NEWS_FEEDS?.split(",").map((s) => s.trim()).filter(Boolean);
    return (
      envFeeds ?? [
        "https://cointelegraph.com/rss",
        "https://cryptoslate.com/feed/",
        "https://decrypt.co/feed"
      ]
    );
  }

  async getLatest(): Promise<NewsSnapshot> {
    const now = Date.now();
    if (this.cached && now - this.cachedAtMs < 5 * 60_000) {
      return this.cached;
    }

    // Fall back to disk cache if present (useful when feeds are unreachable).
    if (!this.cached && fs.existsSync(this.cachePath)) {
      try {
        const raw = fs.readFileSync(this.cachePath, "utf-8");
        const parsed = JSON.parse(raw) as NewsSnapshot;
        this.cached = parsed;
        this.cachedAtMs = now;
      } catch {
        // ignore
      }
    }

    const parser = new Parser();
    const items: NewsItem[] = [];
    const errors: Array<{ feed: string; error: string }> = [];

    for (const feed of this.feedUrls) {
      try {
        const res = await fetch(feed, { headers: { "user-agent": "autobot/0.1" } });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const xml = await res.text();
        const parsed = await parser.parseString(xml);
        const source = sourceFromUrl(feed);

        for (const it of parsed.items ?? []) {
          const title = (it.title ?? "").trim();
          if (!title) continue;

          const publishedAt = it.isoDate ?? it.pubDate;
          const link = it.link;
          const id = it.guid ? stableId(feed, it.guid) : link ? stableId(feed, link) : stableId(feed, `${title}::${publishedAt ?? ""}`);

          items.push({
            id,
            source,
            title,
            link,
            publishedAt,
            summary: (it.contentSnippet ?? it.content ?? "").trim() || undefined
          });
        }
      } catch (e) {
        errors.push({ feed, error: e instanceof Error ? e.message : String(e) });
      }
    }

    const dedup = new Map<string, NewsItem>();
    for (const it of items) dedup.set(it.id, it);

    const sorted = Array.from(dedup.values()).sort((a, b) => {
      const at = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const bt = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return bt - at;
    });

    const snapshot: NewsSnapshot = {
      fetchedAt: new Date().toISOString(),
      items: sorted.slice(0, 120),
      errors
    };

    this.cached = snapshot;
    this.cachedAtMs = now;

    fs.mkdirSync(this.dataDir, { recursive: true });
    atomicWriteFile(this.cachePath, JSON.stringify(snapshot, null, 2));

    return snapshot;
  }
}

