/**
 * Blocking boot for the plain theme. Sets `data-theme` before first paint.
 * Storage key is `feeds:theme`, separate from the rob-gill.co.uk key.
 * Supports `light` and `dark`. `?theme=dark` previews without saving.
 */
export const PLAIN_THEME_BOOT = `(function () {
  var themes = ["light", "dark"];
  var key = "feeds:theme";
  var root = document.documentElement;

  function systemTheme() {
    try {
      return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch (e) {
      return "light";
    }
  }

  function readStored() {
    try {
      var stored = localStorage.getItem(key);
      return themes.indexOf(stored) === -1 ? "" : stored;
    } catch (e) {
      return "";
    }
  }

  function paint(theme, auto) {
    root.setAttribute("data-theme", theme);
    if (auto) root.setAttribute("data-theme-auto", "");
    else root.removeAttribute("data-theme-auto");
  }

  var query = "";
  try {
    query = new URLSearchParams(location.search).get("theme") || "";
  } catch (e) {}

  if (themes.indexOf(query) !== -1) {
    paint(query, false);
  } else {
    var stored = readStored();
    if (stored) paint(stored, false);
    else {
      paint(systemTheme(), true);
      try {
        matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
          if (!root.hasAttribute("data-theme-auto")) return;
          paint(systemTheme(), true);
        });
      } catch (e) {}
    }
  }

  window.feedsSetTheme = function (theme) {
    if (themes.indexOf(theme) === -1) return;
    paint(theme, false);
    try {
      localStorage.setItem(key, theme);
    } catch (e) {}
  };
})();`;
