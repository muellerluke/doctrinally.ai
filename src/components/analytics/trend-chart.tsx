"use client";

import { useRef, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { format, parseISO } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TimeSeriesPoint } from "@/lib/actions/analytics";

interface TrendChartProps {
  title: string;
  data: TimeSeriesPoint[];
  color?: string;
  height?: number;
}

/**
 * Resolve a CSS custom property to its computed value so Recharts (which
 * needs a concrete color string, not a CSS variable) can use it.
 */
function useResolvedColor(cssVar: string, fallback: string): string {
  const ref = useRef<HTMLDivElement>(null);
  const [resolved, setResolved] = useState(fallback);

  useEffect(() => {
    const el = ref.current ?? document.documentElement;
    const raw = getComputedStyle(el).getPropertyValue(cssVar).trim();
    if (raw) setResolved(raw.startsWith("oklch") || raw.startsWith("#") ? raw : `oklch(${raw})`);
  }, [cssVar]);

  return resolved;
}

export function TrendChart({
  title,
  data,
  color,
  height = 280,
}: TrendChartProps) {
  const chartColor = useResolvedColor("--primary", "#b07a50");
  const mutedColor = useResolvedColor("--muted-foreground", "#888");
  const cardBg = useResolvedColor("--card", "#1a1412");
  const borderColor = useResolvedColor("--border", "#333");
  const strokeColor = color || chartColor;
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="flex items-center justify-center text-xs text-muted-foreground"
            style={{ height }}
          >
            No data for this period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.15} />
                <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={(v) => {
                try {
                  return format(parseISO(v), "MMM d");
                } catch {
                  return v;
                }
              }}
              tick={{ fontSize: 11, fill: mutedColor }}
              axisLine={false}
              tickLine={false}
              dy={8}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: mutedColor }}
              axisLine={false}
              tickLine={false}
              width={32}
            />
            <Tooltip
              contentStyle={{
                background: cardBg,
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
              labelStyle={{ color: mutedColor }}
              itemStyle={{ color: strokeColor }}
              labelFormatter={(v) => {
                try {
                  return format(parseISO(v as string), "MMM d, yyyy");
                } catch {
                  return v as string;
                }
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={2}
              fill={`url(#grad-${title})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
