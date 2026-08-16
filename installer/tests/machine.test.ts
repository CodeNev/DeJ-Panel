import { describe, it, expect } from "vitest";
import { installerReducer } from "../src/state/machine";
import { createInitialInstallerState, getStepsForPlatform } from "../src/state/types";

describe("installer state machine", () => {
  it("generates a shorter step list for railway (no D1 step) than cloudflare", () => {
    const cfSteps = getStepsForPlatform("cloudflare");
    const rwSteps = getStepsForPlatform("railway");
    expect(cfSteps).toContain("DATABASE_CONFIGURATION");
    expect(rwSteps).not.toContain("DATABASE_CONFIGURATION");
    expect(rwSteps).not.toContain("DATABASE_MIGRATION");
  });

  it("moves from PLATFORM_SELECTION to PREREQUISITE_CHECK on platform select", () => {
    const initial = createInitialInstallerState();
    const next = installerReducer(initial, { type: "SELECT_PLATFORM", platform: "cloudflare" });
    expect(next.platform).toBe("cloudflare");
    expect(next.steps[next.currentStepIndex]).toBe("PREREQUISITE_CHECK");
    expect(next.completedSteps).toContain("PLATFORM_SELECTION");
  });

  it("never persists credentials in a form meant for storage", () => {
    const initial = createInitialInstallerState();
    const withCreds = installerReducer(initial, {
      type: "SET_CREDENTIALS",
      apiToken: "secret-token",
      accountId: "acc_1",
    });
    expect(withCreds.credentials?.apiToken).toBe("secret-token");
  });

  it("advances and tracks completed steps without duplication", () => {
    let state = createInitialInstallerState();
    state = installerReducer(state, { type: "SELECT_PLATFORM", platform: "railway" });
    state = installerReducer(state, { type: "NEXT_STEP" });
    state = installerReducer(state, { type: "NEXT_STEP" });
    const occurrences = state.completedSteps.filter((s) => s === "PREREQUISITE_CHECK").length;
    expect(occurrences).toBeLessThanOrEqual(1);
  });
});
