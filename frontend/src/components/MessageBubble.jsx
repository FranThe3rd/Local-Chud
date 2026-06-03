import { motion } from "motion/react";
import { Robot, User } from "@phosphor-icons/react";
import { asText } from "../lib/text.js";
import { MarkdownBody } from "./MarkdownBody.jsx";

const enter = {
  initial: { opacity: 0, y: 14, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.98 },
  transition: { type: "spring", stiffness: 420, damping: 32 },
};

export function MessageBubble({ message, onSaveDocument }) {
  const isUser = message.role === "user";
  const isDoc = message.renderAsDocument && !isUser;
  const raw = asText(message.content);
  const streaming = !isUser && !!message.isStreaming;
  const RoleIcon = isUser ? User : Robot;

  return (
    <motion.article
      className={`message ${message.role}${!isUser ? " message-markdown" : ""}${isDoc ? " message-document" : ""}`}
      layout
      {...enter}
    >
      <div className="role">
        <RoleIcon size={12} weight="duotone" aria-hidden className="role-icon" />
        <span>{message.role}</span>
      </div>
      <motion.div
        className={`content${streaming ? " is-streaming" : ""}`}
        layout="position"
        transition={{ type: "spring", stiffness: 380, damping: 30 }}
      >
        {isUser && raw}
        {!isUser && (raw.length > 0 || streaming) && (
          <MarkdownBody source={raw} streaming={streaming} />
        )}
        {!isUser && !streaming && !raw.length && (
          <span className="no-reply">No response</span>
        )}
      </motion.div>
      {message.showSave && onSaveDocument && (
        <motion.div
          className="message-actions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.12, duration: 0.2 }}
        >
          <motion.button
            type="button"
            className="secondary"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onSaveDocument(message)}
          >
            {message.saved ? "Saved to Documents" : "Save as document"}
          </motion.button>
        </motion.div>
      )}
    </motion.article>
  );
}
