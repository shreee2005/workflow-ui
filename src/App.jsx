import { useEffect, useMemo, useState } from "react";
import {
  actuatorApi,
  apiBaseUrl,
  authApi,
  debugApi,
  getAuthScope,
  getAuthToken,
  hookApi,
  keyApi,
  runApi,
  setAuthToken,
  teamApi,
  templateApi,
  workflowApi,
} from "./api";

const NAV_ITEMS = ["Dashboard", "Workflows", "Templates", "Teams", "Integrations", "System"];

const WF_DEFAULT = { id: "", name: "", active: false, spec: '{"steps":[{"type":"LOG","message":"hello"}]}', runId: "" };
const TPL_DEFAULT = {
  id: "",
  includeInactive: false,
  name: "",
  category: "Starter",
  description: "",
  active: true,
  spec: '{"steps":[{"type":"LOG","config":{"message":"Template step"}}]}',
  instantiatePayload: '{"workflowName":"New workflow","active":true}',
};
const TEAM_DEFAULT = { teamName: "", teamId: "", inviteEmail: "", inviteId: "", keyName: "", keyId: "" };
const HOOK_DEFAULT = { workflowId: "", idempotencyKey: "", payload: '{"event":"sample"}', correlationId: "", callbackPayload: '{"status":"done"}' };

const STORAGE_PREFIX = "workflow_ui";

function pretty(value) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function parseJsonOrEmpty(text) {
  if (!text?.trim()) return {};
  return JSON.parse(text);
}

function readPersisted(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function storageKey(scope, key) {
  return `${STORAGE_PREFIX}_${scope}_${key}`;
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <p>{label}</p>
      <h3>{value}</h3>
    </div>
  );
}

function Panel({ title, hint, children }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h3 className="panel-title">{title}</h3>
        {hint ? <p className="panel-hint">{hint}</p> : null}
      </div>
      <div className="stack">{children}</div>
    </section>
  );
}

function Field({ label, children, hint }) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      {children}
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    try {
      await authApi.login({ email: form.email, password: form.password });
      onAuthed(form.email);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    setLoading(true);
    setError("");
    try {
      await authApi.signup({ name: form.name, email: form.email, password: form.password });
      await authApi.login({ email: form.email, password: form.password });
      onAuthed(form.email);
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1 className="app-title">Workflow Engine</h1>
        <p className="app-subtitle">Backend: {apiBaseUrl}</p>

        <div className="tab-row">
          <button className={`btn ${mode === "login" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("login")}>Login</button>
          <button className={`btn ${mode === "register" ? "btn-primary" : "btn-ghost"}`} onClick={() => setMode("register")}>Register</button>
        </div>

        {mode === "register" ? (
          <Field label="Name">
            <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </Field>
        ) : null}

        <Field label="Email">
          <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        </Field>

        <Field label="Password">
          <input type="password" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
        </Field>

        {error ? <div className="error-box">{error}</div> : null}

        <button className="btn btn-primary" disabled={loading} onClick={mode === "login" ? handleLogin : handleSignup}>
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Create Account"}
        </button>
        <a className="btn btn-ghost" href={`${apiBaseUrl}/oauth2/authorization/google`} target="_blank" rel="noreferrer">Continue with Google</a>
      </div>
    </div>
  );
}

function App() {
  const [page, setPage] = useState("Dashboard");
  const [isAuthed, setIsAuthed] = useState(Boolean(getAuthToken()));
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState("Ready");
  const [authScope, setAuthScope] = useState(() => getAuthScope());

  const [wf, setWf] = useState(WF_DEFAULT);
  const [tpl, setTpl] = useState(TPL_DEFAULT);
  const [team, setTeam] = useState(TEAM_DEFAULT);
  const [hook, setHook] = useState(HOOK_DEFAULT);

  const [workflowCache, setWorkflowCache] = useState([]);
  const [runCache, setRunCache] = useState([]);

  const handleSessionExpired = () => {
    setAuthToken("");
    setAuthScope("guest");
    setIsAuthed(false);
    setWorkflowCache([]);
    setRunCache([]);
  };

  const runAction = async (fn, cacheSetter, onSuccess) => {
    setBusy(true);
    try {
      const data = await fn();
      if (cacheSetter) cacheSetter(data);
      if (onSuccess) onSuccess(data);
      setOutput(pretty(data));
      return data;
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        handleSessionExpired();
      }
      setOutput(`Error: ${err.message}\n\n${pretty(err.data || {})}`);
      throw err;
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!isAuthed) return;
    const scope = getAuthScope();
    setAuthScope(scope);
    setPage(localStorage.getItem(storageKey(scope, "page")) || "Dashboard");
    setWf(readPersisted(storageKey(scope, "wf"), WF_DEFAULT));
    setTpl(readPersisted(storageKey(scope, "tpl"), TPL_DEFAULT));
    setTeam(readPersisted(storageKey(scope, "team"), TEAM_DEFAULT));
    setHook(readPersisted(storageKey(scope, "hook"), HOOK_DEFAULT));
  }, [isAuthed]);

  useEffect(() => {
    if (!isAuthed) return;
    localStorage.setItem(storageKey(authScope, "page"), page);
  }, [authScope, isAuthed, page]);

  useEffect(() => {
    if (!isAuthed) return;
    localStorage.setItem(storageKey(authScope, "wf"), JSON.stringify(wf));
  }, [authScope, isAuthed, wf]);

  useEffect(() => {
    if (!isAuthed) return;
    localStorage.setItem(storageKey(authScope, "tpl"), JSON.stringify(tpl));
  }, [authScope, isAuthed, tpl]);

  useEffect(() => {
    if (!isAuthed) return;
    localStorage.setItem(storageKey(authScope, "team"), JSON.stringify(team));
  }, [authScope, isAuthed, team]);

  useEffect(() => {
    if (!isAuthed) return;
    localStorage.setItem(storageKey(authScope, "hook"), JSON.stringify(hook));
  }, [authScope, isAuthed, hook]);

  useEffect(() => {
    if (!isAuthed) return;
    runAction(() => workflowApi.list(), setWorkflowCache).catch(() => {});
  }, [isAuthed]);

  const dashboardStats = useMemo(() => {
    const total = workflowCache.length;
    const active = workflowCache.filter((w) => w.active).length;
    const inactive = total - active;
    const runs = runCache.length;
    return { total, active, inactive, runs };
  }, [workflowCache, runCache]);

  if (!isAuthed) return <AuthScreen onAuthed={(email) => { setAuthScope(getAuthScope() || (email || "authed")); setIsAuthed(true); }} />;

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>Workflow UI</h2>
        <p>Connected</p>
        <nav>
          {NAV_ITEMS.map((item) => (
            <button key={item} className={`nav-item ${page === item ? "nav-item-active" : ""}`} onClick={() => setPage(item)}>{item}</button>
          ))}
        </nav>
        <button className="btn btn-ghost" onClick={handleSessionExpired}>Logout</button>
      </aside>

      <main className="main">
        <header className="main-header">
          <div>
            <h1 className="app-title">{page}</h1>
            <p className="app-subtitle">Backend: {apiBaseUrl}</p>
          </div>
        </header>

        {page === "Dashboard" && (
          <section className="stack">
            <div className="metrics-grid">
              <Metric label="Total Workflows" value={dashboardStats.total} />
              <Metric label="Active" value={dashboardStats.active} />
              <Metric label="Inactive" value={dashboardStats.inactive} />
              <Metric label="Runs Loaded" value={dashboardStats.runs} />
            </div>
            <Panel title="Quick Actions" hint="Use this to reload base data quickly.">
              <div className="btn-row">
                <button className="btn btn-primary" disabled={busy} onClick={() => runAction(() => workflowApi.list(), setWorkflowCache)}>Refresh Workflows</button>
                <button className="btn btn-ghost" disabled={busy || !wf.id} onClick={() => runAction(() => workflowApi.runs(wf.id), setRunCache)}>Load Runs</button>
                <input placeholder="Workflow ID for runs" value={wf.id} onChange={(e) => setWf((p) => ({ ...p, id: e.target.value }))} />
              </div>
            </Panel>
          </section>
        )}

        {page === "Workflows" && (
          <section className="grid-2">
            <Panel title="Workflow CRUD" hint="ID is auto-generated on Create.">
              <Field label="Workflow ID (for Get/Update)">
                <input placeholder="Leave blank when creating" value={wf.id} onChange={(e) => setWf((p) => ({ ...p, id: e.target.value }))} />
              </Field>
              <Field label="Name"><input value={wf.name} onChange={(e) => setWf((p) => ({ ...p, name: e.target.value }))} /></Field>
              <Field label="Spec JSON"><textarea rows={6} value={wf.spec} onChange={(e) => setWf((p) => ({ ...p, spec: e.target.value }))} /></Field>
              <label className="checkbox-row"><input type="checkbox" checked={wf.active} onChange={(e) => setWf((p) => ({ ...p, active: e.target.checked }))} />Active</label>
              <div className="btn-row">
                <button className="btn btn-primary" disabled={busy} onClick={() => runAction(() => workflowApi.create({ name: wf.name, spec: wf.spec, active: wf.active }), null, (data) => { if (data?.id) setWf((p) => ({ ...p, id: String(data.id) })); })}>Create</button>
                <button className="btn btn-ghost" disabled={busy} onClick={() => runAction(() => workflowApi.list(), setWorkflowCache)}>List</button>
                <button className="btn btn-ghost" disabled={!wf.id || busy} onClick={() => runAction(() => workflowApi.get(wf.id))}>Get</button>
                <button className="btn btn-ghost" disabled={!wf.id || busy} onClick={() => runAction(() => workflowApi.update(wf.id, { name: wf.name || undefined, spec: wf.spec, active: wf.active }))}>Update</button>
              </div>
            </Panel>

            <Panel title="Activation and Runs" hint="These actions require an existing workflow ID.">
              <Field label="Workflow ID"><input value={wf.id} onChange={(e) => setWf((p) => ({ ...p, id: e.target.value }))} /></Field>
              <Field label="Run ID (for Get Run)"><input placeholder="Paste a run ID from List Runs" value={wf.runId} onChange={(e) => setWf((p) => ({ ...p, runId: e.target.value }))} /></Field>
              <div className="btn-row">
                <button className="btn btn-primary" disabled={!wf.id || busy} onClick={() => runAction(() => workflowApi.activate(wf.id))}>Activate</button>
                <button className="btn btn-danger" disabled={!wf.id || busy} onClick={() => runAction(() => workflowApi.deactivate(wf.id))}>Deactivate</button>
                <button className="btn btn-ghost" disabled={!wf.id || busy} onClick={() => runAction(() => workflowApi.runs(wf.id), setRunCache)}>List Runs</button>
                <button className="btn btn-ghost" disabled={!wf.runId || busy} onClick={() => runAction(() => runApi.get(wf.runId))}>Get Run</button>
              </div>
            </Panel>
          </section>
        )}

        {page === "Templates" && (
          <section className="grid-2">
            <Panel title="Template Catalog" hint="Template ID is auto-generated on Create.">
              <Field label="Template ID (for Get/Update/Delete/Instantiate)"><input placeholder="Leave blank when creating" value={tpl.id} onChange={(e) => setTpl((p) => ({ ...p, id: e.target.value }))} /></Field>
              <Field label="Name"><input value={tpl.name} onChange={(e) => setTpl((p) => ({ ...p, name: e.target.value }))} /></Field>
              <Field label="Category"><input value={tpl.category} onChange={(e) => setTpl((p) => ({ ...p, category: e.target.value }))} /></Field>
              <Field label="Description"><input value={tpl.description} onChange={(e) => setTpl((p) => ({ ...p, description: e.target.value }))} /></Field>
              <Field label="Spec JSON"><textarea rows={5} value={tpl.spec} onChange={(e) => setTpl((p) => ({ ...p, spec: e.target.value }))} /></Field>
              <label className="checkbox-row"><input type="checkbox" checked={tpl.includeInactive} onChange={(e) => setTpl((p) => ({ ...p, includeInactive: e.target.checked }))} />Include inactive</label>
              <div className="btn-row">
                <button className="btn btn-ghost" disabled={busy} onClick={() => runAction(() => templateApi.list(tpl.includeInactive))}>List</button>
                <button className="btn btn-ghost" disabled={!tpl.id || busy} onClick={() => runAction(() => templateApi.get(tpl.id))}>Get</button>
                <button className="btn btn-primary" disabled={busy} onClick={() => runAction(() => templateApi.create({ name: tpl.name, category: tpl.category, description: tpl.description, spec: tpl.spec, active: tpl.active }), null, (data) => { if (data?.id) setTpl((p) => ({ ...p, id: String(data.id) })); })}>Create</button>
                <button className="btn btn-ghost" disabled={!tpl.id || busy} onClick={() => runAction(() => templateApi.update(tpl.id, { name: tpl.name, category: tpl.category, description: tpl.description, spec: tpl.spec, active: tpl.active }))}>Update</button>
                <button className="btn btn-danger" disabled={!tpl.id || busy} onClick={() => runAction(() => templateApi.remove(tpl.id))}>Delete</button>
              </div>
            </Panel>

            <Panel title="Instantiate" hint="Create a workflow from a template.">
              <Field label="Template ID"><input value={tpl.id} onChange={(e) => setTpl((p) => ({ ...p, id: e.target.value }))} /></Field>
              <Field label="Payload JSON"><textarea rows={6} value={tpl.instantiatePayload} onChange={(e) => setTpl((p) => ({ ...p, instantiatePayload: e.target.value }))} /></Field>
              <button className="btn btn-primary" disabled={!tpl.id || busy} onClick={() => runAction(() => templateApi.instantiate(tpl.id, parseJsonOrEmpty(tpl.instantiatePayload)))}>Instantiate</button>
            </Panel>
          </section>
        )}

        {page === "Teams" && (
          <section className="grid-2">
            <Panel title="Team Management" hint="Team ID is auto-generated on Create Team.">
              <Field label="Team Name"><input value={team.teamName} onChange={(e) => setTeam((p) => ({ ...p, teamName: e.target.value }))} /></Field>
              <Field label="Team ID (for Members/Invite/Accept/Keys)"><input placeholder="Leave blank when creating a team" value={team.teamId} onChange={(e) => setTeam((p) => ({ ...p, teamId: e.target.value }))} /></Field>
              <Field label="Invite Email"><input value={team.inviteEmail} onChange={(e) => setTeam((p) => ({ ...p, inviteEmail: e.target.value }))} /></Field>
              <Field label="Invite ID"><input value={team.inviteId} onChange={(e) => setTeam((p) => ({ ...p, inviteId: e.target.value }))} /></Field>
              <div className="btn-row">
                <button className="btn btn-primary" disabled={busy} onClick={() => runAction(() => teamApi.create({ name: team.teamName }), null, (data) => { if (data?.teamId) setTeam((p) => ({ ...p, teamId: String(data.teamId) })); })}>Create Team</button>
                <button className="btn btn-ghost" disabled={busy} onClick={() => runAction(() => teamApi.list())}>List Teams</button>
                <button className="btn btn-ghost" disabled={!team.teamId || busy} onClick={() => runAction(() => teamApi.members(team.teamId))}>Members</button>
                <button className="btn btn-ghost" disabled={!team.teamId || busy} onClick={() => runAction(() => teamApi.invite(team.teamId, { email: team.inviteEmail }))}>Invite</button>
                <button className="btn btn-ghost" disabled={!team.teamId || !team.inviteId || busy} onClick={() => runAction(() => teamApi.acceptInvite(team.teamId, team.inviteId))}>Accept Invite</button>
              </div>
            </Panel>

            <Panel title="API Keys" hint="Create and manage team API keys.">
              <Field label="Team ID"><input value={team.teamId} onChange={(e) => setTeam((p) => ({ ...p, teamId: e.target.value }))} /></Field>
              <Field label="Key Name"><input value={team.keyName} onChange={(e) => setTeam((p) => ({ ...p, keyName: e.target.value }))} /></Field>
              <Field label="Key ID"><input value={team.keyId} onChange={(e) => setTeam((p) => ({ ...p, keyId: e.target.value }))} /></Field>
              <div className="btn-row">
                <button className="btn btn-primary" disabled={!team.teamId || busy} onClick={() => runAction(() => keyApi.create(team.teamId, { name: team.keyName }))}>Create Key</button>
                <button className="btn btn-ghost" disabled={!team.teamId || busy} onClick={() => runAction(() => keyApi.list(team.teamId))}>List Keys</button>
                <button className="btn btn-danger" disabled={!team.teamId || !team.keyId || busy} onClick={() => runAction(() => keyApi.revoke(team.teamId, team.keyId))}>Revoke Key</button>
              </div>
            </Panel>
          </section>
        )}

        {page === "Integrations" && (
          <section className="grid-2">
            <Panel title="Workflow Hook" hint="Send payloads directly to workflow hook endpoint.">
              <Field label="Workflow ID"><input value={hook.workflowId} onChange={(e) => setHook((p) => ({ ...p, workflowId: e.target.value }))} /></Field>
              <Field label="Idempotency Key"><input value={hook.idempotencyKey} onChange={(e) => setHook((p) => ({ ...p, idempotencyKey: e.target.value }))} /></Field>
              <Field label="Payload JSON"><textarea rows={6} value={hook.payload} onChange={(e) => setHook((p) => ({ ...p, payload: e.target.value }))} /></Field>
              <button className="btn btn-primary" disabled={!hook.workflowId || busy} onClick={() => runAction(() => hookApi.trigger(hook.workflowId, parseJsonOrEmpty(hook.payload), hook.idempotencyKey))}>Trigger</button>
            </Panel>

            <Panel title="Callback Tester" hint="Resume waiting workflow steps.">
              <Field label="Correlation ID"><input value={hook.correlationId} onChange={(e) => setHook((p) => ({ ...p, correlationId: e.target.value }))} /></Field>
              <Field label="Payload JSON"><textarea rows={6} value={hook.callbackPayload} onChange={(e) => setHook((p) => ({ ...p, callbackPayload: e.target.value }))} /></Field>
              <button className="btn btn-ghost" disabled={!hook.correlationId || busy} onClick={() => runAction(() => hookApi.callback(hook.correlationId, parseJsonOrEmpty(hook.callbackPayload)))}>Send Callback</button>
            </Panel>
          </section>
        )}

        {page === "System" && (
          <section className="stack">
            <Panel title="Debug and Health" hint="Use these for auth and service troubleshooting.">
              <div className="btn-row">
                <button className="btn btn-ghost" disabled={busy} onClick={() => runAction(() => debugApi.verify())}>Verify Token</button>
                <button className="btn btn-ghost" disabled={busy} onClick={() => runAction(() => debugApi.headers())}>Debug Headers</button>
                <button className="btn btn-ghost" disabled={busy} onClick={() => runAction(() => debugApi.home())}>Home (/)</button>
                <button className="btn btn-ghost" disabled={busy} onClick={() => runAction(() => actuatorApi.health())}>Health</button>
                <button className="btn btn-ghost" disabled={busy} onClick={() => runAction(() => actuatorApi.info())}>Info</button>
                <button className="btn btn-ghost" disabled={busy} onClick={() => runAction(() => actuatorApi.prometheus())}>Prometheus</button>
              </div>
            </Panel>
          </section>
        )}

        <section className="card">
          <h2 className="section-title">API Response</h2>
          <pre className="console-output">{output}</pre>
        </section>
      </main>
    </div>
  );
}

export default App;
