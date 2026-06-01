import { apiFetch } from "./api.js";
import { refreshHeaderFromSettings } from "./ui.js";

export async function loadSettings() {
  const res = await apiFetch("/api/settings/llm");
  const data = await res.json();
  const provider = document.getElementById("provider");
  const baseUrl = document.getElementById("base_url");
  const apiKey = document.getElementById("api_key");
  if (provider) provider.value = data.provider || "ollama";
  if (baseUrl) baseUrl.value = data.base_url || "http://127.0.0.1:11434";
  if (apiKey) apiKey.placeholder = data.api_key_set ? "(set — leave blank to keep)" : "";
  await refreshModels(data.model);
  return data;
}

export async function refreshModels(selected) {
  const modelSelect = document.getElementById("model");
  if (!modelSelect) return;
  const res = await apiFetch("/api/settings/models");
  const data = await res.json().catch(() => ({}));
  modelSelect.innerHTML = "";
  const offline = data.reachable === false;
  document.getElementById("model-offline-hint")?.remove();
  (data.models || []).forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = m;
    modelSelect.appendChild(opt);
  });
  if (!modelSelect.options.length) {
    const fallback = selected || "llama3.2";
    const opt = document.createElement("option");
    opt.value = fallback;
    opt.textContent = `${fallback} (install Ollama or fix base URL)`;
    modelSelect.appendChild(opt);
  }
  if (selected && [...modelSelect.options].some((o) => o.value === selected)) {
    modelSelect.value = selected;
  }
  if (offline) {
    const hint = document.createElement("p");
    hint.id = "model-offline-hint";
    hint.className = "stub-notice";
    hint.style.fontSize = "0.85rem";
    hint.textContent = data.error
      ? `Provider offline: ${data.error} — set Base URL to http://127.0.0.1:11434 and Save.`
      : "Cannot reach Ollama. Use Base URL http://127.0.0.1:11434 then Save.";
    modelSelect.parentElement?.appendChild(hint);
  } else {
    const ok = document.createElement("p");
    ok.id = "model-offline-hint";
    ok.style.fontSize = "0.85rem";
    ok.style.color = "var(--success)";
    ok.textContent = `Connected — ${(data.models || []).length} model(s) found.`;
    modelSelect.parentElement?.appendChild(ok);
  }
}

export async function saveSettings(form) {
  const body = {
    provider: form.provider.value,
    base_url: form.base_url.value,
    model: form.model.value,
    api_key: form.api_key.value,
  };
  const res = await apiFetch("/api/settings/llm", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export function initSettings() {
  loadSettings();
  document.getElementById("settings-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await saveSettings(e.target);
    await refreshHeaderFromSettings();
    alert("Settings saved");
  });
  document.getElementById("btn-refresh-models")?.addEventListener("click", () => {
    const model = document.getElementById("model")?.value;
    refreshModels(model);
  });
}
