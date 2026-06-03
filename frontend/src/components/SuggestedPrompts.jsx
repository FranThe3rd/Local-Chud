import { motion } from "motion/react";
import { Sparkle } from "@phosphor-icons/react";

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
    transition: { staggerChildren: 0.07, delayChildren: 0.12 },
  },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

const item = {
  hidden: { opacity: 0, y: 12, scale: 0.94 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 480, damping: 28 },
  },
};

export function SuggestedPrompts({ onPick }) {
  return (
    <motion.div
      className="suggested-prompts"
      variants={container}
      initial="hidden"
      animate="show"
      exit="exit"
    >
      <p className="suggested-label">
        <Sparkle size={14} weight="duotone" aria-hidden className="suggested-label-icon" />
        Try asking
      </p>
      <div className="suggested-chips">
        {PROMPTS.map((text) => (
          <motion.button
            key={text}
            type="button"
            className="suggested-chip"
            variants={item}
            whileHover={{
              scale: 1.04,
              y: -2,
              borderColor: "var(--accent-dim)",
            }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onPick(text)}
          >
            {text}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
