import { motion } from "motion/react";

export function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  agentMode,
  onAgentModeChange,
  disabled,
  stopping,
}) {
  return (
    <motion.div
      className="chat-input-area"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 380, damping: 32, delay: 0.05 }}
    >
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={agentMode}
          onChange={(e) => onAgentModeChange(e.target.checked)}
        />
        Agent
      </label>
      <textarea
        id="chat-input"
        rows={2}
        placeholder="Message… Documents, code, web search (enable Agent)"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
      />
      <motion.button
        type="button"
        id="btn-send"
        disabled={disabled}
        whileHover={disabled ? undefined : { scale: 1.05 }}
        whileTap={disabled ? undefined : { scale: 0.94 }}
        onClick={onSend}
      >
        Send
      </motion.button>
      <motion.button
        type="button"
        className="secondary"
        id="btn-stop"
        disabled={!stopping}
        whileHover={stopping ? { scale: 1.04 } : undefined}
        whileTap={stopping ? { scale: 0.96 } : undefined}
        onClick={onStop}
      >
        Stop
      </motion.button>
    </motion.div>
  );
}
