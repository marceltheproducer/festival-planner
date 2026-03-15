import { useState, useMemo } from "react";
import { ALL_GENRES } from "../lib/types";

interface GenreTagPickerProps {
  selectedGenres: string[];
  onChange: (genres: string[]) => void;
  label?: string;
  showSearch?: boolean;
}

export default function GenreTagPicker({
  selectedGenres,
  onChange,
  label = "Genres / Tags",
  showSearch = true,
}: GenreTagPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return ALL_GENRES as readonly string[];
    const q = search.toLowerCase();
    return (ALL_GENRES as readonly string[]).filter((g) =>
      g.toLowerCase().includes(q),
    );
  }, [search]);

  const available = filtered.filter((g) => !selectedGenres.includes(g));

  const toggle = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      onChange(selectedGenres.filter((g) => g !== genre));
    } else {
      onChange([...selectedGenres, genre]);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-film-300 mb-2">
        {label}
      </label>

      {showSearch && (
        <input
          type="text"
          placeholder="Search genres..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-film-900 border border-film-600 text-film-100 rounded-lg placeholder:text-film-500 focus:outline-none focus:ring-2 focus:ring-gold-500 mb-3"
        />
      )}

      {selectedGenres.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-film-500 mb-1.5">
            Selected ({selectedGenres.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedGenres.map((genre) => (
              <button
                key={genre}
                type="button"
                onClick={() => toggle(genre)}
                className="text-xs px-2.5 py-1 rounded-full bg-gold-500 text-film-950 border border-gold-500 hover:bg-gold-400 transition-colors flex items-center gap-1"
              >
                {genre}
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {available.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {available.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => toggle(genre)}
              className="text-xs px-2.5 py-1 rounded-full bg-film-800 text-film-300 border border-film-600 hover:border-gold-400 transition-colors"
            >
              {genre}
            </button>
          ))}
        </div>
      ) : search ? (
        <p className="text-xs text-film-500">
          No genres match &ldquo;{search}&rdquo;
        </p>
      ) : (
        <p className="text-xs text-film-500">All genres selected</p>
      )}

      {selectedGenres.length === 0 && !search && (
        <p className="text-xs text-film-500 mt-2">
          Select genres to match festivals accepting ANY of them.
        </p>
      )}
    </div>
  );
}
