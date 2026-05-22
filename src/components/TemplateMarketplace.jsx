import { useMemo, useState } from "react";

const DEFAULT_TEMPLATE_SPEC =
  '{"steps":[{"type":"LOG","config":{"message":"Template step"}}]}';

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
      setCreateError("Template creation failed. Check fields and JSON spec.");
    }
  };

  return (
    <section className="card">
      <h2 className="section-title">Templates Marketplace</h2>
      <p className="section-subtitle">
        Start fast with reusable templates, then customize workflow instances as needed.
      </p>

      {loading ? <p>Loading templates...</p> : null}

      {!loading && templateRows.length === 0 ? <p>No templates available.</p> : null}

      {!loading && templateRows.length > 0 ? (
        <div className="table-wrap" style={{ marginBottom: "14px" }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Description</th>
                <th>Spec</th>
                <th>Instantiate</th>
              </tr>
            </thead>
            <tbody>
              {templateRows.map((template) => (
                <tr key={template.id}>
                  <td>{template.name}</td>
                  <td>{template.category}</td>
                  <td>{template.description}</td>
                  <td>
                    <details>
                      <summary>Preview JSON</summary>
                      <pre className="mono template-preview">{template.spec}</pre>
                    </details>
                  </td>
                  <td>
                    <div className="stack">
                      <input
                        placeholder="Workflow name"
                        value={workflowNames[template.id] || ""}
                        onChange={(e) =>
                          setWorkflowNames((prev) => ({
                            ...prev,
                            [template.id]: e.target.value,
                          }))
                        }
                      />
                      <label className="checkbox-row">
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
                        Activate on create
                      </label>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleInstantiate(template)}
                        disabled={templateSubmittingId === template.id}
                      >
                        {templateSubmittingId === template.id ? "Creating..." : "Create Workflow"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <h3 className="section-title" style={{ fontSize: "1rem" }}>Add Custom Template</h3>
      {createError ? <div className="notice notice-error">{createError}</div> : null}

      <form onSubmit={handleCreateTemplate} className="stack">
        <div className="grid-2">
          <div className="field">
            <label className="label" htmlFor="template-name">Template Name</label>
            <input
              id="template-name"
              placeholder="Example: SLA Escalation"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="template-category">Category</label>
            <input
              id="template-category"
              placeholder="Starter, Integration, Ops"
              value={newTemplate.category}
              onChange={(e) => setNewTemplate((prev) => ({ ...prev, category: e.target.value }))}
              required
            />
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="template-description">Description</label>
          <input
            id="template-description"
            placeholder="Short description"
            value={newTemplate.description}
            onChange={(e) => setNewTemplate((prev) => ({ ...prev, description: e.target.value }))}
            required
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="template-spec">Template Spec (JSON)</label>
          <textarea
            id="template-spec"
            rows={6}
            value={newTemplate.spec}
            onChange={(e) => setNewTemplate((prev) => ({ ...prev, spec: e.target.value }))}
            required
          />
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={newTemplate.active}
            onChange={(e) => setNewTemplate((prev) => ({ ...prev, active: e.target.checked }))}
          />
          Active template
        </label>

        <div className="btn-row">
          <button type="submit" className="btn btn-primary">Save Template</button>
        </div>
      </form>
    </section>
  );
}
