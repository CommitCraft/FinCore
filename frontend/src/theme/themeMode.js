const THEME_KEY = "portal-theme-mode";

export const getStoredPortalThemeMode = () => {
  if (typeof window === "undefined") return "midnight";

  const saved = window.localStorage.getItem(THEME_KEY);
  return saved === "light" ? "light" : "midnight";
};

export const setStoredPortalThemeMode = (mode) => {
  if (typeof window === "undefined") return;

  const safeMode = mode === "light" ? "light" : "midnight";
  window.localStorage.setItem(THEME_KEY, safeMode);
};

export const getNextPortalThemeMode = (mode) => (mode === "light" ? "midnight" : "light");
