import type { Festival, Filters, SortOption } from "./types";
import { TIER_ORDER } from "./types";
import { getNextDeadline } from "./festivals";
import { genresMatch } from "./genres";

function fuzzyMatch(target: string, query: string): boolean {
  const t = target.toLowerCase();
  const q = query.toLowerCase();
  if (t.includes(q)) return true;
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

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
    submissionPlatforms: [],
  };
}

export function applyFilters(festivals: Festival[], filters: Filters): Festival[] {
  const now = new Date();

  return festivals.filter((f) => {
    if (filters.search) {
      const q = filters.search;
      const match =
        fuzzyMatch(f.name, q) ||
        fuzzyMatch(f.location.city, q) ||
        fuzzyMatch(f.location.country, q) ||
        (f.notes ? fuzzyMatch(f.notes, q) : false);
      if (!match) return false;
    }

    if (filters.submissionPlatforms.length > 0) {
      const platform = f.submissionPlatform === "withoutabox" ? "other" : f.submissionPlatform;
      if (!filters.submissionPlatforms.includes(platform as "filmfreeway" | "direct" | "other")) return false;
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
      const nextDl = getNextDeadline(f);
      const relevantFee = nextDl ? nextDl.fee : f.fees.regular;
      if (relevantFee > filters.maxFee) return false;
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
      return sorted.sort((a, b) => {
        const feeA = getNextDeadline(a)?.fee ?? a.fees.regular;
        const feeB = getNextDeadline(b)?.fee ?? b.fees.regular;
        return feeA - feeB;
      });
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return sorted;
  }
}
