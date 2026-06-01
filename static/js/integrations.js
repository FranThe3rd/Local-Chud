import { apiFetch } from "./api.js";

export async function loadEmailPanel() {
  const root = document.getElementById("email-body");
  if (!root) return;
  const res = await apiFetch("/api/email/accounts");
  const data = await res.json();
  root.innerHTML = `<div class="planned-banner">${data.message}</div>
    <p class="meta">Status: ${data.status} · Accounts: ${(data.accounts || []).length}</p>`;
}

export async function loadCalendarPanel() {
  const root = document.getElementById("calendar-body");
  if (!root) return;
  const res = await apiFetch("/api/calendar/events");
  const data = await res.json();
  root.innerHTML = `<div class="planned-banner">${data.message}</div>
    <p class="meta">Status: ${data.status}</p>`;
}
