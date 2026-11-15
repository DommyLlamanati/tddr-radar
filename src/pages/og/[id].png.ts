import type { APIRoute, GetStaticPaths } from "astro";
import type { Snapshot } from "../../data/schema";
import { allSnapshots } from "../../lib/snapshots";
import { snapshotCard } from "../../lib/og-cards";
import { pngResponse, renderOgPng } from "../../lib/og-image";

/** One preview image per snapshot: /og/<snapshot-id>.png */
export const getStaticPaths = (async () => {
  const snapshots = await allSnapshots();
  return snapshots.map((entry) => ({ params: { id: entry.data.id }, props: { snapshot: entry.data } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { snapshot } = props as { snapshot: Snapshot };
  return pngResponse(await renderOgPng(snapshotCard(snapshot)));
};
