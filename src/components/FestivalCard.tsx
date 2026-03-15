import type { Festival } from "../lib/types";
import { getNextDeadline } from "../lib/festivals";

const tierColors: Record<Festival["tier"], string> = {
  "A-list": "bg-gold-500/20 text-gold-300 border border-gold-500/30",
  major: "bg-blue-500/15 text-blue-300 border border-blue-500/25",
  mid: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25",
  emerging: "bg-purple-500/15 text-purple-300 border border-purple-500/25",
};

const premiereColors: Record<Festival["premiereRequirement"], string> = {
  world: "bg-red-500/15 text-red-300",
  international: "bg-orange-500/15 text-orange-300",
  national: "bg-yellow-500/15 text-yellow-300",
  regional: "bg-teal-500/15 text-teal-300",
  none: "bg-film-600/40 text-film-300",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function FestivalCard({ festival }: { festival: Festival }) {
  const nextDeadline = getNextDeadline(festival);

  return (
    <div className="bg-film-800/60 rounded-xl border border-film-700/50 p-4 sm:p-5 hover:border-gold-500/30 transition-colors">
      <div className="flex items-start justify-between gap-2 sm:gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-base sm:text-lg text-film-50 leading-tight truncate">
            {festival.name}
          </h3>
          <p className="text-sm text-film-400 mt-0.5">
            {festival.location.city}, {festival.location.country}
          </p>
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${tierColors[festival.tier]}`}
        >
          {festival.tier}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${premiereColors[festival.premiereRequirement]}`}
        >
          {festival.premiereRequirement === "none"
            ? "No premiere req."
            : `${festival.premiereRequirement} premiere`}
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-film-600/40 text-film-300">
          {festival.type === "both" ? "Shorts & Features" : festival.type}
        </span>
      </div>

      <div className="flex flex-wrap gap-1 mb-4">
        {festival.genres.map((g) => (
          <span
            key={g}
            className="text-xs px-2 py-0.5 rounded bg-film-700/60 text-film-300"
          >
            {g}
          </span>
        ))}
      </div>

      <div className="border-t border-film-700/40 pt-3 flex items-start sm:items-center justify-between text-sm gap-2">
        {nextDeadline ? (
          <div className="min-w-0">
            <span className="text-film-400">Next:</span>{" "}
            <span className="font-medium text-film-100">
              {formatDate(nextDeadline.date)}
            </span>
            <span className="text-film-500 ml-1">
              ({nextDeadline.type})
            </span>
          </div>
        ) : (
          <span className="text-film-500">No upcoming deadlines</span>
        )}
        <div className="font-medium text-gold-400 shrink-0">
          {nextDeadline && nextDeadline.fee > 0
            ? `$${nextDeadline.fee}`
            : "Free"}
        </div>
      </div>

      {festival.festivalDates && (
        <div className="text-xs text-film-500 mt-2">
          Festival: {formatDate(festival.festivalDates.start)} &ndash;{" "}
          {formatDate(festival.festivalDates.end)}
        </div>
      )}

      {festival.website && (
        <a
          href={festival.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gold-400 hover:text-gold-300 mt-2 inline-block"
        >
          Visit website &rarr;
        </a>
      )}
    </div>
  );
}
