// Time range presets and resolution logic

export type TimeRangePreset =
  | "this_week"
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_year";

export interface ResolvedTimeRange {
  start: string; // ISO 8601
  end: string;   // ISO 8601
  label: string;
}

export type TimeRangeSpec =
  | { type: "preset"; preset: TimeRangePreset }
  | { type: "custom"; start: string; end: string };

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Monday-based: if Sunday(0), shift back 6; otherwise shift back (day-1)
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function resolveRange(spec: TimeRangeSpec): ResolvedTimeRange {
  const now = new Date();

  if (spec.type === "custom") {
    return {
      start: spec.start,
      end: spec.end,
      label: `${spec.start.slice(0, 10)} — ${spec.end.slice(0, 10)}`,
    };
  }

  let start: Date;
  let end: Date = now;
  let label: string;

  switch (spec.preset) {
    case "this_week":
      start = startOfWeek(now);
      label = "This Week";
      break;
    case "this_month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      label = "This Month";
      break;
    case "last_month": {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthName = start.toLocaleString("en", { month: "long" });
      label = monthName;
      break;
    }
    case "last_3_months":
      start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      label = "Last 3 Months";
      break;
    case "last_year":
      start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      label = "Last Year";
      break;
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label,
  };
}

/** Determine the best HA statistics API period for a given range. */
export function suggestedPeriod(resolved: ResolvedTimeRange): "hour" | "day" | "month" {
  const diffMs = new Date(resolved.end).getTime() - new Date(resolved.start).getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays <= 2) return "hour";
  if (diffDays <= 90) return "day";
  return "month";
}

/** Number of days in a resolved range. */
export function rangeDays(resolved: ResolvedTimeRange): number {
  const diffMs = new Date(resolved.end).getTime() - new Date(resolved.start).getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/** Compute the "previous" equivalent period for comparison. */
export function previousPeriod(resolved: ResolvedTimeRange): ResolvedTimeRange {
  const durationMs = new Date(resolved.end).getTime() - new Date(resolved.start).getTime();
  const prevEnd = new Date(new Date(resolved.start).getTime());
  const prevStart = new Date(prevEnd.getTime() - durationMs);

  return {
    start: prevStart.toISOString(),
    end: prevEnd.toISOString(),
    label: "Previous Period",
  };
}
