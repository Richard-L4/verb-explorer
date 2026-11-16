/** Server-only: the complete sayings collection. Loaded dynamically inside server handlers; never import from client code. */
import rawSayings from "@/data/sayings.json";
import northAmerican from "@/data/northAmericanExpressions.json";
import { buildAllSayings, type NorthAmericanSource } from "./sayings-build";

export const fullSayings = buildAllSayings(rawSayings as unknown[], northAmerican as unknown as NorthAmericanSource);
