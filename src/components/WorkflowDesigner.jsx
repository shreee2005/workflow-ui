import { useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Settings, HelpCircle, GitCommit, FileCode, Play, AlertCircle } from "lucide-react";

// Icon Helper based on plugin key
function getPluginIcon(iconName, size = 16) {
  const icon = String(iconName).toLowerCase();
  switch (icon) {
    case "terminal":
    case "log":
      return <span style={{ color: "#a78bfa" }}>⌨️</span>;
    case "globe":
    case "http_call":
    case "http":
      return <span style={{ color: "#60a5fa" }}>🌐</span>;
    case "clock":
    case "wait":
    case "timer":
      return <span style={{ color: "#f59e0b" }}>🕒</span>;
    case "mail":
    case "email":
    case "send_email":
      return <span style={{ color: "#ec4899" }}>📧</span>;
    case "slack":
    case "slack_notification":
      return <span style={{ color: "#34d399" }}>💬</span>;
    case "database":
    case "database_query":
    case "sql":
      return <span style={{ color: "#38bdf8" }}>🗄️</span>;
    default:
      return <span style={{ color: "#94a3b8" }}>⚙️</span>;
  }
}

export function WorkflowDesigner({
  plugins,
  steps,
  onChange,
  workflowName,
  onNameChange,
  active,
  onActiveChange,
  onSave,
  busy,
}) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [draggedOverZone, setDraggedOverZone] = useState(null);
  const [activeTab, setActiveTab] = useState("builder"); // "builder" or "json"

  // HTML5 Drag Start for Palette Executors
  const handleDragStartPalette = (e, key) => {
    e.dataTransfer.setData("source", "palette");
    e.dataTransfer.setData("typeKey", key);
  };

  // HTML5 Drag Start for Existing Step Cards (reordering)
  const handleDragStartStep = (e, index) => {
    e.dataTransfer.setData("source", "canvas");
    e.dataTransfer.setData("stepIndex", index);
  };

  // Drag over drop zone
  const handleDragOver = (e, zoneIdx) => {
    e.preventDefault();
    setDraggedOverZone(zoneIdx);
  };

  const handleDragLeave = () => {
    setDraggedOverZone(null);
  };

  // Drop handler on target zone
  const handleDropOnZone = (e, targetIdx) => {
    e.preventDefault();
    setDraggedOverZone(null);
    const source = e.dataTransfer.getData("source");

    if (source === "palette") {
      // Add new step at target index
      const typeKey = e.dataTransfer.getData("typeKey");
      const plugin = plugins.find((p) => p.key === typeKey);
      const newStep = {
        type: typeKey,
        config: {},
      };

      // Set default config values
      if (plugin && plugin.configSchema) {
        try {
          const schema = JSON.parse(plugin.configSchema);
          if (schema.properties) {
            Object.entries(schema.properties).forEach(([k, prop]) => {
              if (prop.default !== undefined) {
                newStep.config[k] = prop.default;
              }
            });
          }
        } catch {}
      }

      const updated = [...steps];
      updated.splice(targetIdx, 0, newStep);
      onChange(updated);
      setSelectedIdx(targetIdx);
    } else if (source === "canvas") {
      // Reorder existing step
      const stepIdx = parseInt(e.dataTransfer.getData("stepIndex"));
      if (isNaN(stepIdx) || stepIdx === targetIdx || stepIdx === targetIdx - 1) return;

      const updated = [...steps];
      const [movedStep] = updated.splice(stepIdx, 1);
      
      // Adjust target index if moving downward
      let insertIdx = targetIdx;
      if (stepIdx < targetIdx) {
        insertIdx = targetIdx - 1;
      }
      
      updated.splice(insertIdx, 0, movedStep);
      onChange(updated);
      setSelectedIdx(insertIdx);
    }
  };

  const handleUpdateStepConfig = (stepIdx, fieldKey, val) => {
    const updated = [...steps];
    updated[stepIdx] = {
      ...updated[stepIdx],
      config: {
        ...updated[stepIdx].config,
        [fieldKey]: val,
      },
    };
    onChange(updated);
  };

  const handleDeleteStep = (index) => {
    const updated = steps.filter((_, i) => i !== index);
    onChange(updated);
    if (selectedIdx === index) {
      setSelectedIdx(null);
    } else if (selectedIdx > index) {
      setSelectedIdx(selectedIdx - 1);
    }
  };

  const selectedStep = selectedIdx !== null ? steps[selectedIdx] : null;
  const selectedPlugin = selectedStep ? plugins.find((p) => p.key === selectedStep.type) : null;
  let configProperties = {};
  let requiredProperties = [];
  if (selectedPlugin && selectedPlugin.configSchema) {
    try {
      const parsed = JSON.parse(selectedPlugin.configSchema);
      configProperties = parsed.properties || {};
      requiredProperties = parsed.required || [];
    } catch {}
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "240px 1fr 340px",
        height: "640px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        boxShadow: "var(--shadow)",
      }}
    >
      {/* 1. LEFT PANE: EXECUTOR PALETTE */}
      <div
        style={{
          borderRight: "1px solid var(--border)",
          background: "rgba(9, 12, 21, 0.4)",
          padding: "16px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Executors Palette
        </h4>
        <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "-6px" }}>
          Drag a card and drop it onto connection zones in the canvas.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "4px" }}>
          {plugins.length === 0 ? (
            <div style={{ padding: "14px", border: "1px dashed var(--border)", borderRadius: "6px", textAlign: "center", fontSize: "0.8rem", color: "var(--text-muted)" }}>
              No executors found. Log in or check backend connection.
            </div>
          ) : (
            plugins.map((plugin) => (
              <div
                key={plugin.key}
                draggable={true}
                onDragStart={(e) => handleDragStartPalette(e, plugin.key)}
                style={{
                  background: "var(--surface-soft)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 12px",
                  cursor: "grab",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(124, 58, 237, 0.4)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <div style={{ fontSize: "1.1rem", flexShrink: 0 }}>{getPluginIcon(plugin.icon, 16)}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={plugin.name}>
                      {plugin.name}
                    </div>
                    <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", marginTop: "1px" }}>
                      {plugin.category}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "none",
                    borderRadius: "50%",
                    width: "22px",
                    height: "22px",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--primary)";
                    e.currentTarget.style.color = "#fff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.color = "var(--text-muted)";
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const newStep = {
                      type: plugin.key,
                      config: {},
                    };
                    if (plugin.configSchema) {
                      try {
                        const schema = JSON.parse(plugin.configSchema);
                        if (schema.properties) {
                          Object.entries(schema.properties).forEach(([k, prop]) => {
                            if (prop.default !== undefined) {
                              newStep.config[k] = prop.default;
                            }
                          });
                        }
                      } catch {}
                    }
                    const updated = [...steps, newStep];
                    onChange(updated);
                    setSelectedIdx(updated.length - 1);
                  }}
                  title="Click to append step"
                >
                  <Plus size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. CENTER PANE: VISUAL CANVAS WORKSPACE */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
          background: "radial-gradient(circle at center, #111526 0%, #080a13 100%)",
        }}
      >
        {/* Canvas Toolbar */}
        <div
          style={{
            padding: "12px 18px",
            borderBottom: "1px solid var(--border)",
            background: "rgba(9, 12, 21, 0.6)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input
              value={workflowName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Unnamed Workflow"
              style={{
                background: "transparent",
                border: "none",
                fontWeight: 700,
                fontSize: "1.05rem",
                color: "#fff",
                padding: "4px 8px",
                width: "220px",
                borderBottom: "1px dashed var(--border)",
                borderRadius: 0,
              }}
              required
            />
            <label className="checkbox-row" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              <input type="checkbox" checked={active} onChange={(e) => onActiveChange(e.target.checked)} />
              Active
            </label>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <div className="tab-row" style={{ background: "rgba(0,0,0,0.2)" }}>
              <button
                className={`btn btn-sm ${activeTab === "builder" ? "btn-primary" : "btn-ghost"}`}
                style={{ padding: "3px 10px", fontSize: "0.75rem", borderRadius: "99px" }}
                onClick={() => setActiveTab("builder")}
              >
                DAG Designer
              </button>
              <button
                className={`btn btn-sm ${activeTab === "json" ? "btn-primary" : "btn-ghost"}`}
                style={{ padding: "3px 10px", fontSize: "0.75rem", borderRadius: "99px" }}
                onClick={() => setActiveTab("json")}
              >
                JSON spec
              </button>
            </div>

            <button
              className="btn btn-primary btn-sm"
              disabled={busy || !workflowName}
              onClick={onSave}
            >
              Save Spec
            </button>
          </div>
        </div>

        {/* Workspace Display Area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "30px 20px 40px" }}>
          {activeTab === "json" ? (
            <pre
              className="console-output"
              style={{
                margin: 0,
                fontSize: "0.8rem",
                maxHeight: "none",
                height: "100%",
                background: "#04060b",
                border: "1px solid var(--border)",
              }}
            >
              {JSON.stringify({ steps }, null, 2)}
            </pre>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                position: "relative",
              }}
            >
              {/* Start Node */}
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  border: "2px solid var(--success)",
                  background: "rgba(16, 185, 129, 0.1)",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  fontSize: "0.72rem",
                  color: "var(--success)",
                  boxShadow: "0 0 12px var(--success-glow)",
                  letterSpacing: "0.5px",
                }}
              >
                START
              </div>

              {/* Initial Drop Zone 0 */}
              <div
                onDragOver={(e) => handleDragOver(e, 0)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDropOnZone(e, 0)}
                style={{
                  height: "36px",
                  width: "160px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                {/* SVG Arrow line */}
                <svg style={{ position: "absolute", width: "100%", height: "100%", top: 0, left: 0, pointerEvents: "none" }}>
                  <line x1="50%" y1="0" x2="50%" y2="100%" stroke="var(--border)" strokeWidth="2" strokeDasharray="3,3" />
                </svg>
                {draggedOverZone === 0 && (
                  <div
                    style={{
                      width: "100%",
                      height: "24px",
                      border: "2px dashed var(--primary)",
                      background: "var(--primary-glow)",
                      borderRadius: "6px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "#c084fc",
                      display: "grid",
                      placeItems: "center",
                      zIndex: 5,
                    }}
                  >
                    DROP HERE TO INSERT
                  </div>
                )}
              </div>

              {/* Node Sequence List */}
              {steps.map((step, index) => {
                const plugin = plugins.find((p) => p.key === step.type);
                const isSelected = selectedIdx === index;

                return (
                  <div key={index} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    {/* Step Node Card */}
                    <div
                      draggable={true}
                      onDragStart={(e) => handleDragStartStep(e, index)}
                      onClick={() => setSelectedIdx(index)}
                      style={{
                        width: "280px",
                        background: isSelected ? "var(--surface-hover)" : "var(--surface-soft)",
                        border: isSelected ? "2px solid var(--primary)" : "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        padding: "12px 16px",
                        cursor: "pointer",
                        boxShadow: isSelected ? "0 4px 20px var(--primary-glow)" : "0 4px 10px rgba(0,0,0,0.15)",
                        transform: isSelected ? "scale(1.02)" : "scale(1)",
                        transition: "all 0.2s ease",
                        position: "relative",
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) e.currentTarget.style.borderColor = "var(--border)";
                      }}
                    >
                      {/* Step Number Tag */}
                      <span
                        style={{
                          position: "absolute",
                          left: "-12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: isSelected ? "var(--primary)" : "var(--border)",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          display: "grid",
                          placeItems: "center",
                          border: "2px solid #080a13",
                        }}
                      >
                        {index + 1}
                      </span>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#fff", display: "flex", alignItems: "center", gap: "8px" }}>
                          {plugin ? getPluginIcon(plugin.icon, 14) : "⚙️"}
                          {plugin ? plugin.name : step.type}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStep(index);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            padding: "2px",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--danger)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Display summary of step parameters */}
                      <div
                        style={{
                          marginTop: "8px",
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-mono)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          background: "rgba(0,0,0,0.15)",
                          padding: "4px 8px",
                          borderRadius: "4px",
                        }}
                      >
                        {Object.entries(step.config || {}).length === 0
                          ? "{}"
                          : Object.entries(step.config)
                              .map(([k, v]) => `${k}:${typeof v === "object" ? "JSON" : v}`)
                              .join(", ")}
                      </div>
                    </div>

                    {/* Next Drop Zone (index + 1) */}
                    <div
                      onDragOver={(e) => handleDragOver(e, index + 1)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDropOnZone(e, index + 1)}
                      style={{
                        height: "36px",
                        width: "160px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                      }}
                    >
                      {/* SVG Connective arrow */}
                      <svg style={{ position: "absolute", width: "100%", height: "100%", top: 0, left: 0, pointerEvents: "none" }}>
                        <defs>
                          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border)" />
                          </marker>
                        </defs>
                        <line x1="50%" y1="0" x2="50%" y2="100%" stroke="var(--border)" strokeWidth="2" markerEnd="url(#arrow)" />
                      </svg>
                      {draggedOverZone === index + 1 && (
                        <div
                          style={{
                            width: "100%",
                            height: "24px",
                            border: "2px dashed var(--primary)",
                            background: "var(--primary-glow)",
                            borderRadius: "6px",
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            color: "#c084fc",
                            display: "grid",
                            placeItems: "center",
                            zIndex: 5,
                          }}
                        >
                          DROP HERE TO INSERT
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* End Node */}
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "50%",
                  border: "2px solid #ef4444",
                  background: "rgba(239, 68, 68, 0.1)",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 800,
                  fontSize: "0.72rem",
                  color: "#ef4444",
                  boxShadow: "0 0 12px var(--danger-glow)",
                  letterSpacing: "0.5px",
                }}
              >
                END
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. RIGHT PANE: SELECTED STEP CONFIGURATOR */}
      <div
        style={{
          borderLeft: "1px solid var(--border)",
          background: "var(--surface)",
          padding: "20px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Step Configurator
        </h4>

        {selectedStep ? (
          <div className="stack" style={{ gap: "16px" }}>
            {/* Header info */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "var(--surface-soft)",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
              }}
            >
              {selectedPlugin ? getPluginIcon(selectedPlugin.icon, 16) : "⚙️"}
              <div>
                <div style={{ fontWeight: 700, color: "#fff", fontSize: "0.9rem" }}>
                  {selectedPlugin ? selectedPlugin.name : selectedStep.type}
                </div>
                <div className="mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Type: {selectedStep.type}
                </div>
              </div>
            </div>

            {/* Render form properties from schema dynamically */}
            <div className="stack" style={{ gap: "12px" }}>
              {Object.entries(configProperties).length === 0 ? (
                <p className="panel-hint">No configuration properties required for this step.</p>
              ) : (
                Object.entries(configProperties).map(([propKey, propVal]) => {
                  const required = requiredProperties.includes(propKey);
                  const val = selectedStep.config[propKey] !== undefined ? selectedStep.config[propKey] : "";

                  return (
                    <div key={propKey} className="field">
                      <label className="label" style={{ fontSize: "0.8rem" }}>
                        {propVal.title || propKey}
                        {required && <span style={{ color: "var(--danger)", marginLeft: "2px" }}>*</span>}
                      </label>

                      {propVal.enum ? (
                        <select
                          value={val}
                          onChange={(e) => handleUpdateStepConfig(selectedIdx, propKey, e.target.value)}
                        >
                          {propVal.enum.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : propVal.type === "integer" ? (
                        <input
                          type="number"
                          min={propVal.minimum}
                          placeholder={propVal.description || ""}
                          value={val}
                          onChange={(e) => handleUpdateStepConfig(selectedIdx, propKey, parseInt(e.target.value) || 0)}
                        />
                      ) : propKey === "message" || propKey === "query" || propKey === "body" ? (
                        <textarea
                          rows={4}
                          placeholder={propVal.description || ""}
                          value={val}
                          onChange={(e) => handleUpdateStepConfig(selectedIdx, propKey, e.target.value)}
                          style={{ minHeight: "80px" }}
                        />
                      ) : (
                        <input
                          type="text"
                          placeholder={propVal.description || ""}
                          value={val}
                          onChange={(e) => handleUpdateStepConfig(selectedIdx, propKey, e.target.value)}
                        />
                      )}
                      {propVal.description && (
                        <p className="field-hint" style={{ fontSize: "0.72rem" }}>{propVal.description}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <button
              className="btn btn-danger btn-sm"
              style={{ display: "flex", gap: "6px", width: "100%", marginTop: "10px" }}
              onClick={() => handleDeleteStep(selectedIdx)}
            >
              <Trash2 size={13} />
              Delete Step Node
            </button>
          </div>
        ) : (
          <div
            style={{
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "24px",
              textAlign: "center",
              color: "var(--text-muted)",
              marginTop: "20px",
            }}
          >
            <HelpCircle size={28} style={{ margin: "0 auto 8px", color: "var(--text-muted)" }} />
            <p style={{ fontSize: "0.8rem" }}>No step node selected.</p>
            <p style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Click a step card in the canvas diagram to inspect and configure its parameters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
