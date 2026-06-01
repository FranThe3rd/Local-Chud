import { apiFetch } from "./api.js";
import { ensureActiveSession } from "./sessions-v2.js";

let abortController = null;

export function renderMessages(messages) {
  const container = document.getElementById("chat-messages");
  if (!container) return;
  container.innerHTML = "";
  messages.forEach((m) => appendMessage(m.role, m.content, false));
}

function appendMessage(role, content, scroll = true) {
  const container = document.getElementById("chat-messages");
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.innerHTML = `<div class="role">${role}</div><div class="content"></div>`;
  div.querySelector(".content").textContent = content;
  container.appendChild(div);
  if (scroll) container.scrollTop = container.scrollHeight;
  return div.querySelector(".content");
}

function appendToolEvent(text) {
  const container = document.getElementById("chat-messages");
  const el = document.createElement("div");
  el.className = "tool-event";
  el.textContent = text;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

/** Parse SSE chunks (sse-starlette uses \\r\\n — splitting on \\n\\n alone misses events). */
function extractSseData(block) {
  let dataLine = "";
  for (const line of block.split("\n")) {
    const trimmed = line.replace(/\r$/, "").trim();
    if (trimmed.startsWith("data:")) {
      dataLine = trimmed.slice(5).trim();
    }
  }
  return dataLine;
}

function processSsePayload(payload, assistantEl, state) {
  if (payload.type === "token" && typeof payload.content === "string") {
    state.full += payload.content;
    assistantEl.textContent = state.full;
    document.getElementById("chat-messages").scrollTop =
      document.getElementById("chat-messages").scrollHeight;
  } else if (payload.type === "tool_start") {
    appendToolEvent(`🔧 ${payload.name}(${JSON.stringify(payload.arguments)})`);
  } else if (payload.type === "tool_result") {
    const preview = JSON.stringify(payload.result).slice(0, 200);
    appendToolEvent(`↳ ${payload.name}: ${preview}…`);
  } else if (payload.type === "error") {
    assistantEl.textContent = state.full
      ? `${state.full}\n[error] ${payload.content}`
      : String(payload.content);
  }
}

function drainSseBuffer(buffer, assistantEl, state) {
  const normalized = buffer.replace(/\r\n/g, "\n");
  const parts = normalized.split("\n\n");
  const rest = parts.pop() || "";
  for (const part of parts) {
    const dataLine = extractSseData(part);
    if (!dataLine) continue;
    try {
      processSsePayload(JSON.parse(dataLine), assistantEl, state);
    } catch {
      /* ignore malformed */
    }
  }
  return rest;
}

export async function sendMessage(text, agentMode) {
  const sessionId = await ensureActiveSession();
  if (!sessionId) {
    appendMessage(
      "assistant",
      "Could not start a chat session. Open DevTools → Network and check POST /api/sessions. (Not related to Ollama.)"
    );
    return;
  }

  appendMessage("user", text);
  const assistantEl = appendMessage("assistant", "…");
  const state = { full: "" };

  abortController = new AbortController();
  document.getElementById("btn-send").disabled = true;
  document.getElementById("btn-stop").disabled = false;

  try {
    const res = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        session_id: sessionId,
        message: text,
        agent_mode: agentMode,
      }),
      signal: abortController.signal,
    });

    if (res.status === 401) {
      window.location.href = "/login";
      return;
    }
    if (!res.ok) {
      const err = await res.text();
      assistantEl.textContent = `Error: ${err}`;
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      buffer = drainSseBuffer(buffer, assistantEl, state);
    }
    buffer = drainSseBuffer(buffer + "\n\n", assistantEl, state);

    if (!state.full) {
      assistantEl.textContent =
        "No reply from model. Check Settings (model name) and that Ollama is running.";
    }
  } catch (err) {
    if (err.name !== "AbortError") {
      assistantEl.textContent = state.full || `Failed: ${err.message}`;
    }
  } finally {
    document.getElementById("btn-send").disabled = false;
    document.getElementById("btn-stop").disabled = true;
    abortController = null;
  }
}

export function initChat() {
  const input = document.getElementById("chat-input");
  const send = async () => {
    const text = input?.value?.trim();
    if (!text) return;
    const agentMode = document.getElementById("agent-mode")?.checked || false;
    input.value = "";
    try {
      await sendMessage(text, agentMode);
    } catch (err) {
      appendMessage("assistant", err.message || String(err));
    }
  };

  document.getElementById("btn-send")?.addEventListener("click", send);
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  document.getElementById("btn-stop")?.addEventListener("click", () => {
    abortController?.abort();
  });
}
