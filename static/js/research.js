import { apiFetch } from "./api.js";

export function initResearch() {
  document.getElementById("btn-research")?.addEventListener("click", () => runSearch(1));
  document.getElementById("research-query")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") runSearch(1);
  });
}

async function runSearch(page = 1) {
  const q = document.getElementById("research-query")?.value?.trim();
  const root = document.getElementById("research-results");
  if (!q || !root) return;

  root.innerHTML = `<div class="search-status search-status--loading">
    <span class="search-spinner"></span> Searching for <em>${escHtml(q)}</em>${page > 1 ? ` (page ${page})` : ""}…
  </div>`;

  let data;
  try {
    const res = await apiFetch("/api/research/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: q, page }),
    });
    data = await res.json();
  } catch (err) {
    root.innerHTML = errorBanner("Network error — check the app is running.", "");
    return;
  }

  if (!data.ok) {
    const isSearxng = data.error?.includes("Connection") || data.error?.includes("refused") || data.error?.includes("connect");
    root.innerHTML = isSearxng ? searxngDownBanner() : errorBanner(data.error, data.hint);
    return;
  }

  if (!data.results?.length) {
    if (page > 1) {
      root.innerHTML = `<p class="search-empty">No more results on page ${page}.</p>`;
      renderPagination(root, page, false);
      return;
    }
    root.innerHTML = `<p class="search-empty">No results found for <em>${escHtml(q)}</em>. Try different keywords.</p>`;
    return;
  }

  root.innerHTML = "";
  const meta = document.createElement("p");
  meta.className = "search-meta";
  meta.textContent = `${data.results.length} results via SearXNG · page ${data.page ?? page}`;
  root.appendChild(meta);

  data.results.forEach((r) => {
    const host = safeHost(r.url);
    const div = document.createElement("div");
    div.className = "search-result";
    div.innerHTML = `
      <div class="search-result-host">${escHtml(host)}</div>
      <a class="search-result-title" href="${escAttr(r.url)}" target="_blank" rel="noopener noreferrer">${escHtml(r.title || r.url)}</a>
      ${r.snippet ? `<p class="search-result-snippet">${escHtml(r.snippet)}</p>` : ""}
    `;
    root.appendChild(div);
  });

  renderPagination(root, data.page ?? page, data.has_more);
  root.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function renderPagination(root, page, hasMore) {
  const nav = document.createElement("div");
  nav.className = "search-pagination";
  nav.setAttribute("role", "navigation");
  nav.setAttribute("aria-label", "Search results pages");

  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "secondary";
  prev.textContent = "← Previous";
  prev.disabled = page <= 1;
  prev.addEventListener("click", () => runSearch(page - 1));

  const label = document.createElement("span");
  label.className = "search-pagination-label";
  label.textContent = `Page ${page}`;

  const next = document.createElement("button");
  next.type = "button";
  next.className = "secondary";
  next.textContent = "Next →";
  next.disabled = !hasMore;
  next.addEventListener("click", () => runSearch(page + 1));

  nav.append(prev, label, next);
  root.appendChild(nav);
}

function searxngDownBanner() {
  return `<div class="search-setup-banner">
    <strong>SearXNG is not running</strong>
    <p>Web search requires SearXNG. Start it with one of these:</p>
    <ul>
      <li><code>docker compose up searxng -d</code> &nbsp;(recommended — already configured)</li>
      <li>Re-run <code>./run.sh</code> — it will start SearXNG automatically if Docker is available</li>
    </ul>
    <p class="search-setup-note">SearXNG is a self-hosted, privacy-respecting search engine. Once running, search works instantly with no API keys.</p>
  </div>`;
}

function errorBanner(err, hint) {
  return `<div class="search-setup-banner search-setup-banner--error">
    <strong>Search error</strong>
    <p>${escHtml(err || "Unknown error")}</p>
    ${hint ? `<p class="search-setup-note">${escHtml(hint)}</p>` : ""}
  </div>`;
}

function escHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escAttr(s) {
  return String(s ?? "").replace(/"/g, "&quot;");
}

function safeHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
