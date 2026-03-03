import { CHART_COLORS } from "./theme";

/** Shared ECharts tooltip config (renders inside Shadow DOM). */
export function baseTooltip(trigger: "axis" | "item" = "axis") {
  return {
    trigger,
    appendToBody: false, // must stay inside Shadow DOM container
    backgroundColor: CHART_COLORS.cardBg(),
    borderColor: CHART_COLORS.grid(),
    borderWidth: 1,
    textStyle: { color: CHART_COLORS.textPrimary(), fontSize: 12 },
    padding: [8, 12] as [number, number],
    extraCssText: "border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.12);",
  };
}

/** Shared ECharts grid positioning. */
export function baseGrid(showDataZoom = false) {
  return {
    left: 50,
    right: 16,
    top: 16,
    bottom: showDataZoom ? 60 : 30,
  };
}

/** Shared ECharts axis label style — muted, readable weight. */
export function baseAxisLabel() {
  return {
    color: CHART_COLORS.text(),
    fontSize: 11,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  };
}

/** Shared split line style — subtle, receding. */
export function baseSplitLine() {
  return {
    lineStyle: {
      color: CHART_COLORS.grid(),
      type: "dashed" as const,
      width: 0.8,
    },
  };
}

/** Standard animation config for chart entrance. */
export function baseAnimation() {
  return {
    animation: true,
    animationDuration: 500,
    animationEasing: "cubicOut" as const,
  };
}

/** Consistent axis line style. */
export function baseAxisLine() {
  return {
    lineStyle: { color: CHART_COLORS.grid() },
  };
}
