import type {
  Festival,
  FilmProfile,
  Deadline,
  StrategyRecommendation,
  StrategyEntry,
  StrategyOptions,
  StrategyResult,
  StrategyMeta,
  EntrySource,
} from "./types";
import { TIER_ORDER, PREMIERE_ORDER } from "./types";
import { getNextDeadline, getDeadlines, getNextOrProjectedDeadline } from "./festivals";
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
  // Eligibility is governed by the most lenient premiere the festival accepts,
  // which may be broader than its headline requirement (e.g. Sundance is
  // world-premiere by reputation but also takes North American premieres).
  const requirement = festival.premiereAccepts ?? festival.premiereRequirement;
  switch (requirement) {
    case "world":
      return profile.premiereStatus === "unscreened";
    case "international":
      return profile.premiereStatus === "unscreened" || profile.premiereStatus === "screened_domestically";
    case "national":
      if (profile.premiereStatus === "unscreened") return true;
      if (profile.premiereStatus === "screened_domestically") {
        return festival.location.country !== profile.country;
      }
      return festival.location.country === profile.country;
    case "regional":
    case "none":
      return true;
    default:
      return true;
  }
}

/**
 * True when the film clears the festival's lenient acceptance floor but NOT its
 * headline premiere requirement — i.e. it's eligible via a broader section/slot
 * (Sundance's NA premiere, Berlin's Panorama) rather than the marquee tier.
 */
function qualifiesViaBroaderPremiere(festival: Festival, profile: FilmProfile): boolean {
  if (!festival.premiereAccepts || festival.premiereAccepts === festival.premiereRequirement) {
    return false;
  }
  const headlineFestival = { ...festival, premiereAccepts: undefined };
  return meetsPremiereRequirement(festival, profile) && !meetsPremiereRequirement(headlineFestival, profile);
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
  const d1 = new Date(date1 + "T00:00:00Z");
  const d2 = new Date(date2 + "T00:00:00Z");
  return Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}

function getLatestDeadline(festival: Festival, filmType: FilmProfile["type"]): Deadline | null {
  const deadlines = getDeadlines(festival, filmType);
  if (deadlines.length === 0) return null;
  const sorted = [...deadlines].sort((a, b) => b.date.localeCompare(a.date));
  return sorted[0];
}

function resolveDeadline(
  deadline: Deadline,
  filmType: FilmProfile["type"]
): { type: Deadline["type"]; date: string; fee: number } {
  const fee = filmType === "short" && deadline.shortFee !== undefined
    ? deadline.shortFee : deadline.fee;
  return { type: deadline.type, date: deadline.date, fee };
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

function getRecentlyPassedDeadline(
  festival: Festival,
  filmType: FilmProfile["type"],
  referenceDate: string
): Deadline | null {
  const refMs = new Date(referenceDate + "T00:00:00Z").getTime();
  const cutoff = new Date(refMs - 45 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const recent = getDeadlines(festival, filmType)
    .filter((d) => d.date < referenceDate && d.date >= cutoff)
    .sort((a, b) => b.date.localeCompare(a.date));
  return recent[0] ?? null;
}

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

  // Resolve each festival to its actionable deadline relative to the film's
  // ready date: an upcoming deadline if one remains, else a recently-passed one
  // (contact for late submission), else a projected next annual cycle.
  const resolved = eligible
    .map((festival) => resolveForProfile(festival, profile))
    .filter((r): r is ResolvedEntry => r !== null);

  const actionableNow = resolved.filter((r) => !r.projected && !r.recentlyPassed);
  const totalEligible = actionableNow.length;
  const freeCount = actionableNow.filter((r) => r.deadline.fee === 0).length;

  // Order within each phase: submit-now first, then projected future cycles,
  // then recently-passed; each sorted by date, tie-broken by prestige.
  const rank = (r: ResolvedEntry) => (r.recentlyPassed ? 2 : r.projected ? 1 : 0);
  resolved.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      a.deadline.date.localeCompare(b.deadline.date) ||
      TIER_ORDER[a.festival.tier] - TIER_ORDER[b.festival.tier]
  );

  const phases: Record<StrategyRecommendation["phase"], StrategyEntry[]> = {
    world_premiere: [],
    international_premiere: [],
    national_premiere: [],
    open: [],
  };
  const allFestivals = resolved.map((r) => r.festival);
  let totalFees = 0;
  let excludedByBudget = 0;

  for (const r of resolved) {
    const { festival, deadline, projected, recentlyPassed } = r;

    // Budget applies to festivals you'd actually submit to now or next cycle,
    // not to recently-passed ones (whose late-submission cost is unknown).
    if (!recentlyPassed && profile.budget !== null && totalFees + deadline.fee > profile.budget) {
      excludedByBudget++;
      continue;
    }

    const source: EntrySource = { type: "discovery", detail: sourceDetail(recentlyPassed, projected) };
    const entry: StrategyEntry = {
      festival,
      deadline,
      reason: withPremiereNote(buildReason(festival, deadline, source), festival, profile),
      warning: recentlyPassed ? undefined : buildWarning(festival, allFestivals, profile),
      source,
      projected,
    };

    if (!recentlyPassed) totalFees += deadline.fee;
    phases[toPhase(festival.premiereRequirement)].push(entry);
  }

  const recommendations: StrategyRecommendation[] = [];
  if (phases.world_premiere.length > 0) recommendations.push({ phase: "world_premiere", label: "World Premiere Targets", festivals: phases.world_premiere });
  if (phases.international_premiere.length > 0) recommendations.push({ phase: "international_premiere", label: "International Premiere Targets", festivals: phases.international_premiere });
  if (phases.national_premiere.length > 0) recommendations.push({ phase: "national_premiere", label: "National Premiere Targets", festivals: phases.national_premiere });
  if (phases.open.length > 0) recommendations.push({ phase: "open", label: "No Premiere Requirement", festivals: phases.open });

  return { recommendations, meta: { excludedByBudget, totalEligible, freeCount } };
}

// ── Reference-date resolution helpers ─────────────────────────────────────

interface ResolvedEntry {
  festival: Festival;
  deadline: { type: Deadline["type"]; date: string; fee: number };
  projected: boolean;
  recentlyPassed: boolean;
}

/**
 * Resolve a festival's actionable deadline relative to the film's ready date.
 * Prefers an upcoming deadline; falls back to a recently-passed one (worth a
 * late-submission inquiry); otherwise projects the next annual cycle.
 */
function resolveForProfile(festival: Festival, profile: FilmProfile): ResolvedEntry | null {
  const ref = profile.readyDate;
  const upcoming = getNextDeadline(festival, profile.type, ref);
  if (upcoming) {
    return { festival, deadline: resolveDeadline(upcoming, profile.type), projected: false, recentlyPassed: false };
  }
  const recent = getRecentlyPassedDeadline(festival, profile.type, ref);
  if (recent) {
    return { festival, deadline: resolveDeadline(recent, profile.type), projected: false, recentlyPassed: true };
  }
  const proj = getNextOrProjectedDeadline(festival, profile.type, ref);
  if (proj) {
    return { festival, deadline: resolveDeadline(proj.deadline, profile.type), projected: proj.projected, recentlyPassed: false };
  }
  return null;
}

function sourceDetail(recentlyPassed: boolean, projected: boolean): string {
  if (recentlyPassed) return "Deadline recently passed — contact festival for late submission";
  if (projected) return "Estimated next cycle — festival recurs annually";
  return "";
}

/** Append an informational note when eligibility comes via a broader section. */
function withPremiereNote(reason: string, festival: Festival, profile: FilmProfile): string {
  if (!qualifiesViaBroaderPremiere(festival, profile)) return reason;
  const accepts = premiereLabel(festival.premiereAccepts ?? festival.premiereRequirement);
  const headline = premiereLabel(festival.premiereRequirement);
  return `${reason} · Eligible via ${accepts} (not a full ${headline})`;
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
    const resolvedAnchor = resolveForProfile(festival, profile);

    let warning: string | undefined;
    if (!typeMatch) {
      warning = `This festival only accepts ${festival.type === "short" ? "short films" : "features"}, but your film is a ${profile.type === "short" ? "short" : "feature"}.`;
    } else if (!genreMatch) {
      warning = `This festival may not be the best genre fit, but you selected it as a target.`;
    } else if (!premiereOk) {
      const req = premiereLabel(festival.premiereAccepts ?? festival.premiereRequirement);
      warning = `Your film has already screened ${profile.premiereStatus === "screened_internationally" ? "internationally" : "domestically"}. This festival requires a ${req}.`;
    } else if (resolvedAnchor?.recentlyPassed) {
      warning = "This cycle's deadline just passed — some festivals accept late submissions, so contact them directly to inquire.";
    }

    let displayDeadline: ResolvedEntry["deadline"];
    let projected = false;
    if (resolvedAnchor) {
      displayDeadline = resolvedAnchor.deadline;
      projected = resolvedAnchor.projected;
    } else {
      const latest = getLatestDeadline(festival, profile.type);
      if (!latest) continue;
      displayDeadline = resolveDeadline(latest, profile.type);
    }

    const source: EntrySource = { type: "target" };
    anchorEntries.push({
      festival,
      deadline: displayDeadline,
      reason: withPremiereNote(buildReason(festival, displayDeadline, source), festival, profile),
      warning,
      source,
      projected,
    });
  }

  // Step B: Build suggestion pool — all eligible non-target festivals with an
  // upcoming or projected next-cycle deadline relative to the film's ready date.
  const pool = festivals.filter((f) => {
    if (profile.targetFestivalIds.includes(f.id)) return false;
    if (f.type !== "both" && f.type !== profile.type) return false;
    if (!genresMatch(f.genres, profile.genres)) return false;
    if (!meetsPremiereRequirement(f, profile)) return false;
    if (!getNextOrProjectedDeadline(f, profile.type, profile.readyDate)) return false;
    return true;
  });

  // Step C: Score and classify suggestions
  const anchorPhases = new Set(anchorEntries.map((e) => toPhase(e.festival.premiereRequirement)));

  const scored = pool.map((festival) => {
    const resolvedSug = resolveForProfile(festival, profile)!;
    const deadline = resolvedSug.deadline;
    const projected = resolvedSug.projected;
    const recentlyPassed = resolvedSug.recentlyPassed;
    let score = 0;
    let detail = "";

    // Free bonus
    if (deadline.fee === 0) score += 40;

    // Tier bonus
    score += TIER_SCORES[festival.tier] ?? 0;

    // Phase alignment with targets — only when the filmmaker is protecting
    // their premiere. Premiere-flexible films (often shorts) rank on fit/cost.
    if (!profile.premiereFlexible) {
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
    if (recentlyPassed) {
      source = { type: "discovery", detail: sourceDetail(true, false) };
    } else if (deadline.fee === 0 && opts.autoIncludeFree) {
      source = { type: "free_match", detail: detail || `No submission fee · ${festival.tier}` };
    } else if (detail) {
      source = { type: "complementary", detail };
    } else {
      source = { type: "discovery", detail: projected ? sourceDetail(false, true) : `${festival.tier} festival · matches your film` };
    }

    return { festival, deadline, score, source, projected, recentlyPassed };
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
      reason: withPremiereNote(buildReason(item.festival, item.deadline, item.source), item.festival, profile),
      warning: item.recentlyPassed ? undefined : buildWarning(item.festival, allFestivalsForWarnings, profile),
      source: item.source,
      projected: item.projected,
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

function buildWarning(festival: Festival, allEligible: Festival[], profile: FilmProfile): string | undefined {
  // Premiere-protection nudges only matter to filmmakers guarding their premiere.
  // When the film is premiere-flexible (common for shorts), skip them.
  if (profile.premiereFlexible) return undefined;
  if (!festival.notificationDate) return undefined;

  const higherTier = allEligible.filter(
    (f) =>
      TIER_ORDER[f.tier] < TIER_ORDER[festival.tier] &&
      f.premiereRequirement === festival.premiereRequirement
  );

  for (const higher of higherTier) {
    const hDeadline = getNextDeadline(higher, profile.type, profile.readyDate);
    if (hDeadline && hDeadline.date > festival.notificationDate) {
      return `${higher.name} has a later deadline — consider waiting for notification from ${festival.name} before committing your premiere.`;
    }
  }

  return undefined;
}
