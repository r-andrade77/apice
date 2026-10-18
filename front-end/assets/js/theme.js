(() => {
  "use strict";

  const storageKey = "apice.theme";
  const root = document.documentElement;
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  const icons = new URL("../icons/", document.currentScript.src);
  let preference = readPreference();

  function readPreference() {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved === "light" || saved === "dark" ? saved : null;
    } catch {
      return null;
    }
  }

  function applyTheme() {
    const theme = preference || (systemTheme.matches ? "dark" : "light");
    const dark = theme === "dark";
    const changed = root.dataset.theme && root.dataset.theme !== theme;
    if (changed) root.classList.add("theme-changing");
    root.dataset.theme = theme;

    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.setAttribute("aria-checked", String(dark));
      button.title = dark ? "Ativar modo claro" : "Ativar modo escuro";
    });

    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#101310" : "#f5f6f2");

    if (changed) {
      root.getBoundingClientRect();
      window.setTimeout(() => root.classList.remove("theme-changing"), 0);
    }
  }

  function initializeControl() {
    const actions = document.querySelector(".topbar-actions");
    const login = document.querySelector(".login-page");
    if (!actions && !login) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-button theme-toggle";
    button.setAttribute("data-theme-toggle", "");
    button.setAttribute("role", "switch");
    button.setAttribute("aria-label", "Modo escuro");

    for (const name of ["sun", "moon"]) {
      const icon = document.createElement("img");
      icon.src = new URL(`${name}.svg`, icons).href;
      icon.alt = "";
      icon.width = 18;
      icon.height = 18;
      icon.className = `theme-icon theme-icon-${name}`;
      icon.setAttribute("aria-hidden", "true");
      button.append(icon);
    }

    if (actions) {
      actions.insertBefore(button, actions.querySelector('[data-action="refresh"]'));
    } else {
      button.classList.add("login-theme-toggle");
      login.prepend(button);
    }
    applyTheme();
  }

  applyTheme();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeControl, { once: true });
  } else {
    initializeControl();
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest?.("[data-theme-toggle]")) return;
    preference = root.dataset.theme === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(storageKey, preference);
    } catch {}
    applyTheme();
  });

  systemTheme.addEventListener("change", () => {
    if (!preference) applyTheme();
  });

  window.addEventListener("storage", (event) => {
    if (event.key !== storageKey && event.key !== null) return;
    preference = readPreference();
    applyTheme();
  });
})();