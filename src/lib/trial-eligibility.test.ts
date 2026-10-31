import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseTrialInput } from "./trial-input";

const { db } = vi.hoisted(() => ({ db: { from: vi.fn() } }));
vi.mock("./payments.server", () => ({ getSupabaseAdmin: () => db }));
vi.mock("./env.server", () => ({ readEnv: () => "test-only-trial-salt" }));
import { claimTrial, hashDevice } from "./trial.server";

const device = {
  screen: "1920x1080", pixelRatio: "1", timezone: "Europe/London",
  language: "en", platform: "Linux", cores: "8", memory: "8", touch: "no-touch",
};
const started = "2026-10-01T12:00:00.000Z";

function store(known: boolean, sameDevice: boolean, networkCount: number) {
  const insert = vi.fn().mockResolvedValue({ error: null });
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: known ? { trial_started_at: started, repeat_suspected: true } : null, error: null }),
    limit: vi.fn().mockResolvedValue({ data: sameDevice ? [{ trial_started_at: started }] : [], error: null }),
    insert,
    then(resolve: (value: unknown) => unknown) {
      return Promise.resolve({ data: Array.from({ length: networkCount }, () => ({ trial_started_at: started })), error: null }).then(resolve);
    },
  };
  db.from.mockReturnValue(query);
  return insert;
}

beforeEach(() => vi.clearAllMocks());

describe("trial eligibility remains unchanged with bounded device input", () => {
  it("preserves device identity hashes", () => {
    const parsed = parseTrialInput({ device });
    expect(hashDevice(parsed.device, "81.2.69.160")).toBe(hashDevice(device, "81.2.69.160"));
  });

  it("retains an existing cookie's trial start without inserting a grant", async () => {
    const insert = store(true, false, 0);
    const result = await claimTrial({ token: "existing", address: null, ...parseTrialInput({ device }) });
    expect(result.claim).toEqual({ available: true, trialStart: started, isNew: false, repeat: true });
    expect(insert).not.toHaveBeenCalled();
    expect(result.issueToken).toBeUndefined();
  });

  it("inherits the same-device trial instead of restarting", async () => {
    store(false, true, 0);
    const result = await claimTrial({ token: null, address: "81.2.69.160", ...parseTrialInput({ device }) });
    expect(result.claim.trialStart).toBe(started);
    expect(result.claim.isNew).toBe(false);
    expect(result.claim.repeat).toBe(true);
  });

  it("continues allowing a fourth legitimate device on a shared network", async () => {
    store(false, false, 3);
    const result = await claimTrial({ token: null, address: "81.2.69.160", ...parseTrialInput({ device }) });
    expect(result.claim.available).toBe(true);
    expect(result.claim.isNew).toBe(true);
    expect(result.claim.repeat).toBe(false);
    expect(result.issueToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("preserves trial inheritance at the existing eight-grant velocity threshold", async () => {
    store(false, false, 8);
    const result = await claimTrial({ token: null, address: "81.2.69.160", ...parseTrialInput({ device }) });
    expect(result.claim.trialStart).toBe(started);
    expect(result.claim.isNew).toBe(false);
    expect(result.claim.repeat).toBe(true);
  });
});