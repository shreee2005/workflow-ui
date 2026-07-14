import { Play, Square, List, Link2, Copy, Check } from "lucide-react";
import { useState } from "react";

export function WorkflowList({
  workflows,
  onActivate,
  onDeactivate,
  onViewRuns,
  apiBaseUrl,
}) {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyWebhook = (wfId) => {
    const url = `${apiBaseUrl}/hooks/${wfId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(wfId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!workflows || workflows.length === 0) {
    return (
      <section className="card">
        <h2 className="panel-title" style={{ fontSize: "1.2rem", fontWeight: 700 }}>
          Existing Workflows
        </h2>
        <p className="panel-hint" style={{ marginTop: "8px" }}>
          No workflows found yet. Create or instantiate one to get started.
        </p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="panel-head">
        <div>
          <h2 className="panel-title">Active Workflows</h2>
          <p className="panel-hint">Manage activation status, trigger webhook events, and view run executions.</p>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Workflow Name</th>
              <th>Status</th>
              <th>Webhook Trigger Endpoint</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {workflows.map((wf) => {
              const webhookUrl = `${apiBaseUrl}/hooks/${wf.id}`;
              return (
                <tr key={wf.id}>
                  <td style={{ fontWeight: 600, color: "#fff" }}>{wf.name}</td>
                  <td>
                    <span className={`badge ${wf.active ? "badge-active" : "badge-inactive"}`}>
                      {wf.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="mono" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ fontSize: "0.8rem", background: "rgba(255,255,255,0.03)", padding: "4px 8px", borderRadius: "4px" }}>
                      {webhookUrl}
                    </span>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleCopyWebhook(wf.id)}
                      style={{ padding: "4px", borderRadius: "4px" }}
                      title="Copy webhook URL"
                    >
                      {copiedId === wf.id ? (
                        <Check size={13} style={{ color: "var(--success)" }} />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </td>
                  <td>
                    <div className="btn-row">
                      {wf.active ? (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => onDeactivate(wf.id)}
                        >
                          <Square size={13} fill="#fff" />
                          Deactivate
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => onActivate(wf.id)}
                          style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 4px 14px var(--success-glow)" }}
                        >
                          <Play size={13} fill="#fff" />
                          Activate
                        </button>
                      )}
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => onViewRuns(wf)}
                      >
                        <List size={13} />
                        Runs History
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
