import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function MarkdownBody({ content }) {
  return (
    <div className="markdown-body">
      <Markdown remarkPlugins={[remarkGfm]}>{content || ""}</Markdown>
    </div>
  );
}
