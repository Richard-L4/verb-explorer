/**
 * Regenerates src/data/quiz.public.json from src/data/quiz.json (never
 * modified). Only the fixed 20 after-trial questions ship to the browser.
 * Run: bun scripts/build-quiz-public.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { buildPublicQuiz } from "../src/lib/quiz-public-build";

const full = JSON.parse(readFileSync("src/data/quiz.json", "utf8"));
writeFileSync("src/data/quiz.public.json", JSON.stringify(buildPublicQuiz(full)) + "\n");
console.log("wrote src/data/quiz.public.json");
