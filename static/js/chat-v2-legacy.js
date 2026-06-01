import { apiFetch } from "./api.js";
import {
  extractMarkdownBody,
  shouldRenderAsDocument,
  titleFromMarkdown,
} from "./markdown-doc.js";
import { renderMarkdown } from "./markdown-render.js";
import { ensureActiveSession } from "./sessions-v2.js";

let abortController = null;

async function saveDocumentFromMarkdown(markdown, fallbackTitle) {
  const body = extractMarkdownBody(markdown);
  const title = titleFromMarkdown(body) || fallbackTitle || "Untitled";
  const res = await apiFetch("/api/documents", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content: body, doc_type: "markdown" }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Could not save document");
  }
  return res.json();
}

async function finalizeDocumentMessage(contentEl, fullText, userText) {
  const md = extractMarkdownBody(fullText);
  try {
    await renderMarkdown(contentEl, md);
  } catch (e) {
    console.error("markdown render:", e);
    contentEl.textContent = fullText;
  }

  const message = contentEl.closest(".message");
  if (!message || message.querySelector(".message-actions")) return;

  const actions = document.createElement("div");
  actions.className = "message-actions";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "secondary";
  btn.textContent = "Save as document";
  btn.addEventListener("click", async () => {
    btn.disabled = true;
    try {
      await saveDocumentFromMarkdown(md, userText);
      btn.textContent = "Saved to Documents";
    } catch (err) {
      btn.textContent = "Save failed";
      btn.disabled = false;
      console.error(err);
    }
  });
  actions.appendChild(btn);
  message.appendChild(actions);
}

export async function renderMessages(messages) {
  const container = document.getElementById("chat-messages");
  if (!container) return;
  container.innerHTML = "";
  let lastUserText = "";
  for (const m of messages) {
    if (m.role === "user") {
      lastUserText = m.content;
      appendMessage(m.role, m.content, false);
    } else if (m.role === "assistant") {
      const { contentEl } = appendMessage(m.role, m.content, false);
      if (shouldRenderAsDocument(lastUserText, m.content)) {
        await finalizeDocumentMessage(contentEl, m.content, lastUserText);
      }
    } else {
      appendMessage(m.role, m.content, false);
    }
  }
  container.scrollTop = container.scrollHeight;
}

function appendMessage(role, content, scroll = true) {
  const container = document.getElementById("chat-messages");
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.innerHTML = `<div class="role">${role}</div><div class="content"></div>`;
  const contentEl = div.querySelector(".content");
  contentEl.textContent = content || "";
  container.appendChild(div);
  if (scroll) container.scrollTop = container.scrollHeight;
  return { contentEl, div };
}

function appendToolEvent(text) {
  const container = document.getElementById("chat-messages");
  const el = document.createElement("div");
  el.className = "tool-event";
  el.textContent = text;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

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
      /* ignore */
    }
  }
  return rest;
}

export async function sendMessage(text, agentMode) {
  const sessionId = await ensureActiveSession();
  if (!sessionId) {
    appendMessage(
      "assistant",
      "Could not start a chat session. Open DevTools → Network and check POST /api/sessions."
    );
    return;
  }

  appendMessage("user", text);
  const { contentEl: assistantEl } = appendMessage("assistant", "…");
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
    } else if (shouldRenderAsDocument(text, state.full)) {
      await finalizeDocumentMessage(assistantEl, state.full, text);
    }
    window.dispatchEvent(new CustomEvent("localchud:sessions-refresh"));
  } catch (err) {
    if (err.name !== "AbortError") {
      assistantEl.textContent = state.full || `Failed: ${err.message}`;
    }
  } finally {
    document.getElementById("btn-send")?.removeAttribute?.("disabled");
    document.getElementById("btn-stop")?.setAttribute?.("disabled", "");
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
