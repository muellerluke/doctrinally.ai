import { formatDistanceToNow } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UncoveredTopic } from "@/lib/actions/analytics";

interface UncoveredTopicsListProps {
  topics: UncoveredTopic[];
}

export function UncoveredTopicsList({ topics }: UncoveredTopicsListProps) {
  if (topics.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Uncovered Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-xs text-muted-foreground">
            All topics have been covered by your content library
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = topics[0]?.count ?? 1;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Uncovered Topics
        </CardTitle>
        <p className="text-[11px] text-muted-foreground/70">
          Topics members asked about where no citations were found
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topics.map((t) => (
            <div key={t.topic} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span className="truncate text-sm font-medium text-foreground">
                    {t.topic}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {t.count} {t.count === 1 ? "question" : "questions"}
                  </span>
                </div>
              </div>
              <div className="ml-[22px]">
                <div className="h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-amber-500/60"
                    style={{ width: `${(t.count / maxCount) * 100}%` }}
                  />
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                  Last asked{" "}
                  {formatDistanceToNow(new Date(t.lastAskedAt), {
                    addSuffix: true,
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
