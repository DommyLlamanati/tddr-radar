import { useMemo, useState } from "react";
import type { Side } from "../data/schema";

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

const OPTIONS: { value: SideFilter; label: string }[] = [
  { value: "all", label: "All sides" },
  { value: "right", label: "Right" },
  { value: "far-left", label: "Far Left" },
];

export default function DisinfoTracker({
  items,
  narrativeBase,
}: {
  items: DisinfoItem[];
  narrativeBase: string;
}) {
  const [side, setSide] = useState<SideFilter>("all");
  const counts = useMemo(() => {
    return {
      all: items.length,
      right: items.filter((item) => item.side === "Right").length,
      "far-left": items.filter((item) => item.side === "Far Left").length,
    };
  }, [items]);
  const visible = items.filter((item) => {
    if (side === "right") return item.side === "Right";
    if (side === "far-left") return item.side === "Far Left";
    return true;
  });

  return (
    <div className="disinfo">
      <div className="controls">
        <div>
          <p className="control-label" id="disinfo-side-label">
            Side
          </p>
          <div className="segmented" role="radiogroup" aria-labelledby="disinfo-side-label">
            {OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={side === option.value}
                onClick={() => setSide(option.value)}
              >
                {option.label}
                <span className="count">{counts[option.value]}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="showing" aria-live="polite">
        {visible.length} fact-checked claim{visible.length === 1 ? "" : "s"}
        {side === "all" ? " in this snapshot" : side === "right" ? " on the Right" : " on the Far Left"}
        .
      </p>
      {visible.length === 0 ? (
        <p className="empty">
          No fact-checker ratings were logged for{" "}
          {side === "far-left" ? "Far Left" : side === "right" ? "Right" : "these"} narratives in
          this snapshot. That is not a clean bill of health. It means this pull did not attach a
          matching rating.
        </p>
      ) : (
        <ol className="fact-list">
          {visible.map((item) => (
            <li key={`${item.narrativeId}-${item.claim}`} className="fact-card">
              <div className="badge-row">
                <span className={`badge side-${item.side === "Far Left" ? "left" : "right"}`}>
                  {item.side}
                </span>
                <span className="badge tone-danger">{item.rating}</span>
              </div>
              <h2 className="fact-claim">{item.claim}</h2>
              <p>{item.detail}</p>
              <p className="fact-meta">
                <a href={`${narrativeBase}/${item.narrativeId}`}>{item.narrativeTitle}</a>
                <span aria-hidden="true"> · </span>
                <a href={item.href} target="_blank" rel="noreferrer noopener">
                  {item.outlet}
                </a>
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
