import { motion } from "motion/react";
import { ArrowBendDownRight, Wrench } from "@phosphor-icons/react";

export function ToolEvent({ variant = "start", name, detail }) {
  const isStart = variant === "start";
  const Icon = isStart ? Wrench : ArrowBendDownRight;

  return (
    <motion.div
      className={`tool-event tool-event--${variant}`}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 520, damping: 34 }}
      layout
    >
      <motion.span
        className="tool-event-icon"
        initial={{ rotate: isStart ? -20 : 0, scale: 0.85 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
      >
        <Icon size={14} weight="duotone" aria-hidden />
      </motion.span>
      <span className="tool-event-body">
        {isStart ? (
          <>
            <strong>{name}</strong>
            <span className="tool-event-detail">({detail})</span>
          </>
        ) : (
          <>
            <strong>{name}</strong>
            <span className="tool-event-detail">: {detail}…</span>
          </>
        )}
      </span>
    </motion.div>
  );
}
