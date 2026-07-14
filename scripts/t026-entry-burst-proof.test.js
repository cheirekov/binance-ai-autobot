const test = require("node:test");
const assert = require("node:assert/strict");
const { buildProof } = require("./t026-entry-burst-proof");

const order = (id, minute, side, qty, price, feeHome = 0.1) => ({
  id: String(id),
  ts: `2026-07-14T00:${String(minute).padStart(2, "0")}:00.000Z`,
  symbol: "TESTUSDC",
  side,
  type: "MARKET",
  status: "FILLED",
  qty,
  price,
  feeHome
});

const shadow = (id, side, regime = "NEUTRAL") => ({
  executionLane: side === "BUY" ? "MARKET" : "DEFENSIVE",
  regime: { label: regime },
  strategy: { recommended: "TREND" },
  decision: {
    kind: "TRADE",
    orderId: String(id),
    reason: side === "BUY" ? "entry" : "stop-loss-exit"
  }
});

test("caps repeated neutral entries while preserving the sell path", () => {
  const orders = [
    order(1, 1, "BUY", 1, 100),
    order(2, 2, "BUY", 1, 99),
    order(3, 3, "BUY", 1, 98),
    order(4, 4, "BUY", 1, 97),
    order(5, 5, "SELL", 2, 90, 0.2),
    order(6, 6, "SELL", 2, 90, 0.2),
    order(7, 7, "BUY", 1, 91),
    order(8, 8, "BUY", 1, 92),
    order(9, 9, "BUY", 1, 93)
  ];
  const report = buildProof({
    previousSummary: { generated_at: "2026-07-14T00:00:00.000Z" },
    previousKpis: { symbols: [] },
    currentSummary: {
      generated_at: "2026-07-14T01:00:00.000Z",
      activity: { orders: { rejected: 0 } },
      health: { errors: 0, restart_count: 0 }
    },
    currentState: { orderHistory: orders },
    currentUniverse: { candidates: [{ symbol: "TESTUSDC", lastPrice: 92 }] },
    shadowEvents: orders.map((item) => shadow(item.id, item.side)),
    maxNeutralEntries: 2
  });

  assert.equal(report.verdict, "ENTRY_BURST_GUARD_OFFLINE_PROOF_PASSED");
  assert.equal(report.candidate.suppressedEntries, 3);
  assert.equal(report.checks.sellPathPreserved, true);
  assert.equal(report.candidate.sellOrdersSkippedNoInventory, 1);
  assert.ok(report.candidate.fees < report.baseline.fees);
  assert.ok(report.candidate.markToMarketPnl > report.baseline.markToMarketPnl);
});

test("does not cap strong bull entries", () => {
  const orders = Array.from({ length: 8 }, (_, index) => order(index + 1, index + 1, "BUY", 1, 100 - index));
  const report = buildProof({
    previousSummary: { generated_at: "2026-07-14T00:00:00.000Z" },
    previousKpis: { symbols: [] },
    currentSummary: {
      generated_at: "2026-07-14T01:00:00.000Z",
      activity: { orders: { rejected: 0 } },
      health: { errors: 0, restart_count: 0 }
    },
    currentState: { orderHistory: orders },
    currentUniverse: { candidates: [{ symbol: "TESTUSDC", lastPrice: 100 }] },
    shadowEvents: orders.map((item) => shadow(item.id, item.side, "BULL_TREND")),
    maxNeutralEntries: 2
  });

  assert.equal(report.candidate.suppressedEntries, 0);
  assert.equal(report.verdict, "ENTRY_BURST_GUARD_OFFLINE_PROOF_INCONCLUSIVE");
});
