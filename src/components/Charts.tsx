import type { Narrative, SeriesPoint } from "../data/schema";
import { fmt, sideClass } from "../lib/format";

function sortedByMomentum(narratives: Narrative[]): Narrative[] {
  return [...narratives].sort((a, b) => b.momentum - a.momentum);
}

function sortedByVolume(narratives: Narrative[]): Narrative[] {
  return [...narratives].sort((a, b) => b.posts24h - a.posts24h);
}

export function MomentumChart({
  narratives,
  narrativeBase,
}: {
  narratives: Narrative[];
  narrativeBase: string;
}) {
  const rows = sortedByMomentum(narratives);
  return (
    <figure className="chart-block">
      <ul className="legend">
        <li>
          <i className="swatch right" aria-hidden="true" /> Right
        </li>
        <li>
          <i className="swatch left" aria-hidden="true" /> Far Left
        </li>
      </ul>
      <ol className="bar-chart">
        {rows.map((narrative) => (
          <li key={narrative.id}>
            <a className="bar-row" href={`${narrativeBase}/${narrative.id}`}>
              <span className="bar-copy">
                <span className={`bar-side ${sideClass(narrative.side)}`}>{narrative.side}</span>
                <span className="bar-title">{narrative.title}</span>
              </span>
              <span className="bar-score">{narrative.momentum}</span>
              <span className="bar-track" aria-hidden="true">
                <span
                  className={`bar-fill ${sideClass(narrative.side)}`}
                  style={{ width: `${narrative.momentum}%` }}
                />
              </span>
              <span className="bar-meta">{fmt(narrative.posts24h)} posts in 24h</span>
            </a>
          </li>
        ))}
      </ol>
    </figure>
  );
}

export function VolumeChart({
  narratives,
  narrativeBase,
}: {
  narratives: Narrative[];
  narrativeBase: string;
}) {
  const rows = sortedByVolume(narratives);
  const max = Math.max(...rows.map((narrative) => narrative.posts24h), 1);
  return (
    <figure className="chart-block">
      <ol className="bar-chart">
        {rows.map((narrative) => (
          <li key={narrative.id}>
            <a className="bar-row" href={`${narrativeBase}/${narrative.id}`}>
              <span className="bar-copy">
                <span className={`bar-side ${sideClass(narrative.side)}`}>{narrative.side}</span>
                <span className="bar-title">{narrative.title}</span>
              </span>
              <span className="bar-score volume">{fmt(narrative.posts24h)}</span>
              <span className="bar-track" aria-hidden="true">
                <span
                  className={`bar-fill ${sideClass(narrative.side)}`}
                  style={{ width: `${(narrative.posts24h / max) * 100}%` }}
                />
              </span>
              <span className="bar-meta">Last 24 hours of X query matches</span>
            </a>
          </li>
        ))}
      </ol>
    </figure>
  );
}

export function ColumnChart({
  points,
  caption,
}: {
  points: SeriesPoint[];
  caption?: string;
}) {
  const max = Math.max(...points.map((point) => point.value), 1);
  return (
    <figure className="column-chart">
      {caption ? <figcaption>{caption}</figcaption> : null}
      <div
        className="columns"
        style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }}
      >
        {points.map((point) => (
          <div key={point.label} className="column">
            <span className="column-value">{fmt(point.value)}</span>
            <div className="column-track" aria-hidden="true">
              <span style={{ height: `${(point.value / max) * 100}%` }} />
            </div>
            <span className={`column-label${point.label.includes("*") ? " partial" : ""}`}>
              {point.label}
            </span>
          </div>
        ))}
      </div>
    </figure>
  );
}

export function LineChart({ points, note }: { points: SeriesPoint[]; note?: string }) {
  const width = 720;
  const height = 260;
  const pad = { top: 18, right: 8, bottom: 36, left: 52 };
  const max = Math.max(...points.map((point) => point.value), 1);
  const ceiling = max * 1.12;
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const xAt = (index: number) =>
    pad.left + (points.length === 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
  const yAt = (value: number) => pad.top + innerH - (value / ceiling) * innerH;
  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${xAt(index).toFixed(1)} ${yAt(point.value).toFixed(1)}`)
    .join(" ");
  const area = `${line} L ${xAt(points.length - 1).toFixed(1)} ${(pad.top + innerH).toFixed(1)} L ${xAt(0).toFixed(1)} ${(pad.top + innerH).toFixed(1)} Z`;
  const ticks = [ceiling, ceiling / 2, 0];

  return (
    <figure className="line-chart">
      {note ? <figcaption>{note}</figcaption> : null}
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={note ?? "Hourly X post counts"}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={yAt(tick)}
              y2={yAt(tick)}
              className="grid-line"
            />
            <text x={pad.left - 8} y={yAt(tick) + 4} className="axis-label" textAnchor="end">
              {fmt(Math.round(tick))}
            </text>
          </g>
        ))}
        <path d={area} className="area" />
        <path d={line} className="stroke" />
        {points.map((point, index) => (
          <g key={point.label}>
            <circle cx={xAt(index)} cy={yAt(point.value)} r="3.5" className="dot">
              <title>{`${point.label}: ${fmt(point.value)} posts`}</title>
            </circle>
            <text x={xAt(index)} y={height - 10} className="axis-label" textAnchor="middle">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      <table className="sr-only">
        <caption>{note ?? "Hourly counts"}</caption>
        <tbody>
          {points.map((point) => (
            <tr key={point.label}>
              <th scope="row">{point.label}</th>
              <td>{fmt(point.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
