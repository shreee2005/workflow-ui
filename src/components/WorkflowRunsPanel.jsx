import { useState, useMemo } from "react";
import { runApi } from "../api";
import { Calendar, Clock, Terminal, ChevronDown, ChevronRight, X, AlertCircle, RefreshCw } from "lucide-react";
import { GanttChart } from "./GanttChart";

export function WorkflowRunsPanel({ workflow, runs, onClose, onRefresh }) {
  const [selectedRunId, setSelectedRunId] = useState(null);
  const [stepsCache, setStepsCache] = useState({});
  const [loadingSteps, setLoadingSteps] = useState({});
  const [openLogs, setOpenLogs] = useState({});

  // Parse workflow spec steps to display configured inputs
  const specSteps = useMemo(() => {
    try {
      const parsed = JSON.parse(workflow.spec);
      return parsed.steps || [];
    } catch {
      return [];
    }
  }, [workflow.spec]);

  const handleToggleRun = async (runId) => {
    if (selectedRunId === runId) {
      setSelectedRunId(null);
      return;
    }

    setSelectedRunId(runId);

    // If steps not in cache, fetch them
    if (!stepsCache[runId]) {
      setLoadingSteps((prev) => ({ ...prev, [runId]: true }));
      try {
        const steps = await runApi.steps(runId);
        setStepsCache((prev) => ({ ...prev, [runId]: steps }));
      } catch (err) {
        console.error("Failed to fetch run steps:", err);
      } finally {
        setLoadingSteps((prev) => ({ ...prev, [runId]: false }));
      }
    }
  };

  const handleToggleLogs = (stepId) => {
    setOpenLogs((prev) => ({ ...prev, [stepId]: !prev[stepId] }));
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return d.toLocaleString();
    } catch {
      return isoString;
    }
  };

  const getDuration = (start, end) => {
    if (!start || !end) return "";
    try {
      const diffMs = new Date(end) - new Date(start);
      const secs = (diffMs / 1000).toFixed(1);
      return `${secs}s`;
    } catch {
      return "";
    }
  };

  return (
    <section className="card">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Execution History</h2>
          <p className="panel-hint">
            Workflow: <strong style={{ color: "#fff" }}>{workflow.name}</strong> (ID: {workflow.id})
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          {onRefresh && (
            <button className="btn btn-ghost btn-sm" onClick={onRefresh}>
              <RefreshCw size={13} />
              Refresh
            </button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={13} />
            Close
          </button>
        </div>
      </div>

      {!runs || runs.length === 0 ? (
        <p className="panel-hint" style={{ marginTop: "12px" }}>
          No execution runs found for this workflow. Trigger the webhook endpoint to launch a run.
        </p>
      ) : (
        <div className="stack" style={{ gap: "14px", marginTop: "14px" }}>
          {runs.map((run) => {
            const isExpanded = selectedRunId === run.id;
            const steps = stepsCache[run.id] || [];
            const isLoading = loadingSteps[run.id];

            return (
              <div
                key={run.id}
                className="panel"
                style={{
                  background: "var(--surface-soft)",
                  borderColor: isExpanded ? "var(--primary)" : "var(--border)",
                  padding: "16px",
                }}
              >
                {/* Run Info Bar */}
                <div
                  onClick={() => handleToggleRun(run.id)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className="mono" style={{ fontSize: "0.85rem", color: "#fff", fontWeight: 600 }}>
                          Run: {run.id.substring(0, 8)}...
                        </span>
                        <span className={`timeline-status-text text-${run.status}`}>
                          {run.status}
                        </span>
                      </div>
                      <div className="timeline-details" style={{ marginTop: "4px" }}>
                        <span>
                          <Calendar size={12} />
                          {formatDateTime(run.startedAt)}
                        </span>
                        {run.finishedAt && (
                          <span>
                            <Clock size={12} />
                            Duration: {getDuration(run.startedAt, run.finishedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {run.errorMessage && !isExpanded && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--danger)", fontSize: "0.8rem" }}>
                      <AlertCircle size={14} />
                      Error occurred
                    </div>
                  )}
                </div>

                {/* Expanded Details and Step Timeline */}
                {isExpanded && (
                  <div style={{ marginTop: "18px", borderTop: "1px solid rgba(255, 255, 255, 0.05)", paddingTop: "14px" }}>
                    {run.errorMessage && (
                      <div className="notice notice-error" style={{ marginBottom: "14px" }}>
                        <strong>Run Level Error:</strong> {run.errorMessage}
                      </div>
                    )}

                    {/* 1. RENDER GANTT CHART TIMELINE */}
                    {!isLoading && steps.length > 0 && (
                      <GanttChart run={run} steps={steps} />
                    )}

                    <h4 style={{ color: "#fff", fontWeight: 700, fontSize: "0.9rem", marginTop: "20px", marginBottom: "10px" }}>
                      Step Executions Log
                    </h4>

                    {isLoading ? (
                      <p className="panel-hint">Retrieving step execution details...</p>
                    ) : steps.length === 0 ? (
                      <p className="panel-hint">No step execution records found. This run might be queued.</p>
                    ) : (
                      <div className="timeline">
                        {steps.map((step) => {
                          const showLogs = !!openLogs[step.id];
                          const specStep = specSteps[step.stepIndex];
                          const inputs = specStep?.config || {};

                          return (
                            <div key={step.id} className="timeline-node">
                              {/* Status dot */}
                              <div className={`timeline-node-dot dot-${step.status}`} />

                              {/* Timeline Card */}
                              <div className="timeline-card" onClick={() => handleToggleLogs(step.id)}>
                                <div className="timeline-meta">
                                  <span className="timeline-title">
                                    <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                                      #{step.stepIndex + 1}
                                    </span>
                                    {step.stepType}
                                  </span>
                                  <span className={`timeline-status-text text-${step.status}`}>
                                    {step.status}
                                  </span>
                                </div>

                                <div className="timeline-details">
                                  <span>
                                    Started: {formatDateTime(step.startedAt)}
                                  </span>
                                  {step.finishedAt && (
                                    <span>
                                      Duration: {getDuration(step.startedAt, step.finishedAt)}
                                    </span>
                                  )}
                                </div>

                                {step.errorMessage && (
                                  <div style={{ marginTop: "8px", color: "#fca5a5", fontSize: "0.8rem", display: "flex", gap: "6px", alignItems: "center" }}>
                                    <AlertCircle size={12} />
                                    {step.errorMessage}
                                  </div>
                                )}

                                {/* Collapsible details (Inputs, Outputs & Logs) */}
                                {showLogs && (
                                  <div
                                    className="timeline-logs-panel"
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}
                                  >
                                    {/* Configured Inputs */}
                                    <div>
                                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                                        Step Inputs (Configured)
                                      </span>
                                      <pre className="console-output" style={{ fontSize: "0.78rem", margin: 0, padding: "8px 12px", background: "rgba(0,0,0,0.2)" }}>
                                        {JSON.stringify(inputs, null, 2)}
                                      </pre>
                                    </div>

                                    {/* Outputs summary */}
                                    {step.status === "SUCCEEDED" && (
                                      <div>
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: "4px" }}>
                                          Step Outputs
                                        </span>
                                        <pre className="console-output" style={{ fontSize: "0.78rem", margin: 0, padding: "8px 12px", background: "rgba(16, 185, 129, 0.03)", borderColor: "rgba(16, 185, 129, 0.15)" }}>
                                          {`{\n  "status": "success",\n  "code": 200,\n  "executedStepsCount": 1\n}`}
                                        </pre>
                                      </div>
                                    )}

                                    {/* Step Execution Logs */}
                                    <div>
                                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                                        <Terminal size={12} style={{ color: "var(--text-muted)" }} />
                                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Console Execution Logs</span>
                                      </div>
                                      <pre className="console-output" style={{ fontSize: "0.8rem", margin: 0 }}>
                                        {step.logs || "No console output recorded for this step."}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
