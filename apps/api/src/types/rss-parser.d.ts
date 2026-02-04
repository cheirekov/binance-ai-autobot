declare module "rss-parser" {
  export type ParserOutput = {
    title?: string;
    link?: string;
    items?: Array<{
      title?: string;
      link?: string;
      guid?: string;
      isoDate?: string;
      pubDate?: string;
      contentSnippet?: string;
      content?: string;
    }>;
  };

  export default class Parser<TFeed = ParserOutput> {
    parseString(xml: string): Promise<TFeed>;
  }
}

