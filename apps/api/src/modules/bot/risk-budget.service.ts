export type RiskBudgetRiskState = "NORMAL" | "CAUTION" | "HALT";
export type RiskBudgetTrigger = "NONE" | "ABS_DAILY_LOSS" | "PROFIT_GIVEBACK";
export type RiskBudgetRegimeLabel = "BULL_TREND" | "BEAR_TREND" | "RANGE" | "NEUTRAL" | "UNKNOWN";
export type RiskBudgetStrategy = "TREND" | "MEAN_REVERSION" | "GRID";
export type RiskBudgetLane = "RISK_OFF" | "DEFENSIVE" | "BASELINE" | "OPPORTUNITY" | "RECOVERY_OPPORTUNITY";

export type RiskBudgetRegime = {
  label: RiskBudgetRegimeLabel;
  confidence: number;
};

export type RiskBudgetStrategyScores = {
  trend: number;
  meanReversion: number;
  grid: number;
  recommended: RiskBudgetStrategy;
};

export type RiskBudgetGuard = {
  state: RiskBudgetRiskState;
  trigger: RiskBudgetTrigger;
  dailyRealizedPnl: number;
  peakDailyRealizedPnl?: number;
  profitGivebackPct?: number;
  profitGivebackCautionPct?: number;
  managedExposurePct?: number;
  maxDailyLossAbs?: number;
};

export type RiskBudgetRecentPerformance = {
  trades: number;
  realizedPnlHome: number;
  feesHome: number;
};

export type RiskBudgetInput = {
  risk: number;
  walletTotalHome: number;
  riskState: RiskBudgetGuard;
  regime: RiskBudgetRegime;
  strategy: RiskBudgetStrategyScores;
  openExposureHome: number;
  openPositions: number;
  activeOrderCount: number;
  baseMinNetEdgePct: number;
  estimatedRoundTripCostPct?: number;
  recentPerformance?: RiskBudgetRecentPerformance;
};

export type RiskBudgetDecision = {
  lane: RiskBudgetLane;
  allowedActions: {
    openNewPosition: boolean;
    increasePosition: boolean;
    placeGridBuy: boolean;
    placeGridSell: boolean;
    marketEntry: boolean;
    reduceOnly: boolean;
  };
  maxNewExposureHome: number;
  maxTotalExposurePct: number;
  maxTradeNotionalHome: number;
  minNetEdgePct: number;
  cooldownBias: "STRICT" | "NORMAL" | "FAST";
  reasons: string[];
};

const round = (value: number, decimals = 6): number => {
  if (!Number.isFinite(value)) return 0;
  const power = 10 ** decimals;
  return Math.round(value * power) / power;
};

const clamp = (value: number, min: number, max: number): number => {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
};

const isStrongBullOpportunity = (input: RiskBudgetInput): boolean => {
  const confidence = Number.isFinite(input.regime.confidence) ? input.regime.confidence : 0;
  return (
    input.regime.label === "BULL_TREND" &&
    confidence >= 0.68 &&
    input.strategy.recommended === "TREND" &&
    input.strategy.trend >= input.strategy.grid + 0.08
  );
};

const isConfirmedBear = (input: RiskBudgetInput): boolean => {
  const confidence = Number.isFinite(input.regime.confidence) ? input.regime.confidence : 0;
  return input.regime.label === "BEAR_TREND" && confidence >= 0.58;
};

export function deriveRiskBudgetDecision(input: RiskBudgetInput): RiskBudgetDecision {
  const risk = clamp(input.risk, 0, 100);
  const riskNorm = risk / 100;
  const walletTotalHome = Math.max(0, Number.isFinite(input.walletTotalHome) ? input.walletTotalHome : 0);
  const openExposureHome = Math.max(0, Number.isFinite(input.openExposureHome) ? input.openExposureHome : 0);
  const openPositions = Math.max(0, Math.floor(Number.isFinite(input.openPositions) ? input.openPositions : 0));
  const activeOrderCount = Math.max(0, Math.floor(Number.isFinite(input.activeOrderCount) ? input.activeOrderCount : 0));
  const roundTripCostPct = Math.max(
    0,
    Number.isFinite(input.estimatedRoundTripCostPct ?? Number.NaN) ? input.estimatedRoundTripCostPct ?? 0 : 0.28
  );
  const baseMinNetEdgePct = Math.max(0.03, Number.isFinite(input.baseMinNetEdgePct) ? input.baseMinNetEdgePct : 0.2);
  const reasons: string[] = [];

  const currentExposurePct = walletTotalHome > 0 ? (openExposureHome / walletTotalHome) * 100 : 0;
  const maxTotalExposurePct = round(0.35 + riskNorm * 4.65, 4);
  const maxTradePct = 0.12 + riskNorm * 1.38;
  const totalExposureCapacityHome = Math.max(0, walletTotalHome * (maxTotalExposurePct / 100) - openExposureHome);
  let maxTradeNotionalHome = Math.min(walletTotalHome * (maxTradePct / 100), totalExposureCapacityHome);

  const feeProofMinEdgePct = roundTripCostPct * 1.15 + 0.03;
  let minNetEdgePct = Math.max(feeProofMinEdgePct, baseMinNetEdgePct * (1 - riskNorm * 0.25));
  let lane: RiskBudgetLane = "BASELINE";
  let allowNewExposure = walletTotalHome > 0 && maxTradeNotionalHome > 0;
  let cooldownBias: RiskBudgetDecision["cooldownBias"] = "NORMAL";

  const guard = input.riskState;
  const strongBull = isStrongBullOpportunity(input);
  const confirmedBear = isConfirmedBear(input);
  const dailyRealizedPnl = Number.isFinite(guard.dailyRealizedPnl) ? guard.dailyRealizedPnl : 0;
  const profitGivebackPct = Number.isFinite(guard.profitGivebackPct ?? Number.NaN) ? guard.profitGivebackPct ?? 0 : 0;
  const profitGivebackCautionPct = Number.isFinite(guard.profitGivebackCautionPct ?? Number.NaN)
    ? guard.profitGivebackCautionPct ?? 0
    : 0;
  const managedExposurePct = Number.isFinite(guard.managedExposurePct ?? Number.NaN) ? guard.managedExposurePct ?? 0 : currentExposurePct / 100;

  if (guard.state === "HALT") {
    lane = "RISK_OFF";
    allowNewExposure = false;
    cooldownBias = "STRICT";
    minNetEdgePct += 0.3;
    reasons.push("risk-state-halt");
  } else if (confirmedBear) {
    lane = "DEFENSIVE";
    allowNewExposure = false;
    cooldownBias = "STRICT";
    minNetEdgePct += 0.2;
    reasons.push("confirmed-bear-trend");
  } else if (guard.state === "CAUTION") {
    const givebackStillActive =
      guard.trigger === "PROFIT_GIVEBACK" &&
      (dailyRealizedPnl < 0 ||
        (profitGivebackCautionPct > 0 && profitGivebackPct >= profitGivebackCautionPct * 0.85));
    const lossStillActive = guard.trigger === "ABS_DAILY_LOSS" && dailyRealizedPnl < 0;
    const nearFlat = managedExposurePct <= 0.01 && openPositions <= 2 && activeOrderCount === 0;

    if (strongBull && nearFlat && dailyRealizedPnl >= 0 && !givebackStillActive && !lossStillActive) {
      lane = "RECOVERY_OPPORTUNITY";
      cooldownBias = "STRICT";
      maxTradeNotionalHome = Math.min(maxTradeNotionalHome, walletTotalHome * (0.45 / 100));
      minNetEdgePct += 0.12;
      reasons.push("caution-recovery-opportunity");
    } else {
      lane = "DEFENSIVE";
      allowNewExposure = false;
      cooldownBias = "STRICT";
      minNetEdgePct += givebackStillActive || lossStillActive ? 0.25 : 0.15;
      reasons.push(givebackStillActive ? "profit-giveback-caution" : lossStillActive ? "daily-loss-caution" : "caution-risk-state");
    }
  } else if (strongBull) {
    lane = "OPPORTUNITY";
    cooldownBias = "FAST";
    minNetEdgePct = Math.max(feeProofMinEdgePct, minNetEdgePct * 0.92);
    reasons.push("strong-bull-trend");
  }

  const recent = input.recentPerformance;
  const recentNetPnl = recent ? recent.realizedPnlHome - recent.feesHome : 0;
  if (recent && recent.trades >= 4 && recentNetPnl < 0) {
    minNetEdgePct += 0.15;
    if (!strongBull || guard.state !== "NORMAL") {
      allowNewExposure = false;
      lane = lane === "RISK_OFF" ? lane : "DEFENSIVE";
      cooldownBias = "STRICT";
    }
    reasons.push("recent-negative-expectancy");
  }

  if (currentExposurePct >= maxTotalExposurePct) {
    allowNewExposure = false;
    maxTradeNotionalHome = 0;
    reasons.push("portfolio-exposure-budget-full");
  }

  const maxNewExposureHome = allowNewExposure ? Math.max(0, maxTradeNotionalHome) : 0;
  if (maxNewExposureHome <= 0 && lane !== "RISK_OFF" && lane !== "DEFENSIVE") {
    lane = "DEFENSIVE";
    cooldownBias = "STRICT";
    reasons.push("no-new-exposure-budget");
  }

  return {
    lane,
    allowedActions: {
      openNewPosition: maxNewExposureHome > 0,
      increasePosition: maxNewExposureHome > 0,
      placeGridBuy: maxNewExposureHome > 0,
      placeGridSell: openPositions > 0 || openExposureHome > 0,
      marketEntry: maxNewExposureHome > 0 && lane !== "DEFENSIVE" && lane !== "RISK_OFF",
      reduceOnly: openPositions > 0 || openExposureHome > 0
    },
    maxNewExposureHome: round(maxNewExposureHome, 6),
    maxTotalExposurePct,
    maxTradeNotionalHome: round(maxNewExposureHome, 6),
    minNetEdgePct: round(minNetEdgePct, 6),
    cooldownBias,
    reasons: reasons.length > 0 ? reasons : ["baseline-risk-budget"]
  };
}
