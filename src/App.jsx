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
  pluginApi,
} from "./api";

// Import custom components
import { WorkflowList } from "./components/WorkflowList";
import { TemplateMarketplace } from "./components/TemplateMarketplace";
import { WorkflowRunsPanel } from "./components/WorkflowRunsPanel";
import { WorkflowDesigner } from "./components/WorkflowDesigner";

// Import Lucide icons
import {
  LayoutDashboard,
  GitBranch,
  Compass,
  Layers,
  Users,
  Settings,
  Terminal,
  Globe,
  Clock,
  Mail,
  Database,
  Search,
  Plus,
  Trash2,
  Play,
  ArrowUp,
  ArrowDown,
  Lock,
  User,
  Sparkles,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  X,
  FileCode,
  Sliders,
  ChevronRight,
} from "lucide-react";

const NAV_ITEMS = ["Dashboard", "Workflows", "Templates", "Plugins", "Teams", "Integrations", "System"];

const WF_DEFAULT = { id: "", name: "", active: false, spec: '{"steps":[{"type":"log","config":{"message":"hello"}}]}', runId: "" };
const TPL_DEFAULT = {
  id: "",
  includeInactive: false,
  name: "",
  category: "Starter",
  description: "",
  active: true,
  spec: '{"steps":[{"type":"log","config":{"message":"Template step"}}]}',
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
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
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

// Icon Helper based on plugin key
function getPluginIcon(iconName, size = 18) {
  const icon = String(iconName).toLowerCase();
  switch (icon) {
    case "terminal":
    case "log":
      return <Terminal size={size} />;
    case "globe":
    case "http_call":
    case "http":
      return <Globe size={size} />;
    case "clock":
    case "wait":
    case "timer":
      return <Clock size={size} />;
    case "mail":
    case "email":
    case "send_email":
      return <Mail size={size} />;
    case "slack":
    case "slack_notification":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52-2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.042a2.528 2.528 0 0 1-2.522 2.52H8.823a2.528 2.528 0 0 1-2.52-2.52v-5.042zM8.823 5.043a2.528 2.528 0 0 1-2.52-2.52A2.528 2.528 0 0 1 8.823 0a2.528 2.528 0 0 1 2.52 2.523v2.52h-2.52zm0 1.261a2.528 2.528 0 0 1 2.52 2.52v5.043a2.528 2.528 0 0 1-2.52 2.522H3.78a2.528 2.528 0 0 1-2.522-2.522V8.824a2.528 2.528 0 0 1 2.522-2.52h5.043zm10.135 3.879a2.528 2.528 0 0 1 2.52-2.522 2.528 2.528 0 0 1 2.522 2.522 2.528 2.528 0 0 1-2.522 2.52h-2.52v-2.52zm-1.262 0a2.528 2.528 0 0 1-2.52 2.52h-5.043a2.528 2.528 0 0 1-2.522-2.52V5.043a2.528 2.528 0 0 1 2.522-2.52h5.043a2.528 2.528 0 0 1 2.52 2.52v5.043zm-3.879 10.136a2.528 2.528 0 0 1 2.52 2.52 2.528 2.528 0 0 1-2.52 2.522 2.528 2.528 0 0 1-2.522-2.522v-2.52h2.522zm0-1.262a2.528 2.528 0 0 1-2.522-2.52v-5.043a2.528 2.528 0 0 1 2.522-2.52H20.22a2.528 2.528 0 0 1 2.522 2.52v5.043a2.528 2.528 0 0 1-2.522 2.52h-5.043z"/>
        </svg>
      );
    case "database":
    case "database_query":
    case "sql":
      return <Database size={size} />;
    default:
      return <Terminal size={size} />;
  }
}

function Metric({ label, value, type, icon }) {
  let accentClass = "metric-accent-violet";
  if (type === "success") accentClass = "metric-accent-emerald";
  if (type === "warning") accentClass = "metric-accent-amber";
  if (type === "danger") accentClass = "metric-accent-rose";

  return (
    <div className={`metric ${accentClass}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p>{label}</p>
        <span style={{ color: "var(--text-muted)" }}>{icon}</span>
      </div>
      <h3>{value}</h3>
    </div>
  );
}

function Panel({ title, hint, icon, children, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-head">
        <div>
          <h3 className="panel-title">
            {icon}
            {title}
          </h3>
          {hint ? <p className="panel-hint">{hint}</p> : null}
        </div>
      </div>
      <div className="stack">{children}</div>
    </section>
  );
}

function Field({ label, children, hint, required }) {
  return (
    <div className="field">
      <label className="label">
        {label}
        {required && <span style={{ color: "var(--danger)", marginLeft: "4px" }}>*</span>}
      </label>
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
      setError(err.message || "Login failed. Invalid credentials.");
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
      setError(err.message || "Signup failed. Review criteria.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div style={{ textAlign: "center", marginBottom: "10px" }}>
          <div
            style={{
              width: "60px",
              height: "60px",
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px",
              boxShadow: "0 0 20px rgba(124, 58, 237, 0.4)",
            }}
          >
            <Sparkles size={28} color="#fff" />
          </div>
          <h1>Workflow Engine</h1>
          <p className="app-subtitle">Connect & automate premium pipelines</p>
        </div>

        <div className="tab-row" style={{ margin: "10px auto" }}>
          <button className={`btn btn-sm ${mode === "login" ? "btn-primary" : "btn-ghost"}`} style={{ borderRadius: "99px" }} onClick={() => setMode("login")}>Login</button>
          <button className={`btn btn-sm ${mode === "register" ? "btn-primary" : "btn-ghost"}`} style={{ borderRadius: "99px" }} onClick={() => setMode("register")}>Register</button>
        </div>

        {mode === "register" ? (
          <Field label="Name">
            <input placeholder="John Doe" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          </Field>
        ) : null}

        <Field label="Email">
          <input placeholder="name@company.com" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        </Field>

        <Field label="Password">
          <input type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />
        </Field>

        {error ? <div className="error-box">{error}</div> : null}

        <button className="btn btn-primary" style={{ marginTop: "10px" }} disabled={loading} onClick={mode === "login" ? handleLogin : handleSignup}>
          {loading ? "Authorizing..." : mode === "login" ? "Login to Workspace" : "Register and Open Workspace"}
        </button>

        <div style={{ display: "flex", alignItems: "center", margin: "10px 0" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }}></div>
          <span style={{ padding: "0 10px", fontSize: "0.75rem", color: "var(--text-muted)" }}>OR</span>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }}></div>
        </div>

        <a className="btn btn-ghost" href={`${apiBaseUrl}/oauth2/authorization/google`} target="_blank" rel="noreferrer">
          <Globe size={16} style={{ marginRight: "4px" }} />
          Continue with Google
        </a>
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

  // Lists caches
  const [workflowCache, setWorkflowCache] = useState([]);
  const [runCache, setRunCache] = useState([]);
  const [templateCache, setTemplateCache] = useState([]);
  const [pluginsCache, setPluginsCache] = useState([]);

  // Selected details
  const [activeRunWorkflow, setActiveRunWorkflow] = useState(null);
  const [selectedPlugin, setSelectedPlugin] = useState(null);
  const [pluginFilter, setPluginFilter] = useState("All");
  const [pluginSearch, setPluginSearch] = useState("");

  // Visual Form Builder states
  const [editorTab, setEditorTab] = useState("Visual"); // "Visual" or "Raw"
  const [builderSteps, setBuilderSteps] = useState([]);
  const [editingWorkflowId, setEditingWorkflowId] = useState(null);

  // Sync visual builder when spec changes
  useEffect(() => {
    try {
      const parsed = JSON.parse(wf.spec);
      if (parsed && Array.isArray(parsed.steps)) {
        setBuilderSteps(parsed.steps);
      } else {
        setBuilderSteps([]);
      }
    } catch {
      setBuilderSteps([]);
    }
  }, [wf.spec]);

  const handleSessionExpired = () => {
    setAuthToken("");
    setAuthScope("guest");
    setIsAuthed(false);
    setWorkflowCache([]);
    setRunCache([]);
    setTemplateCache([]);
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

  // Initial loads
  useEffect(() => {
    // Load public plugins list (accessible without auth)
    runAction(() => pluginApi.listPublic(), setPluginsCache).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isAuthed) return;
    const scope = getAuthScope();
    setAuthScope(scope);
    setPage(localStorage.getItem(storageKey(scope, "page")) || "Dashboard");
    setWf(readPersisted(storageKey(scope, "wf"), WF_DEFAULT));
    setTpl(readPersisted(storageKey(scope, "tpl"), TPL_DEFAULT));
    setTeam(readPersisted(storageKey(scope, "team"), TEAM_DEFAULT));
    setHook(readPersisted(storageKey(scope, "hook"), HOOK_DEFAULT));

    // Authenticated data fetch
    runAction(() => workflowApi.list(), setWorkflowCache).catch(() => {});
    runAction(() => templateApi.list(false), setTemplateCache).catch(() => {});
  }, [isAuthed]);

  // Persists states
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

  const dashboardStats = useMemo(() => {
    const total = workflowCache.length;
    const active = workflowCache.filter((w) => w.active).length;
    const inactive = total - active;
    const templates = templateCache.length;
    return { total, active, inactive, templates };
  }, [workflowCache, templateCache]);

  // Dynamic visual form builder functions
  const handleAddBuilderStep = (typeKey) => {
    const plugin = pluginsCache.find((p) => p.key === typeKey);
    const newStep = {
      type: typeKey,
      config: {},
    };

    // Populate default values from schema
    if (plugin && plugin.configSchema) {
      try {
        const schema = JSON.parse(plugin.configSchema);
        if (schema.properties) {
          Object.entries(schema.properties).forEach(([k, prop]) => {
            if (prop.default !== undefined) {
              newStep.config[k] = prop.default;
            }
          });
        }
      } catch (err) {
        console.error("Error parsing schema:", err);
      }
    }

    setBuilderSteps((prev) => {
      const updated = [...prev, newStep];
      // update wf spec json string
      setWf((p) => ({ ...p, spec: JSON.stringify({ steps: updated }, null, 2) }));
      return updated;
    });
  };

  const handleRemoveBuilderStep = (index) => {
    setBuilderSteps((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      setWf((p) => ({ ...p, spec: JSON.stringify({ steps: updated }, null, 2) }));
      return updated;
    });
  };

  const handleMoveStep = (index, direction) => {
    setBuilderSteps((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[targetIndex];
      updated[targetIndex] = temp;
      setWf((p) => ({ ...p, spec: JSON.stringify({ steps: updated }, null, 2) }));
      return updated;
    });
  };

  const handleUpdateStepConfig = (stepIndex, fieldKey, val) => {
    setBuilderSteps((prev) => {
      const updated = [...prev];
      updated[stepIndex] = {
        ...updated[stepIndex],
        config: {
          ...updated[stepIndex].config,
          [fieldKey]: val,
        },
      };
      setWf((p) => ({ ...p, spec: JSON.stringify({ steps: updated }, null, 2) }));
      return updated;
    });
  };

  // Helper to validate visual steps before saving
  const handleValidateAndSubmitWorkflow = async () => {
    // 1. Validate required fields matching schema
    for (let i = 0; i < builderSteps.length; i++) {
      const step = builderSteps[i];
      const plugin = pluginsCache.find((p) => p.key === step.type);
      if (!plugin) continue;

      try {
        const schema = JSON.parse(plugin.configSchema);
        if (schema.required) {
          for (const reqField of schema.required) {
            const val = step.config[reqField];
            if (val === undefined || val === null || val === "") {
              alert(`Step #${i + 1} (${plugin.name}): Field "${reqField}" is required.`);
              return;
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    // 2. Perform Create or Update API calls
    const payload = {
      name: wf.name,
      spec: JSON.stringify({ steps: builderSteps }),
      active: wf.active,
    };

    if (wf.id) {
      await runAction(
        () => workflowApi.update(wf.id, payload),
        null,
        () => {
          alert("Workflow spec updated successfully!");
          runAction(() => workflowApi.list(), setWorkflowCache);
        }
      );
    } else {
      await runAction(
        () => workflowApi.create(payload),
        null,
        (data) => {
          alert("Workflow created successfully!");
          if (data?.id) setWf((p) => ({ ...p, id: String(data.id) }));
          runAction(() => workflowApi.list(), setWorkflowCache);
        }
      );
    }
  };

  const handleDesignerChange = (updatedSteps) => {
    setBuilderSteps(updatedSteps);
    setWf((p) => ({ ...p, spec: JSON.stringify({ steps: updatedSteps }, null, 2) }));
  };

  const handleNameChange = (name) => {
    setWf((p) => ({ ...p, name }));
  };

  const handleActiveChange = (active) => {
    setWf((p) => ({ ...p, active }));
  };

  // Sidebar Icons Mapping
  const getNavIcon = (name) => {
    switch (name) {
      case "Dashboard": return <LayoutDashboard size={18} />;
      case "Workflows": return <GitBranch size={18} />;
      case "Templates": return <Compass size={18} />;
      case "Plugins": return <Layers size={18} />;
      case "Teams": return <Users size={18} />;
      case "Integrations": return <Sliders size={18} />;
      case "System": return <Settings size={18} />;
      default: return <Settings size={18} />;
    }
  };

  // Filter plugins catalog
  const filteredPlugins = useMemo(() => {
    return pluginsCache.filter((plugin) => {
      const matchCat = pluginFilter === "All" || plugin.category === pluginFilter;
      const searchStr = pluginSearch.toLowerCase();
      const matchSearch =
        plugin.name.toLowerCase().includes(searchStr) ||
        plugin.key.toLowerCase().includes(searchStr) ||
        (plugin.description && plugin.description.toLowerCase().includes(searchStr));
      return matchCat && matchSearch;
    });
  }, [pluginsCache, pluginFilter, pluginSearch]);

  const pluginCategories = useMemo(() => {
    const cats = new Set(pluginsCache.map((p) => p.category));
    return ["All", ...Array.from(cats)];
  }, [pluginsCache]);

  if (!isAuthed) return <AuthScreen onAuthed={(email) => { setAuthScope(getAuthScope() || (email || "authed")); setIsAuthed(true); }} />;

  return (
    <div className="layout">
      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div>
          <h2>
            <Sparkles size={20} style={{ color: "#a78bfa" }} />
            Workflow Engine
          </h2>
          <p className="app-subtitle" style={{ fontSize: "0.78rem" }}>Console Workspace</p>
        </div>

        <div className="app-status">
          Connected API
        </div>

        <nav>
          {NAV_ITEMS.map((item) => (
            <button
              key={item}
              className={`nav-item ${page === item ? "nav-item-active" : ""}`}
              onClick={() => {
                setPage(item);
                // reset details panels when toggling page
                setActiveRunWorkflow(null);
                setSelectedPlugin(null);
              }}
            >
              {getNavIcon(item)}
              {item}
            </button>
          ))}
        </nav>

        <button
          className="btn btn-ghost"
          style={{ width: "100%", border: "1px solid rgba(239, 68, 68, 0.2)", color: "#fca5a5" }}
          onClick={handleSessionExpired}
        >
          Logout Session
        </button>
      </aside>

      {/* MAIN SCREEN PANEL */}
      <main className="main">
        <header className="main-header">
          <div>
            <h1 className="app-title">{page}</h1>
            <p className="app-subtitle">Active Server Node: {apiBaseUrl}</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.03)", padding: "6px 12px", borderRadius: "20px" }}>
              Scope: <strong>{authScope}</strong>
            </span>
          </div>
        </header>

        <div className="main-scroll">
          
          {/* DASHBOARD PAGE */}
          {page === "Dashboard" && (
            <section className="stack">
              <div className="metrics-grid">
                <Metric label="Total Workflows" value={dashboardStats.total} type="violet" icon={<GitBranch size={16} />} />
                <Metric label="Active Workflows" value={dashboardStats.active} type="success" icon={<Play size={16} />} />
                <Metric label="Inactive" value={dashboardStats.inactive} type="warning" icon={<AlertCircle size={16} />} />
                <Metric label="Templates Loaded" value={dashboardStats.templates} type="danger" icon={<Compass size={16} />} />
              </div>

              <div className="grid-2">
                <Panel title="Quick Actions" hint="Reload database records dynamically." icon={<RefreshCw size={16} />}>
                  <div className="btn-row">
                    <button className="btn btn-primary" disabled={busy} onClick={() => runAction(() => workflowApi.list(), setWorkflowCache)}>
                      Sync Workflows List
                    </button>
                    <button className="btn btn-ghost" disabled={busy} onClick={() => runAction(() => templateApi.list(false), setTemplateCache)}>
                      Sync Templates
                    </button>
                  </div>
                </Panel>

                <Panel title="Active Session Info" hint="Verify endpoint tokens." icon={<Settings size={16} />}>
                  <div className="btn-row">
                    <button className="btn btn-ghost" onClick={() => runAction(() => debugApi.verify())}>Verify Security Headers</button>
                    <button className="btn btn-ghost" onClick={() => runAction(() => actuatorApi.health())}>Actuator Health Check</button>
                  </div>
                </Panel>
              </div>

              {/* Workflows List in Dashboard */}
              <WorkflowList
                workflows={workflowCache}
                apiBaseUrl={apiBaseUrl}
                onActivate={async (id) => {
                  await runAction(() => workflowApi.activate(id));
                  runAction(() => workflowApi.list(), setWorkflowCache);
                }}
                onDeactivate={async (id) => {
                  await runAction(() => workflowApi.deactivate(id));
                  runAction(() => workflowApi.list(), setWorkflowCache);
                }}
                onViewRuns={async (workflow) => {
                  setActiveRunWorkflow(workflow);
                  setPage("Dashboard"); // Keep on dashboard to view runs
                  setBusy(true);
                  try {
                    const runs = await workflowApi.runs(workflow.id);
                    setRunCache(runs);
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setBusy(false);
                  }
                }}
              />

              {/* Execution Runs details inside Dashboard */}
              {activeRunWorkflow && (
                <WorkflowRunsPanel
                  workflow={activeRunWorkflow}
                  runs={runCache}
                  onClose={() => setActiveRunWorkflow(null)}
                  onRefresh={async () => {
                    setBusy(true);
                    try {
                      const runs = await workflowApi.runs(activeRunWorkflow.id);
                      setRunCache(runs);
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setBusy(false);
                    }
                  }}
                />
              )}
            </section>
          )}

          {/* WORKFLOWS BUILDER & LIST */}
          {page === "Workflows" && (
            wf.name ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ width: "fit-content" }}
                  onClick={() => setWf(WF_DEFAULT)}
                >
                  ← Back to Workflows List
                </button>
                <WorkflowDesigner
                  plugins={pluginsCache}
                  steps={builderSteps}
                  onChange={handleDesignerChange}
                  workflowName={wf.name}
                  onNameChange={handleNameChange}
                  active={wf.active}
                  onActiveChange={handleActiveChange}
                  onSave={handleValidateAndSubmitWorkflow}
                  busy={busy}
                />
              </div>
            ) : (
              <div className="grid-2">
                <Panel title="Workflow Instances" hint="Load and modify workflows." icon={<GitBranch size={16} />}>
                  <div className="btn-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                    <button className="btn btn-primary" onClick={() => setWf({ id: "", name: "New Workflow", active: true, spec: '{"steps":[]}' })}>
                      <Plus size={14} />
                      Build New Workflow
                    </button>
                    <button className="btn btn-ghost" disabled={busy} onClick={() => runAction(() => workflowApi.list(), setWorkflowCache)}>
                      List Workflows
                    </button>
                  </div>
                  <div className="table-wrap" style={{ maxHeight: "360px", overflowY: "auto", marginTop: "12px" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Workflow Name</th>
                          <th>Status</th>
                          <th>Configure</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workflowCache.map((w) => (
                          <tr key={w.id}>
                            <td style={{ fontWeight: 600, color: "#fff" }}>{w.name}</td>
                            <td>
                              <span className={`badge ${w.active ? "badge-active" : "badge-inactive"}`}>
                                {w.active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => {
                                  setWf({
                                    id: w.id,
                                    name: w.name,
                                    active: w.active,
                                    spec: w.spec || '{"steps":[]}',
                                  });
                                }}
                              >
                                Edit / Load
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>

                <Panel title="Trigger Manual Hook" hint="Run tests via HTTP callback endpoints." icon={<Sliders size={16} />}>
                  <Field label="Target Workflow ID">
                    <input placeholder="Enter workflow UUID" value={hook.workflowId} onChange={(e) => setHook((p) => ({ ...p, workflowId: e.target.value }))} />
                  </Field>
                  <Field label="Trigger Payload (JSON)">
                    <textarea rows={3} value={hook.payload} onChange={(e) => setHook((p) => ({ ...p, payload: e.target.value }))} />
                  </Field>
                  <button
                    className="btn btn-primary"
                    disabled={!hook.workflowId || busy}
                    onClick={() => runAction(() => hookApi.trigger(hook.workflowId, parseJsonOrEmpty(hook.payload), hook.idempotencyKey))}
                  >
                    Execute Workflow Hook
                  </button>
                </Panel>
              </div>
            )
          )}

          {/* TEMPLATES MARKETPLACE */}
          {page === "Templates" && (
            <TemplateMarketplace
              templates={templateCache}
              loading={busy}
              onInstantiate={async (id, payload) => {
                await runAction(() => templateApi.instantiate(id, payload));
                runAction(() => workflowApi.list(), setWorkflowCache);
                setPage("Workflows"); // Switch page to workouts to configure
              }}
              onCreateTemplate={async (payload) => {
                await runAction(() => templateApi.create(payload));
                runAction(() => templateApi.list(false), setTemplateCache);
              }}
            />
          )}

          {/* PLUGINS CATALOG VIEW */}
          {page === "Plugins" && (
            <section className="stack">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "16px",
                  marginBottom: "8px",
                }}
              >
                {/* Search box with icons */}
                <div className="search-container">
                  <Search size={16} style={{ color: "var(--text-muted)" }} />
                  <input
                    placeholder="Search active plugins catalog..."
                    value={pluginSearch}
                    onChange={(e) => setPluginSearch(e.target.value)}
                  />
                  {pluginSearch && (
                    <button style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer" }} onClick={() => setPluginSearch("")}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Filter tags row */}
                <div className="tab-row">
                  {pluginCategories.map((cat) => (
                    <button
                      key={cat}
                      className={`btn btn-sm ${pluginFilter === cat ? "btn-primary" : "btn-ghost"}`}
                      style={{ padding: "4px 12px", borderRadius: "99px" }}
                      onClick={() => setPluginFilter(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {filteredPlugins.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                  <AlertCircle size={32} style={{ margin: "0 auto 10px", color: "var(--text-muted)" }} />
                  <p>No active plugins match search parameters.</p>
                </div>
              ) : (
                <div className="plugins-grid">
                  {filteredPlugins.map((plugin) => (
                    <div key={plugin.id} className="plugin-card" onClick={() => setSelectedPlugin(plugin)}>
                      <div className="plugin-card-header">
                        <div className="plugin-icon-wrap">
                          {getPluginIcon(plugin.icon, 22)}
                        </div>
                        <div className="plugin-meta">
                          <span className="plugin-name">{plugin.name}</span>
                          <span className="plugin-cat-badge">{plugin.category}</span>
                        </div>
                      </div>
                      <p className="plugin-desc">{plugin.description}</p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.03)", paddingTop: "10px" }}>
                        <span className="mono" style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                          key: {plugin.key}
                        </span>
                        <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Side drawer panel for detailed schemas inspection */}
              {selectedPlugin && (
                <div className="plugin-detail-panel">
                  <button className="plugin-detail-close" onClick={() => setSelectedPlugin(null)}>
                    <X size={18} />
                  </button>

                  <div style={{ display: "flex", gap: "16px", alignItems: "center", marginTop: "12px" }}>
                    <div className="plugin-icon-wrap" style={{ width: "56px", height: "56px", borderRadius: "var(--radius-lg)" }}>
                      {getPluginIcon(selectedPlugin.icon, 26)}
                    </div>
                    <div>
                      <h3 style={{ color: "#fff", fontSize: "1.3rem", fontWeight: 700 }}>{selectedPlugin.name}</h3>
                      <span className="plugin-cat-badge" style={{ marginTop: "4px" }}>{selectedPlugin.category}</span>
                    </div>
                  </div>

                  <div className="stack" style={{ gap: "12px" }}>
                    <h4 style={{ color: "#fff", fontWeight: 600, fontSize: "0.95rem" }}>Description</h4>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: 1.5 }}>
                      {selectedPlugin.description}
                    </p>
                  </div>

                  <div className="stack" style={{ gap: "10px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      Integration Key: <strong className="mono" style={{ fontSize: "0.85rem" }}>{selectedPlugin.key}</strong>
                    </span>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                      Status: <strong style={{ color: "var(--success)" }}>Active Catalog</strong>
                    </span>
                  </div>

                  {selectedPlugin.configSchema && (
                    <div className="stack" style={{ gap: "12px", flex: 1, overflow: "hidden" }}>
                      <h4 style={{ color: "#fff", fontWeight: 600, fontSize: "0.95rem" }}>JSON Schema Schema Definitions</h4>
                      <pre
                        className="console-output"
                        style={{
                          margin: 0,
                          fontSize: "0.78rem",
                          maxHeight: "none",
                          flex: 1,
                          overflow: "auto",
                          background: "#05070c",
                          border: "1px solid var(--border)",
                        }}
                      >
                        {JSON.stringify(JSON.parse(selectedPlugin.configSchema), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* TEAMS MANAGEMENT */}
          {page === "Teams" && (
            <div className="grid-2">
              <Panel title="Team Workspaces" hint="Manage collaborative team workspaces." icon={<Users size={16} />}>
                <Field label="New Team Name">
                  <input placeholder="e.g. Platform Engineering" value={team.teamName} onChange={(e) => setTeam((p) => ({ ...p, teamName: e.target.value }))} />
                </Field>
                <div className="btn-row">
                  <button className="btn btn-primary" disabled={busy} onClick={() => runAction(() => teamApi.create({ name: team.teamName }), null, (data) => { if (data?.teamId) setTeam((p) => ({ ...p, teamId: String(data.teamId) })); })}>
                    Create New Team
                  </button>
                  <button className="btn btn-ghost" disabled={busy} onClick={() => runAction(() => teamApi.list())}>
                    List My Teams
                  </button>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "18px", marginTop: "10px" }}>
                  <Field label="Selected Team Workspace ID">
                    <input placeholder="Workspace ID" value={team.teamId} onChange={(e) => setTeam((p) => ({ ...p, teamId: e.target.value }))} />
                  </Field>
                  <div className="btn-row" style={{ marginTop: "10px" }}>
                    <button className="btn btn-ghost btn-sm" disabled={!team.teamId || busy} onClick={() => runAction(() => teamApi.members(team.teamId))}>
                      View Members
                    </button>
                  </div>
                </div>
              </Panel>

              <Panel title="Workspace Invites & API Keys" hint="Invite teammates or create keys for pipelines." icon={<Lock size={16} />}>
                <div className="stack" style={{ gap: "14px" }}>
                  <Field label="Invite Email">
                    <input placeholder="engineer@company.com" value={team.inviteEmail} onChange={(e) => setTeam((p) => ({ ...p, inviteEmail: e.target.value }))} />
                  </Field>
                  <button className="btn btn-ghost" disabled={!team.teamId || busy} onClick={() => runAction(() => teamApi.invite(team.teamId, { email: team.inviteEmail }))}>
                    Send Email Invitation
                  </button>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: "18px", marginTop: "10px" }}>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <Field label="Key Description">
                      <input placeholder="CI/CD Pipeline Key" value={team.keyName} onChange={(e) => setTeam((p) => ({ ...p, keyName: e.target.value }))} />
                    </Field>
                    <Field label="Key ID (for revocation)">
                      <input placeholder="Key ID" value={team.keyId} onChange={(e) => setTeam((p) => ({ ...p, keyId: e.target.value }))} />
                    </Field>
                  </div>
                  <div className="btn-row" style={{ marginTop: "10px" }}>
                    <button className="btn btn-primary btn-sm" disabled={!team.teamId || busy} onClick={() => runAction(() => keyApi.create(team.teamId, { name: team.keyName }))}>
                      Generate API Key
                    </button>
                    <button className="btn btn-ghost btn-sm" disabled={!team.teamId || busy} onClick={() => runAction(() => keyApi.list(team.teamId))}>
                      List Active Keys
                    </button>
                    <button className="btn btn-danger btn-sm" disabled={!team.teamId || !team.keyId || busy} onClick={() => runAction(() => keyApi.revoke(team.teamId, team.keyId))}>
                      Revoke Key
                    </button>
                  </div>
                </div>
              </Panel>
            </div>
          )}

          {/* INTEGRATIONS CALLBACK TESTER */}
          {page === "Integrations" && (
            <div className="grid-2">
              <Panel title="Async Webhook Trigger" hint="Send mock callback data to resume paused nodes." icon={<Sliders size={16} />}>
                <Field label="Correlation Callback ID">
                  <input placeholder="Correlation ID from wait step logs" value={hook.correlationId} onChange={(e) => setHook((p) => ({ ...p, correlationId: e.target.value }))} />
                </Field>
                <Field label="Callback Response Payload (JSON)">
                  <textarea rows={4} value={hook.callbackPayload} onChange={(e) => setHook((p) => ({ ...p, callbackPayload: e.target.value }))} />
                </Field>
                <button
                  className="btn btn-primary"
                  disabled={!hook.correlationId || busy}
                  onClick={() => runAction(() => hookApi.callback(hook.correlationId, parseJsonOrEmpty(hook.callbackPayload)))}
                >
                  Send Resuming Callback
                </button>
              </Panel>

              <Panel title="API Documentation" hint="Direct hooks format descriptions." icon={<HelpCircle size={16} />}>
                <div style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
                  <p style={{ marginBottom: "10px" }}>
                    Paused workflow steps containing a <code className="mono">correlationId</code> parameter can be resumed via a POST request to:
                  </p>
                  <pre className="console-output" style={{ fontSize: "0.8rem", marginBottom: "12px", background: "#05070c" }}>
                    POST {apiBaseUrl}/hooks/callback/{"{correlationId}"}
                  </pre>
                  <p>
                    Provide whatever structured payload your downstream steps require. The workflow engine resumes step logs valuation upon callback capture.
                  </p>
                </div>
              </Panel>
            </div>
          )}

          {/* SYSTEM METRICS & HEALTH */}
          {page === "System" && (
            <section className="stack">
              <Panel title="Engine Actuators & Metrics" hint="Review performance telemetry nodes." icon={<Settings size={16} />}>
                <div className="btn-row">
                  <button className="btn btn-ghost" disabled={busy} onClick={() => runAction(() => debugApi.verify())}>Verify JWT Signature</button>
                  <button className="btn btn-ghost" disabled={busy} onClick={() => runAction(() => actuatorApi.health())}>Health Check</button>
                  <button className="btn btn-ghost" disabled={busy} onClick={() => runAction(() => actuatorApi.info())}>Server Info</button>
                  <button className="btn btn-ghost" disabled={busy} onClick={() => runAction(() => actuatorApi.prometheus())}>Prometheus Telemetry</button>
                </div>
              </Panel>
            </section>
          )}

          {/* GLOBAL CONSOLE RESPONSE */}
          <section className="card" style={{ marginTop: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h2 className="panel-title">
                <Terminal size={16} />
                Server Response Output
              </h2>
              {busy && <span className="mono" style={{ fontSize: "0.75rem", color: "var(--primary)" }}>Querying node...</span>}
            </div>
            <pre className="console-output">{output}</pre>
          </section>

        </div>
      </main>
    </div>
  );
}

export default App;
