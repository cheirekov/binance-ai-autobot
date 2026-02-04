import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { apiGet, apiPost } from "../api/http";
import { useApiHealth } from "../hooks/useApiHealth";
import { useIntegrationsStatus } from "../hooks/useIntegrationsStatus";
import { usePublicConfig } from "../hooks/usePublicConfig";

type BotState = {
  running: boolean;
  phase: "STOPPED" | "EXAMINING" | "TRADING";
  updatedAt: string;
  decisions: Array<{ id: string; ts: string; kind: string; summary: string }>;
  activeOrders: Array<{ id: string; ts: string; symbol: string; side: string; type: string; status: string; qty: number; price?: number }>;
  orderHistory: Array<{ id: string; ts: string; symbol: string; side: string; type: string; status: string; qty: number; price?: number }>;
};

export function DashboardPage(): JSX.Element {
  const [state, setState] = useState<BotState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const apiHealth = useApiHealth();
  const publicConfig = usePublicConfig();
  const integrations = useIntegrationsStatus();

  const phasePill = useMemo(() => {
    if (!state) return "…";
    return state.running ? `Running · ${state.phase}` : "Stopped";
  }, [state]);

  const apiPill = useMemo(() => {
    if (apiHealth.loading) return "API: …";
    return apiHealth.ok ? "API: Online" : "API: Offline";
  }, [apiHealth.loading, apiHealth.ok]);

  const modePill = useMemo(() => {
    const mode = publicConfig.config?.basic?.tradeMode;
    if (!mode) return "Mode: —";
    return mode === "SPOT_GRID" ? "Mode: Spot + Grid" : "Mode: Spot";
  }, [publicConfig.config?.basic?.tradeMode]);

  const openAiPill = useMemo(() => {
    const openai = integrations.status?.openai;
    if (!openai) return "OpenAI: —";
    if (!openai.enabled) return openai.configured ? "OpenAI: Configured (off)" : "OpenAI: Off";
    return openai.configured ? "OpenAI: On" : "OpenAI: Missing key";
  }, [integrations.status?.openai]);

  const binancePill = useMemo(() => {
    const b = integrations.status?.binance;
    if (!b) return "Binance: —";
    if (!b.configured) return "Binance: Missing keys";
    if (b.authenticated) return "Binance: Auth OK";
    if (b.reachable) return "Binance: Reachable (auth failed)";
    return "Binance: Offline";
  }, [integrations.status?.binance]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <span className="pill">{apiPill}</span>
        <span className="pill">{binancePill}</span>
        <span className="pill">{openAiPill}</span>
        <span className="pill">{modePill}</span>
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
