import { useCallback, useEffect, useRef, useState } from "react";
import { ChatInput } from "./components/ChatInput.jsx";
import { MessageList } from "./components/MessageList.jsx";
import { SuggestedPrompts } from "./components/SuggestedPrompts.jsx";
import { useChatStream } from "./hooks/useChatStream.js";
import {
  extractMarkdownBody,
  shouldRenderAsDocument,
  titleFromMarkdown,
} from "./lib/markdown-doc.js";

let idSeq = 1;
const nextId = () => `m-${idSeq++}`;

function normalizeLoadedMessages(messages) {
  let lastUser = "";
  return messages.map((m) => {
    if (m.role === "user") {
      lastUser = m.content;
      return { kind: "message", id: nextId(), role: "user", content: m.content };
    }
    if (m.role === "assistant") {
      const asDoc = shouldRenderAsDocument(lastUser, m.content);
      const md = extractMarkdownBody(m.content);
      return {
        kind: "message",
        id: nextId(),
        role: "assistant",
        content: m.content,
        renderAsDocument: asDoc,
        markdownBody: asDoc ? md : undefined,
        showSave: asDoc,
        saved: false,
        lastUserText: lastUser,
      };
    }
    return { kind: "message", id: nextId(), role: m.role, content: m.content };
  });
}

export function ChatApp({ ensureActiveSession, apiFetch }) {
  const [items, setItems] = useState([]);
  const [input, setInput] = useState("");
  const [agentMode, setAgentMode] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [busy, setBusy] = useState(false);
  const listRef = useRef(null);
  const { stream, stop } = useChatStream();

  const scrollEnd = useCallback(() => {
    const root = document.getElementById("chat-messages");
    if (root) root.scrollTop = root.scrollHeight;
  }, []);

  useEffect(() => {
    scrollEnd();
  }, [items, streaming, scrollEnd]);

  useEffect(() => {
    const onLoad = (e) => {
      idSeq = 1;
      setItems(normalizeLoadedMessages(e.detail || []));
    };
    window.addEventListener("localchud:chat-load", onLoad);
    return () => window.removeEventListener("localchud:chat-load", onLoad);
  }, []);

  const saveDocument = useCallback(
    async (message) => {
      const body = message.markdownBody || extractMarkdownBody(message.content);
      const title = titleFromMarkdown(body) || "Untitled";
      const res = await apiFetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: body, doc_type: "markdown" }),
      });
      if (!res.ok) throw new Error("Save failed");
      setItems((prev) =>
        prev.map((it) => (it.id === message.id ? { ...it, saved: true } : it))
      );
    },
    [apiFetch]
  );

  const send = useCallback(
    async (textOverride) => {
      const text = (textOverride ?? input).trim();
      if (!text || busy) return;

      const sessionId = await ensureActiveSession();
      if (!sessionId) {
        setItems((prev) => [
          ...prev,
          {
            kind: "message",
            id: nextId(),
            role: "assistant",
            content:
              "Could not start a chat session. Check POST /api/sessions in DevTools.",
          },
        ]);
        return;
      }

      setInput("");
      const userId = nextId();
      const assistantId = nextId();
      const documentMode = shouldRenderAsDocument(text, "");

      setItems((prev) => [
        ...prev,
        { kind: "message", id: userId, role: "user", content: text },
        {
          kind: "message",
          id: assistantId,
          role: "assistant",
          content: "",
          renderAsDocument: documentMode,
          lastUserText: text,
        },
      ]);

      setBusy(true);
      setStreaming(true);

      try {
        const result = await stream({
          sessionId,
          message: text,
          agentMode,
          onEvent: (payload, state) => {
            if (payload.type === "token") {
              setItems((prev) =>
                prev.map((it) =>
                  it.id === assistantId ? { ...it, content: state.full } : it
                )
              );
            } else if (payload.type === "tool_start") {
              setItems((prev) => [
                ...prev,
                {
                  kind: "tool",
                  id: nextId(),
                  text: `🔧 ${payload.name}(${JSON.stringify(payload.arguments)})`,
                },
              ]);
            } else if (payload.type === "tool_result") {
              const preview = JSON.stringify(payload.result).slice(0, 200);
              setItems((prev) => [
                ...prev,
                {
                  kind: "tool",
                  id: nextId(),
                  text: `↳ ${payload.name}: ${preview}…`,
                },
              ]);
            } else if (payload.type === "error") {
              setItems((prev) =>
                prev.map((it) =>
                  it.id === assistantId
                    ? {
                        ...it,
                        content: state.full
                          ? `${state.full}\n[error] ${payload.content}`
                          : String(payload.content),
                      }
                    : it
                )
              );
            }
          },
        });

        setStreaming(false);

        if (result.ok && result.full) {
          const asDoc = shouldRenderAsDocument(text, result.full);
          const md = extractMarkdownBody(result.full);
          setItems((prev) =>
            prev.map((it) =>
              it.id === assistantId
                ? {
                    ...it,
                    content: result.full,
                    renderAsDocument: asDoc,
                    markdownBody: asDoc ? md : undefined,
                    showSave: asDoc,
                  }
                : it
            )
          );
          window.dispatchEvent(new CustomEvent("localchud:sessions-refresh"));
        } else if (result.ok && !result.full) {
          setItems((prev) =>
            prev.map((it) =>
              it.id === assistantId
                ? {
                    ...it,
                    content:
                      "No reply from model. Check Settings and that Ollama is running.",
                  }
                : it
            )
          );
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setItems((prev) =>
            prev.map((it) =>
              it.id === assistantId
                ? { ...it, content: err.message || String(err) }
                : it
            )
          );
        }
        setStreaming(false);
      } finally {
        setBusy(false);
      }
    },
    [input, busy, agentMode, ensureActiveSession, stream]
  );

  const showSuggestions = items.length === 0 && !busy;

  return (
    <>
      <div id="chat-messages" className="chat-messages-root">
        <SuggestedPrompts visible={showSuggestions} onPick={(t) => send(t)} />
        <MessageList
          items={items}
          streaming={streaming}
          onSaveDocument={saveDocument}
          listRef={listRef}
        />
      </div>
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={() => send()}
        onStop={stop}
        agentMode={agentMode}
        onAgentModeChange={setAgentMode}
        disabled={busy}
        stopping={busy}
      />
    </>
  );
}
