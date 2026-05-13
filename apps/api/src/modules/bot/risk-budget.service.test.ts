import { describe, expect, it } from "vitest";

import { deriveRiskBudgetDecision, type RiskBudgetInput } from "./risk-budget.service";

const baselineInput = (overrides: Partial<RiskBudgetInput> = {}): RiskBudgetInput => ({
  risk: 100,
  walletTotalHome: 7_000,
  riskState: {
    state: "NORMAL",
    trigger: "NONE",
    dailyRealizedPnl: 0,
    managedExposurePct: 0
  },
  regime: {
    label: "NEUTRAL",
    confidence: 0.4
  },
  strategy: {
    trend: 0.45,
    meanReversion: 0.35,
    grid: 0.4,
    recommended: "GRID"
  },
  openExposureHome: 0,
  openPositions: 0,
  activeOrderCount: 0,
  baseMinNetEdgePct: 0.2,
  estimatedRoundTripCostPct: 0.46,
  ...overrides
});

describe("deriveRiskBudgetDecision", () => {
  it("keeps HALT reduce-only even at maximum risk", () => {
    const decision = deriveRiskBudgetDecision(
      baselineInput({
        riskState: {
          state: "HALT",
          trigger: "ABS_DAILY_LOSS",
          dailyRealizedPnl: -150,
          managedExposurePct: 0.08,
          maxDailyLossAbs: 180
        },
        openExposureHome: 700,
        openPositions: 3
      })
    );

    expect(decision.lane).toBe("RISK_OFF");
    expect(decision.allowedActions.openNewPosition).toBe(false);
    expect(decision.allowedActions.placeGridBuy).toBe(false);
    expect(decision.allowedActions.reduceOnly).toBe(true);
    expect(decision.maxNewExposureHome).toBe(0);
  });

  it("blocks new exposure during active profit-giveback caution", () => {
    const decision = deriveRiskBudgetDecision(
      baselineInput({
        riskState: {
          state: "CAUTION",
          trigger: "PROFIT_GIVEBACK",
          dailyRealizedPnl: -33,
          peakDailyRealizedPnl: 19,
          profitGivebackPct: 2.5,
          profitGivebackCautionPct: 0.45,
          managedExposurePct: 0.002
        },
        regime: {
          label: "BULL_TREND",
          confidence: 0.82
        },
        strategy: {
          trend: 0.92,
          meanReversion: 0.18,
          grid: 0.55,
          recommended: "TREND"
        }
      })
    );

    expect(decision.lane).toBe("DEFENSIVE");
    expect(decision.allowedActions.openNewPosition).toBe(false);
    expect(decision.allowedActions.marketEntry).toBe(false);
    expect(decision.reasons).toContain("profit-giveback-caution");
  });

  it("allows a small recovery opportunity only after caution has stabilized", () => {
    const decision = deriveRiskBudgetDecision(
      baselineInput({
        riskState: {
          state: "CAUTION",
          trigger: "PROFIT_GIVEBACK",
          dailyRealizedPnl: 12,
          peakDailyRealizedPnl: 20,
          profitGivebackPct: 0.12,
          profitGivebackCautionPct: 0.45,
          managedExposurePct: 0.001
        },
        regime: {
          label: "BULL_TREND",
          confidence: 0.81
        },
        strategy: {
          trend: 0.9,
          meanReversion: 0.2,
          grid: 0.62,
          recommended: "TREND"
        }
      })
    );

    expect(decision.lane).toBe("RECOVERY_OPPORTUNITY");
    expect(decision.allowedActions.openNewPosition).toBe(true);
    expect(decision.maxNewExposureHome).toBeLessThanOrEqual(31.5);
    expect(decision.reasons).toContain("caution-recovery-opportunity");
  });

  it("requires fee-proof edge instead of lowering thresholds blindly at high risk", () => {
    const decision = deriveRiskBudgetDecision(
      baselineInput({
        risk: 100,
        baseMinNetEdgePct: 0.08,
        estimatedRoundTripCostPct: 0.5
      })
    );

    expect(decision.minNetEdgePct).toBeGreaterThanOrEqual(0.605);
  });

  it("turns confirmed bear trends defensive even when the slider is high", () => {
    const decision = deriveRiskBudgetDecision(
      baselineInput({
        regime: {
          label: "BEAR_TREND",
          confidence: 0.72
        },
        strategy: {
          trend: 0.42,
          meanReversion: 0.5,
          grid: 0.3,
          recommended: "MEAN_REVERSION"
        },
        openExposureHome: 250,
        openPositions: 2
      })
    );

    expect(decision.lane).toBe("DEFENSIVE");
    expect(decision.allowedActions.placeGridBuy).toBe(false);
    expect(decision.allowedActions.placeGridSell).toBe(true);
    expect(decision.reasons).toContain("confirmed-bear-trend");
  });
});
