import { Suspense } from "react";
import {
  MessageSquare,
  Upload,
  Users,
  HelpCircle,
  BarChart3,
} from "lucide-react";
import { requireMembership } from "@/lib/auth-guards";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { DateRangeSelector } from "@/components/analytics/date-range-selector";
import { TrendChart } from "@/components/analytics/trend-chart";
import { TopicsList } from "@/components/analytics/topics-list";
import { UnansweredList } from "@/components/analytics/unanswered-list";
import {
  getAnalyticsSummary,
  getQuestionTrend,
  getTopTopics,
  getRecentUnanswered,
  type DateRange,
} from "@/lib/actions/analytics";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { membership } = await requireMembership();
  const params = await searchParams;
  const range = (["7d", "30d", "90d", "12m"].includes(params.range ?? "")
    ? params.range
    : "30d") as DateRange;

  const churchId = membership.churchId;

  const [summary, questionTrend, topics, unanswered] = await Promise.all([
    getAnalyticsSummary(churchId, range),
    getQuestionTrend(churchId, range),
    getTopTopics(churchId, range),
    getRecentUnanswered(churchId),
  ]);

  const isEmpty =
    summary &&
    summary.questions === 0 &&
    summary.uploads === 0 &&
    summary.visitors === 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of your church's activity"
        actions={
          <Suspense>
            <DateRangeSelector />
          </Suspense>
        }
      />

      {isEmpty ? (
        <EmptyState
          icon={BarChart3}
          title="No activity yet"
          description="Messages, uploads, and visitor data will appear here once members start using your AI assistant. Upload some documents to get started!"
        />
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Messages"
              value={summary?.questions ?? 0}
              description="vs previous period"
              icon={MessageSquare}
              delta={summary?.questionsDelta}
            />
            <StatCard
              title="Document Uploads"
              value={summary?.uploads ?? 0}
              description="vs previous period"
              icon={Upload}
              delta={summary?.uploadsDelta}
            />
            <StatCard
              title="Visitors"
              value={summary?.visitors ?? 0}
              description="vs previous period"
              icon={Users}
              delta={summary?.visitorsDelta}
            />
            <StatCard
              title="Unanswered"
              value={summary?.unanswered ?? 0}
              description="vs previous period"
              icon={HelpCircle}
              delta={summary?.unansweredDelta}
            />
          </div>

          {/* Trend chart */}
          <TrendChart title="Messages Over Time" data={questionTrend} />

          {/* Bottom grid */}
          <div className="grid gap-5 lg:grid-cols-2">
            <TopicsList topics={topics} />
            <UnansweredList questions={unanswered} />
          </div>
        </>
      )}
    </div>
  );
}
