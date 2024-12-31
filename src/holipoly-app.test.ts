import { afterEach, describe, expect, it, vi } from "vitest";

import { FileAPL } from "./APL";
import { HolipolyApp } from "./holipoly-app";

describe("HolipolyApp", () => {
  const initialEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...initialEnv };
    vi.resetModules();
  });

  it("Constructs", () => {
    const instance = new HolipolyApp({
      apl: new FileAPL(),
    });

    expect(instance).toBeDefined();
    expect(instance.apl).toBeInstanceOf(FileAPL);
  });
});
