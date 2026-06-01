export function ToolEvent({ text }) {
  const label = typeof text === "string" ? text : String(text ?? "");
  return <div className="tool-event">{label}</div>;
}
