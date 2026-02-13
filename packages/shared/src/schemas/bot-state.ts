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
  clientOrderId: z.string().min(1).optional(),
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

export const ProtectionLockScopeSchema = z.enum(["GLOBAL", "SYMBOL"]);
export type ProtectionLockScope = z.infer<typeof ProtectionLockScopeSchema>;

export const ProtectionLockTypeSchema = z.enum(["COOLDOWN", "STOPLOSS_GUARD", "MAX_DRAWDOWN", "LOW_PROFIT"]);
export type ProtectionLockType = z.infer<typeof ProtectionLockTypeSchema>;

export const ProtectionLockEntrySchema = z.object({
  id: z.string().min(1),
  type: ProtectionLockTypeSchema,
  scope: ProtectionLockScopeSchema,
  symbol: z.string().min(1).optional(),
  reason: z.string().min(1),
  createdAt: z.string().min(1),
  expiresAt: z.string().min(1),
  details: z.record(z.unknown()).optional()
});
export type ProtectionLockEntry = z.infer<typeof ProtectionLockEntrySchema>;

export const BotStateSchema = z.object({
  version: z.literal(BOT_STATE_VERSION),
  startedAt: z.string().min(1).optional(),
  updatedAt: z.string().min(1),
  running: z.boolean(),
  phase: BotPhaseSchema,
  lastError: z.string().optional(),
  decisions: z.array(DecisionSchema),
  activeOrders: z.array(OrderSchema),
  orderHistory: z.array(OrderSchema),
  symbolBlacklist: z.array(SymbolBlacklistEntrySchema).default([]),
  protectionLocks: z.array(ProtectionLockEntrySchema).default([])
});
export type BotState = z.infer<typeof BotStateSchema>;

export function defaultBotState(): BotState {
  const now = new Date().toISOString();
  return {
    version: BOT_STATE_VERSION,
    startedAt: now,
    updatedAt: now,
    running: false,
    phase: "STOPPED",
    decisions: [],
    activeOrders: [],
    orderHistory: [],
    symbolBlacklist: [],
    protectionLocks: []
  };
}
