import { useState, useMemo } from "react";
import type { StrategyRecommendation, StrategyEntry, StrategyMeta } from "../lib/types";
import { TIER_ORDER } from "../lib/types";
import SubmissionPlan from "./SubmissionPlan";

const phaseColors: Record<StrategyRecommendation["phase"], { bg: string; border: string; badge: string }> = {
  world_premiere: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    badge: "bg-red-500/20 text-red-300",
  },
  international_premiere: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    badge: "bg-orange-500/20 text-orange-300",
  },
  national_premiere: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/30",
    badge: "bg-yellow-500/20 text-yellow-300",
  },
  open: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    badge: "bg-emerald-500/20 text-emerald-300",
  },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isDeadlinePast(dateStr: string): boolean {
  return dateStr < new Date().toISOString().split("T")[0];
}

function SourceBadge({ source }: { source: StrategyEntry["source"] }) {
  switch (source.type) {
    case "target":
      return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-300 border border-gold-500/30">
          Target
        </span>
      );
    case "free_match":
      return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
          Free
        </span>
      );
    case "complementary":
      return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/25">
          Suggested
        </span>
      );
    case "discovery":
      // No badge when there are no targets (all discovery)
      return null;
    default:
      return null;
  }
}

export default function StrategyResults({
  recommendations,
  meta,
}: {
  recommendations: StrategyRecommendation[];
  meta: StrategyMeta;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPlan, setShowPlan] = useState(false);
  const [collapsedSuggestions, setCollapsedSuggestions] = useState<Set<string>>(new Set());
  const [showPremiereGuide, setShowPremiereGuide] = useState(false);

  // Check if any entry has a non-discovery source (means targets were used)
  const hasTargetMode = recommendations.some((rec) =>
    rec.festivals.some((e) => e.source.type !== "discovery")
  );

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-12 bg-film-800/60 rounded-xl border border-film-700/50">
        <p className="text-film-300 text-lg mb-2">No eligible festivals found</p>
        <p className="text-film-500 text-sm">
          Try adjusting your film profile or selecting fewer target festivals.
        </p>
      </div>
    );
  }

  const toggleFestival = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const togglePhase = (rec: StrategyRecommendation) => {
    const phaseIds = rec.festivals.map((e) => e.festival.id);
    const allSelected = phaseIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        phaseIds.forEach((id) => next.delete(id));
      } else {
        phaseIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const toggleSuggestionCollapse = (phase: string) => {
    setCollapsedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(phase)) {
        next.delete(phase);
      } else {
        next.add(phase);
      }
      return next;
    });
  };

  const selectedEntries = useMemo(() => {
    const entries: { phase: StrategyRecommendation["phase"]; label: string; entry: StrategyEntry }[] = [];
    for (const rec of recommendations) {
      for (const entry of rec.festivals) {
        if (selectedIds.has(entry.festival.id)) {
          entries.push({ phase: rec.phase, label: rec.label, entry });
        }
      }
    }
    return entries;
  }, [selectedIds, recommendations]);

  if (showPlan && selectedEntries.length > 0) {
    return (
      <SubmissionPlan
        selectedEntries={selectedEntries}
        onBack={() => setShowPlan(false)}
      />
    );
  }

  const totalFestivals = recommendations.reduce(
    (sum, rec) => sum + rec.festivals.length,
    0
  );
  const totalFee = recommendations.reduce(
    (sum, rec) => sum + rec.festivals.reduce((s, e) => s + e.deadline.fee, 0),
    0
  );
  const targetCount = hasTargetMode
    ? recommendations.reduce((sum, rec) => sum + rec.festivals.filter((e) => e.source.type === "target").length, 0)
    : 0;
  const suggestedCount = hasTargetMode ? totalFestivals - targetCount : 0;

  // Compute "Start here" — top 3 highest-impact festivals by priority:
  // targets first, then A-list/free, sorted by earliest deadline
  const startHereIds = useMemo(() => {
    const allEntries = recommendations.flatMap((rec) => rec.festivals);
    const scored = allEntries.map((e) => {
      let score = 0;
      if (e.source.type === "target") score += 100;
      score += (3 - TIER_ORDER[e.festival.tier]) * 20; // A-list=60, major=40, mid=20, emerging=0
      if (e.deadline.fee === 0) score += 30;
      // Prefer earlier deadlines (lower date = higher priority)
      return { id: e.festival.id, score, deadline: e.deadline.date };
    });
    scored.sort((a, b) => b.score - a.score || a.deadline.localeCompare(b.deadline));
    return new Set(scored.slice(0, 3).map((s) => s.id));
  }, [recommendations]);

  return (
    <div>
      {/* Summary */}
      <div className="bg-film-800/60 rounded-xl border border-film-700/50 p-5 mb-6">
        <h2 className="text-lg font-semibold text-film-50 mb-3">
          Strategy Summary
        </h2>
        <div className="flex flex-wrap gap-4 sm:gap-6">
          {hasTargetMode ? (
            <>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-gold-400">{targetCount}</p>
                <p className="text-xs sm:text-sm text-film-400">Target{targetCount !== 1 ? "s" : ""}</p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-blue-400">{suggestedCount}</p>
                <p className="text-xs sm:text-sm text-film-400">Suggestion{suggestedCount !== 1 ? "s" : ""}</p>
              </div>
            </>
          ) : (
            <div>
              <p className="text-xl sm:text-2xl font-bold text-gold-400">{totalFestivals}</p>
              <p className="text-xs sm:text-sm text-film-400">Festivals</p>
            </div>
          )}
          <div>
            <p className="text-xl sm:text-2xl font-bold text-gold-400">
              {totalFee === 0 ? "Free" : `$${totalFee}`}
            </p>
            <p className="text-xs sm:text-sm text-film-400">Est. total fees</p>
          </div>
          {meta.freeCount > 0 && (
            <div>
              <p className="text-xl sm:text-2xl font-bold text-emerald-400">{meta.freeCount}</p>
              <p className="text-xs sm:text-sm text-film-400">Free</p>
            </div>
          )}
          <div>
            <p className="text-xl sm:text-2xl font-bold text-gold-400">
              {recommendations.length}
            </p>
            <p className="text-xs sm:text-sm text-film-400">Phases</p>
          </div>
        </div>

        {/* Budget transparency */}
        {meta.excludedByBudget > 0 && (
          <div className="mt-3 flex items-start gap-1.5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {meta.excludedByBudget} eligible festival{meta.excludedByBudget !== 1 ? "s" : ""} excluded by your budget.
            {meta.freeCount > 0 && ` ${meta.freeCount} free festival${meta.freeCount !== 1 ? "s" : ""} included at no cost.`}
            {" "}Increase your budget to see more options.
          </div>
        )}

        <p className="text-xs text-film-500 mt-3">
          Select the festivals you want to submit to, then build your personalized submission plan.
        </p>
      </div>

      {/* Premiere hierarchy explainer */}
      {recommendations.length > 1 && (
        <div className="bg-film-800/60 rounded-xl border border-film-700/50 mb-6 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPremiereGuide((v) => !v)}
            aria-expanded={showPremiereGuide}
            className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-film-700/20 transition-colors"
          >
            <span className="text-sm font-medium text-film-200 flex items-center gap-2">
              <svg className="w-4 h-4 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              How premiere strategy works
            </span>
            <svg
              className={`w-4 h-4 text-film-400 transition-transform ${showPremiereGuide ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showPremiereGuide && (
            <div className="px-5 pb-4 space-y-3 text-sm text-film-300 border-t border-film-700/30 pt-3">
              <p>
                <span className="text-film-100 font-medium">Your premiere status is your most valuable asset.</span>{" "}
                Top festivals want to be the first to show your film. Once you screen at one festival, you've "used" that premiere level.
              </p>
              <div className="grid gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                  <span><span className="text-red-300 font-medium">World Premiere</span> — Never shown anywhere. The most prestigious and competitive tier.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                  <span><span className="text-orange-300 font-medium">International Premiere</span> — Shown in your home country only. Still valuable for major international festivals.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 shrink-0" />
                  <span><span className="text-yellow-300 font-medium">National Premiere</span> — First screening in a specific country. Good for regional circuit festivals.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span><span className="text-emerald-300 font-medium">Open</span> — No premiere requirement. Submit anytime regardless of screening history.</span>
                </div>
              </div>
              <p className="text-xs text-film-400">
                Submit to higher tiers first. If you don't get in, your premiere status is preserved and you can move down to the next tier.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Phases */}
      <div className="space-y-6">
        {recommendations.map((rec) => {
          const colors = phaseColors[rec.phase];
          const phaseIds = rec.festivals.map((e) => e.festival.id);
          const allSelected = phaseIds.every((id) => selectedIds.has(id));
          const someSelected = phaseIds.some((id) => selectedIds.has(id));

          const targets = rec.festivals.filter((e) => e.source.type === "target");
          const suggestions = rec.festivals.filter((e) => e.source.type !== "target");
          const hasSuggestions = hasTargetMode && suggestions.length > 0;
          const suggestionsCollapsed = collapsedSuggestions.has(rec.phase);

          // Determine which entries to show
          const visibleEntries = (hasTargetMode && suggestionsCollapsed)
            ? targets
            : rec.festivals;

          return (
            <div
              key={rec.phase}
              className={`rounded-xl border ${colors.border} overflow-hidden`}
            >
              <div className={`${colors.bg} px-3 sm:px-5 py-3 flex flex-wrap items-center gap-2 sm:gap-3`}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={allSelected ? "true" : someSelected ? "mixed" : "false"}
                  aria-label={`Select all festivals in ${rec.label}`}
                  onClick={() => togglePhase(rec)}
                  className="flex items-center gap-2 group"
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      allSelected
                        ? "bg-gold-500 border-gold-500"
                        : someSelected
                          ? "bg-gold-500/30 border-gold-500"
                          : "border-film-500 group-hover:border-gold-400"
                    }`}
                  >
                    {(allSelected || someSelected) && (
                      <svg className="w-3 h-3 text-film-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        {allSelected ? (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                        )}
                      </svg>
                    )}
                  </span>
                </button>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${colors.badge}`}
                >
                  Phase {recommendations.indexOf(rec) + 1}
                </span>
                <h3 className="font-semibold text-film-50 text-sm sm:text-base">{rec.label}</h3>
                <span className="text-xs sm:text-sm text-film-400 ml-auto flex items-center gap-2">
                  {hasTargetMode && targets.length > 0 && suggestions.length > 0 ? (
                    <>{targets.length} target{targets.length !== 1 ? "s" : ""} + {suggestions.length} suggested</>
                  ) : (
                    <>{rec.festivals.length} festival{rec.festivals.length !== 1 ? "s" : ""}</>
                  )}
                </span>
              </div>

              <div className="divide-y divide-film-700/30">
                {visibleEntries.map((entry) => {
                  const isChecked = selectedIds.has(entry.festival.id);
                  const isSuggestion = hasTargetMode && entry.source.type !== "target";

                  return (
                    <div
                      key={entry.festival.id}
                      className={`px-3 sm:px-5 py-3 sm:py-4 bg-film-800/40 ${
                        isSuggestion ? "border-l-2 border-blue-500/30 ml-0" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isChecked}
                          aria-label={`Select ${entry.festival.name}`}
                          onClick={() => toggleFestival(entry.festival.id)}
                          className="mt-0.5 shrink-0 group"
                        >
                          <span
                            className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              isChecked
                                ? "bg-gold-500 border-gold-500"
                                : "border-film-500 group-hover:border-gold-400"
                            }`}
                          >
                            {isChecked && (
                              <svg className="w-3 h-3 text-film-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                        </button>

                        {/* Festival info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="font-medium text-film-50 flex items-center gap-2 flex-wrap">
                                <a href={`/festivals/${entry.festival.id}`} className="truncate hover:text-gold-400 transition-colors" onClick={(e) => e.stopPropagation()}>{entry.festival.name}</a>
                                {startHereIds.has(entry.festival.id) && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                                    Start here
                                  </span>
                                )}
                                <SourceBadge source={entry.source} />
                                <a
                                  href={entry.festival.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center text-film-500 hover:text-gold-400 transition-colors shrink-0"
                                  title="Visit festival website"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              </h4>
                              <p className="text-sm text-film-400 mt-0.5">
                                {entry.festival.location.city},{" "}
                                {entry.festival.location.country}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              {isDeadlinePast(entry.deadline.date) ? (
                                <>
                                  <p className="text-xs font-medium text-film-500 line-through">
                                    {formatDate(entry.deadline.date)}
                                  </p>
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-film-600/40 text-film-400">
                                    Passed
                                  </span>
                                </>
                              ) : (
                                <>
                                  <p className="text-sm font-medium text-gold-400">
                                    {entry.deadline.fee === 0
                                      ? "Free"
                                      : `$${entry.deadline.fee}`}
                                  </p>
                                  <p className="text-xs text-film-500">
                                    by {formatDate(entry.deadline.date)}
                                  </p>
                                </>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-film-400 mt-2">{entry.reason}</p>

                          {isDeadlinePast(entry.deadline.date) && (
                            <div className="mt-2 flex items-start gap-1.5 text-xs text-blue-300 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2">
                              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>
                                This deadline has passed, but some festivals accept late submissions or grant extensions.{" "}
                                <a
                                  href={entry.festival.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-200 underline hover:text-gold-400"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Contact the festival directly
                                </a>{" "}
                                to inquire.
                              </span>
                            </div>
                          )}

                          {entry.warning && (
                            <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                              <svg
                                className="w-4 h-4 shrink-0 mt-0.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                                />
                              </svg>
                              {entry.warning}
                            </div>
                          )}

                          {entry.festival.notificationDate && (
                            <p className="text-xs text-film-500 mt-1">
                              Notification expected: {formatDate(entry.festival.notificationDate)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Show/hide suggestions toggle */}
              {hasSuggestions && (
                <button
                  type="button"
                  onClick={() => toggleSuggestionCollapse(rec.phase)}
                  className={`w-full px-3 sm:px-5 py-2 text-xs text-film-400 hover:text-film-200 transition-colors flex items-center justify-center gap-1.5 ${colors.bg}`}
                >
                  <svg
                    className={`w-3.5 h-3.5 transition-transform ${suggestionsCollapsed ? "" : "rotate-180"}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                  {suggestionsCollapsed
                    ? `Show ${suggestions.length} suggestion${suggestions.length !== 1 ? "s" : ""}`
                    : `Hide suggestions`
                  }
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Build Plan button — sticky at bottom */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-4 mt-6 z-10">
          <button
            type="button"
            onClick={() => setShowPlan(true)}
            className="w-full px-6 py-3 bg-gold-500 text-film-950 rounded-xl font-semibold text-sm hover:bg-gold-400 transition-colors shadow-lg shadow-gold-500/20 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Build Submission Plan ({selectedIds.size} festival{selectedIds.size !== 1 ? "s" : ""})
          </button>
        </div>
      )}
    </div>
  );
}
