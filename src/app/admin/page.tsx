import { Suspense } from "react";
import {
  Church,
  Users,
  FileText,
  MessageSquare,
  CreditCard,
  AlertTriangle,
  Crown,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { DateRangeSelector } from "@/components/analytics/date-range-selector";
import { TrendChart } from "@/components/analytics/trend-chart";
import { BarChartCard } from "@/components/admin/bar-chart-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getSuperAdminOverview,
  getPerChurchActivity,
  getMessageTrendAllChurches,
  getDocumentTrendAllChurches,
  getAllChurches,
  getAllUsers,
  getFailedDocuments,
} from "@/lib/actions/super-admin";
import type { DateRange } from "@/lib/date-utils";

export default async function SuperAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; tab?: string }>;
}) {
  const params = await searchParams;
  const range = (["7d", "30d", "90d", "12m"].includes(params.range ?? "")
    ? params.range
    : "30d") as DateRange;

  const [overview, churchActivity, msgTrend, docTrend, allChurches, allUsers, failedDocs] =
    await Promise.all([
      getSuperAdminOverview(),
      getPerChurchActivity(range),
      getMessageTrendAllChurches(range),
      getDocumentTrendAllChurches(range),
      getAllChurches(),
      getAllUsers(),
      getFailedDocuments(),
    ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Platform Overview"
        description="Cross-church analytics and management"
        actions={
          <Suspense>
            <DateRangeSelector />
          </Suspense>
        }
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="churches">
            Churches
            <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
              {overview.totalChurches}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="users">
            Users
            <Badge variant="secondary" className="ml-1.5 px-1.5 py-0 text-[10px]">
              {overview.totalUsers}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="failed">
            Failed
            {overview.failedDocuments > 0 && (
              <Badge variant="destructive" className="ml-1.5 px-1.5 py-0 text-[10px]">
                {overview.failedDocuments}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── Overview Tab ─── */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              title="Total Churches"
              value={overview.totalChurches}
              icon={Church}
              description={`${overview.activeChurches} active`}
            />
            <StatCard
              title="Total Users"
              value={overview.totalUsers}
              icon={Users}
            />
            <StatCard
              title="Documents"
              value={overview.totalDocuments}
              icon={FileText}
            />
            <StatCard
              title="Messages"
              value={overview.totalMessages.toLocaleString()}
              icon={MessageSquare}
            />
            <StatCard
              title="Subscriptions"
              value={overview.standardPlans + overview.enterprisePlans}
              icon={CreditCard}
              description={`${overview.standardPlans} std / ${overview.enterprisePlans} ent`}
            />
            <StatCard
              title="Failed Docs"
              value={overview.failedDocuments}
              icon={AlertTriangle}
            />
          </div>

          {overview.trialingChurches > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-2.5 text-sm text-blue-400">
              <Sparkles className="h-4 w-4" />
              <span>
                {overview.trialingChurches} church{overview.trialingChurches !== 1 ? "es" : ""} currently on free trial
              </span>
            </div>
          )}

          <BarChartCard
            title="Activity by Church"
            data={churchActivity}
          />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <TrendChart title="Messages (All Churches)" data={msgTrend} />
            <TrendChart
              title="Document Uploads (All Churches)"
              data={docTrend}
              color="#6b9e78"
            />
          </div>
        </TabsContent>

        {/* ─── Churches Tab ─── */}
        <TabsContent value="churches">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Churches</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Members</TableHead>
                    <TableHead className="text-right">Docs</TableHead>
                    <TableHead className="text-right">Messages</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allChurches.map((church) => (
                    <TableRow key={church.id}>
                      <TableCell className="font-medium">{church.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {church.slug}
                      </TableCell>
                      <TableCell>
                        {church.plan && (
                          <Badge
                            variant="secondary"
                            className={
                              church.plan === "enterprise"
                                ? "border-purple-500/30 bg-purple-500/10 text-purple-400"
                                : ""
                            }
                          >
                            {church.plan === "enterprise" && (
                              <Crown className="mr-1 h-3 w-3" />
                            )}
                            {church.plan}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={church.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {church.memberCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {church.documentCount}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {church.messageCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {church.createdAt.toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {allChurches.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        No churches yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Users Tab ─── */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">All Users</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Churches</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.name || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.churches.length === 0 && (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                          {user.churches.map((c, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {c.name}
                              <span className="ml-1 text-muted-foreground">
                                ({c.role})
                              </span>
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.createdAt.toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {allUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No users yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Failed Documents Tab ─── */}
        <TabsContent value="failed">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Failed Document Uploads</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Church</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {failedDocs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.churchName}</TableCell>
                      <TableCell>{doc.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {doc.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-sm text-destructive">
                        {doc.errorMessage || "Unknown error"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.createdAt.toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {failedDocs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No failed documents
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;

  const styles: Record<string, string> = {
    active: "border-green-500/30 bg-green-500/10 text-green-500",
    trialing: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    past_due: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    canceled: "border-red-500/30 bg-red-500/10 text-red-400",
    incomplete: "border-muted-foreground/30 bg-muted text-muted-foreground",
  };

  return (
    <Badge variant="outline" className={styles[status] ?? ""}>
      {status.replace("_", " ")}
    </Badge>
  );
}
