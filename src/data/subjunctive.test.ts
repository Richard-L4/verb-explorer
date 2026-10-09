import { describe, expect, it } from "vitest";
import { entryProblems, isCompleteEntry, subjunctiveEntries, completeEntryCount } from "./subjunctive";
import { getCard } from "./cards";

const ex = (extra: object = {}) => ({ difficulty: "easy", level: "A2", es: "Quiero que seas feliz.", en: "I want you to be happy.", form: "seas (ser)", note: "n", ...extra });
const trig = (examples = [ex(), ex(), ex()]) => ({ category: "wish", trigger: "quiero que", explanation: "e", examples });
const entry = (triggers = [trig(), trig(), trig()]) => ({ id: "ser-vs-estar", title: "ser vs estar", triggers });

describe("subjunctive completeness rule", () => {
  it("accepts a complete entry", () => expect(isCompleteEntry(entry())).toBe(true));
  it("rejects a trigger with only two examples", () => expect(isCompleteEntry(entry([trig([ex(), ex()]), trig(), trig()]))).toBe(false));
  it("rejects only two triggers", () => expect(isCompleteEntry(entry([trig(), trig()]))).toBe(false));
  it("rejects an empty note", () => expect(isCompleteEntry(entry([trig([ex({ note: " " }), ex(), ex()]), trig(), trig()]))).toBe(false));
  it("does not require a contrast", () => expect(entryProblems(entry())).toEqual([]));
  it("flags an incomplete contrast", () => {
    const p = entryProblems(entry([trig([ex({ contrast: { es: "x", en: "y" } }), ex(), ex()]), trig(), trig()]));
    expect(p).toEqual(["ser-vs-estar trigger 1 example 1: contrast missing note"]);
  });
  it("flags an unknown id", () => expect(entryProblems({ ...entry(), id: "nope" })).toContain("nope: id does not match any verb card"));
  it("flags an invalid level", () => expect(isCompleteEntry(entry([trig([ex({ level: "Z9" }), ex(), ex()]), trig(), trig()]))).toBe(false));
});

describe("real subjunctive data", () => {
  it("has 100 entries, all complete and all matching a verb card", () => {
    expect(subjunctiveEntries).toHaveLength(100);
    expect(completeEntryCount).toBe(100);
    expect(subjunctiveEntries.every((e) => getCard(e.id))).toBe(true);
  });
  it("has unique ids", () => expect(new Set(subjunctiveEntries.map((e) => e.id)).size).toBe(subjunctiveEntries.length));
});
