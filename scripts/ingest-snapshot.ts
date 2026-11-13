/**
 * Snapshot ingestion hook for TDDR Narrative Tracker.
 *
 * This script validates snapshot JSON and installs it into `src/data/snapshots/`.
 * It does not call the X API, news sites, fact-checkers, or an LLM, and it does
 * not read API keys.
 *
 * A later daily job should:
 *   1. collectSignals()   — X recent-search counts, the U.S. trends list,
 *                           news pages, and fact-check outlets.
 *   2. clusterNarratives() — an LLM groups posts into narratives and drafts
 *                           sentiment, talking points, why it works, audience,
 *                           and a TDDR counter-angle, each tied to sources.
 *   3. scoreMomentum()    — fill the volume, acceleration, and coverage indices
 *                           using the formula in the README. Do not recompute a
 *                           snapshot that has already been published.
 *   4. Write JSON that matches `src/data/schema.ts`, then run:
 *        npm run ingest -- --input ./draft.json
 *   5. Commit the new file. The dashboard picks up the latest `updatedAt`
 *      on the next build. No page code has to change.
 *
 * Suggested environment variables for that future job (unset and unused here):
 *   X_BEARER_TOKEN
 *   NARRATIVE_LLM_API_KEY
 *   NARRATIVE_LLM_BASE_URL
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { snapshotSchema, type Snapshot } from "../src/data/schema.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const snapshotDir = path.join(root, "src/data/snapshots");

export async function collectSignals(): Promise<never> {
  throw new Error(
    "collectSignals() is not implemented. No X, news, or fact-check clients are wired up, and no API keys are read.",
  );
}

export async function clusterNarratives(): Promise<never> {
  throw new Error(
    "clusterNarratives() is not implemented. The LLM clustering step is a future job. No model key is configured.",
  );
}

export function scoreMomentum(): never {
  throw new Error(
    "scoreMomentum() is not implemented. Score new snapshots in the job that writes them, using the published formula. This app does not recompute stored indices.",
  );
}

function printHelp(): void {
  console.log(`TDDR snapshot ingestion

Usage:
  npm run check:data
  npm run ingest -- --input <draft.json> [--force]
  npm run ingest -- --live

--check   Validate every file in src/data/snapshots (also the default of check:data).
--input   Validate a draft snapshot and write src/data/snapshots/<id>.json
--force   Overwrite an existing snapshot file.
--live    Show why live collection is not available. Exits 1. Does not call a network.

The Nov 11, 2026 snapshot is pinned: narrative counts, the Hegseth 24-hour total,
and a handful of source strings must match the published research. Later dates
are schema-checked only.

Pipeline (not run by this script): collectSignals → clusterNarratives → scoreMomentum → write JSON → ingest.
`);
}

async function readSnapshot(file: string): Promise<Snapshot> {
  let json: unknown;
  try {
    json = JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${file} is not valid JSON: ${message}`);
  }
  const parsed = snapshotSchema.safeParse(json);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`${file} failed the snapshot schema:\n${details}`);
  }
  const base = path.basename(file, ".json");
  if (parsed.data.id !== base) {
    throw new Error(`${file} id "${parsed.data.id}" must match the filename "${base}".`);
  }
  pinPublishedSnapshot(parsed.data);
  return parsed.data;
}

function pinPublishedSnapshot(data: Snapshot): void {
  if (data.id !== "2026-11-11") return;
  const errors: string[] = [];
  const facts = data.narratives.reduce((total, narrative) => total + narrative.factChecks.length, 0);
  if (data.narratives.length !== 10) errors.push(`expected 10 narratives, found ${data.narratives.length}`);
  if (facts !== 8) errors.push(`expected 8 fact-checks, found ${facts}`);
  if (data.updatedLabel !== "Wednesday, Nov 11, 2026, 5:58 AM ET") {
    errors.push("updatedLabel does not match the published snapshot");
  }
  if (data.sourceList.length !== 10) errors.push("expected 10 entries in the source list");
  if (data.disinfo.links.length !== 3) errors.push("expected 3 disinformation links");
  const hegseth = data.narratives.find((narrative) => narrative.id === "hegseth-11");
  if (!hegseth || hegseth.posts24h !== 51519 || hegseth.momentum !== 100 || hegseth.posts7d !== 51488) {
    errors.push("Hegseth momentum or post counts drifted");
  }
  const jordan = data.narratives.find((narrative) => narrative.id === "jordan");
  if (!jordan || jordan.momentum !== 87 || jordan.posts24h !== 29680) {
    errors.push("Jordan momentum or post counts drifted");
  }
  const carville = data.narratives.find((narrative) => narrative.id === "carville");
  const subpoena = "‘If it moves, subpoena it’ is the real first-100-days plan.";
  if (!carville?.talkingPoints.includes(subpoena)) {
    errors.push("Carville talking point drifted");
  }
  const fraud = data.narratives.find((narrative) => narrative.id === "fraud");
  const paxton = fraud?.factChecks.find(
    (fact) => fact.href === "https://factcheck.afp.com/doc.afp.com.D6FP263",
  );
  if (!paxton || paxton.rating !== "False / fabricated") {
    errors.push("Paxton fact-check drifted");
  }
  if (hegseth && !hegseth.amplifiers.includes("Sydney Kamlager-Dove")) {
    errors.push("Hegseth amplifiers drifted");
  }
  if (errors.length > 0) {
    throw new Error(`Published snapshot ${data.id} failed pin checks:\n- ${errors.join("\n- ")}`);
  }
}

async function checkAll(): Promise<void> {
  const files = (await readdir(snapshotDir))
    .filter((name) => name.endsWith(".json"))
    .sort();
  if (files.length === 0) throw new Error(`No snapshot JSON files in ${snapshotDir}`);
  for (const name of files) {
    const data = await readSnapshot(path.join(snapshotDir, name));
    const facts = data.narratives.reduce((total, narrative) => total + narrative.factChecks.length, 0);
    console.log(
      `${data.id}  ${data.updatedLabel}  ${data.narratives.length} narratives  ${facts} fact-checks`,
    );
  }
}

async function install(inputPath: string, force: boolean): Promise<void> {
  const absolute = path.resolve(inputPath);
  const data = await readSnapshot(absolute);
  const destination = path.join(snapshotDir, `${data.id}.json`);
  const exists = await readFile(destination, "utf8").then(
    () => true,
    () => false,
  );
  if (exists && !force && path.resolve(destination) !== absolute) {
    throw new Error(`${destination} already exists. Re-run with --force to overwrite it.`);
  }
  await writeFile(destination, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Installed ${data.id} → ${path.relative(root, destination)}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }
  if (args.includes("--live")) {
    console.error(
      "Live ingestion is not wired up. collectSignals(), clusterNarratives(), and scoreMomentum() are stubs. No API keys are configured. Write a snapshot JSON file and install it with --input.",
    );
    process.exitCode = 1;
    return;
  }
  const check = args.includes("--check") || args.length === 0;
  const inputFlag = args.indexOf("--input");
  const force = args.includes("--force");
  if (inputFlag >= 0) {
    const input = args[inputFlag + 1];
    if (!input || input.startsWith("--")) {
      throw new Error("--input requires a path to a snapshot JSON file.");
    }
    await install(input, force);
  }
  if (check || inputFlag < 0) {
    if (inputFlag < 0 && args.length > 0 && !args.includes("--check")) {
      throw new Error(`Unknown arguments: ${args.join(" ")}\n`);
    }
    await checkAll();
  }
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
