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

interface RevenueChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: Array<{ name: string; revenue: number }>;
}

export function RevenueChart({ data, className, ...props }: RevenueChartProps) {
  // Check if all data items are zero
  const isAllZero = data.every((d) => d.revenue === 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    })
      .format(val)
      .replace('INR', '₹');
  };

  return (
    <div
      className={cn(
        "bg-[#0D1829] border border-[#1E3352] rounded-[10px] p-[20px] md:p-[24px] relative",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between mb-6 select-none">
        <div>
          <h3 className="text-sm font-semibold text-[#F0F4FF]">Revenue — Last 6 Months</h3>
          <p className="text-[10px] text-[#4A6480] mt-0.5">SUM OF ALL PAID INVOICES</p>
        </div>
        <div className="text-[10px] font-semibold text-[#8BA3C7] bg-[#132035] px-2 py-0.5 rounded border border-[#1E3352] uppercase tracking-wider">
          Monthly
        </div>
      </div>

      <div className="h-[220px] w-full relative">
        {isAllZero && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0D1829]/40 backdrop-blur-[1px] z-10 text-center select-none">
            <p className="text-xs text-[#8BA3C7] max-w-xs leading-relaxed bg-[#132035] border border-[#1E3352] rounded-md px-4 py-3 shadow-xl">
              No invoices yet — revenue chart will populate as you add invoices.
            </p>
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid stroke="#1E3352" strokeDasharray="3 3" vertical={false} opacity={0.3} />
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
              tickFormatter={(v) => (v >= 1000 ? `₹${v / 1000}k` : `₹${v}`)}
              dx={-5}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-[#0D1829] border border-[#1E3352] rounded-lg p-2.5 shadow-2xl text-[12px] text-[#F0F4FF] font-semibold flex flex-col gap-0.5">
                      <span className="text-[10px] text-[#8BA3C7] uppercase tracking-wider">
                        {payload[0].payload.fullName || payload[0].name}
                      </span>
                      <span className="text-[#F97316] font-mono">
                        {formatCurrency(Number(payload[0].value))}
                      </span>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#F97316"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#F97316' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
export default RevenueChart;
