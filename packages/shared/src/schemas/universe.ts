import { z } from "zod";

export const UNIVERSE_VERSION = 1 as const;

export const UniverseStrategyHintSchema = z.enum(["TREND", "RANGE", "MEAN_REVERSION"]);
export type UniverseStrategyHint = z.infer<typeof UniverseStrategyHintSchema>;

export const UniverseCandidateSchema = z.object({
  symbol: z.string().min(1),
  baseAsset: z.string().min(1),
  quoteAsset: z.string().min(1),
  lastPrice: z.number().positive(),
  quoteVolume24h: z.number().nonnegative(),
  priceChangePct24h: z.number(),
  rsi14: z.number().min(0).max(100).optional(),
  adx14: z.number().min(0).max(100).optional(),
  atrPct14: z.number().min(0).max(1000).optional(),
  strategyHint: UniverseStrategyHintSchema.optional(),
  score: z.number(),
  reasons: z.array(z.string().min(1)).default([])
});
export type UniverseCandidate = z.infer<typeof UniverseCandidateSchema>;

export const UniverseSnapshotSchema = z.object({
  version: z.literal(UNIVERSE_VERSION),
  startedAt: z.string().min(1),
  finishedAt: z.string().min(1),
  durationMs: z.number().int().min(0),
  baseUrl: z.string().min(1),
  interval: z.string().min(1),
  quoteAssets: z.array(z.string().min(1)),
  candidates: z.array(UniverseCandidateSchema),
  errors: z.array(z.object({ symbol: z.string().optional(), error: z.string().min(1) }))
});
export type UniverseSnapshot = z.infer<typeof UniverseSnapshotSchema>;

