import { AlertCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import type { WorkflowReportInstance } from '../../api/types';
import { timeAgo, formatDuration } from '../../lib/utils';

interface ErrorSummaryProps {
  errors: WorkflowReportInstance[];
  isLoading: boolean;
}

export function ErrorSummary({ errors, isLoading }: ErrorSummaryProps) {
  return (
    <Card title="Recent Errors">
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 rounded bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : errors.length === 0 ? (
        <div className="flex items-center gap-2 py-6 text-sm text-gray-400">
          <AlertCircle size={16} className="text-green-500" />
          No errors in selected period
        </div>
      ) : (
        <div className="space-y-2">
          {errors.slice(0, 10).map((err) => (
            <div
              key={err.instanceid}
              className="flex items-center gap-3 rounded-lg border-l-4 border-red-500 bg-red-50 px-4 py-3 dark:bg-red-900/10"
            >
              <AlertCircle size={16} className="shrink-0 text-red-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {err.workflow_short_name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {timeAgo(err.createddate)} &middot;{' '}
                  {formatDuration(err.duration_seconds)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
