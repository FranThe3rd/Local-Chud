import { motion } from "motion/react";

const dot = {
  animate: { y: [0, -5, 0], opacity: [0.35, 1, 0.35] },
  transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" },
};

export function TypingIndicator() {
  return (
    <motion.div
      className="typing-indicator"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ type: "spring", stiffness: 420, damping: 28 }}
      aria-label="Assistant is typing"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="typing-dot"
          {...dot}
          transition={{ ...dot.transition, delay: i * 0.14 }}
        />
      ))}
    </motion.div>
  );
}
