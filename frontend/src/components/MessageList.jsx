import { MessageBubble } from "./MessageBubble.jsx";
import { ToolEvent } from "./ToolEvent.jsx";
import { TypingIndicator } from "./TypingIndicator.jsx";

export function MessageList({ items, streaming, onSaveDocument, listRef }) {
  const showTyping =
    streaming &&
    !items.some((it) => it.kind === "message" && it.role === "assistant" && it.isStreaming);

  return (
    <div className="chat-messages-inner" ref={listRef}>
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
      {showTyping && <TypingIndicator />}
    </div>
  );
}
