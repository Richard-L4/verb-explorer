/*
 * Home page pricing-card rules (src/routes/index.tsx).
 *
 * The feature list is for everyone; only the £14.99 price and its purchase
 * prompt disappear once lifetime access is confirmed (purchase, restore, creator).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";

// Mutable entitlement stub, swapped per test.
const access = {
  creator: false,
  unlocked: false,
  inTrial: true,
  trialDaysLeft: 5,
  price: "£14.99",
  bannerPreview: null as null | number | "expired",
};

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: (_path: string) => (options: unknown) => ({ options }),
  Link: ({ children }: { children: React.ReactNode }) => <a href="/unlock">{children}</a>,
}));

vi.mock("@/hooks/use-access", () => ({ useAccess: () => access }));
vi.mock("@/hooks/use-subjunctive", () => ({
  useSubjunctive: () => ({ status: "idle", paid: false }),
}));
vi.mock("@/hooks/use-learner", () => ({
  useLearner: () => ({
    studiedCount: 0,
    learnedCount: 0,
    progressPercent: 0,
    recentCards: [],
    state: { favourites: [] },
  }),
}));
vi.mock("@/components/app/PageTransition", () => ({
  PageTransition: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/app/CardGrid", () => ({ CardGrid: () => <div /> }));
vi.mock("@/components/app/StatCard", () => ({ StatCard: () => <div /> }));
vi.mock("@/components/app/ProgressBar", () => ({ ProgressBar: () => <div /> }));
vi.mock("@/components/app/HomeScreenHint", () => ({ HomeScreenHint: () => <div /> }));

const { Route } = await import("./index");
const Home = (Route as unknown as { options: { component: () => React.ReactElement } }).options.component;

const FEATURES = [
  "Designed for Spanish learners at A2–B2 level.",
  "100 confusing verb pairs explained.",
  "Thousands of contextual examples.",
  "Present and imperfect subjunctive lessons.",
  "Quizzes, sayings and practical explanations.",
  "Smart voice and text search – ask any question (in English or Spanish), spoken or written, and get an answer.",
];

function everyFeatureIsVisible() {
  for (const feature of FEATURES) {
    expect(screen.getByText(feature)).toBeTruthy();
  }
}

beforeEach(() => {
  cleanup();
  Object.assign(access, {
    creator: false,
    unlocked: false,
    inTrial: true,
    trialDaysLeft: 5,
    bannerPreview: null,
  });
});

describe("home pricing card", () => {
  it("shows the price and purchase prompt to an unpaid visitor", () => {
    render(<Home />);
    expect(screen.getByText("£14.99")).toBeTruthy();
    expect(screen.getByText("£14.99. One payment. Lifetime access. No subscription.")).toBeTruthy();
    everyFeatureIsVisible();
  });

  it("shows the price and purchase prompt to a trial user", () => {
    Object.assign(access, { inTrial: true, trialDaysLeft: 3 });
    render(<Home />);
    expect(screen.getByText("£14.99")).toBeTruthy();
    expect(screen.getByText("£14.99. One payment. Lifetime access. No subscription.")).toBeTruthy();
    everyFeatureIsVisible();
  });

  it("keeps every feature visible but hides the price for a lifetime purchaser", () => {
    Object.assign(access, { unlocked: true, inTrial: false, trialDaysLeft: 0 });
    render(<Home />);
    expect(screen.queryByText("£14.99")).toBeNull();
    expect(screen.queryByText("£14.99. One payment. Lifetime access. No subscription.")).toBeNull();
    everyFeatureIsVisible();
    expect(screen.getByText(/One payment\. Hundreds of examples\./)).toBeTruthy();
  });

  it("keeps every feature visible but hides the price for creator devices", () => {
    Object.assign(access, { creator: true, inTrial: false, trialDaysLeft: 0 });
    render(<Home />);
    expect(screen.queryByText("£14.99")).toBeNull();
    expect(screen.queryByText("£14.99. One payment. Lifetime access. No subscription.")).toBeNull();
    everyFeatureIsVisible();
  });
});
