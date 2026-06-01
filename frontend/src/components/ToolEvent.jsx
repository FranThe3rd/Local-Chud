import { motion } from "motion/react";

export function ToolEvent({ text }) {
  return (
    <motion.div
      className="tool-event"
      layout
      initial={{ opacity: 0, x: -12, height: 0 }}
      animate={{ opacity: 1, x: 0, height: "auto" }}
      transition={{ type: "spring", stiffness: 480, damping: 32 }}
    >
      {text}
    </motion.div>
  );
}
