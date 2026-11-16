import type { Narrative, SeriesPoint } from "@/data/schema";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmt } from "@/lib/format";
import { SIDE_STYLE } from "./bits";

function HourlyChart({ points, side }: { points: SeriesPoint[]; side: Narrative["side"] }) {
  const width = 720;
  const height = 240;
  const pad = { top: 16, right: 12, bottom: 30, left: 44 };
  const max = Math.max(...points.map((p) => p.value), 1) * 1.12;
  const iw = width - pad.left - pad.right;
  const ih = height - pad.top - pad.bottom;
  const x = (i: number) => pad.left + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
  const y = (v: number) => pad.top + ih - (v / max) * ih;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)} ${pad.top + ih} L${x(0).toFixed(1)} ${pad.top + ih} Z`;
  const stroke = SIDE_STYLE[side].stroke;
  const every = Math.max(1, Math.ceil(points.length / 8));
  const peak = points.reduce((best, p, i) => (p.value > points[best].value ? i : best), 0);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Hourly X post counts">
      <defs>
        <linearGradient id="hourly-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.4" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[1, 0.5, 0].map((t) => (
        <g key={t}>
          <line x1={pad.left} x2={width - pad.right} y1={y(max * t)} y2={y(max * t)} stroke="var(--border)" />
          <text x={pad.left - 8} y={y(max * t) + 4} textAnchor="end" className="fill-muted-foreground font-mono text-[11px]">
            {fmt(Math.round(max * t))}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#hourly-fill)" />
      <path d={line} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={x(peak)} cy={y(points[peak].value)} r="5" fill={stroke} stroke="var(--background)" strokeWidth="2" />
      <text x={x(peak)} y={y(points[peak].value) - 10} textAnchor="middle" className="fill-foreground font-mono text-[12px] font-medium">
        peak {fmt(points[peak].value)}
      </text>
      {points.map((p, i) =>
        i % every === 0 ? (
          <text key={p.label} x={x(i)} y={height - 8} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]">
            {p.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

function DailyChart({ points, side }: { points: SeriesPoint[]; side: Narrative["side"] }) {
  const max = Math.max(...points.map((p) => p.value), 1);
  return (
    <div className="grid h-56 items-end gap-1.5 sm:gap-3" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}>
      {points.map((p) => {
        const partial = p.label.includes("*");
        return (
          <div key={p.label} className="flex h-full flex-col items-center justify-end gap-1.5">
            <span className="font-mono text-[0.65rem] text-muted-foreground tabular-nums sm:text-xs">{fmt(p.value)}</span>
            <div
              className={`w-full rounded-t-md ${SIDE_STYLE[side].bar} ${partial ? "opacity-50" : ""}`}
              style={{ height: `${Math.max(2, (p.value / max) * 100)}%` }}
              title={`${p.label}: ${fmt(p.value)} posts`}
            />
            <span className="whitespace-nowrap font-mono text-[0.6rem] text-muted-foreground sm:text-[0.7rem]">{p.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function StoryCharts({
  narrative,
  dailyCaption,
}: {
  narrative: Narrative;
  dailyCaption: string;
}) {
  const hasHourly = Boolean(narrative.hourly && narrative.hourly.length > 1);
  const hasDaily = narrative.daily.length > 0;
  if (!hasHourly && !hasDaily) return null;
  const initial = hasHourly ? "hourly" : "daily";
  return (
    <Tabs defaultValue={initial}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-extrabold uppercase tracking-wide">Volume on X</h2>
        <TabsList aria-label="Chart range">
          {hasHourly ? <TabsTrigger value="hourly">Hourly</TabsTrigger> : null}
          {hasDaily ? <TabsTrigger value="daily">Daily</TabsTrigger> : null}
        </TabsList>
      </div>
      {hasHourly ? (
        <TabsContent value="hourly" className="flex flex-col gap-3">
          <HourlyChart points={narrative.hourly!} side={narrative.side} />
          {narrative.hourlyNote ? <p className="text-xs leading-relaxed text-muted-foreground">{narrative.hourlyNote}</p> : null}
        </TabsContent>
      ) : null}
      {hasDaily ? (
        <TabsContent value="daily" className="flex flex-col gap-3">
          <DailyChart points={narrative.daily} side={narrative.side} />
          <p className="text-xs leading-relaxed text-muted-foreground">{dailyCaption}</p>
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
