/** Shared UI: panels, header model pill, status bar */

const PANEL_IDS = {
  chat: "chat-panel",
  settings: "settings-panel",
  documents: "documents-panel",
  memory: "memory-panel",
  research: "research-panel",
  compare: "compare-panel",
  cookbook: "cookbook-panel",
  tasks: "tasks-panel",
  email: "email-panel",
  calendar: "calendar-panel",
};

const panelHooks = {};

export function onPanelShow(name, fn) {
  panelHooks[name] = fn;
}

export function showPanel(name) {
  document.querySelectorAll(".panel").forEach((p) => {
    p.classList.remove("active");
    p.removeAttribute("data-enter");
  });
  const id = PANEL_IDS[name];
  const panel = id ? document.getElementById(id) : null;
  if (panel) {
    panel.classList.add("active");
    requestAnimationFrame(() => panel.setAttribute("data-enter", "1"));
  }
  if (panelHooks[name]) panelHooks[name]();
}

export function setHeaderModel(label, online) {
  const el = document.getElementById("header-model");
  if (!el) return;
  el.textContent = label || "no model";
  el.classList.toggle("online", !!online);
}

export function setStatus(id, ok, text) {
  const dot = document.getElementById(id);
  if (dot) {
    dot.classList.toggle("ok", ok);
    dot.classList.toggle("warn", !ok);
  }
  const msg = document.getElementById("status-msg");
  if (msg && text) msg.textContent = text;
}

export function setOllamaStatus(ok, model) {
  const dot = document.getElementById("status-ollama");
  const label = document.getElementById("status-ollama-label");
  if (dot) {
    dot.classList.toggle("ok", ok);
    dot.classList.toggle("warn", !ok);
  }
  if (label) {
    const name = (model || "").trim();
    if (ok) label.textContent = name ? `Ollama · ${name}` : "Ollama";
    else label.textContent = name ? `Ollama offline · ${name}` : "Ollama offline";
  }
}

export async function refreshHeaderFromSettings() {
  try {
    const res = await fetch("/api/settings/models", { credentials: "same-origin" });
    const data = await res.json();
    const llm = await fetch("/api/settings/llm", { credentials: "same-origin" }).then((r) => r.json());
    const model = llm.model || "—";
    setHeaderModel(model, data.reachable === true);
    setOllamaStatus(data.reachable === true, model);
  } catch {
    setOllamaStatus(false);
    const msg = document.getElementById("status-msg");
    if (msg) msg.textContent = "settings error";
  }
  setStatus("status-app", true, "LocalLLM ok");
}
