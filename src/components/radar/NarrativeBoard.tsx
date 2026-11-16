import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import type { Narrative } from "@/data/schema";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmt } from "@/lib/format";
import { isNewNarrative, stripNewPrefix } from "@/lib/share";
import { cn } from "@/lib/utils";
import { MomentumBar, MomentumScore, NewBadge, SideBadge, Sparkline, TrendInline } from "./bits";

type SideFilter = "all" | "right" | "far-left";
type SortKey = "momentum" | "volume" | "accel";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "momentum", label: "Momentum" },
  { value: "volume", label: "24h posts" },
  { value: "accel", label: "Acceleration" },
];

export default function NarrativeBoard({
  narratives,
  narrativeBase,
}: {
  narratives: Narrative[];
  narrativeBase: string;
}) {
  const [side, setSide] = useState<SideFilter>("all");
  const [sort, setSort] = useState<SortKey>("momentum");
  const hydrated = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("side");
    const o = params.get("sort");
    if (s === "right" || s === "far-left" || s === "all") setSide(s);
    if (o === "volume" || o === "accel" || o === "momentum") setSort(o);
  }, []);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    const params = new URLSearchParams(window.location.search);
    side === "all" ? params.delete("side") : params.set("side", side);
    sort === "momentum" ? params.delete("sort") : params.set("sort", sort);
    const q = params.toString();
    window.history.replaceState(null, "", q ? `${window.location.pathname}?${q}` : window.location.pathname);
  }, [side, sort]);

  const byMomentum = useMemo(() => {
    const ranks = new Map<string, number>();
    [...narratives].sort((a, b) => b.momentum - a.momentum).forEach((n, i) => ranks.set(n.id, i + 1));
    return ranks;
  }, [narratives]);

  const right = narratives.filter((n) => n.side === "Right").length;
  const left = narratives.length - right;

  const rows = useMemo(() => {
    const list = narratives.filter((n) =>
      side === "right" ? n.side === "Right" : side === "far-left" ? n.side === "Far Left" : true,
    );
    return [...list].sort((a, b) =>
      sort === "volume" ? b.posts24h - a.posts24h : sort === "accel" ? b.accel - a.accel : b.momentum - a.momentum,
    );
  }, [narratives, side, sort]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={side} onValueChange={(v) => setSide(v as SideFilter)}>
          <TabsList aria-label="Filter by side" className="w-full sm:w-fit">
            <TabsTrigger value="all">
              All <span className="font-mono text-xs opacity-60">{narratives.length}</span>
            </TabsTrigger>
            <TabsTrigger value="right">
              <span className="size-1.5 rounded-full bg-side-right" aria-hidden="true" />
              Right <span className="font-mono text-xs opacity-60">{right}</span>
            </TabsTrigger>
            <TabsTrigger value="far-left">
              <span className="size-1.5 rounded-full bg-side-left" aria-hidden="true" />
              Far Left <span className="font-mono text-xs opacity-60">{left}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[0.7rem] uppercase tracking-wider text-muted-foreground">Sort</span>
            <TabsList aria-label="Sort narratives" className="h-9">
              {SORTS.map((s) => (
                <TabsTrigger key={s.value} value={s.value} className="px-2.5 text-xs sm:text-sm">
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          No narratives on this side in this snapshot.
        </p>
      ) : (
        <ol className="flex flex-col overflow-hidden rounded-xl border bg-card">
          {rows.map((n) => {
            const rank = byMomentum.get(n.id) ?? 0;
            const isNew = isNewNarrative(n);
            return (
              <li key={n.id} className="border-b last:border-b-0">
                <a
                  href={`${narrativeBase}/${n.id}`}
                  className="group grid grid-cols-[2rem_1fr_auto] items-center gap-x-3 gap-y-3 px-4 py-4 transition-colors hover:bg-muted/60 sm:grid-cols-[2.5rem_1fr_11rem_7.5rem_1.25rem] sm:gap-x-5 sm:px-5"
                >
                  <span className="self-start pt-0.5 font-display text-2xl font-extrabold leading-none text-muted-foreground/70 tabular-nums sm:self-center sm:text-3xl">
                    {rank}
                  </span>
                  <span className="min-w-0">
                    <span className="mb-1.5 flex flex-wrap items-center gap-1.5">
                      <SideBadge side={n.side} />
                      {isNew ? <NewBadge /> : null}
                      {n.trendingUS ? (
                        <span className="font-mono text-[0.7rem] uppercase tracking-wider text-primary">Trending on X</span>
                      ) : null}
                    </span>
                    <span className="block text-[0.98rem] font-semibold leading-snug text-foreground group-hover:text-primary sm:text-base">
                      {stripNewPrefix(n.title)}
                    </span>
                  </span>
                  <span className="col-start-3 row-start-1 flex flex-col items-end self-start sm:hidden">
                    <MomentumScore value={n.momentum} className="text-3xl" />
                    <span className="font-mono text-[0.6rem] uppercase tracking-wider text-muted-foreground">score</span>
                  </span>
                  <span className="col-span-2 col-start-2 flex flex-col gap-1.5 sm:col-span-1 sm:col-start-3 sm:row-start-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="hidden items-baseline gap-1 sm:flex">
                        <MomentumScore value={n.momentum} className="text-3xl" />
                        <span className="font-mono text-[0.65rem] uppercase text-muted-foreground">/100</span>
                      </span>
                      <span className="font-mono text-xs text-muted-foreground sm:hidden">{fmt(n.posts24h)} posts/24h</span>
                      <TrendInline accel={n.accel} />
                    </span>
                    <MomentumBar value={n.momentum} side={n.side} size="sm" />
                  </span>
                  <span className="hidden flex-col items-end gap-1 sm:col-start-4 sm:row-start-1 sm:flex">
                    <Sparkline points={n.daily} side={n.side} />
                    <span className="font-mono text-[0.7rem] text-muted-foreground">{fmt(n.posts24h)} / 24h</span>
                  </span>
                  <ChevronRight
                    className="hidden size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary sm:col-start-5 sm:row-start-1 sm:block"
                    aria-hidden="true"
                  />
                </a>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
