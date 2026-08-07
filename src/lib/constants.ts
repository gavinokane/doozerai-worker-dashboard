export const DATE_RANGE_OPTIONS = [
  { label: 'Last 5 Minutes', value: 'last 5 minutes' },
  { label: 'Last Hour', value: 'last hour' },
  { label: 'Last 6 Hours', value: 'last 6 hours' },
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: 'last 7 days' },
  { label: 'This Week', value: 'this week' },
  { label: 'Last Month', value: 'last month' },
  { label: 'This Month', value: 'this month' },
] as const;

// Instance statuses — non-terminal: queued | running | paused | awaiting_child;
// terminal: complete | failed | stopped (exactly these strings).
export const STATUS_COLORS: Record<string, string> = {
  complete: '#22c55e',
  failed: '#ef4444',
  running: '#3b82f6',
  queued: '#8b5cf6',
  paused: '#f59e0b',
  awaiting_child: '#06b6d4',
  stopped: '#6b7280',
};

export const STATUS_BG_COLORS: Record<string, string> = {
  complete: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  running: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  queued: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
  paused: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  awaiting_child:
    'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  stopped: 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-400',
};

export const RUNNING_STATUSES = ['queued', 'running', 'paused', 'awaiting_child'];

export const CERT_WORKFLOW_NAME = 'Certificate Submit v2';
