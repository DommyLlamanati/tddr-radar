import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { snapshotSchema } from "./data/schema";

const snapshots = defineCollection({
  loader: glob({
    pattern: "**/*.json",
    base: "./src/data/snapshots",
  }),
  schema: snapshotSchema,
});

export const collections = { snapshots };
