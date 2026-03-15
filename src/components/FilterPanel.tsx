import { useState } from "react";
import type { Filters, SortOption, Festival } from "../lib/types";
import { ALL_GENRES, ALL_REGIONS } from "../lib/types";

interface FilterPanelProps {
  filters: Filters;
  sort: SortOption;
  onChange: (filters: Filters) => void;
  onSortChange: (sort: SortOption) => void;
}

const tiers: Festival["tier"][] = ["A-list", "major", "mid", "emerging"];
const premiereOptions: Festival["premiereRequirement"][] = [
  "world",
  "international",
  "national",
  "regional",
  "none",
];
const filmTypes: Festival["type"][] = ["short", "feature", "both"];
const deadlineWindows = [
  { label: "Next 30 days", value: 30 },
  { label: "Next 60 days", value: 60 },
  { label: "Next 90 days", value: 90 },
  { label: "Next 6 months", value: 180 },
  { label: "Any", value: null },
];

function CheckboxGroup<T extends string>({
  label,
  options,
  selected,
  onChange,
  formatLabel,
}: {
  label: string;
  options: readonly T[];
  selected: T[];
  onChange: (selected: T[]) => void;
  formatLabel?: (value: T) => string;
}) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-film-400 uppercase tracking-wider mb-2">
        {label}
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() =>
                onChange(
                  isSelected
                    ? selected.filter((s) => s !== opt)
                    : [...selected, opt]
                )
              }
              aria-pressed={isSelected}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                isSelected
                  ? "bg-gold-500 text-film-950 border-gold-500"
                  : "bg-film-800 text-film-300 border-film-600 hover:border-gold-500/50"
              }`}
            >
              {formatLabel ? formatLabel(opt) : opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function FilterPanel({
  filters,
  sort,
  onChange,
  onSortChange,
}: FilterPanelProps) {
  const [expanded, setExpanded] = useState(true);

  const update = (partial: Partial<Filters>) => {
    onChange({ ...filters, ...partial });
  };

  const clearAll = () => {
    onChange({
      search: "",
      filmType: [],
      genres: [],
      regions: [],
      tiers: [],
      premiereRequirements: [],
      maxFee: null,
      deadlineWindow: null,
      submissionPlatforms: [],
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.filmType.length > 0 ||
    filters.genres.length > 0 ||
    filters.regions.length > 0 ||
    filters.tiers.length > 0 ||
    filters.premiereRequirements.length > 0 ||
    filters.maxFee !== null ||
    filters.deadlineWindow !== null ||
    filters.submissionPlatforms.length > 0;

  return (
    <div className="bg-film-800/60 rounded-xl border border-film-700/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="font-semibold text-film-50 flex items-center gap-1"
        >
          Filters
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-gold-400 hover:text-gold-300"
          >
            Clear all
          </button>
        )}
      </div>

      {expanded && (
        <div className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Search festivals..."
              value={filters.search}
              onChange={(e) => update({ search: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-film-900 border border-film-600 rounded-lg text-film-100 placeholder-film-500 focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-transparent"
            />
          </div>

          <div>
            <h4 className="text-xs font-semibold text-film-400 uppercase tracking-wider mb-2">
              Sort by
            </h4>
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="w-full px-3 py-2 text-sm bg-film-900 border border-film-600 rounded-lg text-film-100 focus:outline-none focus:ring-2 focus:ring-gold-500/50"
            >
              <option value="deadline">Deadline (soonest)</option>
              <option value="prestige">Prestige (highest)</option>
              <option value="fee">Fee (lowest)</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          <CheckboxGroup
            label="Film type"
            options={filmTypes}
            selected={filters.filmType}
            onChange={(filmType) => update({ filmType })}
            formatLabel={(v) => (v === "both" ? "Both" : v.charAt(0).toUpperCase() + v.slice(1))}
          />

          <CheckboxGroup
            label="Genre"
            options={ALL_GENRES}
            selected={filters.genres}
            onChange={(genres) => update({ genres })}
          />

          <CheckboxGroup
            label="Region"
            options={ALL_REGIONS}
            selected={filters.regions}
            onChange={(regions) => update({ regions })}
          />

          <CheckboxGroup
            label="Tier"
            options={tiers}
            selected={filters.tiers}
            onChange={(tiers) => update({ tiers })}
          />

          <CheckboxGroup
            label="Premiere requirement"
            options={premiereOptions}
            selected={filters.premiereRequirements}
            onChange={(premiereRequirements) => update({ premiereRequirements })}
            formatLabel={(v) => (v === "none" ? "None" : v.charAt(0).toUpperCase() + v.slice(1))}
          />

          <CheckboxGroup
            label="Submission platform"
            options={["filmfreeway", "direct", "other"] as const}
            selected={filters.submissionPlatforms}
            onChange={(submissionPlatforms) => update({ submissionPlatforms })}
            formatLabel={(v) =>
              v === "filmfreeway" ? "FilmFreeway" : v === "direct" ? "Direct" : "Other"
            }
          />

          <div>
            <h4 className="text-xs font-semibold text-film-400 uppercase tracking-wider mb-2">
              Max submission fee: {filters.maxFee === null ? "Any" : `$${filters.maxFee}`}
            </h4>
            <input
              type="range"
              min="0"
              max="200"
              step="5"
              value={filters.maxFee ?? 200}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                update({ maxFee: val >= 200 ? null : val });
              }}
              className="w-full accent-gold-500"
            />
          </div>

          <div>
            <h4 className="text-xs font-semibold text-film-400 uppercase tracking-wider mb-2">
              Deadline window
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {deadlineWindows.map((dw) => (
                <button
                  key={dw.label}
                  type="button"
                  onClick={() => update({ deadlineWindow: dw.value })}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    filters.deadlineWindow === dw.value
                      ? "bg-gold-500 text-film-950 border-gold-500"
                      : "bg-film-800 text-film-300 border-film-600 hover:border-gold-500/50"
                  }`}
                >
                  {dw.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
