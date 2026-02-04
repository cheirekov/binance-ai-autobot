import { NavLink, Route, Routes } from "react-router-dom";

import { OnboardingBasic } from "./onboarding/OnboardingBasic";
import { OnboardingPlaceholder } from "./onboarding/OnboardingPlaceholder";

export function OnboardingPage(): JSX.Element {
  return (
    <div className="container">
      <div className="topbar">
        <div>
          <div className="title">Initial Configuration</div>
          <div className="subtitle">Start with Basic settings. Advanced/Expert unlock deeper control.</div>
        </div>
        <span className="pill">Onboarding wizard</span>
      </div>

      <div className="grid">
        <div className="card">
          <div className="nav">
            <NavLink to="/onboarding/basic">Basic</NavLink>
            <NavLink to="/onboarding/advanced">Advanced</NavLink>
            <NavLink to="/onboarding/expert">Expert</NavLink>
          </div>
        </div>

        <div className="card">
          <Routes>
            <Route path="basic" element={<OnboardingBasic />} />
            <Route path="advanced" element={<OnboardingPlaceholder level="Advanced" />} />
            <Route path="expert" element={<OnboardingPlaceholder level="Expert" />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
