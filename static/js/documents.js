import { apiFetch } from "./api.js";
import { slugifyFilename } from "./markdown-doc.js";

let currentDocId = null;

function downloadCurrentDocument() {
  const title = document.getElementById("doc-title")?.value?.trim() || "document";
  const content = document.getElementById("doc-content")?.value ?? "";
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slugifyFilename(title)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

async function loadList() {
  const res = await apiFetch("/api/documents");
  const docs = await res.json();
  const list = document.getElementById("doc-list");
  if (!list) return;
  list.innerHTML = "";
  docs.forEach((d) => {
    const el = document.createElement("div");
    el.className = "doc-list-item" + (d.id === currentDocId ? " active" : "");
    el.textContent = d.title || `Doc #${d.id}`;
    el.addEventListener("click", () => openDoc(d.id));
    list.appendChild(el);
  });
  if (!docs.length) {
    list.innerHTML = "<p class='empty-state'>No documents yet — create one with <strong>New</strong>.</p>";
  }
}

async function openDoc(id) {
  const res = await apiFetch(`/api/documents/${id}`);
  const d = await res.json();
  currentDocId = d.id;
  document.getElementById("doc-title").value = d.title;
  document.getElementById("doc-content").value = d.content;
  await loadList();
}

export async function initDocuments() {
  document.getElementById("btn-doc-new")?.addEventListener("click", async () => {
    const res = await apiFetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled", content: "" }),
    });
    const d = await res.json();
    await openDoc(d.id);
  });

  document.getElementById("btn-doc-save")?.addEventListener("click", async () => {
    if (!currentDocId) return;
    await apiFetch(`/api/documents/${currentDocId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: document.getElementById("doc-title").value,
        content: document.getElementById("doc-content").value,
      }),
    });
    await loadList();
  });

  document.getElementById("btn-doc-delete")?.addEventListener("click", async () => {
    if (!currentDocId || !confirm("Delete document?")) return;
    await apiFetch(`/api/documents/${currentDocId}`, { method: "DELETE" });
    currentDocId = null;
    document.getElementById("doc-title").value = "";
    document.getElementById("doc-content").value = "";
    await loadList();
  });

  document.getElementById("btn-doc-download")?.addEventListener("click", () => {
    if (!currentDocId) return;
    downloadCurrentDocument();
  });
}

export function loadDocumentsPanel() {
  loadList();
}
