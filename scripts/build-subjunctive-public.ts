/**
 * Regenerates the browser-safe subjunctive files from the original master
 * files (never modified). Each public file contains only what unpaid visitors
 * may see. Run: bun scripts/build-subjunctive-public.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { buildPublicSubjunctive } from "../src/lib/subjunctive-public-build";

for (const name of ["subjunctive", "imperfect-subjunctive"]) {
  const full = JSON.parse(readFileSync(`src/data/${name}.json`, "utf8"));
  writeFileSync(`src/data/${name}.public.json`, JSON.stringify(buildPublicSubjunctive(full)) + "\n");
  console.log(`wrote src/data/${name}.public.json`);
}
