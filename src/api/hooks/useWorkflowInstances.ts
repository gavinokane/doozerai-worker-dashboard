import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { WorkflowInstanceSummary } from '../types';
import { useTenant } from '../../context/TenantContext';
import { getDateRangeParams } from '../../lib/utils';

/**
 * Tenant-wide instance list for the selected date range.
 * GET /tenants/{t}/workflow-instances — the server filters on
 * date_from/date_to (UTC), so no client-side timezone re-filtering.
 */
export function useWorkflowInstances(dateRange: string) {
  const { activeTenant } = useTenant();

  return useQuery({
    queryKey: ['workflow-instances', activeTenant?.id, dateRange],
    queryFn: () =>
      apiClient.getAllPages<WorkflowInstanceSummary>(
        '/workflow-instances',
        getDateRangeParams(dateRange),
      ),
    enabled: !!activeTenant,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
