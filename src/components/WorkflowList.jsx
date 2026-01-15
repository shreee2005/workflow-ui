// src/components/WorkflowList.jsx
export function WorkflowList({
  workflows,
  onActivate,
  onDeactivate,
  onViewRuns,
  apiBaseUrl,
}) {
  if (!workflows || workflows.length === 0) {
    return <p>No workflows found.</p>;
  }

  return (
    <div>
      <h2>Existing Workflows</h2>
      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Active</th>
            <th>Webhook URL</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {workflows.map((wf) => (
            <tr key={wf.id}>
              <td>{wf.name}</td>
              <td>{wf.active ? "Yes" : "No"}</td>
              <td>
                <code>{`${apiBaseUrl}/hooks/${wf.id}`}</code>
              </td>
              <td>
                {wf.active ? (
                  <button onClick={() => onDeactivate(wf.id)}>
                    Deactivate
                  </button>
                ) : (
                  <button onClick={() => onActivate(wf.id)}>Activate</button>
                )}{" "}
                <button onClick={() => onViewRuns(wf)}>View runs</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
