/**
 * Regenerates src/data/subjunctive.public.json from the original
 * src/data/subjunctive.json (never modified). The public file contains only
 * what unpaid visitors may see. Run: bun scripts/build-subjunctive-public.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { buildPublicSubjunctive } from "../src/lib/subjunctive-public-build";

const full = JSON.parse(readFileSync("src/data/subjunctive.json", "utf8"));
writeFileSync("src/data/subjunctive.public.json", JSON.stringify(buildPublicSubjunctive(full)) + "\n");
console.log("wrote src/data/subjunctive.public.json");
