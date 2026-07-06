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
  /**
   * The MOST LENIENT premiere a festival will actually accept, when it accepts
   * more than its headline `premiereRequirement` (e.g. Sundance requires "world"
   * but also takes North American premieres; Berlin's Panorama accepts
   * international premieres even though Competition is world-only). Used for
   * ELIGIBILITY only — `premiereRequirement` remains the headline tier for
   * display, phase grouping, and prestige scoring. Omit when the festival
   * accepts exactly its headline tier.
   */
  premiereAccepts?: "world" | "international" | "national" | "regional" | "none";
  deadlines: Deadline[];
  /**
   * Shorts-specific submission schedule, used when shorts close on different
   * dates than features (common at "both" festivals). When present, short-film
   * flows use these deadlines instead of `deadlines`. Fees here are the short
   * fees directly (no separate shortFee needed). Omit when shorts and features
   * share the same schedule (a per-deadline `shortFee` still captures fee-only
   * differences in that case).
   */
  shortDeadlines?: Deadline[];
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
  /**
   * The date the film will be ready to submit — the reference point ("now")
   * for the whole strategy. Defaults to today, so submitting immediately works
   * unchanged. Filmmakers planning ahead can set a future date; deadlines
   * before it are unreachable (the film isn't finished yet), and festivals
   * whose current cycle has passed are projected to their next annual cycle.
   * ISO date string (YYYY-MM-DD).
   */
  readyDate: string;
  /**
   * When true, the filmmaker isn't strategically protecting their premiere
   * status — common for short films, which routinely screen widely. The
   * strategy still respects each festival's hard premiere requirements (a
   * world-premiere festival genuinely can't accept an already-screened film),
   * but it drops the "wait to protect your premiere" nudges and ranks by fit,
   * cost, and deadline instead of premiere hierarchy.
   */
  premiereFlexible: boolean;
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
  /**
   * True when this festival's current cycle had already closed by the film's
   * ready date, so `deadline.date` is an ESTIMATED next-cycle date projected
   * forward by whole years from the festival's real deadline. Shown clearly
   * as an estimate in the UI.
   */
  projected?: boolean;
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
