import type { Narrative, Snapshot } from "../data/schema";
import { isEveningSnapshot, snapshotDay } from "./dates";

/** Public production origin used for canonical and Open Graph URLs. */
export const SITE_URL = "https://tddr-radar.vercel.app";
export const SITE_NAME = "TDDR Radar";
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
export const DEFAULT_OG_IMAGE = "/og/default.png";

export function absoluteUrl(pathname: string): string {
  return new URL(pathname, SITE_URL).toString();
}

export function ogImagePath(snapshotId: string): string {
  return `/og/${snapshotId}.png`;
}

export function ogDisinfoImagePath(snapshotId: string): string {
  return `/og/${snapshotId}/disinfo.png`;
}

function dayDate(id: string): Date {
  const [year, month, day] = snapshotDay(id).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** "Nov 14 evening" or "Nov 14 morning". */
export function editionLabel(id: string): string {
  const date = dayDate(id).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${date} ${isEveningSnapshot(id) ? "evening" : "morning"}`;
}

/** "Saturday, Nov 14 · Evening" for preview images. */
export function longEditionLabel(id: string): string {
  const date = dayDate(id).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${date} · ${isEveningSnapshot(id) ? "Evening" : "Morning"}`;
}

export function rankedNarratives(snapshot: Snapshot): Narrative[] {
  return [...snapshot.narratives].sort((a, b) => b.momentum - a.momentum);
}

/** Headline part of a narrative title, before a colon or dash aside. */
export function shortTitle(title: string): string {
  const head = title.split(/:\s|\s[—–]\s|\s-\s/)[0]?.trim() ?? title;
  return head.length >= 8 ? head : title;
}

/** Trim to `max` characters on a word boundary, adding an ellipsis when cut. */
export function clip(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.—–-]+$/, "")}…`;
}

function narrativeTag(narrative: Narrative): string {
  return `${shortTitle(narrative.title)} (${narrative.side}, ${narrative.momentum})`;
}

/** Top fact-checked claim: from the highest-momentum narrative that has one. */
export function topFactCheck(snapshot: Snapshot) {
  for (const narrative of rankedNarratives(snapshot)) {
    const check = narrative.factChecks[0];
    if (check) return { narrative, check };
  }
  return null;
}

export function factCheckTotal(snapshot: Snapshot): number {
  return snapshot.narratives.reduce((total, narrative) => total + narrative.factChecks.length, 0);
}

export function homeShare(snapshot: Snapshot) {
  const [top, ...rest] = rankedNarratives(snapshot);
  const also = rest
    .slice(0, 2)
    .map((narrative) => shortTitle(narrative.title))
    .join("; ");
  return {
    title: `${shortTitle(top.title)} leads the ${editionLabel(snapshot.id)} radar · ${SITE_NAME}`,
    description: clip(
      `Top rising narrative: ${narrativeTag(top)}.${also ? ` Also rising: ${also}.` : ""}`,
    ),
  };
}

export function snapshotShare(snapshot: Snapshot) {
  const top3 = rankedNarratives(snapshot).slice(0, 3);
  return {
    title: `Rising narratives, ${editionLabel(snapshot.id)} · ${SITE_NAME}`,
    description: clip(`Top 3: ${top3.map((n, i) => `${i + 1}. ${narrativeTag(n)}`).join(" · ")}`),
  };
}

export function disinfoShare(snapshot: Snapshot) {
  const count = factCheckTotal(snapshot);
  const top = topFactCheck(snapshot);
  const noun = count === 1 ? "fact-check" : "fact-checks";
  return {
    title: `${count} ${noun} on rising claims, ${editionLabel(snapshot.id)} · ${SITE_NAME}`,
    description: top
      ? clip(`Top claim: “${top.check.claim.replace(/^["“']+|["”']+$/g, "")}” ${top.check.outlet}: ${top.check.rating}.`)
      : clip(`No rated fact-checks in the ${editionLabel(snapshot.id)} snapshot. ${snapshot.disinfo.caption}`),
  };
}

export function narrativeShare(snapshot: Snapshot, narrative: Narrative) {
  return {
    title: `${shortTitle(narrative.title)} (${narrative.side}, momentum ${narrative.momentum}) · ${SITE_NAME}`,
    description: clip(narrative.summary),
  };
}
