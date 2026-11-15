import type { APIRoute } from "astro";
import { latestSnapshot } from "../../lib/snapshots";
import { defaultCard } from "../../lib/og-cards";
import { pngResponse, renderOgPng } from "../../lib/og-image";

export const GET: APIRoute = async () => {
  const latest = (await latestSnapshot()).data;
  return pngResponse(await renderOgPng(defaultCard(latest)));
};
