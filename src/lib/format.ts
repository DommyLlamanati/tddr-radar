export type Tone = "danger" | "warning" | "accent" | "neutral";

export function fmt(value: number): string {
  return value.toLocaleString("en-US");
}

/** Display labels from the prototype: hard acceleration, rising, holding, cooling. */
export function accelMeta(value: number): { label: string; tone: Tone } {
  if (value >= 3) return { label: "Accelerating hard", tone: "danger" };
  if (value >= 1.2) return { label: "Rising", tone: "warning" };
  if (value >= 0.8) return { label: "Holding", tone: "accent" };
  return { label: "Cooling", tone: "neutral" };
}

export function outletsSentence(
  outlets: number,
  trendingUS: boolean,
  trendsPulledAtLabel: string,
): string {
  const trend = trendingUS
    ? "; on the U.S. X trends list this morning"
    : `; not observed as a named U.S. trend at ${trendsPulledAtLabel}`;
  return `${outlets} named outlets opened or retrieved${trend}`;
}

export function sideClass(side: "Right" | "Far Left"): "right" | "left" {
  return side === "Far Left" ? "left" : "right";
}

export function factCheckCount(narratives: { factChecks: unknown[] }[]): number {
  return narratives.reduce((total, narrative) => total + narrative.factChecks.length, 0);
}

export function countSides(narratives: { side: "Right" | "Far Left" }[]) {
  const right = narratives.filter((narrative) => narrative.side === "Right").length;
  const left = narratives.length - right;
  return { right, left };
}
