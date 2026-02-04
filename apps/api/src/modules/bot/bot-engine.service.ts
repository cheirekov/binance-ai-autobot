import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { Injectable } from "@nestjs/common";
import type { BotState, Decision, Order, SymbolBlacklistEntry } from "@autobot/shared";
import { BotStateSchema, defaultBotState } from "@autobot/shared";

import { ConfigService } from "../config/config.service";

function atomicWriteFile(filePath: string, data: string): void {
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, data, { encoding: "utf-8" });
  fs.renameSync(tmpPath, filePath);
}

@Injectable()
export class BotEngineService {
  private readonly dataDir = process.env.DATA_DIR ?? path.resolve(process.cwd(), "../../data");
  private readonly statePath = path.join(this.dataDir, "state.json");

  private loopTimer: NodeJS.Timeout | null = null;
  private examineTimer: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {}

  getState(): BotState {
    if (!fs.existsSync(this.statePath)) {
      return defaultBotState();
    }

    try {
      const raw = fs.readFileSync(this.statePath, "utf-8");
      return BotStateSchema.parse(JSON.parse(raw));
    } catch (err) {
      const fallback = defaultBotState();
      return {
        ...fallback,
        lastError: err instanceof Error ? err.message : "Failed to load state.json"
      };
    }
  }

  private save(state: BotState): void {
    fs.mkdirSync(this.dataDir, { recursive: true });
    const next: BotState = { ...state, updatedAt: new Date().toISOString() };
    atomicWriteFile(this.statePath, JSON.stringify(next, null, 2));
  }

  private pruneExpiredBlacklist(state: BotState): BotState {
    if (!state.symbolBlacklist || state.symbolBlacklist.length === 0) return state;
    const now = Date.now();
    const pruned = state.symbolBlacklist.filter((e) => {
      const expiresAt = Date.parse(e.expiresAt);
      return Number.isNaN(expiresAt) ? true : expiresAt > now;
    });
    if (pruned.length === state.symbolBlacklist.length) return state;
    return { ...state, symbolBlacklist: pruned };
  }

  private isSymbolBlocked(symbol: string, state: BotState): string | null {
    const config = this.configService.load();
    if (!config) return "Bot is not initialized";

    if (config.advanced.neverTradeSymbols.includes(symbol)) {
      return "Blocked by Advanced never-trade list";
    }

    const now = Date.now();
    const active = (state.symbolBlacklist ?? []).find((e) => e.symbol === symbol && Date.parse(e.expiresAt) > now);
    if (active) {
      return `Temporarily blacklisted (${active.reason})`;
    }

    return null;
  }

  private addSymbolBlacklist(state: BotState, entry: SymbolBlacklistEntry): BotState {
    const next = [entry, ...(state.symbolBlacklist ?? [])];
    return { ...state, symbolBlacklist: next.slice(0, 200) };
  }

  start(): void {
    const state = this.getState();
    if (state.running) return;

    this.addDecision("ENGINE", "Start requested");
    this.save({ ...this.getState(), running: true, phase: "EXAMINING", lastError: undefined });

    this.examineTimer = setTimeout(() => {
      this.addDecision("EXAMINE", "Universe scan finished (stub)");
      this.save({ ...this.getState(), phase: "TRADING" });
    }, 2500);

    this.loopTimer = setInterval(() => {
      const config = this.configService.load();
      const current0 = this.getState();
      const current = this.pruneExpiredBlacklist(current0);
      if (!current.running) return;
      if (current.phase !== "TRADING") return;

      const maybeFillOne = (): { activeOrders: Order[]; orderHistory: Order[] } => {
        if (current.activeOrders.length === 0) {
          return { activeOrders: current.activeOrders, orderHistory: current.orderHistory };
        }
        if (Math.random() > 0.4) {
          return { activeOrders: current.activeOrders, orderHistory: current.orderHistory };
        }

        const [toFill, ...rest] = current.activeOrders;
        const filled: Order = { ...toFill, status: "FILLED" };
        return { activeOrders: rest, orderHistory: [filled, ...current.orderHistory].slice(0, 200) };
      };

      const filled = maybeFillOne();

      const homeStable = config?.basic.homeStableCoin ?? "USDT";
      const candidateSymbol = `BTC${homeStable}`;
      const blockedReason = this.isSymbolBlocked(candidateSymbol, current);
      if (blockedReason) {
        const next = {
          ...current,
          activeOrders: filled.activeOrders,
          orderHistory: filled.orderHistory,
          decisions: [
            { id: crypto.randomUUID(), ts: new Date().toISOString(), kind: "SKIP", summary: `Skip ${candidateSymbol}: ${blockedReason}` },
            ...current.decisions
          ].slice(0, 200)
        } satisfies BotState;
        this.save(next);
        return;
      }

      const aiEnabled = Boolean(config?.basic.aiEnabled);
      const aiMin = config?.basic.aiMinTradeConfidence ?? 65;
      const aiConfidence = aiEnabled ? Math.floor(Math.random() * 101) : null;
      if (aiEnabled && aiConfidence !== null && aiConfidence < aiMin) {
        const next = {
          ...current,
          activeOrders: filled.activeOrders,
          orderHistory: filled.orderHistory,
          decisions: [
            {
              id: crypto.randomUUID(),
              ts: new Date().toISOString(),
              kind: "AI",
              summary: `AI gated trade (confidence ${aiConfidence}% < ${aiMin}%)`
            },
            ...current.decisions
          ].slice(0, 200)
        } satisfies BotState;
        this.save(next);
        return;
      }

      const orderStatusRoll = Math.random();
      const status: Order["status"] = orderStatusRoll < 0.12 ? "REJECTED" : orderStatusRoll < 0.35 ? "FILLED" : "NEW";
      const order: Order = {
        id: crypto.randomUUID(),
        ts: new Date().toISOString(),
        symbol: candidateSymbol,
        side: Math.random() > 0.5 ? "BUY" : "SELL",
        type: "MARKET",
        status,
        qty: 0.001
      };

      const decisionSummary =
        status === "REJECTED"
          ? `Order rejected (stub) for ${candidateSymbol}`
          : status === "FILLED"
            ? `Order filled (stub) for ${candidateSymbol}`
            : `Placed a stub order candidate for ${candidateSymbol}`;

      let nextState: BotState = {
        ...current,
        decisions: [
          {
            id: crypto.randomUUID(),
            ts: new Date().toISOString(),
            kind: "TRADE",
            summary: aiEnabled && aiConfidence !== null ? `${decisionSummary} (AI ${aiConfidence}%)` : decisionSummary
          },
          ...current.decisions
        ].slice(0, 200),
        activeOrders: filled.activeOrders,
        orderHistory: filled.orderHistory
      };

      if (status === "NEW") {
        nextState = { ...nextState, activeOrders: [order, ...nextState.activeOrders].slice(0, 50) };
      } else {
        nextState = { ...nextState, orderHistory: [order, ...nextState.orderHistory].slice(0, 200) };
      }

      if (status === "REJECTED" && config?.advanced.autoBlacklistEnabled) {
        const ttlMinutes = config.advanced.autoBlacklistTtlMinutes ?? 180;
        const now = new Date();
        nextState = this.addSymbolBlacklist(nextState, {
          symbol: candidateSymbol,
          reason: "Order rejected (stub)",
          createdAt: now.toISOString(),
          expiresAt: new Date(now.getTime() + ttlMinutes * 60_000).toISOString()
        });
      }

      const next: BotState = {
        ...nextState
      };
      this.save(next);
    }, 5000);
  }

  stop(): void {
    const state = this.getState();
    if (!state.running) return;

    this.addDecision("ENGINE", "Stop requested");

    if (this.loopTimer) clearInterval(this.loopTimer);
    if (this.examineTimer) clearTimeout(this.examineTimer);
    this.loopTimer = null;
    this.examineTimer = null;

    const next = this.getState();
    const canceledOrders: Order[] = next.activeOrders.map((o) => ({ ...o, status: "CANCELED" }));
    this.save({
      ...next,
      running: false,
      phase: "STOPPED",
      activeOrders: [],
      orderHistory: [...canceledOrders, ...next.orderHistory].slice(0, 500)
    });
  }

  addDecision(kind: Decision["kind"], summary: Decision["summary"]): void {
    const state = this.getState();
    const decision: Decision = {
      id: crypto.randomUUID(),
      ts: new Date().toISOString(),
      kind,
      summary
    };
    this.save({ ...state, decisions: [decision, ...state.decisions].slice(0, 500) });
  }
}
