"""Reproduce runtime backtests and audit marked equity, costs and concentration."""

import argparse
import hashlib
import io
import json
import subprocess
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

from research import extract_result, fold_metrics, aggregate


def drawdown(equity, starting):
    values = np.concatenate(([starting], np.asarray(equity, dtype=float)))
    if not np.isfinite(values).all() or (values <= 0).any():
        raise ValueError("Invalid equity series")
    return float((1 - values / np.maximum.accumulate(values)).max() * 100)


def block_interval(returns, settings):
    """Circular block bootstrap; uncertainty diagnostic, not proof of an edge."""
    logs = np.log1p(np.asarray(returns, dtype=float))
    rng = np.random.default_rng(settings["seed"])
    n, block = len(logs), settings["block_days"]
    if n < block or not np.isfinite(logs).all():
        raise ValueError("Insufficient valid returns for block bootstrap")
    starts = rng.integers(n, size=(settings["samples"], int(np.ceil(n / block))))
    indices = ((starts[..., None] + np.arange(block)) % n).reshape(settings["samples"], -1)[:, :n]
    annualized = np.expm1(logs[indices].mean(axis=1) * 365) * 100
    return [float(x) for x in np.quantile(annualized, [0.025, 0.975])]


def daily_closing_equity(marked):
    # A midnight mark closes the preceding day's interval. Do not count the
    # final midnight liquidation as an extra full trading day.
    labels = (marked.index.as_unit("ns") - pd.Timedelta(nanoseconds=1)).floor("1D")
    return marked.groupby(labels).last().asfreq("1D")


def inspect_archive(path, strategy, bootstrap):
    raw = extract_result(path)["strategy"][strategy]
    with zipfile.ZipFile(path) as archive:
        names = [n for n in archive.namelist() if n.endswith(f"_{strategy}_wallet.feather")]
        if len(names) != 1:
            raise ValueError("Expected marked wallet history")
        wallet = pd.read_feather(io.BytesIO(archive.read(names[0])))
    marked = wallet.groupby("date")["total_quote"].sum().sort_index()
    start = float(raw["starting_balance"])
    # Wallet marks precede the final forced liquidation; include the executor's
    # final balance as a separate endpoint, so exit fees are not hidden.
    final = float(raw["final_balance"])
    marked_dd = drawdown(marked, start)
    daily = daily_closing_equity(marked)
    if daily.isna().any():
        raise ValueError("Missing calendar days in equity history")
    daily.iloc[-1] = final
    returns = daily.pct_change(fill_method=None)
    returns.iloc[0] = daily.iloc[0] / start - 1
    profits = sorted((float(t["profit_abs"]) for t in raw["trades"]), reverse=True)
    if not np.isclose(sum(profits), final - start, atol=1e-5):
        raise ValueError("Trade ledger does not reconcile to final capital")
    reported_dd = raw["wallet_stats"]["max_relative_drawdown"] * 100
    if not np.isclose(marked_dd, reported_dd, atol=1e-6):
        raise ValueError("Independent marked drawdown differs from executor")
    return {
        "trades": len(profits), "return_pct": (final / start - 1) * 100,
        "profit_factor": raw["profit_factor"], "marked_drawdown_pct": marked_dd,
        "including_final_exit_drawdown_pct": drawdown(list(marked) + [final], start),
        "closed_trade_drawdown_pct": raw["max_relative_drawdown"] * 100,
        "daily_sharpe_zero_rate": float(returns.mean() / returns.std(ddof=0) * np.sqrt(365)),
        "cagr_pct": float(((final / start) ** (365 / len(daily)) - 1) * 100),
        "cagr_block_bootstrap_95pct": block_interval(returns, bootstrap),
        "net_quote": final - start,
        "top_three_winners_quote": sum(p for p in profits[:3] if p > 0),
        "net_without_top_three_winners_quote": sum(profits) - sum(p for p in profits[:3] if p > 0),
        "final_forced_exits_quote": sum(t["profit_abs"] for t in raw["trades"] if t["exit_reason"] == "force_exit"),
        "per_pair_quote": {pair: sum(t["profit_abs"] for t in raw["trades"] if t["pair"] == pair)
                           for pair in sorted({t["pair"] for t in raw["trades"]})},
    }


def run(root, prior_folds):
    settings_path = root / "apps/trader/research/momentum-audit.json"
    settings = json.loads(settings_path.read_text())
    output = root / "data/trader-v2/research/audits" / datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    output.mkdir(parents=True, exist_ok=False)
    inputs = [settings_path, root / "apps/trader/config.json", root / "apps/trader/momentum_audit.py",
              root / "apps/trader/strategies/MomentumCandidate.py", root / "apps/trader/strategies/AutobotV2.py",
              root / "apps/trader/research.py"]
    inputs += [root / f"data/trader-v2/research/data/binance/{p.replace('/', '_')}-{tf}.feather"
               for p in settings["pairs"] for tf in ("4h", "15m")]
    report = {"settings": settings, "input_sha256": {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in inputs},
              "freqtrade": subprocess.check_output(["freqtrade", "--version"], text=True).strip(), "cases": {}}
    for case in settings["cases"]:
        target = output / case["name"]
        target.mkdir()
        command = ["freqtrade", "backtesting", "--no-color", "--config", str(root / "apps/trader/config.json"),
                   "--strategy-path", str(root / "apps/trader/strategies"), "--strategy", settings["strategy"],
                   "--user-data-dir", str(root / "data/trader-v2/research/user_data"),
                   "--data-dir", str(root / "data/trader-v2/research/data/binance"),
                   "--timeframe", settings["timeframe"], "--timeframe-detail", settings["timeframe_detail"],
                   "--timerange", case["timerange"], "--fee", str(case["cost_per_side"]),
                   "--starting-balance", str(settings["starting_wallet"]), "--max-open-trades", "3",
                   "--enable-protections", "--cache", "none", "--export", "trades", "--export-directory", str(target)]
        with (target / "run.log").open("w") as log:
            subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, check=True)
        archives = list(target.glob("*.zip"))
        if len(archives) != 1:
            raise ValueError("Expected one backtest archive")
        report["cases"][case["name"]] = inspect_archive(archives[0], settings["strategy"], settings["bootstrap"])
        print(case["name"], json.dumps(report["cases"][case["name"]]), flush=True)
    if prior_folds:
        protocol = json.loads((root / "apps/trader/research/protocol-v6-operational.json").read_text())
        rows = []
        for fold in protocol["folds"]:
            if fold["stage"] not in protocol["gate_stages"]:
                continue
            archives = list((prior_folds / fold["name"]).glob("*.zip"))
            if len(archives) != 1:
                raise ValueError("Missing original quarterly archive")
            rows.append(fold_metrics(extract_result(archives[0])["strategy"][settings["strategy"]]))
        report["original_quarterly_gate_with_corrected_risk"] = aggregate(rows, protocol["screening_gate"])
    (output / "report.json").write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    print(output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--prior-folds", type=Path)
    args = parser.parse_args()
    run(args.root.resolve(), args.prior_folds)
