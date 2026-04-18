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
  Sparkles,
} from "lucide-react";
import { formatCents } from "@/lib/sermons/token-budget";
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
import { ChurchSwitcher } from "@/components/layouts/church-switcher";
import { cn } from "@/lib/utils";

const baseMainNav = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Documents", href: "/documents", icon: FileText },
  { label: "Members", href: "/members", icon: Users },
] as const;

interface AvailableChurch {
  churchId: string;
  churchName: string;
  churchSlug: string;
  role: "owner" | "admin" | "member";
  membershipId: string;
}

interface AdminSidebarProps {
  churchName?: string;
  plan?: string;
  subscriptionStatus?: string;
  questionUsage?: number;
  questionLimit?: number;
  membershipRole?: string;
  trialEndsAt?: Date | null;
  messageOverageEnabled?: boolean;
  messageOverageCap?: number;
  availableChurches?: AvailableChurch[];
  activeChurchId?: string;
  sermonBudgetCents?: number;
  sermonSpentCents?: number;
  hasSermonWriter?: boolean;
}

export function AdminSidebar({
  churchName,
  plan,
  subscriptionStatus,
  questionUsage = 0,
  questionLimit = 0,
  membershipRole,
  trialEndsAt,
  messageOverageEnabled = false,
  messageOverageCap = 0,
  availableChurches = [],
  activeChurchId,
  sermonBudgetCents = 0,
  sermonSpentCents = 0,
  hasSermonWriter: hasSermonWriterProp = false,
}: AdminSidebarProps) {
  const pathname = usePathname();
  const isOwner = membershipRole === "owner";
  const canAuthorSermons =
    hasSermonWriterProp && (membershipRole === "owner" || membershipRole === "admin");

  const mainNav = canAuthorSermons
    ? [
        ...baseMainNav,
        { label: "Sermons", href: "/sermons", icon: Sparkles },
      ]
    : baseMainNav;

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

  const isQuestionOver = questionUsage > effectiveQuestionLimit && effectiveQuestionLimit > 0;

  const sermonPct =
    sermonBudgetCents > 0
      ? Math.min((sermonSpentCents / sermonBudgetCents) * 100, 100)
      : 0;
  const sermonOver = sermonBudgetCents > 0 && sermonSpentCents >= sermonBudgetCents;

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
          {availableChurches.length > 1 && activeChurchId ? (
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <ChurchSwitcher
                  churches={availableChurches}
                  activeChurchId={activeChurchId}
                />
              </div>
              <Badge className={cn("text-xs", planBadgeClass)}>
                {planLabel}
              </Badge>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-sidebar-foreground">
                {churchName || "My Church"}
              </span>
              <Badge className={cn("text-xs", planBadgeClass)}>
                {planLabel}
              </Badge>
            </div>
          )}
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
            <div className="space-y-3">
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
              </div>
              {hasSermonWriterProp ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-sidebar-foreground/60">
                    <span>Sermon AI</span>
                    <span className={cn(sermonOver && "text-red-400 font-medium")}>
                      {formatCents(sermonSpentCents)} / {formatCents(sermonBudgetCents)}
                    </span>
                  </div>
                  <Progress
                    value={sermonPct}
                    className={cn(
                      "h-1.5",
                      sermonOver && "[&>div]:bg-red-400"
                    )}
                  />
                </div>
              ) : (
                <Link
                  href="/billing"
                  className="flex items-center justify-between rounded-md border border-sidebar-border/60 bg-sidebar-foreground/5 px-2.5 py-1.5 text-[11px] text-sidebar-foreground/70 transition hover:bg-sidebar-foreground/10"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" />
                    Sermon writer
                  </span>
                  <span className="text-sidebar-foreground/50">Enterprise</span>
                </Link>
              )}
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
