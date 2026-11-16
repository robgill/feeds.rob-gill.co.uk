"use client";

import { useEffect, useState } from "react";

const themes = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "yellow", label: "Yellow" },
] as const;

type ThemeName = (typeof themes)[number]["id"];

declare global {
  interface Window {
    robgillSetTheme?: (theme: ThemeName) => void;
  }
}

export function ThemeSwitch() {
  const [current, setCurrent] = useState<ThemeName | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => {
      const value = root.getAttribute("data-theme");
      if (value === "light" || value === "dark" || value === "yellow") setCurrent(value);
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  function choose(theme: ThemeName) {
    if (typeof window.robgillSetTheme === "function") {
      window.robgillSetTheme(theme);
    } else {
      document.documentElement.setAttribute("data-theme", theme);
      document.documentElement.removeAttribute("data-theme-auto");
      try {
        localStorage.setItem("robgill:theme", theme);
      } catch {
        // Storage can be blocked. The attribute still changes the theme.
      }
    }
    setCurrent(theme);
  }

  return (
    <div className="themes" role="group" aria-label="Theme">
      {themes.map((theme) => (
        <button
          key={theme.id}
          type="button"
          data-theme-choice={theme.id}
          aria-pressed={current === theme.id}
          onClick={() => choose(theme.id)}
        >
          {theme.label}
        </button>
      ))}
    </div>
  );
}
