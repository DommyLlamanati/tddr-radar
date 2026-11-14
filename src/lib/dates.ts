/** Calendar day (`YYYY-MM-DD`) of a snapshot id. Evening snapshots add a `-pm` suffix. */
export function snapshotDay(id: string): string {
  return id.slice(0, 10);
}

export function isEveningSnapshot(id: string): boolean {
  return id.endsWith("-pm");
}

/** Short label such as "Nov 13" from a snapshot id. Parsed in UTC so the calendar day does not shift. */
export function shortSnapshotDate(id: string): string {
  const [year, month, day] = snapshotDay(id).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function previousCalendarDay(id: string): string {
  const [year, month, day] = snapshotDay(id).split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/**
 * Newest snapshot is Today (Tonight for an evening file). An earlier file from the same day is
 * This morning. The prior calendar day, right after those, is Last night.
 */
export function snapshotSwitchLabel(idsNewestFirst: string[], index: number): string {
  const id = idsNewestFirst[index];
  const short = shortSnapshotDate(id);
  const latestDay = snapshotDay(idsNewestFirst[0]);
  if (index === 0) return `${isEveningSnapshot(id) ? "Tonight" : "Today"} · ${short}`;
  if (snapshotDay(id) === latestDay) return `This morning · ${short}`;
  const newer = snapshotDay(idsNewestFirst[index - 1]);
  if (newer === latestDay && previousCalendarDay(latestDay) === snapshotDay(id)) return `Last night · ${short}`;
  return short;
}

export function narrativePath(snapshotId: string, narrativeId: string): string {
  return `/snapshots/${snapshotId}/narratives/${narrativeId}`;
}

export function disinfoPath(snapshotId: string): string {
  return `/snapshots/${snapshotId}/disinfo`;
}

export function dashboardPath(snapshotId: string, latestId: string): string {
  return snapshotId === latestId ? "/" : `/snapshots/${snapshotId}`;
}
