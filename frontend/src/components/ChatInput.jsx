import { useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, Paperclip, Robot, Stop, X } from "@phosphor-icons/react";

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  agentMode,
  onAgentModeChange,
  disabled,
  stopping,
  attachments,
  onAttach,
  onRemoveAttachment,
}) {
  const fileRef = useRef(null);

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach((f) => onAttach(f));
    e.target.value = "";
  };

  const canSend = !disabled && (value.trim().length > 0 || (attachments?.length > 0));

  return (
    <motion.div
      className="gpt-input-wrap"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 32, delay: 0.05 }}
    >
      <div className="gpt-input-box">
        {/* Attachment previews */}
        <AnimatePresence>
          {attachments?.length > 0 && (
            <motion.div
              className="gpt-attachments"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            >
              {attachments.map((a) => (
                <motion.div
                  key={a.id}
                  className="gpt-attachment-chip"
                  initial={{ opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.88 }}
                  transition={{ type: "spring", stiffness: 480, damping: 28 }}
                  layout
                >
                  <Paperclip size={12} weight="bold" aria-hidden />
                  <span className="gpt-attachment-name">{a.name}</span>
                  <button
                    type="button"
                    className="gpt-attachment-remove"
                    onClick={() => onRemoveAttachment(a.id)}
                    aria-label={`Remove ${a.name}`}
                  >
                    <X size={11} weight="bold" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main textarea row */}
        <div className="gpt-input-row">
          {/* Left actions */}
          <div className="gpt-input-actions gpt-input-actions--left">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".txt,.md,.pdf,.csv,.json,.py,.js,.ts,.jsx,.tsx,.html,.css,.xml,.yaml,.yml"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="gpt-icon-btn"
              title="Attach a file"
              onClick={() => fileRef.current?.click()}
              aria-label="Attach file"
            >
              <Paperclip size={18} weight="regular" />
            </button>
          </div>

          {/* Textarea */}
          <textarea
            id="chat-input"
            className="gpt-textarea"
            rows={1}
            placeholder="Ask anything…"
            value={value}
            disabled={disabled}
            onChange={(e) => {
              onChange(e.target.value);
              // auto-grow
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
            }}
            onKeyDown={handleKey}
          />

          {/* Right actions */}
          <div className="gpt-input-actions gpt-input-actions--right">
            <motion.button
              type="button"
              className={`gpt-icon-btn agent-dot-btn${agentMode ? " agent-dot-btn--on" : ""}`}
              title={agentMode ? "Agent ON — click to disable" : "Agent OFF — click to enable tools"}
              onClick={() => onAgentModeChange(!agentMode)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              aria-pressed={agentMode}
            >
              <Robot size={18} weight={agentMode ? "fill" : "regular"} />
            </motion.button>

            {stopping ? (
              <motion.button
                type="button"
                className="gpt-send-btn gpt-send-btn--stop"
                onClick={onStop}
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.94 }}
                aria-label="Stop"
              >
                <Stop size={16} weight="fill" />
              </motion.button>
            ) : (
              <motion.button
                type="button"
                className={`gpt-send-btn${canSend ? "" : " gpt-send-btn--disabled"}`}
                disabled={!canSend}
                onClick={onSend}
                whileHover={canSend ? { scale: 1.06 } : undefined}
                whileTap={canSend ? { scale: 0.94 } : undefined}
                aria-label="Send"
              >
                <ArrowUp size={16} weight="bold" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Bottom hint */}
        {agentMode && (
          <motion.div
            className="gpt-agent-hint"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            Agent mode — can search the web, read files, save documents
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
