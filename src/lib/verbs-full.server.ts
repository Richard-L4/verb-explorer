/** Server-only: the complete verb deck. Loaded dynamically inside server handlers; never import from client code. */
import raw from "@/data/verbs.json";
import type { VerbCard } from "@/data/cards";

export const fullVerbs = raw as VerbCard[];
