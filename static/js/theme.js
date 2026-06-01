const STORAGE_KEY = "localchud-theme";

export function getTheme() {
  return (
    localStorage.getItem(STORAGE_KEY) ||
    localStorage.getItem("keelhouse-theme") ||
    localStorage.getItem("odysseus-theme") ||
    "dark"
  );
}

export function setTheme(theme) {
  localStorage.setItem(STORAGE_KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
}

export function toggleTheme() {
  const next = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

export function initThemeToggle(buttonId = "theme-toggle") {
  const btn = document.getElementById(buttonId);
  if (btn) btn.addEventListener("click", () => toggleTheme());
}
