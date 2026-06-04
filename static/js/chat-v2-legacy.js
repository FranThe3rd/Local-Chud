import { apiFetch } from "./api.js";
import {
  extractMarkdownBody,
  shouldRenderAsDocument,
  titleFromMarkdown,
} from "./markdown-doc.js";
import { ensureActiveSession } from "./sessions-v2.js";

let abortController = null;
let legacyAttachments = [];

function asText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value.content === "string") return value.content;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

async function saveDocumentFromMarkdown(markdown, fallbackTitle) {
  const body = extractMarkdownBody(asText(markdown));
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

function setAssistantContent(contentEl, fullText) {
  contentEl.textContent = asText(fullText);
}

function addSaveButton(message, fullText, userText) {
  if (!shouldRenderAsDocument(userText, fullText)) return;
  if (message.querySelector(".message-actions")) return;

  const md = extractMarkdownBody(asText(fullText));
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
    const content = asText(m?.content);
    if (m.role === "user") {
      lastUserText = content;
      appendMessage(m.role, content, false);
    } else if (m.role === "assistant") {
      const { contentEl, div } = appendMessage(m.role, content, false);
      addSaveButton(div, content, lastUserText);
    } else {
      appendMessage(m.role, content, false);
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
  contentEl.textContent = asText(content);
  container.appendChild(div);
  if (scroll) container.scrollTop = container.scrollHeight;
  return { contentEl, div };
}

function appendToolEvent(text) {
  const container = document.getElementById("chat-messages");
  const el = document.createElement("div");
  el.className = "tool-event";
  el.textContent = asText(text);
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
  const p = payload && typeof payload === "object" ? payload : {};
  if (p.type === "token") {
    const piece = asText(p.content);
    if (piece) state.full += piece;
    setAssistantContent(assistantEl, state.full);
    document.getElementById("chat-messages").scrollTop =
      document.getElementById("chat-messages").scrollHeight;
  } else if (p.type === "done") {
    const full = asText(p.content);
    if (full) state.full = full;
    setAssistantContent(assistantEl, state.full);
  } else if (p.type === "tool_start") {
    appendToolEvent(`🔧 ${asText(p.name)}(${JSON.stringify(p.arguments ?? {})})`);
  } else if (p.type === "tool_result") {
    const preview = asText(JSON.stringify(p.result ?? {})).slice(0, 200);
    appendToolEvent(`↳ ${asText(p.name)}: ${preview}…`);
  } else if (p.type === "error") {
    const errMsg = asText(p.content);
    setAssistantContent(
      assistantEl,
      state.full ? `${state.full}\n[error] ${errMsg}` : errMsg
    );
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

export async function sendMessage(text, agentMode, displayText) {
  const sessionId = await ensureActiveSession();
  if (!sessionId) {
    appendMessage(
      "assistant",
      "Could not start a chat session. Open DevTools → Network and check POST /api/sessions."
    );
    return;
  }

  const userText = asText(displayText || text);
  appendMessage("user", userText);
  const { contentEl: assistantEl, div: assistantDiv } = appendMessage("assistant", "…");
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
        message: asText(text),
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
      setAssistantContent(assistantEl, `Error: ${asText(err)}`);
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

    const finalText = asText(state.full);
    if (!finalText) {
      setAssistantContent(
        assistantEl,
        "No reply from model. Check Settings (model name) and that Ollama is running."
      );
    } else {
      setAssistantContent(assistantEl, finalText);
      addSaveButton(assistantDiv, finalText, userText);
    }
    window.dispatchEvent(new CustomEvent("localllm:sessions-refresh"));
  } catch (err) {
    if (err.name !== "AbortError") {
      setAssistantContent(assistantEl, state.full || asText(err.message));
    }
  } finally {
    document.getElementById("btn-send")?.removeAttribute("disabled");
    document.getElementById("btn-stop")?.setAttribute("disabled", "");
    abortController = null;
  }
}

export function initChat() {
  const input = document.getElementById("chat-input");
  const fileInput = document.getElementById("chat-file-input");
  const attachButton = document.getElementById("btn-attach-file");

  attachButton?.addEventListener("click", () => fileInput?.click());
  fileInput?.addEventListener("change", () => {
    legacyAttachments = Array.from(fileInput.files || []);
    attachButton.textContent = legacyAttachments.length ? `+ ${legacyAttachments.length}` : "+";
  });

  const send = async () => {
    const text = input?.value?.trim();
    if (!text && !legacyAttachments.length) return;
    const agentMode = document.getElementById("agent-mode")?.checked || false;
    let fileContext = "";
    for (const file of legacyAttachments) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Upload failed: ${file.name}`);
      }
      const data = await res.json();
      if (data.text) {
        fileContext += `\n\n--- File: ${file.name} ---\n${data.text}`;
      }
    }
    const message = fileContext ? `${text}\n${fileContext}` : text;
    const displayText = text || legacyAttachments.map((f) => f.name).join(", ");
    input.value = "";
    legacyAttachments = [];
    if (fileInput) fileInput.value = "";
    if (attachButton) attachButton.textContent = "+";
    try {
      await sendMessage(message, agentMode, displayText);
    } catch (err) {
      appendMessage("assistant", asText(err.message));
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
