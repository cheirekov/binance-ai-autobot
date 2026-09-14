#!/usr/bin/env python3
"""Run a frozen chronological Freqtrade screening protocol and summarize it."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path


def finite(value, default=0.0):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return default
    return number if math.isfinite(number) else default


def extract_result(archive: Path) -> dict:
    with zipfile.ZipFile(archive) as bundle:
        names = [
            name for name in bundle.namelist()
            if name.endswith(".json") and not name.endswith(("_config.json", ".meta.json"))
        ]
        if len(names) != 1:
            raise ValueError(f"Expected one result JSON in {archive}, found {len(names)}")
        return json.loads(bundle.read(names[0]))


def fold_metrics(raw: dict) -> dict:
    trades = raw.get("trades", [])
    return {
        "trades": int(raw.get("total_trades", len(trades))),
        "profit_abs": finite(raw.get("profit_total_abs")),
        "return_pct": finite(raw.get("profit_total")) * 100,
        "profit_factor": finite(raw.get("profit_factor"), None),
        "max_drawdown_pct": finite(raw.get("max_drawdown_account")) * 100,
        "wins": int(raw.get("wins", 0)),
        "losses": int(raw.get("losses", 0)),
        "trade_profits": [finite(trade.get("profit_abs")) for trade in trades],
    }


def aggregate(rows: list[dict], gate: dict) -> dict:
    profits = [profit for row in rows for profit in row["trade_profits"]]
    gross_profit = sum(value for value in profits if value > 0)
    gross_loss = abs(sum(value for value in profits if value < 0))
    infinite_profit_factor = gross_loss == 0 and gross_profit > 0
    profit_factor = gross_profit / gross_loss if gross_loss else None
    total_trades = sum(row["trades"] for row in rows)
    positive_ratio = sum(row["profit_abs"] > 0 for row in rows) / len(rows) if rows else 0
    total_return = sum(row["return_pct"] for row in rows)
    max_drawdown = max((row["max_drawdown_pct"] for row in rows), default=0)
    worst_fold = min((row["return_pct"] for row in rows), default=0)

    checks = {
        "total_trades": total_trades >= gate["min_total_trades"],
        "profit_factor": infinite_profit_factor or (
            profit_factor is not None and profit_factor >= gate["min_profit_factor"]
        ),
        "positive_fold_ratio": positive_ratio >= gate["min_positive_fold_ratio"],
        "total_return_pct": total_return > gate["min_total_return_pct"],
        "max_drawdown_pct": max_drawdown <= gate["max_drawdown_pct"],
        "worst_fold_loss_pct": worst_fold >= -gate["max_worst_fold_loss_pct"],
    }
    return {
        "trades": total_trades,
        "profit_abs": sum(row["profit_abs"] for row in rows),
        "return_pct": total_return,
        "profit_factor": profit_factor,
        "profit_factor_infinite": infinite_profit_factor,
        "positive_fold_ratio": positive_ratio,
        "max_fold_drawdown_pct": max_drawdown,
        "worst_fold_return_pct": worst_fold,
        "expectancy_quote_per_trade": sum(profits) / total_trades if total_trades else 0,
        "checks": checks,
        "screening_pass": all(checks.values()),
    }


def markdown(report: dict) -> str:
    lines = [
        f"# {report['protocol']} result",
        "",
        f"Generated: {report['generated_at']}",
        "",
        "This is a retrospective screening result. A pass does not authorize live trading.",
        "",
        "| Strategy | Eval trades | Eval return | PF | Positive folds | Max fold DD | Worst fold | All-history return | Gate |",
        "|---|---:|---:|---:|---:|---:|---:|---:|:---:|",
    ]
    for name, result in report["strategies"].items():
        evaluation = result["evaluation"]
        overall = result["overall"]
        factor = evaluation["profit_factor"]
        factor_text = "inf" if evaluation["profit_factor_infinite"] else ("n/a" if factor is None else f"{factor:.2f}")
        lines.append(
            f"| {name} | {evaluation['trades']} | {evaluation['return_pct']:.2f}% | "
            f"{factor_text} | {evaluation['positive_fold_ratio']:.0%} | "
            f"{evaluation['max_fold_drawdown_pct']:.2f}% | {evaluation['worst_fold_return_pct']:.2f}% | "
            f"{overall['return_pct']:.2f}% | {'PASS' if evaluation['screening_pass'] else 'FAIL'} |"
        )
    lines.extend(["", "## Fold results", ""])
    for fold in report["folds"]:
        lines.extend([
            f"### {fold['name']} ({fold['stage']}, `{fold['timerange']}`)",
            "",
            "| Strategy | Trades | Return | PF | Drawdown |",
            "|---|---:|---:|---:|---:|",
        ])
        for name, result in fold["strategies"].items():
            factor = result["profit_factor"]
            factor_text = "n/a" if factor is None else f"{factor:.2f}"
            lines.append(
                f"| {name} | {result['trades']} | {result['return_pct']:.2f}% | "
                f"{factor_text} | {result['max_drawdown_pct']:.2f}% |"
            )
        lines.append("")
    lines.extend(["## Gate", "", "```json", json.dumps(report["screening_gate"], indent=2), "```", ""])
    lines.extend(["## Limitations", ""] + [f"- {item}" for item in report["limitations"]] + [""])
    return "\n".join(lines)


def run(args) -> Path:
    protocol_path = Path(args.protocol).resolve()
    protocol_bytes = protocol_path.read_bytes()
    protocol = json.loads(protocol_bytes)
    run_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_dir = Path(args.output_dir).resolve() / run_id
    run_dir.mkdir(parents=True, exist_ok=False)
    user_data_dir = Path(args.user_data_dir).resolve()
    user_data_dir.mkdir(parents=True, exist_ok=True)

    version = subprocess.run(
        [args.freqtrade, "--version"], check=True, text=True, capture_output=True
    ).stdout.strip()
    report = {
        "protocol": protocol["protocol"],
        "protocol_sha256": hashlib.sha256(protocol_bytes).hexdigest(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "freqtrade_version": version,
        "folds": [],
        "screening_gate": protocol["screening_gate"],
        "limitations": protocol["limitations"],
    }
    by_strategy = {name: [] for name in protocol["strategies"]}
    gate_rows = {name: [] for name in protocol["strategies"]}

    for fold in protocol["folds"]:
        fold_dir = run_dir / fold["name"]
        fold_dir.mkdir()
        command = [
            args.freqtrade, "backtesting", "--no-color",
            "--config", str(Path(args.config).resolve()),
            "--user-data-dir", str(user_data_dir),
            "--strategy-path", str(Path(args.strategy_path).resolve()),
            "--strategy-list", *protocol["strategies"],
            "--data-dir", str(Path(args.data_dir).resolve()),
            "--timeframe", protocol["timeframe"],
            "--timerange", fold["timerange"],
            "--fee", str(protocol["fee_ratio_per_side"]),
            "--starting-balance", str(protocol["starting_wallet"]),
            "--stake-amount", str(protocol["stake_amount"]),
            "--max-open-trades", str(protocol["max_open_trades"]),
            "--enable-protections", "--cache", "none", "--export", "trades",
            "--export-directory", str(fold_dir),
        ]
        completed = subprocess.run(command, text=True, capture_output=True)
        if completed.returncode:
            (fold_dir / "stderr.log").write_text(completed.stderr)
            raise RuntimeError(f"Backtest failed for {fold['name']}; see {fold_dir / 'stderr.log'}")
        archives = list(fold_dir.glob("*.zip"))
        if len(archives) != 1:
            raise RuntimeError(f"Expected one result archive for {fold['name']}, found {len(archives)}")
        raw = extract_result(archives[0]).get("strategy", {})
        fold_result = {"name": fold["name"], "stage": fold["stage"], "timerange": fold["timerange"], "strategies": {}}
        for strategy in protocol["strategies"]:
            if strategy not in raw:
                raise RuntimeError(f"Missing {strategy} in {archives[0]}")
            metrics = fold_metrics(raw[strategy])
            fold_result["strategies"][strategy] = {key: value for key, value in metrics.items() if key != "trade_profits"}
            by_strategy[strategy].append(metrics)
            if fold["stage"] in protocol["gate_stages"]:
                gate_rows[strategy].append(metrics)
        report["folds"].append(fold_result)

    report["strategies"] = {
        name: {
            "overall": aggregate(rows, protocol["screening_gate"]),
            "evaluation": aggregate(gate_rows[name], protocol["screening_gate"]),
        }
        for name, rows in by_strategy.items()
    }
    (run_dir / "report.json").write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    (run_dir / "report.md").write_text(markdown(report))
    return run_dir


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description=__doc__)
    result.add_argument("--protocol", default="apps/trader/research/protocol-v1.json")
    result.add_argument("--config", default="apps/trader/config.json")
    result.add_argument("--strategy-path", default="apps/trader/strategies")
    result.add_argument("--data-dir", default="data/trader-v2/research/data/binance")
    result.add_argument("--user-data-dir", default="data/trader-v2/research/user_data")
    result.add_argument("--output-dir", default="data/trader-v2/research/runs")
    result.add_argument("--freqtrade", default="freqtrade")
    return result


if __name__ == "__main__":
    try:
        print(run(parser().parse_args()))
    except Exception as error:
        print(f"research failed: {error}", file=sys.stderr)
        raise SystemExit(1)
