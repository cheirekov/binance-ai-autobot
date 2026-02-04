export function OnboardingPlaceholder({ level }: { level: "Advanced" | "Expert" }): JSX.Element {
  return (
    <div className="row">
      <div className="title">{level} settings</div>
      <div className="subtitle">Coming next: full configuration surface + dependent defaults.</div>
    </div>
  );
}
