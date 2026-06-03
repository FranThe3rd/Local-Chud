import { apiFetch } from "./api.js";
import { refreshHeaderFromSettings } from "./ui.js";

function setStatus(message, tone = "neutral") {
  const el = document.getElementById("settings-status");
  if (!el) return;
  el.textContent = message;
  el.className = `settings-status settings-status--${tone}`;
  el.hidden = !message;
}

export async function loadSettings() {
  const res = await apiFetch("/api/settings/llm");
  const data = await res.json();
  const baseUrl = document.getElementById("base_url");
  if (baseUrl) baseUrl.value = data.base_url || "http://127.0.0.1:11434";
  await refreshModels(data.model);
  return data;
}

export async function refreshModels(selected) {
  const modelSelect = document.getElementById("model");
  if (!modelSelect) return;

  setStatus("Checking Ollama…", "neutral");

  const res = await apiFetch("/api/settings/models");
  const data = await res.json().catch(() => ({}));
  modelSelect.innerHTML = "";

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
    opt.textContent = `${fallback} (not found locally)`;
    modelSelect.appendChild(opt);
  }

  if (selected && [...modelSelect.options].some((o) => o.value === selected)) {
    modelSelect.value = selected;
  }

  if (data.reachable === false) {
    setStatus(
      data.error
        ? `Cannot reach Ollama: ${data.error}`
        : "Cannot reach Ollama — check that it is running and the base URL is correct.",
      "error"
    );
  } else {
    const count = (data.models || []).length;
    setStatus(count ? `Connected — ${count} model${count === 1 ? "" : "s"} available.` : "Connected — no models found.", "ok");
  }
}

export async function saveSettings(form) {
  const body = {
    provider: "ollama",
    base_url: form.base_url.value,
    model: form.model.value,
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
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    try {
      await saveSettings(form);
      await refreshHeaderFromSettings();
      await refreshModels(form.model.value);
      setStatus("Settings saved.", "ok");
    } catch (err) {
      setStatus(err.message || "Failed to save settings.", "error");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
  document.getElementById("btn-refresh-models")?.addEventListener("click", () => {
    const model = document.getElementById("model")?.value;
    refreshModels(model);
  });
}
