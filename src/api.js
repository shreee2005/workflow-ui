// src/api.js
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8081";

export async function fetchWorkflows() {
  const res = await fetch(`${API_BASE_URL}/api/workflows`);
  if (!res.ok) throw new Error("Failed to load workflows");
  return res.json();
}

export async function createWorkflow(workflow) {
  const res = await fetch(`${API_BASE_URL}/api/workflows`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(workflow),
  });
  if (!res.ok) throw new Error("Failed to create workflow");
  return res.json();
}

export async function activateWorkflow(id) {
  const res = await fetch(`${API_BASE_URL}/api/workflows/${id}/activate`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to activate workflow");
  return res.json();
}

export async function deactivateWorkflow(id) {
  const res = await fetch(`${API_BASE_URL}/api/workflows/${id}/deactivate`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to deactivate workflow");
  return res.json();
}

export async function fetchWorkflowRuns(workflowId) {
  const res = await fetch(`${API_BASE_URL}/api/workflows/${workflowId}/runs`);
  if (!res.ok) throw new Error("Failed to load runs");
  return res.json();
}
