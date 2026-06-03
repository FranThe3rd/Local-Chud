import { motion } from "motion/react";
import { PaperPlaneTilt, Robot, Stop } from "@phosphor-icons/react";

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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 30, delay: 0.04 }}
    >
      <label className="checkbox-row agent-toggle">
        <input
          type="checkbox"
          checked={agentMode}
          onChange={(e) => onAgentModeChange(e.target.checked)}
        />
        <motion.span
          className="agent-toggle-icon"
          animate={{
            color: agentMode ? "var(--accent)" : "var(--text-dim)",
            scale: agentMode ? 1.08 : 1,
          }}
          transition={{ type: "spring", stiffness: 500, damping: 28 }}
        >
          <Robot size={16} weight={agentMode ? "fill" : "regular"} aria-hidden />
        </motion.span>
        Agent
      </label>
      <motion.textarea
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
        whileFocus={{ boxShadow: "0 0 0 2px var(--accent-soft)" }}
        transition={{ duration: 0.15 }}
      />
      <motion.button
        type="button"
        id="btn-send"
        className="btn-with-icon"
        disabled={disabled}
        whileHover={disabled ? undefined : { scale: 1.04, y: -1 }}
        whileTap={disabled ? undefined : { scale: 0.95 }}
        transition={{ type: "spring", stiffness: 500, damping: 26 }}
        onClick={onSend}
      >
        <PaperPlaneTilt size={16} weight="fill" aria-hidden />
        Send
      </motion.button>
      <motion.button
        type="button"
        className="secondary btn-with-icon"
        id="btn-stop"
        disabled={!stopping}
        whileHover={stopping ? { scale: 1.03 } : undefined}
        whileTap={stopping ? { scale: 0.96 } : undefined}
        transition={{ type: "spring", stiffness: 500, damping: 26 }}
        onClick={onStop}
      >
        <Stop size={16} weight="fill" aria-hidden />
        Stop
      </motion.button>
    </motion.div>
  );
}
