"use client";

import { useRef, useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BarChartCardProps {
  title: string;
  data: { churchName: string; messages: number; documents: number }[];
  height?: number;
}

function useResolvedColor(cssVar: string, fallback: string): string {
  const ref = useRef<HTMLDivElement>(null);
  const [resolved, setResolved] = useState(fallback);

  useEffect(() => {
    const el = ref.current ?? document.documentElement;
    const raw = getComputedStyle(el).getPropertyValue(cssVar).trim();
    if (raw)
      setResolved(
        raw.startsWith("oklch") || raw.startsWith("#") ? raw : `oklch(${raw})`
      );
  }, [cssVar]);

  return resolved;
}

export function BarChartCard({
  title,
  data,
  height = 400,
}: BarChartCardProps) {
  const primaryColor = useResolvedColor("--primary", "#b07a50");
  const mutedColor = useResolvedColor("--muted-foreground", "#888");
  const cardBg = useResolvedColor("--card", "#1a1412");
  const borderColor = useResolvedColor("--border", "#333");

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
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <XAxis
              dataKey="churchName"
              tick={{ fontSize: 11, fill: mutedColor }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={80}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: mutedColor }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: cardBg,
                border: `1px solid ${borderColor}`,
                borderRadius: 8,
                fontSize: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
              labelStyle={{ color: mutedColor, marginBottom: 4 }}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            />
            <Bar
              dataKey="messages"
              name="Messages"
              fill={primaryColor}
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="documents"
              name="Documents"
              fill="#6b9e78"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
