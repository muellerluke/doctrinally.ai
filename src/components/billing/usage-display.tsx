import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface UsageDisplayProps {
  label: string;
  current: number;
  limit: number;
  overageCost?: number;
}

export function UsageDisplay({
  label,
  current,
  limit,
  overageCost,
}: UsageDisplayProps) {
  const percentage = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const isOverLimit = current > limit;
  const isNearLimit = percentage >= 80 && !isOverLimit;
  const overage = Math.max(0, current - limit);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span
          className={cn(
            "tabular-nums",
            isOverLimit && "font-semibold text-destructive",
            isNearLimit && "text-amber-600"
          )}
        >
          {current.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <Progress
        value={percentage}
        className={cn(
          "h-2",
          isOverLimit && "[&>div]:bg-destructive",
          isNearLimit && "[&>div]:bg-amber-500"
        )}
      />
      {isOverLimit && (
        <p className="text-xs text-destructive">
          {overage.toLocaleString()} over limit
          {overageCost !== undefined && overageCost > 0 && (
            <span className="ml-1">
              &middot; ${overageCost.toFixed(2)} estimated overage
            </span>
          )}
        </p>
      )}
    </div>
  );
}
