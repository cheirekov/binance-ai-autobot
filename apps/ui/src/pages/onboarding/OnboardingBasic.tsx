import { defaultHomeStableCoin, deriveSettings } from "@autobot/shared";
import { useMemo, useState } from "react";

import { apiPost } from "../../api/http";

type SetupRequest = {
  binanceApiKey: string;
  binanceApiSecret: string;
  openaiApiKey?: string;
  uiUsername: string;
  uiPassword: string;
  traderRegion: "EEA" | "NON_EEA";
  homeStableCoin: string;
  tradeMode: "SPOT" | "SPOT_GRID";
  risk: number;
  liveTrading: boolean;
  aiEnabled: boolean;
  aiMinTradeConfidence: number;
};

export function OnboardingBasic(): JSX.Element {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmLiveTrading, setConfirmLiveTrading] = useState(false);

  const [traderRegion, setTraderRegion] = useState<SetupRequest["traderRegion"]>("EEA");
  const [homeStableCoin, setHomeStableCoin] = useState(defaultHomeStableCoin(traderRegion));
  const [tradeMode, setTradeMode] = useState<SetupRequest["tradeMode"]>("SPOT_GRID");
  const [risk, setRisk] = useState(25);
  const derived = useMemo(() => deriveSettings({ risk, tradeMode }), [risk, tradeMode]);

  const [form, setForm] = useState<Omit<SetupRequest, "traderRegion" | "homeStableCoin" | "risk" | "tradeMode">>({
    binanceApiKey: "",
    binanceApiSecret: "",
    openaiApiKey: "",
    uiUsername: "admin",
    uiPassword: "",
    liveTrading: false,
    aiEnabled: false,
    aiMinTradeConfidence: 65
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(): Promise<void> {
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      if (form.liveTrading && !confirmLiveTrading) {
        throw new Error("Live trading requires confirmation.");
      }

      const payload: SetupRequest = {
        ...form,
        traderRegion,
        homeStableCoin,
        tradeMode,
        risk
      };

      if (!payload.openaiApiKey) {
        delete payload.openaiApiKey;
      }

      await apiPost("/setup/basic", payload);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="row">
      <div>
        <div className="title">Basic</div>
        <div className="subtitle">Enough to unlock the bot. Defaults adapt to your risk level.</div>
      </div>

      {error ? (
        <div className="card" style={{ borderColor: "rgba(255, 90, 106, 0.5)" }}>
          <div className="title" style={{ color: "var(--danger)" }}>
            Setup error
          </div>
          <div className="subtitle">{error}</div>
        </div>
      ) : null}

      {saved ? (
        <div className="card" style={{ borderColor: "rgba(49, 208, 127, 0.5)" }}>
          <div className="title" style={{ color: "var(--success)" }}>
            Saved
          </div>
          <div className="subtitle">
            Config is persisted to the Docker volume. Reload the page to continue (Basic Auth may start prompting now).
          </div>
          <button className="btn primary" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      ) : null}

      <div className="row cols-2">
        <div>
          <label className="label">Binance API key</label>
          <input className="field" value={form.binanceApiKey} onChange={(e) => set("binanceApiKey", e.target.value)} />
        </div>
        <div>
          <label className="label">Binance API secret</label>
          <input
            className="field"
            value={form.binanceApiSecret}
            onChange={(e) => set("binanceApiSecret", e.target.value)}
          />
        </div>
      </div>

      <div className="row cols-2">
        <div>
          <label className="label">OpenAI API key</label>
          <input className="field" value={form.openaiApiKey} onChange={(e) => set("openaiApiKey", e.target.value)} />
        </div>
        <div>
          <label className="label">AI engine</label>
          <select
            className="field"
            value={form.aiEnabled ? "on" : "off"}
            onChange={(e) => {
              const enabled = e.target.value === "on";
              set("aiEnabled", enabled);
              if (!enabled) {
                set("openaiApiKey", "");
              }
            }}
          >
            <option value="off">Off</option>
            <option value="on">On</option>
          </select>
        </div>
      </div>

      <div className="row cols-2">
        <div>
          <label className="label">AI min trade confidence (%)</label>
          <input
            className="field"
            type="range"
            min={0}
            max={100}
            value={form.aiMinTradeConfidence}
            onChange={(e) => set("aiMinTradeConfidence", Number.parseInt(e.target.value, 10))}
            disabled={!form.aiEnabled}
          />
          <div className="subtitle">
            {form.aiEnabled ? (
              <>
                AI can only influence decisions when confidence is at least <b>{form.aiMinTradeConfidence}%</b>.
              </>
            ) : (
              <>Enable AI engine to use this setting.</>
            )}
          </div>
        </div>
        <div>
          <label className="label">Trading mode (MVP)</label>
          <select className="field" value={tradeMode} onChange={(e) => setTradeMode(e.target.value as SetupRequest["tradeMode"])}>
            <option value="SPOT">Spot only</option>
            <option value="SPOT_GRID">Spot + Grid</option>
          </select>
          <div className="subtitle">Futures is out of MVP scope for now.</div>
        </div>
      </div>

      <div className="row cols-2">
        <div>
          <label className="label">UI username (HTTP Basic Auth)</label>
          <input className="field" value={form.uiUsername} onChange={(e) => set("uiUsername", e.target.value)} />
        </div>
        <div>
          <label className="label">UI password (min 8 chars)</label>
          <input className="field" type="password" value={form.uiPassword} onChange={(e) => set("uiPassword", e.target.value)} />
        </div>
      </div>

      <div className="row cols-2">
        <div>
          <label className="label">Region profile</label>
          <select
            className="field"
            value={traderRegion}
            onChange={(e) => {
              const next = e.target.value as SetupRequest["traderRegion"];
              setTraderRegion(next);
              setHomeStableCoin(defaultHomeStableCoin(next));
            }}
          >
            <option value="EEA">EEA (EU/EEA)</option>
            <option value="NON_EEA">Non-EEA</option>
          </select>
          <div className="subtitle">Defaults only; you must verify Binance product availability for your jurisdiction.</div>
        </div>
        <div>
          <label className="label">Home stable coin</label>
          <input className="field" value={homeStableCoin} onChange={(e) => setHomeStableCoin(e.target.value)} />
        </div>
      </div>

      <div className="row cols-2">
        <div>
          <label className="label">Risk (safe → “I’m feeling crazy today”)</label>
          <input
            className="field"
            type="range"
            min={0}
            max={100}
            value={risk}
            onChange={(e) => setRisk(Number.parseInt(e.target.value, 10))}
          />
          <div className="subtitle">
            Risk: <b>{risk}</b> — Derived: max positions <b>{derived.maxOpenPositions}</b>, max position size <b>{derived.maxPositionPct}%</b>, grid{" "}
            <b>{derived.allowGrid ? "on" : "off"}</b>
          </div>
        </div>
        <div>
          <label className="label">Live trading</label>
          <select
            className="field"
            value={form.liveTrading ? "on" : "off"}
            onChange={(e) => {
              const live = e.target.value === "on";
              set("liveTrading", live);
              if (!live) setConfirmLiveTrading(false);
            }}
          >
            <option value="off">Off (recommended)</option>
            <option value="on">On</option>
          </select>
          <div className="subtitle">Start with paper trading. Live trading can lose money fast.</div>
          {form.liveTrading ? (
            <label className="subtitle" style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
              <input type="checkbox" checked={confirmLiveTrading} onChange={(e) => setConfirmLiveTrading(e.target.checked)} />
              I understand and accept the risks of live trading.
            </label>
          ) : null}
        </div>
      </div>

      <div>
        <button className="btn primary" onClick={onSubmit} disabled={saving || (form.liveTrading && !confirmLiveTrading)}>
          {saving ? "Saving…" : "Save basic configuration"}
        </button>
      </div>
    </div>
  );
}
