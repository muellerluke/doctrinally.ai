import { describe, it, expect } from "vitest";
import {
  PLANS,
  TRIAL_DAYS,
  getPlanLimits,
  getOverageRates,
} from "@/lib/plans";

describe("plans", () => {
  describe("PLANS", () => {
    it("Standard plan has 1,500 messages at $49", () => {
      expect(PLANS.standard.price).toBe(49);
      expect(PLANS.standard.questionLimit).toBe(1500);
    });

    it("Enterprise plan has 3,000 messages at $99", () => {
      expect(PLANS.enterprise.price).toBe(99);
      expect(PLANS.enterprise.questionLimit).toBe(3000);
    });

    it("only Enterprise unlocks custom domain + branding", () => {
      expect(PLANS.standard.features.customDomain).toBe(false);
      expect(PLANS.standard.features.customBranding).toBe(false);
      expect(PLANS.enterprise.features.customDomain).toBe(true);
      expect(PLANS.enterprise.features.customBranding).toBe(true);
    });

    it("highlight copy matches the numeric limits", () => {
      expect(PLANS.standard.highlights.some((h) => h.includes("1,500"))).toBe(
        true
      );
      expect(PLANS.enterprise.highlights.some((h) => h.includes("3,000"))).toBe(
        true
      );
    });
  });

  describe("TRIAL_DAYS", () => {
    it("is 14", () => {
      expect(TRIAL_DAYS).toBe(14);
    });
  });

  describe("getPlanLimits()", () => {
    it("returns full plan limits — trials get the same", () => {
      expect(getPlanLimits("standard")).toEqual({ questionLimit: 1500 });
      expect(getPlanLimits("enterprise")).toEqual({ questionLimit: 3000 });
    });
  });

  describe("getOverageRates()", () => {
    it("is $0.25 per question", () => {
      expect(getOverageRates()).toEqual({ question: 0.25 });
    });
  });
});
