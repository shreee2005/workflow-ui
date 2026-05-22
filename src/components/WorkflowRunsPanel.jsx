export function WorkflowRunsPanel({ workflow, runs, onClose }) {
  return (
    <section className="card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
        <div>
          <h2 className="section-title" style={{ marginBottom: "4px" }}>Run History</h2>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            {workflow.name}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
      </div>

      {!runs || runs.length === 0 ? (
        <p style={{ marginTop: "12px" }}>No runs found for this workflow.</p>
      ) : (
        <div className="table-wrap" style={{ marginTop: "12px" }}>
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Started At</th>
                <th>Finished At</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td>{run.status}</td>
                  <td className="mono">{run.startedAt ?? "-"}</td>
                  <td className="mono">{run.finishedAt ?? "-"}</td>
                  <td>{run.errorMessage ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
