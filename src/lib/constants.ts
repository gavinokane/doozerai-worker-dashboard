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

export const STATUS_COLORS: Record<string, string> = {
  complete: '#22c55e',
  error: '#ef4444',
  running: '#3b82f6',
  starting: '#8b5cf6',
  waiting: '#f59e0b',
  terminated: '#6b7280',
};

export const STATUS_BG_COLORS: Record<string, string> = {
  complete: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  running: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  starting: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
  waiting: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  terminated: 'bg-gray-100 text-gray-800 dark:bg-gray-700/30 dark:text-gray-400',
};

export const DEFAULT_TENANT = {
  id: 'legendary-plumbing-default',
  displayName: 'Legendary Plumbing',
  apiKey: '7b5b51b4c958492e91d3c5572c86ce38',
  subscriptionKey: '741b40213d07416383224a172da313ba',
  workerId: 215,
};
