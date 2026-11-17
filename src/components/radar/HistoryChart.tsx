import type { Appearance, NarrativeHistory, SnapshotRef } from "@/lib/history";
import { snapshotShortLabel } from "@/lib/history";
import { SIDE_STYLE } from "./bits";

/**
 * Momentum across every snapshot from first sighting to now. Snapshots where the narrative was
 * not on the board show as hollow ticks on the baseline; a narrative that dropped off ends with a
 * dashed fall to the baseline at the next snapshot.
 */
export default function HistoryChart({
  history,
  snapshots,
  compact = false,
  narrow = false,
}: {
  history: NarrativeHistory;
  snapshots: SnapshotRef[];
  compact?: boolean;
  /** Phone-sized drawing so labels stay legible. */
  narrow?: boolean;
}) {
  const latestIndex = snapshots.length - 1;
  const start = history.first.index;
  const end = history.current ? latestIndex : Math.min(history.last.index + 1, latestIndex);
  const span = Math.max(end - start, 1);
  const width = compact ? 160 : narrow ? 360 : 760;
  const height = compact ? 40 : narrow ? 250 : 300;
  const pad = compact ? { top: 4, right: 4, bottom: 4, left: 4 } : narrow ? { top: 34, right: 16, bottom: 40, left: 30 } : { top: 34, right: 24, bottom: 44, left: 40 };
  const iw = width - pad.left - pad.right;
  const ih = height - pad.top - pad.bottom;
  const x = (i: number) => pad.left + (end === start ? iw / 2 : ((i - start) / span) * iw);
  // Full charts use the 0-100 momentum scale; compact sparklines zoom to the narrative's own range.
  const values = history.appearances.map((a) => a.momentum);
  const lo = compact ? Math.max(0, Math.min(...values) - 12) : 0;
  const hi = compact ? Math.min(100, Math.max(...values) + 4) : 100;
  const y = (v: number) => pad.top + ih - ((Math.max(v, lo) - lo) / Math.max(hi - lo, 1)) * ih;
  const stroke = SIDE_STYLE[history.side].stroke;
  const byIndex = new Map<number, Appearance>(history.appearances.map((a) => [a.index, a]));
  const apps = history.appearances;

  const solid: string[] = [];
  const dashed: string[] = [];
  apps.forEach((a, k) => {
    if (k === 0) return;
    const p = apps[k - 1];
    const seg = `M${x(p.index).toFixed(1)} ${y(p.momentum).toFixed(1)} L${x(a.index).toFixed(1)} ${y(a.momentum).toFixed(1)}`;
    (a.index - p.index === 1 ? solid : dashed).push(seg);
  });
  const droppedAt = !history.current && history.last.index < latestIndex ? history.last.index + 1 : null;
  if (droppedAt !== null) {
    dashed.push(
      `M${x(history.last.index).toFixed(1)} ${y(history.last.momentum).toFixed(1)} L${x(droppedAt).toFixed(1)} ${y(0).toFixed(1)}`,
    );
  }
  const area =
    apps.length > 1
      ? `M${x(apps[0].index)} ${y(0)} ` +
        apps.map((a) => `L${x(a.index).toFixed(1)} ${y(a.momentum).toFixed(1)}`).join(" ") +
        ` L${x(apps[apps.length - 1].index)} ${y(0)} Z`
      : "";
  const gradId = `hist-${history.slug}-${compact ? "c" : narrow ? "n" : "f"}`;
  const indices = Array.from({ length: end - start + 1 }, (_, k) => start + k);
  const labelEvery = Math.max(1, Math.ceil(indices.length / (narrow ? 3 : 7)));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={compact ? "h-10 w-40" : "h-auto w-full"}
      data-variant={narrow ? "narrow" : compact ? "compact" : "full"}
      role="img"
      aria-label={`Momentum by snapshot: ${apps.map((a) => `${snapshotShortLabel(a.snapshotId)} ${a.momentum}`).join(", ")}${droppedAt !== null ? `, then off the board from ${snapshotShortLabel(snapshots[droppedAt].id)}` : ""}`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.32" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {!compact
        ? [100, 75, 50, 25, 0].map((t) => (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--border)" strokeDasharray={t === 0 ? undefined : "2 4"} />
              <text x={pad.left - 8} y={y(t) + 4} textAnchor="end" className="fill-muted-foreground font-mono text-[11px]">
                {t}
              </text>
            </g>
          ))
        : null}
      {area ? <path d={area} fill={`url(#${gradId})`} /> : null}
      {solid.map((d) => (
        <path key={d} d={d} fill="none" stroke={stroke} strokeWidth={compact ? 1.75 : 3} strokeLinecap="round" />
      ))}
      {dashed.map((d) => (
        <path key={d} d={d} fill="none" stroke={stroke} strokeOpacity="0.6" strokeWidth={compact ? 1.5 : 2.5} strokeDasharray="5 5" strokeLinecap="round" />
      ))}
      {indices.map((i) =>
        byIndex.has(i) ? null : (
          <circle key={`gap-${i}`} cx={x(i)} cy={y(0)} r={compact ? 1.5 : 4} fill="var(--background)" stroke="var(--muted-foreground)" strokeWidth="1.5" />
        ),
      )}
      {apps.map((a) => {
        const isPeak = a === history.peak;
        return (
          <g key={a.snapshotId}>
            {isPeak && !compact ? <circle cx={x(a.index)} cy={y(a.momentum)} r="11" fill="none" stroke="var(--primary)" strokeWidth="2" /> : null}
            <circle
              cx={x(a.index)}
              cy={y(a.momentum)}
              r={compact ? (isPeak ? 2.75 : 1.75) : 5}
              fill={isPeak ? "var(--primary)" : stroke}
              stroke="var(--background)"
              strokeWidth={compact ? 0 : 2}
            >
              <title>{`${snapshotShortLabel(a.snapshotId)}: momentum ${a.momentum}`}</title>
            </circle>
            {!compact && (isPeak || a === apps[apps.length - 1] || a === apps[0]) ? (
              <text
                x={x(a.index)}
                y={isPeak ? y(a.momentum) - 18 : a === apps[0] && a !== apps[apps.length - 1] ? y(a.momentum) + 22 : y(a.momentum) - 12}
                textAnchor={a.index === start && end !== start ? "start" : a.index === end && end !== start ? "end" : "middle"}
                className={`font-mono text-[12px] font-medium ${isPeak ? "fill-primary" : "fill-foreground"}`}
              >
                {isPeak ? `Peak ${a.momentum}` : a === apps[0] ? `First seen ${a.momentum}` : `${a.momentum}`}
              </text>
            ) : null}
          </g>
        );
      })}
      {!compact && droppedAt !== null ? (
        <text x={x(droppedAt)} y={y(0) - 10} textAnchor="end" className="fill-muted-foreground font-mono text-[11px]">
          off the board
        </text>
      ) : null}
      {!compact
        ? indices.map((i, k) =>
            (k % labelEvery === 0 && end - i >= Math.ceil(labelEvery * 0.75)) || i === end ? (
              <text key={`lbl-${i}`} x={x(i)} y={height - 14} textAnchor={end === start ? "middle" : i === start ? "start" : i === end ? "end" : "middle"} className="fill-muted-foreground font-mono text-[11px]">
                {snapshotShortLabel(snapshots[i].id)}
              </text>
            ) : null,
          )
        : null}
    </svg>
  );
}
