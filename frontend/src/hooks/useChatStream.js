import { useCallback, useRef } from "react";

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

export function useChatStream() {
  const abortRef = useRef(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const stream = useCallback(async ({ sessionId, message, agentMode, onEvent }) => {
    abortRef.current = new AbortController();
    const res = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ session_id: sessionId, message, agent_mode: agentMode }),
      signal: abortRef.current.signal,
    });

    if (res.status === 401) {
      window.location.href = "/login";
      return { ok: false };
    }
    if (!res.ok) {
      const err = await res.text();
      onEvent({ type: "error", content: err });
      return { ok: false };
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
          if (payload.type === "token" && typeof payload.content === "string") {
            state.full += payload.content;
          }
          onEvent(payload, state);
        } catch {
          /* ignore */
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
    return { ok: true, full: state.full };
  }, []);

  return { stream, stop, isStreaming: () => !!abortRef.current };
}
