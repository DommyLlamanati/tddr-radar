import { z } from "astro/zod";

/**
 * Snapshot schema for TDDR Narrative Tracker.
 *
 * A daily job should write one JSON file per snapshot into `src/data/snapshots/`.
 * The filename (without extension) must match `id` (`YYYY-MM-DD`, or
 * `YYYY-MM-DD-pm` for a second, evening snapshot on the same day).
 * The app renders the snapshot with the latest `updatedAt`. Adding a file
 * does not require a code change as long as it validates against this schema.
 */

export const seriesPointSchema = z.object({
  label: z.string().min(1),
  value: z.number(),
});

export const factCheckSchema = z.object({
  claim: z.string().min(1),
  rating: z.string().min(1),
  detail: z.string().min(1),
  href: z.string().url(),
  outlet: z.string().min(1),
});

export const sourceLinkSchema = z.object({
  title: z.string().min(1),
  site: z.string().min(1).optional(),
  date: z.string().min(1).optional(),
  href: z.string().url(),
});

export const narrativeSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1),
  side: z.enum(["Right", "Far Left"]),
  momentum: z.number().min(0).max(100),
  volumeIndex: z.number().min(0).max(100),
  accelIndex: z.number().min(0).max(100),
  coverageIndex: z.number().min(0).max(100),
  posts24h: z.number().int().nonnegative(),
  posts7d: z.number().int().nonnegative(),
  priorDailyAvg: z.number().nonnegative(),
  accel: z.number().nonnegative(),
  outlets: z.number().int().nonnegative(),
  trendingUS: z.boolean(),
  query: z.string().min(1),
  sentiment: z.string().min(1),
  sentimentNote: z.string().min(1),
  summary: z.string().min(1),
  talkingPoints: z.array(z.string().min(1)).min(1),
  amplifiers: z.string().min(1),
  whyItWorks: z.string().min(1),
  audience: z.string().min(1),
  counter: z.string().min(1),
  factChecks: z.array(factCheckSchema),
  daily: z.array(seriesPointSchema),
  hourly: z.array(seriesPointSchema).optional(),
  hourlyNote: z.string().min(1).optional(),
  sources: z.array(sourceLinkSchema).min(1),
  defaultOpen: z.boolean().optional(),
});

export const snapshotSchema = z
  .object({
    id: z.string().regex(/^\d{4}-\d{2}-\d{2}(?:-pm)?$/),
    updatedAt: z.string().datetime({ offset: true }),
    updatedLabel: z.string().min(1),
    timezone: z.literal("America/New_York"),
    title: z.string().min(1),
    summary: z.string().min(1),
    trends: z.object({
      pulledAtLabel: z.string().min(1),
      names: z.array(z.string().min(1)),
      detail: z.string().min(1),
    }),
    countsPulledLabel: z.string().min(1),
    hottestQueryDetail: z.string().min(1),
    factCheckOutletsDetail: z.string().min(1),
    oppositionNote: z.object({
      lead: z.string().min(1),
      body: z.string().min(1),
    }),
    methodology: z.array(z.string().min(1)).min(1),
    formula: z.object({
      volumeWeight: z.number().positive(),
      accelWeight: z.number().positive(),
      coverageWeight: z.number().positive(),
      volumeCeilingPosts: z.number().int().positive(),
      accelCap: z.number().positive(),
      coverageOutletCap: z.number().int().positive(),
      coverageOutletPoints: z.number().nonnegative(),
      trendBonus: z.number().nonnegative(),
      last24hWindow: z.string().min(1),
      sevenDayWindow: z.string().min(1),
    }),
    chartCaption: z.string().min(1),
    volumeChartCaption: z.string().min(1),
    dailyChartCaption: z.string().min(1),
    noFactCheckNote: z.string().min(1),
    feedCaption: z.string().min(1),
    disinfo: z.object({
      caption: z.string().min(1),
      caveatLead: z.string().min(1),
      caveatBody: z.string().min(1),
      links: z.array(sourceLinkSchema),
    }),
    sourceListIntro: z.string().min(1),
    sourceList: z.array(sourceLinkSchema).min(1),
    narratives: z.array(narrativeSchema).min(1),
  })
  .superRefine((snapshot, ctx) => {
    const weight =
      snapshot.formula.volumeWeight +
      snapshot.formula.accelWeight +
      snapshot.formula.coverageWeight;
    if (Math.abs(weight - 1) > 0.001) {
      ctx.addIssue({
        code: "custom",
        path: ["formula"],
        message: `Formula weights must sum to 1 (got ${weight}).`,
      });
    }
    const ids = new Set<string>();
    for (const narrative of snapshot.narratives) {
      if (ids.has(narrative.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["narratives"],
          message: `Duplicate narrative id "${narrative.id}".`,
        });
      }
      ids.add(narrative.id);
    }
  });

export type SeriesPoint = z.output<typeof seriesPointSchema>;
export type FactCheck = z.output<typeof factCheckSchema>;
export type SourceLink = z.output<typeof sourceLinkSchema>;
export type Narrative = z.output<typeof narrativeSchema>;
export type Snapshot = z.output<typeof snapshotSchema>;
export type Side = Narrative["side"];
