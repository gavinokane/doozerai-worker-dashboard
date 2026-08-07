import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Worker } from '../../api/types';

interface WorkerInfoCardProps {
  worker: Worker | undefined;
  isLoading: boolean;
}

export function WorkerInfoCard({ worker, isLoading }: WorkerInfoCardProps) {
  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="space-y-2">
            <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>
      </Card>
    );
  }

  if (!worker) return null;

  const toolCount = worker.tool_guids?.length ?? 0;

  return (
    <Card>
      <div className="flex items-center gap-4">
        {worker.picture ? (
          <img
            src={worker.picture}
            alt={worker.name}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
            {worker.name?.charAt(0) ?? '?'}
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {worker.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {worker.role ?? 'Worker'}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Badge status={worker.hire_status?.toLowerCase() ?? 'unknown'} />
            {toolCount > 0 && (
              <span className="text-xs text-gray-400">
                {toolCount} tool{toolCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
