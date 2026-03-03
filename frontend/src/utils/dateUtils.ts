/**
 * Shared date parsing utilities.
 *
 * HA statistics `start` can arrive as:
 *   - ISO string: "2025-01-01T00:00:00.000Z"
 *   - Numeric timestamp (seconds): 1706745600
 *   - Numeric string: "1706745600"
 *
 * These helpers handle all three consistently.
 */

/** Convert HA `start` field to an ISO 8601 string. */
export function toISODate(start: string | number): string {
  if (typeof start === "number") return new Date(start * 1000).toISOString();
  if (/^\d+(\.\d+)?$/.test(start)) return new Date(Number(start) * 1000).toISOString();
  return start;
}

/** Extract YYYY-MM-DD from a possibly-numeric start value. */
export function toDateKey(start: string | number): string {
  return toISODate(start).slice(0, 10);
}

/** Convert a possibly-numeric-string date to a Date object. */
export function safeParseDate(dateStr: string): Date {
  if (/^\d+(\.\d+)?$/.test(dateStr)) return new Date(Number(dateStr) * 1000);
  return new Date(dateStr);
}
