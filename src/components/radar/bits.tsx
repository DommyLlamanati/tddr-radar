import { ArrowDownRight, ArrowRight, ArrowUpRight, Flame } from "lucide-react";
import type { Narrative, SeriesPoint } from "@/data/schema";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Side = Narrative["side"];

/** One fixed color per side, used for badges, bars, and sparklines everywhere. */
export const SIDE_STYLE: Record<Side, { variant: "right" | "left"; bar: string; text: string; stroke: string; dot: string }> = {
  Right: { variant: "right", bar: "bg-side-right", text: "text-side-right", stroke: "var(--right)", dot: "bg-side-right" },
  "Far Left": { variant: "left", bar: "bg-side-left", text: "text-side-left", stroke: "var(--left)", dot: "bg-side-left" },
};

export function SideBadge({ side, className }: { side: Side; className?: string }) {
  const style = SIDE_STYLE[side];
  return (
    <Badge variant={style.variant} className={className}>
      <span className={cn("size-1.5 rounded-full", style.dot)} aria-hidden="true" />
      {side}
    </Badge>
  );
}

export function NewBadge({ className }: { className?: string }) {
  return (
    <Badge variant="new" className={className}>
      New
    </Badge>
  );
}

/** Acceleration vs the prior daily average, as an arrow plus multiple. */
export function trendMeta(accel: number) {
  if (accel >= 3) return { label: "Accelerating hard", variant: "danger" as const, Icon: Flame, tone: "text-danger" };
  if (accel >= 1.2) return { label: "Rising", variant: "warning" as const, Icon: ArrowUpRight, tone: "text-warn" };
  if (accel >= 0.8) return { label: "Holding", variant: "accent" as const, Icon: ArrowRight, tone: "text-primary" };
  return { label: "Cooling", variant: "outline" as const, Icon: ArrowDownRight, tone: "text-muted-foreground" };
}

/** "3.6×", or a whole number once the multiple is large. */
export function formatMultiple(accel: number): string {
  return `${accel >= 10 ? Math.round(accel).toLocaleString("en-US") : accel.toFixed(1)}×`;
}

export function TrendBadge({ accel, showLabel = true }: { accel: number; showLabel?: boolean }) {
  const meta = trendMeta(accel);
  return (
    <Badge variant={meta.variant} title={`${accel.toFixed(2)}× the prior daily average`}>
      <meta.Icon aria-hidden="true" />
      {formatMultiple(accel)}{showLabel ? ` · ${meta.label}` : ""}
    </Badge>
  );
}

export function TrendInline({ accel, className }: { accel: number; className?: string }) {
  const meta = trendMeta(accel);
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono text-xs font-medium", meta.tone, className)}>
      <meta.Icon className="size-3.5" aria-hidden="true" />
      {formatMultiple(accel)}
      <span className="sr-only"> the prior daily average, {meta.label.toLowerCase()}</span>
    </span>
  );
}

/** Score out of 100 as a side-colored bar with quarter ticks. */
export function MomentumBar({
  value,
  side,
  className,
  size = "md",
}: {
  value: number;
  side: Side;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const height = size === "lg" ? "h-3" : size === "sm" ? "h-1.5" : "h-2";
  return (
    <div className={cn("relative", className)}>
      <Progress
        value={value}
        aria-label={`Momentum ${value} of 100`}
        className={height}
        indicatorClassName={SIDE_STYLE[side].bar}
      />
      <div className="pointer-events-none absolute inset-0 flex justify-between px-[25%]" aria-hidden="true">
        <span className="w-px bg-background/70" />
        <span className="w-px bg-background/70" />
        <span className="w-px bg-background/70" />
      </div>
    </div>
  );
}

export function MomentumScore({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("font-display font-extrabold leading-none tabular-nums", className)}>
      {Math.round(value).toLocaleString("en-US")}
    </span>
  );
}

/** Tiny daily-volume line. Partial days (labels ending in *) still plot. */
export function Sparkline({
  points,
  side,
  className,
  width = 112,
  height = 32,
}: {
  points: SeriesPoint[];
  side: Side;
  className?: string;
  width?: number;
  height?: number;
}) {
  if (points.length < 2) return null;
  const max = Math.max(...points.map((p) => p.value), 1);
  const pad = 3;
  const x = (i: number) => pad + (i / (points.length - 1)) * (width - pad * 2);
  const y = (v: number) => pad + (1 - v / max) * (height - pad * 2);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(1)} ${height} L${x(0).toFixed(1)} ${height} Z`;
  const last = points[points.length - 1];
  const stroke = SIDE_STYLE[side].stroke;
  const id = `spark-${side.replace(/\s/g, "")}`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("overflow-visible", className)}
      role="img"
      aria-label={`Daily posts: ${points.map((p) => `${p.label} ${p.value}`).join(", ")}`}
    >
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.35" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(points.length - 1)} cy={y(last.value)} r="2.75" fill={stroke} />
    </svg>
  );
}
