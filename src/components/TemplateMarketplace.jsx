import { useMemo, useState } from "react";
import { Copy, Plus, Compass, ChevronDown, ChevronUp, FileCode } from "lucide-react";

const DEFAULT_TEMPLATE_SPEC =
  '{"steps":[{"type":"LOG","message":"Template step"}]}';

export function TemplateMarketplace({
  templates,
  loading,
  onInstantiate,
  onCreateTemplate,
}) {
  const [workflowNames, setWorkflowNames] = useState({});
  const [activateOnCreate, setActivateOnCreate] = useState({});
  const [templateSubmittingId, setTemplateSubmittingId] = useState(null);
  const [createError, setCreateError] = useState("");
  const [expandedSpecId, setExpandedSpecId] = useState(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "Starter",
    description: "",
    spec: DEFAULT_TEMPLATE_SPEC,
    active: true,
  });

  const templateRows = useMemo(() => templates ?? [], [templates]);

  const handleInstantiate = async (template) => {
    setTemplateSubmittingId(template.id);
    try {
      await onInstantiate(template.id, {
        workflowName: workflowNames[template.id] || `${template.name} Workflow`,
        active: !!activateOnCreate[template.id],
        changeNote: `Created from template: ${template.name}`,
      });
    } finally {
      setTemplateSubmittingId(null);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    setCreateError("");

    try {
      JSON.parse(newTemplate.spec);
      await onCreateTemplate(newTemplate);
      setNewTemplate({
        name: "",
        category: "Starter",
        description: "",
        spec: DEFAULT_TEMPLATE_SPEC,
        active: true,
      });
    } catch (err) {
      console.error(err);
      setCreateError("Template creation failed. Check fields and JSON spec validation.");
    }
  };

  const toggleExpandSpec = (id) => {
    setExpandedSpecId((prev) => (prev === id ? null : id));
  };

  const getCategoryClass = (category) => {
    const cat = String(category).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cat.includes("start")) return "badge-category-core";
    if (cat.includes("integ")) return "badge-category-integration";
    if (cat.includes("control") || cat.includes("flow")) return "badge-category-controlflow";
    if (cat.includes("comm")) return "badge-category-communication";
    return "badge-category-core";
  };

  return (
    <div className="grid-2">
      <section className="card">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">
              <Compass size={18} />
              Templates Marketplace
            </h2>
            <p className="panel-hint">
              Instantiate predefined workflows instantly to skip manual configuration.
            </p>
          </div>
        </div>

        {loading ? <p className="panel-hint">Loading templates catalog...</p> : null}

        {!loading && templateRows.length === 0 ? (
          <p className="panel-hint">No templates available. Add one below!</p>
        ) : null}

        {!loading && templateRows.length > 0 ? (
          <div className="stack" style={{ gap: "16px" }}>
            {templateRows.map((template) => (
              <div
                key={template.id}
                className="builder-step-card"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h4 style={{ color: "#fff", fontWeight: 700, fontSize: "1.05rem" }}>{template.name}</h4>
                    <span className={`badge ${getCategoryClass(template.category)}`} style={{ marginTop: "6px" }}>
                      {template.category}
                    </span>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: "4px 8px", fontSize: "0.75rem" }}
                    onClick={() => toggleExpandSpec(template.id)}
                  >
                    <FileCode size={12} />
                    {expandedSpecId === template.id ? "Hide Spec" : "Show Spec"}
                  </button>
                </div>

                <p style={{ fontStyle: "normal", color: "var(--text-muted)", fontSize: "0.88rem", marginTop: "4px" }}>
                  {template.description}
                </p>

                {expandedSpecId === template.id && (
                  <pre className="console-output" style={{ fontSize: "0.78rem", maxHeight: "160px" }}>
                    {template.spec}
                  </pre>
                )}

                <div
                  className="stack"
                  style={{
                    background: "rgba(255,255,255,0.01)",
                    border: "1px dashed var(--border)",
                    borderRadius: "8px",
                    padding: "12px",
                    gap: "10px",
                    marginTop: "6px",
                  }}
                >
                  <div className="field">
                    <label className="label" style={{ fontSize: "0.78rem" }}>Instantiated Name</label>
                    <input
                      placeholder={`${template.name} Workflow`}
                      value={workflowNames[template.id] || ""}
                      onChange={(e) =>
                        setWorkflowNames((prev) => ({
                          ...prev,
                          [template.id]: e.target.value,
                        }))
                      }
                      style={{ padding: "6px 10px", fontSize: "0.85rem" }}
                    />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <label className="checkbox-row" style={{ fontSize: "0.8rem" }}>
                      <input
                        type="checkbox"
                        checked={!!activateOnCreate[template.id]}
                        onChange={(e) =>
                          setActivateOnCreate((prev) => ({
                            ...prev,
                            [template.id]: e.target.checked,
                          }))
                        }
                      />
                      Activate immediately
                    </label>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleInstantiate(template)}
                      disabled={templateSubmittingId === template.id}
                    >
                      Instantiate
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="card">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">
              <Plus size={18} />
              Register Template
            </h2>
            <p className="panel-hint">Create a reusable template definition for other users.</p>
          </div>
        </div>

        {createError ? <div className="notice notice-error">{createError}</div> : null}

        <form onSubmit={handleCreateTemplate} className="stack">
          <div className="field">
            <label className="label" htmlFor="template-name">Template Name</label>
            <input
              id="template-name"
              placeholder="e.g. Stripe Payment Fallback"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="grid-2" style={{ gap: "16px" }}>
            <div className="field">
              <label className="label" htmlFor="template-category">Category</label>
              <select
                id="template-category"
                value={newTemplate.category}
                onChange={(e) => setNewTemplate((prev) => ({ ...prev, category: e.target.value }))}
              >
                <option value="Starter">Starter</option>
                <option value="Integration">Integration</option>
                <option value="Control Flow">Control Flow</option>
                <option value="Communication">Communication</option>
              </select>
            </div>

            <div className="field">
              <label className="label" htmlFor="template-active" style={{ visibility: "hidden" }}>Status</label>
              <label className="checkbox-row" style={{ marginTop: "12px" }}>
                <input
                  id="template-active"
                  type="checkbox"
                  checked={newTemplate.active}
                  onChange={(e) => setNewTemplate((prev) => ({ ...prev, active: e.target.checked }))}
                />
                Active template
              </label>
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="template-description">Description</label>
            <input
              id="template-description"
              placeholder="A brief summary of what the template accomplishes."
              value={newTemplate.description}
              onChange={(e) => setNewTemplate((prev) => ({ ...prev, description: e.target.value }))}
              required
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="template-spec">Template Spec (JSON)</label>
            <textarea
              id="template-spec"
              rows={5}
              value={newTemplate.spec}
              onChange={(e) => setNewTemplate((prev) => ({ ...prev, spec: e.target.value }))}
              required
            />
          </div>

          <div className="btn-row" style={{ marginTop: "6px" }}>
            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
              Save Template to Library
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
