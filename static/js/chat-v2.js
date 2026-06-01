/**
 * Chat entry — Motion React bundle with vanilla fallback.
 */
import { apiFetch } from "./api.js";
import { ensureActiveSession } from "./sessions-v2.js";

let legacy = null;

async function loadBundle() {
  try {
    return await import("./chat-bundle.js");
  } catch (e) {
    console.warn("chat-bundle missing — run: cd frontend && npm install && npm run build", e);
    return null;
  }
}

export async function initChat() {
  const bundle = await loadBundle();
  if (bundle?.mountChatApp) {
    bundle.mountChatApp({ ensureActiveSession, apiFetch });
    return;
  }
  if (!legacy) {
    legacy = await import("./chat-v2-legacy.js");
  }
  legacy.initChat();
}

export async function renderMessages(messages) {
  const bundle = await loadBundle();
  if (bundle?.renderMessages) {
    bundle.renderMessages(messages);
    return;
  }
  if (!legacy) {
    legacy = await import("./chat-v2-legacy.js");
  }
  return legacy.renderMessages(messages);
}
