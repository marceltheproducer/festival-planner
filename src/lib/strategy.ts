import type {
  Festival,
  FilmProfile,
  StrategyRecommendation,
  StrategyEntry,
  StrategyOptions,
  StrategyResult,
  StrategyMeta,
  EntrySource,
} from "./types";
import { TIER_ORDER, PREMIERE_ORDER } from "./types";
import { getNextDeadline } from "./festivals";
import { genresMatch } from "./genres";

const DEFAULT_OPTIONS: StrategyOptions = {
  autoIncludeFree: true,
  maxSuggestions: 5,
};

const TIER_SCORES: Record<Festival["tier"], number> = {
  "A-list": 30,
  major: 20,
  mid: 10,
  emerging: 5,
};

function meetsPremiereRequirement(festival: Festival, profile: FilmProfile): boolean {
  switch (festival.premiereRequirement) {
    case "world":
      return profile.premiereStatus === "unscreened";
    case "international":
      return profile.premiereStatus === "unscreened" || profile.premiereStatus === "screened_domestically";
    case "national":
      return profile.premiereStatus !== "screened_internationally" || festival.location.country !== profile.country;
    case "regional":
    case "none":
      return true;
    default:
      return true;
  }
}

function toPhase(req: Festival["premiereRequirement"]): StrategyRecommendation["phase"] {
  switch (req) {
    case "world": return "world_premiere";
    case "international": return "international_premiere";
    case "national": return "national_premiere";
    default: return "open";
  }
}

function premiereLabel(req: string): string {
  switch (req) {
    case "world": return "world premiere";
    case "international": return "international premiere";
    case "national": return "national premiere";
    default: return "";
  }
}

function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1 + "T00:00:00");
  const d2 = new Date(date2 + "T00:00:00");
  return Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}

function getLatestDeadline(festival: Festival): { type: string; date: string; fee: number } | null {
  if (festival.deadlines.length === 0) return null;
  const sorted = [...festival.deadlines].sort((a, b) => b.date.localeCompare(a.date));
  return sorted[0];
}

// ── Main entry point ─────────────────────────────────────────────────────

export function generateStrategy(
  festivals: Festival[],
  profile: FilmProfile,
  options?: StrategyOptions
): StrategyResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const hasTargets = profile.targetFestivalIds.length > 0;

  if (!hasTargets) {
    return generateDiscoveryStrategy(festivals, profile);
  }

  return generateTargetedStrategy(festivals, profile, opts);
}

// ── No targets: original behavior with source field ──────────────────────

function generateDiscoveryStrategy(
  festivals: Festival[],
  profile: FilmProfile
): StrategyResult {
  let eligible = festivals.filter((f) => {
    if (f.type !== "both" && f.type !== profile.type) return false;
    if (!genresMatch(f.genres, profile.genres)) return false;
    return true;
  });

  eligible = eligible.filter((f) => meetsPremiereRequirement(f, profile));
  eligible = eligible.filter((f) => getNextDeadline(f) !== null);
  eligible.sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);

  const totalEligible = eligible.length;
  const freeCount = eligible.filter((f) => {
    const d = getNextDeadline(f);
    return d && d.fee === 0;
  }).length;

  const worldPremiere: StrategyEntry[] = [];
  const intlPremiere: StrategyEntry[] = [];
  const nationalPremiere: StrategyEntry[] = [];
  const open: StrategyEntry[] = [];
  let totalFees = 0;
  let excludedByBudget = 0;

  for (const festival of eligible) {
    const deadline = getNextDeadline(festival);
    if (!deadline) continue;

    if (profile.budget !== null && totalFees + deadline.fee > profile.budget) {
      excludedByBudget++;
      continue;
    }

    const source: EntrySource = { type: "discovery", detail: "" };
    const entry: StrategyEntry = {
      festival,
      deadline,
      reason: buildReason(festival, deadline, source),
      warning: buildWarning(festival, eligible),
      source,
    };

    totalFees += deadline.fee;

    switch (festival.premiereRequirement) {
      case "world": worldPremiere.push(entry); break;
      case "international": intlPremiere.push(entry); break;
      case "national": nationalPremiere.push(entry); break;
      default: open.push(entry); break;
    }
  }

  const sortByDeadline = (a: StrategyEntry, b: StrategyEntry) =>
    a.deadline.date.localeCompare(b.deadline.date);

  worldPremiere.sort(sortByDeadline);
  intlPremiere.sort(sortByDeadline);
  nationalPremiere.sort(sortByDeadline);
  open.sort(sortByDeadline);

  const recommendations: StrategyRecommendation[] = [];
  if (worldPremiere.length > 0) recommendations.push({ phase: "world_premiere", label: "World Premiere Targets", festivals: worldPremiere });
  if (intlPremiere.length > 0) recommendations.push({ phase: "international_premiere", label: "International Premiere Targets", festivals: intlPremiere });
  if (nationalPremiere.length > 0) recommendations.push({ phase: "national_premiere", label: "National Premiere Targets", festivals: nationalPremiere });
  if (open.length > 0) recommendations.push({ phase: "open", label: "No Premiere Requirement", festivals: open });

  return { recommendations, meta: { excludedByBudget, totalEligible, freeCount } };
}

// ── With targets: smart anchor + suggestion logic ────────────────────────

function generateTargetedStrategy(
  festivals: Festival[],
  profile: FilmProfile,
  opts: StrategyOptions
): StrategyResult {
  // Step A: Resolve anchors — always included, with warnings if issues
  const anchorEntries: StrategyEntry[] = [];
  for (const id of profile.targetFestivalIds) {
    const festival = festivals.find((f) => f.id === id);
    if (!festival) continue;

    const typeMatch = festival.type === "both" || festival.type === profile.type;
    const genreMatch = genresMatch(festival.genres, profile.genres);
    const premiereOk = meetsPremiereRequirement(festival, profile);
    const deadline = getNextDeadline(festival);

    let warning: string | undefined;
    if (!typeMatch) {
      warning = `This festival only accepts ${festival.type === "short" ? "short films" : "features"}, but your film is a ${profile.type === "short" ? "short" : "feature"}.`;
    } else if (!genreMatch) {
      warning = `This festival may not be the best genre fit, but you selected it as a target.`;
    } else if (!premiereOk) {
      const req = premiereLabel(festival.premiereRequirement);
      warning = `Your film has already screened ${profile.premiereStatus === "screened_internationally" ? "internationally" : "domestically"}. This festival requires a ${req}.`;
    } else if (!deadline) {
      warning = "All submission deadlines for this festival have passed.";
    }

    const displayDeadline = deadline ?? getLatestDeadline(festival);
    if (!displayDeadline) continue;

    const source: EntrySource = { type: "target" };
    anchorEntries.push({
      festival,
      deadline: displayDeadline,
      reason: buildReason(festival, displayDeadline, source),
      warning,
      source,
    });
  }

  // Step B: Build suggestion pool — all eligible non-target festivals
  const pool = festivals.filter((f) => {
    if (profile.targetFestivalIds.includes(f.id)) return false;
    if (f.type !== "both" && f.type !== profile.type) return false;
    if (!genresMatch(f.genres, profile.genres)) return false;
    if (!meetsPremiereRequirement(f, profile)) return false;
    if (!getNextDeadline(f)) return false;
    return true;
  });

  // Step C: Score and classify suggestions
  const anchorPhases = new Set(anchorEntries.map((e) => toPhase(e.festival.premiereRequirement)));

  const scored = pool.map((festival) => {
    const deadline = getNextDeadline(festival)!;
    let score = 0;
    let detail = "";

    // Free bonus
    if (deadline.fee === 0) score += 40;

    // Tier bonus
    score += TIER_SCORES[festival.tier] ?? 0;

    // Phase alignment with targets
    const festPhase = toPhase(festival.premiereRequirement);
    if (anchorPhases.has(festPhase)) {
      score += 15;
    } else {
      // Adjacent premiere phase bonus
      const festOrder = PREMIERE_ORDER[festival.premiereRequirement];
      const isAdjacent = anchorEntries.some((a) => {
        const anchorOrder = PREMIERE_ORDER[a.festival.premiereRequirement];
        return Math.abs(festOrder - anchorOrder) === 1;
      });
      if (isAdjacent) score += 8;
    }

    // Timeline complementarity
    for (const anchor of anchorEntries) {
      if (!anchor.festival.notificationDate) continue;
      const notifDate = anchor.festival.notificationDate;

      if (deadline.date > notifDate) {
        score += 20;
        detail = `Deadline after ${anchor.festival.name} notification — safe to wait`;
        break;
      }

      const daysDiff = Math.abs(daysBetween(deadline.date, anchor.deadline.date));
      if (daysDiff <= 30) {
        score += 10;
        if (!detail) detail = `Same submission window as ${anchor.festival.name}`;
      }
    }

    // Classify source
    let source: EntrySource;
    if (deadline.fee === 0 && opts.autoIncludeFree) {
      source = { type: "free_match", detail: detail || `No submission fee · ${festival.tier}` };
    } else if (detail) {
      source = { type: "complementary", detail };
    } else {
      source = { type: "discovery", detail: `${festival.tier} festival · matches your film` };
    }

    return { festival, deadline, score, source };
  });

  scored.sort((a, b) => b.score - a.score);

  // Step D & E: Budget constraints + per-phase cap
  const anchorBudgetUsed = anchorEntries.reduce((sum, e) => sum + e.deadline.fee, 0);
  let remainingBudget = profile.budget !== null ? Math.max(0, profile.budget - anchorBudgetUsed) : Infinity;

  if (profile.budget !== null && anchorBudgetUsed > profile.budget) {
    for (const entry of anchorEntries) {
      if (!entry.warning) {
        entry.warning = `Your target festivals cost $${anchorBudgetUsed} total, exceeding your $${profile.budget} budget.`;
      }
    }
  }

  const phaseCounts: Record<string, number> = {};
  const suggestionEntries: StrategyEntry[] = [];
  const allFestivalsForWarnings = [...anchorEntries.map((e) => e.festival), ...pool];
  let excludedByBudget = 0;

  for (const item of scored) {
    const phase = toPhase(item.festival.premiereRequirement);
    phaseCounts[phase] = phaseCounts[phase] ?? 0;

    if (phaseCounts[phase] >= opts.maxSuggestions) continue;
    if (item.deadline.fee > 0 && remainingBudget < item.deadline.fee) {
      excludedByBudget++;
      continue;
    }

    suggestionEntries.push({
      festival: item.festival,
      deadline: item.deadline,
      reason: buildReason(item.festival, item.deadline, item.source),
      warning: buildWarning(item.festival, allFestivalsForWarnings),
      source: item.source,
    });

    phaseCounts[phase]++;
    remainingBudget -= item.deadline.fee;
  }

  const freeCount = [...anchorEntries, ...suggestionEntries].filter((e) => e.deadline.fee === 0).length;

  // Step F: Merge anchors + suggestions, group into phases
  return {
    recommendations: groupEntries([...anchorEntries, ...suggestionEntries]),
    meta: {
      excludedByBudget,
      totalEligible: pool.length + anchorEntries.length,
      freeCount,
    },
  };
}

// ── Grouping helper ──────────────────────────────────────────────────────

function groupEntries(entries: StrategyEntry[]): StrategyRecommendation[] {
  const worldPremiere: StrategyEntry[] = [];
  const intlPremiere: StrategyEntry[] = [];
  const nationalPremiere: StrategyEntry[] = [];
  const open: StrategyEntry[] = [];

  for (const entry of entries) {
    switch (entry.festival.premiereRequirement) {
      case "world": worldPremiere.push(entry); break;
      case "international": intlPremiere.push(entry); break;
      case "national": nationalPremiere.push(entry); break;
      default: open.push(entry); break;
    }
  }

  // Targets first (by tier then deadline), then suggestions (by deadline)
  const sortPhase = (arr: StrategyEntry[]) => {
    const targets = arr.filter((e) => e.source.type === "target");
    const suggestions = arr.filter((e) => e.source.type !== "target");
    targets.sort((a, b) => TIER_ORDER[a.festival.tier] - TIER_ORDER[b.festival.tier] || a.deadline.date.localeCompare(b.deadline.date));
    suggestions.sort((a, b) => a.deadline.date.localeCompare(b.deadline.date));
    return [...targets, ...suggestions];
  };

  const results: StrategyRecommendation[] = [];
  if (worldPremiere.length > 0) results.push({ phase: "world_premiere", label: "World Premiere Targets", festivals: sortPhase(worldPremiere) });
  if (intlPremiere.length > 0) results.push({ phase: "international_premiere", label: "International Premiere Targets", festivals: sortPhase(intlPremiere) });
  if (nationalPremiere.length > 0) results.push({ phase: "national_premiere", label: "National Premiere Targets", festivals: sortPhase(nationalPremiere) });
  if (open.length > 0) results.push({ phase: "open", label: "No Premiere Requirement", festivals: sortPhase(open) });

  return results;
}

// ── Reason & warning builders ────────────────────────────────────────────

function buildReason(
  festival: Festival,
  deadline: { type: string; fee: number },
  source: EntrySource
): string {
  const parts: string[] = [];

  if (source.type === "target") {
    parts.push("Your target");
  }

  parts.push(`${festival.tier} festival`);

  if (deadline.fee === 0) {
    parts.push("no submission fee");
  } else {
    parts.push(`$${deadline.fee} ${deadline.type} deadline`);
  }

  if (source.type !== "target" && "detail" in source && source.detail) {
    parts.push(source.detail);
  } else if (festival.notes) {
    parts.push(festival.notes);
  }

  return parts.join(" · ");
}

function buildWarning(festival: Festival, allEligible: Festival[]): string | undefined {
  if (!festival.notificationDate) return undefined;

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
