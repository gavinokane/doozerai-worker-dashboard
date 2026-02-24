import { useState, useMemo } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { WorkflowReportInstance } from '../../api/types';
import { formatDuration, truncateId, timeAgo } from '../../lib/utils';

interface RecentExecutionsProps {
  instances: WorkflowReportInstance[];
  isLoading: boolean;
}

type SortKey = 'workflow_short_name' | 'status' | 'duration_seconds' | 'createddate';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 15;

export function RecentExecutions({
  instances,
  isLoading,
}: RecentExecutionsProps) {
  const [sortKey, setSortKey] = useState<SortKey>('createddate');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    const arr = [...instances];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'workflow_short_name':
          cmp = a.workflow_short_name.localeCompare(b.workflow_short_name);
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'duration_seconds':
          cmp = (a.duration_seconds ?? 0) - (b.duration_seconds ?? 0);
          break;
        case 'createddate':
          cmp = a.createddate.localeCompare(b.createddate);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return arr;
  }, [instances, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
    setPage(0);
  }

  const headerBtn = (label: string, key: SortKey) => (
    <button
      onClick={() => toggleSort(key)}
      className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
    >
      {label}
      <ArrowUpDown size={12} className={sortKey === key ? 'text-primary' : ''} />
    </button>
  );

  return (
    <Card title="Recent Executions">
      {isLoading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 rounded bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : instances.length === 0 ? (
        <div className="py-8 text-center text-sm text-gray-400">
          No executions in selected period
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3 pr-4">
                    {headerBtn('Workflow', 'workflow_short_name')}
                  </th>
                  <th className="pb-3 pr-4">
                    {headerBtn('Status', 'status')}
                  </th>
                  <th className="pb-3 pr-4">
                    {headerBtn('Duration', 'duration_seconds')}
                  </th>
                  <th className="pb-3 pr-4">
                    {headerBtn('Started', 'createddate')}
                  </th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Instance ID
                  </th>
                </tr>
              </thead>
              <tbody>
                {paged.map((inst) => (
                  <tr
                    key={inst.instanceid}
                    className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-700/50 dark:hover:bg-gray-700/30"
                  >
                    <td className="py-3 pr-4 font-medium text-gray-900 dark:text-white">
                      {inst.workflow_short_name}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge status={inst.status} />
                    </td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                      {formatDuration(inst.duration_seconds)}
                    </td>
                    <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                      {timeAgo(inst.createddate)}
                    </td>
                    <td className="py-3 font-mono text-xs text-gray-400">
                      {truncateId(inst.instanceid, 12)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                {sorted.length} total &middot; Page {page + 1} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Prev
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
