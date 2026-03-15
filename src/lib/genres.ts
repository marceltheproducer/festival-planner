/**
 * Centralized genre taxonomy and smart matching.
 *
 * Genres have parent-child relationships (e.g., Drama is a sub-genre of Narrative).
 * Matching uses OR logic with automatic expansion:
 *   - A "Horror" film matches festivals accepting "Narrative"
 *   - A festival accepting "Narrative" matches films tagged "Drama", "Comedy", etc.
 */

/** Parent → children genre relationships */
const GENRE_PARENTS: Record<string, string[]> = {
  Narrative: ["Drama", "Comedy", "Horror", "Sci-Fi", "Thriller", "Romance"],
};

/** Inverse lookup: child → parent */
const CHILD_TO_PARENT: Record<string, string> = {};
for (const [parent, children] of Object.entries(GENRE_PARENTS)) {
  for (const child of children) {
    CHILD_TO_PARENT[child] = parent;
  }
}

/**
 * Expands a genre list to include smart matches.
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
 * Smart genre matching with OR logic.
 * Returns true if ANY film genre overlaps with ANY festival genre
 * after expanding both sides through the genre taxonomy.
 *
 * Empty filmGenres matches everything (= "any genre").
 */
export function genresMatch(
  festivalGenres: string[],
  filmGenres: string[],
): boolean {
  if (filmGenres.length === 0) return true;

  const expandedFilm = expandGenres(filmGenres);
  const expandedFestival = expandGenres(festivalGenres);

  for (const genre of expandedFilm) {
    if (expandedFestival.has(genre)) return true;
  }

  return false;
}
