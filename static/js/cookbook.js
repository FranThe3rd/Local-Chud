import { apiFetch } from "./api.js";

export async function loadCookbookPanel() {
  const root = document.getElementById("cookbook-cards");
  if (!root) return;
  root.innerHTML = "<p class='meta'>Loading…</p>";
  const res = await apiFetch("/api/cookbook/status");
  const data = await res.json();
  const hw = data.hardware || {};
  const ollama = data.ollama || {};
  root.innerHTML = `
    <div class="card"><h4>Hardware</h4>
      <div class="meta">${hw.os} ${hw.release} · ${hw.machine}</div>
      <div class="meta">RAM: ${hw.ram_gb ?? "?"} GB · ollama CLI: ${hw.ollama_installed ? "yes" : "no"}</div>
    </div>
    <div class="card"><h4>Ollama</h4>
      <div class="meta">${ollama.reachable ? "online" : "offline"} @ ${ollama.base_url}</div>
      <div class="meta">${(ollama.models || []).join(", ") || "no models"}</div>
    </div>
    <div class="card"><h4>HF downloads</h4>
      <div class="meta">${data.features?.hf_download || "stub"}</div>
    </div>
    <div class="card"><h4>Remote SSH serve</h4>
      <div class="meta">${data.features?.ssh_remote || "stub"}</div>
    </div>`;
}

export function initCookbook() {
  /* loaded on panel show */
}
