export interface Deadline {
  type: "earlybird" | "regular" | "late" | "extended";
  date: string; // ISO date string YYYY-MM-DD
  fee: number;
  shortFee?: number;
}

export interface Festival {
  id: string;
  name: string;
  location: {
    city: string;
    country: string;
    region: "North America" | "Europe" | "Asia" | "South America" | "Africa" | "Oceania" | "Middle East";
  };
  type: "short" | "feature" | "both";
  genres: string[];
  tier: "A-list" | "major" | "mid" | "emerging";
  premiereRequirement: "world" | "international" | "national" | "regional" | "none";
  deadlines: Deadline[];
  fees: {
    earlybird?: number;
    regular: number;
    late?: number;
    currency: string;
  };
  notificationDate?: string; // ISO date
  festivalDates: {
    start: string; // ISO date
    end: string;
  };
  website: string;
  submissionPlatform: "filmfreeway" | "withoutabox" | "direct" | "other";
  notes?: string;
}

export interface Filters {
  search: string;
  filmType: ("short" | "feature" | "both")[];
  genres: string[];
  regions: string[];
  tiers: ("A-list" | "major" | "mid" | "emerging")[];
  premiereRequirements: ("world" | "international" | "national" | "regional" | "none")[];
  maxFee: number | null;
  deadlineWindow: number | null; // days from now
  submissionPlatforms: ("filmfreeway" | "direct" | "other")[];
}

export type SortOption = "deadline" | "prestige" | "fee" | "name";

export interface FilmProfile {
  type: "short" | "feature";
  genres: string[];
  country: string;
  premiereStatus: "unscreened" | "screened_domestically" | "screened_internationally";
  targetFestivalIds: string[];
  budget: number | null;
}

export interface StrategyRecommendation {
  phase: "world_premiere" | "international_premiere" | "national_premiere" | "open";
  label: string;
  festivals: StrategyEntry[];
}

export type EntrySource =
  | { type: "target" }
  | { type: "free_match"; detail: string }
  | { type: "complementary"; detail: string }
  | { type: "discovery"; detail: string };

export interface StrategyEntry {
  festival: Festival;
  deadline: Deadline;
  reason: string;
  warning?: string;
  source: EntrySource;
}

export interface StrategyOptions {
  autoIncludeFree: boolean;
  maxSuggestions: number;
}

export interface StrategyMeta {
  excludedByBudget: number;
  totalEligible: number;
  freeCount: number;
}

export interface StrategyResult {
  recommendations: StrategyRecommendation[];
  meta: StrategyMeta;
}

export const ALL_GENRES = [
  "Narrative",
  "Documentary",
  "Animation",
  "Experimental",
  "Drama",
  "Comedy",
  "Horror",
  "Thriller",
  "Sci-Fi",
  "Fantasy",
  "Romance",
  "LGBTQ+",
] as const;

export const ALL_REGIONS: Festival["location"]["region"][] = [
  "North America",
  "Europe",
  "Asia",
  "South America",
  "Africa",
  "Oceania",
  "Middle East",
];

export const TIER_ORDER: Record<Festival["tier"], number> = {
  "A-list": 0,
  major: 1,
  mid: 2,
  emerging: 3,
};

export const PREMIERE_ORDER: Record<Festival["premiereRequirement"], number> = {
  world: 0,
  international: 1,
  national: 2,
  regional: 3,
  none: 4,
};
