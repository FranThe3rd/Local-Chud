import { apiFetch } from "./api.js";
import { refreshHeaderFromSettings } from "./ui.js";
import { MODEL_CATALOG } from "./model-catalog.js";

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderModelBrowser(filter = "") {
  const list = document.getElementById("model-browser-list");
  if (!list) return;
  const q = filter.trim().toLowerCase();
  const matches = MODEL_CATALOG.filter(
    (m) => !q || m.name.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q)
  );

  list.innerHTML = "";
  if (!matches.length) {
    const empty = document.createElement("p");
    empty.className = "model-browser-empty";
    empty.textContent = `No catalog match for "${filter}". You can still type the exact name above and download it.`;
    list.appendChild(empty);
    return;
  }

  matches.forEach((m) => {
    const card = document.createElement("div");
    card.className = "model-browser-item";

    const tags = m.tags
      .map((t) => `<button type="button" class="model-tag" data-model="${escHtml(m.name)}" data-tag="${escHtml(t)}">${escHtml(t)}</button>`)
      .join("");

    card.innerHTML = `
      <div class="model-browser-item-head">
        <button type="button" class="model-browser-name" data-model="${escHtml(m.name)}">${escHtml(m.name)}</button>
      </div>
      <p class="model-browser-desc">${escHtml(m.desc)}</p>
      <div class="model-browser-tags">${tags}</div>
    `;
    list.appendChild(card);
  });
}

function selectModelName(name, tag) {
  const input = document.getElementById("pull-model");
  if (!input) return;
  input.value = tag && tag !== "latest" ? `${name}:${tag}` : name;
  input.focus();
}

function setStatus(message, tone = "neutral") {
  const el = document.getElementById("settings-status");
  if (!el) return;
  el.textContent = message;
  el.className = `settings-status settings-status--${tone}`;
  el.hidden = !message;
}

function getFormSnapshot(form) {
  return JSON.stringify({
    base_url: form.base_url?.value ?? "",
    model: form.model?.value ?? "",
  });
}

let savedSnapshot = "";

function updateSaveButton(form) {
  const btn = document.getElementById("btn-save-settings");
  if (!btn || !form) return;
  const dirty = getFormSnapshot(form) !== savedSnapshot;
  btn.classList.toggle("settings-save--idle", !dirty);
  btn.classList.toggle("settings-save--dirty", dirty);
}

function markSettingsSaved(form) {
  savedSnapshot = getFormSnapshot(form);
  updateSaveButton(form);
}

function bindSettingsDirtyTracking(form) {
  if (!form) return;
  form.addEventListener("input", () => updateSaveButton(form));
  form.addEventListener("change", () => updateSaveButton(form));
}

export async function loadSettings() {
  const res = await apiFetch("/api/settings/llm");
  const data = await res.json();
  const form = document.getElementById("settings-form");
  const baseUrl = document.getElementById("base_url");
  if (baseUrl) baseUrl.value = data.base_url || "http://127.0.0.1:11434";
  await refreshModels(data.model);
  if (form) markSettingsSaved(form);
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

function fmtBytes(n) {
  if (!n) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

function setPullProgress(percent, statusText) {
  const wrap = document.getElementById("pull-progress");
  const fill = document.getElementById("pull-progress-fill");
  const status = document.getElementById("pull-progress-status");
  if (!wrap) return;
  wrap.hidden = false;
  if (fill) {
    fill.classList.toggle("pull-progress-fill--indeterminate", percent == null);
    fill.style.width = percent == null ? "100%" : `${percent}%`;
  }
  if (status) status.textContent = statusText;
}

async function pullModel(name) {
  const btn = document.getElementById("btn-pull-model");
  const input = document.getElementById("pull-model");
  if (btn) btn.disabled = true;
  if (input) input.disabled = true;
  setPullProgress(null, `Starting download of ${name}…`);

  try {
    const res = await apiFetch("/api/settings/pull", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: name }),
    });
    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || `Download failed (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let done = false;
    let failed = null;

    while (true) {
      const { value, done: streamDone } = await reader.read();
      if (streamDone) break;
      buffer += decoder.decode(value, { stream: true });

      const frames = buffer.split("\n\n");
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        let eventType = "message";
        let dataLine = "";
        for (const line of frame.split("\n")) {
          if (line.startsWith("event:")) eventType = line.slice(6).trim();
          else if (line.startsWith("data:")) dataLine += line.slice(5).trim();
        }
        if (!dataLine) continue;
        let payload = {};
        try {
          payload = JSON.parse(dataLine);
        } catch {
          continue;
        }

        if (eventType === "error") {
          failed = payload.error || "Download failed";
        } else if (eventType === "done") {
          done = true;
        } else {
          const { percent, completed, total, status } = payload;
          if (total) {
            setPullProgress(percent ?? 0, `${status} — ${fmtBytes(completed)} / ${fmtBytes(total)} (${percent ?? 0}%)`);
          } else {
            setPullProgress(null, status || "Working…");
          }
        }
      }
    }

    if (failed) throw new Error(failed);
    if (done) {
      setPullProgress(100, `Done — ${name} is ready.`);
      if (input) input.value = "";
      await refreshModels(name);
      const modelSelect = document.getElementById("model");
      if (modelSelect && [...modelSelect.options].some((o) => o.value === name)) {
        modelSelect.value = name;
      }
    }
  } catch (err) {
    setPullProgress(0, `Error: ${err.message}`);
    const fill = document.getElementById("pull-progress-fill");
    fill?.classList.add("pull-progress-fill--error");
  } finally {
    if (btn) btn.disabled = false;
    if (input) input.disabled = false;
  }
}

async function removeModel(name) {
  if (!name) return;
  if (!confirm(`Remove "${name}" from Ollama? This deletes the downloaded model files.`)) return;

  const btn = document.getElementById("btn-remove-model");
  if (btn) btn.disabled = true;
  setStatus(`Removing ${name}…`, "neutral");

  try {
    const res = await apiFetch("/api/settings/delete-model", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || `Remove failed (${res.status})`);

    await refreshModels();
    setStatus(`Removed ${name}.`, "ok");
  } catch (err) {
    setStatus(err.message || "Failed to remove model.", "error");
  } finally {
    if (btn) btn.disabled = false;
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
  const form = document.getElementById("settings-form");
  loadSettings();
  bindSettingsDirtyTracking(form);
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;
    try {
      await saveSettings(form);
      markSettingsSaved(form);
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

  document.getElementById("btn-remove-model")?.addEventListener("click", () => {
    const model = document.getElementById("model")?.value;
    removeModel(model);
  });

  renderModelBrowser();
  document.getElementById("model-browser-search")?.addEventListener("input", (e) => {
    renderModelBrowser(e.target.value);
  });
  document.getElementById("model-browser-list")?.addEventListener("click", (e) => {
    const tagBtn = e.target.closest(".model-tag");
    const nameBtn = e.target.closest(".model-browser-name");
    if (tagBtn) {
      selectModelName(tagBtn.dataset.model, tagBtn.dataset.tag);
    } else if (nameBtn) {
      selectModelName(nameBtn.dataset.model);
    }
  });

  const pullInput = document.getElementById("pull-model");
  const startPull = () => {
    const name = pullInput?.value.trim();
    if (!name) return;
    if (document.getElementById("pull-progress-fill")?.classList.contains("pull-progress-fill--error")) {
      document.getElementById("pull-progress-fill")?.classList.remove("pull-progress-fill--error");
    }
    pullModel(name);
  };
  document.getElementById("btn-pull-model")?.addEventListener("click", startPull);
  pullInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      startPull();
    }
  });
}
