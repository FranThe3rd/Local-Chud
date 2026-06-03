import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { ChatInput } from "./components/ChatInput.jsx";
import { MessageList } from "./components/MessageList.jsx";
import { SuggestedPrompts } from "./components/SuggestedPrompts.jsx";
import { useChatStream } from "./hooks/useChatStream.js";
import {
  extractMarkdownBody,
  shouldRenderAsDocument,
  titleFromMarkdown,
} from "./lib/markdown-doc.js";
import { asText } from "./lib/text.js";

let idSeq = 1;
const nextId = () => `m-${idSeq++}`;

function normalizeLoadedMessages(messages) {
  let lastUser = "";
  return messages.map((m) => {
    const content = asText(m?.content);
    if (m.role === "user") {
      lastUser = content;
      return { kind: "message", id: nextId(), role: "user", content };
    }
    if (m.role === "assistant") {
      const asDoc = shouldRenderAsDocument(lastUser, content);
      return {
        kind: "message",
        id: nextId(),
        role: "assistant",
        content,
        renderAsDocument: asDoc,
        showSave: asDoc,
        saved: false,
        lastUserText: lastUser,
      };
    }
    return { kind: "message", id: nextId(), role: m.role, content };
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
      const body = extractMarkdownBody(asText(message.content));
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
      const text = asText(textOverride ?? input).trim();
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
      setItems((prev) => [
        ...prev,
        { kind: "message", id: userId, role: "user", content: text },
        {
          kind: "message",
          id: assistantId,
          role: "assistant",
          content: "",
          isStreaming: true,
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
            const chunk = asText(state?.full);
            if (payload.type === "token") {
              setItems((prev) =>
                prev.map((it) =>
                  it.id === assistantId
                    ? { ...it, content: chunk, isStreaming: true }
                    : it
                )
              );
            } else if (payload.type === "tool_start") {
              setItems((prev) => [
                ...prev,
                {
                  kind: "tool",
                  id: nextId(),
                  variant: "start",
                  name: asText(payload.name),
                  detail: JSON.stringify(payload.arguments ?? {}),
                },
              ]);
            } else if (payload.type === "tool_result") {
              const preview = asText(JSON.stringify(payload.result ?? {})).slice(0, 200);
              setItems((prev) => [
                ...prev,
                {
                  kind: "tool",
                  id: nextId(),
                  variant: "result",
                  name: asText(payload.name),
                  detail: preview,
                },
              ]);
            } else if (payload.type === "error") {
              const errMsg = asText(payload.content);
              setItems((prev) =>
                prev.map((it) =>
                  it.id === assistantId
                    ? {
                        ...it,
                        content: chunk ? `${chunk}\n[error] ${errMsg}` : errMsg,
                        isStreaming: false,
                      }
                    : it
                )
              );
            }
          },
        });

        if (result.ok) {
          setItems((prev) => {
            const current = prev.find((it) => it.id === assistantId);
            const streamed = asText(current?.content);
            const finalText = asText(result.full) || streamed;

            if (!finalText) {
              return prev.map((it) =>
                it.id === assistantId
                  ? {
                      ...it,
                      content:
                        "No reply from model. Check Settings and that Ollama is running.",
                      isStreaming: false,
                    }
                  : it
              );
            }

            const asDoc = shouldRenderAsDocument(text, finalText);
            return prev.map((it) =>
              it.id === assistantId
                ? {
                    ...it,
                    content: finalText,
                    renderAsDocument: asDoc,
                    showSave: asDoc,
                    isStreaming: false,
                  }
                : it
            );
          });
          setStreaming(false);
          window.dispatchEvent(new CustomEvent("localchud:sessions-refresh"));
        } else {
          setStreaming(false);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setItems((prev) =>
            prev.map((it) =>
              it.id === assistantId
                ? { ...it, content: asText(err.message), isStreaming: false }
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
        <AnimatePresence>
          {showSuggestions && (
            <SuggestedPrompts key="suggestions" onPick={(t) => send(t)} />
          )}
        </AnimatePresence>
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
