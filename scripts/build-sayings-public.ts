/** Regenerates src/data/sayings.public.json (names and notes only) from the untouched source files. */
import { readFileSync, writeFileSync } from "node:fs";
import { buildPublicSayings } from "../src/lib/sayings-build";

const british = JSON.parse(readFileSync("src/data/sayings.json", "utf8"));
const na = JSON.parse(readFileSync("src/data/northAmericanExpressions.json", "utf8"));
writeFileSync("src/data/sayings.public.json", JSON.stringify(buildPublicSayings(british, na)) + "\n");
console.log("wrote src/data/sayings.public.json");
