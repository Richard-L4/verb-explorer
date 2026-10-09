import { describe, expect, it } from "vitest";
import { trustedAddressFrom, trustedAddressFromHeaders } from "./client-address.server";

describe("trusted client address", () => {
  it("uses only cf-connecting-ip", () => {
    expect(trustedAddressFromHeaders(new Headers({ "cf-connecting-ip": "81.2.69.160" }))).toBe("81.2.69.160");
  });
  it("ignores forged forwarding headers entirely", () => {
    const h = new Headers({ "x-forwarded-for": "1.2.3.4", "x-real-ip": "5.6.7.8", "true-client-ip": "9.9.9.9" });
    expect(trustedAddressFromHeaders(h)).toBeNull();
  });
  it("forged forwarding headers do not change the trusted address", () => {
    const a = trustedAddressFromHeaders(new Headers({ "cf-connecting-ip": "81.2.69.160", "x-forwarded-for": "1.1.1.1" }));
    const b = trustedAddressFromHeaders(new Headers({ "cf-connecting-ip": "81.2.69.160", "x-forwarded-for": "2.2.2.2" }));
    expect(a).toBe(b);
  });
  it("rejects malformed values", () => {
    expect(trustedAddressFrom("1.2.3.4, 5.6.7.8")).toBeNull();
    expect(trustedAddressFrom("999.1.1.1")).toBeNull();
    expect(trustedAddressFrom("2001:DB8::1")).toBe("2001:db8::1");
  });
});
