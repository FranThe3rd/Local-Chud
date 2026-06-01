import { AnimatePresence } from "motion/react";
import { MessageBubble } from "./MessageBubble.jsx";
import { ToolEvent } from "./ToolEvent.jsx";
import { TypingIndicator } from "./TypingIndicator.jsx";

export function MessageList({
  items,
  streaming,
  onSaveDocument,
  listRef,
}) {
  return (
    <div className="chat-messages-inner" ref={listRef}>
      <AnimatePresence initial={false} mode="popLayout">
        {items.map((item) => {
          if (item.kind === "tool") {
            return <ToolEvent key={item.id} text={item.text} />;
          }
          return (
            <MessageBubble
              key={item.id}
              message={item}
              onSaveDocument={onSaveDocument}
            />
          );
        })}
        {streaming && <TypingIndicator key="typing" />}
      </AnimatePresence>
    </div>
  );
}
