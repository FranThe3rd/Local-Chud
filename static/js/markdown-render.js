/**
 * React-markdown preview for chat (loaded from CDN on demand).
 */

const JSDELIVR = "https://cdn.jsdelivr.net/npm";

let rendererPromise = null;
const roots = new WeakMap();

async function loadRenderer() {
  if (!rendererPromise) {
    rendererPromise = Promise.all([
      import(`${JSDELIVR}/react@18.3.1/+esm`),
      import(`${JSDELIVR}/react-dom@18.3.1/client/+esm`),
      import(`${JSDELIVR}/react-markdown@10.1.0/+esm`),
      import(`${JSDELIVR}/remark-gfm@4.0.1/+esm`),
    ]).then(([React, ReactDOM, MarkdownMod, remarkGfmMod]) => ({
      React,
      createRoot: ReactDOM.createRoot,
      Markdown: MarkdownMod.default,
      remarkGfm: remarkGfmMod.default,
    }));
  }
  return rendererPromise;
}

export function unmountMarkdown(container) {
  const root = roots.get(container);
  if (root) {
    root.unmount();
    roots.delete(container);
  }
  container.classList.remove("markdown-rendered");
  container.innerHTML = "";
}

export async function renderMarkdown(container, markdown) {
  const { React, createRoot, Markdown, remarkGfm } = await loadRenderer();
  unmountMarkdown(container);
  container.classList.add("markdown-rendered");

  const el = React.createElement(
    Markdown,
    { remarkPlugins: [remarkGfm] },
    markdown || ""
  );

  let root = roots.get(container);
  if (!root) {
    root = createRoot(container);
    roots.set(container, root);
  }
  root.render(el);
}
