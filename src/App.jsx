// src/App.jsx
import { useEffect, useState } from "react";
import {
  fetchWorkflows,
  createWorkflow,
  activateWorkflow,
  deactivateWorkflow,
  fetchWorkflowRuns,
} from "./api";
import { CreateWorkflowForm } from "./components/CreateWorkflowForm";
import { WorkflowList } from "./components/WorkflowList";
import { WorkflowRunsPanel } from "./components/WorkflowRunsPanel";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";

function App() {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [runs, setRuns] = useState([]);
  const [runsLoading, setRunsLoading] = useState(false);

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const data = await fetchWorkflows();
      console.log("Workflows from API:", data);
      setWorkflows(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  const handleCreate = async (wf) => {
    await createWorkflow(wf);
    await loadWorkflows();
  };

  const handleActivate = async (id) => {
    await activateWorkflow(id);
    await loadWorkflows();
  };

  const handleDeactivate = async (id) => {
    await deactivateWorkflow(id);
    await loadWorkflows();
  };

  const handleViewRuns = async (workflow) => {
    setSelectedWorkflow(workflow);
    setRuns([]);
    setRunsLoading(true);
    try {
      const data = await fetchWorkflowRuns(workflow.id);
      console.log("Runs for", workflow.id, data);
      setRuns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRunsLoading(false);
    }
  };

  const handleCloseRuns = () => {
    setSelectedWorkflow(null);
    setRuns([]);
  };

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      <h1>Workflow Dashboard</h1>
      <CreateWorkflowForm onCreate={handleCreate} />

      {loading ? (
        <p>Loading workflows...</p>
      ) : (
        <WorkflowList
          workflows={workflows}
          onActivate={handleActivate}
          onDeactivate={handleDeactivate}
          onViewRuns={handleViewRuns}
          apiBaseUrl={API_BASE_URL}
        />
      )}

      {selectedWorkflow && (
        <>
          {runsLoading ? (
            <p>Loading runs for {selectedWorkflow.name}...</p>
          ) : (
            <WorkflowRunsPanel
              workflow={selectedWorkflow}
              runs={runs}
              onClose={handleCloseRuns}
            />
          )}
        </>
      )}
    </div>
  );
}

export default App;
