import { getCollection } from "astro:content";

export async function allSnapshots() {
  const snapshots = await getCollection("snapshots");
  return snapshots.sort(
    (a, b) => Date.parse(b.data.updatedAt) - Date.parse(a.data.updatedAt),
  );
}

export async function latestSnapshot() {
  const snapshots = await allSnapshots();
  const latest = snapshots[0];
  if (!latest) {
    throw new Error(
      "No snapshots found. Add a JSON file under src/data/snapshots/ and rebuild.",
    );
  }
  return latest;
}

export async function snapshotById(id: string) {
  const snapshots = await allSnapshots();
  const found = snapshots.find((entry) => entry.data.id === id);
  if (!found) {
    throw new Error(`No snapshot ${id}.`);
  }
  return found;
}
