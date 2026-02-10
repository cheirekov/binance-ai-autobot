import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { apiGet, apiPost } from "../api/http";
import { useApiHealth } from "../hooks/useApiHealth";
import { useIntegrationsStatus } from "../hooks/useIntegrationsStatus";
import { usePortfolioWallet } from "../hooks/usePortfolioWallet";
import { usePublicConfig } from "../hooks/usePublicConfig";
import { useUniverseSnapshot } from "../hooks/useUniverseSnapshot";

type BotState = {
  running: boolean;
  phase: "STOPPED" | "EXAMINING" | "TRADING";
  updatedAt: string;
  decisions: Array<{ id: string; ts: string; kind: string; summary: string }>;
  activeOrders: Array<{ id: string; ts: string; symbol: string; side: string; type: string; status: string; qty: number; price?: number }>;
  orderHistory: Array<{ id: string; ts: string; symbol: string; side: string; type: string; status: string; qty: number; price?: number }>;
  symbolBlacklist?: Array<{ symbol: string; reason: string; createdAt: string; expiresAt: string }>;
};

type PillTone = "neutral" | "ok" | "bad" | "warn";

function pillClass(tone: PillTone): string {
  if (tone === "ok") return "pill ok";
  if (tone === "bad") return "pill bad";
  if (tone === "warn") return "pill warn";
  return "pill";
}

export function DashboardPage(): JSX.Element {
  const [state, setState] = useState<BotState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [universeBusy, setUniverseBusy] = useState(false);
  const [universeMsg, setUniverseMsg] = useState<string | null>(null);

  const apiHealth = useApiHealth();
  const publicConfig = usePublicConfig();
  const integrations = useIntegrationsStatus();
  const wallet = usePortfolioWallet();
  const universe = useUniverseSnapshot();

  const phasePill = useMemo(() => {
    if (!state) return "…";
    return state.running ? `Running · ${state.phase}` : "Stopped";
  }, [state]);

  const apiPill = useMemo(() => {
    if (apiHealth.loading) return { label: "API: …", tone: "neutral" as const };
    return apiHealth.ok ? { label: "API: Online", tone: "ok" as const } : { label: "API: Offline", tone: "bad" as const };
  }, [apiHealth.loading, apiHealth.ok]);

  const modePill = useMemo(() => {
    const mode = publicConfig.config?.basic?.tradeMode;
    if (!mode) return { label: "Mode: —", tone: "neutral" as const };
    return mode === "SPOT_GRID" ? { label: "Mode: Spot + Grid", tone: "neutral" as const } : { label: "Mode: Spot", tone: "neutral" as const };
  }, [publicConfig.config?.basic?.tradeMode]);

  const openAiPill = useMemo(() => {
    const openai = integrations.status?.openai;
    if (!openai) return { label: "OpenAI: —", tone: "neutral" as const };
    if (!openai.enabled) {
      return openai.configured
        ? { label: "OpenAI: Configured (off)", tone: "bad" as const }
        : { label: "OpenAI: Off", tone: "bad" as const };
    }
    return openai.configured ? { label: "OpenAI: On", tone: "ok" as const } : { label: "OpenAI: Missing key", tone: "bad" as const };
  }, [integrations.status?.openai]);

  const binancePill = useMemo(() => {
    const b = integrations.status?.binance;
    if (!b) return { label: "Binance: —", tone: "neutral" as const };
    const isTestnet = /testnet|binance\.vision|demo-api\.binance\.com/i.test(b.baseUrl);
    const env = isTestnet ? "Testnet" : "Mainnet";
    if (!b.configured) return { label: "Binance: Missing keys", tone: "bad" as const };
    if (b.authenticated) return { label: `Binance: Auth OK (${env})`, tone: "ok" as const };
    if (b.reachable) return { label: `Binance: Reachable (auth failed · ${env})`, tone: "bad" as const };
    return { label: "Binance: Offline", tone: "bad" as const };
  }, [integrations.status?.binance]);

  const livePill = useMemo(() => {
    const liveTrading = publicConfig.config?.basic?.liveTrading;
    if (liveTrading === undefined) return { label: "Live: —", tone: "neutral" as const };
    return liveTrading ? { label: "Live: On", tone: "ok" as const } : { label: "Live: Off", tone: "bad" as const };
  }, [publicConfig.config?.basic?.liveTrading]);

  async function refresh(): Promise<void> {
    setError(null);
    try {
      const next = await apiGet<BotState>("/bot/status");
      setState(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, []);

  async function startStop(next: "start" | "stop"): Promise<void> {
    setBusy(true);
    try {
      await apiPost(`/bot/${next}`, {});
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const homeStableCoin = wallet.wallet?.homeStableCoin ?? publicConfig.config?.basic?.homeStableCoin ?? "USDC";
  const walletTotal = wallet.wallet?.totalEstimatedHome;
  const walletTopAssets = wallet.wallet?.assets?.slice(0, 10) ?? [];
  const walletUnpricedCount = wallet.wallet ? wallet.wallet.assets.filter((a) => a.estValueHome === undefined).length : 0;
  const universeCandidates = universe.snapshot?.candidates ?? [];
  const universeRows = universeCandidates.slice(0, 40);

  async function rescanUniverse(): Promise<void> {
    setUniverseMsg(null);
    setUniverseBusy(true);
    try {
      const res = await apiPost<{ ok: true; started: boolean }>("/universe/scan", {});
      setUniverseMsg(res.started ? "Universe scan started." : "Universe scan is already running.");
    } catch (e) {
      setUniverseMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setUniverseBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <div className="title">Binance AI Autobot</div>
          <div className="subtitle">Everything the bot decides should be visible here (initial skeleton).</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link className="btn" to="/settings/basic">
            Settings
          </Link>
          <span className="pill">{phasePill}</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        <span className={pillClass(apiPill.tone)}>{apiPill.label}</span>
        <span className={pillClass(binancePill.tone)}>{binancePill.label}</span>
        <span className={pillClass(openAiPill.tone)}>{openAiPill.label}</span>
        <span className={pillClass(livePill.tone)}>{livePill.label}</span>
        <span className={pillClass(modePill.tone)}>{modePill.label}</span>
      </div>

      {error ? (
        <div className="card" style={{ borderColor: "rgba(255, 90, 106, 0.5)", marginBottom: 14 }}>
          <div className="title" style={{ color: "var(--danger)" }}>
            Error
          </div>
          <div className="subtitle">{error}</div>
        </div>
      ) : null}

      {integrations.status?.binance?.error ? (
        <div className="card" style={{ borderColor: "rgba(255, 90, 106, 0.35)", marginBottom: 14 }}>
          <div className="title">Integrations note</div>
          <div className="subtitle">
            Binance status: {integrations.status.binance.error} (checked {new Date(integrations.status.binance.checkedAt).toLocaleTimeString()})
          </div>
        </div>
      ) : null}

      <div className="row cols-2" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="title">Controls</div>
          <div className="subtitle">Start/stop the engine. Strategy selection is stubbed for now.</div>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button className="btn primary" disabled={busy} onClick={() => startStop("start")}>
              Start
            </button>
            <button className="btn danger" disabled={busy} onClick={() => startStop("stop")}>
              Stop
            </button>
            <button className="btn" disabled={busy} onClick={refresh}>
              Refresh
            </button>
          </div>
        </div>

        <div className="card">
          <div className="title">Status</div>
          <div className="subtitle">Last update: {state?.updatedAt ?? "—"}</div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="pill">Running: {String(state?.running ?? false)}</span>
            <span className="pill">Phase: {state?.phase ?? "—"}</span>
            <span className="pill">Active orders: {state?.activeOrders?.length ?? 0}</span>
            <span className="pill">Decisions: {state?.decisions?.length ?? 0}</span>
            <span className="pill">Blacklisted: {state?.symbolBlacklist?.length ?? 0}</span>
          </div>

          {(state?.symbolBlacklist?.length ?? 0) > 0 ? (
            <div style={{ marginTop: 12 }}>
              <div className="subtitle">Temporary blacklist (cooldown)</div>
              <div style={{ marginTop: 8, maxHeight: 120, overflow: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Reason</th>
                      <th>Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(state?.symbolBlacklist ?? []).slice(0, 8).map((e) => (
                      <tr key={`${e.symbol}:${e.expiresAt}`}>
                        <td>{e.symbol}</td>
                        <td>{e.reason}</td>
                        <td>{new Date(e.expiresAt).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="title">Universe</div>
        <div className="subtitle">
          {state?.phase === "EXAMINING" ? (
            <>Scanning market…</>
          ) : universe.loading ? (
            <>Loading…</>
          ) : universe.error ? (
            <>{universe.error}</>
          ) : universe.snapshot ? (
            <>
              Last scan: {new Date(universe.snapshot.finishedAt).toLocaleTimeString()} · {universe.snapshot.interval} ·{" "}
              {universe.snapshot.quoteAssets.join(", ")} · {universe.snapshot.baseUrl} · Candidates: {universeCandidates.length}
            </>
          ) : (
            <>No scan yet.</>
          )}
        </div>

        {universe.snapshot?.errors?.length ? (
          <div className="subtitle" style={{ marginTop: 8 }}>
            Warnings:{" "}
            {universe.snapshot.errors
              .slice(0, 2)
              .map((e) => (e.symbol ? `${e.symbol}: ${e.error}` : e.error))
              .join(" · ")}
            {universe.snapshot.errors.length > 2 ? ` (+${universe.snapshot.errors.length - 2} more)` : ""}
          </div>
        ) : null}

        {universeMsg ? <div className="subtitle" style={{ marginTop: 8 }}>{universeMsg}</div> : null}

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" onClick={rescanUniverse} disabled={universeBusy}>
            {universeBusy ? "Scanning…" : "Rescan"}
          </button>
        </div>

        <div style={{ marginTop: 12, maxHeight: 260, overflow: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Hint</th>
                <th>Score</th>
                <th>Δ24h</th>
                <th>RSI</th>
                <th>ADX</th>
                <th>ATR%</th>
              </tr>
            </thead>
            <tbody>
              {universeRows.map((c) => (
                <tr key={c.symbol}>
                  <td>{c.symbol}</td>
                  <td>{c.strategyHint ?? "—"}</td>
                  <td>{c.score.toFixed(2)}</td>
                  <td style={{ color: c.priceChangePct24h >= 0 ? "var(--success)" : "var(--danger)" }}>
                    {c.priceChangePct24h.toFixed(2)}%
                  </td>
                  <td>{c.rsi14 === undefined ? "—" : c.rsi14.toFixed(1)}</td>
                  <td>{c.adx14 === undefined ? "—" : c.adx14.toFixed(1)}</td>
                  <td>{c.atrPct14 === undefined ? "—" : c.atrPct14.toFixed(2)}</td>
                </tr>
              ))}
              {universeRows.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ color: "var(--muted)" }}>
                    No candidates yet. Start the bot to trigger an examine scan, or press Rescan.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="row cols-2" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="title">Wallet</div>
          <div className="subtitle">
            {wallet.loading
              ? "Loading…"
              : wallet.error
                ? wallet.error
                : wallet.wallet?.errors?.length
                  ? wallet.wallet.errors.join(" · ")
                  : `Estimated in ${homeStableCoin} (prices may be delayed)`}
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="pill">
              Total (est):{" "}
              <b>
                {walletTotal === undefined ? "—" : `${walletTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${homeStableCoin}`}
              </b>
            </span>
            <span className="pill">
              Assets: <b>{wallet.wallet?.assets?.length ?? 0}</b>
            </span>
            <span className={pillClass(walletUnpricedCount === 0 ? "ok" : "warn")}>
              Priced: <b>{wallet.wallet ? wallet.wallet.assets.length - walletUnpricedCount : 0}</b> / <b>{wallet.wallet?.assets?.length ?? 0}</b>
            </span>
          </div>

          <div style={{ marginTop: 10, maxHeight: 260, overflow: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Total</th>
                  <th>Est. value</th>
                </tr>
              </thead>
              <tbody>
                {walletTopAssets.map((a) => (
                  <tr key={a.asset}>
                    <td>{a.asset}</td>
                    <td>{a.total.toLocaleString(undefined, { maximumFractionDigits: 8 })}</td>
                    <td>
                      {a.estValueHome === undefined
                        ? "—"
                        : `${a.estValueHome.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${homeStableCoin}`}
                    </td>
                  </tr>
                ))}
                {walletTopAssets.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ color: "var(--muted)" }}>
                      No wallet data yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="title">PnL</div>
          <div className="subtitle">Coming soon: PnL requires a persisted trade ledger (fills + commissions + conversion at fill time).</div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="pill">
              Realized: <b>—</b>
            </span>
            <span className="pill">
              Unrealized: <b>—</b>
            </span>
            <span className="pill">
              Currency: <b>{homeStableCoin}</b>
            </span>
          </div>
        </div>
      </div>

      <div className="row cols-2">
        <div className="card">
          <div className="title">Decisions</div>
          <div className="subtitle">Most recent first.</div>
          <div style={{ marginTop: 10, maxHeight: 380, overflow: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Kind</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                {(state?.decisions ?? []).slice(0, 50).map((d) => (
                  <tr key={d.id}>
                    <td>{new Date(d.ts).toLocaleTimeString()}</td>
                    <td>{d.kind}</td>
                    <td>{d.summary}</td>
                  </tr>
                ))}
                {(state?.decisions?.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ color: "var(--muted)" }}>
                      No decisions yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="title">Orders (active)</div>
          <div className="subtitle">Binance-like view (stub data).</div>
          <div style={{ marginTop: 10, maxHeight: 380, overflow: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Symbol</th>
                  <th>Side</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {(state?.activeOrders ?? []).slice(0, 50).map((o) => (
                  <tr key={o.id}>
                    <td>{new Date(o.ts).toLocaleTimeString()}</td>
                    <td>{o.symbol}</td>
                    <td>{o.side}</td>
                    <td>{o.type}</td>
                    <td>{o.status}</td>
                    <td>{o.qty}</td>
                  </tr>
                ))}
                {(state?.activeOrders?.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ color: "var(--muted)" }}>
                      No active orders.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="title">Orders (history)</div>
        <div className="subtitle">Filled/canceled orders (stub data).</div>
        <div style={{ marginTop: 10, maxHeight: 320, overflow: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Symbol</th>
                <th>Side</th>
                <th>Type</th>
                <th>Status</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              {(state?.orderHistory ?? []).slice(0, 80).map((o) => (
                <tr key={o.id}>
                  <td>{new Date(o.ts).toLocaleTimeString()}</td>
                  <td>{o.symbol}</td>
                  <td>{o.side}</td>
                  <td>{o.type}</td>
                  <td>{o.status}</td>
                  <td>{o.qty}</td>
                </tr>
              ))}
              {(state?.orderHistory?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={6} style={{ color: "var(--muted)" }}>
                    No order history yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
