"use client";

type ThemeName = "light" | "dark" | "yellow";

declare global {
  interface Window {
    robgillSetTheme?: (theme: ThemeName) => void;
  }
}

/** Same order as rob-gill.co.uk: opposite of the system, then yellow, then back. */
function cycle(): readonly ThemeName[] {
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return systemDark ? ["dark", "light", "yellow"] : ["light", "dark", "yellow"];
}

function applyTheme(theme: ThemeName) {
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

export function ThemeCaret() {
  function changeTheme() {
    const order = cycle();
    const current = document.documentElement.getAttribute("data-theme");
    const index = order.indexOf(current as ThemeName);
    applyTheme(order[(index + 1) % order.length]);
  }

  return <button type="button" className="caret" aria-label="Change theme" onClick={changeTheme} />;
}
