/**
 * Text clean-up for "Ask me a question". Typed and spoken questions both pass
 * through here before interpretation, so speech hesitations never change the result.
 * Words that change grammatical meaning (not, never, would, wish, think, know…) are kept.
 */

const FILLERS = new Set([
  "um", "umm", "uh", "uhh", "er", "erm", "ah", "ahh", "eh", "hmm", "mm", "well", "like",
  "basically", "actually", "so", "okay", "ok", "right", "pues", "este", "bueno", "vale",
]);

const CONTRACTIONS: [RegExp, string][] = [
  [/\b(do|does|did|is|was|were|are|could|would|should|have|has|had)n'?t\b/g, "$1 not"],
  [/\bcan'?t\b/g, "can not"],
  [/\bwon'?t\b/g, "will not"],
  [/\bi'?m\b/g, "i am"],
  [/\b(he|she|it|that|there)'s\b/g, "$1 is"],
  [/\b(you|we|they)'re\b/g, "$1 are"],
  [/\b(i|you|we|they|he|she)'d\b/g, "$1 would"],
  [/\b(i|you|we|they)'ve\b/g, "$1 have"],
  [/\b(i|you|we|they|he|she)'ll\b/g, "$1 will"],
];

/** Phrases speakers use to restart a sentence; only what follows is kept. */
const CORRECTIONS = /\b(?:i mean|sorry|no wait|wait no|let me rephrase|o sea|perdon|quiero decir)\b/g;

export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Lowercase, accent-free, filler-free text with contractions expanded. */
export function normalise(input: string): string {
  let s = stripAccents(input.toLowerCase()).replace(/[’‘`]/g, "'");
  for (const [re, rep] of CONTRACTIONS) s = s.replace(re, rep);
  s = s.replace(/[^a-z0-9'ñ\s]/g, " ").replace(/'/g, "");

  // Self-correction: keep the part after the last restart if it is substantial.
  const parts = s.split(CORRECTIONS);
  const last = parts[parts.length - 1]!.trim();
  if (parts.length > 1 && last.split(/\s+/).length >= 3) s = last;

  const out: string[] = [];
  for (const w of s.split(/\s+/)) {
    if (!w || FILLERS.has(w)) continue;
    if (out[out.length - 1] === w) continue; // "I I don't" → "I don't"
    out.push(w);
  }
  return out.join(" ");
}
