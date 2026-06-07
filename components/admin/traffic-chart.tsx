'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { cn } from '@/lib/utils';

interface TrafficChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: Array<{ name: string; traffic: number; fullName?: string }>;
}

export function TrafficChart({ data, className, ...props }: TrafficChartProps) {
  // Check if all data items are zero
  const isAllZero = data.every((d) => d.traffic === 0);

  return (
    <div
      className={cn(
        "bg-bg-card border border-border/30 rounded-[10px] p-[20px] md:p-[24px] relative",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between mb-6 select-none">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Organic Traffic — Last 6 Months</h3>
          <p className="text-[10px] text-text-tertiary mt-0.5">GOOGLE SEARCH CONSOLE & ANALYTICS SESSIONS</p>
        </div>
        <div className="text-[10px] font-semibold text-text-secondary bg-bg-card-hover/20 px-2 py-0.5 rounded border border-border/30 uppercase tracking-wider">
          Monthly
        </div>
      </div>

      <div className="h-[220px] w-full relative">
        {isAllZero && (
          <div className="absolute inset-0 flex items-center justify-center bg-bg-card/40 backdrop-blur-[1px] z-10 text-center select-none">
            <p className="text-xs text-text-secondary max-w-xs leading-relaxed bg-bg-card-hover/20 border border-border/30 rounded-md px-4 py-3 shadow-xl">
              No traffic data yet — traffic chart will populate as data is synced.
            </p>
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" vertical={false} opacity={0.3} />
            <XAxis
              dataKey="name"
              stroke="#4A6480"
              fontSize={11}
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis
              stroke="#4A6480"
              fontSize={11}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
              dx={-5}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-bg-card border border-border/30 rounded-lg p-2.5 shadow-2xl text-[12px] text-text-primary font-semibold flex flex-col gap-0.5">
                      <span className="text-[10px] text-text-secondary uppercase tracking-wider">
                        {payload[0].payload.fullName || payload[0].name}
                      </span>
                      <span className="text-[#1B4FD8] font-mono">
                        {Number(payload[0].value).toLocaleString()} visits
                      </span>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="traffic"
              stroke="var(--color-primary)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#1B4FD8' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
export default TrafficChart;
