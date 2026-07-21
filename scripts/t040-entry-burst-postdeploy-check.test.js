const test = require("node:test");
const assert = require("node:assert/strict");
const { buildAudit } = require("./t040-entry-burst-postdeploy-check");

const order = (id, minute, side) => ({
  id: String(id),
  ts: `2026-07-21T10:${String(minute).padStart(2, "0")}:00.000Z`,
  symbol: "TESTUSDC",
  side,
  type: "MARKET",
  status: "FILLED",
  qty: 1,
  price: 10
});

const tradeEvent = (id, regime = "NEUTRAL") => ({
  ts: `2026-07-21T10:0${id}:01.000Z`,
  candidateSymbol: "TESTUSDC",
  regime: { label: regime },
  risk: { risk: 100 },
  decision: { kind: "TRADE", orderId: String(id), reason: "entry" }
});

const summary = {
  git: { commit: "abc1234" },
  activity: { orders: { rejected: 0 } },
  health: { errors: 0, restart_count: 0 }
};

test("passes when the guard activates, no third neutral fill occurs, and sells continue", () => {
  const report = buildAudit({
    bundle: "test.tgz",
    summary,
    workspaceCommit: "abc1234",
    state: { orderHistory: [order(4, 4, "SELL"), order(2, 2, "BUY"), order(1, 1, "BUY")] },
    shadowEvents: [
      tradeEvent(1),
      tradeEvent(2),
      {
        ts: "2026-07-21T10:03:00.000Z",
        candidateSymbol: "TESTUSDC",
        regime: { label: "NEUTRAL" },
        decision: { kind: "SKIP", summary: "Skip TESTUSDC: Adaptive neutral entry burst cap reached (2)" }
      }
    ]
  });

  assert.equal(report.verdict, "ENTRY_BURST_POSTDEPLOY_PASS");
  assert.equal(report.evidence.guardActivations, 1);
  assert.equal(report.evidence.violations.length, 0);
  assert.equal(report.evidence.filledSellsAfterFirstActivation, 1);
});

test("fails when a third neutral market entry fills", () => {
  const report = buildAudit({
    bundle: "test.tgz",
    summary,
    workspaceCommit: "abc1234",
    state: { orderHistory: [order(3, 3, "BUY"), order(2, 2, "BUY"), order(1, 1, "BUY"), order(4, 4, "SELL")] },
    shadowEvents: [
      tradeEvent(1),
      tradeEvent(2),
      tradeEvent(3),
      {
        ts: "2026-07-21T10:02:30.000Z",
        candidateSymbol: "TESTUSDC",
        regime: { label: "NEUTRAL" },
        decision: { kind: "SKIP", summary: "Skip TESTUSDC: Adaptive neutral entry burst cap reached (2)" }
      }
    ]
  });

  assert.equal(report.verdict, "ENTRY_BURST_POSTDEPLOY_FAIL");
  assert.equal(report.evidence.violations.length, 1);
});
