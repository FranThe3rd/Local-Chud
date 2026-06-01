export function isDocumentRequest(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  return (
    /\b(document|markdown doc|readme|report|memo|article|essay|write-up|writeup)\b/.test(t) ||
    /\b(write|draft|create|make|generate|produce)\b.{0,40}\b(doc|document|markdown)\b/.test(t)
  );
}

export function extractMarkdownBody(content) {
  if (!content) return "";
  const fenced = content.match(/```(?:markdown|md)?\s*\n([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  return content.trim();
}

export function titleFromMarkdown(md) {
  const m = md.match(/^#\s+(.+)$/m);
  if (!m) return "Untitled";
  return m[1].trim().replace(/\s+/g, " ").slice(0, 200) || "Untitled";
}

export function shouldRenderAsDocument(userText, assistantContent) {
  if (isDocumentRequest(userText)) return true;
  return /```(?:markdown|md)\s*\n/i.test(assistantContent || "");
}
