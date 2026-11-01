import { describe, expect, it } from "vitest";
import { createDictation, type RecognitionCtor } from "./speech";

class FakeRec {
  static all: FakeRec[] = [];
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: any = null;
  onerror: any = null;
  onend: any = null;
  constructor() {
    FakeRec.all.push(this);
  }
  start() {}
  stop() {
    this.onend?.();
  }
  abort() {}
  say(text: string, isFinal = true) {
    this.onresult({ resultIndex: 0, results: [{ isFinal, 0: { transcript: text } }] });
  }
}

function setup(initial = "") {
  FakeRec.all = [];
  const out = { text: initial, states: [] as string[] };
  const d = createDictation({
    Ctor: FakeRec as unknown as RecognitionCtor,
    lang: "en-GB",
    initialText: initial,
    onText: (t) => (out.text = t),
    onState: (s) => out.states.push(s),
  });
  return { d, out };
}

describe("dictation", () => {
  it("keeps earlier text when the browser restarts after a pause", () => {
    const { out } = setup();
    FakeRec.all[0]!.say("I don't think");
    FakeRec.all[0]!.onend();
    expect(FakeRec.all).toHaveLength(2);
    FakeRec.all[1]!.say("he is right");
    expect(out.text).toBe("I don't think he is right");
  });
  it("shows interim text without committing it", () => {
    const { out } = setup();
    FakeRec.all[0]!.say("hello", true);
    FakeRec.all[0]!.say("wor", false);
    expect(out.text).toBe("hello wor");
  });
  it("appends to typed text", () => {
    const { out } = setup("How do I say");
    FakeRec.all[0]!.say("I hope he comes");
    expect(out.text).toBe("How do I say I hope he comes");
  });
  it("permission denied stops without restarting", () => {
    const { out } = setup();
    FakeRec.all[0]!.onerror({ error: "not-allowed" });
    FakeRec.all[0]!.onend();
    expect(out.states).toContain("denied");
    expect(FakeRec.all).toHaveLength(1);
  });
  it("Stop ends listening and does not restart", () => {
    const { d, out } = setup();
    FakeRec.all[0]!.say("text");
    d.stop();
    expect(FakeRec.all).toHaveLength(1);
    expect(out.states.at(-1)).toBe("idle");
    expect(out.text).toBe("text");
  });
});
