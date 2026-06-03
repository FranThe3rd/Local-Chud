import { motion } from "motion/react";

const dotTransition = (i) => ({
  duration: 0.85,
  repeat: Infinity,
  ease: "easeInOut",
  delay: i * 0.12,
});

export function TypingIndicator() {
  return (
    <motion.div
      className="typing-indicator"
      initial={{ opacity: 0, y: 10, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -6, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 440, damping: 30 }}
      aria-label="Assistant is typing"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="typing-dot"
          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
          transition={dotTransition(i)}
        />
      ))}
    </motion.div>
  );
}
