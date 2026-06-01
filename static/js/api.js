/** Global fetch wrapper — 401 redirects to /login */

export async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: "same-origin",
    ...options,
  });
  if (res.status === 401 && !url.includes("/api/auth/login")) {
    window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  return res;
}

export function apiUrl(path) {
  return path.startsWith("/") ? path : `/${path}`;
}
