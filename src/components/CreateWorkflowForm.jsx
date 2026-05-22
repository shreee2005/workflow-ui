import { useState } from "react";

const DEFAULT_SPEC = '{"steps":[{"type":"LOG","message":"hello"}]}'

export function CreateWorkflowForm({ onCreate }) {
  const [name, setName] = useState("");
  const [spec, setSpec] = useState(DEFAULT_SPEC);
  const [active, setActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      JSON.parse(spec);
      await onCreate({ name, spec, active });
      setName("");
      setSpec(DEFAULT_SPEC);
      setActive(false);
    } catch (err) {
      if (err instanceof SyntaxError) {
        setError("Spec is not valid JSON. Please fix and try again.");
      } else {
        setError("Workflow create failed. Ensure API is running at http://localhost:8080.");
      }
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card">
      <h2 className="section-title">Create Workflow</h2>
      <p className="section-subtitle">
        Build a workflow manually by providing a valid JSON spec.
      </p>

      {error ? <div className="notice notice-error">{error}</div> : null}

      <form onSubmit={handleSubmit} className="stack">
        <div className="field">
          <label className="label" htmlFor="workflow-name">Workflow Name</label>
          <input
            id="workflow-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Example: Payment Retry Orchestrator"
            required
          />
        </div>

        <div className="field">
          <label className="label" htmlFor="workflow-spec">Workflow Spec (JSON)</label>
          <textarea
            id="workflow-spec"
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            rows={8}
            required
          />
        </div>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Activate immediately
        </label>

        <div className="btn-row">
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? "Creating..." : "Create Workflow"}
          </button>
        </div>
      </form>
    </section>
  );
}
