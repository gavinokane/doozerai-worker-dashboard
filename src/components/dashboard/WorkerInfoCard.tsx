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

  return (
    <Card>
      <div className="flex items-center gap-4">
        {worker.Picture ? (
          <img
            src={worker.Picture}
            alt={worker.Name}
            className="h-16 w-16 rounded-full object-cover ring-2 ring-primary/20"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
            {worker.Name?.charAt(0) ?? '?'}
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {worker.Name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {worker.Role ?? 'Worker'}
          </p>
          <div className="mt-1 flex items-center gap-2">
            <Badge status={worker.HireStatus?.toLowerCase() ?? 'unknown'} />
            {worker.tools?.length > 0 && (
              <span className="text-xs text-gray-400">
                {worker.tools.length} tool{worker.tools.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
