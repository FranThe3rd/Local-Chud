import { apiFetch } from "./api.js";

export function initResearch() {
  document.getElementById("btn-research")?.addEventListener("click", runSearch);
  document.getElementById("research-query")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runSearch();
  });
}

async function runSearch() {
  const q = document.getElementById("research-query")?.value?.trim();
  const root = document.getElementById("research-results");
  if (!q || !root) return;
  root.innerHTML = "<p class='meta'>Searching…</p>";
  const res = await apiFetch("/api/research/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: q }),
  });
  const data = await res.json();
  if (!data.ok) {
    root.innerHTML = `<p class='planned-banner'>${data.error || "Search failed"}<br>${data.hint || ""}</p>`;
    return;
  }
  root.innerHTML = "";
  (data.results || []).forEach((r) => {
    const div = document.createElement("div");
    div.className = "search-result";
    div.innerHTML = `<strong><a href="${r.url}" target="_blank" rel="noopener">${r.title}</a></strong>
      <p class="meta">${r.snippet || ""}</p>`;
    root.appendChild(div);
  });
  if (!data.results?.length) root.innerHTML = "<p>No results.</p>";
}
