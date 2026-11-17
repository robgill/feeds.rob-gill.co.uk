"use client";

import type { Brand } from "@/lib/brand";

type ThemeName = "light" | "dark" | "yellow";
type PlainTheme = "light" | "dark";

declare global {
  interface Window {
    robgillSetTheme?: (theme: ThemeName) => void;
    feedsSetTheme?: (theme: PlainTheme) => void;
  }
}

/** Same order as rob-gill.co.uk: opposite of the system, then yellow, then back. */
function robGillCycle(): readonly ThemeName[] {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return systemDark ? ["dark", "light", "yellow"] : ["light", "dark", "yellow"];
}

function applyRobGillTheme(theme: ThemeName) {
  if (typeof window.robgillSetTheme === "function") {
    window.robgillSetTheme(theme);
    return;
  }
  const root = document.documentElement;
  root.classList.add("is-theme-swap");
  root.setAttribute("data-theme", theme);
  root.removeAttribute("data-theme-auto");
  try {
    localStorage.setItem("robgill:theme", theme);
  } catch {
    // Storage can be blocked. The attribute still changes the theme.
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove("is-theme-swap"));
  });
}

function plainCycle(): readonly PlainTheme[] {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return systemDark ? ["dark", "light"] : ["light", "dark"];
}

function applyPlainTheme(theme: PlainTheme) {
  if (typeof window.feedsSetTheme === "function") {
    window.feedsSetTheme(theme);
    return;
  }
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("feeds:theme", theme);
  } catch {
    // Storage can be blocked. The attribute still changes the theme.
  }
}

export function ThemeCaret({ brand }: { brand: Brand }) {
  function changeTheme() {
    if (brand === "robgill") {
      const order = robGillCycle();
      const current = document.documentElement.getAttribute("data-theme");
      const index = order.indexOf(current as ThemeName);
      applyRobGillTheme(order[(index + 1) % order.length]);
      return;
    }
    const order = plainCycle();
    const current = document.documentElement.getAttribute("data-theme");
    const index = order.indexOf(current as PlainTheme);
    applyPlainTheme(order[(index + 1) % order.length]);
  }

  return <button type="button" className="caret" aria-label="Change theme" onClick={changeTheme} />;
}
