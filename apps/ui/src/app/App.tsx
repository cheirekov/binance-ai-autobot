import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { DashboardPage } from "../pages/DashboardPage";
import { OnboardingPage } from "../pages/OnboardingPage";
import { SettingsPage } from "../pages/SettingsPage";
import { useSetupStatus } from "../hooks/useSetupStatus";

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

function AppRoutes(): JSX.Element {
  const status = useSetupStatus();

  if (status.loading) {
    return (
      <div className="container">
        <div className="card">
          <div className="title">Loading…</div>
          <div className="subtitle">{status.error ?? "Checking setup status."}</div>
        </div>
      </div>
    );
  }

  if (status.initialized === null) {
    return (
      <div className="container">
        <div className="card">
          <div className="title">API unavailable</div>
          <div className="subtitle">{status.error ?? "Unable to verify setup status. Retrying…"}</div>
        </div>
      </div>
    );
  }

  if (!status.initialized) {
    return (
      <Routes>
        <Route path="/onboarding/*" element={<OnboardingPage />} />
        <Route path="*" element={<Navigate to="/onboarding/basic" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/settings/*" element={<SettingsPage />} />
      <Route path="/onboarding/*" element={<Navigate to="/settings/basic" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
