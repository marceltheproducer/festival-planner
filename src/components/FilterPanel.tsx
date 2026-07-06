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
const premiereOptions: Festival["premiereRequirement"][] = ["world", "international", "national", "regional", "none"];
const filmTypes: Festival["type"][] = ["short", "feature", "both"];
const deadlineWindows = [
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
  { label: "6 months", value: 180 },
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
      <span className="np-fgroup__label">{label}</span>
      <div className="np-chips">
        {options.map((opt) => {
          const isSelected = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(isSelected ? selected.filter((s) => s !== opt) : [...selected, opt])}
              aria-pressed={isSelected}
              className="np-chip"
            >
              {formatLabel ? formatLabel(opt) : opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function FilterPanel({ filters, sort, onChange, onSortChange }: FilterPanelProps) {
  const [expanded, setExpanded] = useState(true);

  const update = (partial: Partial<Filters>) => onChange({ ...filters, ...partial });

  const clearAll = () =>
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
    <div className="np-panel">
      <div className="np-panel__head">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
        >
          <h3>Filters</h3>
        </button>
        {hasActiveFilters && (
          <button type="button" onClick={clearAll} className="np-panel__clear">
            Clear all
          </button>
        )}
      </div>

      {expanded && (
        <div className="np-panel__body">
          <div>
            <span className="np-fgroup__label">Search</span>
            <input
              type="text"
              placeholder="Festival, city, country…"
              value={filters.search}
              onChange={(e) => update({ search: e.currentTarget.value })}
              className="np-input"
            />
          </div>

          <div>
            <span className="np-fgroup__label">Sort by</span>
            <select value={sort} onChange={(e) => onSortChange(e.currentTarget.value as SortOption)} className="np-select">
              <option value="deadline">Deadline (soonest)</option>
              <option value="prestige">Prestige (highest)</option>
              <option value="fee">Fee (lowest)</option>
              <option value="name">Name (A–Z)</option>
            </select>
          </div>

          <CheckboxGroup
            label="Film type"
            options={filmTypes}
            selected={filters.filmType}
            onChange={(filmType) => update({ filmType })}
            formatLabel={(v) => (v === "both" ? "Both" : v.charAt(0).toUpperCase() + v.slice(1))}
          />

          <CheckboxGroup label="Genre" options={ALL_GENRES} selected={filters.genres} onChange={(genres) => update({ genres })} />

          <CheckboxGroup label="Region" options={ALL_REGIONS} selected={filters.regions} onChange={(regions) => update({ regions })} />

          <CheckboxGroup label="Tier" options={tiers} selected={filters.tiers} onChange={(tiers) => update({ tiers })} />

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
            formatLabel={(v) => (v === "filmfreeway" ? "FilmFreeway" : v === "direct" ? "Direct" : "Other")}
          />

          <div>
            <span className="np-fgroup__label">
              Max fee: {filters.maxFee === null ? "Any" : `$${filters.maxFee}`}
            </span>
            <input
              type="range"
              min="0"
              max="200"
              step="5"
              value={filters.maxFee ?? 200}
              onChange={(e) => {
                const val = parseInt(e.currentTarget.value);
                update({ maxFee: val >= 200 ? null : val });
              }}
              className="np-range"
            />
          </div>

          <div>
            <span className="np-fgroup__label">Deadline within</span>
            <div className="np-chips">
              {deadlineWindows.map((dw) => (
                <button
                  key={dw.label}
                  type="button"
                  onClick={() => update({ deadlineWindow: dw.value })}
                  aria-pressed={filters.deadlineWindow === dw.value}
                  className="np-chip"
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
