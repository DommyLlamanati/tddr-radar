import type { APIRoute, GetStaticPaths } from "astro";
import type { NarrativeHistory } from "../../../lib/history";
import { narrativeHistory } from "../../../lib/snapshots";
import { historyCard } from "../../../lib/og-cards";
import { pngResponse, renderOgPng } from "../../../lib/og-image";

/** One preview image per narrative history: /og/narratives/<slug>.png */
export const getStaticPaths = (async () => {
  const index = await narrativeHistory();
  return index.histories.map((history) => ({ params: { slug: history.slug }, props: { history } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { history } = props as { history: NarrativeHistory };
  return pngResponse(await renderOgPng(historyCard(history, await narrativeHistory())));
};
