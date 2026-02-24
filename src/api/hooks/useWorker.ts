import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { Worker } from '../types';
import { useTenant } from '../../context/TenantContext';

export function useWorker() {
  const { activeTenant } = useTenant();

  return useQuery({
    queryKey: ['worker', activeTenant?.id, activeTenant?.workerId],
    queryFn: () =>
      apiClient.get<Worker>(`/worker/${activeTenant!.workerId}`),
    enabled: !!activeTenant,
    staleTime: 5 * 60 * 1000,
  });
}
