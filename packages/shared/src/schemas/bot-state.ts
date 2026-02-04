import { z } from "zod";

export const BOT_STATE_VERSION = 1 as const;

export const BotPhaseSchema = z.enum(["STOPPED", "EXAMINING", "TRADING"]);
export type BotPhase = z.infer<typeof BotPhaseSchema>;

export const DecisionSchema = z.object({
  id: z.string().min(1),
  ts: z.string().min(1),
  kind: z.string().min(1),
  summary: z.string().min(1),
  details: z.record(z.unknown()).optional()
});
export type Decision = z.infer<typeof DecisionSchema>;

export const OrderSideSchema = z.enum(["BUY", "SELL"]);
export type OrderSide = z.infer<typeof OrderSideSchema>;

export const OrderStatusSchema = z.enum(["NEW", "FILLED", "CANCELED", "REJECTED"]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const OrderSchema = z.object({
  id: z.string().min(1),
  ts: z.string().min(1),
  symbol: z.string().min(1),
  side: OrderSideSchema,
  type: z.string().min(1),
  status: OrderStatusSchema,
  price: z.number().nonnegative().optional(),
  qty: z.number().positive()
});
export type Order = z.infer<typeof OrderSchema>;

export const SymbolBlacklistEntrySchema = z.object({
  symbol: z.string().min(1),
  reason: z.string().min(1),
  createdAt: z.string().min(1),
  expiresAt: z.string().min(1)
});
export type SymbolBlacklistEntry = z.infer<typeof SymbolBlacklistEntrySchema>;

export const BotStateSchema = z.object({
  version: z.literal(BOT_STATE_VERSION),
  updatedAt: z.string().min(1),
  running: z.boolean(),
  phase: BotPhaseSchema,
  lastError: z.string().optional(),
  decisions: z.array(DecisionSchema),
  activeOrders: z.array(OrderSchema),
  orderHistory: z.array(OrderSchema),
  symbolBlacklist: z.array(SymbolBlacklistEntrySchema).default([])
});
export type BotState = z.infer<typeof BotStateSchema>;

export function defaultBotState(): BotState {
  return {
    version: BOT_STATE_VERSION,
    updatedAt: new Date().toISOString(),
    running: false,
    phase: "STOPPED",
    decisions: [],
    activeOrders: [],
    orderHistory: [],
    symbolBlacklist: []
  };
}
