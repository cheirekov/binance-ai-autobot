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

function decodeHtmlEntities(input: string): string {
  // Minimal entity decoder to normalize RSS content for UI/AI consumption.
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " "
  };

  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    if (typeof entity !== "string") return match;

    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      const code = Number.parseInt(entity.slice(2), 16);
      if (!Number.isFinite(code) || code <= 0) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }

    if (entity.startsWith("#")) {
      const code = Number.parseInt(entity.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0) return match;
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }

    const replacement = named[entity];
    return replacement ?? match;
  });
}

function normalizeText(input: string): string {
  return decodeHtmlEntities(input)
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: { "user-agent": "autobot/0.1" }, signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.text();
  } finally {
    clearTimeout(t);
  }
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
    const timeoutMs = Number.parseInt(process.env.NEWS_FETCH_TIMEOUT_MS ?? "8000", 10);

    for (const feed of this.feedUrls) {
      try {
        const xml = await fetchText(feed, timeoutMs);
        const parsed = await parser.parseString(xml);
        const source = sourceFromUrl(feed);

        for (const it of parsed.items ?? []) {
          const title = normalizeText(it.title ?? "");
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
            summary: (() => {
              const raw = (it.contentSnippet ?? it.content ?? "").trim();
              if (!raw) return undefined;
              return normalizeText(raw);
            })()
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
