import { apiFetch } from "./api.js";

let modelsLoaded = false;

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderInline(text) {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  out = out.replace(/\*\*([^*]+)\*\*/g, (_, c) => `<strong>${c}</strong>`);
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, (_, p, c) => `${p}<em>${c}</em>`);
  return out;
}

function renderMarkdownLite(md) {
  const lines = String(md ?? "").split("\n");
  const html = [];
  let inCode = false;
  let codeBuf = [];
  let listType = null;

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const line of lines) {
    const fence = line.match(/^```(.*)$/);
    if (fence) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length + 1;
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const ul = line.match(/^\s*[-*]\s+(.*)$/);
    const ol = line.match(/^\s*\d+\.\s+(.*)$/);
    if (ul || ol) {
      const want = ul ? "ul" : "ol";
      if (listType !== want) {
        closeList();
        html.push(`<${want}>`);
        listType = want;
      }
      html.push(`<li>${renderInline((ul || ol)[1])}</li>`);
      continue;
    }

    if (!line.trim()) {
      closeList();
      continue;
    }

    closeList();
    html.push(`<p>${renderInline(line)}</p>`);
  }

  if (inCode) html.push(`<pre><code>${escapeHtml(codeBuf.join("\n"))}</code></pre>`);
  closeList();
  return html.join("");
}

async function populateModels() {
  const selA = document.getElementById("compare-model-a");
  const selB = document.getElementById("compare-model-b");
  if (!selA || !selB) return;

  const prevA = selA.value;
  const prevB = selB.value;

  let models = [];
  let current = "";
  try {
    const [modelsRes, llmRes] = await Promise.all([
      apiFetch("/api/settings/models"),
      apiFetch("/api/settings/llm"),
    ]);
    const data = await modelsRes.json().catch(() => ({}));
    models = data.models || [];
    const llm = await llmRes.json().catch(() => ({}));
    current = llm.model || "";
  } catch {
    /* offline — handled below */
  }

  const hint = document.getElementById("compare-hint");
  if (!models.length) {
    if (hint) hint.textContent = "No models found — download one in Settings.";
    return;
  }
  if (hint) hint.textContent = "";

  [selA, selB].forEach((sel) => {
    sel.innerHTML = "";
    models.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      sel.appendChild(opt);
    });
  });

  selA.value = prevA && models.includes(prevA) ? prevA : current && models.includes(current) ? current : models[0];
  if (prevB && models.includes(prevB)) selB.value = prevB;
  else selB.value = models[1] || models[0];

  modelsLoaded = true;
}

export async function loadComparePanel() {
  await populateModels();
}

function setColumnLoading(el, statsEl) {
  el.classList.remove("compare-col--empty", "compare-col--error");
  el.classList.add("compare-col--loading");
  el.textContent = "Running…";
  if (statsEl) statsEl.textContent = "";
}

function renderColumn(el, statsEl, result) {
  el.classList.remove("compare-col--loading", "compare-col--empty");
  if (result?.ok) {
    el.classList.remove("compare-col--error");
    const content = result.content || "";
    if (content.trim()) {
      el.classList.add("compare-col--md");
      el.innerHTML = renderMarkdownLite(content);
    } else {
      el.classList.remove("compare-col--md");
      el.textContent = "(empty response)";
    }
    if (statsEl) {
      const secs = (result.elapsed_ms / 1000).toFixed(1);
      statsEl.textContent = `${secs}s · ${result.words ?? 0} words · ${result.words_per_sec ?? 0} w/s`;
    }
  } else {
    el.classList.remove("compare-col--md");
    el.classList.add("compare-col--error");
    el.textContent = `Error: ${result?.error || "unknown error"}`;
    if (statsEl) statsEl.textContent = result?.elapsed_ms ? `failed after ${(result.elapsed_ms / 1000).toFixed(1)}s` : "failed";
  }
}

async function runCompare() {
  const prompt = document.getElementById("compare-prompt")?.value?.trim();
  const modelA = document.getElementById("compare-model-a")?.value;
  const modelB = document.getElementById("compare-model-b")?.value;
  const aEl = document.getElementById("compare-a");
  const bEl = document.getElementById("compare-b");
  const aStats = document.getElementById("compare-a-stats");
  const bStats = document.getElementById("compare-b-stats");
  const aName = document.getElementById("compare-a-name");
  const bName = document.getElementById("compare-b-name");
  const btn = document.getElementById("btn-compare-run");
  const hint = document.getElementById("compare-hint");

  if (!prompt) {
    if (hint) hint.textContent = "Enter a prompt first.";
    return;
  }
  if (!modelA || !modelB) {
    if (hint) hint.textContent = "Pick two models (download one in Settings if empty).";
    return;
  }
  if (hint) hint.textContent = "";

  if (aName) aName.textContent = modelA;
  if (bName) bName.textContent = modelB;
  setColumnLoading(aEl, aStats);
  setColumnLoading(bEl, bStats);
  if (bEl) {
    bEl.textContent = modelA === modelB ? "Running…" : "Queued — runs after Model A…";
  }
  if (btn) btn.disabled = true;
  if (hint) hint.textContent = "Generating… larger models can take a while.";

  const runSingle = async (model) => {
    const res = await apiFetch("/api/compare/single", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, model }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || `Compare failed (${res.status})`);
    return data;
  };

  try {
    renderColumn(aEl, aStats, await runSingle(modelA));
    setColumnLoading(bEl, bStats);
    renderColumn(bEl, bStats, await runSingle(modelB));
  } catch (err) {
    [aEl, bEl].forEach((el) => {
      if (el.classList.contains("compare-col--loading")) {
        el.classList.remove("compare-col--loading", "compare-col--md");
        el.classList.add("compare-col--error");
        el.textContent = `Error: ${err.message}`;
      }
    });
  } finally {
    if (btn) btn.disabled = false;
    if (hint) hint.textContent = "";
  }
}

function swapModels() {
  const selA = document.getElementById("compare-model-a");
  const selB = document.getElementById("compare-model-b");
  if (!selA || !selB) return;
  const tmp = selA.value;
  selA.value = selB.value;
  selB.value = tmp;
}

export function initCompare() {
  document.getElementById("btn-compare-run")?.addEventListener("click", runCompare);
  document.getElementById("btn-compare-swap")?.addEventListener("click", swapModels);
  if (!modelsLoaded) populateModels();
}
