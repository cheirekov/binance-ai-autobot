import { useState } from "react";

import { apiPost } from "../api/http";
import { type V2Account, useTraderV2Snapshot } from "../hooks/useTraderV2Snapshot";

function money(value: number | undefined, currency = "USDC") {
  return value === undefined ? "—" : `${value.toFixed(2)} ${currency}`;
}

function percent(value: number | undefined) {
  return value === undefined ? "—" : `${value.toFixed(2)}%`;
}

function time(value: string | undefined) {
  return value ? new Date(value).toLocaleString() : "—";
}

function tone(account: V2Account) {
  if (!account.reachable) return "pill bad";
  return account.running ? "pill ok" : "pill warn";
}

function AccountCard({ name, label, account, busy, control }: {
  name: "baseline" | "astra";
  label: string;
  account: V2Account;
  busy: boolean;
  control: (name: "baseline" | "astra", action: "start" | "pause" | "stop") => void;
}) {
  const quote = account.wallet.currency ?? "USDC";
  return (
    <div className="card">
      <div className="topbar compact">
        <div>
          <div className="title">{label}</div>
          <div className="subtitle">{account.strategy ?? "Strategy unavailable"}</div>
        </div>
        <span className={tone(account)}>{account.reachable ? account.state : account.error ?? "unreachable"}</span>
      </div>
      <div className="metric-grid">
        <div><span>Wallet</span><b>{money(account.wallet.totalQuote, quote)}</b></div>
        <div><span>Closed P&amp;L</span><b>{money(account.metrics.profit_closed_coin, quote)}</b></div>
        <div><span>Marked P&amp;L</span><b>{money(account.metrics.profit_all_coin, quote)}</b></div>
        <div><span>Drawdown</span><b>{percent(account.metrics.max_drawdown === undefined ? undefined : account.metrics.max_drawdown * 100)}</b></div>
        <div><span>Trades</span><b>{account.metrics.trade_count ?? "—"}</b></div>
        <div><span>Win rate</span><b>{percent(account.metrics.winrate === undefined ? undefined : account.metrics.winrate * 100)}</b></div>
      </div>
      <div className="subtitle">Last engine loop: {time(account.lastProcess)} · Open positions: {account.openPositions.length}</div>
      <div className="actions">
        <button className="btn primary" disabled={busy || !account.reachable || account.running} onClick={() => control(name, "start")}>Start</button>
        <button className="btn" disabled={busy || !account.reachable || !account.running} onClick={() => control(name, "pause")}>Pause entries</button>
        <button className="btn danger" disabled={busy || !account.reachable || !account.running} onClick={() => control(name, "stop")}>Stop</button>
      </div>
    </div>
  );
}

export function TraderV2Page(): JSX.Element {
  const dashboard = useTraderV2Snapshot();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const snapshot = dashboard.snapshot;

  async function control(name: "baseline" | "astra", action: "start" | "pause" | "stop") {
    setBusy(true);
    setMessage(undefined);
    try {
      await apiPost(`/bots/${name}/${action}`, {});
      setMessage(`${name}: ${action} accepted`);
      await dashboard.refresh();
    } catch (value) {
      setMessage(value instanceof Error ? value.message : String(value));
    } finally {
      setBusy(false);
    }
  }

  if (!snapshot) {
    return <div className="container"><div className="card"><div className="title">Autobot V2</div><div className="subtitle">{dashboard.error ?? "Loading prospective accounts…"}</div></div></div>;
  }
  const accounts = snapshot.accounts;
  const positions = [...accounts.baseline.openPositions.map((p) => ({ ...p, account: "Baseline" })),
                     ...accounts.astra.openPositions.map((p) => ({ ...p, account: "Astra" }))];
  const advisor = accounts.astra.advisor;

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <div className="title">Binance AI Autobot V2</div>
          <div className="subtitle">Prospective baseline versus GPT-6 Astra · measured after fees and AI cost</div>
        </div>
        <button className="btn" disabled={busy || dashboard.loading} onClick={() => void dashboard.refresh()}>Refresh</button>
      </div>
      <div className="pill-row">
        <span className="pill warn">Dry-run only</span>
        <span className="pill">Market: Binance public spot</span>
        <span className="pill">Orders: simulated locally</span>
        <span className={snapshot.comparison.ready ? "pill ok" : "pill bad"}>Comparison: {snapshot.comparison.ready ? "available" : "blocked"}</span>
        <span className="pill bad">Real money: blocked</span>
      </div>
      {(dashboard.error || message) ? <div className="card notice"><div className="subtitle">{dashboard.error ?? message}</div></div> : null}

      <div className="row cols-2 section">
        <AccountCard name="baseline" label="Baseline control" account={accounts.baseline} busy={busy} control={control} />
        <AccountCard name="astra" label="Astra challenger" account={accounts.astra} busy={busy} control={control} />
      </div>

      <div className="row cols-2 section">
        <div className="card">
          <div className="title">Experiment integrity</div>
          <div className="subtitle">Both accounts must run over the same prospective interval. Astra is promoted only if its risk-adjusted result exceeds baseline after costs.</div>
          <ul className="plain-list">{snapshot.comparison.limitations.map((item) => <li key={item}>{item}</li>)}</ul>
          <div className="subtitle">Promotion gate: {snapshot.promotion.reason}</div>
        </div>
        <div className="card">
          <div className="title">Astra usage</div>
          <div className="metric-grid">
            <div><span>Calls</span><b>{advisor?.calls ?? 0}</b></div>
            <div><span>Known cost</span><b>${(advisor?.knownCostUsd ?? 0).toFixed(4)}</b></div>
            <div><span>Reserved</span><b>${(advisor?.reservedCostUsd ?? 0).toFixed(4)}</b></div>
            <div><span>Latest</span><b>{advisor?.latestStatus ?? "—"}</b></div>
          </div>
          <div className="subtitle">Plan: {time(advisor?.latestAt)} · Expires: {time(advisor?.expiresAt)}</div>
        </div>
      </div>

      <div className="card section">
        <div className="title">Open positions</div>
        <div className="table-wrap"><table className="table"><thead><tr><th>Account</th><th>Pair</th><th>Stake</th><th>Entry</th><th>Current</th><th>P&amp;L</th><th>Stop</th></tr></thead>
          <tbody>{positions.map((p) => <tr key={`${p.account}-${p.id}`}><td>{p.account}</td><td>{p.pair}</td><td>{money(p.stake)}</td><td>{p.entry ?? "—"}</td><td>{p.current ?? "—"}</td><td>{money(p.profitQuote)}</td><td>{p.stop ?? "—"}</td></tr>)}
          {!positions.length ? <tr><td colSpan={7}>No open positions.</td></tr> : null}</tbody></table></div>
      </div>

      <div className="card section">
        <div className="title">Latest Astra decisions</div>
        <div className="table-wrap"><table className="table"><thead><tr><th>Pair</th><th>Entry</th><th>Stake</th><th>Exit</th><th>Grounded reason</th></tr></thead>
          <tbody>{(advisor?.decisions ?? []).map((row) => <tr key={row.pair}><td>{row.pair}</td><td>{row.allow_entry ? "Allow" : "Block"}</td><td>{Math.round(row.stake_multiplier * 100)}%</td><td>{row.exit_position ? "Request" : "Hold"}</td><td>{row.reason}</td></tr>)}
          {!advisor?.decisions.length ? <tr><td colSpan={5}>No valid Astra plan yet.</td></tr> : null}</tbody></table></div>
      </div>
      <div className="subtitle footer-note">Snapshot {time(snapshot.generatedAt)}. P&amp;L is simulated; this interface does not claim future profit.</div>
    </div>
  );
}
