import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";

const access = { unlocked: false, creator: false, inTrial: false, accessSettled: false };

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: "/" }),
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}));
vi.mock("@/hooks/use-access", () => ({ useAccess: () => access }));

const { PromoPopup } = await import("./PromoPopup");

beforeEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.useFakeTimers();
  Object.assign(access, { unlocked: false, creator: false, inTrial: false, accessSettled: false });
});
afterEach(() => vi.useRealTimers());

const popupShown = () => screen.queryByText(/7 Days Free Trial/i) !== null;

describe("PromoPopup", () => {
  it("does not appear while the server is still verifying (slow response)", () => {
    Object.assign(access, { inTrial: true, accessSettled: false });
    render(<PromoPopup />);
    act(() => void vi.advanceTimersByTime(10_000));
    expect(popupShown()).toBe(false);
  });

  it("expired visitor never sees it", () => {
    Object.assign(access, { inTrial: false, accessSettled: true });
    render(<PromoPopup />);
    act(() => void vi.advanceTimersByTime(10_000));
    expect(popupShown()).toBe(false);
  });

  it("confirmed active trial sees it after three seconds", () => {
    Object.assign(access, { inTrial: true, accessSettled: true });
    render(<PromoPopup />);
    act(() => void vi.advanceTimersByTime(2_900));
    expect(popupShown()).toBe(false);
    act(() => void vi.advanceTimersByTime(200));
    expect(popupShown()).toBe(true);
  });

  it("cancels the pending timer when verification turns out expired", () => {
    Object.assign(access, { inTrial: true, accessSettled: true });
    const { rerender } = render(<PromoPopup />);
    act(() => void vi.advanceTimersByTime(1_000));
    Object.assign(access, { inTrial: false });
    rerender(<PromoPopup />);
    act(() => void vi.advanceTimersByTime(10_000));
    expect(popupShown()).toBe(false);
  });

  it("purchaser and verified creator never see it", () => {
    Object.assign(access, { inTrial: true, accessSettled: true, unlocked: true });
    render(<PromoPopup />);
    act(() => void vi.advanceTimersByTime(10_000));
    expect(popupShown()).toBe(false);
  });
});
