import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { WorkflowSummary } from '../types';
import { useTenant } from '../../context/TenantContext';

export function useWorkflowList() {
  const { activeTenant } = useTenant();

  return useQuery({
    queryKey: ['workflow-list', activeTenant?.id],
    queryFn: () => apiClient.getAllPages<WorkflowSummary>('/workflows'),
    enabled: !!activeTenant,
    staleTime: 5 * 60 * 1000,
  });
}
