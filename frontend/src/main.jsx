import { createRoot } from "react-dom/client";
import { ChatApp } from "./ChatApp.jsx";

let root = null;

export function mountChatApp(deps) {
  const mount = document.getElementById("chat-app");
  if (!mount) {
    console.warn("chat-app mount node missing");
    return;
  }
  if (!root) {
    root = createRoot(mount);
  }
  root.render(<ChatApp {...deps} />);
}

export function renderMessages(messages) {
  window.dispatchEvent(
    new CustomEvent("localchud:chat-load", { detail: messages })
  );
}
