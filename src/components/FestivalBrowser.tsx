import { useState, useMemo } from "react";
import type { Festival, Filters, SortOption } from "../lib/types";
import { createDefaultFilters, applyFilters, sortFestivals } from "../lib/filters";
import FilterPanel from "./FilterPanel";
import FestivalCard from "./FestivalCard";

interface FestivalBrowserProps {
  festivals: Festival[];
}

export default function FestivalBrowser({ festivals }: FestivalBrowserProps) {
  const [filters, setFilters] = useState<Filters>(createDefaultFilters);
  const [sort, setSort] = useState<SortOption>("deadline");

  const filteredAndSorted = useMemo(() => {
    const filtered = applyFilters(festivals, filters);
    return sortFestivals(filtered, sort);
  }, [festivals, filters, sort]);

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
