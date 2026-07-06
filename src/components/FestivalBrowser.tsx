import { useState, useMemo, useEffect } from "react";
import type { Festival, Filters, SortOption } from "../lib/types";
import { createDefaultFilters, applyFilters, sortFestivals, isShortFocused } from "../lib/filters";
import FilterPanel from "./FilterPanel";
import FestivalCard from "./FestivalCard";

interface FestivalBrowserProps {
  festivals: Festival[];
}

interface FilterChip {
  label: string;
  remove: () => void;
}

function getActiveChips(filters: Filters, onChange: (f: Filters) => void): FilterChip[] {
  const chips: FilterChip[] = [];

  if (filters.search) {
    chips.push({
      label: `"${filters.search}"`,
      remove: () => onChange({ ...filters, search: "" }),
    });
  }
  for (const t of filters.filmType) {
    chips.push({
      label: t === "both" ? "Both" : t.charAt(0).toUpperCase() + t.slice(1),
      remove: () => onChange({ ...filters, filmType: filters.filmType.filter((v) => v !== t) }),
    });
  }
  for (const g of filters.genres) {
    chips.push({
      label: g,
      remove: () => onChange({ ...filters, genres: filters.genres.filter((v) => v !== g) }),
    });
  }
  for (const r of filters.regions) {
    chips.push({
      label: r,
      remove: () => onChange({ ...filters, regions: filters.regions.filter((v) => v !== r) }),
    });
  }
  for (const t of filters.tiers) {
    chips.push({
      label: t,
      remove: () => onChange({ ...filters, tiers: filters.tiers.filter((v) => v !== t) }),
    });
  }
  for (const p of filters.premiereRequirements) {
    chips.push({
      label: p === "none" ? "No premiere" : `${p} premiere`,
      remove: () => onChange({ ...filters, premiereRequirements: filters.premiereRequirements.filter((v) => v !== p) }),
    });
  }
  for (const s of filters.submissionPlatforms) {
    chips.push({
      label: s === "filmfreeway" ? "FilmFreeway" : s === "direct" ? "Direct" : "Other",
      remove: () => onChange({ ...filters, submissionPlatforms: filters.submissionPlatforms.filter((v) => v !== s) }),
    });
  }
  if (filters.maxFee !== null) {
    chips.push({
      label: `Max $${filters.maxFee}`,
      remove: () => onChange({ ...filters, maxFee: null }),
    });
  }
  if (filters.deadlineWindow !== null) {
    const label = filters.deadlineWindow <= 30 ? "30 days"
      : filters.deadlineWindow <= 60 ? "60 days"
      : filters.deadlineWindow <= 90 ? "90 days"
      : "6 months";
    chips.push({
      label: `Within ${label}`,
      remove: () => onChange({ ...filters, deadlineWindow: null }),
    });
  }

  return chips;
}

export default function FestivalBrowser({ festivals }: FestivalBrowserProps) {
  const [filters, setFilters] = useState<Filters>(createDefaultFilters);
  const [sort, setSort] = useState<SortOption>("deadline");
  const [visibleCount, setVisibleCount] = useState(30);

  // Persist filters + sort so a returning visitor keeps their view.
  useEffect(() => {
    try {
      const f = localStorage.getItem("fp-filters");
      if (f) setFilters((prev) => ({ ...prev, ...JSON.parse(f) }));
      const s = localStorage.getItem("fp-sort");
      if (s) setSort(JSON.parse(s));
    } catch { /* ignore corrupt storage */ }
  }, []);
  useEffect(() => {
    try { localStorage.setItem("fp-filters", JSON.stringify(filters)); } catch { /* private mode */ }
  }, [filters]);
  useEffect(() => {
    try { localStorage.setItem("fp-sort", JSON.stringify(sort)); } catch { /* private mode */ }
  }, [sort]);
  // Reset the visible window whenever the result set changes.
  useEffect(() => { setVisibleCount(30); }, [filters, sort]);

  const filteredAndSorted = useMemo(() => {
    const filtered = applyFilters(festivals, filters);
    return sortFestivals(filtered, sort, filters.search, isShortFocused(filters));
  }, [festivals, filters, sort]);

  const chips = useMemo(() => getActiveChips(filters, setFilters), [filters]);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <aside className="w-full lg:w-80 shrink-0">
        <FilterPanel
          filters={filters}
          sort={sort}
          onChange={setFilters}
          onSortChange={setSort}
        />
      </aside>

      <div className="flex-1">
        <div className="flex items-center justify-between mb-4">
          <p className="np-count">
            <b>{filteredAndSorted.length}</b> festival{filteredAndSorted.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {chips.length > 0 && (
          <div className="np-activechips" style={{ marginBottom: 18 }}>
            {chips.map((chip) => (
              <button key={chip.label} type="button" onClick={chip.remove} className="np-activechip">
                {chip.label}
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {filteredAndSorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: "56px 0" }}>
            <p style={{ fontFamily: "var(--np-display)", textTransform: "uppercase", fontSize: 28, color: "var(--np-ink)" }}>
              No festivals match
            </p>
            <p style={{ fontFamily: "var(--np-serif)", fontStyle: "italic", color: "var(--np-ink-2)", marginTop: 4 }}>
              Try loosening your filters or search.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2">
              {filteredAndSorted.slice(0, visibleCount).map((festival) => (
                <FestivalCard key={festival.id} festival={festival} shortFocused={isShortFocused(filters)} />
              ))}
            </div>
            {filteredAndSorted.length > visibleCount && (
              <div style={{ textAlign: "center", marginTop: 24 }}>
                <button type="button" className="np-btn np-btn-ghost" onClick={() => setVisibleCount((c) => c + 30)}>
                  Show more ({filteredAndSorted.length - visibleCount} left)
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
