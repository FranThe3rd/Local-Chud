import { apiFetch } from "./api.js";

async function render() {
  const res = await apiFetch("/api/tasks");
  const tasks = await res.json();
  const root = document.getElementById("task-list");
  if (!root) return;
  root.innerHTML = "";
  tasks.forEach((t) => {
    const row = document.createElement("div");
    row.className = "task-item" + (t.done ? " done" : "");
    row.innerHTML = `<input type="checkbox" ${t.done ? "checked" : ""} />
      <span style="flex:1">${escapeHtml(t.title)}</span>
      <button type="button" class="secondary" style="font-size:0.7rem">×</button>`;
    row.querySelector("input").addEventListener("change", async () => {
      await apiFetch(`/api/tasks/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: row.querySelector("input").checked }),
      });
      render();
    });
    row.querySelector("button").addEventListener("click", async () => {
      await apiFetch(`/api/tasks/${t.id}`, { method: "DELETE" });
      render();
    });
    root.appendChild(row);
  });
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

export function initTasks() {
  document.getElementById("btn-task-add")?.addEventListener("click", async () => {
    const input = document.getElementById("task-input");
    const title = input?.value?.trim();
    if (!title) return;
    await apiFetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    input.value = "";
    render();
  });
}

export function loadTasksPanel() {
  render();
}
