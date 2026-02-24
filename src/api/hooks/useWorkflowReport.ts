import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { WorkflowReportInstance } from '../types';
import { useTenant } from '../../context/TenantContext';
import { getApiDateRange, filterByLocalTimezone } from '../../lib/utils';

export function useWorkflowReport(dateRange: string) {
  const { activeTenant } = useTenant();
  const apiDateRange = getApiDateRange(dateRange);

  return useQuery({
    queryKey: ['workflow-report', activeTenant?.id, apiDateRange],
    queryFn: async () => {
      const data = await apiClient.get<WorkflowReportInstance[]>('/workflow/report', {
        report_type: 'simple_instances',
        date_range: apiDateRange,
        doozer_name: activeTenant?.workerId ? '' : '',
      });
      return data;
    },
    select: (data) => filterByLocalTimezone(data, dateRange),
    enabled: !!activeTenant,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
