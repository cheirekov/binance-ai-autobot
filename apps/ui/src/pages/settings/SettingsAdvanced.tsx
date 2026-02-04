import { useEffect, useState } from "react";

import { apiGet, apiPut } from "../../api/http";
import { usePublicConfig } from "../../hooks/usePublicConfig";

export function SettingsAdvanced(): JSX.Element {
  const { loading, config, error } = usePublicConfig();

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [neverTradeSymbolsText, setNeverTradeSymbolsText] = useState("");
  const [autoBlacklistEnabled, setAutoBlacklistEnabled] = useState(true);
  const [autoBlacklistTtlMinutes, setAutoBlacklistTtlMinutes] = useState(180);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedName, setImportedName] = useState<string | null>(null);
  const [importedJson, setImportedJson] = useState<unknown | null>(null);

  useEffect(() => {
    if (!config?.advanced) return;
    setNeverTradeSymbolsText((config.advanced.neverTradeSymbols ?? []).join("\n"));
    setAutoBlacklistEnabled(config.advanced.autoBlacklistEnabled);
    setAutoBlacklistTtlMinutes(config.advanced.autoBlacklistTtlMinutes);
  }, [config?.advanced]);

  async function onExport(): Promise<void> {
    setExportError(null);
    setExporting(true);
    try {
      const cfg = await apiGet<unknown>("/config/export");
      const content = JSON.stringify(cfg, null, 2);
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "config.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(false);
    }
  }

  async function onPickImportFile(file: File | null): Promise<void> {
    setImportedName(null);
    setImportedJson(null);
    setImportError(null);
    if (!file) return;

    setImportedName(file.name);
    try {
      const text = await file.text();
      setImportedJson(JSON.parse(text));
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    }
  }

  async function onImport(): Promise<void> {
    setImportError(null);
    if (!importedJson) {
      setImportError("Pick a config.json file first.");
      return;
    }

    setImporting(true);
    try {
      await apiPut("/config/import", importedJson);
      setImportedJson(null);
      setImportedName(null);
      window.location.reload();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : String(e));
    } finally {
      setImporting(false);
    }
  }

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

      <div className="card" style={{ marginTop: 14 }}>
        <div className="title">Export / Import</div>
        <div className="subtitle">This includes secrets (Binance/OpenAI keys). Store the file securely.</div>

        {exportError ? (
          <div className="subtitle" style={{ color: "var(--danger)", marginTop: 10 }}>
            Export failed: {exportError}
          </div>
        ) : null}

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="btn" onClick={onExport} disabled={exporting}>
            {exporting ? "Exporting…" : "Export config.json"}
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          <label className="label">Import config.json (overwrites current settings)</label>
          <input
            className="field"
            type="file"
            accept="application/json,.json"
            onChange={(e) => void onPickImportFile(e.target.files?.[0] ?? null)}
          />
          {importedName ? <div className="subtitle">Selected: {importedName}</div> : null}
          {importError ? (
            <div className="subtitle" style={{ color: "var(--danger)" }}>
              Import failed: {importError}
            </div>
          ) : null}
          <div style={{ marginTop: 10 }}>
            <button className="btn danger" onClick={onImport} disabled={importing || !importedJson}>
              {importing ? "Importing…" : "Import and reload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
