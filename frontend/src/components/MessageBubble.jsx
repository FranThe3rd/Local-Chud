import { asText } from "../lib/text.js";
import { MarkdownBody } from "./MarkdownBody.jsx";

export function MessageBubble({ message, onSaveDocument }) {
  const isUser = message.role === "user";
  const isDoc = message.renderAsDocument && !isUser;
  const raw = asText(message.content);
  const streaming = !isUser && !!message.isStreaming;

  return (
    <article
      className={`message ${message.role}${!isUser ? " message-markdown" : ""}${isDoc ? " message-document" : ""}`}
    >
      <div className="role">{message.role}</div>
      <div className={`content${streaming ? " is-streaming" : ""}`}>
        {isUser && raw}
        {!isUser && (raw.length > 0 || streaming) && (
          <MarkdownBody source={raw} streaming={streaming} />
        )}
        {!isUser && !streaming && !raw.length && (
          <span className="no-reply">No response</span>
        )}
      </div>
      {message.showSave && onSaveDocument && (
        <div className="message-actions">
          <button
            type="button"
            className="secondary"
            onClick={() => onSaveDocument(message)}
          >
            {message.saved ? "Saved to Documents" : "Save as document"}
          </button>
        </div>
      )}
    </article>
  );
}
