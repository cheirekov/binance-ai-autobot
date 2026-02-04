import { useEffect, useState } from "react";

import { apiPut } from "../../api/http";
import { usePublicConfig } from "../../hooks/usePublicConfig";

export function SettingsAdvanced(): JSX.Element {
  const { loading, config, error } = usePublicConfig();

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [neverTradeSymbolsText, setNeverTradeSymbolsText] = useState("");
  const [autoBlacklistEnabled, setAutoBlacklistEnabled] = useState(true);
  const [autoBlacklistTtlMinutes, setAutoBlacklistTtlMinutes] = useState(180);

  useEffect(() => {
    if (!config?.advanced) return;
    setNeverTradeSymbolsText((config.advanced.neverTradeSymbols ?? []).join("\n"));
    setAutoBlacklistEnabled(config.advanced.autoBlacklistEnabled);
    setAutoBlacklistTtlMinutes(config.advanced.autoBlacklistTtlMinutes);
  }, [config?.advanced]);

  async function onSave(): Promise<void> {
    setSaveError(null);
    setSavedAt(null);
    setSaving(true);
    try {
      const neverTradeSymbols = neverTradeSymbolsText
        .split(/\r?\n/g)
        .map((s) => s.trim())
        .filter(Boolean);

      await apiPut("/config/advanced", {
        neverTradeSymbols,
        autoBlacklistEnabled,
        autoBlacklistTtlMinutes
      });
      setSavedAt(new Date().toISOString());
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
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

  if (!config?.initialized) {
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
        <div className="title">Advanced</div>
        <div className="subtitle">More control, still safe by default.</div>
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
          <label className="label">Never trade (symbols)</label>
          <textarea
            className="field"
            style={{ minHeight: 140 }}
            value={neverTradeSymbolsText}
            onChange={(e) => setNeverTradeSymbolsText(e.target.value)}
            placeholder={"One symbol per line, e.g.\nBTCUSDC\nETHUSDC"}
          />
          <div className="subtitle">Hard blocklist controlled by you.</div>
        </div>
        <div>
          <label className="label">Auto blacklist (on failures)</label>
          <select
            className="field"
            value={autoBlacklistEnabled ? "on" : "off"}
            onChange={(e) => setAutoBlacklistEnabled(e.target.value === "on")}
          >
            <option value="on">On</option>
            <option value="off">Off</option>
          </select>
          <div className="subtitle">Bot can temporarily blacklist symbols after rejects/errors.</div>

          <label className="label" style={{ marginTop: 12 }}>
            Auto blacklist TTL (minutes)
          </label>
          <input
            className="field"
            type="number"
            min={1}
            max={43200}
            value={autoBlacklistTtlMinutes}
            onChange={(e) => setAutoBlacklistTtlMinutes(Number.parseInt(e.target.value, 10))}
          />
          <div className="subtitle">Used for temporary “cooldown” blacklists.</div>
        </div>
      </div>

      <div>
        <button className="btn primary" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

