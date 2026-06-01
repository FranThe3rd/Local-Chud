import { apiFetch } from "./api.js";

export function initCompare() {
  document.getElementById("btn-compare-run")?.addEventListener("click", runCompare);
}

async function runCompare() {
  const prompt = document.getElementById("compare-prompt")?.value?.trim();
  const modelB = document.getElementById("compare-model-b")?.value?.trim();
  const aEl = document.getElementById("compare-a");
  const bEl = document.getElementById("compare-b");
  if (!prompt) return;
  aEl.textContent = "Running…";
  bEl.textContent = "Running…";
  const res = await apiFetch("/api/compare/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, model_b: modelB || null }),
  });
  const data = await res.json();
  aEl.textContent = data.a?.ok ? data.a.content : `Error: ${data.a?.error}`;
  bEl.textContent = data.b?.ok ? data.b.content : `Error: ${data.b?.error}`;
}
