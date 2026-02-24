import { ChevronDown, RefreshCw } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useTenant } from '../../context/TenantContext';
import { DATE_RANGE_OPTIONS } from '../../lib/constants';
import { useState, useRef, useEffect } from 'react';

interface HeaderProps {
  dateRange: string;
  onDateRangeChange: (value: string) => void;
  onRefresh: () => void;
  lastUpdated: Date | null;
}

export function Header({
  dateRange,
  onDateRangeChange,
  onRefresh,
  lastUpdated,
}: HeaderProps) {
  const { tenants, activeTenant, setActiveTenant } = useTenant();
  const [tenantOpen, setTenantOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const tenantRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tenantRef.current && !tenantRef.current.contains(e.target as Node))
        setTenantOpen(false);
      if (dateRef.current && !dateRef.current.contains(e.target as Node))
        setDateOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const dateLabel =
    DATE_RANGE_OPTIONS.find((o) => o.value === dateRange)?.label ?? dateRange;

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white/80 px-6 py-3 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/80">
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Dashboard
        </h2>
        {lastUpdated && (
          <span className="text-xs text-gray-400">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Date Range Selector */}
        <div className="relative" ref={dateRef}>
          <button
            onClick={() => setDateOpen(!dateOpen)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {dateLabel}
            <ChevronDown size={14} />
          </button>
          {dateOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
              {DATE_RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    onDateRangeChange(opt.value);
                    setDateOpen(false);
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    dateRange === opt.value
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tenant Selector */}
        <div className="relative" ref={tenantRef}>
          <button
            onClick={() => setTenantOpen(!tenantOpen)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            {activeTenant?.displayName ?? 'Select Tenant'}
            <ChevronDown size={14} />
          </button>
          {tenantOpen && (
            <div className="absolute right-0 top-full mt-1 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800">
              {tenants.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setActiveTenant(t.id);
                    setTenantOpen(false);
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    activeTenant?.id === t.id
                      ? 'bg-primary/10 font-medium text-primary'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {t.displayName}
                  <span className="ml-1 text-xs text-gray-400">
                    (Worker {t.workerId})
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onRefresh}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          title="Refresh data"
        >
          <RefreshCw size={18} />
        </button>

        <ThemeToggle />
      </div>
    </header>
  );
}
