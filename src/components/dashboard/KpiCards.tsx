import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Card } from '../ui/Card';
import type { DashboardMetrics } from '../../lib/utils';
import { formatDuration } from '../../lib/utils';

interface KpiCardsProps {
  metrics: DashboardMetrics;
  isLoading: boolean;
}

export function KpiCards({ metrics, isLoading }: KpiCardsProps) {
  const cards = [
    {
      label: 'Total Executions',
      value: metrics.totalExecutions.toString(),
      icon: Activity,
      color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30',
    },
    {
      label: 'Success Rate',
      value: `${metrics.successRate.toFixed(1)}%`,
      icon: CheckCircle2,
      color:
        'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30',
    },
    {
      label: 'Errors',
      value: metrics.errorCount.toString(),
      icon: AlertTriangle,
      color: 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30',
    },
    {
      label: 'Avg Duration',
      value: formatDuration(metrics.avgDurationSeconds),
      icon: Clock,
      color:
        'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-8 w-16 rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {card.label}
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
                  {card.value}
                </p>
              </div>
              <div className={`rounded-lg p-2.5 ${card.color}`}>
                <card.icon size={20} />
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
