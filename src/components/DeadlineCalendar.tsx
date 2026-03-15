import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import type { Festival, Deadline } from "../lib/types";

interface CalendarEvent {
  festival: Festival;
  deadline: Deadline;
}

const deadlineColors: Record<Deadline["type"], string> = {
  earlybird: "bg-emerald-400",
  regular: "bg-blue-400",
  late: "bg-orange-400",
  extended: "bg-red-400",
};

const deadlineBgColors: Record<Deadline["type"], string> = {
  earlybird: "bg-emerald-500/10 border-emerald-500/30",
  regular: "bg-blue-500/10 border-blue-500/30",
  late: "bg-orange-500/10 border-orange-500/30",
  extended: "bg-red-500/10 border-red-500/30",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
    for (const festival of festivals) {
      for (const deadline of festival.deadlines) {
        const existing = map.get(deadline.date) ?? [];
        existing.push({ festival, deadline });
        map.set(deadline.date, existing);
      }
    }
    return map;
  }, [festivals]);

  const upcomingDeadlines = useMemo(() => {
    const nowStr = today.toISOString().split("T")[0];
    const all: CalendarEvent[] = [];
    for (const [, events] of eventsByDate) {
      for (const ev of events) {
        if (ev.deadline.date >= nowStr) {
          all.push(ev);
        }
      }
    }
    all.sort((a, b) => a.deadline.date.localeCompare(b.deadline.date));
    return all.slice(0, 15);
  }, [eventsByDate, today]);

  // Scroll to targets after render
  useEffect(() => {
    if (!scrollTarget || !selectedDate) return;

    requestAnimationFrame(() => {
      if (scrollTarget === "details" && detailsRef.current) {
        detailsRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else if (scrollTarget === "cell" && calendarRef.current) {
        const cell = calendarRef.current.querySelector(`[data-date="${selectedDate}"]`);
        if (cell) {
          cell.scrollIntoView({ behavior: "smooth", block: "center" });
          // After scrolling to the cell, also scroll to details once they render
          setTimeout(() => {
            detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }, 400);
        }
      }
      setScrollTarget(null);
    });
  }, [scrollTarget, selectedDate, month, year]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else { setMonth(month - 1); }
    setSelectedDate(null);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else { setMonth(month + 1); }
    setSelectedDate(null);
  };

  const goToToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(null);
  };

  const handleDayClick = useCallback((dateStr: string, hasEvents: boolean) => {
    if (hasEvents) {
      setSelectedDate(dateStr);
      setScrollTarget("details");
    } else {
      setSelectedDate(null);
    }
  }, []);

  const navigateToDate = useCallback((dateStr: string) => {
    const [y, m] = dateStr.split("-").map(Number);
    setYear(y);
    setMonth(m - 1);
    setSelectedDate(dateStr);
    setScrollTarget("cell");
  }, []);

  const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) ?? [] : [];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0" ref={calendarRef}>
        <div className="bg-film-800/60 rounded-xl border border-film-700/50 p-3 sm:p-5">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-film-700/50 rounded-lg transition-colors text-film-300"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-base sm:text-lg font-semibold text-film-50">
                {MONTH_NAMES[month]} {year}
              </h2>
              <button
                onClick={goToToday}
                className="text-xs px-2 py-1 rounded border border-film-600 text-film-300 hover:bg-film-700/50"
              >
                Today
              </button>
            </div>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-film-700/50 rounded-lg transition-colors text-film-300"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
              <div key={i} className="text-center text-xs font-medium text-film-400 py-2 sm:hidden">
                {day}
              </div>
            ))}
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-film-400 py-2 hidden sm:block">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }, (_, i) => (
              <div key={`empty-${i}`} className="h-12 sm:h-20" />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const events = eventsByDate.get(dateStr) ?? [];
              const isToday =
                day === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear();
              const isSelected = dateStr === selectedDate;

              return (
                <button
                  key={day}
                  type="button"
                  data-date={dateStr}
                  onClick={() => handleDayClick(dateStr, events.length > 0)}
                  className={`h-12 sm:h-20 border border-film-700/30 p-0.5 sm:p-1 text-left transition-all relative ${
                    isSelected
                      ? "bg-gold-500/10 ring-2 ring-gold-500 z-10"
                      : events.length > 0
                        ? "hover:bg-film-700/30 cursor-pointer"
                        : "hover:bg-film-700/20"
                  }`}
                >
                  <span
                    className={`text-xs sm:text-sm ${
                      isToday
                        ? "bg-gold-500 text-film-950 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center font-medium"
                        : "text-film-200"
                    }`}
                  >
                    {day}
                  </span>
                  <div className="flex flex-wrap gap-0.5 mt-0.5 sm:mt-1">
                    {events.slice(0, 3).map((ev, idx) => (
                      <span
                        key={idx}
                        className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${deadlineColors[ev.deadline.type]}`}
                        title={`${ev.festival.name} (${ev.deadline.type})`}
                      />
                    ))}
                    {events.length > 3 && (
                      <span className="text-[8px] sm:text-[10px] text-film-500">
                        +{events.length - 3}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 sm:gap-4 mt-4 pt-4 border-t border-film-700/30">
            {(["earlybird", "regular", "late", "extended"] as const).map((type) => (
              <div key={type} className="flex items-center gap-1.5 text-xs text-film-400">
                <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${deadlineColors[type]}`} />
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </div>
            ))}
          </div>
        </div>

        {selectedDate && selectedEvents.length > 0 && (
          <div ref={detailsRef} className="bg-film-800/60 rounded-xl border border-film-700/50 p-4 sm:p-5 mt-4">
            <h3 className="font-semibold text-film-50 mb-3">
              Deadlines on {formatDate(selectedDate)}
            </h3>
            <div className="space-y-3">
              {selectedEvents.map((ev, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border ${deadlineBgColors[ev.deadline.type]}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-film-50 text-sm sm:text-base">
                      {ev.festival.name}
                    </span>
                    <span className="text-sm text-gold-400 shrink-0">
                      {ev.deadline.fee === 0 ? "Free" : `$${ev.deadline.fee}`}
                    </span>
                  </div>
                  <div className="text-xs text-film-400 mt-1">
                    {ev.deadline.type} deadline &middot;{" "}
                    {ev.festival.location.city}, {ev.festival.location.country}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <aside className="w-full lg:w-80 shrink-0">
        <div className="bg-film-800/60 rounded-xl border border-film-700/50 p-4 sm:p-5">
          <h3 className="font-semibold text-film-50 mb-4">Upcoming Deadlines</h3>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-sm text-film-500">No upcoming deadlines</p>
          ) : (
            <div className="space-y-1">
              {upcomingDeadlines.map((ev, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => navigateToDate(ev.deadline.date)}
                  className={`flex items-start gap-2 w-full text-left rounded-lg px-2 py-2 transition-colors ${
                    selectedDate === ev.deadline.date
                      ? "bg-gold-500/10"
                      : "hover:bg-film-700/40"
                  }`}
                >
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${deadlineColors[ev.deadline.type]}`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-film-100 truncate">
                      {ev.festival.name}
                    </p>
                    <p className="text-xs text-film-400">
                      {formatDate(ev.deadline.date)} &middot;{" "}
                      {ev.deadline.fee === 0 ? "Free" : `$${ev.deadline.fee}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
