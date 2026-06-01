// Run: node --test static/js/helpers.test.js (when using node test runner)
// MVP: syntax check via `node --check static/js/api.js`

export function slugify(s) {
  return s.toLowerCase().replace(/\s+/g, "-").slice(0, 48);
}
