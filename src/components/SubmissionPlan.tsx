import { useState, useEffect, useRef } from "react";
import type { StrategyRecommendation, StrategyEntry } from "../lib/types";

interface SelectedEntry {
  phase: StrategyRecommendation["phase"];
  label: string;
  entry: StrategyEntry;
}

interface SubmissionPlanProps {
  selectedEntries: SelectedEntry[];
  onBack: () => void;
}

const PHASE_ORDER: StrategyRecommendation["phase"][] = [
  "world_premiere",
  "international_premiere",
  "national_premiere",
  "open",
];

const PHASE_LABELS: Record<StrategyRecommendation["phase"], string> = {
  world_premiere: "World Premiere",
  international_premiere: "International Premiere",
  national_premiere: "National Premiere",
  open: "No Premiere Requirement",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface TimelineStep {
  type: "submit" | "wait" | "decision" | "acceptance" | "parallel_note";
  phase: StrategyRecommendation["phase"];
  festival?: StrategyEntry;
  text: string;
  subtext?: string;
}

function buildTimeline(entries: SelectedEntry[]): TimelineStep[] {
  const steps: TimelineStep[] = [];

  // Group entries by phase, maintaining premiere hierarchy order
  const grouped = new Map<StrategyRecommendation["phase"], SelectedEntry[]>();
  for (const phase of PHASE_ORDER) {
    const phaseEntries = entries.filter((e) => e.phase === phase);
    if (phaseEntries.length > 0) {
      // Sort by deadline within phase
      phaseEntries.sort((a, b) => a.entry.deadline.date.localeCompare(b.entry.deadline.date));
      grouped.set(phase, phaseEntries);
    }
  }

  const phases = Array.from(grouped.keys());

  for (let i = 0; i < phases.length; i++) {
    const phase = phases[i];
    const phaseEntries = grouped.get(phase)!;
    const isOpenPhase = phase === "open";
    const isPremierePhase = !isOpenPhase;

    // For the open phase, add a note that these can be submitted anytime
    if (isOpenPhase) {
      steps.push({
        type: "parallel_note",
        phase,
        text: "Submit anytime. No premiere requirement",
        subtext: "These festivals don't require a premiere status, so you can submit regardless of other results.",
      });
    }

    // Add submit steps for each festival in this phase
    for (const { entry } of phaseEntries) {
      const feeStr = entry.deadline.fee === 0 ? "Free" : `$${entry.deadline.fee}`;
      const dateStr = entry.projected
        ? `est. ${formatDate(entry.deadline.date)} (next cycle)`
        : formatDate(entry.deadline.date);
      steps.push({
        type: "submit",
        phase,
        festival: entry,
        text: `Submit to ${entry.festival.name}`,
        subtext: `${entry.deadline.type} deadline: ${dateStr} · ${feeStr}`,
      });
    }

    // After a premiere phase, add wait + decision steps if there's a next premiere phase
    if (isPremierePhase) {
      // Find the latest notification date in this phase
      const notificationDates = phaseEntries
        .map((e) => e.entry.festival.notificationDate)
        .filter(Boolean) as string[];

      const nextPremierePhase = phases.find(
        (p, idx) => idx > i && p !== "open"
      );

      if (notificationDates.length > 0) {
        const latestNotification = notificationDates.sort().reverse()[0];
        const waitFestivals = phaseEntries
          .filter((e) => e.entry.festival.notificationDate)
          .map((e) => e.entry.festival.name);

        steps.push({
          type: "wait",
          phase,
          text: `Wait for ${waitFestivals.length === 1 ? waitFestivals[0] : "notifications"}`,
          subtext: `Expected by ~${formatDate(latestNotification)}`,
        });
      }

      if (nextPremierePhase) {
        // Acceptance guidance
        const acceptanceHint = phase === "world_premiere"
          ? "Your world premiere is set! You can now submit to international premiere festivals knowing your status."
          : phase === "international_premiere"
            ? "Your international premiere is secured. National premiere and open festivals are your next targets."
            : "You've locked in this premiere tier. Continue submitting to open festivals.";

        steps.push({
          type: "acceptance",
          phase,
          text: `If accepted → ${PHASE_LABELS[phase].toLowerCase()} is set`,
          subtext: acceptanceHint,
        });

        steps.push({
          type: "decision",
          phase,
          text: `If not accepted → proceed to ${PHASE_LABELS[nextPremierePhase].toLowerCase()} targets`,
          subtext: "Your premiere status is preserved. You haven't screened, so you can still target the next tier.",
        });
      }
    }
  }

  return steps;
}

function generatePlanText(entries: SelectedEntry[], steps: TimelineStep[]): string {
  const totalFees = entries.reduce((sum, e) => sum + e.entry.deadline.fee, 0);
  const lines: string[] = [];

  lines.push("FILM FESTIVAL SUBMISSION PLAN");
  lines.push("Generated by FestivalPlanner");
  lines.push("=".repeat(40));
  lines.push("");
  lines.push(`Festivals: ${entries.length}`);
  lines.push(`Est. Total Fees: ${totalFees === 0 ? "Free" : `$${totalFees}`}`);
  lines.push("");
  lines.push("-".repeat(40));
  lines.push("");

  let currentPhase = "";

  for (const step of steps) {
    const phaseName = PHASE_LABELS[step.phase];
    if (phaseName !== currentPhase) {
      currentPhase = phaseName;
      lines.push(`[ ${currentPhase.toUpperCase()} ]`);
      lines.push("");
    }

    if (step.type === "submit" && step.festival) {
      const f = step.festival;
      const feeStr = f.deadline.fee === 0 ? "Free" : `$${f.deadline.fee}`;
      const sourceLabel = f.source.type === "target" ? " [TARGET]"
        : f.source.type === "free_match" ? " [FREE]"
        : f.source.type === "complementary" ? " [SUGGESTED]"
        : "";
      lines.push(`  -> ${f.festival.name}${sourceLabel}`);
      lines.push(`     ${f.festival.location.city}, ${f.festival.location.country} | ${f.festival.tier}`);
      lines.push(`     Deadline: ${formatDate(f.deadline.date)}${f.projected ? " (est. next cycle)" : ""} (${f.deadline.type}) | ${feeStr}`);
      if (f.festival.notificationDate) {
        lines.push(`     Notification: ~${formatDate(f.festival.notificationDate)}`);
      }
      if (f.festival.festivalDates) {
        lines.push(`     Festival: ${formatDate(f.festival.festivalDates.start)} - ${formatDate(f.festival.festivalDates.end)}`);
      }
      lines.push(`     ${f.festival.website}`);
      lines.push("");
    } else if (step.type === "wait") {
      lines.push(`  ⏳ ${step.text}`);
      if (step.subtext) lines.push(`     ${step.subtext}`);
      lines.push("");
    } else if (step.type === "acceptance") {
      lines.push(`  ✅ ${step.text}`);
      if (step.subtext) lines.push(`     ${step.subtext}`);
      lines.push("");
    } else if (step.type === "decision") {
      lines.push(`  ⚡ ${step.text}`);
      if (step.subtext) lines.push(`     ${step.subtext}`);
      lines.push("");
    } else if (step.type === "parallel_note") {
      lines.push(`  ℹ ${step.text}`);
      lines.push("");
    }
  }

  lines.push("-".repeat(40));
  lines.push("Always verify deadlines on official festival websites.");
  lines.push("festivalplanner.app");

  return lines.join("\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function generateICS(entries: SelectedEntry[]): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FestivalPlanner//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const { entry, phase } of entries) {
    const dateStr = entry.deadline.date.replace(/-/g, "");
    const feeStr = entry.deadline.fee === 0 ? "Free" : `$${entry.deadline.fee}`;
    const summary = `${entry.festival.name} - ${entry.deadline.type} deadline${entry.projected ? " (estimated)" : ""}`;
    const estNote = entry.projected ? "\\nNOTE: Estimated next-cycle date. Verify on the festival website." : "";
    const description = `Fee: ${feeStr}\\nTier: ${entry.festival.tier}\\nPhase: ${PHASE_LABELS[phase]}\\nWebsite: ${entry.festival.website}${estNote}`;
    const location = `${entry.festival.location.city}, ${entry.festival.location.country}`;
    const uid = `${entry.festival.id}-${entry.deadline.type}@festivalplanner.app`;

    lines.push("BEGIN:VEVENT");
    lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
    lines.push(`SUMMARY:${summary}`);
    lines.push(`DESCRIPTION:${description}`);
    lines.push(`LOCATION:${location}`);
    lines.push(`URL:${entry.festival.website}`);
    lines.push(`UID:${uid}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function generateCSV(entries: SelectedEntry[]): string {
  const headers = ["Festival", "City", "Country", "Tier", "Deadline Type", "Date", "Fee", "Currency", "Premiere Req", "Website", "Platform", "Phase"];
  const rows = entries.map(({ entry, phase }) => [
    `"${entry.festival.name}"`,
    `"${entry.festival.location.city}"`,
    `"${entry.festival.location.country}"`,
    entry.festival.tier,
    entry.deadline.type,
    entry.deadline.date,
    entry.deadline.fee,
    entry.festival.fees.currency,
    entry.festival.premiereRequirement,
    entry.festival.website,
    entry.festival.submissionPlatform,
    PHASE_LABELS[phase],
  ]);
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export default function SubmissionPlan({ selectedEntries, onBack }: SubmissionPlanProps) {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(null);
  const timeline = buildTimeline(selectedEntries);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const totalFees = selectedEntries.reduce((sum, e) => sum + e.entry.deadline.fee, 0);
  const deadlines = selectedEntries.map((e) => e.entry.deadline.date).sort();
  const earliestDeadline = deadlines[0];
  const latestDeadline = deadlines[deadlines.length - 1];

  // Count by phase
  const premiereCount = selectedEntries.filter((e) => e.phase !== "open").length;
  const openCount = selectedEntries.filter((e) => e.phase === "open").length;

  return (
    <div>
      {/* Header */}
      <div className="np-planhead">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <h2 style={{ fontFamily: "var(--np-display)", textTransform: "uppercase", fontSize: 24, letterSpacing: "0.02em" }}>Your Submission Plan</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                const text = generatePlanText(selectedEntries, timeline);
                navigator.clipboard.writeText(text).then(() => {
                  setCopied(true);
                  if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
                  copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
                });
              }}
              className={`np-planbtn${copied ? " on" : ""}`}
            >
              {copied ? "Copied ✓" : "Copy plan"}
            </button>
            <button type="button" onClick={() => downloadFile(generateICS(selectedEntries), "festival-deadlines.ics", "text/calendar")} className="np-planbtn" title="Download calendar file">Calendar</button>
            <button type="button" onClick={() => downloadFile(generateCSV(selectedEntries), "festival-plan.csv", "text/csv")} className="np-planbtn" title="Download CSV spreadsheet">CSV</button>
            <button type="button" onClick={onBack} className="np-planbtn">← Back</button>
          </div>
        </div>

        <div className="np-bynum">
          <div className="n"><div className="big">{selectedEntries.length}</div><div className="lab">Festivals</div></div>
          <div className="n"><div className="big paper">{totalFees === 0 ? "Free" : `$${totalFees}`}</div><div className="lab">Est. total fees</div></div>
          {earliestDeadline && <div className="n"><div className="big">{formatDate(earliestDeadline).split(",")[0]}</div><div className="lab">First deadline</div></div>}
        </div>

        {premiereCount > 0 && openCount > 0 && (
          <p style={{ fontFamily: "var(--np-mono)", fontSize: 11, color: "var(--np-ink-2)", marginTop: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {premiereCount} premiere-tier (submit in order) · {openCount} open (submit anytime)
          </p>
        )}
      </div>

      {/* Timeline */}
      <div className="np-timeline">
        <h3 style={{ fontFamily: "var(--np-display)", textTransform: "uppercase", fontSize: 18, letterSpacing: "0.02em", margin: "0 0 16px" }}>Step-by-step timeline</h3>

        {timeline.map((step, idx) => {
          const isLast = idx === timeline.length - 1;
          const icon =
            step.type === "submit" ? "M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            : step.type === "wait" ? "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            : step.type === "acceptance" ? "M5 13l4 4L19 7"
            : step.type === "decision" ? "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            : "M13 10V3L4 14h7v7l9-11h-7z";
          return (
            <div key={idx} className="np-step">
              {!isLast && <div className="np-step__line" />}
              <div className={`np-step__dot${step.type === "submit" ? " submit" : ""}`}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                </svg>
              </div>
              <div className="np-step__body">
                <p className="np-step__text">{step.text}</p>
                {step.subtext && <p className="np-step__sub">{step.subtext}</p>}

                {step.type === "submit" && step.festival && (
                  <div className="np-step__card">
                    <div style={{ minWidth: 0 }}>
                      <a href={step.festival.festival.website} target="_blank" rel="noopener noreferrer">{step.festival.festival.name}</a>
                      <div className="np-step__cmeta">
                        {step.festival.festival.location.city}, {step.festival.festival.location.country} · {step.festival.festival.tier}
                        {step.festival.festival.notificationDate && ` · notif ~${formatDate(step.festival.festival.notificationDate)}`}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <span style={{ fontFamily: "var(--np-mono)", fontWeight: 700, fontSize: 13 }}>{step.festival.deadline.fee === 0 ? "Free" : `$${step.festival.deadline.fee}`}</span>
                      {step.festival.projected && <div style={{ fontFamily: "var(--np-mono)", fontSize: 10, fontWeight: 600, color: "var(--np-blue)", textTransform: "uppercase" }}>est. next cycle</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom back button */}
      <div style={{ marginTop: 24, display: "flex", justifyContent: "center" }}>
        <button type="button" onClick={onBack} className="np-btn np-btn-ghost">Back to festival selection</button>
      </div>
    </div>
  );
}
