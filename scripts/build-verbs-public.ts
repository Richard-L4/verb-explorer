/** Regenerates src/data/verbs.public.json from src/data/verbs.json (never edits the original). */
import { readFileSync, writeFileSync } from "node:fs";
import { buildPublicVerbs } from "../src/lib/verbs-public-build";

const full = JSON.parse(readFileSync("src/data/verbs.json", "utf8"));
writeFileSync("src/data/verbs.public.json", JSON.stringify(buildPublicVerbs(full)) + "\n");
console.log("wrote src/data/verbs.public.json");
