# FestivalPlanner

**A field guide to the film festival circuit** — browse deadlines, protect your premiere status, and build a submission plan around your film and your budget.

🔗 **Live:** [fest.marcelperez.co](https://fest.marcelperez.co)

Built by a filmmaker, for filmmakers.

## What it does

- **Browse** — 100 festivals worldwide, filterable by format, genre, region, tier, premiere requirement, fee, and deadline. Recurring deadlines roll forward automatically, so nothing reads as "closed."
- **Deadline diary** — every submission window on one calendar, colour-coded by deadline type.
- **Strategy planner** — tell it about your film and it builds a phased submission plan that protects your premiere (submit to the highest tier first), respects each festival's real eligibility rules, honours your budget, and plans around your ready date. Export to a checklist, calendar (.ics), or CSV.
- **The map** — every festival plotted by real geography; the dots cluster into the circuit at a glance.

The engine is short-film aware (separate short deadlines/fees), models per-festival premiere acceptance (e.g. Sundance takes a North American premiere, not just a world premiere), and projects each festival's next annual cycle when the current one has closed.

## Tech

- [**Astro**](https://astro.build) — static-first, with interactive islands
- [**Preact**](https://preactjs.com) (compat) — the browse/calendar/planner islands
- [**Tailwind CSS v4**](https://tailwindcss.com) + a custom "Newsprint" design system
- **TypeScript** throughout
- Deployed on **Vercel**

## Develop

```sh
npm install
npm run dev          # local dev server
npm run build        # production build → dist/
npm run preview      # serve the built site
npx astro check      # typecheck
```

## Project structure

```text
src/
├── data/festivals.json      # the festival database
├── lib/
│   ├── festivals.ts         # data access + deadline projection
│   ├── filters.ts           # browse filtering/sorting
│   ├── strategy.ts          # the submission-strategy engine
│   ├── cityCoords.ts        # map coordinates per festival city
│   └── types.ts             # shared types
├── components/              # Preact islands + Astro components
├── layouts/Layout.astro     # shared shell (masthead, footer, SEO)
├── pages/                   # home, browse, calendar, planner, festival detail, submit
└── styles/global.css        # the Newsprint design system
```

## Data

Festivals live in [`src/data/festivals.json`](src/data/festivals.json). Each new festival needs a matching entry in [`src/lib/cityCoords.ts`](src/lib/cityCoords.ts) so it plots on the map. Data is sourced (dates/fees/premiere rules), not fabricated — always verify deadlines on the official festival site.
