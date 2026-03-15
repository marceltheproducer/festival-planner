import { useState, useMemo } from "react";
import type { Festival, FilmProfile, StrategyResult, StrategyOptions } from "../lib/types";
import { generateStrategy } from "../lib/strategy";
import { genresMatch } from "../lib/genres";
import StrategyResults from "./StrategyResults";
import GenreTagPicker from "./GenreTagPicker";

interface StrategyPlannerProps {
  festivals: Festival[];
}

export default function StrategyPlanner({ festivals }: StrategyPlannerProps) {
  const [profile, setProfile] = useState<FilmProfile>({
    type: "short",
    genres: [],
    country: "USA",
    premiereStatus: "unscreened",
    targetFestivalIds: [],
    budget: null,
  });
  const [options, setOptions] = useState<StrategyOptions>({
    autoIncludeFree: true,
    maxSuggestions: 5,
  });
  const [results, setResults] = useState<StrategyResult | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = generateStrategy(festivals, profile, options);
    setResults(result);
  };

  const update = (partial: Partial<FilmProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...partial };
      if (partial.genres && next.targetFestivalIds.length > 0) {
        next.targetFestivalIds = next.targetFestivalIds.filter((id) => {
          const f = festivals.find((fest) => fest.id === id);
          return f ? genresMatch(f.genres, next.genres) : false;
        });
      }
      return next;
    });
    setResults(null);
  };

  const genreFilteredFestivals = useMemo(() => {
    if (profile.genres.length === 0) return festivals;
    return festivals.filter((f) => genresMatch(f.genres, profile.genres));
  }, [festivals, profile.genres]);

  const hasTargets = profile.targetFestivalIds.length > 0;

  return (
    <div>
      <form onSubmit={handleSubmit} className="bg-film-800/60 rounded-xl border border-film-700/50 p-4 sm:p-6 mb-8">
        <h2 className="text-lg font-semibold text-film-50 mb-6">
          Tell us about your film
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Film type */}
          <div>
            <label className="block text-sm font-medium text-film-300 mb-1">
              Film type
            </label>
            <select
              value={profile.type}
              onChange={(e) => update({ type: e.target.value as "short" | "feature" })}
              className="w-full px-3 py-2 text-sm bg-film-900 border border-film-600 text-film-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="short">Short Film</option>
              <option value="feature">Feature Film</option>
            </select>
          </div>

          {/* Genres */}
          <div className="md:col-span-2">
            <GenreTagPicker
              selectedGenres={profile.genres}
              onChange={(genres) => update({ genres })}
            />
          </div>

          {/* Country */}
          <div>
            <label className="block text-sm font-medium text-film-300 mb-1">
              Country of origin
            </label>
            <input
              type="text"
              value={profile.country}
              onChange={(e) => update({ country: e.target.value })}
              placeholder="e.g. USA, France, Japan"
              className="w-full px-3 py-2 text-sm bg-film-900 border border-film-600 text-film-100 rounded-lg placeholder:text-film-500 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>

          {/* Premiere status */}
          <div>
            <label className="block text-sm font-medium text-film-300 mb-1">
              Current premiere status
            </label>
            <select
              value={profile.premiereStatus}
              onChange={(e) =>
                update({
                  premiereStatus: e.target.value as FilmProfile["premiereStatus"],
                })
              }
              className="w-full px-3 py-2 text-sm bg-film-900 border border-film-600 text-film-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500"
            >
              <option value="unscreened">
                Unscreened (never shown publicly)
              </option>
              <option value="screened_domestically">
                Screened domestically only
              </option>
              <option value="screened_internationally">
                Screened internationally
              </option>
            </select>
            {profile.premiereStatus === "screened_internationally" && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                Most top-tier festivals require a world or international premiere. Your results will be limited to national premiere and open festivals.
              </div>
            )}
            {profile.premiereStatus === "screened_domestically" && (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-blue-300 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                World premiere festivals won't be available, but you can still target international, national, and open festivals.
              </div>
            )}
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-film-300 mb-1">
              Submission budget (USD, optional)
            </label>
            <input
              type="number"
              value={profile.budget ?? ""}
              onChange={(e) =>
                update({
                  budget: e.target.value ? parseInt(e.target.value) : null,
                })
              }
              placeholder="e.g. 500"
              min="0"
              className="w-full px-3 py-2 text-sm bg-film-900 border border-film-600 text-film-100 rounded-lg placeholder:text-film-500 focus:outline-none focus:ring-2 focus:ring-gold-500"
            />
          </div>
        </div>

        {/* Target festivals (optional multi-select) */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-film-300 mb-2">
            Target specific festivals (optional)
          </label>
          {profile.genres.length > 0 && (
            <p className="text-xs text-film-400 mb-2">
              Showing {genreFilteredFestivals.length} of {festivals.length} festivals matching your genres
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {genreFilteredFestivals.map((f) => {
              const isSelected = profile.targetFestivalIds.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() =>
                    update({
                      targetFestivalIds: isSelected
                        ? profile.targetFestivalIds.filter((id) => id !== f.id)
                        : [...profile.targetFestivalIds, f.id],
                    })
                  }
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    isSelected
                      ? "bg-gold-500 text-film-950 border-gold-500"
                      : "bg-film-800 text-film-300 border-film-600 hover:border-gold-400"
                  }`}
                >
                  {f.name}
                </button>
              );
            })}
          </div>
          {!hasTargets && (
            <p className="text-xs text-film-500 mt-1">
              Leave empty to consider all festivals.
            </p>
          )}
          {hasTargets && (
            <p className="text-xs text-film-500 mt-1">
              {profile.targetFestivalIds.length} target{profile.targetFestivalIds.length !== 1 ? "s" : ""} selected. We'll build a smart strategy around {profile.targetFestivalIds.length === 1 ? "this festival" : "these festivals"}.
            </p>
          )}
        </div>

        {/* Strategy options — shown when targets are selected */}
        {hasTargets && (
          <div className="mt-4 pt-4 border-t border-film-700/30">
            <button
              type="button"
              onClick={() => {
                setOptions((prev) => ({ ...prev, autoIncludeFree: !prev.autoIncludeFree }));
                setResults(null);
              }}
              className="flex items-center gap-3 cursor-pointer group w-full text-left"
            >
              <span
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
                  options.autoIncludeFree ? "bg-gold-500" : "bg-film-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                    options.autoIncludeFree ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </span>
              <div>
                <span className="text-sm text-film-200 group-hover:text-film-50 transition-colors">
                  Auto-include free festivals
                </span>
                <p className="text-xs text-film-500">
                  Suggest matching festivals with no submission fee
                </p>
              </div>
            </button>
          </div>
        )}

        <button
          type="submit"
          className="mt-6 px-6 py-2.5 bg-gold-500 text-film-950 rounded-lg font-medium text-sm hover:bg-gold-400 transition-colors"
        >
          Generate Strategy
        </button>
      </form>

      {results !== null && (
        <StrategyResults
          recommendations={results.recommendations}
          meta={results.meta}
        />
      )}
    </div>
  );
}
