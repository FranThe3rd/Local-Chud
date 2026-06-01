import { useEffect, useState } from "react";
import MarkdownPreview from "@uiw/react-markdown-preview/common";
import markdownCss from "@uiw/react-markdown-preview/markdown.css?inline";

const MARKDOWN_STYLE_ID = "wmde-markdown-styles";

function ensureMarkdownStyles() {
  if (document.getElementById(MARKDOWN_STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = MARKDOWN_STYLE_ID;
  el.textContent = markdownCss;
  document.head.appendChild(el);
}

function themeColorMode() {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

function useThemeColorMode() {
  const [colorMode, setColorMode] = useState(themeColorMode);

  useEffect(() => {
    ensureMarkdownStyles();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setColorMode(themeColorMode());
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return colorMode;
}

/** GitHub-style markdown for assistant replies (GFM, code highlight). */
export function MarkdownBody({ source, streaming }) {
  const colorMode = useThemeColorMode();
  const text = source || "";

  if (streaming) {
    return (
      <pre className="reply-text streaming-plain">{text || "…"}</pre>
    );
  }

  if (!text) return null;

  return (
    <div className="markdown-body wmde-markdown-var">
      <MarkdownPreview
        source={text}
        wrapperElement={{ "data-color-mode": colorMode }}
        style={{ backgroundColor: "transparent" }}
      />
    </div>
  );
}
