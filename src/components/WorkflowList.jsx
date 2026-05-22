export function WorkflowList({
  workflows,
  onActivate,
  onDeactivate,
  onViewRuns,
  apiBaseUrl,
}) {
  if (!workflows || workflows.length === 0) {
    return (
      <section className="card">
        <h2 className="section-title">Existing Workflows</h2>
        <p className="section-subtitle">No workflows found yet. Create or instantiate one to get started.</p>
      </section>
    );
  }

  return (
    <section className="card">
      <h2 className="section-title">Existing Workflows</h2>
      <p className="section-subtitle">Manage activation, copy webhook URLs, and inspect execution history.</p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Webhook URL</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {workflows.map((wf) => (
              <tr key={wf.id}>
                <td>{wf.name}</td>
                <td>
                  <span className={`badge ${wf.active ? "badge-active" : "badge-inactive"}`}>
                    {wf.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="mono">{`${apiBaseUrl}/hooks/${wf.id}`}</td>
                <td>
                  <div className="btn-row">
                    {wf.active ? (
                      <button className="btn btn-danger" onClick={() => onDeactivate(wf.id)}>
                        Deactivate
                      </button>
                    ) : (
                      <button className="btn btn-primary" onClick={() => onActivate(wf.id)}>
                        Activate
                      </button>
                    )}
                    <button className="btn btn-ghost" onClick={() => onViewRuns(wf)}>
                      View Runs
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
