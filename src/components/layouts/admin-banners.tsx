"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminBannersProps {
  needsSetup: boolean;
  pastDue: boolean;
}

/**
 * Top-of-page banners rendered inside the admin main. Extracted into a client
 * component so we can suppress them on full-screen workspaces (currently the
 * sermon editor) where they'd squeeze the layout.
 */
export function AdminBanners({ needsSetup, pastDue }: AdminBannersProps) {
  const pathname = usePathname();

  // Full-screen routes where banners would collapse usable editor space.
  const isFullScreenWorkspace = /^\/sermons\/[^/]+\/edit(?:\/|$)/.test(
    pathname ?? ""
  );
  if (isFullScreenWorkspace) return null;

  if (!needsSetup && !pastDue) return null;

  return (
    <>
      {needsSetup && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-blue-500/30 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-400/20 dark:bg-blue-950/40 dark:text-blue-300">
          <span className="font-medium">Finish setting up your church.</span>
          <Link
            href="/settings"
            className="underline underline-offset-2 hover:text-blue-900 dark:hover:text-blue-200"
          >
            Go to Settings
          </Link>
          <span className="text-blue-700 dark:text-blue-400">
            to add a description and complete your profile.
          </span>
        </div>
      )}
      {pastDue && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span className="font-medium">Payment past due.</span>
          <span className="text-amber-700">
            Please update your payment method in Billing to avoid service
            interruption.
          </span>
        </div>
      )}
    </>
  );
}
