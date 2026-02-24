import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card } from '../ui/Card';
import type { VolumeDataPoint } from '../../lib/utils';

interface VolumeChartProps {
  data: VolumeDataPoint[];
  isLoading: boolean;
}

export function VolumeChart({ data, isLoading }: VolumeChartProps) {
  return (
    <Card title="Execution Volume">
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-48 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">
          No data for selected period
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#f3f4f6',
              }}
            />
            <Legend />
            <Bar
              dataKey="complete"
              name="Complete"
              fill="#22c55e"
              radius={[2, 2, 0, 0]}
              stackId="a"
            />
            <Bar
              dataKey="error"
              name="Error"
              fill="#ef4444"
              radius={[2, 2, 0, 0]}
              stackId="a"
            />
            <Bar
              dataKey="other"
              name="Other"
              fill="#6b7280"
              radius={[2, 2, 0, 0]}
              stackId="a"
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
