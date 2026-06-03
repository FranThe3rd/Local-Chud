/**
 * Curated list of popular Ollama models for the settings browser.
 * The Ollama library has no public JSON API and external requests are blocked
 * by CSP, so this list is maintained statically. Users can still type any name.
 */
export const MODEL_CATALOG = [
  { name: "llama3.2", desc: "Meta's compact Llama 3.2 — great default for most machines.", tags: ["1b", "3b"] },
  { name: "llama3.1", desc: "State-of-the-art Llama 3.1 from Meta.", tags: ["8b", "70b", "405b"] },
  { name: "llama3.3", desc: "70B model with performance near Llama 3.1 405B.", tags: ["70b"] },
  { name: "qwen2.5", desc: "Alibaba's Qwen2.5, up to 128K context, multilingual.", tags: ["0.5b", "1.5b", "3b", "7b", "14b", "32b", "72b"] },
  { name: "qwen3", desc: "Latest Qwen generation, dense and MoE variants.", tags: ["0.6b", "1.7b", "4b", "8b", "14b", "30b", "32b"] },
  { name: "qwen2.5-coder", desc: "Code-specialized Qwen, strong code generation.", tags: ["0.5b", "1.5b", "3b", "7b", "14b", "32b"] },
  { name: "deepseek-r1", desc: "Open reasoning models approaching frontier performance.", tags: ["1.5b", "7b", "8b", "14b", "32b", "70b"] },
  { name: "gemma3", desc: "Google's capable model that runs on a single GPU.", tags: ["270m", "1b", "4b", "12b", "27b"] },
  { name: "gemma2", desc: "Efficient Google Gemma 2 in 2B, 9B, and 27B.", tags: ["2b", "9b", "27b"] },
  { name: "mistral", desc: "Mistral AI's well-rounded 7B model (v0.3).", tags: ["7b"] },
  { name: "mistral-nemo", desc: "12B model with 128K context by Mistral + NVIDIA.", tags: ["12b"] },
  { name: "phi4", desc: "Microsoft's 14B state-of-the-art open model.", tags: ["14b"] },
  { name: "phi3", desc: "Lightweight 3.8B (Mini) and 14B (Medium) by Microsoft.", tags: ["3.8b", "14b"] },
  { name: "llava", desc: "Multimodal vision + language model.", tags: ["7b", "13b", "34b"] },
  { name: "llama3.2-vision", desc: "Image-reasoning Llama 3.2 in 11B and 90B.", tags: ["11b", "90b"] },
  { name: "codellama", desc: "Generate and discuss code from text prompts.", tags: ["7b", "13b", "34b", "70b"] },
  { name: "deepseek-coder-v2", desc: "MoE code model rivaling GPT-4 Turbo on code.", tags: ["16b", "236b"] },
  { name: "dolphin3", desc: "General-purpose instruct-tuned Llama 3.1 8B.", tags: ["8b"] },
  { name: "smollm2", desc: "Compact models: 135M, 360M, and 1.7B.", tags: ["135m", "360m", "1.7b"] },
  { name: "tinyllama", desc: "Compact 1.1B Llama trained on 3T tokens.", tags: ["1.1b"] },
  { name: "mixtral", desc: "Mixture-of-Experts models by Mistral AI.", tags: ["8x7b", "8x22b"] },
  { name: "command-r", desc: "Optimized for conversation and long-context tasks.", tags: ["35b"] },
  { name: "nomic-embed-text", desc: "High-performing open text embedding model.", tags: ["latest"] },
  { name: "mxbai-embed-large", desc: "State-of-the-art embedding model by mixedbread.ai.", tags: ["335m"] },
  { name: "bge-m3", desc: "Versatile multilingual embedding model by BAAI.", tags: ["567m"] },
];
