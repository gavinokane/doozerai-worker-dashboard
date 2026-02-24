import { useState, useMemo } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Header } from '../components/layout/Header';
import { WorkerInfoCard } from '../components/dashboard/WorkerInfoCard';
import { KpiCards } from '../components/dashboard/KpiCards';
import { VolumeChart } from '../components/dashboard/VolumeChart';
import { StatusBreakdown } from '../components/dashboard/StatusBreakdown';
import { WorkflowDistribution } from '../components/dashboard/WorkflowDistribution';
import { ErrorSummary } from '../components/dashboard/ErrorSummary';
import { RecentExecutions } from '../components/dashboard/RecentExecutions';
import { CertificateLookup } from '../components/dashboard/CertificateLookup';
import { useWorker } from '../api/hooks/useWorker';
import { useWorkflowReport } from '../api/hooks/useWorkflowReport';
import {
  computeMetrics,
  computeVolumeData,
  computeStatusData,
  computeDistributionData,
} from '../lib/utils';
import { useTenant } from '../context/TenantContext';
import { Spinner } from '../components/ui/Spinner';

export function DashboardPage() {
  const { activeTenant } = useTenant();
  const [dateRange, setDateRange] = useState(() => {
    return localStorage.getItem('doozer_date_range') ?? 'today';
  });

  const workerQuery = useWorker();
  const reportQuery = useWorkflowReport(dateRange);

  function handleDateRangeChange(value: string) {
    setDateRange(value);
    localStorage.setItem('doozer_date_range', value);
  }

  function handleRefresh() {
    reportQuery.refetch();
    workerQuery.refetch();
  }

  const instances = reportQuery.data ?? [];

  const metrics = useMemo(() => computeMetrics(instances), [instances]);
  const volumeData = useMemo(
    () => computeVolumeData(instances, dateRange),
    [instances, dateRange],
  );
  const statusData = useMemo(() => computeStatusData(instances), [instances]);
  const distributionData = useMemo(
    () => computeDistributionData(instances),
    [instances],
  );
  const errors = useMemo(
    () =>
      instances
        .filter((i) => i.status === 'error')
        .sort((a, b) => (b.createddate ?? '').localeCompare(a.createddate ?? '')),
    [instances],
  );

  const lastUpdated = reportQuery.dataUpdatedAt
    ? new Date(reportQuery.dataUpdatedAt)
    : null;

  if (!activeTenant) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto" />
          <p className="mt-4 text-gray-500">Loading tenant configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <Header
        dateRange={dateRange}
        onDateRangeChange={handleDateRangeChange}
        onRefresh={handleRefresh}
        lastUpdated={lastUpdated}
      />

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <WorkerInfoCard
              worker={workerQuery.data}
              isLoading={workerQuery.isLoading}
            />
          </div>
          <div className="lg:col-span-3">
            <KpiCards metrics={metrics} isLoading={reportQuery.isLoading} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <VolumeChart data={volumeData} isLoading={reportQuery.isLoading} />
          <StatusBreakdown data={statusData} isLoading={reportQuery.isLoading} />
        </div>

        <WorkflowDistribution
          data={distributionData}
          isLoading={reportQuery.isLoading}
        />

        <CertificateLookup dateRange={dateRange} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <ErrorSummary errors={errors} isLoading={reportQuery.isLoading} />
          </div>
          <div className="lg:col-span-2">
            <RecentExecutions
              instances={instances}
              isLoading={reportQuery.isLoading}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
