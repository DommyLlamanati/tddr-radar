import { useEffect, useMemo, useRef, useState } from "react";
import type { Narrative } from "../data/schema";
import { accelMeta, countSides, fmt, sideClass } from "../lib/format";
import { NarrativeBrief } from "./NarrativeBrief";

type SideFilter = "all" | "right" | "far-left";
type SortKey = "momentum" | "volume" | "accel";

const SIDE_OPTIONS: { value: SideFilter; label: string }[] = [
  { value: "all", label: "All sides" },
  { value: "right", label: "Right" },
  { value: "far-left", label: "Far Left" },
];

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "momentum", label: "Momentum score" },
  { value: "volume", label: "Last 24 hours of X posts" },
  { value: "accel", label: "Acceleration vs prior week" },
];

function isSide(value: string | null): value is SideFilter {
  return value === "all" || value === "right" || value === "far-left";
}

function isSort(value: string | null): value is SortKey {
  return value === "momentum" || value === "volume" || value === "accel";
}

export default function NarrativeFeed({
  narratives,
  feedCaption,
  trendsPulledAtLabel,
  dailyChartCaption,
  noFactCheckNote,
  narrativeBase,
}: {
  narratives: Narrative[];
  feedCaption: string;
  trendsPulledAtLabel: string;
  dailyChartCaption: string;
  noFactCheckNote: string;
  narrativeBase: string;
}) {
  const [side, setSide] = useState<SideFilter>("all");
  const [sort, setSort] = useState<SortKey>("momentum");
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const narrative of narratives) {
      if (narrative.defaultOpen) initial[narrative.id] = true;
    }
    return initial;
  });
  const hydrated = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sideParam = params.get("side");
    const sortParam = params.get("sort");
    if (isSide(sideParam)) setSide(sideParam);
    if (isSort(sortParam)) setSort(sortParam);
  }, []);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (side === "all") params.delete("side");
    else params.set("side", side);
    if (sort === "momentum") params.delete("sort");
    else params.set("sort", sort);
    const query = params.toString();
    const next = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(null, "", next);
  }, [side, sort]);

  const counts = countSides(narratives);
  const countFor = (value: SideFilter) => {
    if (value === "right") return counts.right;
    if (value === "far-left") return counts.left;
    return narratives.length;
  };

  const visible = useMemo(() => {
    const filtered = narratives.filter((narrative) => {
      if (side === "right") return narrative.side === "Right";
      if (side === "far-left") return narrative.side === "Far Left";
      return true;
    });
    const copy = [...filtered];
    copy.sort((a, b) => {
      if (sort === "volume") return b.posts24h - a.posts24h;
      if (sort === "accel") return b.accel - a.accel;
      return b.momentum - a.momentum;
    });
    return copy;
  }, [narratives, side, sort]);

  return (
    <section id="feed" className="feed" aria-labelledby="feed-heading">
      <div className="section-head">
        <p className="eyebrow">Feed</p>
        <h2 id="feed-heading">Rising narratives</h2>
        <p className="section-dek">{feedCaption}</p>
      </div>

      <div className="controls">
        <div>
          <p className="control-label" id="side-filter-label">
            Side
          </p>
          <div className="segmented" role="radiogroup" aria-labelledby="side-filter-label">
            {SIDE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={side === option.value}
                onClick={() => setSide(option.value)}
              >
                {option.label}
                <span className="count">{countFor(option.value)}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="control-label" id="sort-label">
            Sort by
          </p>
          <div className="segmented" role="radiogroup" aria-labelledby="sort-label">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={sort === option.value}
                onClick={() => setSort(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="showing" aria-live="polite">
        Showing {visible.length} narrative{visible.length === 1 ? "" : "s"}. Open a card for
        sentiment, talking points, fact-checks, the breakdown, and a TDDR counter-angle.
      </p>

      {visible.length === 0 ? (
        <p className="empty">No narratives on this side in the current snapshot.</p>
      ) : (
        <div className="card-list">
          {visible.map((narrative) => {
            const expanded = Boolean(open[narrative.id]);
            const accel = accelMeta(narrative.accel);
            const panelId = `${narrative.id}-panel`;
            return (
              <article
                key={narrative.id}
                id={narrative.id}
                className={`narrative-card ${sideClass(narrative.side)}${expanded ? " open" : ""}`}
              >
                <h3 className="card-heading">
                  <button
                    type="button"
                    className="card-toggle"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    aria-label={`${expanded ? "Collapse" : "Expand"} ${narrative.title}`}
                    onClick={() =>
                      setOpen((current) => ({ ...current, [narrative.id]: !current[narrative.id] }))
                    }
                  >
                    <span className="card-top">
                      <span>
                        <span className="badge-row">
                          <span className={`badge side-${sideClass(narrative.side)}`}>
                            {narrative.side}
                          </span>
                          <span className="badge tone-neutral">Score {narrative.momentum}</span>
                          <span className={`badge tone-${accel.tone}`}>{accel.label}</span>
                        </span>
                        <span className="card-title">{narrative.title}</span>
                        <span className="card-caption">
                          {narrative.side} · momentum {narrative.momentum} · {fmt(narrative.posts24h)}{" "}
                          X posts in the last 24 hours
                        </span>
                      </span>
                      <span className="card-score">
                        <span className="card-score-num">{narrative.momentum}</span>
                        <span className="card-score-label">Momentum</span>
                      </span>
                    </span>
                    <span className="chevron" aria-hidden="true" />
                  </button>
                </h3>
                <div id={panelId} className="card-panel" hidden={!expanded}>
                  {expanded ? (
                    <>
                      <NarrativeBrief
                        narrative={narrative}
                        trendsPulledAtLabel={trendsPulledAtLabel}
                        dailyChartCaption={dailyChartCaption}
                        noFactCheckNote={noFactCheckNote}
                        headingLevel={3}
                      />
                      <p className="full-brief">
                        <a href={`${narrativeBase}/${narrative.id}`}>Open the full brief</a>
                      </p>
                    </>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
