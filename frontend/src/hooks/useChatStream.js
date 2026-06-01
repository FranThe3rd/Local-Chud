import { useCallback, useRef } from "react";
import { asText } from "../lib/text.js";

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

function appendToken(state, payload) {
  const piece = asText(payload?.content);
  if (!piece) return;
  state.full += piece;
}

function applyDone(state, payload) {
  const full = asText(payload?.content);
  if (full) state.full = full;
}

export function useChatStream() {
  const abortRef = useRef(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const stream = useCallback(async ({ sessionId, message, agentMode, onEvent }) => {
    abortRef.current = new AbortController();
    let res;
    try {
      res = await fetch("/api/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ session_id: sessionId, message, agent_mode: agentMode }),
        signal: abortRef.current.signal,
      });
    } catch (err) {
      abortRef.current = null;
      if (err.name === "AbortError") throw err;
      const hint =
        err.message === "Failed to fetch"
          ? "Cannot reach the server. Is ./run.sh running on this port?"
          : asText(err.message);
      onEvent({ type: "error", content: hint }, { full: "" });
      return { ok: false, full: "" };
    }

    if (res.status === 401) {
      window.location.href = "/login";
      return { ok: false, full: "" };
    }
    if (!res.ok) {
      const err = await res.text();
      onEvent({ type: "error", content: asText(err) }, { full: "" });
      return { ok: false, full: "" };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const state = { full: "" };

    const drain = () => {
      const normalized = buffer.replace(/\r\n/g, "\n");
      const parts = normalized.split("\n\n");
      buffer = parts.pop() || "";
      for (const part of parts) {
        const dataLine = extractSseData(part);
        if (!dataLine) continue;
        try {
          const payload = JSON.parse(dataLine);
          if (payload.type === "token") {
            appendToken(state, payload);
          } else if (payload.type === "done") {
            applyDone(state, payload);
          }
          onEvent(
            {
              ...payload,
              content: asText(payload?.content),
            },
            { full: state.full }
          );
        } catch {
          /* ignore malformed SSE */
        }
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      drain();
    }
    buffer += "\n\n";
    drain();

    abortRef.current = null;
    return { ok: true, full: asText(state.full) };
  }, []);

  return { stream, stop, isStreaming: () => !!abortRef.current };
}
