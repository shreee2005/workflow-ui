import { useMemo } from "react";
import { Clock, Calendar, AlertTriangle } from "lucide-react";

export function GanttChart({ run, steps }) {
  const chartData = useMemo(() => {
    if (!run || !run.startedAt || !steps || steps.length === 0) return null;

    const runStart = new Date(run.startedAt).getTime();
    const runEnd = run.finishedAt ? new Date(run.finishedAt).getTime() : Date.now();
    const totalDuration = Math.max(runEnd - runStart, 100); // minimum 100ms

    const preparedSteps = steps.map((step) => {
      const stepStart = step.startedAt ? new Date(step.startedAt).getTime() : runStart;
      const stepEnd = step.finishedAt ? new Date(step.finishedAt).getTime() : (step.status === "RUNNING" || step.status === "WAITING" ? Date.now() : stepStart);
      
      const offsetMs = Math.max(stepStart - runStart, 0);
      const stepDuration = Math.max(stepEnd - stepStart, 0);
      
      const leftPercent = (offsetMs / totalDuration) * 100;
      const widthPercent = Math.max((stepDuration / totalDuration) * 100, 3); // minimum 3% width for visibility

      return {
        ...step,
        leftPercent: Math.min(leftPercent, 97),
        widthPercent: Math.min(widthPercent, 100 - leftPercent),
        durationSec: (stepDuration / 1000).toFixed(2),
      };
    });

    return {
      totalDurationSec: (totalDuration / 1000).toFixed(1),
      steps: preparedSteps,
    };
  }, [run, steps]);

  if (!chartData) {
    return (
      <div style={{ padding: "16px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
        No timeline data available for this run.
      </div>
    );
  }

  // Generate grid markers (0%, 25%, 50%, 75%, 100%)
  const gridMarkers = [0, 25, 50, 75, 100];

  return (
    <div
      style={{
        background: "rgba(9, 12, 21, 0.4)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "20px",
        marginTop: "14px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
        <h4 style={{ color: "#fff", fontWeight: 700, fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "6px" }}>
          <Clock size={14} style={{ color: "#a78bfa" }} />
          Execution Gantt Timeline
        </h4>
        <span className="mono" style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
          Total Duration: {chartData.totalDurationSec}s
        </span>
      </div>

      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Timeline Header scale grid */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", paddingBottom: "6px" }}>
          <div style={{ width: "160px" }} /> {/* label spacer */}
          <div style={{ flex: 1, position: "relative", height: "16px" }}>
            {gridMarkers.map((m) => {
              const label = ((parseFloat(chartData.totalDurationSec) * m) / 100).toFixed(1);
              return (
                <span
                  key={m}
                  style={{
                    position: "absolute",
                    left: `${m}%`,
                    transform: "translateX(-50%)",
                    fontSize: "0.7rem",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {label}s
                </span>
              );
            })}
          </div>
        </div>

        {/* Steps Grid Rows */}
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "8px" }}>
          {/* Vertical grid lines */}
          <div style={{ position: "absolute", top: 0, bottom: 0, left: "160px", right: 0, pointerEvents: "none" }}>
            {gridMarkers.map((m) => (
              <div
                key={m}
                style={{
                  position: "absolute",
                  left: `${m}%`,
                  top: 0,
                  bottom: 0,
                  width: "1px",
                  background: m === 0 || m === 100 ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                }}
              />
            ))}
          </div>

          {/* Steps Timeline Bars */}
          {chartData.steps.map((step) => {
            let barColor = "var(--border)";
            let barClass = "";

            if (step.status === "SUCCEEDED") barColor = "var(--success)";
            if (step.status === "FAILED") barColor = "var(--danger)";
            if (step.status === "RUNNING") {
              barColor = "var(--primary)";
              barClass = "timeline-bar-running";
            }
            if (step.status === "WAITING") {
              barColor = "var(--warning)";
              barClass = "timeline-bar-waiting";
            }

            return (
              <div
                key={step.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  height: "28px",
                  zIndex: 2,
                }}
              >
                {/* Step Label Column */}
                <div
                  style={{
                    width: "160px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#cbd5e1",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    paddingRight: "10px",
                  }}
                  title={`Step #${step.stepIndex + 1}: ${step.stepType}`}
                >
                  <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", marginRight: "6px" }}>
                    #{step.stepIndex + 1}
                  </span>
                  {step.stepType}
                </div>

                {/* Timeline Bar Track Column */}
                <div style={{ flex: 1, position: "relative", height: "100%", display: "flex", alignItems: "center" }}>
                  <div
                    className={barClass}
                    style={{
                      position: "absolute",
                      left: `${step.leftPercent}%`,
                      width: `${step.widthPercent}%`,
                      height: "14px",
                      background: barColor,
                      borderRadius: "4px",
                      boxShadow: step.status === "FAILED" ? "0 0 8px var(--danger-glow)" : (step.status === "SUCCEEDED" ? "0 0 8px var(--success-glow)" : "none"),
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title={`Status: ${step.status}\nDuration: ${step.durationSec}s\nStart: ${new Date(step.startedAt).toLocaleTimeString()}`}
                  >
                    {parseFloat(step.durationSec) > 0.5 && (
                      <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#fff", pointerEvents: "none" }}>
                        {step.durationSec}s
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
