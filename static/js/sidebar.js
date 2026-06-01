import { showPanel } from "./ui.js";

export function initSidebar() {
  const toggle = document.getElementById("menu-toggle");
  const sidebar = document.getElementById("sidebar");
  if (toggle && sidebar) {
    toggle.addEventListener("click", () => sidebar.classList.toggle("open"));
  }

  document.querySelectorAll("[data-collapse]").forEach((h) => {
    h.addEventListener("click", () => {
      const next = h.nextElementSibling;
      if (next) next.hidden = !next.hidden;
    });
  });
}

export function initNav() {
  document.querySelectorAll("#nav-features li").forEach((li) => {
    li.addEventListener("click", () => {
      document.querySelectorAll("#nav-features li").forEach((x) => x.classList.remove("active"));
      li.classList.add("active");
      showPanel(li.dataset.panel || "chat");
      if (window.innerWidth < 768) {
        document.getElementById("sidebar")?.classList.remove("open");
      }
    });
  });

  document.getElementById("btn-settings")?.addEventListener("click", () => {
    showPanel("settings");
  });
}
