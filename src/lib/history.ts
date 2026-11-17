import type { Narrative, Snapshot } from "../data/schema";
import { isEveningSnapshot, shortSnapshotDate } from "./dates";
import { stripNewPrefix } from "./share";

/**
 * Narrative history: follows each narrative across every snapshot (AM and PM).
 *
 * Matching rule, in order:
 * 1. Same slug (`narrative.id`) in two snapshots = same narrative. The 7 AM and 5 PM routines
 *    reuse a slug while a story keeps running, so this covers almost every case.
 * 2. Known slug drift, listed by hand in `SLUG_ALIASES` (old slug -> current slug). Add a line
 *    here if a routine ever renames a slug; no snapshot file or schema change is needed.
 * 3. Title fallback for a slug seen for the first time: it joins an existing narrative on the
 *    same side when their titles share at least 60% of their content words (Jaccard on words of
 *    4+ letters, "NEW:" prefix and stop words removed), the older one was last seen within the
 *    previous 2 snapshots, and the older one is not in the same snapshot. This is deliberately
 *    strict so different stories are never merged.
 * Each history is keyed by its most recent slug, so `/narratives/<slug>` uses the slug the
 * current snapshot uses. Older slugs redirect to it.
 */
export const SLUG_ALIASES: Record<string, string> = {
  // Nov 11 "abolishing the Electoral College via the popular-vote compact" -> same story from Nov 12 on.
  npv: "electoral-college",
  // Nov 12-13 "Don Leonard's 'living hell' ... block Jeffries" -> Don Leonard's red lines from Nov 15 PM on.
  "jeffries-revolt": "leonard-jeffries",
  // Nov 11 "The midterms were rigged" -> "The blue wave was rigged" from Nov 16 on.
  fraud: "rigged-midterms",
};

const TITLE_MATCH_MIN = 0.6;
const TITLE_MATCH_MAX_GAP = 2;

export type HistoryStatus = "rising" | "peaked" | "fading" | "gone";

export interface Appearance {
  snapshotId: string;
  updatedAt: string;
  /** Position of the snapshot in the full, oldest-first list. */
  index: number;
  /** Slug the narrative had in that snapshot (its story page uses it). */
  slug: string;
  title: string;
  side: Narrative["side"];
  momentum: number;
  posts24h: number;
  accel: number;
  rank: number;
  total: number;
}

export interface NarrativeHistory {
  slug: string;
  /** Every slug this narrative has used, oldest first. */
  slugs: string[];
  title: string;
  side: Narrative["side"];
  appearances: Appearance[];
  first: Appearance;
  last: Appearance;
  peak: Appearance;
  status: HistoryStatus;
  /** First seen in the latest snapshot. */
  isNew: boolean;
  /** Present in the latest snapshot. */
  current: boolean;
}

export interface SnapshotRef {
  id: string;
  updatedAt: string;
  index: number;
}

const STOP = new Set(
  "about after again against also before being from have into just more over said says than that their them then there they this what when which while will with would your still story".split(" "),
);

function words(title: string): Set<string> {
  return new Set(
    stripNewPrefix(title)
      .toLowerCase()
      .replace(/[’']/g, "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 4 && !STOP.has(w)),
  );
}

export function titleSimilarity(a: string, b: string): number {
  const x = words(a);
  const y = words(b);
  if (!x.size || !y.size) return 0;
  let both = 0;
  for (const w of x) if (y.has(w)) both += 1;
  return both / (x.size + y.size - both);
}

/** Snapshot label such as "Nov 15 AM". */
export function snapshotShortLabel(id: string): string {
  return `${shortSnapshotDate(id)} ${isEveningSnapshot(id) ? "PM" : "AM"}`;
}

/** Rising: up 5+ points on its previous sighting, or first seen in the latest snapshot.
 *  Fading: 8+ points below its peak. Peaked: still in the latest snapshot, otherwise.
 *  Gone: not in the latest snapshot. */
export const STATUS_RULES = {
  risingDelta: 5,
  fadingBelowPeak: 8,
};

function statusFor(apps: Appearance[], latestIndex: number): HistoryStatus {
  const last = apps[apps.length - 1];
  if (last.index !== latestIndex) return "gone";
  if (apps.length === 1) return "rising";
  const prev = apps[apps.length - 2];
  const peak = Math.max(...apps.map((a) => a.momentum));
  if (last.momentum - prev.momentum >= STATUS_RULES.risingDelta) return "rising";
  if (last.momentum <= peak - STATUS_RULES.fadingBelowPeak) return "fading";
  return "peaked";
}

export interface HistoryIndex {
  snapshots: SnapshotRef[];
  histories: NarrativeHistory[];
  /** Current history slug for any slug ever used. */
  canonical: Map<string, string>;
  bySlug: Map<string, NarrativeHistory>;
}

/** Build every narrative history from snapshots in any order. */
export function buildHistory(input: Snapshot[]): HistoryIndex {
  const snaps = [...input].sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt));
  const latestIndex = snaps.length - 1;
  // thread key -> appearances; key is the first slug seen, re-keyed to the latest slug at the end
  const threads = new Map<string, Appearance[]>();
  const slugToThread = new Map<string, string>();

  snaps.forEach((snap, index) => {
    const ranked = [...snap.narratives].sort((a, b) => b.momentum - a.momentum);
    const claimed = new Set<string>();
    for (const n of ranked) {
      const rank = ranked.indexOf(n) + 1;
      const app: Appearance = {
        snapshotId: snap.id,
        updatedAt: snap.updatedAt,
        index,
        slug: n.id,
        title: n.title,
        side: n.side,
        momentum: n.momentum,
        posts24h: n.posts24h,
        accel: n.accel,
        rank,
        total: ranked.length,
      };
      let key = slugToThread.get(n.id);
      if (!key && SLUG_ALIASES[n.id]) key = slugToThread.get(SLUG_ALIASES[n.id]);
      if (!key) {
        // reverse alias: an old slug that now maps to this one was seen before
        const old = Object.entries(SLUG_ALIASES).find(([, to]) => to === n.id)?.[0];
        if (old) key = slugToThread.get(old);
      }
      if (!key) {
        let best: { key: string; score: number } | null = null;
        for (const [k, apps] of threads) {
          const last = apps[apps.length - 1];
          if (claimed.has(k) || last.side !== n.side || last.index === index) continue;
          if (index - last.index > TITLE_MATCH_MAX_GAP) continue;
          const score = titleSimilarity(last.title, n.title);
          if (score >= TITLE_MATCH_MIN && (!best || score > best.score)) best = { key: k, score };
        }
        if (best) key = best.key;
      }
      if (!key || claimed.has(key)) key = key && claimed.has(key) ? `${n.id}@${snap.id}` : n.id;
      claimed.add(key);
      slugToThread.set(n.id, key);
      const list = threads.get(key) ?? [];
      list.push(app);
      threads.set(key, list);
    }
  });

  const histories: NarrativeHistory[] = [];
  const canonical = new Map<string, string>();
  for (const apps of threads.values()) {
    const last = apps[apps.length - 1];
    const peak = apps.reduce((best, a) => (a.momentum > best.momentum ? a : best), apps[0]);
    const slugs = [...new Set(apps.map((a) => a.slug))];
    const slug = last.slug;
    for (const s of slugs) canonical.set(s, slug);
    histories.push({
      slug,
      slugs,
      title: last.title,
      side: last.side,
      appearances: apps,
      first: apps[0],
      last,
      peak,
      status: statusFor(apps, latestIndex),
      isNew: apps.length === 1 && last.index === latestIndex,
      current: last.index === latestIndex,
    });
  }
  for (const [from, to] of Object.entries(SLUG_ALIASES)) {
    if (!canonical.has(from) && canonical.has(to)) canonical.set(from, canonical.get(to)!);
  }
  histories.sort((a, b) =>
    a.current !== b.current
      ? a.current
        ? -1
        : 1
      : a.current
        ? b.last.momentum - a.last.momentum
        : b.last.index - a.last.index || b.peak.momentum - a.peak.momentum,
  );
  return {
    snapshots: snaps.map((s, index) => ({ id: s.id, updatedAt: s.updatedAt, index })),
    histories,
    canonical,
    bySlug: new Map(histories.map((h) => [h.slug, h])),
  };
}

export function historyPath(slug: string): string {
  return `/narratives/${slug}`;
}

export const STATUS_LABEL: Record<HistoryStatus, string> = {
  rising: "Rising",
  peaked: "At peak",
  fading: "Fading",
  gone: "Gone",
};

/* ---------------- What's new ---------------- */

/** A big riser gained 8+ momentum points, or at least doubled its 24h X posts to 1,000 or more. */
export const RISER_RULES = { momentumDelta: 8, postsMultiple: 2, postsFloor: 1000 };

export interface WhatsNewItem {
  slug: string;
  title: string;
  side: Narrative["side"];
  momentum: number;
  prevMomentum?: number;
  posts24h?: number;
  prevPosts24h?: number;
  /** New: first sighting ever. Back: seen before, but not in the previous snapshot. */
  kind: "new" | "back" | "riser" | "gone";
}

export interface WhatsNew {
  previousId: string | null;
  fresh: WhatsNewItem[];
  risers: WhatsNewItem[];
  gone: WhatsNewItem[];
}

export function whatsNew(index: HistoryIndex, snapshotId: string): WhatsNew {
  const pos = index.snapshots.findIndex((s) => s.id === snapshotId);
  const empty: WhatsNew = { previousId: null, fresh: [], risers: [], gone: [] };
  if (pos <= 0) return empty;
  const prevId = index.snapshots[pos - 1].id;
  const fresh: WhatsNewItem[] = [];
  const risers: WhatsNewItem[] = [];
  const gone: WhatsNewItem[] = [];
  for (const h of index.histories) {
    const now = h.appearances.find((a) => a.index === pos);
    const before = h.appearances.find((a) => a.index === pos - 1);
    const base = { slug: h.slug, side: h.side };
    if (now && !before) {
      const seenEarlier = h.appearances.some((a) => a.index < pos - 1);
      fresh.push({ ...base, title: now.title, momentum: now.momentum, posts24h: now.posts24h, kind: seenEarlier ? "back" : "new" });
    } else if (now && before) {
      const dm = now.momentum - before.momentum;
      const postsJump =
        now.posts24h >= RISER_RULES.postsFloor && now.posts24h >= before.posts24h * RISER_RULES.postsMultiple;
      if (dm >= RISER_RULES.momentumDelta || postsJump) {
        risers.push({
          ...base,
          title: now.title,
          momentum: now.momentum,
          prevMomentum: before.momentum,
          posts24h: now.posts24h,
          prevPosts24h: before.posts24h,
          kind: "riser",
        });
      }
    } else if (!now && before) {
      gone.push({ ...base, title: before.title, momentum: before.momentum, kind: "gone" });
    }
  }
  fresh.sort((a, b) => b.momentum - a.momentum);
  risers.sort((a, b) => b.momentum - (b.prevMomentum ?? 0) - (a.momentum - (a.prevMomentum ?? 0)));
  gone.sort((a, b) => b.momentum - a.momentum);
  return { previousId: prevId, fresh, risers, gone };
}
