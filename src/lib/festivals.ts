import festivalsData from "../data/festivals.json";
import type { Festival } from "./types";

export function getAllFestivals(): Festival[] {
  return festivalsData as Festival[];
}

export function getFestivalById(id: string): Festival | undefined {
  return getAllFestivals().find((f) => f.id === id);
}

export function getNextDeadline(festival: Festival): { type: string; date: string; fee: number } | null {
  const now = new Date().toISOString().split("T")[0];
  const upcoming = festival.deadlines
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
