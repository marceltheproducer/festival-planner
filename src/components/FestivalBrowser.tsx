import { useState, useMemo } from "react";
import type { Festival, Filters, SortOption } from "../lib/types";
import { createDefaultFilters, applyFilters, sortFestivals } from "../lib/filters";
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

  const filteredAndSorted = useMemo(() => {
    const filtered = applyFilters(festivals, filters);
    return sortFestivals(filtered, sort, filters.search);
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
          <p className="text-sm text-film-400">
            {filteredAndSorted.length} festival{filteredAndSorted.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {chips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={chip.remove}
                className="text-xs px-2.5 py-1 rounded-full border bg-gold-500/15 text-gold-300 border-gold-500/30 hover:bg-red-500/15 hover:text-red-300 hover:border-red-500/30 transition-colors flex items-center gap-1"
              >
                {chip.label}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {filteredAndSorted.length === 0 ? (
          <div className="text-center py-16 text-film-500">
            <p className="text-lg mb-2">No festivals match your filters</p>
            <p className="text-sm text-film-600">Try adjusting your filters or search criteria.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredAndSorted.map((festival) => (
              <FestivalCard key={festival.id} festival={festival} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
