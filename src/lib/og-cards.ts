import type { Narrative, Snapshot } from "../data/schema";
import type { OgCard } from "./og-image";
import { fmt } from "./format";
import { factCheckTotal, isNewNarrative, stripNewPrefix, longEditionLabel, rankedNarratives, shortTitle, topFactCheck } from "./share";

export function snapshotCard(snapshot: Snapshot): OgCard {
  const [top, ...rest] = rankedNarratives(snapshot);
  return {
    edition: longEditionLabel(snapshot.id),
    kicker: "Top rising narrative",
    headline: shortTitle(top.title),
    side: top.side,
    momentum: top.momentum,
    footer: rest.slice(0, 2).map((n, i) => `${i + 2}. ${shortTitle(n.title)} · ${n.side} ${n.momentum}`),
  };
}

function ratingTone(rating: string): "danger" | "warn" | "accent" {
  const r = rating.toLowerCase();
  if (/false|fabricat|pants|wrong|no evidence|unsupported/.test(r)) return "danger";
  if (/mislead|missing|mixed|half|lacks|exagger|out of context|unproven/.test(r)) return "warn";
  return "accent";
}

export function disinfoCard(snapshot: Snapshot): OgCard {
  const count = factCheckTotal(snapshot);
  const top = topFactCheck(snapshot);
  const edition = longEditionLabel(snapshot.id);
  if (!top) {
    const lead = rankedNarratives(snapshot)[0];
    return {
      edition,
      kicker: "Disinformation tracker",
      headline: "No rated fact-checks in this snapshot",
      side: lead.side,
      momentum: lead.momentum,
      footer: [`Top narrative: ${shortTitle(lead.title)}`],
    };
  }
  return {
    edition,
    kicker: `${count} fact-check${count === 1 ? "" : "s"}`,
    headline: `“${top.check.claim.replace(/^["“']+|["”']+$/g, "")}”`,
    side: top.narrative.side,
    momentum: top.narrative.momentum,
    badge: { label: top.check.rating, tone: ratingTone(top.check.rating) },
    footer: [`Rated by ${top.check.outlet}`, `From: ${shortTitle(top.narrative.title)}`],
  };
}

export function defaultCard(latest: Snapshot): OgCard {
  const top = rankedNarratives(latest)[0];
  return {
    edition: longEditionLabel(latest.id),
    kicker: "Opposition narrative tracker",
    headline: "Who's pushing what, and how fast",
    footer: [
      "Right and Far Left narratives, scored for momentum",
      `Leading now: ${shortTitle(top.title)} · ${top.side} ${top.momentum}`,
    ],
  };
}

/** Per-narrative card: that narrative's own headline, side, momentum, and a one-line read. */
export function narrativeCard(snapshot: Snapshot, narrative: Narrative): OgCard {
  const posts = `${fmt(narrative.posts24h)} posts in 24h`;
  const line = `${posts} · ${narrative.sentiment}`;
  return {
    edition: longEditionLabel(snapshot.id),
    headline: stripNewPrefix(narrative.title),
    isNew: isNewNarrative(narrative),
    side: narrative.side,
    momentum: narrative.momentum,
    footer: [line.length <= 64 ? line : posts],
  };
}
