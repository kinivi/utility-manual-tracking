import type { HassEntity } from "../types";

interface MeterRead {
  value: number;
  timestamp: string;
}

function parsePreviousReads(entity?: HassEntity): MeterRead[] {
  const raw = entity?.attributes?.previous_reads;
  if (!raw) return [];

  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed.filter((r): r is MeterRead => {
    if (!r || typeof r !== "object") return false;
    const row = r as Record<string, unknown>;
    return typeof row.timestamp === "string" && typeof row.value === "number";
  });
}

/**
 * Baseline reading (first row) has no comparable delta.
 * This returns the timestamp of the first row that can be compared (2nd read).
 */
export function getFirstComparableReadingStartISO(entity?: HassEntity): string | null {
  const reads = parsePreviousReads(entity);
  if (reads.length < 2) return null;

  const firstComparableTs = new Date(reads[1].timestamp);
  if (Number.isNaN(firstComparableTs.getTime())) return null;
  return firstComparableTs.toISOString();
}

/** Returns the later valid ISO timestamp between `baseStart` and `floorStart`. */
export function maxISOStart(baseStart: string, floorStart: string | null): string {
  if (!floorStart) return baseStart;
  const baseMs = Date.parse(baseStart);
  const floorMs = Date.parse(floorStart);

  if (!Number.isFinite(baseMs)) return floorStart;
  if (!Number.isFinite(floorMs)) return baseStart;
  return floorMs > baseMs ? floorStart : baseStart;
}

