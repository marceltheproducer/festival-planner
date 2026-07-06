import festivalsData from "../data/festivals.json";
import type { Festival, Deadline } from "./types";

export function getAllFestivals(): Festival[] {
  return festivalsData as Festival[];
}

export function getFestivalById(id: string): Festival | undefined {
  return getAllFestivals().find((f) => f.id === id);
}

/**
 * The submission schedule relevant to a film type. Shorts use `shortDeadlines`
 * when a festival defines a separate short schedule; otherwise both share
 * `deadlines`. Passing no filmType (or "feature") always returns `deadlines`.
 */
export function getDeadlines(festival: Festival, filmType?: "short" | "feature"): Deadline[] {
  if (filmType === "short" && festival.shortDeadlines && festival.shortDeadlines.length > 0) {
    return festival.shortDeadlines;
  }
  return festival.deadlines;
}

function today(): string {
  return new Date().toISOString().split("T")[0];
}

export function getNextDeadline(
  festival: Festival,
  filmType?: "short" | "feature",
  referenceDate?: string
): Deadline | null {
  const ref = referenceDate ?? today();
  const upcoming = getDeadlines(festival, filmType)
    .filter((d) => d.date >= ref)
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ?? null;
}

/** Shift an ISO date forward by whole years, preserving month/day. */
function addYears(dateStr: string, years: number): string {
  const [y, m, d] = dateStr.split("-");
  return `${Number(y) + years}-${m}-${d}`;
}

/**
 * The next actionable deadline relative to `referenceDate`. If the festival's
 * current cycle has already closed, its deadline is projected forward by whole
 * years to estimate the next annual cycle (flagged `projected: true`). This
 * keeps the full festival landscape visible for filmmakers planning ahead,
 * while being explicit that far-future dates are estimates.
 */
export function getNextOrProjectedDeadline(
  festival: Festival,
  filmType?: "short" | "feature",
  referenceDate?: string
): { deadline: Deadline; projected: boolean } | null {
  const ref = referenceDate ?? today();
  const upcoming = getNextDeadline(festival, filmType, ref);
  if (upcoming) return { deadline: upcoming, projected: false };

  const deadlines = getDeadlines(festival, filmType);
  if (deadlines.length === 0) return null;

  let best: Deadline | null = null;
  for (const d of deadlines) {
    let years = 0;
    let projectedDate = d.date;
    while (projectedDate < ref && years < 5) {
      years += 1;
      projectedDate = addYears(d.date, years);
    }
    if (projectedDate < ref) continue;
    if (!best || projectedDate < best.date) {
      best = { ...d, date: projectedDate };
    }
  }
  return best ? { deadline: best, projected: true } : null;
}

export function getAllGenres(festivals: Festival[]): string[] {
  const genres = new Set<string>();
  for (const f of festivals) {
    for (const g of f.genres) {
      genres.add(g);
    }
  }
  return [...genres].sort();
}
