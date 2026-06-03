/**
 * local chud — main entry
 */

import { apiFetch } from "./js/api.js";
import { initChat, renderMessages } from "./js/chat-v2.js";
import { initCookbook, loadCookbookPanel } from "./js/cookbook.js";
import { initCompare, loadComparePanel } from "./js/compare.js";
import { initDocuments, loadDocumentsPanel } from "./js/documents.js";
import { loadCalendarPanel, loadEmailPanel } from "./js/integrations.js";
import { initMemory, loadMemoryPanel } from "./js/memory.js";
import { initResearch } from "./js/research.js";
import { initSettings } from "./js/settings.js";
import { initNav, initSidebar } from "./js/sidebar.js";
import { initSessions, setOnSessionChange } from "./js/sessions-v2.js";
import { initTasks, loadTasksPanel } from "./js/tasks.js";
import { initThemeToggle } from "./js/theme.js";
import { onPanelShow, refreshHeaderFromSettings, showPanel } from "./js/ui.js";

async function purgeServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((r) => r.unregister()));
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
}

async function checkAuth() {
  await apiFetch("/api/auth/check");
}

async function logout() {
  await apiFetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

onPanelShow("documents", loadDocumentsPanel);
onPanelShow("memory", loadMemoryPanel);
onPanelShow("tasks", loadTasksPanel);
onPanelShow("cookbook", loadCookbookPanel);
onPanelShow("compare", loadComparePanel);
onPanelShow("email", loadEmailPanel);
onPanelShow("calendar", loadCalendarPanel);
onPanelShow("settings", refreshHeaderFromSettings);

async function main() {
  await purgeServiceWorkers();
  await checkAuth();
  initThemeToggle();
  initSidebar();
  initNav();
  initSettings();
  initDocuments();
  initMemory();
  initTasks();
  initResearch();
  initCompare();
  initCookbook();
  setOnSessionChange(renderMessages);
  await initSessions();
  await initChat();
  showPanel("chat");
  await refreshHeaderFromSettings();
  document.getElementById("btn-logout")?.addEventListener("click", logout);
}

main().catch((e) => {
  console.error(e);
  if (String(e.message).includes("Unauthorized")) window.location.href = "/login";
});
