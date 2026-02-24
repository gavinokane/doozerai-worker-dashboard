import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  type PieLabelRenderProps,
} from 'recharts';
import { Card } from '../ui/Card';
import type { StatusDataPoint } from '../../lib/utils';

interface StatusBreakdownProps {
  data: StatusDataPoint[];
  isLoading: boolean;
}

export function StatusBreakdown({ data, isLoading }: StatusBreakdownProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <Card title="Status Breakdown">
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-48 w-48 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">
          No data for selected period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              dataKey="value"
              nameKey="name"
              label={(props: PieLabelRenderProps) =>
                `${props.name ?? ''} (${(((props.percent as number) ?? 0) * 100).toFixed(0)}%)`
              }
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f3f4f6',
              }}
            />
            <Legend />
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-gray-900 text-2xl font-bold dark:fill-white"
            >
              {total}
            </text>
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
