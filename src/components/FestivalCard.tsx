import type { Festival } from "../lib/types";
import { getNextOrProjectedDeadline } from "../lib/festivals";

const currencySymbols: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
  AUD: "A$",
};

function cur(code: string): string {
  return currencySymbols[code] ?? `${code} `;
}

function fmtMD(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function FestivalCard({
  festival,
  shortFocused = false,
}: {
  festival: Festival;
  shortFocused?: boolean;
}) {
  const resolved = getNextOrProjectedDeadline(festival, shortFocused ? "short" : undefined);
  const nd = resolved?.deadline ?? null;
  const projected = resolved?.projected ?? false;
  const c = cur(festival.fees.currency);
  const oscar = /oscar|academy award/i.test(festival.notes ?? "");

  const typeLabel =
    festival.type === "both" ? "Shorts + Features" : festival.type === "short" ? "Shorts" : "Features";
  const premLabel =
    festival.premiereRequirement === "none" ? "No premiere req." : `${festival.premiereRequirement} premiere`;

  let feeNode;
  if (!nd || nd.fee === 0) {
    feeNode = <span className="np-fee free">Free</span>;
  } else if (shortFocused && nd.shortFee !== undefined) {
    feeNode = <span className="np-fee">{c}{nd.shortFee}</span>;
  } else if (nd.shortFee !== undefined) {
    feeNode = <span className="np-fee">{c}{nd.shortFee}&ndash;{c}{nd.fee}</span>;
  } else {
    feeNode = <span className="np-fee">{c}{nd.fee}</span>;
  }

  return (
    <article className={`np-ticket${oscar ? " has-stamp" : ""}`}>
      {oscar && (
        <span className="np-stamp mus np-ticket__stamp">Oscar<br />Qual.</span>
      )}

      <div className="np-ticket__head">
        <span className={`np-tier${festival.tier === "A-list" ? " alist" : ""}`}>{festival.tier}</span>
        <span className="np-ticket__type">{typeLabel}</span>
      </div>

      <h3 className="np-ticket__name">
        <a href={`/festivals/${festival.id}`}>{festival.name}</a>
      </h3>
      <p className="np-ticket__loc">
        {festival.location.city}, {festival.location.country}
      </p>
      <p className="np-ticket__prem">{premLabel}</p>

      {festival.genres.length > 0 && (
        <div className="np-ticket__genres">
          {festival.genres.slice(0, 4).map((g) => (
            <span key={g} className="np-gtag">{g}</span>
          ))}
        </div>
      )}

      <div className="np-ticket__foot">
        <div>
          <div className="np-dlk">{nd ? `${projected ? "Est. next" : "Next"} deadline · ${nd.type}` : "Submissions"}</div>
          {nd ? (
            <div className="np-dl">{fmtMD(nd.date)}</div>
          ) : (
            <div className="np-dl passed">Closed</div>
          )}
        </div>
        {feeNode}
      </div>

      {festival.festivalDates && (
        <p className="np-ticket__meta">
          Festival: {fmtMD(festival.festivalDates.start)} &ndash; {fmtMD(festival.festivalDates.end)}
        </p>
      )}

      {festival.website && (
        <a className="np-ticket__site" href={festival.website} target="_blank" rel="noopener noreferrer">
          Visit site &rarr;
        </a>
      )}
    </article>
  );
}
