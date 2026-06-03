import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";
import {
  Brain,
  CalendarBlank,
  CaretDown,
  ChatsCircle,
  CookingPot,
  EnvelopeSimple,
  Files,
  Gear,
  List,
  ListChecks,
  MagnifyingGlass,
  Moon,
  Plus,
  Scales,
  Sun,
} from "@phosphor-icons/react";

const NAV_ICONS = {
  chat: ChatsCircle,
  documents: Files,
  memory: Brain,
  research: MagnifyingGlass,
  compare: Scales,
  cookbook: CookingPot,
  tasks: ListChecks,
  email: EnvelopeSimple,
  calendar: CalendarBlank,
};

function phosphorIcon(Icon, { size = 18, weight = "duotone" } = {}) {
  return <Icon size={size} weight={weight} aria-hidden />;
}

function ThemeIcon() {
  const read = () =>
    document.documentElement.getAttribute("data-theme") === "light"
      ? "light"
      : "dark";

  const [theme, setTheme] = useState(read);

  useEffect(() => {
    const onTheme = () => setTheme(read());
    window.addEventListener("localchud:theme-change", onTheme);
    return () => window.removeEventListener("localchud:theme-change", onTheme);
  }, []);

  return theme === "dark"
    ? phosphorIcon(Sun, { weight: "regular" })
    : phosphorIcon(Moon, { weight: "regular" });
}

function mountInto(id, node) {
  const el = document.getElementById(id);
  if (!el) return;
  createRoot(el).render(node);
}

export function mountShellIcons() {
  document.querySelectorAll("#nav-features .nav-icon[data-icon]").forEach((el) => {
    const Icon = NAV_ICONS[el.dataset.icon];
    if (!Icon) return;
    createRoot(el).render(phosphorIcon(Icon));
  });

  mountInto("icon-menu", phosphorIcon(List, { weight: "bold" }));
  mountInto("icon-theme", <ThemeIcon />);
  mountInto("icon-settings", phosphorIcon(Gear, { weight: "regular" }));
  mountInto("icon-new-chat", phosphorIcon(Plus, { weight: "bold", size: 16 }));

  document.querySelectorAll(".collapse-icon[data-mount]").forEach((el) => {
    createRoot(el).render(phosphorIcon(CaretDown, { size: 14, weight: "bold" }));
  });
}
