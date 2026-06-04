import { apiFetch } from "./api.js";

const NEW_CHAT_TITLE = "New chat";

let currentSessionId = null;
let onSessionChange = null;
let readyPromise = null;

export function getCurrentSessionId() {
  return currentSessionId;
}

export function setOnSessionChange(fn) {
  onSessionChange = fn;
}

function isProtectedSession(session) {
  return (session.title || "").trim() === NEW_CHAT_TITLE;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function animateOut(el, { delay = 0 } = {}) {
  if (!el) return Promise.resolve();
  if (prefersReducedMotion()) {
    el.remove();
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const run = () => {
      const finish = () => {
        el.remove();
        resolve();
      };
      el.classList.add("session-item--exit");
      el.addEventListener("animationend", finish, { once: true });
      setTimeout(finish, 380);
    };
    if (delay) setTimeout(run, delay);
    else run();
  });
}

async function animateAllOut(items) {
  const list = [...items];
  if (!list.length) return;
  if (prefersReducedMotion()) {
    list.forEach((el) => el.remove());
    return;
  }
  await Promise.all(list.map((el, i) => animateOut(el, { delay: i * 45 })));
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
  if (!currentSessionId || !sessions.some((s) => s.id === currentSessionId)) {
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
    ul.appendChild(createSessionItem(s));
  });
}

function createSessionItem(session, { animate = false } = {}) {
  const li = document.createElement("li");
  li.className = "session-item";
  li.dataset.id = String(session.id);
  if (session.id === currentSessionId) li.classList.add("active");
  if (isProtectedSession(session)) {
    li.dataset.protected = "true";
    li.classList.add("session-item--protected");
  }
  if (animate) li.classList.add("session-item--enter");

  const label = document.createElement("span");
  label.className = "session-item-label";
  label.textContent = session.title || `Chat #${session.id}`;
  label.title = session.title || `Chat #${session.id}`;

  li.appendChild(label);

  if (!isProtectedSession(session)) {
    const del = document.createElement("button");
    del.type = "button";
    del.className = "session-delete-btn";
    del.setAttribute("aria-label", `Delete ${session.title || "chat"}`);
    del.title = "Delete chat";
    del.textContent = "×";
    del.addEventListener("click", (e) => {
      deleteSession(session.id, e);
    });
    li.appendChild(del);
  }

  li.addEventListener("click", () => selectSession(session.id));
  return li;
}

export async function createSession() {
  const res = await apiFetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: NEW_CHAT_TITLE }),
  });
  const session = await parseJson(res);
  currentSessionId = session.id;

  const ul = document.getElementById("session-list");
  if (ul) {
    document.querySelectorAll("#session-list li").forEach((li) => li.classList.remove("active"));
    ul.prepend(createSessionItem(session, { animate: true }));
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

export async function deleteSession(id, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const li = document.querySelector(`#session-list li[data-id="${id}"]`);
  if (li?.dataset.protected === "true") return;

  const title = li?.querySelector(".session-item-label")?.textContent || "this chat";
  if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;

  const wasActive = currentSessionId === id;
  const anim = animateOut(li);

  try {
    const res = await apiFetch(`/api/sessions/${id}`, { method: "DELETE" });
    await parseJson(res);
    await anim;

    if (wasActive) {
      currentSessionId = null;
      await loadSessions();
    }
  } catch (err) {
    await anim;
    console.error("deleteSession:", err);
    await loadSessions();
  }
}

export async function deleteAllSessions() {
  if (!confirm("Delete all chats? This cannot be undone.")) return;

  const ul = document.getElementById("session-list");
  const items = ul ? [...ul.querySelectorAll("li")] : [];
  const anim = animateAllOut(items);

  try {
    const res = await apiFetch("/api/sessions", { method: "DELETE" });
    await parseJson(res);
    await anim;

    currentSessionId = null;
    if (ul) ul.innerHTML = "";
    await createSession();
  } catch (err) {
    await anim;
    console.error("deleteAllSessions:", err);
    await loadSessions();
  }
}

export function initSessions() {
  document.getElementById("btn-new-chat")?.addEventListener("click", () => createSession());
  document.getElementById("btn-delete-all-chats")?.addEventListener("click", () => {
    deleteAllSessions().catch((e) => console.error("deleteAllSessions:", e));
  });
  window.addEventListener("localllm:sessions-refresh", () => {
    loadSessions().catch((e) => console.error("sessions refresh:", e));
  });
  readyPromise = loadSessions().catch((e) => {
    console.error("initSessions:", e);
  });
  return readyPromise;
}
