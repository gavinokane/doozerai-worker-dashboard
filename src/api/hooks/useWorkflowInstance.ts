import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { WorkflowInstanceDetail } from '../types';
import { useTenant } from '../../context/TenantContext';

export function useWorkflowInstance(instanceId: string | null) {
  const { activeTenant } = useTenant();

  return useQuery({
    queryKey: ['workflow-instance', activeTenant?.id, instanceId],
    queryFn: () =>
      apiClient.get<WorkflowInstanceDetail>('/workflow/instance', {
        instance_id: instanceId!,
      }),
    enabled: !!activeTenant && !!instanceId,
    staleTime: 60 * 1000,
  });
}
