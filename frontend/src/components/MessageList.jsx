import { AnimatePresence } from "motion/react";
import { MessageBubble } from "./MessageBubble.jsx";
import { ToolEvent } from "./ToolEvent.jsx";
import { TypingIndicator } from "./TypingIndicator.jsx";

export function MessageList({ items, streaming, onSaveDocument, listRef }) {
  const showTyping =
    streaming &&
    !items.some((it) => it.kind === "message" && it.role === "assistant" && it.isStreaming);

  return (
    <div className="chat-messages-inner" ref={listRef}>
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((item) => {
          if (item.kind === "tool") {
            return (
              <ToolEvent
                key={item.id}
                variant={item.variant}
                name={item.name}
                detail={item.detail}
              />
            );
          }
          return (
            <MessageBubble
              key={item.id}
              message={item}
              onSaveDocument={onSaveDocument}
            />
          );
        })}
      </AnimatePresence>
      <AnimatePresence>
        {showTyping && <TypingIndicator key="typing" />}
      </AnimatePresence>
    </div>
  );
}
