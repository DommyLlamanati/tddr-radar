import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { Side } from "@/data/schema";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { stripNewPrefix } from "@/lib/share";
import { SideBadge, ratingVariant } from "./bits";

export type DisinfoItem = {
  narrativeId: string;
  narrativeTitle: string;
  side: Side;
  claim: string;
  rating: string;
  detail: string;
  href: string;
  outlet: string;
};

type SideFilter = "all" | "right" | "far-left";

export default function DisinfoBoard({ items, narrativeBase }: { items: DisinfoItem[]; narrativeBase: string }) {
  const [side, setSide] = useState<SideFilter>("all");
  const counts = useMemo(
    () => ({
      all: items.length,
      right: items.filter((i) => i.side === "Right").length,
      "far-left": items.filter((i) => i.side === "Far Left").length,
    }),
    [items],
  );
  const visible = items.filter((i) => (side === "right" ? i.side === "Right" : side === "far-left" ? i.side === "Far Left" : true));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={side} onValueChange={(v) => setSide(v as SideFilter)}>
          <TabsList aria-label="Filter by side" className="w-full sm:w-fit">
            <TabsTrigger value="all">
              All <span className="font-mono text-xs opacity-60">{counts.all}</span>
            </TabsTrigger>
            <TabsTrigger value="right">
              <span className="size-1.5 rounded-full bg-side-right" aria-hidden="true" />
              Right <span className="font-mono text-xs opacity-60">{counts.right}</span>
            </TabsTrigger>
            <TabsTrigger value="far-left">
              <span className="size-1.5 rounded-full bg-side-left" aria-hidden="true" />
              Far Left <span className="font-mono text-xs opacity-60">{counts["far-left"]}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <p className="font-mono text-xs text-muted-foreground" aria-live="polite">
          {visible.length} fact-checked claim{visible.length === 1 ? "" : "s"}
          {side === "all" ? " in this snapshot" : side === "right" ? " on the Right" : " on the Far Left"}
        </p>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          No fact-checker ratings were logged for {side === "far-left" ? "Far Left" : side === "right" ? "Right" : "these"} narratives in
          this snapshot. That is not a clean bill of health. It means this pull did not attach a matching rating.
        </p>
      ) : (
        <ol className="grid gap-3 md:grid-cols-2">
          {visible.map((item) => (
            <li key={`${item.narrativeId}-${item.claim}`} className="flex min-w-0">
              <Card className="w-full min-w-0 gap-3 py-4">
                <CardHeader className="gap-2.5 px-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant={ratingVariant(item.rating)} className="max-w-full whitespace-normal text-left">{item.rating}</Badge>
                    <SideBadge side={item.side} />
                  </div>
                  <h2 className="text-base font-semibold leading-snug">“{item.claim.replace(/^["“']+|["”']+$/g, "")}”</h2>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3 px-4 text-sm leading-relaxed text-muted-foreground">
                  <p>{item.detail}</p>
                  <div className="mt-auto flex flex-col gap-1.5 border-t pt-3 text-xs">
                    <a href={`${narrativeBase}/${item.narrativeId}`} className="font-medium text-foreground hover:text-primary">
                      Narrative: {stripNewPrefix(item.narrativeTitle)}
                    </a>
                    <a href={item.href} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                      Rated by {item.outlet} <ExternalLink className="size-3.5" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
