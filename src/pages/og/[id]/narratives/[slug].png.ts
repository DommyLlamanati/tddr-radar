import type { APIRoute, GetStaticPaths } from "astro";
import type { Narrative, Snapshot } from "../../../../data/schema";
import { allSnapshots } from "../../../../lib/snapshots";
import { narrativeCard } from "../../../../lib/og-cards";
import { pngResponse, renderOgPng } from "../../../../lib/og-image";

/** One preview image per narrative: /og/<snapshot-id>/narratives/<narrative-id>.png */
export const getStaticPaths = (async () => {
  const snapshots = await allSnapshots();
  return snapshots.flatMap((entry) =>
    entry.data.narratives.map((narrative) => ({
      params: { id: entry.data.id, slug: narrative.id },
      props: { snapshot: entry.data, narrative },
    })),
  );
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { snapshot, narrative } = props as { snapshot: Snapshot; narrative: Narrative };
  return pngResponse(await renderOgPng(narrativeCard(snapshot, narrative)));
};
