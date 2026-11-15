import { readFile } from "node:fs/promises";
import path from "node:path";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { OG_HEIGHT, OG_WIDTH } from "./share";

/**
 * Build-time Open Graph images (1200x630 PNG). Fonts and the mascot are bundled in
 * `src/assets/og/` so nothing is fetched from the network during the build.
 */

const assetDir = path.join(process.cwd(), "src/assets/og");

const C = {
  bg: "#121212",
  raised: "#1c1c1c",
  ink: "#f6f3ea",
  muted: "#d5d0c4",
  faint: "#b3ad9f",
  accent: "#e6ff3d",
  black: "#111111",
  right: "#ff5a36",
  left: "#8eb6ff",
  danger: "#ff5d73",
  warn: "#ffb020",
};

type Node = { type: string; props: Record<string, unknown> };
type Child = Node | string | null | undefined | false;

function h(type: string, style: Record<string, unknown>, ...children: Child[]): Node {
  const kids = children.filter((child): child is Node | string => Boolean(child));
  return { type, props: { style, children: kids.length === 1 ? kids[0] : kids } };
}

let assetsPromise: Promise<{ fonts: Parameters<typeof satori>[1]["fonts"]; mascot: string }> | undefined;

function loadAssets() {
  assetsPromise ??= (async () => {
    const font = (file: string) => readFile(path.join(assetDir, "fonts", file));
    const [display, sans500, sans700, mono, mascot] = await Promise.all([
      font("big-shoulders-display-latin-800-normal.woff"),
      font("outfit-latin-500-normal.woff"),
      font("outfit-latin-700-normal.woff"),
      font("ibm-plex-mono-latin-500-normal.woff"),
      readFile(path.join(assetDir, "mascot.png")),
    ]);
    return {
      fonts: [
        { name: "Big Shoulders Display", data: display, weight: 800 as const, style: "normal" as const },
        { name: "Outfit", data: sans500, weight: 500 as const, style: "normal" as const },
        { name: "Outfit", data: sans700, weight: 700 as const, style: "normal" as const },
        { name: "IBM Plex Mono", data: mono, weight: 500 as const, style: "normal" as const },
      ],
      mascot: `data:image/png;base64,${mascot.toString("base64")}`,
    };
  })();
  return assetsPromise;
}

export type Side = "Right" | "Far Left";

export interface OgCard {
  /** Small label in the header, e.g. "Saturday, Nov 14 · Evening". */
  edition: string;
  /** Kicker above the headline, e.g. "Top rising narrative". Omit to give the headline more room. */
  kicker?: string;
  /** Show a NEW chip before the side chip. */
  isNew?: boolean;
  headline: string;
  side?: Side;
  momentum?: number;
  /** Extra chip, e.g. a fact-check rating. */
  badge?: { label: string; tone: "danger" | "warn" | "accent" };
  /** Up to two short lines under the headline. */
  footer?: string[];
}

function clipChars(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.—–-]+$/, "")}…`;
}

/**
 * Largest headline size that fits the space between the chips and the footer
 * (about 160px tall, 1088px wide). Big Shoulders Display caps average ~0.41em.
 */
function headlineSize(text: string, room: number): number {
  for (const size of [92, 80, 70, 62, 56, 50]) {
    const perLine = Math.floor(1088 / (size * 0.41 * 1.08));
    const lines = Math.ceil(text.length / perLine);
    if (lines * size * 1.02 <= room) return size;
  }
  return 44;
}

function chip(label: string, background: string, color = C.black): Node {
  return h(
    "div",
    {
      display: "flex",
      alignItems: "center",
      padding: "8px 16px",
      background,
      color,
      border: `3px solid ${C.black}`,
      boxShadow: `5px 5px 0 ${C.accent}`,
      fontFamily: "Outfit",
      fontWeight: 700,
      fontSize: 26,
      letterSpacing: 1,
      textTransform: "uppercase",
      marginRight: 22,
      whiteSpace: "nowrap",
      flexShrink: 0,
    },
    label,
  );
}

function card(card: OgCard, mascot: string): Node {
  const headline = clipChars(card.headline, card.kicker ? 120 : 150);
  // Without a kicker the headline starts ~47px higher. Either way it must end above the
  // mascot (top edge at y=458) and the footer.
  const size = headlineSize(headline, card.kicker ? 160 : 215);
  const toneFill = { danger: C.danger, warn: C.warn, accent: C.accent };
  return h(
    "div",
    {
      width: OG_WIDTH,
      height: OG_HEIGHT,
      display: "flex",
      flexDirection: "column",
      position: "relative",
      background: C.bg,
      backgroundImage: `radial-gradient(circle at 92% 8%, #2a2d12 0%, ${C.bg} 45%)`,
      color: C.ink,
      fontFamily: "Outfit",
    },
    // accent rule along the top
    h("div", { position: "absolute", top: 0, left: 0, width: OG_WIDTH, height: 12, background: C.accent }),
    h(
      "div",
      { display: "flex", flexDirection: "column", position: "absolute", left: 56, top: 44, width: 1088 },
    // header: wordmark + edition
    h(
      "div",
      { display: "flex", alignItems: "center", justifyContent: "space-between", width: 1088 },
      h(
        "div",
        { display: "flex", alignItems: "center" },
        h(
          "div",
          {
            display: "flex",
            background: C.accent,
            color: C.black,
            fontFamily: "Big Shoulders Display",
            fontWeight: 800,
            fontSize: 54,
            lineHeight: 1,
            padding: "6px 14px 4px 14px",
            border: `3px solid ${C.ink}`,
          },
          "TDDR",
        ),
        h(
          "div",
          {
            display: "flex",
            fontFamily: "Big Shoulders Display",
            fontWeight: 800,
            fontSize: 54,
            lineHeight: 1,
            marginLeft: 16,
            letterSpacing: 2,
          },
          "RADAR",
        ),
      ),
      h(
        "div",
        {
          display: "flex",
          fontFamily: "IBM Plex Mono",
          fontWeight: 500,
          fontSize: 24,
          color: C.accent,
          textTransform: "uppercase",
        },
        card.edition,
      ),
    ),
    // kicker
    card.kicker &&
    h(
      "div",
      {
        display: "flex",
        marginTop: 40,
        fontFamily: "IBM Plex Mono",
        fontWeight: 500,
        fontSize: 24,
        color: C.faint,
        textTransform: "uppercase",
        letterSpacing: 1,
      },
      card.kicker,
    ),
    // chips: side, momentum, rating
    card.isNew || card.side || typeof card.momentum === "number" || card.badge
      ? h(
          "div",
          { display: "flex", alignItems: "center", marginTop: card.kicker ? 16 : 40 },
          card.isNew ? chip("New", "#ff4d8d") : null,
          card.side ? chip(card.side, card.side === "Right" ? C.right : C.left) : null,
          typeof card.momentum === "number" ? chip(`Momentum ${card.momentum}`, C.ink) : null,
          card.badge ? chip(clipChars(card.badge.label, 40), toneFill[card.badge.tone]) : null,
        )
      : null,
    // headline
    h(
      "div",
      {
        display: "flex",
        marginTop: 24,
        width: 1088,
        fontFamily: "Big Shoulders Display",
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.02,
        textTransform: "uppercase",
        color: C.ink,
      },
      headline,
    ),
    ),
    // footer, kept clear of the mascot in the bottom-right corner
    h(
      "div",
      {
        display: "flex",
        flexDirection: "column",
        position: "absolute",
        left: 56,
        bottom: 40,
        width: 900,
      },
      ...(card.footer ?? []).slice(0, 2).map((line) =>
        h(
          "div",
          {
            display: "flex",
            fontSize: 26,
            fontWeight: 500,
            color: C.muted,
            marginTop: 6,
          },
          clipChars(line, 64),
        ),
      ),
      h(
        "div",
        {
          display: "flex",
          marginTop: 14,
          fontFamily: "IBM Plex Mono",
          fontWeight: 500,
          fontSize: 22,
          color: C.accent,
        },
        "tddr-radar.vercel.app · Too Dumb Didn't Read",
      ),
    ),
    // mascot watermark, bottom-right
    {
      type: "img",
      props: {
        src: mascot,
        width: 130,
        height: 132,
        style: { position: "absolute", left: OG_WIDTH - 40 - 130, top: OG_HEIGHT - 40 - 132, width: 130, height: 132 },
      },
    },
  );
}

export async function renderOgPng(input: OgCard): Promise<Uint8Array> {
  const { fonts, mascot } = await loadAssets();
  const svg = await satori(card(input, mascot) as unknown as Parameters<typeof satori>[0], {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts,
  });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: OG_WIDTH } }).render().asPng();
  return new Uint8Array(png);
}

export function pngResponse(png: Uint8Array): Response {
  return new Response(png, {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
  });
}
