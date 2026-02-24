import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { WorkflowReportInstance } from '../types';
import { useTenant } from '../../context/TenantContext';

export function useWorkflowReport(dateRange: string) {
  const { activeTenant } = useTenant();

  return useQuery({
    queryKey: ['workflow-report', activeTenant?.id, dateRange],
    queryFn: () =>
      apiClient.get<WorkflowReportInstance[]>('/workflow/report', {
        report_type: 'simple_instances',
        date_range: dateRange,
        doozer_name: activeTenant?.workerId ? '' : '',
      }),
    enabled: !!activeTenant,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
