/** Read a CSS custom property from the shadow host element. */
export function getHAColor(varName: string, fallback: string): string {
  const host = document.querySelector("utility-dashboard-panel");
  if (host) {
    const val = getComputedStyle(host).getPropertyValue(varName).trim();
    if (val) return val;
  }
  return fallback;
}

/** Lazily-resolved chart color palette from HA CSS variables. */
export const CHART_COLORS = {
  primary: () => getHAColor("--primary-color", "#03a9f4"),
  accent: () => getHAColor("--accent-color", "#ff9800"),
  success: () => getHAColor("--success-color", "#43a047"),
  error: () => getHAColor("--error-color", "#db4437"),
  warning: () => getHAColor("--warning-color", "#ffa600"),
  text: () => getHAColor("--secondary-text-color", "#727272"),
  grid: () => getHAColor("--divider-color", "#e0e0e0"),
  cardBg: () => getHAColor("--ha-card-background", "#ffffff"),
  textPrimary: () => getHAColor("--primary-text-color", "#212121"),
};

/** Device color palette (fixed). */
export const DEVICE_COLORS: Record<string, string> = {
  washer: "#4fc3f7",
  servers: "#ff7043",
  vacuum: "#66bb6a",
  base: "#bdbdbd",
};
