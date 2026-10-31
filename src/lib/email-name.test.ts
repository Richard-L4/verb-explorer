import { describe, expect, it } from "vitest";
import { cleanBuyerFirstName, escapeHtml } from "./payments.server";

const safe = (n: string | null) => escapeHtml(cleanBuyerFirstName(n));

describe("buyer name in confirmation email", () => {
  it("keeps ordinary international first names", () => {
    expect(cleanBuyerFirstName("José García")).toBe("José");
    expect(cleanBuyerFirstName("Zoë Smith")).toBe("Zoë");
    expect(cleanBuyerFirstName("Anne-Marie Dubois")).toBe("Anne-Marie");
    expect(cleanBuyerFirstName("Søren Kierkegaard")).toBe("Søren");
    expect(cleanBuyerFirstName("Иван Петров")).toBe("Иван");
  });

  it("keeps apostrophes but escapes them for HTML", () => {
    expect(cleanBuyerFirstName("D'Arcy Jones")).toBe("D'Arcy");
    expect(safe("D'Arcy Jones")).toBe("D&#39;Arcy");
  });

  it("removes markup so it cannot become HTML", () => {
    const out = safe('<a href="https://evil.example">Click</a>');
    expect(out).not.toMatch(/[<>"]/);
  });

  it("removes control and invisible formatting characters", () => {
    expect(cleanBuyerFirstName("Jo\u0000\u202Ehn\u200B")).toBe("John");
  });

  it("caps the length at 40 characters", () => {
    expect(Array.from(cleanBuyerFirstName("a".repeat(500))).length).toBe(40);
  });

  it("falls back to 'there' when nothing usable remains", () => {
    expect(cleanBuyerFirstName(null)).toBe("there");
    expect(cleanBuyerFirstName("<<>>")).toBe("there");
  });
});
