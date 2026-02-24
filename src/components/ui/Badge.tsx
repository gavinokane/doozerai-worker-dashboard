import { STATUS_BG_COLORS } from '../../lib/constants';

interface BadgeProps {
  status: string;
  className?: string;
}

export function Badge({ status, className = '' }: BadgeProps) {
  const colorClass =
    STATUS_BG_COLORS[status] ??
    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${colorClass} ${className}`}
    >
      {status}
    </span>
  );
}
