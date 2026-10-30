// Bounded, local diagnostics. Never record prompts, product content or credentials.
export function recordDiagnostic(event, metrics = {}) {
  const safe = Object.fromEntries(
    Object.entries(metrics).filter(
      ([key, value]) =>
        ["durationMs", "status", "fps"].includes(key) &&
        typeof value === "number" &&
        Number.isFinite(value),
    ),
  );
  const entry = { at: new Date().toISOString(), event, ...safe };
  try {
    const prior = JSON.parse(localStorage.getItem("kalpi-diagnostics") || "[]");
    localStorage.setItem(
      "kalpi-diagnostics",
      JSON.stringify([...prior.slice(-49), entry]),
    );
  } catch {}
  console.info("kalpi.diagnostic", entry);
}
