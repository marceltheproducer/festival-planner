import type {
  Festival,
  FilmProfile,
  StrategyRecommendation,
  StrategyEntry,
} from "./types";
import { TIER_ORDER } from "./types";
import { getNextDeadline } from "./festivals";
import { genresMatch } from "./genres";

export function generateStrategy(
  festivals: Festival[],
  profile: FilmProfile
): StrategyRecommendation[] {
  // Step 1: Filter festivals by film type and genre
  let eligible = festivals.filter((f) => {
    if (f.type !== "both" && f.type !== profile.type) return false;
    if (!genresMatch(f.genres, profile.genres)) return false;
    // If user selected specific target festivals, only include those
    if (profile.targetFestivalIds.length > 0 && !profile.targetFestivalIds.includes(f.id)) {
      return false;
    }
    return true;
  });

  // Step 2: Filter out festivals whose premiere requirements the film can't meet
  eligible = eligible.filter((f) => {
    switch (f.premiereRequirement) {
      case "world":
        return profile.premiereStatus === "unscreened";
      case "international":
        return profile.premiereStatus === "unscreened" || profile.premiereStatus === "screened_domestically";
      case "national":
        return profile.premiereStatus !== "screened_internationally" || f.location.country !== profile.country;
      case "regional":
      case "none":
        return true;
      default:
        return true;
    }
  });

  // Step 3: Only include festivals with upcoming deadlines
  eligible = eligible.filter((f) => getNextDeadline(f) !== null);

  // Step 4: Sort by prestige within each premiere tier
  eligible.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);

  // Step 5: Group into phases based on premiere requirement
  const worldPremiere: StrategyEntry[] = [];
  const intlPremiere: StrategyEntry[] = [];
  const nationalPremiere: StrategyEntry[] = [];
  const open: StrategyEntry[] = [];

  for (const festival of eligible) {
    const deadline = getNextDeadline(festival);
    if (!deadline) continue;

    // Check budget
    if (profile.budget !== null) {
      const totalSoFar = [...worldPremiere, ...intlPremiere, ...nationalPremiere, ...open]
        .reduce((sum, e) => sum + e.deadline.fee, 0);
      if (totalSoFar + deadline.fee > profile.budget) {
        continue;
      }
    }

    const entry: StrategyEntry = {
      festival,
      deadline,
      reason: buildReason(festival, deadline),
      warning: buildWarning(festival, eligible),
    };

    switch (festival.premiereRequirement) {
      case "world":
        worldPremiere.push(entry);
        break;
      case "international":
        intlPremiere.push(entry);
        break;
      case "national":
        nationalPremiere.push(entry);
        break;
      default:
        open.push(entry);
        break;
    }
  }

  // Sort each phase by deadline
  const sortByDeadline = (a: StrategyEntry, b: StrategyEntry) =>
    a.deadline.date.localeCompare(b.deadline.date);

  worldPremiere.sort(sortByDeadline);
  intlPremiere.sort(sortByDeadline);
  nationalPremiere.sort(sortByDeadline);
  open.sort(sortByDeadline);

  const results: StrategyRecommendation[] = [];

  if (worldPremiere.length > 0) {
    results.push({
      phase: "world_premiere",
      label: "World Premiere Targets",
      festivals: worldPremiere,
    });
  }

  if (intlPremiere.length > 0) {
    results.push({
      phase: "international_premiere",
      label: "International Premiere Targets",
      festivals: intlPremiere,
    });
  }

  if (nationalPremiere.length > 0) {
    results.push({
      phase: "national_premiere",
      label: "National Premiere Targets",
      festivals: nationalPremiere,
    });
  }

  if (open.length > 0) {
    results.push({
      phase: "open",
      label: "No Premiere Requirement",
      festivals: open,
    });
  }

  return results;
}

function buildReason(festival: Festival, deadline: { type: string; fee: number }): string {
  const parts: string[] = [];
  parts.push(`${festival.tier} festival`);
  if (deadline.fee === 0) {
    parts.push("no submission fee");
  } else {
    parts.push(`$${deadline.fee} ${deadline.type} deadline`);
  }
  if (festival.notes) {
    parts.push(festival.notes);
  }
  return parts.join(" · ");
}

function buildWarning(festival: Festival, allEligible: Festival[]): string | undefined {
  if (!festival.notificationDate) return undefined;

  // Check if any higher-tier festival has a deadline after this one's notification
  const higherTier = allEligible.filter(
    (f) =>
      TIER_ORDER[f.tier] < TIER_ORDER[festival.tier] &&
      f.premiereRequirement === festival.premiereRequirement
  );

  for (const higher of higherTier) {
    const hDeadline = getNextDeadline(higher);
    if (hDeadline && hDeadline.date > festival.notificationDate) {
      return `${higher.name} has a later deadline — consider waiting for notification from ${festival.name} before committing your premiere.`;
    }
  }

  return undefined;
}
