import { task } from "@trigger.dev/sdk/v3";
import { extractAndApplyBranding } from "@/lib/branding-extraction";

/**
 * Fire-and-forget branding bootstrap. Triggered from the onboarding
 * server action immediately after the church row is inserted (well
 * before checkout completes), so by the time the new owner first lands
 * on /settings the church is already themed.
 *
 * Never throws — `extractAndApplyBranding` swallows scrape and download
 * errors so a missing logo doesn't fail the whole run. The job returns
 * a small report mostly for visibility in the Trigger.dev dashboard.
 */
export const extractWebsiteBranding = task({
  id: "extract-website-branding",
  machine: "small-1x",
  retry: { maxAttempts: 2 },
  run: async (payload: { churchId: string; domain: string }) => {
    const result = await extractAndApplyBranding(payload.churchId, payload.domain);
    return { churchId: payload.churchId, domain: payload.domain, ...result };
  },
});
