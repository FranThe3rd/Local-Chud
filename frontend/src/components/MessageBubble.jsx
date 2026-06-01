import { motion } from "motion/react";
import { MarkdownBody } from "./MarkdownBody.jsx";

export function MessageBubble({ message, onSaveDocument }) {
  const isUser = message.role === "user";
  const isDoc = message.renderAsDocument && !isUser;
  const body = message.markdownBody ?? message.content;

  return (
    <motion.article
      className={`message ${message.role}${isDoc ? " message-document" : ""}`}
      layout
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 420, damping: 30 }}
    >
      <div className="role">{message.role}</div>
      <motion.div
        className="content"
        layout
        whileHover={isUser ? undefined : { borderColor: "var(--accent-dim)" }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
      >
        {isDoc ? <MarkdownBody content={body} /> : message.content}
      </motion.div>
      {message.showSave && onSaveDocument && (
        <motion.div
          className="message-actions"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <motion.button
            type="button"
            className="secondary"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onSaveDocument(message)}
          >
            {message.saved ? "Saved to Documents" : "Save as document"}
          </motion.button>
        </motion.div>
      )}
    </motion.article>
  );
}
