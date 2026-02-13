import { useEffect, useState } from "react";

import { apiGet, apiPost, apiPut } from "../../api/http";
import { usePublicConfig } from "../../hooks/usePublicConfig";

export function SettingsAdvanced(): JSX.Element {
  const { loading, config, error } = usePublicConfig({ pollMs: 0 });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const [savingBinanceKeys, setSavingBinanceKeys] = useState(false);
  const [binanceKeysSavedAt, setBinanceKeysSavedAt] = useState<string | null>(null);
  const [binanceKeysError, setBinanceKeysError] = useState<string | null>(null);
  const [binanceApiKey, setBinanceApiKey] = useState("");
  const [binanceApiSecret, setBinanceApiSecret] = useState("");

  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [apiHost, setApiHost] = useState("0.0.0.0");
  const [apiPort, setApiPort] = useState(8148);
  const [uiHost, setUiHost] = useState("0.0.0.0");
  const [uiPort, setUiPort] = useState(4173);

  const [botOrderClientIdPrefix, setBotOrderClientIdPrefix] = useState("ABOT");
  const [botOrderAutoCancelEnabled, setBotOrderAutoCancelEnabled] = useState(true);
  const [botOrderStaleTtlMinutes, setBotOrderStaleTtlMinutes] = useState(180);
  const [botOrderMaxDistancePct, setBotOrderMaxDistancePct] = useState(3);
  const [autoCancelBotOrdersOnStop, setAutoCancelBotOrdersOnStop] = useState(true);
  const [autoCancelBotOrdersOnGlobalProtectionLock, setAutoCancelBotOrdersOnGlobalProtectionLock] = useState(true);
  const [manageExternalOpenOrders, setManageExternalOpenOrders] = useState(false);

  const [binanceEnvironment, setBinanceEnvironment] = useState<"MAINNET" | "SPOT_TESTNET">("MAINNET");
  const [binanceBaseUrlOverride, setBinanceBaseUrlOverride] = useState("");

  const [neverTradeSymbolsText, setNeverTradeSymbolsText] = useState("");
  const [autoBlacklistEnabled, setAutoBlacklistEnabled] = useState(true);
  const [autoBlacklistTtlMinutes, setAutoBlacklistTtlMinutes] = useState(180);
  const [followRiskProfile, setFollowRiskProfile] = useState(true);
  const [liveTradeCooldownMs, setLiveTradeCooldownMs] = useState(60000);
  const [liveTradeNotionalCap, setLiveTradeNotionalCap] = useState(25);
  const [liveTradeSlippageBuffer, setLiveTradeSlippageBuffer] = useState(1.005);
  const [liveTradeRebalanceSellCooldownMs, setLiveTradeRebalanceSellCooldownMs] = useState(900000);
  const [conversionBuyBuffer, setConversionBuyBuffer] = useState(1.005);
  const [conversionSellBuffer, setConversionSellBuffer] = useState(1.002);
  const [conversionFeeBuffer, setConversionFeeBuffer] = useState(1.002);
  const [routingBridgeAssetsText, setRoutingBridgeAssetsText] = useState("USDT\nUSDC\nBTC\nETH\nBNB");
  const [universeQuoteAssetsText, setUniverseQuoteAssetsText] = useState("");
  const [walletQuoteHintLimit, setWalletQuoteHintLimit] = useState(8);
  const [excludeStableStablePairs, setExcludeStableStablePairs] = useState(true);
  const [enforceRegionPolicy, setEnforceRegionPolicy] = useState(true);
  const [symbolEntryCooldownMs, setSymbolEntryCooldownMs] = useState(120000);
  const [maxConsecutiveEntriesPerSymbol, setMaxConsecutiveEntriesPerSymbol] = useState(3);
  const [conversionTopUpReserveMultiplier, setConversionTopUpReserveMultiplier] = useState(2);
  const [conversionTopUpCooldownMs, setConversionTopUpCooldownMs] = useState(90000);
  const [conversionTopUpMinTarget, setConversionTopUpMinTarget] = useState(5);

  const [rotatingApiKey, setRotatingApiKey] = useState(false);
  const [rotatedApiKey, setRotatedApiKey] = useState<string | null>(null);
  const [rotateApiKeyError, setRotateApiKeyError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importedName, setImportedName] = useState<string | null>(null);
  const [importedJson, setImportedJson] = useState<unknown | null>(null);

  useEffect(() => {
    if (!config?.advanced) return;
    setApiBaseUrl(config.advanced.apiBaseUrl ?? "");
    setApiHost(config.advanced.apiHost ?? "0.0.0.0");
    setApiPort(config.advanced.apiPort ?? 8148);
    setUiHost(config.advanced.uiHost ?? "0.0.0.0");
    setUiPort(config.advanced.uiPort ?? 4173);
    setBotOrderClientIdPrefix(config.advanced.botOrderClientIdPrefix ?? "ABOT");
    setBotOrderAutoCancelEnabled(config.advanced.botOrderAutoCancelEnabled ?? true);
    setBotOrderStaleTtlMinutes(config.advanced.botOrderStaleTtlMinutes ?? 180);
    setBotOrderMaxDistancePct(config.advanced.botOrderMaxDistancePct ?? 3);
    setAutoCancelBotOrdersOnStop(config.advanced.autoCancelBotOrdersOnStop ?? true);
    setAutoCancelBotOrdersOnGlobalProtectionLock(config.advanced.autoCancelBotOrdersOnGlobalProtectionLock ?? true);
    setManageExternalOpenOrders(config.advanced.manageExternalOpenOrders ?? false);
    setBinanceEnvironment(config.advanced.binanceEnvironment ?? "MAINNET");
    setBinanceBaseUrlOverride(config.advanced.binanceBaseUrlOverride ?? "");
    setNeverTradeSymbolsText((config.advanced.neverTradeSymbols ?? []).join("\n"));
    setAutoBlacklistEnabled(config.advanced.autoBlacklistEnabled);
    setAutoBlacklistTtlMinutes(config.advanced.autoBlacklistTtlMinutes);
    setFollowRiskProfile(config.advanced.followRiskProfile);
    setLiveTradeCooldownMs(config.advanced.liveTradeCooldownMs);
    setLiveTradeNotionalCap(config.advanced.liveTradeNotionalCap);
    setLiveTradeSlippageBuffer(config.advanced.liveTradeSlippageBuffer);
    setLiveTradeRebalanceSellCooldownMs(config.advanced.liveTradeRebalanceSellCooldownMs);
    setConversionBuyBuffer(config.advanced.conversionBuyBuffer);
    setConversionSellBuffer(config.advanced.conversionSellBuffer);
    setConversionFeeBuffer(config.advanced.conversionFeeBuffer);
    setRoutingBridgeAssetsText((config.advanced.routingBridgeAssets ?? []).join("\n"));
    setUniverseQuoteAssetsText((config.advanced.universeQuoteAssets ?? []).join("\n"));
    setWalletQuoteHintLimit(config.advanced.walletQuoteHintLimit ?? 8);
    setExcludeStableStablePairs(config.advanced.excludeStableStablePairs);
    setEnforceRegionPolicy(config.advanced.enforceRegionPolicy);
    setSymbolEntryCooldownMs(config.advanced.symbolEntryCooldownMs);
    setMaxConsecutiveEntriesPerSymbol(config.advanced.maxConsecutiveEntriesPerSymbol);
    setConversionTopUpReserveMultiplier(config.advanced.conversionTopUpReserveMultiplier);
    setConversionTopUpCooldownMs(config.advanced.conversionTopUpCooldownMs);
    setConversionTopUpMinTarget(config.advanced.conversionTopUpMinTarget);
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
      const routingBridgeAssets = routingBridgeAssetsText
        .split(/\r?\n/g)
        .map((s) => s.trim())
        .filter(Boolean);
      const universeQuoteAssets = universeQuoteAssetsText
        .split(/\r?\n/g)
        .map((s) => s.trim())
        .filter(Boolean);

      await apiPut("/config/advanced", {
        apiBaseUrl: apiBaseUrl.trim(),
        binanceEnvironment,
        binanceBaseUrlOverride: binanceBaseUrlOverride.trim(),
        apiHost,
        apiPort,
        uiHost,
        uiPort,
        botOrderClientIdPrefix: botOrderClientIdPrefix.trim() || "ABOT",
        botOrderAutoCancelEnabled,
        botOrderStaleTtlMinutes,
        botOrderMaxDistancePct,
        autoCancelBotOrdersOnStop,
        autoCancelBotOrdersOnGlobalProtectionLock,
        manageExternalOpenOrders,
        neverTradeSymbols,
        autoBlacklistEnabled,
        autoBlacklistTtlMinutes,
        followRiskProfile,
        liveTradeCooldownMs,
        liveTradeNotionalCap,
        liveTradeSlippageBuffer,
        liveTradeRebalanceSellCooldownMs,
        conversionBuyBuffer,
        conversionSellBuffer,
        conversionFeeBuffer,
        routingBridgeAssets,
        universeQuoteAssets,
        walletQuoteHintLimit,
        excludeStableStablePairs,
        enforceRegionPolicy,
        symbolEntryCooldownMs,
        maxConsecutiveEntriesPerSymbol,
        conversionTopUpReserveMultiplier,
        conversionTopUpCooldownMs,
        conversionTopUpMinTarget
      });
      setSavedAt(new Date().toISOString());
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function onSaveBinanceKeys(): Promise<void> {
    setBinanceKeysError(null);
    setBinanceKeysSavedAt(null);

    if (!binanceApiKey.trim() || !binanceApiSecret.trim()) {
      setBinanceKeysError("Both Binance API key and secret are required.");
      return;
    }

    setSavingBinanceKeys(true);
    try {
      await apiPut("/config/binance-credentials", {
        apiKey: binanceApiKey.trim(),
        apiSecret: binanceApiSecret.trim()
      });
      setBinanceApiKey("");
      setBinanceApiSecret("");
      setBinanceKeysSavedAt(new Date().toISOString());
    } catch (e) {
      setBinanceKeysError(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingBinanceKeys(false);
    }
  }

  async function onRotateApiKey(): Promise<void> {
    setRotateApiKeyError(null);
    setRotatedApiKey(null);
    setRotatingApiKey(true);
    try {
      const res = await apiPost<{ apiKey: string }>("/config/rotate-api-key", {});
      setRotatedApiKey(res.apiKey);
      try {
        await navigator.clipboard.writeText(res.apiKey);
      } catch {
        // ignore
      }
    } catch (e) {
      setRotateApiKeyError(e instanceof Error ? e.message : String(e));
    } finally {
      setRotatingApiKey(false);
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
        <div className="card">
          <div className="title">Endpoints</div>
          <div className="subtitle">
            These values are saved to config and used by the UI proxy when <code>API_BASE_URL</code> is not set. Changing container ports still
            requires a restart.
          </div>

          <label className="label" style={{ marginTop: 12 }}>
            API base URL (optional)
          </label>
          <input
            className="field"
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            placeholder="http://api:8148"
          />
          <div className="subtitle">Leave empty to use the container/environment default.</div>

          <div className="row cols-2" style={{ marginTop: 12 }}>
            <div>
              <label className="label">API host (info)</label>
              <input className="field" value={apiHost} onChange={(e) => setApiHost(e.target.value)} />
            </div>
            <div>
              <label className="label">API port (info)</label>
              <input
                className="field"
                type="number"
                min={1}
                max={65535}
                value={apiPort}
                onChange={(e) => setApiPort(Number.parseInt(e.target.value, 10))}
              />
            </div>
          </div>

          <div className="row cols-2" style={{ marginTop: 12 }}>
            <div>
              <label className="label">UI host (info)</label>
              <input className="field" value={uiHost} onChange={(e) => setUiHost(e.target.value)} />
            </div>
            <div>
              <label className="label">UI port (info)</label>
              <input
                className="field"
                type="number"
                min={1}
                max={65535}
                value={uiPort}
                onChange={(e) => setUiPort(Number.parseInt(e.target.value, 10))}
              />
            </div>
          </div>

        </div>

        <div className="card">
          <div className="title">Binance environment</div>
          <div className="subtitle">Switch between mainnet and Spot testnet. Testnet can be unstable/outage-prone.</div>

          <label className="label" style={{ marginTop: 12 }}>
            Environment
          </label>
          <select className="field" value={binanceEnvironment} onChange={(e) => setBinanceEnvironment(e.target.value as "MAINNET" | "SPOT_TESTNET")}>
            <option value="MAINNET">Mainnet (real)</option>
            <option value="SPOT_TESTNET">Spot testnet</option>
          </select>

          <label className="label" style={{ marginTop: 12 }}>
            Base URL override (optional)
          </label>
          <input
            className="field"
            value={binanceBaseUrlOverride}
            onChange={(e) => setBinanceBaseUrlOverride(e.target.value)}
            placeholder="https://api.binance.com"
          />
          <div className="subtitle">Leave empty to use the selected environment default.</div>
        </div>

        <div className="card">
          <div className="title">Execution policy</div>
          <div className="subtitle">
            These controls are part of <code>config.json</code> and exported/imported with the rest of your settings.
          </div>

          <label className="label" style={{ marginTop: 12 }}>
            Follow Basic risk profile
          </label>
          <select className="field" value={followRiskProfile ? "on" : "off"} onChange={(e) => setFollowRiskProfile(e.target.value === "on")}>
            <option value="on">On (recommended)</option>
            <option value="off">Off (manual override)</option>
          </select>
          <div className="subtitle">
            {followRiskProfile
              ? `Managed by Basic risk slider (current risk ${config.basic?.risk ?? "?"}).`
              : "Manual mode: these values stay fixed until you change them here."}
          </div>

          <div className="card" style={{ marginTop: 12, background: "rgba(255,255,255,0.02)" }}>
            <div className="title" style={{ fontSize: 14 }}>
              Open order management (adaptive)
            </div>
            <div className="subtitle">
              Autobot distinguishes its own orders via <code>clientOrderId</code> prefix and manages them automatically. External/manual open orders are not
              canceled by default.
            </div>

            <div className="row cols-2" style={{ marginTop: 12 }}>
              <div>
                <label className="label">Bot order clientId prefix</label>
                <input className="field" value={botOrderClientIdPrefix} onChange={(e) => setBotOrderClientIdPrefix(e.target.value)} />
                <div className="subtitle">Only bot-owned orders are auto-managed and auto-canceled by default.</div>
              </div>
              <div>
                <label className="label">Auto-manage bot-owned open orders</label>
                <select
                  className="field"
                  value={botOrderAutoCancelEnabled ? "on" : "off"}
                  onChange={(e) => setBotOrderAutoCancelEnabled(e.target.value === "on")}
                >
                  <option value="on">On (recommended)</option>
                  <option value="off">Off</option>
                </select>
                <div className="subtitle">Cancels stale bot-owned LIMIT orders and refreshes grid ladders as market moves.</div>
              </div>
            </div>

            <div className="row cols-2" style={{ marginTop: 12 }}>
              <div>
                <label className="label">Stale TTL (minutes)</label>
                <input
                  className="field"
                  type="number"
                  min={1}
                  max={10080}
                  value={botOrderStaleTtlMinutes}
                  disabled={followRiskProfile}
                  onChange={(e) => {
                    const next = Number.parseInt(e.target.value, 10);
                    if (Number.isFinite(next)) setBotOrderStaleTtlMinutes(next);
                  }}
                />
                <div className="subtitle">{followRiskProfile ? "Managed by risk slider." : "Cancel bot-owned orders older than this."}</div>
              </div>
              <div>
                <label className="label">Max distance from market (%)</label>
                <input
                  className="field"
                  type="number"
                  min={0.1}
                  max={50}
                  step={0.1}
                  value={botOrderMaxDistancePct}
                  disabled={followRiskProfile}
                  onChange={(e) => {
                    const next = Number.parseFloat(e.target.value);
                    if (Number.isFinite(next)) setBotOrderMaxDistancePct(next);
                  }}
                />
                <div className="subtitle">{followRiskProfile ? "Managed by risk slider." : "Cancel bot-owned orders too far from current price."}</div>
              </div>
            </div>

            <div className="row cols-2" style={{ marginTop: 12 }}>
              <div>
                <label className="label">Cancel bot-owned orders on Stop</label>
                <select
                  className="field"
                  value={autoCancelBotOrdersOnStop ? "on" : "off"}
                  onChange={(e) => setAutoCancelBotOrdersOnStop(e.target.value === "on")}
                >
                  <option value="on">On (recommended)</option>
                  <option value="off">Off</option>
                </select>
                <div className="subtitle">Prevents leaving hidden live LIMIT orders after stopping the engine.</div>
              </div>
              <div>
                <label className="label">Cancel bot-owned orders on global protection lock</label>
                <select
                  className="field"
                  value={autoCancelBotOrdersOnGlobalProtectionLock ? "on" : "off"}
                  onChange={(e) => setAutoCancelBotOrdersOnGlobalProtectionLock(e.target.value === "on")}
                >
                  <option value="on">On (recommended)</option>
                  <option value="off">Off</option>
                </select>
                <div className="subtitle">If the bot locks globally (drawdown/stoploss guard), cancel open bot LIMIT orders too.</div>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <label className="label">Manage external/manual open orders</label>
              <select
                className="field"
                value={manageExternalOpenOrders ? "on" : "off"}
                onChange={(e) => setManageExternalOpenOrders(e.target.value === "on")}
              >
                <option value="off">Off (recommended)</option>
                <option value="on">On (dangerous)</option>
              </select>
              <div className="subtitle">
                If off, the bot will avoid trading a symbol when it detects external open orders. If on, the bot will treat them as part of the ladder and may
                place additional bot-owned orders.
              </div>
            </div>
          </div>

          <div className="row cols-2" style={{ marginTop: 12 }}>
            <div>
              <label className="label">Live trade cooldown (ms)</label>
              <input
                className="field"
                type="number"
                min={5000}
                max={86400000}
                value={liveTradeCooldownMs}
                disabled={followRiskProfile}
                onChange={(e) => {
                  const next = Number.parseInt(e.target.value, 10);
                  if (Number.isFinite(next)) setLiveTradeCooldownMs(next);
                }}
              />
            </div>
            <div>
              <label className="label">Live trade notional cap</label>
              <input
                className="field"
                type="number"
                min={1}
                max={1000000}
                step={0.01}
                value={liveTradeNotionalCap}
                disabled={followRiskProfile}
                onChange={(e) => {
                  const next = Number.parseFloat(e.target.value);
                  if (Number.isFinite(next)) setLiveTradeNotionalCap(next);
                }}
              />
            </div>
          </div>

          <div className="row cols-2" style={{ marginTop: 12 }}>
            <div>
              <label className="label">Slippage buffer</label>
              <input
                className="field"
                type="number"
                min={1}
                max={1.1}
                step={0.0001}
                value={liveTradeSlippageBuffer}
                disabled={followRiskProfile}
                onChange={(e) => {
                  const next = Number.parseFloat(e.target.value);
                  if (Number.isFinite(next)) setLiveTradeSlippageBuffer(next);
                }}
              />
            </div>
            <div>
              <label className="label">Rebalance sell cooldown (ms)</label>
              <input
                className="field"
                type="number"
                min={0}
                max={86400000}
                value={liveTradeRebalanceSellCooldownMs}
                disabled={followRiskProfile}
                onChange={(e) => {
                  const next = Number.parseInt(e.target.value, 10);
                  if (Number.isFinite(next)) setLiveTradeRebalanceSellCooldownMs(next);
                }}
              />
            </div>
          </div>

          <div className="row cols-2" style={{ marginTop: 12 }}>
            <div>
              <label className="label">Conversion buy buffer</label>
              <input
                className="field"
                type="number"
                min={1}
                max={1.1}
                step={0.0001}
                value={conversionBuyBuffer}
                disabled={followRiskProfile}
                onChange={(e) => {
                  const next = Number.parseFloat(e.target.value);
                  if (Number.isFinite(next)) setConversionBuyBuffer(next);
                }}
              />
            </div>
            <div>
              <label className="label">Conversion sell buffer</label>
              <input
                className="field"
                type="number"
                min={1}
                max={1.1}
                step={0.0001}
                value={conversionSellBuffer}
                disabled={followRiskProfile}
                onChange={(e) => {
                  const next = Number.parseFloat(e.target.value);
                  if (Number.isFinite(next)) setConversionSellBuffer(next);
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label className="label">Conversion fee buffer</label>
            <input
              className="field"
              type="number"
              min={1}
              max={1.1}
              step={0.0001}
              value={conversionFeeBuffer}
              disabled={followRiskProfile}
              onChange={(e) => {
                const next = Number.parseFloat(e.target.value);
                if (Number.isFinite(next)) setConversionFeeBuffer(next);
              }}
            />
          </div>

          <div className="row cols-2" style={{ marginTop: 12 }}>
            <div>
              <label className="label">Routing bridge assets</label>
              <textarea
                className="field"
                style={{ minHeight: 120 }}
                value={routingBridgeAssetsText}
                onChange={(e) => setRoutingBridgeAssetsText(e.target.value)}
                placeholder={"One asset per line, e.g.\nUSDT\nUSDC\nBTC\nETH\nBNB"}
              />
              <div className="subtitle">Used for valuation and conversion route discovery (home stable is always included).</div>
            </div>
            <div>
              <label className="label">Universe quote assets (optional)</label>
              <textarea
                className="field"
                style={{ minHeight: 120 }}
                value={universeQuoteAssetsText}
                onChange={(e) => setUniverseQuoteAssetsText(e.target.value)}
                placeholder={"Leave empty for auto mode.\nOr set one per line, e.g.\nUSDC\nUSDT\nBTC"}
              />
              <div className="subtitle">If empty, the bot auto-selects quote assets from region defaults and wallet hints.</div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label className="label">Wallet quote hint limit (auto mode)</label>
            <input
              className="field"
              type="number"
              min={0}
              max={20}
              value={walletQuoteHintLimit}
              onChange={(e) => {
                const next = Number.parseInt(e.target.value, 10);
                if (Number.isFinite(next)) setWalletQuoteHintLimit(next);
              }}
            />
            <div className="subtitle">How many top wallet assets can influence auto quote-asset selection.</div>
          </div>

          <div className="row cols-2" style={{ marginTop: 12 }}>
            <div>
              <label className="label">Exclude stable/stable pairs</label>
              <select
                className="field"
                value={excludeStableStablePairs ? "on" : "off"}
                onChange={(e) => setExcludeStableStablePairs(e.target.value === "on")}
              >
                <option value="on">On (recommended)</option>
                <option value="off">Off</option>
              </select>
              <div className="subtitle">Skips pairs like USDT/USDC and FDUSD/USDC.</div>
            </div>
            <div>
              <label className="label">Enforce regional policy</label>
              <select
                className="field"
                value={enforceRegionPolicy ? "on" : "off"}
                onChange={(e) => setEnforceRegionPolicy(e.target.value === "on")}
              >
                <option value="on">On (recommended)</option>
                <option value="off">Off</option>
              </select>
              <div className="subtitle">Applies the EEA quote-asset restrictions in bot policy.</div>
            </div>
          </div>

          <div className="row cols-2" style={{ marginTop: 12 }}>
            <div>
              <label className="label">Symbol entry cooldown (ms)</label>
              <input
                className="field"
                type="number"
                min={0}
                max={86400000}
                value={symbolEntryCooldownMs}
                disabled={followRiskProfile}
                onChange={(e) => {
                  const next = Number.parseInt(e.target.value, 10);
                  if (Number.isFinite(next)) setSymbolEntryCooldownMs(next);
                }}
              />
            </div>
            <div>
              <label className="label">Max consecutive entries / symbol</label>
              <input
                className="field"
                type="number"
                min={1}
                max={50}
                value={maxConsecutiveEntriesPerSymbol}
                disabled={followRiskProfile}
                onChange={(e) => {
                  const next = Number.parseInt(e.target.value, 10);
                  if (Number.isFinite(next)) setMaxConsecutiveEntriesPerSymbol(next);
                }}
              />
            </div>
          </div>

          <div className="row cols-2" style={{ marginTop: 12 }}>
            <div>
              <label className="label">Conversion top-up reserve multiplier</label>
              <input
                className="field"
                type="number"
                min={1}
                max={10}
                step={0.01}
                value={conversionTopUpReserveMultiplier}
                disabled={followRiskProfile}
                onChange={(e) => {
                  const next = Number.parseFloat(e.target.value);
                  if (Number.isFinite(next)) setConversionTopUpReserveMultiplier(next);
                }}
              />
            </div>
            <div>
              <label className="label">Conversion top-up cooldown (ms)</label>
              <input
                className="field"
                type="number"
                min={0}
                max={86400000}
                value={conversionTopUpCooldownMs}
                disabled={followRiskProfile}
                onChange={(e) => {
                  const next = Number.parseInt(e.target.value, 10);
                  if (Number.isFinite(next)) setConversionTopUpCooldownMs(next);
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <label className="label">Conversion top-up minimum target ({config.basic?.homeStableCoin ?? "USDC"})</label>
            <input
              className="field"
              type="number"
              min={1}
              max={100000}
              step={0.01}
              value={conversionTopUpMinTarget}
              disabled={followRiskProfile}
              onChange={(e) => {
                const next = Number.parseFloat(e.target.value);
                if (Number.isFinite(next)) setConversionTopUpMinTarget(next);
              }}
            />
            <div className="subtitle">When shortfall is tiny, conversion still targets at least this amount to satisfy exchange minimums.</div>
          </div>
        </div>

        <div className="card">
          <div className="title">Binance API keys</div>
          <div className="subtitle">
            Keys are stored in <code>data/config.json</code>. When you switch environment (mainnet/testnet), update keys accordingly.
          </div>

          {binanceKeysError ? (
            <div className="subtitle" style={{ color: "var(--danger)", marginTop: 10 }}>
              Save failed: {binanceKeysError}
            </div>
          ) : null}
          {binanceKeysSavedAt ? <div className="subtitle">Saved at {new Date(binanceKeysSavedAt).toLocaleTimeString()}.</div> : null}

          <label className="label" style={{ marginTop: 12 }}>
            API key
          </label>
          <input
            className="field"
            value={binanceApiKey}
            onChange={(e) => setBinanceApiKey(e.target.value)}
            placeholder="Paste your Binance API key"
            autoComplete="off"
          />

          <label className="label" style={{ marginTop: 12 }}>
            API secret
          </label>
          <input
            className="field"
            type="password"
            value={binanceApiSecret}
            onChange={(e) => setBinanceApiSecret(e.target.value)}
            placeholder="Paste your Binance API secret"
            autoComplete="off"
          />

          <div className="subtitle" style={{ marginTop: 10 }}>
            Recommendation: create separate keys for mainnet and testnet; restrict permissions and IPs. Rotate by generating a new key in Binance and
            updating it here, then revoke the old one in Binance.
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn primary" onClick={onSaveBinanceKeys} disabled={savingBinanceKeys}>
              {savingBinanceKeys ? "Saving…" : "Save Binance keys"}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="title">API key</div>
          <div className="subtitle">
            Required as <code>x-api-key</code> when calling the API directly. Current key ends with <code>{config.advanced?.apiKeyHint}</code>.
          </div>

          {rotateApiKeyError ? (
            <div className="subtitle" style={{ color: "var(--danger)", marginTop: 10 }}>
              Rotate failed: {rotateApiKeyError}
            </div>
          ) : null}

          {rotatedApiKey ? (
            <div style={{ marginTop: 10 }}>
              <label className="label">New API key (copied if possible)</label>
              <input className="field" value={rotatedApiKey} readOnly />
              <div className="subtitle">Update any external clients that call the API directly.</div>
            </div>
          ) : null}

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="btn danger" onClick={onRotateApiKey} disabled={rotatingApiKey}>
              {rotatingApiKey ? "Rotating…" : "Rotate API key"}
            </button>
          </div>
        </div>

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
