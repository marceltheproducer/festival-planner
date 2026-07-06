import { useState, useMemo } from "react";
import type { Festival, FilmProfile, StrategyResult, StrategyOptions } from "../lib/types";
import { ALL_GENRES } from "../lib/types";
import { generateStrategy } from "../lib/strategy";
import { genresMatch } from "../lib/genres";
import StrategyResults from "./StrategyResults";

interface StrategyPlannerProps {
  festivals: Festival[];
}

function addMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split("T")[0];
}

export default function StrategyPlanner({ festivals }: StrategyPlannerProps) {
  const today = new Date().toISOString().split("T")[0];
  const readyPresets = useMemo(
    () => [
      { label: "Ready now", value: today },
      { label: "+3 mo", value: addMonths(3) },
      { label: "+6 mo", value: addMonths(6) },
      { label: "+1 yr", value: addMonths(12) },
    ],
    [today]
  );

  const [profile, setProfile] = useState<FilmProfile>({
    type: "short",
    genres: [],
    country: "USA",
    premiereStatus: "unscreened",
    targetFestivalIds: [],
    budget: null,
    premiereFlexible: false,
    readyDate: today,
  });
  const [options, setOptions] = useState<StrategyOptions>({ autoIncludeFree: true, maxSuggestions: 5 });
  const [results, setResults] = useState<StrategyResult | null>(null);
  const [targetSearch, setTargetSearch] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResults(generateStrategy(festivals, profile, options));
  };

  const update = (partial: Partial<FilmProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...partial };
      if ((partial.genres || partial.type) && next.targetFestivalIds.length > 0) {
        next.targetFestivalIds = next.targetFestivalIds.filter((id) => {
          const f = festivals.find((fest) => fest.id === id);
          if (!f) return false;
          if (f.type !== "both" && f.type !== next.type) return false;
          if (next.genres.length > 0 && !genresMatch(f.genres, next.genres)) return false;
          return true;
        });
      }
      return next;
    });
    setResults(null);
  };

  const toggleGenre = (g: string) => {
    const has = profile.genres.includes(g);
    update({ genres: has ? profile.genres.filter((x) => x !== g) : [...profile.genres, g] });
  };

  const genreFilteredFestivals = useMemo(
    () =>
      festivals.filter((f) => {
        if (f.type !== "both" && f.type !== profile.type) return false;
        if (profile.genres.length > 0 && !genresMatch(f.genres, profile.genres)) return false;
        return true;
      }),
    [festivals, profile.genres, profile.type]
  );

  const hasTargets = profile.targetFestivalIds.length > 0;

  return (
    <div>
      <form onSubmit={handleSubmit} style={{ marginBottom: 32 }}>
        <div className="np-form">
          <div className="np-form__head">
            Film Particulars <span>ALL FIELDS OPTIONAL BUT ONE</span>
          </div>

          <div className="np-fgrid">
            {/* A — Format */}
            <div className="np-field">
              <span className="np-lab"><span className="no">A</span> Format</span>
              <div className="np-seg">
                <button type="button" className={profile.type === "short" ? "on" : ""} onClick={() => update({ type: "short" })}>Short</button>
                <button type="button" className={profile.type === "feature" ? "on" : ""} onClick={() => update({ type: "feature" })}>Feature</button>
              </div>
            </div>

            {/* B — Ready date */}
            <div className="np-field np-field--rt">
              <span className="np-lab"><span className="no">B</span> When's it ready?</span>
              <input
                type="date"
                min={today}
                value={profile.readyDate}
                onChange={(e) => update({ readyDate: e.target.value || today })}
                className="np-inp"
                aria-label="Ready date"
              />
              <div className="np-presets">
                {readyPresets.map((p) => (
                  <button key={p.label} type="button" className={`np-preset${profile.readyDate === p.value ? " on" : ""}`} onClick={() => update({ readyDate: p.value })}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* C — Genre */}
            <div className="np-field np-field--full">
              <span className="np-lab"><span className="no">C</span> Genre</span>
              <div className="np-chips">
                {ALL_GENRES.map((g) => (
                  <button key={g} type="button" className="np-chip" aria-pressed={profile.genres.includes(g)} onClick={() => toggleGenre(g)}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* D — Country */}
            <div className="np-field">
              <span className="np-lab"><span className="no">D</span> Country of origin</span>
              <input type="text" value={profile.country} onChange={(e) => update({ country: e.target.value })} className="np-inp" aria-label="Country" placeholder="e.g. USA" />
            </div>

            {/* E — Budget */}
            <div className="np-field np-field--rt">
              <span className="np-lab"><span className="no">E</span> Submission budget</span>
              <input
                type="number"
                min="0"
                value={profile.budget ?? ""}
                onChange={(e) => update({ budget: e.target.value ? parseInt(e.target.value) : null })}
                className="np-inp"
                aria-label="Budget"
                placeholder="e.g. 500"
              />
            </div>

            {/* F — Premiere status */}
            <div className="np-field np-field--full">
              <span className="np-lab"><span className="no">F</span> Premiere status <span className="hint">— where has it screened?</span></span>
              <div className="np-seg np-seg--wide">
                <button type="button" className={profile.premiereStatus === "unscreened" ? "on" : ""} onClick={() => update({ premiereStatus: "unscreened" })}>Unscreened</button>
                <button type="button" className={profile.premiereStatus === "screened_domestically" ? "on" : ""} onClick={() => update({ premiereStatus: "screened_domestically" })}>Shown at home</button>
                <button type="button" className={profile.premiereStatus === "screened_internationally" ? "on" : ""} onClick={() => update({ premiereStatus: "screened_internationally" })}>Shown abroad</button>
              </div>
              {profile.premiereStatus === "screened_internationally" && (
                <div className="np-warn" style={{ marginTop: 10 }}>
                  <div><div className="np-warn__t">Heads up</div>Most top-tier festivals want a world or international premiere. Results will lean toward national and open festivals.</div>
                </div>
              )}
              {profile.premiereStatus === "screened_domestically" && (
                <div className="np-note-good" style={{ marginTop: 10 }}>
                  <div>World-premiere festivals won't appear, but international, national, and open festivals are still in play.</div>
                </div>
              )}
            </div>

            {/* G — Premiere priority */}
            <div className="np-field">
              <span className="np-lab"><span className="no">G</span> Premiere priority</span>
              <button type="button" className="np-toggle" aria-pressed={profile.premiereFlexible} onClick={() => update({ premiereFlexible: !profile.premiereFlexible })}>
                <span className={`sw${profile.premiereFlexible ? " on" : ""}`} />
                <span className="tx"><b>Premiere status isn't a priority</b><p>Common for shorts. Rank by fit &amp; cost, skip the "protect your premiere" nags.</p></span>
              </button>
            </div>

            {/* H — Auto-include free */}
            <div className="np-field np-field--rt">
              <span className="np-lab"><span className="no">H</span> Free festivals</span>
              <button
                type="button"
                className="np-toggle"
                aria-pressed={options.autoIncludeFree}
                onClick={() => { setOptions((o) => ({ ...o, autoIncludeFree: !o.autoIncludeFree })); setResults(null); }}
              >
                <span className={`sw${options.autoIncludeFree ? " on" : ""}`} />
                <span className="tx"><b>Auto-include free festivals</b><p>Fold matching no-fee festivals into the plan automatically.</p></span>
              </button>
            </div>

            {/* Targets */}
            <div className="np-field np-field--full">
              <span className="np-lab"><span className="no">I</span> Target festivals <span className="hint">— optional; we build a plan around them</span></span>
              {hasTargets && (
                <div className="np-chips" style={{ marginBottom: 8 }}>
                  {profile.targetFestivalIds.map((id) => {
                    const f = festivals.find((fest) => fest.id === id);
                    if (!f) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        className="np-chip on"
                        onClick={() => update({ targetFestivalIds: profile.targetFestivalIds.filter((t) => t !== id) })}
                      >
                        {f.name} ✕
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="np-target-picker">
                <input
                  type="text"
                  value={targetSearch}
                  onChange={(e) => setTargetSearch(e.target.value)}
                  placeholder="Search festivals to pin…"
                  aria-label="Search target festivals"
                />
                <div className="np-target-list scrollbar-thin">
                  {genreFilteredFestivals
                    .filter((f) => !profile.targetFestivalIds.includes(f.id))
                    .filter((f) => !targetSearch || f.name.toLowerCase().includes(targetSearch.toLowerCase()) || f.location.city.toLowerCase().includes(targetSearch.toLowerCase()))
                    .slice(0, 40)
                    .map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        className="np-chip"
                        onClick={() => { update({ targetFestivalIds: [...profile.targetFestivalIds, f.id] }); setTargetSearch(""); }}
                      >
                        {f.name}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>

          <div className="np-form__foot">
            <span className="np-fnote">
              {hasTargets
                ? `${profile.targetFestivalIds.length} target${profile.targetFestivalIds.length !== 1 ? "s" : ""} pinned`
                : "Leave targets empty to consider all festivals."}
            </span>
            <button type="submit" className="np-btn np-btn-ink">Generate Strategy →</button>
          </div>
        </div>
      </form>

      {results !== null && <StrategyResults recommendations={results.recommendations} meta={results.meta} />}
    </div>
  );
}
