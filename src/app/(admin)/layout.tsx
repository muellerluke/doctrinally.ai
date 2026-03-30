import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/layouts/admin-sidebar";
import { AdminHeader } from "@/components/layouts/admin-header";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { memberships, churches } from "@/db/schema";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  // Find the user's church membership
  const membership = await db.query.memberships.findFirst({
    where: eq(memberships.userId, session.user.id),
  });

  if (!membership) {
    redirect("/onboarding");
  }

  const church = await db.query.churches.findFirst({
    where: eq(churches.id, membership.churchId),
  });

  return (
    <SidebarProvider>
      <AdminSidebar churchName={church?.name} />
      <SidebarInset>
        <AdminHeader userName={session.user.name} />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
