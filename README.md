# TDDR Narrative Tracker

Opposition-narrative desk for TDDR (Too Dumb Didn't Read). This is the first piece of an AI-based Democratic think tank: a static Astro site that tracks rising narratives from the Right and the Far Left, with momentum, sentiment, talking points, why a line works, who it resonates with, and a suggested Democratic counter-angle.

The site is a research snapshot, not a live feed. The first file is the Wednesday, Nov 11, 2026, 5:58 AM ET pull. Every count, quote, account, and source in that file is from that morning’s research. The app does not invent or recompute them.

## Setup

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open the URL Astro prints (by default `http://localhost:4321`).

```bash
npm run check:data   # validate snapshot JSON
npm run build        # static site in dist/
npm run preview      # serve the production build
```

## Pages

| Route | What it shows |
| --- | --- |
| `/` | Latest snapshot (highest `updatedAt`): metrics, momentum chart, 24-hour volume, filterable feed, source list |
| `/snapshots` | Archive of every snapshot, newest first |
| `/snapshots/[date]` | That day’s dashboard |
| `/snapshots/[date]/disinfo` | That day’s fact-checked claims |
| `/snapshots/[date]/narratives/[id]` | One narrative inside that snapshot, so the same id on two days does not collide |
| `/disinfo` | Fact-checks for the latest snapshot |
| `/narratives/[id]` | A narrative from the latest snapshot |
| `/about` | Methodology for the snapshot on the dashboard, plus how to add the next file |

Filters and sorting are a React island. Side and sort are also written to the query string (`?side=right&sort=volume`). Everything else is static HTML. The default theme is dark; the header toggles light mode and remembers the choice.

## Data schema

Snapshots live in `src/data/snapshots/`. One JSON file per snapshot. The filename (without `.json`) must equal the `id` field, which is `YYYY-MM-DD`, or `YYYY-MM-DD-pm` for a second, evening snapshot on the same day. The homepage, `/disinfo`, and `/narratives/[id]` render the snapshot with the latest `updatedAt`. Every file also gets `/snapshots/[date]`, a disinformation page, and narrative pages. Adding a file does not require a page change. The header switches among Today (Tonight for an evening file), This morning when an earlier file shares the day, the previous night when that file is the prior calendar day, and older dates.

`updatedAt` is an ISO timestamp with a numeric offset (`2026-11-11T05:58:00-05:00`). `updatedLabel` is the Eastern Time string the UI prints (`Wednesday, Nov 11, 2026, 5:58 AM ET`). `timezone` is always `America/New_York`. The site displays `updatedLabel` rather than reformatting the instant, so the label stays the one the researcher wrote.

The schema is `src/data/schema.ts` (Zod). A snapshot object:

| Field | Meaning |
| --- | --- |
| `id` | `YYYY-MM-DD` (or `YYYY-MM-DD-pm` for an evening snapshot), matches the filename |
| `updatedAt`, `updatedLabel`, `timezone` | When this snapshot was closed, in ET |
| `title`, `summary` | Desk title and the lede |
| `trends` | U.S. X trend names, when they were pulled, and the label shown on the metric |
| `countsPulledLabel` | When post counts and samples were pulled |
| `hottestQueryDetail`, `factCheckOutletsDetail` | Metric captions |
| `oppositionNote` | What “Right” and “Far Left” mean in this snapshot |
| `methodology` | Paragraphs printed on the methodology page |
| `formula` | Weights and windows used to explain the score. The app does not recompute stored indices from these fields |
| `chartCaption`, `volumeChartCaption`, `dailyChartCaption` | Chart notes |
| `noFactCheckNote` | Copy used when a narrative has no logged fact-check |
| `feedCaption` | Feed instructions |
| `disinfo` | Tracker caption, caveat, and featured fact-check links |
| `sourceListIntro`, `sourceList` | Numbered source list |
| `narratives` | The cards |

Each narrative:

| Field | Meaning |
| --- | --- |
| `id` | URL slug, unique inside the snapshot (`hegseth-11`) |
| `title`, `side` | `side` is `Right` or `Far Left` |
| `momentum` | Published composite, 0–100 |
| `volumeIndex`, `accelIndex`, `coverageIndex` | The three published parts of that composite |
| `posts24h`, `posts7d`, `priorDailyAvg`, `accel` | X query-match counts and the acceleration multiple |
| `outlets`, `trendingUS` | Named outlets opened or retrieved, and whether a phrase was on the U.S. trends list |
| `query` | The English-language X search used for the counts |
| `sentiment`, `sentimentNote` | Qualitative read of a sample, not a poll |
| `summary` | What happened |
| `talkingPoints`, `amplifiers` | The line, and who is carrying it |
| `whyItWorks`, `audience` | Why the narrative lands, and with whom |
| `counter` | Suggested TDDR counter-angle |
| `factChecks` | `{ claim, rating, detail, href, outlet }` |
| `daily` | `{ label, value }` UTC-day counts. Labels ending in `*` are partial windows |
| `hourly`, `hourlyNote` | Optional hour-by-hour counts |
| `sources` | `{ title, href, site?, date? }` |
| `defaultOpen` | Optional. The feed opens these cards first |

`npm run check:data` validates every file. The Nov 11, 2026 snapshot is also pinned to its published counts (10 narratives, 8 fact-checks, Hegseth at 51,519 posts and momentum 100, and a few source strings). Later dates are schema-checked only. `npm run build` runs that check first.

### Momentum score

Inside one snapshot, for each narrative:

**Score = 50% volume index + 30% acceleration index + 20% coverage index.**

- **Volume index** = `100 × log10(1 + last-24h posts) / log10(1 + ceiling)`, where `ceiling` is the highest last-24h count in the set (51,519 on Nov 11, the Hegseth query).
- **Acceleration index** = `100 × min(last-24h / prior daily average, 3) / 3`. A day at least triple the prior average scores 100. Prior daily average is `(7-day total − last 24h) / 6`. The first of those six days is a partial window, so the average is slightly conservative.
- **Coverage index** = `70 × min(outlets, 7) / 7`, plus 30 if the topic was on the U.S. X trends list. Trend objects in that pull did not include `tweet_count`, so trend volumes are not invented.

Counts are query matches, not unique posts or unique users, and queries can overlap. Sentiment is a read of a relevancy-sorted sample plus quotes in coverage, not a poll. The full wording for the Nov 11 snapshot is stored in that file’s `methodology` array and rendered on `/about`.

Acceleration badges on a card are display labels only: Accelerating hard at 3× or above, Rising from 1.2×, Holding from 0.8×, otherwise Cooling.

## Add a snapshot

1. Copy `src/data/snapshots/2026-11-11.json` to `src/data/snapshots/YYYY-MM-DD.json`.
2. Set `id`, `updatedAt`, and `updatedLabel` to the new close time in Eastern Time.
3. Replace narratives, fact-checks, charts, and the methodology paragraphs with that day’s research. Keep every number, quote, account, and URL that you actually observed. Do not backfill missing counts.
4. Validate and install:

```bash
npm run ingest -- --input ./draft.json
```

Re-run with `--force` to overwrite an id that already exists. Or save the file directly into `src/data/snapshots/` and run `npm run check:data`.

Build and deploy. The dashboard, disinformation tracker, detail pages, and methodology page all follow the newest `updatedAt`.

## Automated ingestion

`scripts/ingest-snapshot.ts` is the hook a daily job should finish on. It does not call the network and it does not read API keys.

The job, when someone builds it, should look like this:

1. **Collect.** `collectSignals()` pulls X recent-search counts for tracked queries (and any newly clustered phrases), the U.S. trends list, and pages from news and fact-check outlets (AFP, AP, Snopes, FactCheck.org, PolitiFact, and the outlets that actually published that day).
2. **Cluster and write the analysis.** `clusterNarratives()` sends the posts, headlines, and fact-checks to an LLM. The model proposes narrative clusters and drafts sentiment, talking points, amplifiers, why it works, audience, and a TDDR counter-angle. Every claim in that draft needs a source URL the researcher can open. Thin samples stay labeled as thin.
3. **Score.** `scoreMomentum()` fills `volumeIndex`, `accelIndex`, `coverageIndex`, and `momentum` with the formula above, using that day’s ceiling (the max last-24h count in the new set). Round indices to one decimal and momentum to the nearest integer, then store those published numbers. Do not recompute a snapshot after it has shipped. The website will not “correct” them.
4. **Write JSON** that matches `src/data/schema.ts`, including a fresh `updatedAt` and an ET `updatedLabel`.
5. **Install** with `npm run ingest -- --input ./draft.json`, commit the file, and let the static build deploy.

Those three functions throw on purpose. `npm run ingest -- --live` exits with an error and does not open a socket.

Suggested variables for the future job, none of which are read today:

| Variable | Use |
| --- | --- |
| `X_BEARER_TOKEN` | X recent search counts and the U.S. trends list |
| `NARRATIVE_LLM_API_KEY` | Clustering and the analytical fields |
| `NARRATIVE_LLM_BASE_URL` | Optional OpenAI-compatible base URL |

Do not commit tokens. This repo has no `.env` and no placeholder keys.

## Deploy

The site is static (`output: "static"` in `astro.config.mjs`). Vercel’s Astro preset can build it with `npm run build` and publish `dist/`. No Vercel adapter is installed, because there is no server route. Add `@astrojs/vercel` only if a later version needs one.

## Stack

Astro 7, TypeScript, React islands for filtering and sorting, Tailwind 4. Narrative pages and charts are server-rendered HTML. Fonts are self-hosted.

## Link previews

Every page ships Open Graph and Twitter card tags (`src/layouts/Radar.astro`, text in `src/lib/share.ts`). All pages use the shadcn/ui + Tailwind redesign (`src/components/ui/`, `src/components/radar/`, `src/styles/radar.css`).
Preview images (1200x630 PNG) are rendered at build time with satori and resvg:

- `/og/<snapshot-id>.png` for each snapshot page and the homepage
- `/og/<snapshot-id>/disinfo.png` for each disinformation page
- `/og/default.png` for the archive, methodology, and other pages

Fonts and the mascot watermark live in `src/assets/og/`, so the build makes no network calls.
New snapshot JSON files get their own images and meta automatically.

## Narrative history and What's new

- `/narratives` lists every narrative ever tracked; `/narratives/<slug>` follows one across every snapshot (AM and PM) with a momentum chart, first sighting, peak, status, and a timeline linking to each snapshot's story page. Built at build time from `src/data/snapshots/*.json`; no schema change.
- Matching (see `src/lib/history.ts`): same slug, then the hand-checked `SLUG_ALIASES` list for renamed slugs, then a strict title fallback (same side, 60%+ shared key words, older card seen in the last 2 snapshots). Each history uses its most recent slug; old slugs redirect.
- Status: rising = +5 on its previous sighting or new in the latest snapshot; fading = 8+ below its own peak; at peak = otherwise on the board; gone = not in the latest snapshot.
- What's new (homepage and each snapshot page) compares with the immediately previous snapshot. Big riser = +8 momentum points, or 24h X posts at least doubled to 1,000+.
