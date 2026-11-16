import { describe, expect, it } from "vitest";
import { canOfferTestCheckout } from "./preview";

describe("manual test checkout availability", () => {
  it("is available in Lovable preview even when content is already accessible", () => {
    expect(canOfferTestCheckout("id-preview--6380e654-32b7-41b1-ac5d-45a87ece7e8e.lovable.app")).toBe(true);
  });
  it("is available locally for genuine test-mode checkout verification", () => {
    expect(canOfferTestCheckout("localhost")).toBe(true);
  });
  it.each(["verb-wise.richard-wells.com", "verb-wise-flashcards.lovable.app", "example.com"])(
    "is not available on %s", (host) => {
      expect(canOfferTestCheckout(host)).toBe(false);
    },
  );
});