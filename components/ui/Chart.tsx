"use client"

import * as React from "react"
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from "recharts"

const CHART_COLORS = [
  "var(--color-primary)",
  "var(--color-success)",
  "var(--color-warning)",
  "var(--color-error)",
  "var(--color-accent)",
  "#8B5CF6",
  "#06B6D4"
]

interface BaseChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  height?: number
  className?: string
}

// 1. Line Chart
interface LineChartProps extends BaseChartProps {
  xKey: string
  series: { key: string; name: string; color?: string }[]
}

export function LineChart({ data, xKey, series, height = 300, className }: LineChartProps) {
  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" opacity={0.3} />
          <XAxis
            dataKey={xKey}
            stroke="var(--color-text-tertiary)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="var(--color-text-tertiary)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
              borderRadius: "8px",
              color: "var(--color-text-primary)",
              fontSize: "12px"
            }}
          />
          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
          {series.map((s, idx) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color || CHART_COLORS[idx % CHART_COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}

// 2. Bar Chart
interface BarChartProps extends BaseChartProps {
  xKey: string
  series: { key: string; name: string; color?: string }[]
}

export function BarChart({ data, xKey, series, height = 300, className }: BarChartProps) {
  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" opacity={0.3} vertical={false} />
          <XAxis
            dataKey={xKey}
            stroke="var(--color-text-tertiary)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="var(--color-text-tertiary)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
              borderRadius: "8px",
              color: "var(--color-text-primary)",
              fontSize: "12px"
            }}
          />
          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
          {series.map((s, idx) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              fill={s.color || CHART_COLORS[idx % CHART_COLORS.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}

// 3. Donut/Pie Chart
interface DonutChartProps extends BaseChartProps {
  nameKey: string
  valueKey: string
}

export function DonutChart({ data, nameKey, valueKey, height = 300, className }: DonutChartProps) {
  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={data}
            nameKey={nameKey}
            dataKey={valueKey}
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="80%"
            paddingAngle={3}
          >
            {data.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border-subtle)",
              borderRadius: "8px",
              color: "var(--color-text-primary)",
              fontSize: "12px"
            }}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}
