import { Link, NavLink, Route, Routes } from "react-router-dom";

import { SettingsAdvanced } from "./settings/SettingsAdvanced";
import { SettingsBasic } from "./settings/SettingsBasic";
import { SettingsExpert } from "./settings/SettingsExpert";

export function SettingsPage(): JSX.Element {
  return (
    <div className="container">
      <div className="topbar">
        <div>
          <div className="title">Settings</div>
          <div className="subtitle">Basic → Advanced → Expert (Kodi-like). Defaults adapt across levels.</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link className="btn" to="/">
            Home
          </Link>
          <span className="pill">Config</span>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <div className="nav">
            <NavLink to="/settings/basic">Basic</NavLink>
            <NavLink to="/settings/advanced">Advanced</NavLink>
            <NavLink to="/settings/expert">Expert</NavLink>
          </div>
        </div>

        <div className="card">
          <Routes>
            <Route path="basic" element={<SettingsBasic />} />
            <Route path="advanced" element={<SettingsAdvanced />} />
            <Route path="expert" element={<SettingsExpert />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
