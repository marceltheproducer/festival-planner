import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { Festival, Deadline } from "../lib/types";

interface CalendarEvent {
  festival: Festival;
  deadline: Deadline;
  forShorts?: boolean;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DeadlineCalendar({ festivals }: { festivals: Festival[] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [scrollTarget, setScrollTarget] = useState<"details" | "cell" | null>(null);

  const detailsRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const add = (festival: Festival, deadline: Deadline, forShorts?: boolean) => {
      const existing = map.get(deadline.date) ?? [];
      existing.push({ festival, deadline, forShorts });
      map.set(deadline.date, existing);
    };
    for (const festival of festivals) {
      for (const deadline of festival.deadlines) add(festival, deadline);
      for (const deadline of festival.shortDeadlines ?? []) add(festival, deadline, true);
    }
    return map;
  }, [festivals]);

  const upcomingDeadlines = useMemo(() => {
    const nowStr = today.toISOString().split("T")[0];
    const all: CalendarEvent[] = [];
    for (const [, events] of eventsByDate) {
      for (const ev of events) {
        if (ev.deadline.date >= nowStr) all.push(ev);
      }
    }
    all.sort((a, b) => a.deadline.date.localeCompare(b.deadline.date));
    return all.slice(0, 15);
  }, [eventsByDate, today]);

  useEffect(() => {
    if (!scrollTarget || !selectedDate) return;
    requestAnimationFrame(() => {
      if (scrollTarget === "details" && detailsRef.current) {
        detailsRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else if (scrollTarget === "cell" && calendarRef.current) {
        const cell = calendarRef.current.querySelector(`[data-date="${selectedDate}"]`);
        if (cell) {
          cell.scrollIntoView({ behavior: "smooth", block: "center" });
          const onScrollEnd = () => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          if ("onscrollend" in window) window.addEventListener("scrollend", onScrollEnd, { once: true });
          else setTimeout(onScrollEnd, 400);
        }
      }
      setScrollTarget(null);
    });
  }, [scrollTarget, selectedDate, month, year]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); } else setMonth(month - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); } else setMonth(month + 1);
    setSelectedDate(null);
  };
  const goToToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDate(null); };

  const handleDayClick = useCallback((dateStr: string, hasEvents: boolean) => {
    if (hasEvents) { setSelectedDate(dateStr); setScrollTarget("details"); }
    else setSelectedDate(null);
  }, []);

  const navigateToDate = useCallback((dateStr: string) => {
    const [y, m] = dateStr.split("-").map(Number);
    setYear(y); setMonth(m - 1); setSelectedDate(dateStr); setScrollTarget("cell");
  }, []);

  const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) ?? [] : [];

  return (
    <div className="np-cal-wrap">
      <div className="flex-1 min-w-0" ref={calendarRef}>
        <div className="np-cal">
          <div className="np-cal__bar">
            <button className="np-cal__navbtn" onClick={prevMonth} aria-label="Previous month">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="np-cal__title">{MONTH_NAMES[month]} {year}</span>
              <button className="np-cal__todaybtn" onClick={goToToday}>Today</button>
            </div>
            <button className="np-cal__navbtn" onClick={nextMonth} aria-label="Next month">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          <div className="np-cal__weekdays">
            {WEEKDAYS.map((d) => <div key={d} className="np-cal__wd">{d}</div>)}
          </div>

          <div className="np-cal__grid">
            {Array.from({ length: firstDay }, (_, i) => <div key={`e-${i}`} className="np-cal__day" style={{ background: "transparent", cursor: "default" }} />)}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const events = eventsByDate.get(dateStr) ?? [];
              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected = dateStr === selectedDate;
              return (
                <button
                  key={day}
                  type="button"
                  data-date={dateStr}
                  onClick={() => handleDayClick(dateStr, events.length > 0)}
                  className={`np-cal__day${events.length > 0 ? " has" : ""}${isSelected ? " sel" : ""}`}
                >
                  <span className={`np-cal__dn${isToday ? " today" : ""}`}>{day}</span>
                  <div className="np-evrow">
                    {events.slice(0, 4).map((ev, idx) => (
                      <span key={idx} className={`np-evdot t-${ev.deadline.type}`} title={`${ev.festival.name} (${ev.deadline.type}${ev.forShorts ? ", shorts" : ""})`} />
                    ))}
                    {events.length > 4 && <span className="np-cal__more">+{events.length - 4}</span>}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="np-cal__legend">
            {(["earlybird", "regular", "late", "extended"] as const).map((t) => (
              <div key={t} className="np-leg"><span className={`np-evdot t-${t}`} />{t}</div>
            ))}
          </div>
        </div>

        {selectedDate && selectedEvents.length > 0 && (
          <div ref={detailsRef} className="np-cal__details" style={{ border: "2.5px solid var(--np-ink)", background: "var(--np-paper-2)", marginTop: 16, boxShadow: "6px 6px 0 var(--np-ink)" }}>
            <h3>Deadlines · {formatDate(selectedDate)}</h3>
            {selectedEvents.map((ev, idx) => (
              <div key={idx} className={`np-evitem bl-${ev.deadline.type}`}>
                <div>
                  <div className="np-evitem__name">{ev.festival.name}{ev.forShorts && <span className="np-shortstag">Shorts</span>}</div>
                  <div className="np-evitem__meta">{ev.deadline.type} deadline · {ev.festival.location.city}, {ev.festival.location.country}</div>
                </div>
                <span className="np-evitem__fee">{ev.deadline.fee === 0 ? "Free" : `$${ev.deadline.fee}`}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <aside className="np-cal__side">
        <div className="np-cal__sidebox">
          <div className="np-cal__sidehead">Upcoming Deadlines</div>
          {upcomingDeadlines.length === 0 ? (
            <p style={{ fontFamily: "var(--np-serif)", fontStyle: "italic", color: "var(--np-ink-2)", padding: "14px" }}>No upcoming deadlines</p>
          ) : (
            upcomingDeadlines.map((ev, idx) => (
              <button key={idx} type="button" onClick={() => navigateToDate(ev.deadline.date)} className={`np-up${selectedDate === ev.deadline.date ? " sel" : ""}`}>
                <span className={`np-up__dot t-${ev.deadline.type}`} />
                <div style={{ minWidth: 0 }}>
                  <div className="np-up__name" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ev.festival.name}{ev.forShorts && <span className="np-shortstag">Shorts</span>}
                  </div>
                  <div className="np-up__meta">{formatDate(ev.deadline.date)} · {ev.deadline.fee === 0 ? "Free" : `$${ev.deadline.fee}`}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
