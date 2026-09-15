#!/usr/bin/env python3
"""Causal long/cash portfolio research with explicit turnover costs."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd


def load_closes(data_dir: Path, pairs: list[str], timeframe: str, end: str) -> pd.DataFrame:
    series = {}
    end_at = pd.Timestamp(end, tz="UTC")
    step = pd.Timedelta(timeframe)
    if step <= pd.Timedelta(0) or pd.Timedelta(days=1) % step:
        raise ValueError("Timeframe must divide one day")
    expected_count = int(pd.Timedelta(days=1) / step)
    for pair in pairs:
        path = data_dir / f"{pair.replace('/', '_')}-{timeframe}.feather"
        frame = pd.read_feather(path)
        if not {"date", "close", "volume"}.issubset(frame.columns):
            raise ValueError(f"Missing OHLCV columns in {path}")
        frame = frame[frame["date"] < end_at].sort_values("date")
        if (frame.empty or frame["date"].duplicated().any()
                or not np.isfinite(frame[["close", "volume"]]).all().all()
                or (frame["close"] <= 0).any() or (frame["volume"] < 0).any()
                or (frame["date"].dt.as_unit("ns").astype("int64") % step.value != 0).any()):
            raise ValueError(f"Invalid candle data: {path}")
        # A market listing can begin mid-day. Exclude that first partial day,
        # but never silently remove an interior missing candle or trading day.
        first = frame["date"].iloc[0].ceil("1D")
        frame = frame[frame["date"] >= first]
        daily_groups = frame.set_index("date")["close"].resample("1D")
        if frame.empty or (daily_groups.count() != expected_count).any():
            raise ValueError(f"Incomplete daily candle coverage: {path}")
        daily = daily_groups.last()
        series[pair] = daily
    common_start = max(item.index.min() for item in series.values())
    common_end = min(item.index.max() for item in series.values())
    closes = pd.DataFrame(series).loc[common_start:common_end]
    if closes.empty or not closes.index.is_monotonic_increasing or closes.isna().any().any():
        raise ValueError("Aligned daily close data is incomplete")
    return closes


def rebalance_after_cost(weights: pd.Series, desired: pd.Series, cost: float):
    """Solve cash conservation with target weights measured AFTER fees.

    x + cost * sum(abs(x * desired - old_weights)) = 1.
    Turnover is actual notional divided by pre-rebalance equity.
    """
    if not 0 <= cost < 1:
        raise ValueError("Invalid execution cost")
    low, high = 0.0, 1.0
    for _ in range(48):
        ratio = (low + high) / 2
        paid = cost * float((desired * ratio - weights).abs().sum())
        if ratio + paid > 1:
            high = ratio
        else:
            low = ratio
    ratio = (low + high) / 2
    return ratio, float((desired * ratio - weights).abs().sum())


def capped_weights(scores: pd.Series, cap: float) -> pd.Series:
    result = pd.Series(0.0, index=scores.index)
    remaining = scores[scores > 0].astype(float)
    budget = 1.0
    while not remaining.empty and budget > 1e-12:
        allocation = remaining / remaining.sum() * budget
        capped = allocation[allocation >= cap]
        if capped.empty:
            result.loc[allocation.index] = allocation
            break
        result.loc[capped.index] = cap
        budget -= cap * len(capped)
        remaining = remaining.drop(capped.index)
    return result.clip(lower=0, upper=cap)


def volatility_scale(
    weights: pd.Series, closes: pd.DataFrame, at: int, lookback: int, target_volatility: float
) -> pd.Series:
    if not weights.any() or at < lookback:
        return weights * 0
    returns = closes.pct_change().iloc[at - lookback + 1:at + 1]
    covariance = returns.cov().fillna(0) * 365
    values = weights.to_numpy()
    variance = float(values @ covariance.to_numpy() @ values)
    if not math.isfinite(variance) or variance <= 0:
        return weights * 0
    scale = min(1.0, target_volatility / math.sqrt(variance))
    return weights * scale


def target(candidate: dict, closes: pd.DataFrame, at: int, protocol: dict) -> pd.Series:
    zero = pd.Series(0.0, index=closes.columns)
    kind = candidate["kind"]
    if kind == "buy_hold":
        return capped_weights(pd.Series(1.0, index=closes.columns), protocol["max_asset_weight"])
    if kind == "tsmom_equal":
        lookback = candidate["lookback_days"]
        if at < lookback:
            return zero
        active = closes.iloc[at] / closes.iloc[at - lookback] - 1 > 0
        return capped_weights(active.astype(float), protocol["max_asset_weight"])
    if kind == "tsmom_dual_vol":
        fast, slow = candidate["fast_days"], candidate["slow_days"]
        vol_window = protocol["volatility_lookback_days"]
        if at < max(fast, slow, vol_window):
            return zero
        fast_signal = closes.iloc[at] / closes.iloc[at - fast] - 1 > 0
        slow_signal = closes.iloc[at] / closes.iloc[at - slow] - 1 > 0
        volatility = closes.pct_change().iloc[at - vol_window + 1:at + 1].std()
        scores = (fast_signal & slow_signal).astype(float) / volatility.replace(0, np.nan)
        return capped_weights(scores.fillna(0), protocol["max_asset_weight"])
    if kind in {"tsmom_vol", "tsmom_vol_market_gate"}:
        lookback = candidate["lookback_days"]
        vol_window = protocol["volatility_lookback_days"]
        if at < max(lookback, vol_window):
            return zero
        active = closes.iloc[at] / closes.iloc[at - lookback] - 1 > 0
        if kind == "tsmom_vol_market_gate":
            market_pair = candidate["market_pair"]
            market_positive = bool(active[market_pair])
            if not market_positive:
                active.loc[:] = False
        base = capped_weights(active.astype(float), protocol["max_asset_weight"])
        return volatility_scale(
            base, closes, at, vol_window, candidate["target_annual_volatility"]
        )
    raise ValueError(f"Unsupported candidate kind: {kind}")


def simulate(closes: pd.DataFrame, candidate: dict, protocol: dict) -> pd.DataFrame:
    start = pd.Timestamp(protocol["start"], tz="UTC")
    end = pd.Timestamp(protocol["end"], tz="UTC")
    start_index = closes.index.searchsorted(start)
    end_index = closes.index.searchsorted(end)
    if start_index < 1 or end_index <= start_index:
        raise ValueError("Insufficient simulation range")
    expected = pd.date_range(start, end, inclusive="left", freq="1D")
    if not closes.index[start_index:end_index].as_unit("ns").equals(expected.as_unit("ns")):
        raise ValueError("Simulation must cover every requested calendar day")
    required_history = max(candidate.get("lookback_days", 0), candidate.get("slow_days", 0),
                           candidate.get("fast_days", 0),
                           protocol.get("volatility_lookback_days", 0) if "vol" in candidate["kind"] else 0)
    if start_index < required_history + 1:
        raise ValueError(f"Insufficient warmup: need {required_history + 1} prior daily closes")

    weights = pd.Series(0.0, index=closes.columns)
    equity = 1.0
    bought = False
    records = []
    cost_ratio = protocol["execution_cost_ratio_per_turnover"]

    for at in range(start_index, end_index):
        signal_at = at - 1
        signal_date = closes.index[signal_at]
        should_rebalance = signal_date.weekday() == protocol["rebalance_weekday_utc"]
        if candidate["kind"] == "buy_hold":
            should_rebalance = not bought
        turnover = 0.0
        equity_before = equity
        if should_rebalance:
            desired = target(candidate, closes, signal_at, protocol)
            remaining, turnover = rebalance_after_cost(weights, desired, cost_ratio)
            equity *= remaining
            weights = desired
            bought = True

        asset_returns = closes.iloc[at] / closes.iloc[at - 1] - 1
        gross_return = float((weights * asset_returns).sum())
        equity *= 1 + gross_return
        cash_weight = max(0.0, 1 - float(weights.sum()))
        denominator = 1 + gross_return
        if denominator <= 0:
            raise ValueError("Portfolio equity became non-positive")
        weights = weights * (1 + asset_returns) / denominator
        cash_weight /= denominator
        total_weight = float(weights.sum()) + cash_weight
        weights /= total_weight
        records.append({
            "date": closes.index[at],
            "equity": equity,
            "net_return": equity / equity_before - 1,
            "turnover": turnover,
            "exposure": float(weights.sum()),
        })
    return pd.DataFrame(records).set_index("date")


def metrics(frame: pd.DataFrame) -> dict:
    if frame.empty:
        raise ValueError("Cannot calculate empty performance period")
    total_return = float((1 + frame["net_return"]).prod() - 1)
    years = len(frame) / 365.25
    cagr = (1 + total_return) ** (1 / years) - 1 if years > 0 and total_return > -1 else -1
    volatility = float(frame["net_return"].std(ddof=0) * math.sqrt(365))
    sharpe = float(frame["net_return"].mean() / frame["net_return"].std(ddof=0) * math.sqrt(365)) if volatility else 0
    curve = (1 + frame["net_return"]).cumprod()
    drawdown = curve / curve.cummax().clip(lower=1.0) - 1
    return {
        "days": len(frame),
        "return_pct": total_return * 100,
        "cagr_pct": cagr * 100,
        "annualized_volatility_pct": volatility * 100,
        "sharpe_zero_rate": sharpe,
        "max_drawdown_pct": abs(float(drawdown.min())) * 100,
        "rebalance_events": int((frame["turnover"] > 1e-12).sum()),
        "total_turnover": float(frame["turnover"].sum()),
        "average_exposure_pct": float(frame["exposure"].mean()) * 100,
    }


def evaluate(frame: pd.DataFrame, protocol: dict, role: str) -> dict:
    folds = []
    gate_frames = []
    for fold in protocol["folds"]:
        section = frame[(frame.index >= fold["start"]) & (frame.index < fold["end"])]
        result = {**fold, **metrics(section)}
        folds.append(result)
        if fold["stage"] in protocol["gate_stages"]:
            gate_frames.append(section)
    evaluation = metrics(pd.concat(gate_frames).sort_index())
    positive_fold_ratio = sum(
        fold["return_pct"] > 0 for fold in folds if fold["stage"] in protocol["gate_stages"]
    ) / len(gate_frames)
    evaluation["positive_fold_ratio"] = positive_fold_ratio
    gate = protocol["screening_gate"]
    checks = {
        "rebalance_events": evaluation["rebalance_events"] >= gate["min_rebalance_events"],
        "cagr_pct": evaluation["cagr_pct"] >= gate["min_cagr_pct"],
        "sharpe": evaluation["sharpe_zero_rate"] >= gate["min_sharpe"],
        "positive_fold_ratio": positive_fold_ratio >= gate["min_positive_fold_ratio"],
        "max_drawdown_pct": evaluation["max_drawdown_pct"] <= gate["max_drawdown_pct"],
    }
    evaluation["checks"] = checks
    evaluation["screening_pass"] = role == "candidate" and all(checks.values())
    return {"overall": metrics(frame), "evaluation": evaluation, "folds": folds}


def markdown(report: dict) -> str:
    lines = [
        f"# {report['protocol']} result", "",
        "Historical diagnostic only; a pass would still require prospective confirmation.", "",
        "| Portfolio | Role | Eval return | CAGR | Sharpe | Max DD | Positive folds | Rebalances | Gate |",
        "|---|---|---:|---:|---:|---:|---:|---:|:---:|",
    ]
    for name, result in report["candidates"].items():
        value = result["evaluation"]
        role = result["role"]
        lines.append(
            f"| {name} | {role} | {value['return_pct']:.2f}% | {value['cagr_pct']:.2f}% | "
            f"{value['sharpe_zero_rate']:.2f} | {value['max_drawdown_pct']:.2f}% | "
            f"{value['positive_fold_ratio']:.0%} | {value['rebalance_events']} | "
            f"{'PASS' if value['screening_pass'] else ('n/a' if role == 'benchmark' else 'FAIL')} |"
        )
    lines.extend(["", "## Limitations", ""])
    lines.extend(f"- {item}" for item in report["limitations"])
    lines.append("")
    return "\n".join(lines)


def run(protocol_path: Path, data_dir: Path, output_dir: Path) -> Path:
    raw = protocol_path.read_bytes()
    protocol = json.loads(raw)
    closes = load_closes(data_dir, protocol["pairs"], protocol["timeframe"], protocol["end"])
    report = {
        "protocol": protocol["protocol"],
        "protocol_sha256": hashlib.sha256(raw).hexdigest(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "candidates": {},
        "screening_gate": protocol["screening_gate"],
        "limitations": protocol["limitations"],
    }
    for candidate in protocol["candidates"]:
        result = evaluate(simulate(closes, candidate, protocol), protocol, candidate["role"])
        report["candidates"][candidate["name"]] = {"role": candidate["role"], **result}
    run_dir = output_dir / datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir.mkdir(parents=True, exist_ok=False)
    (run_dir / "report.json").write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    (run_dir / "report.md").write_text(markdown(report))
    return run_dir


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--protocol", default="apps/trader/research/portfolio-v3.json")
    result.add_argument("--data-dir", default="data/trader-v2/research/data/binance")
    result.add_argument("--output-dir", default="data/trader-v2/research/portfolio-runs")
    return result


if __name__ == "__main__":
    args = parser().parse_args()
    print(run(Path(args.protocol).resolve(), Path(args.data_dir).resolve(), Path(args.output_dir).resolve()))
