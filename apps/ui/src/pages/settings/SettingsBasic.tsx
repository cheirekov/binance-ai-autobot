import { useEffect, useMemo, useState } from "react";

import { apiPut } from "../../api/http";
import { usePublicConfig } from "../../hooks/usePublicConfig";

export function SettingsBasic(): JSX.Element {
  const { loading, config, error } = usePublicConfig({ pollMs: 0 });
  const basic = config?.basic;

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [confirmLive, setConfirmLive] = useState(false);

  const [risk, setRisk] = useState<number>(basic?.risk ?? 25);
  const [tradeMode, setTradeMode] = useState<"SPOT" | "SPOT_GRID">(basic?.tradeMode ?? "SPOT_GRID");
  const [aiEnabled, setAiEnabled] = useState<boolean>(basic?.aiEnabled ?? false);
  const [aiMinTradeConfidence, setAiMinTradeConfidence] = useState<number>(basic?.aiMinTradeConfidence ?? 65);
  const [liveTrading, setLiveTrading] = useState<boolean>(basic?.liveTrading ?? false);
  const [homeStableCoin, setHomeStableCoin] = useState<string>(basic?.homeStableCoin ?? "USDC");
  const [uiAuthEnabled, setUiAuthEnabled] = useState<boolean>(basic?.uiAuth?.enabled ?? true);
  const [uiUsername, setUiUsername] = useState<string>(basic?.uiAuth?.username ?? "admin");
  const [uiPassword, setUiPassword] = useState<string>("");
  const [uiPassword2, setUiPassword2] = useState<string>("");
  const [savingUiAuth, setSavingUiAuth] = useState(false);
  const [uiAuthSavedAt, setUiAuthSavedAt] = useState<string | null>(null);
  const [uiAuthError, setUiAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!basic) return;
    setRisk(basic.risk);
    setTradeMode(basic.tradeMode);
    setAiEnabled(basic.aiEnabled);
    setAiMinTradeConfidence(basic.aiMinTradeConfidence);
    setLiveTrading(basic.liveTrading);
    setHomeStableCoin(basic.homeStableCoin);
    setUiAuthEnabled(basic.uiAuth?.enabled ?? true);
    setUiUsername(basic.uiAuth?.username ?? "admin");
    setConfirmLive(false);
  }, [basic]);

  const derivedHint = useMemo(() => {
    const maxOpenPositions = Math.max(1, Math.round(1 + (risk / 100) * 9));
    const maxPositionPct = Math.round((1 + (risk / 100) * 19) * 10) / 10;
    return { maxOpenPositions, maxPositionPct };
  }, [risk]);

  async function onSave(): Promise<void> {
    setSaveError(null);
    setSavedAt(null);

    if (liveTrading && !confirmLive) {
      setSaveError("Live trading requires confirmation.");
      return;
    }

    setSaving(true);
    try {
      await apiPut("/config/basic", {
        risk,
        tradeMode,
        aiEnabled,
        aiMinTradeConfidence,
        liveTrading,
        homeStableCoin
      });
      setSavedAt(new Date().toISOString());
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSaveUiAuth(): Promise<void> {
    setUiAuthError(null);
    setUiAuthSavedAt(null);

    if (!uiUsername.trim()) {
      setUiAuthError("Username is required.");
      return;
    }

    if (uiPassword || uiPassword2) {
      if (uiPassword.length < 8) {
        setUiAuthError("Password must be at least 8 characters.");
        return;
      }
      if (uiPassword !== uiPassword2) {
        setUiAuthError("Password confirmation does not match.");
        return;
      }
    }

    setSavingUiAuth(true);
    try {
      await apiPut("/config/ui-auth", {
        enabled: uiAuthEnabled,
        username: uiUsername.trim(),
        ...(uiPassword ? { password: uiPassword } : {})
      });
      setUiPassword("");
      setUiPassword2("");
      setUiAuthSavedAt(new Date().toISOString());
    } catch (e) {
      setUiAuthError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingUiAuth(false);
    }
  }

  if (loading) {
    return (
      <div className="row">
        <div className="title">Loading…</div>
        <div className="subtitle">Reading current configuration.</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="row">
        <div className="title">Error</div>
        <div className="subtitle">{error}</div>
      </div>
    );
  }

  if (!basic) {
    return (
      <div className="row">
        <div className="title">Not initialized</div>
        <div className="subtitle">Complete onboarding first.</div>
      </div>
    );
  }

  return (
    <div className="row">
      <div>
        <div className="title">Basic</div>
        <div className="subtitle">Safe surface. Changing risk recalculates derived defaults.</div>
      </div>

      {saveError ? (
        <div className="card" style={{ borderColor: "rgba(255, 90, 106, 0.5)" }}>
          <div className="title" style={{ color: "var(--danger)" }}>
            Save error
          </div>
          <div className="subtitle">{saveError}</div>
        </div>
      ) : null}

      {savedAt ? <div className="subtitle">Saved at {new Date(savedAt).toLocaleTimeString()}.</div> : null}

      <div className="row cols-2">
        <div>
          <label className="label">Trading mode (MVP)</label>
          <select className="field" value={tradeMode} onChange={(e) => setTradeMode(e.target.value as "SPOT" | "SPOT_GRID")}>
            <option value="SPOT">Spot only</option>
            <option value="SPOT_GRID">Spot + Grid</option>
          </select>
          <div className="subtitle">Grid is supported in MVP scope; futures is not yet.</div>
        </div>
        <div>
          <label className="label">Home stable coin</label>
          <input className="field" value={homeStableCoin} onChange={(e) => setHomeStableCoin(e.target.value)} />
          <div className="subtitle">Bot may convert balances to this coin when needed (future implementation).</div>
        </div>
      </div>

      <div className="row cols-2">
        <div>
          <label className="label">Risk</label>
          <input className="field range" type="range" min={0} max={100} value={risk} onChange={(e) => setRisk(Number.parseInt(e.target.value, 10))} />
          <div className="subtitle">
            Risk: <b>{risk}</b> — Derived: max positions <b>{derivedHint.maxOpenPositions}</b>, max position size <b>{derivedHint.maxPositionPct}%</b>
          </div>
        </div>
        <div>
          <label className="label">Live trading</label>
          <select
            className="field"
            value={liveTrading ? "on" : "off"}
            onChange={(e) => {
              const live = e.target.value === "on";
              setLiveTrading(live);
              if (!live) setConfirmLive(false);
            }}
          >
            <option value="off">Off (recommended)</option>
            <option value="on">On</option>
          </select>
          {liveTrading ? (
            <label className="subtitle" style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 10 }}>
              <input type="checkbox" checked={confirmLive} onChange={(e) => setConfirmLive(e.target.checked)} />
              I understand and accept the risks of live trading.
            </label>
          ) : null}
        </div>
      </div>

      <div className="row cols-2">
        <div>
          <label className="label">AI engine</label>
          <select className="field" value={aiEnabled ? "on" : "off"} onChange={(e) => setAiEnabled(e.target.value === "on")}>
            <option value="off">Off</option>
            <option value="on">On</option>
          </select>
          <div className="subtitle">If you enable AI here, ensure your OpenAI key is configured in onboarding.</div>
        </div>
        <div>
          <label className="label">AI min trade confidence (%)</label>
          <input
            className="field range"
            type="range"
            min={0}
            max={100}
            value={aiMinTradeConfidence}
            onChange={(e) => setAiMinTradeConfidence(Number.parseInt(e.target.value, 10))}
            disabled={!aiEnabled}
          />
          <div className="subtitle">
            {aiEnabled ? (
              <>
                AI influences decisions only when confidence is at least <b>{aiMinTradeConfidence}%</b>.
              </>
            ) : (
              <>Enable AI engine to use this setting.</>
            )}
          </div>
        </div>
      </div>

      <div>
        <button className="btn primary" onClick={onSave} disabled={saving || (liveTrading && !confirmLive)}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="title">UI access (Basic Auth)</div>
        <div className="subtitle">Changing this will require re-login on all devices.</div>

        {uiAuthError ? (
          <div className="subtitle" style={{ color: "var(--danger)", marginTop: 10 }}>
            {uiAuthError}
          </div>
        ) : null}

        {uiAuthSavedAt ? (
          <div className="subtitle" style={{ marginTop: 10 }}>
            Saved at {new Date(uiAuthSavedAt).toLocaleTimeString()}. Reload the page to re-authenticate.
          </div>
        ) : null}

        <div className="row cols-2" style={{ marginTop: 12 }}>
          <div>
            <label className="label">UI auth</label>
            <select className="field" value={uiAuthEnabled ? "on" : "off"} onChange={(e) => setUiAuthEnabled(e.target.value === "on")}>
              <option value="on">On (recommended)</option>
              <option value="off">Off</option>
            </select>
          </div>
          <div>
            <label className="label">Username</label>
            <input className="field" value={uiUsername} onChange={(e) => setUiUsername(e.target.value)} />
          </div>
        </div>

        <div className="row cols-2" style={{ marginTop: 12 }}>
          <div>
            <label className="label">New password</label>
            <input className="field" type="password" value={uiPassword} onChange={(e) => setUiPassword(e.target.value)} placeholder="Leave empty to keep current" />
          </div>
          <div>
            <label className="label">Confirm password</label>
            <input className="field" type="password" value={uiPassword2} onChange={(e) => setUiPassword2(e.target.value)} placeholder="Repeat new password" />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={onSaveUiAuth} disabled={savingUiAuth}>
            {savingUiAuth ? "Saving…" : "Save UI access"}
          </button>
        </div>
      </div>
    </div>
  );
}
