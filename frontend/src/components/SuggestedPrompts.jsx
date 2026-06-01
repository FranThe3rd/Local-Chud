import { motion } from "motion/react";

const PROMPTS = [
  "Explain this project in plain English",
  "Write a markdown document with headings and a table",
  "What should I configure in Settings for Ollama?",
  "Search the web for latest local LLM news",
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1 },
};

export function SuggestedPrompts({ visible, onPick }) {
  if (!visible) return null;

  return (
    <motion.div
      className="suggested-prompts"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <p className="suggested-label">Try asking</p>
      <div className="suggested-chips">
        {PROMPTS.map((text) => (
          <motion.button
            key={text}
            type="button"
            className="suggested-chip"
            variants={item}
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 500, damping: 26 }}
            onClick={() => onPick(text)}
          >
            {text}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
