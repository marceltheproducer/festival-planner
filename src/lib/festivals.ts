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

export function getNextDeadline(
  festival: Festival,
  filmType?: "short" | "feature"
): Deadline | null {
  const now = new Date().toISOString().split("T")[0];
  const upcoming = getDeadlines(festival, filmType)
    .filter((d) => d.date >= now)
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ?? null;
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
