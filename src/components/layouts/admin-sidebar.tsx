"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FileText,
  Users,
  UserCog,
  Settings,
  CreditCard,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

const mainNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Members", href: "/members", icon: Users },
];

interface AdminSidebarProps {
  churchName?: string;
  plan?: string;
  subscriptionStatus?: string;
  questionUsage?: number;
  questionLimit?: number;
  uploadUsage?: number;
  uploadLimit?: number;
  membershipRole?: string;
  trialEndsAt?: Date | null;
  messageOverageEnabled?: boolean;
  messageOverageCap?: number;
}

export function AdminSidebar({
  churchName,
  plan,
  subscriptionStatus,
  questionUsage = 0,
  questionLimit = 0,
  uploadUsage = 0,
  uploadLimit = 0,
  membershipRole,
  trialEndsAt,
  messageOverageEnabled = false,
  messageOverageCap = 0,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const isOwner = membershipRole === "owner";

  const managementNav = [
    { label: "User Management", href: "/users", icon: UserCog },
    { label: "Settings", href: "/settings", icon: Settings },
    ...(isOwner
      ? [{ label: "Billing", href: "/billing", icon: CreditCard }]
      : []),
  ];

  const isTrialing = subscriptionStatus === "trialing";

  const planLabel = isTrialing
    ? "Trial"
    : plan
      ? plan.charAt(0).toUpperCase() + plan.slice(1)
      : "No plan";

  const planBadgeClass = isTrialing
    ? "border-blue-400/40 bg-blue-400/15 text-blue-300"
    : plan === "enterprise"
      ? "border-sidebar-foreground/20 bg-sidebar-foreground/10 text-sidebar-foreground"
      : "border-gold/30 bg-gold/15 text-gold";

  const trialDaysLeft =
    isTrialing && trialEndsAt
      ? Math.max(
          0,
          Math.ceil(
            (trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
        )
      : null;

  const effectiveQuestionLimit = messageOverageEnabled
    ? questionLimit + messageOverageCap
    : questionLimit;

  const questionPercentage =
    effectiveQuestionLimit > 0
      ? Math.min((questionUsage / effectiveQuestionLimit) * 100, 100)
      : 0;
  const uploadPercentage =
    uploadLimit > 0 ? Math.min((uploadUsage / uploadLimit) * 100, 100) : 0;

  const isQuestionOver = questionUsage > effectiveQuestionLimit && effectiveQuestionLimit > 0;
  const isUploadOver = uploadUsage > uploadLimit && uploadLimit > 0;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <img src="/logo-dark-mode.png" alt="Doctrinally.AI" className="h-8 w-8 rounded-lg" />
          <span className="font-heading text-lg text-sidebar-foreground">
            Doctrinally.AI
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarMenu>
            {mainNav.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  render={<Link href={item.href} />}
                  isActive={pathname === item.href}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarMenu>
            {managementNav.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  render={<Link href={item.href} />}
                  isActive={pathname === item.href}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-sidebar-foreground">
              {churchName || "My Church"}
            </span>
            <Badge className={cn("text-xs", planBadgeClass)}>
              {planLabel}
            </Badge>
          </div>
          {isTrialing && trialDaysLeft !== null && (
            <Link
              href="/billing"
              className="flex items-center justify-between rounded-md border border-blue-400/30 bg-blue-400/10 px-2.5 py-1.5 text-xs text-blue-200 transition hover:bg-blue-400/15"
            >
              <span className="font-medium">Free trial</span>
              <span>
                {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} left
              </span>
            </Link>
          )}
          <Separator className="bg-sidebar-border" />
          {subscriptionStatus === "active" ||
          subscriptionStatus === "past_due" ||
          subscriptionStatus === "trialing" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-sidebar-foreground/60">
                <span>Messages</span>
                <span className={cn(isQuestionOver && "text-red-400 font-medium")}>
                  {questionUsage.toLocaleString()} / {effectiveQuestionLimit.toLocaleString()}
                </span>
              </div>
              <Progress
                value={questionPercentage}
                className={cn(
                  "h-1.5",
                  isQuestionOver && "[&>div]:bg-red-400"
                )}
              />
              <div className="flex items-center justify-between text-xs text-sidebar-foreground/60">
                <span>Uploads</span>
                <span className={cn(isUploadOver && "text-red-400 font-medium")}>
                  {uploadUsage.toLocaleString()} / {uploadLimit.toLocaleString()}
                </span>
              </div>
              <Progress
                value={uploadPercentage}
                className={cn(
                  "h-1.5",
                  isUploadOver && "[&>div]:bg-red-400"
                )}
              />
            </div>
          ) : (
            <p className="text-xs text-sidebar-foreground/40">
              No active subscription
            </p>
          )}
          <Separator className="bg-sidebar-border" />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="text-sidebar-foreground/60"
                onClick={() => signOut({ callbackUrl: "/sign-in" })}
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
