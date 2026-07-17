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

        {(() => {
          const pending = sessionStorage.getItem("pending_invite");
          if (!pending) return null;
          try {
            const data = JSON.parse(pending);
            return (
              <div style={{
                background: "rgba(124, 58, 237, 0.08)",
                border: "1px solid rgba(124, 58, 237, 0.25)",
                borderRadius: "var(--radius-md)",
                padding: "10px",
                marginBottom: "14px",
                fontSize: "0.78rem",
                color: "#d8b4fe",
                textAlign: "center",
                lineHeight: 1.4
              }}>
                <span style={{ fontWeight: 600, color: "#fff", display: "block", marginBottom: "2px" }}>📬 Invitation Received</span>
                Please sign in or register to review and accept.
              </div>
            );
          } catch {
            return null;
          }
        })()}

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
  const [teamMembersList, setTeamMembersList] = useState([]);
  const [pendingInvitesList, setPendingInvitesList] = useState([]);
  const [activeInvitationBanner, setActiveInvitationBanner] = useState(null);
  const [receivedInvitations, setReceivedInvitations] = useState([]);
  const [toast, setToast] = useState(null);

  const [myTeamsList, setMyTeamsList] = useState([]);
  const [showCreatePlugin, setShowCreatePlugin] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState(null);
  const [newPluginForm, setNewPluginForm] = useState({
    key: "",
    name: "",
    description: "",
    category: "Core",
    icon: "🔌",
    configSchema: '{"properties":{}}',
    active: true
  });
  const [webhookPayload, setWebhookPayload] = useState('{\n  "test": true\n}');
  const [webhookIdempotencyKey, setWebhookIdempotencyKey] = useState("");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

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
      if (err.status === 401) {
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
    runAction(() => pluginApi.list(), setPluginsCache).catch(() => {});
    runAction(() => teamApi.myInvitations(), setReceivedInvitations).catch(() => {});
    runAction(() => teamApi.list(), setMyTeamsList).catch(() => {});

    // Check for pending invite in sessionStorage
    const pending = sessionStorage.getItem("pending_invite");
    if (pending) {
      try {
        const { teamId, inviteId } = JSON.parse(pending);
        setActiveInvitationBanner({ teamId, inviteId });
      } catch {}
    }
  }, [isAuthed]);

  // URL matching scanner for invitation links
  useEffect(() => {
    const match = window.location.pathname.match(/\/teams\/([^/]+)\/invites\/([^/]+)\/accept/);
    if (match) {
      const [, teamId, inviteId] = match;
      if (isAuthed) {
        setActiveInvitationBanner({ teamId, inviteId });
      } else {
        sessionStorage.setItem("pending_invite", JSON.stringify({ teamId, inviteId }));
      }
    }
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

  const refreshTeamWorkspaceInfo = async (teamId) => {
    if (!teamId) return;
    setBusy(true);
    try {
      const members = await teamApi.members(teamId);
      setTeamMembersList(members);
    } catch (err) {
      console.error("Failed to fetch team members", err);
      setTeamMembersList([]);
    }
    try {
      const pending = await teamApi.pendingInvites(teamId);
      setPendingInvitesList(pending);
    } catch (err) {
      console.error("Failed to fetch pending invites", err);
      setPendingInvitesList([]);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (isAuthed && team.teamId && page === "Teams") {
      refreshTeamWorkspaceInfo(team.teamId);
    }
  }, [team.teamId, page, isAuthed]);

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
          {activeInvitationBanner && (
            <div style={{
              background: "linear-gradient(135deg, rgba(124, 58, 237, 0.12), rgba(79, 70, 229, 0.12))",
              border: "1px solid rgba(124, 58, 237, 0.35)",
              borderRadius: "var(--radius-md)",
              padding: "14px 18px",
              marginBottom: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "14px",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.2)"
            }}>
              <div>
                <strong style={{ color: "#fff", display: "block", fontSize: "0.9rem", marginBottom: "3px" }}>
                  📬 Team Invitation Received
                </strong>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  You have been invited to join Team Workspace: <code className="mono" style={{ color: "#c084fc", background: "rgba(0,0,0,0.2)", padding: "2px 5px", borderRadius: "3px" }}>{activeInvitationBanner.teamId}</code>
                </span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ whiteSpace: "nowrap", padding: "5px 12px", fontSize: "0.78rem" }}
                  onClick={() => runAction(
                    () => teamApi.acceptInvite(activeInvitationBanner.teamId, activeInvitationBanner.inviteId),
                    null,
                    () => {
                      alert("Success: You have joined the team!");
                      setTeam((p) => ({ ...p, teamId: activeInvitationBanner.teamId }));
                      setPage("Teams");
                      setActiveInvitationBanner(null);
                      sessionStorage.removeItem("pending_invite");
                      window.history.replaceState({}, document.title, "/");
                    }
                  )}
                >
                  Accept Invite
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ border: "1px solid var(--border)", whiteSpace: "nowrap", padding: "5px 12px", fontSize: "0.78rem" }}
                  onClick={() => {
                    setActiveInvitationBanner(null);
                    sessionStorage.removeItem("pending_invite");
                    window.history.replaceState({}, document.title, "/");
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          
          {/* DASHBOARD PAGE */}
          {page === "Dashboard" && (
            <section className="stack">
              <div className="metrics-grid">
                <Metric label="Total Workflows" value={dashboardStats.total} type="violet" icon={<GitBranch size={16} />} />
                <Metric label="Active Workflows" value={dashboardStats.active} type="success" icon={<Play size={16} />} />
                <Metric label="Inactive" value={dashboardStats.inactive} type="warning" icon={<AlertCircle size={16} />} />
                <Metric label="Templates Loaded" value={dashboardStats.templates} type="danger" icon={<Compass size={16} />} />
              </div>

              {receivedInvitations.length > 0 && (
                <Panel title="Pending Team Invitations Received" hint="Collaborations you have been invited to join." icon={<Mail size={16} />}>
                  <div className="stack" style={{ gap: "10px" }}>
                    {receivedInvitations.map((inv) => (
                      <div key={inv.inviteId} style={{
                        background: "var(--surface-soft)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                        padding: "12px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "14px"
                      }}>
                        <div>
                          <span style={{ fontWeight: 600, color: "#fff", fontSize: "0.88rem" }}>Team: {inv.teamName}</span>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                            Invited Date: {inv.invitedAt ? new Date(inv.invitedAt).toLocaleDateString() : "unknown"}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                            onClick={() => runAction(
                              () => teamApi.acceptInvite(inv.teamId, inv.inviteId),
                              null,
                              () => {
                                showToast(`Joined team: ${inv.teamName}`, "success");
                                runAction(() => teamApi.list()).catch(() => {});
                                runAction(() => teamApi.myInvitations(), setReceivedInvitations).catch(() => {});
                              }
                            )}
                          >
                            Accept
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ padding: "4px 10px", fontSize: "0.75rem", background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5", border: "1px solid rgba(239, 68, 68, 0.25)" }}
                            onClick={() => runAction(
                              () => teamApi.declineInvite(inv.teamId, inv.inviteId),
                              null,
                              () => {
                                showToast(`Declined invitation to team: ${inv.teamName}`, "success");
                                runAction(() => teamApi.myInvitations(), setReceivedInvitations).catch(() => {});
                              }
                            )}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}

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
                              <div style={{ display: "flex", gap: "6px" }}>
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
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: "var(--primary)" }}
                                  onClick={() => {
                                    setHook((p) => ({ ...p, workflowId: w.id }));
                                    showToast("Target Workflow ID updated.", "success");
                                  }}
                                >
                                  Trigger
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Panel>

                <Panel title="Manual Webhook Trigger & Execution" hint="Initiate run nodes via HTTP callback triggers." icon={<Sliders size={16} />}>
                  <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "14px", lineHeight: 1.4 }}>
                    <p style={{ marginBottom: "6px" }}>Endpoint URL:</p>
                    <pre className="console-output" style={{ fontSize: "0.75rem", margin: 0, padding: "8px", background: "#05070c", border: "1px solid var(--border)", overflowX: "auto" }}>
                      POST {apiBaseUrl}/hooks/{hook.workflowId || ":workflowId"}
                    </pre>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <Field label="Target Workflow ID" style={{ flex: 1 }}>
                      <input placeholder="Enter workflow UUID" value={hook.workflowId} onChange={(e) => setHook((p) => ({ ...p, workflowId: e.target.value }))} />
                    </Field>
                    <Field label="Idempotency-Key" style={{ width: "180px" }}>
                      <input placeholder="e.g. test-run-001" value={hook.idempotencyKey || ""} onChange={(e) => setHook((p) => ({ ...p, idempotencyKey: e.target.value }))} />
                    </Field>
                  </div>
                  <Field label="Trigger Payload (JSON)">
                    <textarea rows={4} value={hook.payload} onChange={(e) => setHook((p) => ({ ...p, payload: e.target.value }))} />
                  </Field>
                  <button
                    className="btn btn-primary"
                    disabled={!hook.workflowId || busy}
                    onClick={() => runAction(
                      () => hookApi.trigger(hook.workflowId, parseJsonOrEmpty(hook.payload), hook.idempotencyKey),
                      null,
                      () => {
                        showToast("Workflow execution queued successfully!", "success");
                      }
                    )}
                  >
                    Execute Webhook Trigger
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

                 <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  {/* Filter tags row */}
                  <div className="tab-row" style={{ margin: 0 }}>
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

                  <button
                    className="btn btn-primary btn-sm"
                    style={{ borderRadius: "20px" }}
                    onClick={() => {
                      setEditingPlugin(null);
                      setNewPluginForm({
                        key: "",
                        name: "",
                        description: "",
                        category: "Core",
                        icon: "🔌",
                        configSchema: '{"properties":{}}',
                        active: true
                      });
                      setShowCreatePlugin(true);
                    }}
                  >
                    <Plus size={14} />
                    Register Custom Executor
                  </button>
                </div>
              </div>

              {showCreatePlugin && (
                <Panel
                  title={editingPlugin ? "Update Custom Executor Plugin" : "Register Custom Executor Plugin"}
                  hint="Create plugins to extend available step tasks in workflows."
                  icon={<Sliders size={16} />}
                >
                  <div className="grid-2">
                    <div className="stack" style={{ gap: "12px" }}>
                      <div style={{ display: "flex", gap: "10px" }}>
                        <Field label="Plugin Key" style={{ flex: 1 }}>
                          <input
                            placeholder="e.g. data_transform"
                            value={newPluginForm.key}
                            disabled={!!editingPlugin}
                            onChange={(e) => setNewPluginForm((p) => ({ ...p, key: e.target.value }))}
                          />
                        </Field>
                        <Field label="Category" style={{ width: "160px" }}>
                          <select
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              background: "var(--surface-soft)",
                              border: "1px solid var(--border)",
                              borderRadius: "var(--radius-md)",
                              color: "#fff"
                            }}
                            value={newPluginForm.category}
                            onChange={(e) => setNewPluginForm((p) => ({ ...p, category: e.target.value }))}
                          >
                            <option value="Core">Core</option>
                            <option value="Integration">Integration</option>
                            <option value="Control Flow">Control Flow</option>
                            <option value="Communication">Communication</option>
                            <option value="Processing">Processing</option>
                          </select>
                        </Field>
                      </div>

                      <div style={{ display: "flex", gap: "10px" }}>
                        <Field label="Plugin Name" style={{ flex: 1 }}>
                          <input
                            placeholder="e.g. Data Transform"
                            value={newPluginForm.name}
                            onChange={(e) => setNewPluginForm((p) => ({ ...p, name: e.target.value }))}
                          />
                        </Field>
                        <Field label="Icon Emoji" style={{ width: "100px" }}>
                          <input
                            placeholder="🔄"
                            value={newPluginForm.icon}
                            onChange={(e) => setNewPluginForm((p) => ({ ...p, icon: e.target.value }))}
                          />
                        </Field>
                      </div>

                      <Field label="Description">
                        <input
                          placeholder="Short description of what the plugin does"
                          value={newPluginForm.description}
                          onChange={(e) => setNewPluginForm((p) => ({ ...p, description: e.target.value }))}
                        />
                      </Field>
                    </div>

                    <div className="stack" style={{ gap: "12px" }}>
                      <Field label="Config Schema (JSON Definitions)">
                        <textarea
                          rows={6}
                          placeholder='{"properties": {"myField": {"type": "string"}}}'
                          value={newPluginForm.configSchema}
                          onChange={(e) => setNewPluginForm((p) => ({ ...p, configSchema: e.target.value }))}
                        />
                      </Field>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <input
                          type="checkbox"
                          id="plugin-active-checkbox"
                          checked={newPluginForm.active}
                          onChange={(e) => setNewPluginForm((p) => ({ ...p, active: e.target.checked }))}
                        />
                        <label htmlFor="plugin-active-checkbox" style={{ fontSize: "0.85rem", color: "#fff", cursor: "pointer" }}>
                          Plugin Active & Available in Designer
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="btn-row" style={{ marginTop: "18px" }}>
                    <button
                      className="btn btn-primary"
                      onClick={() => {
                        const action = editingPlugin
                          ? () => pluginApi.update(editingPlugin.id, newPluginForm)
                          : () => pluginApi.create(newPluginForm);
                        runAction(
                          action,
                          null,
                          () => {
                            showToast(editingPlugin ? "Plugin updated successfully!" : "Plugin registered successfully!", "success");
                            setShowCreatePlugin(false);
                            setEditingPlugin(null);
                            runAction(() => pluginApi.list(), setPluginsCache);
                          }
                        );
                      }}
                    >
                      {editingPlugin ? "Save Plugin Modifications" : "Register Executor Plugin"}
                    </button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => {
                        setShowCreatePlugin(false);
                        setEditingPlugin(null);
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </Panel>
              )}

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
                        <div className="plugin-meta" style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                            <span className="plugin-name">{plugin.name}</span>
                            <span style={{
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              color: plugin.active !== false ? "var(--success)" : "var(--danger)",
                              background: plugin.active !== false ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                              padding: "2px 6px",
                              borderRadius: "10px",
                              border: plugin.active !== false ? "1px solid rgba(16, 185, 129, 0.15)" : "1px solid rgba(239, 68, 68, 0.15)",
                              textTransform: "uppercase"
                            }}>
                              {plugin.active !== false ? "Active" : "Inactive"}
                            </span>
                          </div>
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
                      Status: <strong style={{ color: selectedPlugin.active !== false ? "var(--success)" : "var(--danger)" }}>{selectedPlugin.active !== false ? "Active Catalog" : "Inactive"}</strong>
                    </span>
                  </div>

                  <div className="btn-row" style={{ marginTop: "8px", gap: "8px" }}>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1, padding: "6px" }}
                      onClick={() => {
                        setEditingPlugin(selectedPlugin);
                        setNewPluginForm({
                          key: selectedPlugin.key,
                          name: selectedPlugin.name,
                          description: selectedPlugin.description,
                          category: selectedPlugin.category,
                          icon: selectedPlugin.icon || "🔌",
                          configSchema: selectedPlugin.configSchema || '{"properties":{}}',
                          active: selectedPlugin.active !== false
                        });
                        setShowCreatePlugin(true);
                        setSelectedPlugin(null);
                      }}
                    >
                      Edit Plugin
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      style={{ flex: 1, padding: "6px", background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5", border: "1px solid rgba(239, 68, 68, 0.25)" }}
                      onClick={() => runAction(
                        () => pluginApi.remove(selectedPlugin.id),
                        null,
                        () => {
                          showToast("Plugin successfully deleted.", "success");
                          setSelectedPlugin(null);
                          runAction(() => pluginApi.list(), setPluginsCache);
                        }
                      )}
                    >
                      Delete Plugin
                    </button>
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
            <div className="stack" style={{ gap: "24px" }}>
              <div className="grid-2">
                <Panel title="Team Workspaces" hint="Manage collaborative team workspaces." icon={<Users size={16} />}>
                  <Field label="New Team Name">
                    <input placeholder="e.g. Platform Engineering" value={team.teamName} onChange={(e) => setTeam((p) => ({ ...p, teamName: e.target.value }))} />
                  </Field>
                  <div className="btn-row">
                    <button
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={() => runAction(
                        () => teamApi.create({ name: team.teamName }),
                        null,
                        (data) => {
                          if (data?.teamId) {
                            setTeam((p) => ({ ...p, teamId: String(data.teamId), teamName: "" }));
                            refreshTeamWorkspaceInfo(data.teamId);
                            runAction(() => teamApi.list(), setMyTeamsList);
                            showToast("Team created successfully!", "success");
                          }
                        }
                      )}
                    >
                      Create New Team
                    </button>
                    <button className="btn btn-ghost" disabled={busy} onClick={() => runAction(() => teamApi.list())}>
                      List My Teams
                    </button>
                  </div>

                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "18px", marginTop: "10px" }}>
                    <Field label="Select Workspace Team">
                      {myTeamsList.length === 0 ? (
                        <p className="field-hint" style={{ color: "var(--text-muted)", margin: 0 }}>No teams joined yet. Create a team above.</p>
                      ) : (
                        <select
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            background: "var(--surface-soft)",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius-md)",
                            color: "#fff"
                          }}
                          value={team.teamId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTeam((p) => ({ ...p, teamId: val }));
                            if (val) refreshTeamWorkspaceInfo(val);
                          }}
                        >
                          <option value="">-- Choose Joined Team --</option>
                          {myTeamsList.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name} (Role: {t.role || "MEMBER"})
                            </option>
                          ))}
                        </select>
                      )}
                    </Field>
                    <div style={{ display: "flex", gap: "10px", marginTop: "12px", alignItems: "center" }}>
                      <Field label="Or Enter Team ID" style={{ flex: 1, margin: 0 }}>
                        <input
                          placeholder="Workspace ID"
                          value={team.teamId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTeam((p) => ({ ...p, teamId: val }));
                            if (val) refreshTeamWorkspaceInfo(val);
                          }}
                        />
                      </Field>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ alignSelf: "flex-end", height: "36px" }}
                        disabled={!team.teamId || busy}
                        onClick={() => {
                          refreshTeamWorkspaceInfo(team.teamId);
                          runAction(() => teamApi.list(), setMyTeamsList);
                        }}
                      >
                        Sync Info
                      </button>
                    </div>
                  </div>
                </Panel>

                <Panel title="Workspace Invites & API Keys" hint="Invite teammates or create keys for pipelines." icon={<Lock size={16} />}>
                  <div className="stack" style={{ gap: "14px" }}>
                    <Field label="Invite Email">
                      <input placeholder="engineer@company.com" value={team.inviteEmail} onChange={(e) => setTeam((p) => ({ ...p, inviteEmail: e.target.value }))} />
                    </Field>
                    <button
                      className="btn btn-ghost"
                      disabled={!team.teamId || busy}
                      onClick={() => runAction(
                        () => teamApi.invite(team.teamId, { email: team.inviteEmail }),
                        null,
                        (data) => {
                          refreshTeamWorkspaceInfo(team.teamId);
                          setTeam((p) => ({ ...p, inviteEmail: "" }));
                          showToast(`Successfully invited ${data?.email} (Invite ID: ${data?.inviteId})`, "success");
                        }
                      )}
                    >
                      Send Email Invitation
                    </button>
                  </div>

                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: "14px", marginTop: "10px" }}>
                    <div style={{ display: "flex", gap: "10px" }}>
                      <Field label="Accept Team ID">
                        <input placeholder="Enter Team ID" value={team.teamId} onChange={(e) => setTeam((p) => ({ ...p, teamId: e.target.value }))} />
                      </Field>
                      <Field label="Accept Invite ID">
                        <input placeholder="Enter Invite ID" value={team.inviteId} onChange={(e) => setTeam((p) => ({ ...p, inviteId: e.target.value }))} />
                      </Field>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ marginTop: "6px" }}
                      disabled={!team.teamId || !team.inviteId || busy}
                      onClick={() => runAction(
                        () => teamApi.acceptInvite(team.teamId, team.inviteId),
                        null,
                        () => {
                          refreshTeamWorkspaceInfo(team.teamId);
                          setTeam((p) => ({ ...p, inviteId: "" }));
                        }
                      )}
                    >
                      Accept Workspace Invite
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

              {/* Members and Pending Invites tables */}
              {team.teamId && (
                <div className="grid-2">
                  <Panel title="Active Members" hint="Currently accepted users in this workspace." icon={<Users size={16} />}>
                    {teamMembersList.length === 0 ? (
                      <p className="panel-hint">No active members found. Refresh workspace details.</p>
                    ) : (
                      <div className="table-wrap" style={{ maxHeight: "280px", overflowY: "auto" }}>
                        <table>
                          <thead>
                            <tr>
                              <th>User Email</th>
                              <th>Joined At</th>
                            </tr>
                          </thead>
                          <tbody>
                            {teamMembersList.map((m) => (
                              <tr key={m.id}>
                                <td style={{ fontWeight: 600, color: "#fff", fontSize: "0.85rem" }}>{m.email}</td>
                                <td className="mono" style={{ fontSize: "0.78rem" }}>
                                  {m.acceptedAt ? new Date(m.acceptedAt).toLocaleDateString() : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Panel>

                  <Panel title="Pending Invitations" hint="Invited users who haven't accepted yet." icon={<Clock size={16} />}>
                    {pendingInvitesList.length === 0 ? (
                      <p className="panel-hint">No pending invitations found.</p>
                    ) : (
                      <div className="table-wrap" style={{ maxHeight: "280px", overflowY: "auto" }}>
                        <table>
                          <thead>
                            <tr>
                              <th>Email</th>
                              <th>Invited At</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pendingInvitesList.map((m) => (
                              <tr key={m.id}>
                                <td style={{ fontWeight: 600, color: "#fff", fontSize: "0.85rem" }}>{m.email}</td>
                                <td className="mono" style={{ fontSize: "0.78rem" }}>
                                  {m.invitedAt ? new Date(m.invitedAt).toLocaleDateString() : "-"}
                                </td>
                                <td>
                                  <button
                                    className="btn btn-danger btn-sm"
                                    style={{ padding: "4px 8px", background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5", border: "1px solid rgba(239, 68, 68, 0.25)" }}
                                    onClick={() => runAction(
                                      () => teamApi.cancelInvite(team.teamId, m.id),
                                      null,
                                      () => {
                                        refreshTeamWorkspaceInfo(team.teamId);
                                        showToast(`Invitation to ${m.email} successfully cancelled.`, "success");
                                      }
                                    )}
                                  >
                                    Cancel
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </Panel>
                </div>
              )}
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

      {toast && (
        <div className="toast" style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          background: toast.type === "error" ? "rgba(220, 38, 38, 0.95)" : "rgba(16, 185, 129, 0.95)",
          border: toast.type === "error" ? "1px solid #ef4444" : "1px solid #10b981",
          color: "#fff",
          padding: "12px 20px",
          borderRadius: "8px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
          zIndex: 99999,
          fontSize: "0.85rem",
          fontWeight: 600
        }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default App;
