/**
 * Small, curated reference vocabulary for words that may be outside the Verb Wise
 * curriculum. It is not lesson content and never authorises a card match: it only
 * lets the engine distinguish "real word, not covered here" from "unrecognised".
 *
 * This is deliberately finite and extensible. Absence from this list is not proof
 * that a Spanish word is wrong. The 100-card deck remains the sole authority for
 * lesson explanations and examples.
 */

export interface OffPackWord {
  /** Infinitive associated with the word, used only to describe curriculum status. */
  verb: string;
  /** Short dictionary meaning, not a Verb Wise lesson explanation. */
  meaning: string;
  kind: "verb" | "noun";
  /** Correctly accented display spelling when it differs from the normalised key. */
  display?: string;
}

/** Common verbs. Deck headwords still win before this vocabulary is consulted. */
const VERBS: [string, string][] = [
  ["abrir", "to open"], ["aceptar", "to accept"], ["acompanar", "to accompany"], ["acabar", "to finish"],
  ["ayudar", "to help"], ["bailar", "to dance"], ["bajar", "to go down"], ["beber", "to drink"],
  ["bucear", "to dive"], ["cambiar", "to change"], ["caminar", "to walk"], ["cantar", "to sing"],
  ["cocinar", "to cook"], ["comer", "to eat"], ["comenzar", "to begin"], ["comprar", "to buy"],
  ["contar", "to count / to tell"], ["correr", "to run"], ["cortar", "to cut"], ["crear", "to create"],
  ["cuidar", "to look after"], ["dejar", "to leave / to let"], ["descansar", "to rest"], ["desear", "to wish"],
  ["desperdiciar", "to waste / to squander"], ["dibujar", "to draw"], ["dudar", "to doubt"],
  ["durar", "to last"], ["echar", "to throw / to pour"], ["entrar", "to enter"], ["enviar", "to send"],
  ["equivocarse", "to make a mistake"], ["escribir", "to write"], ["esperar", "to wait / to hope"],
  ["esquiar", "to ski"], ["estudiar", "to study"], ["explicar", "to explain"], ["finalizar", "to finish"],
  ["firmar", "to sign"], ["fumar", "to smoke"], ["ganar", "to win / to earn"], ["guardar", "to keep"],
  ["imaginar", "to imagine"], ["invitar", "to invite"], ["jugar", "to play"], ["ladrar", "to bark"],
  ["lavar", "to wash"], ["leer", "to read"], ["limpiar", "to clean"], ["llamar", "to call"],
  ["llegar", "to arrive"], ["llorar", "to cry"], ["llover", "to rain"], ["malgastar", "to waste"],
  ["manejar", "to drive / to handle"], ["maullar", "to meow"], ["mejorar", "to improve"],
  ["morir", "to die"], ["mostrar", "to show"], ["nadar", "to swim"], ["necesitar", "to need"],
  ["nevar", "to snow"], ["olvidar", "to forget"], ["ordenar", "to organise"], ["pagar", "to pay"],
  ["pasear", "to stroll"], ["patinar", "to skate"], ["pelear", "to fight"], ["pintar", "to paint"],
  ["practicar", "to practise"], ["preparar", "to prepare"], ["prestar", "to lend"], ["probar", "to try / to taste"],
  ["recibir", "to receive"], ["recoger", "to pick up / to collect"], ["regalar", "to give as a gift"],
  ["reir", "to laugh"], ["reparar", "to repair"], ["responder", "to answer"], ["romper", "to break"],
  ["saltar", "to jump"], ["sonreir", "to smile"], ["sonar", "to sound / to ring"], ["soñar", "to dream"],
  ["subir", "to go up"], ["suceder", "to happen"], ["tirar", "to throw"], ["tocar", "to touch / to play an instrument"],
  ["tomar", "to take / to drink"], ["trabajar", "to work"], ["usar", "to use"], ["utilizar", "to use / to utilise"],
  ["vender", "to sell"], ["viajar", "to travel"], ["visitar", "to visit"], ["vivir", "to live"],
  ["volar", "to fly"], ["votar", "to vote"], ["abrazar", "to hug"], ["adivinar", "to guess"],
  ["agradecer", "to thank"], ["alquilar", "to rent"], ["amar", "to love"], ["apagar", "to turn off"],
  ["aparecer", "to appear"], ["aprender", "to learn"], ["apoyar", "to support"], ["arrojar", "to throw"],
  ["asistir", "to attend"], ["aumentar", "to increase"], ["averiguar", "to find out"], ["barrer", "to sweep"],
  ["borrar", "to erase"], ["brillar", "to shine"], ["calentar", "to heat"], ["callar", "to quieten"],
  ["casar", "to marry"], ["celebrar", "to celebrate"], ["cenar", "to have dinner"], ["chatear", "to chat online"],
  ["colgar", "to hang"], ["comentar", "to comment"], ["compartir", "to share"], ["componer", "to compose / to mend"],
  ["conducir", "to drive"], ["confiar", "to trust"], ["consistir", "to consist"], ["construir", "to build"],
  ["convertir", "to convert"], ["copiar", "to copy"], ["coser", "to sew"], ["cruzar", "to cross"],
  ["cumplir", "to fulfil / to turn a certain age"], ["deber", "to owe / must"], ["defender", "to defend"],
  ["destruir", "to destroy"], ["detener", "to stop / to detain"], ["devolver", "to return an item"],
  ["discutir", "to discuss / to argue"], ["disfrutar", "to enjoy"], ["duchar", "to shower"],
  ["elegir", "to choose"], ["empezar", "to begin"], ["empujar", "to push"], ["encender", "to switch on"],
  ["encender", "to light"], ["enseñar", "to teach / to show"], ["entrenar", "to train"],
  ["escalar", "to climb"], ["escoger", "to choose"], ["esconder", "to hide"], ["escupir", "to spit"],
  ["evitar", "to avoid"], ["existir", "to exist"], ["faltar", "to be missing"], ["fijar", "to fix / to notice"],
  ["funcionar", "to work / to function"], ["gritar", "to shout"], ["habituar", "to accustom"],
  ["herir", "to injure"], ["incluir", "to include"], ["insistir", "to insist"], ["intentar", "to try"],
  ["interesar", "to interest"], ["invitar", "to invite"], ["juntar", "to join / to gather"],
  ["lastimar", "to hurt"], ["llenar", "to fill"], ["llevar", "to carry / to wear"], ["lograr", "to achieve"],
  ["luchar", "to fight / to struggle"], ["mandar", "to send / to order"], ["mantener", "to maintain"],
  ["marchar", "to go / to march"], ["masticar", "to chew"], ["medir", "to measure"], ["mentir", "to lie"],
  ["mirar", "to look"], ["molestar", "to bother"], ["montar", "to ride / to assemble"], ["morder", "to bite"],
  ["nacer", "to be born"], ["negar", "to deny"], ["notar", "to notice"], ["obedecer", "to obey"],
  ["ocurrir", "to happen"], ["ofrecer", "to offer"], ["oler", "to smell"], ["olvidar", "to forget"],
  ["partir", "to leave / to split"], ["pegar", "to stick / to hit"], ["peinar", "to comb"],
  ["permitir", "to allow"], ["perseguir", "to chase"], ["pesar", "to weigh"], ["pescar", "to fish"],
  ["planchar", "to iron"], ["plantar", "to plant"], ["poseer", "to possess"], ["preocupar", "to worry"],
  ["presentar", "to present / to introduce"], ["producir", "to produce"], ["prometer", "to promise"],
  ["proteger", "to protect"], ["quemar", "to burn"], ["quitar", "to remove"], ["realizar", "to carry out"],
  ["rechazar", "to reject"], ["reducir", "to reduce"], ["repetir", "to repeat"], ["rezar", "to pray"],
  ["rodar", "to roll / to film"], ["rogar", "to beg"], ["sacar", "to take out"], ["sacudir", "to shake"],
  ["saludar", "to greet"], ["secar", "to dry"], ["sembrar", "to sow"], ["sentar", "to seat"],
  ["separar", "to separate"], ["servir", "to serve"], ["significar", "to mean"], ["soportar", "to tolerate"],
  ["sostener", "to hold / to support"], ["sugerir", "to suggest"], ["sumar", "to add"], ["temblar", "to tremble"],
  ["terminar", "to finish"], ["unir", "to join / to unite"], ["valer", "to be worth"], ["variar", "to vary"],
];

/** Derived nouns with a clear, standard relationship to their verb. */
const NOUNS: [string, string, string, string?][] = [
  ["desperdicio", "desperdiciar", "waste / squandering"],
  ["desconocimiento", "desconocer", "lack of knowledge / unfamiliarity"],
  ["reconocimiento", "reconocer", "recognition"],
  ["comida", "comer", "food / meal"], ["bebida", "beber", "drink"],
  ["lectura", "leer", "reading"], ["escritura", "escribir", "writing / handwriting"],
  ["cocina", "cocinar", "kitchen / cooking"], ["natacion", "nadar", "swimming", "natación"],
  ["ladrido", "ladrar", "bark / barking"], ["maullido", "maullar", "meow / meowing"],
  ["cancion", "cantar", "song", "canción"], ["baile", "bailar", "dance / dancing"],
  ["viaje", "viajar", "trip / journey"], ["estudio", "estudiar", "study"],
  ["ensenanza", "enseñar", "teaching", "enseñanza"], ["aprendizaje", "aprender", "learning"],
  ["descanso", "descansar", "rest / break"], ["caminata", "caminar", "walk / hike"],
  ["carrera", "correr", "race / running"], ["salto", "saltar", "jump"],
  ["compra", "comprar", "purchase / shopping"], ["venta", "vender", "sale"],
  ["pago", "pagar", "payment"], ["ahorro", "ahorrar", "saving / savings"],
  ["limpieza", "limpiar", "cleaning"], ["lavado", "lavar", "wash / washing"],
  ["corte", "cortar", "cut"], ["rotura", "romper", "break / breakage"],
  ["recogida", "recoger", "collection / pickup"], ["uso", "usar", "use"],
  ["necesidad", "necesitar", "need"], ["deseo", "desear", "wish / desire"],
  ["esperanza", "esperar", "hope"], ["vida", "vivir", "life"],
  ["muerte", "morir", "death"], ["cambio", "cambiar", "change"],
  ["ayuda", "ayudar", "help"], ["llamada", "llamar", "call"],
  ["llegada", "llegar", "arrival"], ["entrada", "entrar", "entrance / entry"],
  ["apertura", "abrir", "opening"], ["comienzo", "comenzar", "beginning"],
  ["respuesta", "responder", "answer"], ["duda", "dudar", "doubt"],
  ["celebracion", "celebrar", "celebration", "celebración"], ["explicacion", "explicar", "explanation", "explicación"],
  ["invitacion", "invitar", "invitation", "invitación"], ["proteccion", "proteger", "protection", "protección"],
  ["sugerencia", "sugerir", "suggestion"], ["eleccion", "elegir", "choice / election", "elección"],
  ["discusion", "discutir", "discussion / argument", "discusión"], ["decision", "decidir", "decision", "decisión"],
  ["construccion", "construir", "construction", "construcción"], ["destruccion", "destruir", "destruction", "destrucción"],
  ["produccion", "producir", "production", "producción"], ["reduccion", "reducir", "reduction", "reducción"],
];

/** Normalised word → reference record. Later duplicate verbs are harmless. */
export const OFF_PACK_WORDS: Record<string, OffPackWord> = Object.fromEntries([
  ...VERBS.map(([word, meaning]) => [word, { verb: word, meaning, kind: "verb" as const, display: word === "reir" ? "reír" : word === "sonreir" ? "sonreír" : word === "soñar" ? "soñar" : undefined }]),
  ...NOUNS.map(([word, verb, meaning, display]) => [word, { verb, meaning, kind: "noun" as const, display }]),
]);

/** Flat pool for fuzzy spelling suggestions; still never a card match by itself. */
export const OFF_PACK_POOL: [string, string][] = Object.keys(OFF_PACK_WORDS).map((word) => [word, word]);

export function displayOffPack(word: string): string {
  return OFF_PACK_WORDS[word]?.display ?? word;
}
