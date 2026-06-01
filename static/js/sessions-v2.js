import { apiFetch } from "./api.js";

let currentSessionId = null;
let onSessionChange = null;
let readyPromise = null;

export function getCurrentSessionId() {
  return currentSessionId;
}

export function setOnSessionChange(fn) {
  onSessionChange = fn;
}

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.detail || data.message || `Request failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

export async function loadSessions() {
  const res = await apiFetch("/api/sessions");
  let sessions = await parseJson(res);
  if (!Array.isArray(sessions)) sessions = [];

  if (!sessions.length) {
    const created = await createSession();
    return [created];
  }

  renderSessionList(sessions);
  if (!currentSessionId) {
    await selectSession(sessions[0].id);
  }
  return sessions;
}

export async function ensureActiveSession() {
  if (readyPromise) {
    try {
      await readyPromise;
    } catch {
      /* retry below */
    }
  }
  if (currentSessionId) return currentSessionId;

  try {
    await loadSessions();
  } catch (e) {
    console.warn("loadSessions:", e);
  }
  if (currentSessionId) return currentSessionId;

  try {
    const s = await createSession();
    return s?.id ?? currentSessionId;
  } catch (e) {
    console.error("createSession:", e);
    return null;
  }
}

function renderSessionList(sessions) {
  const ul = document.getElementById("session-list");
  if (!ul) return;
  ul.innerHTML = "";
  sessions.forEach((s) => {
    const li = document.createElement("li");
    li.textContent = s.title || `Chat #${s.id}`;
    li.dataset.id = String(s.id);
    if (s.id === currentSessionId) li.classList.add("active");
    li.addEventListener("click", () => selectSession(s.id));
    ul.appendChild(li);
  });
}

export async function createSession() {
  const res = await apiFetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "New chat" }),
  });
  const session = await parseJson(res);
  currentSessionId = session.id;

  const ul = document.getElementById("session-list");
  if (ul) {
    document.querySelectorAll("#session-list li").forEach((li) => li.classList.remove("active"));
    const li = document.createElement("li");
    li.textContent = session.title || `Chat #${session.id}`;
    li.dataset.id = String(session.id);
    li.classList.add("active");
    li.addEventListener("click", () => selectSession(session.id));
    ul.prepend(li);
  }

  if (onSessionChange) onSessionChange([]);
  return session;
}

export async function selectSession(id) {
  currentSessionId = id;
  document.querySelectorAll("#session-list li").forEach((li) => {
    li.classList.toggle("active", Number(li.dataset.id) === Number(id));
  });
  const res = await apiFetch(`/api/sessions/${id}`);
  const data = await parseJson(res);
  if (onSessionChange) onSessionChange(data.messages || []);
  return data;
}

export function initSessions() {
  document.getElementById("btn-new-chat")?.addEventListener("click", () => createSession());
  readyPromise = loadSessions().catch((e) => {
    console.error("initSessions:", e);
  });
  return readyPromise;
}
