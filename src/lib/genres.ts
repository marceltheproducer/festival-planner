/**
 * Centralized genre taxonomy and smart matching.
 *
 * Genres have parent-child relationships (e.g., Drama is a sub-genre of Narrative).
 * Matching uses asymmetric expansion:
 *   - Film genres expand BOTH ways: Horror film → also matches "Narrative" festivals
 *   - Festival genres expand DOWNWARD only: "Narrative" festival → accepts Drama, Comedy, etc.
 *     but a "Horror" festival does NOT auto-expand to match all Narrative sub-genres
 *
 * This prevents genre-specific festivals (Fantasia, Sitges) from matching
 * unrelated sub-genres like Drama or Romance through the shared parent.
 */

/** Parent → children genre relationships */
const GENRE_PARENTS: Record<string, string[]> = {
  Narrative: ["Drama", "Comedy", "Horror", "Sci-Fi", "Fantasy", "Thriller", "Romance"],
  Documentary: [],
  Animation: [],
  Experimental: [],
  "LGBTQ+": [],
};

/** Inverse lookup: child → parent */
const CHILD_TO_PARENT: Record<string, string> = {};
for (const [parent, children] of Object.entries(GENRE_PARENTS)) {
  for (const child of children) {
    CHILD_TO_PARENT[child] = parent;
  }
}

/**
 * Expands a genre list bidirectionally (for film matching).
 * - Sub-genres get their parent added (Horror → +Narrative)
 * - Parents get their children added (Narrative → +Drama, +Comedy, etc.)
 */
export function expandGenres(genres: string[]): Set<string> {
  const expanded = new Set(genres);

  for (const genre of genres) {
    const parent = CHILD_TO_PARENT[genre];
    if (parent) expanded.add(parent);

    const children = GENRE_PARENTS[genre];
    if (children) {
      for (const child of children) expanded.add(child);
    }
  }

  return expanded;
}

/**
 * Expands a genre list downward only (for festival matching).
 * Parents get their children added, but children do NOT get their parent added.
 * This prevents genre-specific festivals from matching unrelated sub-genres.
 */
function expandGenresDown(genres: string[]): Set<string> {
  const expanded = new Set(genres);

  for (const genre of genres) {
    const children = GENRE_PARENTS[genre];
    if (children) {
      for (const child of children) expanded.add(child);
    }
  }

  return expanded;
}

/**
 * Smart genre matching with asymmetric expansion.
 *
 * Film genres expand both ways (child→parent AND parent→children).
 * Festival genres expand downward only (parent→children).
 *
 * This means:
 *   - A "Drama" film matches a "Narrative" festival (film expands up to Narrative)
 *   - A "Horror" film matches a "Narrative" festival (film expands up to Narrative)
 *   - A "Drama" film does NOT match a "Horror"-only festival
 *     (festival doesn't expand Horror→Narrative, so no parent-level overlap)
 *
 * Empty filmGenres matches everything (= "any genre").
 */
export function genresMatch(
  festivalGenres: string[],
  filmGenres: string[],
): boolean {
  if (filmGenres.length === 0) return true;

  const expandedFilm = expandGenres(filmGenres);
  const expandedFestival = expandGenresDown(festivalGenres);

  for (const genre of expandedFilm) {
    if (expandedFestival.has(genre)) return true;
  }

  return false;
}
