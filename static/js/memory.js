import { apiFetch } from "./api.js";

async function render() {
  const res = await apiFetch("/api/memory");
  const data = await res.json();
  const root = document.getElementById("memory-list");
  if (!root) return;
  root.innerHTML = "";
  (data.memories || []).forEach((m) => {
    const div = document.createElement("div");
    div.className = "memory-item";
    const tags = m.tags || [];
    const tagsHtml = tags.length
      ? tags.map((t) => `<span class="tag-chip">${escapeHtml(t)}</span>`).join("")
      : `<span class="tag-chip tag-chip--muted">untagged</span>`;
    div.innerHTML = `<div class="memory-content">${escapeHtml(m.content)}</div>
      <div class="tag-list">${tagsHtml}</div>
      <button type="button" class="secondary memory-delete-btn">Delete</button>`;
    div.querySelector("button").addEventListener("click", async () => {
      await apiFetch(`/api/memory/${m.id}`, { method: "DELETE" });
      render();
    });
    root.appendChild(div);
  });
  if (!(data.memories || []).length) {
    root.innerHTML = "<p class='empty-state'>No memories yet — add one above.</p>";
  }
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function initMemory() {
  document.getElementById("btn-memory-add")?.addEventListener("click", async () => {
    const input = document.getElementById("memory-input");
    const content = input?.value?.trim();
    if (!content) return;
    await apiFetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, tags: [] }),
    });
    input.value = "";
    render();
  });
}

export function loadMemoryPanel() {
  render();
}
