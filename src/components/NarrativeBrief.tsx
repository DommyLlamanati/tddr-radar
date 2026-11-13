import type { ReactNode } from "react";
import type { Narrative } from "../data/schema";
import { accelMeta, fmt, outletsSentence } from "../lib/format";
import { ColumnChart, LineChart } from "./Charts";

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener">
      {children}
    </a>
  );
}

export function NarrativeBrief({
  narrative,
  trendsPulledAtLabel,
  dailyChartCaption,
  noFactCheckNote,
  headingLevel = 3,
  summaryClass = "summary",
}: {
  narrative: Narrative;
  trendsPulledAtLabel: string;
  dailyChartCaption: string;
  noFactCheckNote: string;
  headingLevel?: 2 | 3;
  summaryClass?: string;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const accel = accelMeta(narrative.accel);

  return (
    <div className="brief">
      <dl className="props">
        <div>
          <dt>Momentum score</dt>
          <dd>{narrative.momentum}</dd>
        </div>
        <div>
          <dt>Score parts</dt>
          <dd>
            volume {narrative.volumeIndex}, accel {narrative.accelIndex}, coverage{" "}
            {narrative.coverageIndex}
          </dd>
        </div>
        <div>
          <dt>X posts, last 24h</dt>
          <dd>{fmt(narrative.posts24h)}</dd>
        </div>
        <div>
          <dt>X posts, ~7 days</dt>
          <dd>{fmt(narrative.posts7d)}</dd>
        </div>
        <div>
          <dt>Acceleration</dt>
          <dd>
            {narrative.accel.toFixed(2)}× the prior daily average (
            {fmt(Math.round(narrative.priorDailyAvg))} posts/day)
            <span className={`badge tone-${accel.tone}`}>{accel.label}</span>
          </dd>
        </div>
        <div>
          <dt>Outlets counted</dt>
          <dd>{outletsSentence(narrative.outlets, narrative.trendingUS, trendsPulledAtLabel)}</dd>
        </div>
        <div>
          <dt>Sentiment</dt>
          <dd>{narrative.sentiment}</dd>
        </div>
      </dl>

      <p className={summaryClass}>{narrative.summary}</p>
      <p className="note">{narrative.sentimentNote}</p>

      {narrative.hourly && narrative.hourly.length > 0 ? (
        <LineChart points={narrative.hourly} note={narrative.hourlyNote} />
      ) : null}

      {narrative.daily.length > 0 ? (
        <ColumnChart points={narrative.daily} caption={dailyChartCaption} />
      ) : null}

      <section className="brief-section">
        <Heading>Talking points</Heading>
        <ol className="points">
          {narrative.talkingPoints.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ol>
        <p className="amplifiers">
          <strong>Who is amplifying it: </strong>
          {narrative.amplifiers}
        </p>
      </section>

      {narrative.factChecks.length > 0 ? (
        <section className="brief-section">
          <Heading>Disinformation and fact-checks</Heading>
          <div className="fact-stack">
            {narrative.factChecks.map((fact) => (
              <aside key={`${fact.rating}-${fact.claim}`} className="callout danger">
                <p className="callout-lead">
                  {fact.rating} — {fact.outlet}
                </p>
                <p>
                  Claim: {fact.claim} {fact.detail}{" "}
                  <ExternalLink href={fact.href}>Open the fact-check</ExternalLink>
                </p>
              </aside>
            ))}
          </div>
        </section>
      ) : (
        <p className="note">{noFactCheckNote}</p>
      )}

      <section className="brief-section">
        <Heading>Why it works</Heading>
        <p>{narrative.whyItWorks}</p>
        <p>
          <strong>Who it resonates with: </strong>
          {narrative.audience}
        </p>
      </section>

      <aside className="counter">
        <p className="callout-lead">TDDR counter-angle</p>
        <p>{narrative.counter}</p>
      </aside>

      <section className="brief-section">
        <Heading>Sources</Heading>
        <ul className="source-list">
          {narrative.sources.map((source) => (
            <li key={source.href}>
              <ExternalLink href={source.href}>{source.title}</ExternalLink>
              {source.site || source.date ? (
                <p className="source-meta">
                  {[source.site, source.date].filter(Boolean).join(" · ")}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <p className="query-label">X query used for counts</p>
      <pre className="query">{narrative.query}</pre>
    </div>
  );
}
