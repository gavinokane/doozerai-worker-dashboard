import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { Worker } from '../types';
import { useTenant } from '../../context/TenantContext';

export function useWorker() {
  const { activeTenant } = useTenant();

  return useQuery({
    queryKey: ['worker', activeTenant?.id, activeTenant?.workerGuid],
    queryFn: () =>
      apiClient.get<Worker>(`/workers/${activeTenant!.workerGuid}`),
    enabled: !!activeTenant,
    staleTime: 5 * 60 * 1000,
  });
}
