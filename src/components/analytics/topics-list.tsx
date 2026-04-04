import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TopicCount } from "@/lib/actions/analytics";

interface TopicsListProps {
  topics: TopicCount[];
}

export function TopicsList({ topics }: TopicsListProps) {
  if (topics.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Common Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-xs text-muted-foreground">
            Topics will appear as members ask questions
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
          Common Topics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topics.map((topic, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate pr-4 text-foreground">
                  {topic.topic}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {topic.count}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/60 transition-all"
                  style={{
                    width: `${(topic.count / maxCount) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
