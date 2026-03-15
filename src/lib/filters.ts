import type { Festival, Filters, SortOption } from "./types";
import { TIER_ORDER } from "./types";
import { getNextDeadline } from "./festivals";
import { genresMatch } from "./genres";

export function createDefaultFilters(): Filters {
  return {
    search: "",
    filmType: [],
    genres: [],
    regions: [],
    tiers: [],
    premiereRequirements: [],
    maxFee: null,
    deadlineWindow: null,
  };
}

export function applyFilters(festivals: Festival[], filters: Filters): Festival[] {
  const now = new Date();

  return festivals.filter((f) => {
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const match =
        f.name.toLowerCase().includes(q) ||
        f.location.city.toLowerCase().includes(q) ||
        f.location.country.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (filters.filmType.length > 0) {
      if (!filters.filmType.includes(f.type) && f.type !== "both" && !filters.filmType.includes("both")) {
        return false;
      }
    }

    if (filters.genres.length > 0) {
      if (!genresMatch(f.genres, filters.genres)) return false;
    }

    if (filters.regions.length > 0) {
      if (!filters.regions.includes(f.location.region)) return false;
    }

    if (filters.tiers.length > 0) {
      if (!filters.tiers.includes(f.tier)) return false;
    }

    if (filters.premiereRequirements.length > 0) {
      if (!filters.premiereRequirements.includes(f.premiereRequirement)) return false;
    }

    if (filters.maxFee !== null) {
      if (f.fees.regular > filters.maxFee) return false;
    }

    if (filters.deadlineWindow !== null) {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() + filters.deadlineWindow);
      const cutoffStr = cutoff.toISOString().split("T")[0];
      const nowStr = now.toISOString().split("T")[0];
      const hasUpcoming = f.deadlines.some((d) => d.date >= nowStr && d.date <= cutoffStr);
      if (!hasUpcoming) return false;
    }

    return true;
  });
}

export function sortFestivals(festivals: Festival[], sort: SortOption): Festival[] {
  const sorted = [...festivals];

  switch (sort) {
    case "deadline":
      return sorted.sort((a, b) => {
        const da = getNextDeadline(a);
        const db = getNextDeadline(b);
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da.date.localeCompare(db.date);
      });
    case "prestige":
      return sorted.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
    case "fee":
      return sorted.sort((a, b) => a.fees.regular - b.fees.regular);
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sorted;
  }
}
