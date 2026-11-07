/**
 * Maps learner words (conjugations, derived nouns) to candidate infinitives.
 * Explicit entries are trusted mappings; ending rules only produce guesses, and the
 * engine accepts a guess only if that infinitive is a real headword on a card.
 * Keys are accent-free and lowercase, matching `normalise` output.
 */

/** Explicit irregular forms and derived nouns → infinitive. Extend as needed. */
export const EXPLICIT_FORMS: Record<string, string> = {
  desperdicio: "desperdiciar", desperdicia: "desperdiciar", desperdicias: "desperdiciar", desperdicies: "desperdiciar",
  perdida: "perder", perdidas: "perder", pierdo: "perder", pierdes: "perder", pierde: "perder", pierden: "perder", perdi: "perder", perdio: "perder",
  soy: "ser", eres: "ser", es: "ser", somos: "ser", son: "ser", fui: "ser",
  estoy: "estar", estas: "estar", esta: "estar", estamos: "estar", estan: "estar", estuve: "estar",
  se: "saber", sabes: "saber", sabe: "saber", supe: "saber",
  conozco: "conocer", conoces: "conocer", conoce: "conocer", conocimiento: "conocer",
  pido: "pedir", pides: "pedir", pide: "pedir", piden: "pedir", pedido: "pedir",
  pregunta: "preguntar", pregunto: "preguntar",
  traigo: "traer", traje: "traer", llevo: "llevar", lleva: "llevar",
  veo: "ver", vi: "ver", miro: "mirar", oigo: "oir", oye: "oir", escucho: "escuchar",
  recuerdo: "recordar", recuerda: "recordar", acuerdo: "acordarse",
  gasto: "gastar", gasta: "gastar", paso: "pasar", pasa: "pasar",
  digo: "decir", dice: "decir", dije: "decir", hablo: "hablar", habla: "hablar",
  encuentro: "encontrar", encuentra: "encontrar", busco: "buscar", busca: "buscar",
  voy: "ir", vas: "ir", va: "ir", vengo: "venir", viene: "venir",
  quiero: "querer", quiere: "querer", amo: "amar", salgo: "salir", sale: "salir", quedo: "quedar", queda: "quedar",
  falta: "faltar", faltan: "faltar",
};

/** Conservative regular endings → possible infinitive endings. Guesses only. */
const ENDINGS: [string, string[]][] = [
  ["amos", ["ar"]], ["emos", ["er"]], ["imos", ["ir"]],
  ["aron", ["ar"]], ["ieron", ["er", "ir"]],
  ["aba", ["ar"]], ["aban", ["ar"]], ["ando", ["ar"]], ["iendo", ["er", "ir"]], ["ado", ["ar"]], ["ido", ["er", "ir"]],
  ["as", ["ar"]], ["an", ["ar"]], ["es", ["er", "ir"]], ["en", ["er", "ir"]], ["o", ["ar", "er", "ir"]], ["a", ["ar"]], ["e", ["er", "ir"]],
];

/** Returns `{ explicit }` for a trusted mapping, plus unverified `guesses` from endings. */
export function verbCandidates(word: string): { explicit?: string; guesses: string[] } {
  const explicit = EXPLICIT_FORMS[word];
  if (explicit) return { explicit, guesses: [] };
  const guesses: string[] = [];
  if (word.length >= 5)
    for (const [end, infs] of ENDINGS)
      if (word.endsWith(end) && word.length - end.length >= 3) {
        for (const inf of infs) guesses.push(word.slice(0, -end.length) + inf);
        break;
      }
  return { guesses };
}

/** Labelled extra notes for set expressions not covered by card examples. */
export const EXTRA_NOTES: [RegExp, string][] = [
  [/\bperdida de tiempo\b/, "“Una pérdida de tiempo” means “a waste of time”. Pérdida is the noun from perder. Example: Esta reunión es una pérdida de tiempo. (This meeting is a waste of time.)"],
];
