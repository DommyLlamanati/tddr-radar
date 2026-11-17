import type { APIRoute } from "astro";
import { narrativeHistory } from "../../lib/snapshots";
import { historyIndexCard } from "../../lib/og-cards";
import { pngResponse, renderOgPng } from "../../lib/og-image";

export const GET: APIRoute = async () => pngResponse(await renderOgPng(historyIndexCard(await narrativeHistory())));
