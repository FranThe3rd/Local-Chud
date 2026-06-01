/** Helpers for document detection (plain-text chat — no react-markdown). */

export function asText(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value.content === "string") return value.content;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function isDocumentRequest(text) {
  if (!text) return false;
  const t = asText(text).toLowerCase();
  return (
    /\b(document|markdown doc|readme|report|memo|article|essay|write-up|writeup)\b/.test(t) ||
    /\b(write|draft|create|make|generate|produce)\b.{0,40}\b(doc|document|markdown)\b/.test(t)
  );
}

export function extractMarkdownBody(content) {
  const raw = asText(content);
  if (!raw) return "";
  const fenced = raw.match(/```(?:markdown|md)?\s*\n([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  return raw.trim();
}

export function titleFromMarkdown(md) {
  const m = asText(md).match(/^#\s+(.+)$/m);
  if (!m) return "Untitled";
  return m[1].trim().replace(/\s+/g, " ").slice(0, 200) || "Untitled";
}

export function shouldRenderAsDocument(userText, assistantContent) {
  if (isDocumentRequest(userText)) return true;
  return /```(?:markdown|md)\s*\n/i.test(asText(assistantContent));
}

export function slugifyFilename(title) {
  const base = asText(title || "document")
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return base || "document";
}
