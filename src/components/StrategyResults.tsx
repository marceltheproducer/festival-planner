import { useState, useMemo } from "react";
import type { StrategyRecommendation, StrategyEntry, StrategyMeta } from "../lib/types";
import { TIER_ORDER } from "../lib/types";
import SubmissionPlan from "./SubmissionPlan";

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function isDeadlinePast(dateStr: string): boolean {
  return dateStr < new Date().toISOString().split("T")[0];
}

function SourceBadge({ source }: { source: StrategyEntry["source"] }) {
  switch (source.type) {
    case "target":
      return <span className="np-badge np-badge--target">Target</span>;
    case "free_match":
      return <span className="np-badge np-badge--free">Free</span>;
    case "complementary":
      return <span className="np-badge np-badge--suggested">Suggested</span>;
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

  const hasTargetMode = recommendations.some((rec) => rec.festivals.some((e) => e.source.type !== "discovery"));

  const toggleFestival = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const togglePhase = (rec: StrategyRecommendation) => {
    const phaseIds = rec.festivals.map((e) => e.festival.id);
    const allSelected = phaseIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      phaseIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const toggleSuggestionCollapse = (phase: string) => {
    setCollapsedSuggestions((prev) => {
      const next = new Set(prev);
      next.has(phase) ? next.delete(phase) : next.add(phase);
      return next;
    });
  };

  const selectedEntries = useMemo(() => {
    const entries: { phase: StrategyRecommendation["phase"]; label: string; entry: StrategyEntry }[] = [];
    for (const rec of recommendations) {
      for (const entry of rec.festivals) {
        if (selectedIds.has(entry.festival.id)) entries.push({ phase: rec.phase, label: rec.label, entry });
      }
    }
    return entries;
  }, [selectedIds, recommendations]);

  const startHereIds = useMemo(() => {
    // Only actionable festivals can be a starting point — never a passed deadline.
    const allEntries = recommendations.flatMap((rec) => rec.festivals).filter((e) => !isDeadlinePast(e.deadline.date));
    const scored = allEntries.map((e) => {
      let score = 0;
      if (e.source.type === "target") score += 100;
      score += (3 - TIER_ORDER[e.festival.tier]) * 20;
      if (e.deadline.fee === 0) score += 30;
      return { id: e.festival.id, score, deadline: e.deadline.date };
    });
    scored.sort((a, b) => b.score - a.score || a.deadline.localeCompare(b.deadline));
    return new Set(scored.slice(0, 3).map((s) => s.id));
  }, [recommendations]);

  if (recommendations.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "56px 0", border: "2.5px solid var(--np-ink)", background: "var(--np-paper-2)" }}>
        <p style={{ fontFamily: "var(--np-display)", textTransform: "uppercase", fontSize: 28, color: "var(--np-ink)" }}>No eligible festivals</p>
        <p style={{ fontFamily: "var(--np-serif)", fontStyle: "italic", color: "var(--np-ink-2)", marginTop: 4 }}>Adjust your film profile or pick fewer targets.</p>
      </div>
    );
  }

  if (showPlan && selectedEntries.length > 0) {
    return <SubmissionPlan selectedEntries={selectedEntries} onBack={() => setShowPlan(false)} />;
  }

  const totalFestivals = recommendations.reduce((sum, rec) => sum + rec.festivals.length, 0);
  // Est. total fees counts only what you'd actually pay: skip passed deadlines
  // (longshots you'd have to contact about, not budgeted into the plan).
  const totalFee = recommendations.reduce(
    (sum, rec) => sum + rec.festivals.reduce((s, e) => s + (isDeadlinePast(e.deadline.date) ? 0 : e.deadline.fee), 0),
    0
  );
  const targetCount = hasTargetMode ? recommendations.reduce((sum, rec) => sum + rec.festivals.filter((e) => e.source.type === "target").length, 0) : 0;
  const suggestedCount = hasTargetMode ? totalFestivals - targetCount : 0;

  return (
    <div>
      {/* Summary */}
      <div className="np-bynum" style={{ marginBottom: 18 }}>
        {hasTargetMode ? (
          <>
            <div className="n"><div className="big">{targetCount}</div><div className="lab">Target{targetCount !== 1 ? "s" : ""}</div></div>
            <div className="n"><div className="big">{suggestedCount}</div><div className="lab">Suggested</div></div>
          </>
        ) : (
          <div className="n"><div className="big">{totalFestivals}</div><div className="lab">Festivals</div></div>
        )}
        <div className="n"><div className="big paper">{totalFee === 0 ? "Free" : `$${totalFee}`}</div><div className="lab">Est. total fees</div></div>
        {meta.freeCount > 0 && <div className="n"><div className="big">{meta.freeCount}</div><div className="lab">Free</div></div>}
        <div className="n"><div className="big paper">{recommendations.length}</div><div className="lab">Phases</div></div>
      </div>

      {meta.excludedByBudget > 0 && (
        <div className="np-metawarn">
          {meta.excludedByBudget} eligible festival{meta.excludedByBudget !== 1 ? "s" : ""} excluded by your budget.
          {meta.freeCount > 0 && ` ${meta.freeCount} free festival${meta.freeCount !== 1 ? "s" : ""} included at no cost.`} Raise your budget to see more.
        </div>
      )}

      {/* Premiere guide */}
      {recommendations.length > 1 && (
        <div className="np-guide" style={{ marginTop: 14 }}>
          <button
            type="button"
            onClick={() => setShowPremiereGuide((v) => !v)}
            aria-expanded={showPremiereGuide}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, width: "100%", textAlign: "left" }}
          >
            <span className="np-guide__h">How premiere strategy works {showPremiereGuide ? "−" : "+"}</span>
          </button>
          {showPremiereGuide && (
            <div style={{ marginTop: 8 }}>
              <p><strong style={{ color: "var(--np-ink)" }}>Your premiere status is your most valuable asset.</strong> Top festivals want to be first. Once you screen at one, you've "used" that premiere level. Submit to the highest tier first; if you don't get in, your status is preserved and you move down.</p>
              <div className="np-guide__legend">
                <span><i style={{ background: "var(--np-red)" }} /> World: never shown anywhere</span>
                <span><i style={{ background: "var(--np-blue)" }} /> International: shown at home only</span>
                <span><i style={{ background: "var(--np-mustard)" }} /> National: first in a country</span>
                <span><i style={{ background: "var(--np-ink)" }} /> Open: no requirement</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Phases */}
      <div style={{ marginTop: 6 }}>
        {recommendations.map((rec, phaseIdx) => {
          const phaseIds = rec.festivals.map((e) => e.festival.id);
          const allSelected = phaseIds.every((id) => selectedIds.has(id));
          const someSelected = phaseIds.some((id) => selectedIds.has(id));
          const targets = rec.festivals.filter((e) => e.source.type === "target");
          const suggestions = rec.festivals.filter((e) => e.source.type !== "target");
          const hasSuggestions = hasTargetMode && suggestions.length > 0;
          const suggestionsCollapsed = collapsedSuggestions.has(rec.phase);
          const visibleEntries = hasTargetMode && suggestionsCollapsed ? targets : rec.festivals;

          return (
            <div key={rec.phase} className="np-phase">
              <div className="np-phase__head">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={allSelected ? "true" : someSelected ? "mixed" : "false"}
                  aria-label={`Select all in ${rec.label}`}
                  onClick={() => togglePhase(rec)}
                  className={`np-check${allSelected ? " on" : ""}`}
                  style={{ borderColor: "var(--np-paper)", background: allSelected ? "var(--np-mustard)" : someSelected ? "var(--np-ink-2)" : "transparent" }}
                >
                  {(allSelected || someSelected) && (
                    <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke={allSelected ? "var(--np-ink)" : "var(--np-paper)"} strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={allSelected ? "M5 13l4 4L19 7" : "M5 12h14"} />
                    </svg>
                  )}
                </button>
                <span className="np-phase__num">{phaseIdx + 1}</span>
                <span className="np-phase__t">{rec.label}</span>
                <span className="np-phase__req">
                  {hasTargetMode && targets.length > 0 && suggestions.length > 0
                    ? `${targets.length} target${targets.length !== 1 ? "s" : ""} + ${suggestions.length} suggested`
                    : `${rec.festivals.length} festival${rec.festivals.length !== 1 ? "s" : ""}`}
                </span>
              </div>

              {visibleEntries.map((entry) => {
                const isChecked = selectedIds.has(entry.festival.id);
                const isSuggestion = hasTargetMode && entry.source.type !== "target";
                const past = isDeadlinePast(entry.deadline.date);
                return (
                  <div key={entry.festival.id} className={`np-entry${isSuggestion ? " suggested" : ""}`}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      aria-label={`Select ${entry.festival.name}`}
                      onClick={() => toggleFestival(entry.festival.id)}
                      className={`np-check${isChecked ? " on" : ""}`}
                    >
                      {isChecked && (
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="var(--np-ink)" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    <div className="np-entry__body">
                      <div className="np-entry__top">
                        <div style={{ minWidth: 0 }}>
                          <h4 className="np-entry__name">
                            <a href={`/festivals/${entry.festival.id}`}>{entry.festival.name}</a>
                            {startHereIds.has(entry.festival.id) && <span className="np-badge np-badge--start">★ Start here</span>}
                            {entry.projected && <span className="np-badge np-badge--est">Est. next cycle</span>}
                            <SourceBadge source={entry.source} />
                          </h4>
                          <div className="np-entry__loc">{entry.festival.location.city}, {entry.festival.location.country} · {entry.festival.tier}</div>
                        </div>
                        <div className="np-entry__right">
                          {past ? (
                            <div className="np-entry__dl passed">{formatDate(entry.deadline.date)}</div>
                          ) : (
                            <>
                              <div className="np-entry__dl">{formatDate(entry.deadline.date)}</div>
                              <div className={`np-entry__fee${entry.deadline.fee === 0 ? " free" : ""}`}>{entry.deadline.fee === 0 ? "Free" : `$${entry.deadline.fee}`}</div>
                            </>
                          )}
                        </div>
                      </div>

                      <p className="np-entry__why">{entry.reason}</p>

                      {past && (
                        <div className="np-note-good">
                          <div>This deadline has passed, but some festivals take late submissions. <a href={entry.festival.website} target="_blank" rel="noopener noreferrer" style={{ color: "var(--np-blue)", textDecoration: "underline" }}>Contact the festival</a> to inquire.</div>
                        </div>
                      )}

                      {entry.warning && (
                        <div className="np-warn">
                          <div><div className="np-warn__t">Heads up</div>{entry.warning}</div>
                        </div>
                      )}

                      {entry.festival.notificationDate && (
                        <p className="np-entry__loc" style={{ marginTop: 6 }}>Notification expected: {formatDate(entry.festival.notificationDate)}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {hasSuggestions && (
                <button type="button" onClick={() => toggleSuggestionCollapse(rec.phase)} className="np-phase__toggle">
                  {suggestionsCollapsed ? `Show ${suggestions.length} suggestion${suggestions.length !== 1 ? "s" : ""}` : "Hide suggestions"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Build plan */}
      {selectedIds.size > 0 && (
        <div style={{ position: "sticky", bottom: 16, marginTop: 20, zIndex: 10 }}>
          <div className="np-buildbar">
            <div>
              <div className="np-buildbar__t">Ready to run it?</div>
              <div className="np-buildbar__s">{selectedIds.size} festival{selectedIds.size !== 1 ? "s" : ""} selected</div>
            </div>
            <button type="button" onClick={() => setShowPlan(true)} className="np-buildbar__go">Build submission plan →</button>
          </div>
        </div>
      )}
    </div>
  );
}
