import { format, startOfHour, startOfDay, parseISO } from 'date-fns';
import type { WorkflowReportInstance } from '../api/types';
import { STATUS_COLORS } from './constants';

export interface DashboardMetrics {
  totalExecutions: number;
  successRate: number;
  errorCount: number;
  avgDurationSeconds: number;
  runningCount: number;
}

export interface VolumeDataPoint {
  time: string;
  complete: number;
  error: number;
  other: number;
}

export interface StatusDataPoint {
  name: string;
  value: number;
  color: string;
}

export interface DistributionDataPoint {
  name: string;
  count: number;
  errors: number;
}

export function computeMetrics(instances: WorkflowReportInstance[]): DashboardMetrics {
  const total = instances.length;
  const completed = instances.filter((i) => i.status === 'complete').length;
  const errors = instances.filter((i) => i.status === 'error').length;
  const running = instances.filter((i) =>
    ['running', 'starting', 'waiting'].includes(i.status),
  ).length;
  const durations = instances
    .filter((i) => i.duration_seconds != null && i.duration_seconds > 0)
    .map((i) => i.duration_seconds!);
  const avgDuration =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

  return {
    totalExecutions: total,
    successRate: total > 0 ? (completed / total) * 100 : 0,
    errorCount: errors,
    avgDurationSeconds: avgDuration,
    runningCount: running,
  };
}

export function computeVolumeData(
  instances: WorkflowReportInstance[],
  dateRange: string,
): VolumeDataPoint[] {
  const useHourly = [
    'last 5 minutes',
    'last hour',
    'last 6 hours',
    'today',
    'yesterday',
  ].includes(dateRange);

  const bucketFn = useHourly ? startOfHour : startOfDay;
  const formatStr = useHourly ? 'HH:mm' : 'MMM dd';

  const buckets = new Map<string, VolumeDataPoint>();

  for (const instance of instances) {
    const date = parseISO(instance.createddate);
    const bucketTime = bucketFn(date);
    const key = bucketTime.toISOString();
    const label = format(bucketTime, formatStr);

    if (!buckets.has(key)) {
      buckets.set(key, { time: label, complete: 0, error: 0, other: 0 });
    }

    const bucket = buckets.get(key)!;
    if (instance.status === 'complete') {
      bucket.complete++;
    } else if (instance.status === 'error') {
      bucket.error++;
    } else {
      bucket.other++;
    }
  }

  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

export function computeStatusData(
  instances: WorkflowReportInstance[],
): StatusDataPoint[] {
  const counts = new Map<string, number>();
  for (const instance of instances) {
    counts.set(instance.status, (counts.get(instance.status) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([name, value]) => ({
    name,
    value,
    color: STATUS_COLORS[name] ?? '#6b7280',
  }));
}

export function computeDistributionData(
  instances: WorkflowReportInstance[],
): DistributionDataPoint[] {
  const groups = new Map<string, { count: number; errors: number }>();
  for (const instance of instances) {
    const name = instance.workflow_short_name;
    if (!groups.has(name)) {
      groups.set(name, { count: 0, errors: 0 });
    }
    const g = groups.get(name)!;
    g.count++;
    if (instance.status === 'error') g.errors++;
  }

  return Array.from(groups.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count);
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return '-';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins < 60) return `${mins}m ${secs}s`;
  const hrs = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hrs}h ${remainMins}m`;
}

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#6b7280';
}

export function truncateId(id: string, len = 8): string {
  return id.length > len ? id.slice(0, len) + '...' : id;
}

export function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = parseISO(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
