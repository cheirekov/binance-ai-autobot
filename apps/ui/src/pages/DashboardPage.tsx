import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { apiPost } from "../api/http";
import { useDashboardSnapshot } from "../hooks/useDashboardSnapshot";

type PillTone = "neutral" | "ok" | "bad" | "warn";

function pillClass(tone: PillTone): string {
  if (tone === "ok") return "pill ok";
  if (tone === "bad") return "pill bad";
  if (tone === "warn") return "pill warn";
  return "pill";
}

export function DashboardPage(): JSX.Element {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [universeBusy, setUniverseBusy] = useState(false);
  const [universeMsg, setUniverseMsg] = useState<string | null>(null);
  const [expandedDecisionId, setExpandedDecisionId] = useState<string | null>(null);

  const dashboard = useDashboardSnapshot();
  const state = dashboard.snapshot?.bot ?? null;

  const apiHealth = useMemo(() => {
    const ok = Boolean(dashboard.snapshot && !dashboard.error);
    return { loading: dashboard.loading, ok, error: dashboard.error };
  }, [dashboard.error, dashboard.loading, dashboard.snapshot]);

  const publicConfig = useMemo(() => {
    return { loading: dashboard.loading, config: dashboard.snapshot?.config ?? null, error: dashboard.error };
  }, [dashboard.error, dashboard.loading, dashboard.snapshot]);

  const integrations = useMemo(() => {
    return { loading: dashboard.loading, status: dashboard.snapshot?.integrations ?? null, error: dashboard.error };
  }, [dashboard.error, dashboard.loading, dashboard.snapshot]);

  const wallet = useMemo(() => {
    return { loading: dashboard.loading, wallet: dashboard.snapshot?.wallet ?? null, error: dashboard.error };
  }, [dashboard.error, dashboard.loading, dashboard.snapshot]);

  const universe = useMemo(() => {
    return { loading: dashboard.loading, snapshot: dashboard.snapshot?.universe, error: dashboard.error };
  }, [dashboard.error, dashboard.loading, dashboard.snapshot]);

  const runStats = useMemo(() => {
    return { loading: dashboard.loading, stats: dashboard.snapshot?.runStats ?? null, error: dashboard.error };
  }, [dashboard.error, dashboard.loading, dashboard.snapshot]);

  const phasePill = useMemo(() => {
    if (!state) return "…";
    return state.running ? `Running · ${state.phase}` : "Stopped";
  }, [state]);

  const externalOrdersPill = useMemo(() => {
    const prefix = (publicConfig.config?.advanced?.botOrderClientIdPrefix ?? "ABOT").trim().toUpperCase();
    const openLimits = (state?.activeOrders ?? []).filter((o) => {
      if (o.status !== "NEW") return false;
      const t = (o.type ?? "").trim().toUpperCase();
      return t === "LIMIT" || t === "LIMIT_MAKER";
    });
    const external = openLimits.filter((o) => {
      const id = typeof o.clientOrderId === "string" ? o.clientOrderId.trim().toUpperCase() : "";
      return !(id && id.startsWith(`${prefix}-`));
    }).length;
    if (external <= 0) return null;
    return { label: `External open orders: ${external}`, tone: "warn" as const };
  }, [publicConfig.config?.advanced?.botOrderClientIdPrefix, state?.activeOrders]);

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

  async function startStop(next: "start" | "stop"): Promise<void> {
    setBusy(true);
    try {
      await apiPost(`/bot/${next}`, {});
      await dashboard.refresh();
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
  const adaptiveTail = runStats.stats?.adaptiveShadowTail ?? [];
  const latestAdaptiveEvent = adaptiveTail.length ? adaptiveTail[adaptiveTail.length - 1] : undefined;
  const adaptiveRows = [...adaptiveTail].reverse().slice(0, 30);
  const walletPolicySnapshot = runStats.stats?.walletPolicy ?? null;

  const pnlSummary = useMemo(() => {
    const kpi = runStats.stats?.kpi;
    const realized = kpi?.totals?.realizedPnl;
    const openCost = kpi?.totals?.openExposureCost;
    const symbols = kpi?.symbols ?? [];

    const priceByAsset = new Map<string, number>();
    for (const a of wallet.wallet?.assets ?? []) {
      const asset = a.asset.trim().toUpperCase();
      const p = a.estPriceHome;
      if (!asset) continue;
      if (typeof p === "number" && Number.isFinite(p) && p > 0) {
        priceByAsset.set(asset, p);
      }
    }

    const openPositions = symbols.filter((s) => typeof s.netQty === "number" && Number.isFinite(s.netQty) && s.netQty > 0);
    let openValue = 0;
    let pricedOpenPositions = 0;
    for (const pos of openPositions) {
      const symbol = (pos.symbol ?? "").trim().toUpperCase();
      if (!symbol || !symbol.endsWith(homeStableCoin)) continue;
      const base = symbol.slice(0, Math.max(0, symbol.length - homeStableCoin.length)).trim().toUpperCase();
      if (!base) continue;
      const p = priceByAsset.get(base);
      if (!p) continue;
      openValue += pos.netQty * p;
      pricedOpenPositions += 1;
    }

    const unrealized =
      typeof openCost === "number" && Number.isFinite(openCost) && pricedOpenPositions > 0 ? openValue - openCost : undefined;
    const total =
      typeof realized === "number" && Number.isFinite(realized) && typeof unrealized === "number" && Number.isFinite(unrealized)
        ? realized + unrealized
        : undefined;

    return {
      realized,
      openCost,
      openValue: pricedOpenPositions > 0 ? openValue : undefined,
      unrealized,
      total,
      openPositions: openPositions.length,
      pricedOpenPositions
    };
  }, [homeStableCoin, runStats.stats?.kpi, wallet.wallet?.assets]);

  function formatDecisionDetails(details: Record<string, unknown> | undefined): string | null {
    if (!details) return null;
    try {
      return JSON.stringify(details, null, 2);
    } catch {
      return String(details);
    }
  }

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
        {externalOrdersPill ? <span className={pillClass(externalOrdersPill.tone)}>{externalOrdersPill.label}</span> : null}
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
            <button className="btn" disabled={busy} onClick={() => void dashboard.refresh()}>
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
            <span className="pill">Protection locks: {state?.protectionLocks?.length ?? 0}</span>
            <span className="pill">Trades: {runStats.stats?.kpi?.totals.trades ?? "—"}</span>
            <span className="pill">Skips: {runStats.stats?.kpi?.totals.skips ?? "—"}</span>
            <span className="pill">
              Buys/Sells:{" "}
              {runStats.stats?.kpi ? `${runStats.stats.kpi.totals.buys}/${runStats.stats.kpi.totals.sells}` : "—"}
            </span>
          </div>

          <div style={{ marginTop: 12 }}>
            <div className="subtitle">Wallet policy (latest telemetry)</div>
            {walletPolicySnapshot ? (
              <>
                <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className={pillClass(walletPolicySnapshot.overCap ? "bad" : "ok")}>
                    Unmanaged exposure: {walletPolicySnapshot.unmanagedExposurePct.toFixed(2)}%
                  </span>
                  <span className="pill">Cap: {walletPolicySnapshot.unmanagedExposureCapPct.toFixed(2)}%</span>
                  {typeof walletPolicySnapshot.unmanagedNonHomeValue === "number" ? (
                    <span className="pill">
                      Value: {walletPolicySnapshot.unmanagedNonHomeValue.toFixed(2)} {homeStableCoin}
                    </span>
                  ) : null}
                  {typeof walletPolicySnapshot.unmanagedExposureCapHome === "number" ? (
                    <span className="pill">
                      Cap value: {walletPolicySnapshot.unmanagedExposureCapHome.toFixed(2)} {homeStableCoin}
                    </span>
                  ) : null}
                  {walletPolicySnapshot.category ? <span className="pill">Category: {walletPolicySnapshot.category}</span> : null}
                  {walletPolicySnapshot.sourceAsset ? <span className="pill">Source: {walletPolicySnapshot.sourceAsset}</span> : null}
                </div>
                <div className="subtitle" style={{ marginTop: 6 }}>
                  Observed: {new Date(walletPolicySnapshot.observedAt).toLocaleTimeString()}
                  {walletPolicySnapshot.reason ? ` · ${walletPolicySnapshot.reason}` : ""}
                </div>
              </>
            ) : (
              <div className="subtitle" style={{ marginTop: 6 }}>
                Waiting for wallet-sweep telemetry sample.
              </div>
            )}
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

          {(state?.protectionLocks?.length ?? 0) > 0 ? (
            <div style={{ marginTop: 12 }}>
              <div className="subtitle">Protection locks (risk guards)</div>
              <div style={{ marginTop: 8, maxHeight: 150, overflow: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Scope</th>
                      <th>Symbol</th>
                      <th>Reason</th>
                      <th>Expires</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(state?.protectionLocks ?? []).slice(0, 8).map((lock) => (
                      <tr key={lock.id}>
                        <td>{lock.type}</td>
                        <td>{lock.scope}</td>
                        <td>{lock.symbol ?? "ALL"}</td>
                        <td>{lock.reason}</td>
                        <td>{new Date(lock.expiresAt).toLocaleTimeString()}</td>
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
          <div className="subtitle">Baseline from persisted fills (commissions/funding still not included).</div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="pill">
              Realized:{" "}
              <b>
                {typeof pnlSummary.realized === "number" && Number.isFinite(pnlSummary.realized)
                  ? `${pnlSummary.realized.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${homeStableCoin}`
                  : "—"}
              </b>
            </span>
            <span className="pill">
              Open cost:{" "}
              <b>
                {typeof pnlSummary.openCost === "number" && Number.isFinite(pnlSummary.openCost)
                  ? `${pnlSummary.openCost.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${homeStableCoin}`
                  : "—"}
              </b>
            </span>
            <span
              className={pillClass(
                typeof pnlSummary.unrealized === "number" && Number.isFinite(pnlSummary.unrealized)
                  ? pnlSummary.unrealized >= 0
                    ? "ok"
                    : "bad"
                  : "neutral"
              )}
            >
              Unrealized:{" "}
              <b>
                {typeof pnlSummary.unrealized === "number" && Number.isFinite(pnlSummary.unrealized)
                  ? `${pnlSummary.unrealized.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${homeStableCoin}`
                  : "—"}
              </b>
            </span>
            <span
              className={pillClass(
                typeof pnlSummary.total === "number" && Number.isFinite(pnlSummary.total)
                  ? pnlSummary.total >= 0
                    ? "ok"
                    : "bad"
                  : "neutral"
              )}
            >
              Total:{" "}
              <b>
                {typeof pnlSummary.total === "number" && Number.isFinite(pnlSummary.total)
                  ? `${pnlSummary.total.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${homeStableCoin}`
                  : "—"}
              </b>
            </span>
            <span className="pill">
              Open value:{" "}
              <b>
                {typeof pnlSummary.openValue === "number" && Number.isFinite(pnlSummary.openValue)
                  ? `${pnlSummary.openValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${homeStableCoin}`
                  : "—"}
              </b>
            </span>
            <span className="pill">
              Open positions:{" "}
              <b>
                {pnlSummary.openPositions}
                {pnlSummary.pricedOpenPositions > 0 && pnlSummary.pricedOpenPositions !== pnlSummary.openPositions
                  ? ` (priced ${pnlSummary.pricedOpenPositions})`
                  : ""}
              </b>
            </span>
            <span className="pill">
              Currency: <b>{homeStableCoin}</b>
            </span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="title">Adaptive policy (shadow)</div>
        <div className="subtitle">
          Two-track mode: baseline execution is active, adaptive policy is logging recommendations only.
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="pill">
            Runtime:{" "}
            <b>
              {runStats.stats?.kpi
                ? `${Math.floor(runStats.stats.kpi.runtimeSeconds / 3600)}h ${Math.floor((runStats.stats.kpi.runtimeSeconds % 3600) / 60)}m`
                : "—"}
            </b>
          </span>
          <span className="pill">
            Conversions: <b>{runStats.stats?.kpi?.totals.conversions ?? "—"}</b>
          </span>
          <span className="pill">
            Conversion trades:{" "}
            <b>
              {runStats.stats?.kpi
                ? `${runStats.stats.kpi.totals.conversionTradePct?.toFixed(1) ?? "0.0"}%`
                : "—"}
            </b>
          </span>
          <span className="pill">
            Entry trades:{" "}
            <b>
              {runStats.stats?.kpi
                ? `${runStats.stats.kpi.totals.entryTradePct?.toFixed(1) ?? "0.0"}%`
                : "—"}
            </b>
          </span>
          <span className="pill">
            Sizing rejects:{" "}
            <b>
              {runStats.stats?.kpi
                ? `${runStats.stats.kpi.totals.sizingRejectSkipPct?.toFixed(1) ?? "0.0"}%`
                : "—"}
            </b>
          </span>
          <span className="pill">
            Last regime: <b>{latestAdaptiveEvent?.regime.label ?? "—"}</b>
          </span>
          <span className="pill">
            Last strategy: <b>{latestAdaptiveEvent?.strategy.recommended ?? "—"}</b>
          </span>
          <span className="pill">
            Last decision: <b>{latestAdaptiveEvent?.decision.kind ?? "—"}</b>
          </span>
          <span className="pill">
            History loaded: <b>{adaptiveTail.length}</b>
          </span>
        </div>
        <div style={{ marginTop: 10, maxHeight: 260, overflow: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th className="col-time">Time</th>
                <th>Candidate</th>
                <th>Regime</th>
                <th>Strategy</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {adaptiveRows.map((event, idx) => (
                <tr key={`${event.ts}:${idx}`}>
                  <td className="col-time">{new Date(event.ts).toLocaleTimeString()}</td>
                  <td>{event.candidateSymbol ?? "—"}</td>
                  <td>{event.regime.label}</td>
                  <td>{event.strategy.recommended}</td>
                  <td>{event.decision.summary}</td>
                </tr>
              ))}
              {adaptiveRows.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: "var(--muted)" }}>
                    No adaptive events yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {runStats.error ? <div className="subtitle" style={{ marginTop: 8 }}>{runStats.error}</div> : null}
      </div>

      <div className="row cols-2">
        <div className="card">
          <div className="title">Decisions</div>
          <div className="subtitle">Most recent first.</div>
          <div style={{ marginTop: 10, maxHeight: 380, overflow: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th className="col-time">Time</th>
                  <th className="col-kind">Kind</th>
                  <th>Summary</th>
                  <th className="col-kind">Details</th>
                </tr>
              </thead>
              <tbody>
                {(state?.decisions ?? []).slice(0, 50).map((d) => {
                  const detailsText = formatDecisionDetails(d.details);
                  const hasDetails = Boolean(detailsText) && detailsText !== "{}";
                  const expanded = expandedDecisionId === d.id;
                  return (
                    <Fragment key={d.id}>
                      <tr>
                        <td className="col-time">{new Date(d.ts).toLocaleTimeString()}</td>
                        <td className="col-kind">{d.kind}</td>
                        <td>{d.summary}</td>
                        <td className="col-kind">
                          {hasDetails ? (
                            <button
                              className="btn tiny"
                              onClick={() => setExpandedDecisionId(expanded ? null : d.id)}
                              type="button"
                            >
                              {expanded ? "Hide" : "View"}
                            </button>
                          ) : (
                            <span style={{ color: "var(--muted)" }}>—</span>
                          )}
                        </td>
                      </tr>
                      {expanded && hasDetails ? (
                        <tr>
                          <td colSpan={4}>
                            <pre className="code-block">{detailsText}</pre>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
                {(state?.decisions?.length ?? 0) === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ color: "var(--muted)" }}>
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
          <div className="subtitle">
            {runStats.stats?.notes.activeOrders ??
              "Spot MARKET orders usually fill immediately, so active orders can remain empty while history grows."}
          </div>
          <div style={{ marginTop: 10, maxHeight: 380, overflow: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th className="col-time">Time</th>
                  <th>Symbol</th>
                  <th className="col-kind">Side</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {(state?.activeOrders ?? []).slice(0, 50).map((o) => (
                  <tr key={o.id}>
                    <td className="col-time">{new Date(o.ts).toLocaleTimeString()}</td>
                    <td>{o.symbol}</td>
                    <td className="col-kind">{o.side}</td>
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
                  <th className="col-time">Time</th>
                  <th>Symbol</th>
                  <th className="col-kind">Side</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              {(state?.orderHistory ?? []).slice(0, 80).map((o) => (
                <tr key={o.id}>
                  <td className="col-time">{new Date(o.ts).toLocaleTimeString()}</td>
                  <td>{o.symbol}</td>
                  <td className="col-kind">{o.side}</td>
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
