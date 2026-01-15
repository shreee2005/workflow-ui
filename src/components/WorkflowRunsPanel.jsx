// src/components/WorkflowRunsPanel.jsx
export function WorkflowRunsPanel({ workflow, runs, onClose }) {
  return (
    <div
      style={{
        marginTop: "1rem",
        padding: "1rem",
        border: "1px solid #ccc",
        borderRadius: "4px",
        backgroundColor: "#fafafa",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h3>Runs for: {workflow.name}</h3>
        <button onClick={onClose}>Close</button>
      </div>

      {(!runs || runs.length === 0) ? (
        <p>No runs found for this workflow.</p>
      ) : (
        <table
          border="1"
          cellPadding="6"
          style={{ borderCollapse: "collapse", width: "100%" }}
        >
          <thead>
            <tr>
              <th>Status</th>
              <th>Started at</th>
              <th>Finished at</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id}>
                <td>{run.status}</td>
                <td>{run.startedAt ?? "-"}</td>
                <td>{run.finishedAt ?? "-"}</td>
                <td style={{ maxWidth: "300px" }}>
                  {run.errorMessage ?? "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
