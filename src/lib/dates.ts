/** Short label such as "Nov 13" from a `YYYY-MM-DD` snapshot id. Parsed in UTC so the calendar day does not shift. */
export function shortSnapshotDate(id: string): string {
  const [year, month, day] = id.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function previousCalendarDay(id: string): string {
  const [year, month, day] = id.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/** Newest snapshot is Today. The prior calendar day, when present, is Last night. */
export function snapshotSwitchLabel(idsNewestFirst: string[], index: number): string {
  const id = idsNewestFirst[index];
  const short = shortSnapshotDate(id);
  if (index === 0) return `Today · ${short}`;
  if (index === 1 && previousCalendarDay(idsNewestFirst[0]) === id) return `Last night · ${short}`;
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
