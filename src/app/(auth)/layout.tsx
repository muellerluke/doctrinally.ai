import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AuthSignOutButton } from "@/components/layouts/auth-sign-out-button";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Thin wrapper: chrome lives inside each page (CenteredAuth for simple
 * forms, AuthShell for split-pane flows like sign-up and onboarding). The
 * layout just renders children and attaches a global sign-out escape hatch
 * for logged-in users hitting an auth route.
 */
export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <>
      {children}
      {session?.user && <AuthSignOutButton />}
    </>
  );
}
