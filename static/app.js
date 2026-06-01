/**
 * local chud — legacy entry (use main.js)
 */

import { apiFetch } from "./js/api.js";
import { initChat, renderMessages } from "./js/chat.js";
import { initSettings } from "./js/settings.js";
import { initNav, initSidebar, showPanel } from "./js/sidebar.js";
import { initSessions, setOnSessionChange } from "./js/sessions.js";
import { initThemeToggle } from "./js/theme.js";

async function checkAuth() {
  try {
    await apiFetch("/api/auth/check");
  } catch {
    window.location.href = "/login";
  }
}

async function logout() {
  await apiFetch("/api/auth/logout", { method: "POST" });
  window.location.href = "/login";
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  // Drop stale caches that served old chat.js (“No active session” bug)
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((r) => r.unregister()));
  await navigator.serviceWorker.register("/sw.js?v=3").catch(() => {});
}

async function main() {
  await checkAuth();
  initThemeToggle();
  initSidebar();
  initNav();
  initSettings();
  setOnSessionChange(renderMessages);
  await initSessions();
  initChat();
  showPanel("chat");

  document.getElementById("btn-logout")?.addEventListener("click", logout);
  await registerServiceWorker();
}

main();
