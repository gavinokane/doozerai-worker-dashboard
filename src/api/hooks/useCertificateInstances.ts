import { useQuery, useQueries } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { WorkflowReportInstance, WorkflowInstanceDetail, CertificateSubmission } from '../types';
import { useTenant } from '../../context/TenantContext';
import { getApiDateRange, filterByLocalTimezone } from '../../lib/utils';

const CERT_WORKFLOW = 'Certificate Submit v2';

export function useCertificateInstances(dateRange: string) {
  const { activeTenant } = useTenant();
  const apiDateRange = getApiDateRange(dateRange);

  const reportQuery = useQuery({
    queryKey: ['certificate-report', activeTenant?.id, apiDateRange],
    queryFn: () =>
      apiClient.get<WorkflowReportInstance[]>('/workflow/report', {
        report_type: 'simple_instances',
        date_range: apiDateRange,
      }),
    enabled: !!activeTenant,
    staleTime: 30_000,
    refetchInterval: 60_000,
    select: (data) =>
      filterByLocalTimezone(data, dateRange).filter(
        (inst) => inst.workflow_short_name === CERT_WORKFLOW,
      ),
  });

  const certInstances = reportQuery.data ?? [];

  const detailQueries = useQueries({
    queries: certInstances.map((inst) => ({
      queryKey: ['workflow-instance', activeTenant?.id, inst.instanceid],
      queryFn: () =>
        apiClient.get<WorkflowInstanceDetail>('/workflow/instance', {
          instance_id: inst.instanceid,
        }),
      enabled: !!activeTenant && !!inst.instanceid,
      staleTime: 10 * 60_000,
    })),
  });

  const isLoading =
    reportQuery.isLoading || detailQueries.some((q) => q.isLoading);

  const submissions: CertificateSubmission[] = detailQueries
    .filter((q) => q.data)
    .map((q) => {
      const detail = q.data!;
      const d = detail.data_dictinary ?? {};
      return {
        instanceId: detail.id,
        certificateNumber: String(d.certificate_number ?? ''),
        customerName: String(d.customer_name ?? ''),
        customerEmail: String(d.customer_email ?? ''),
        exactAddress: String(d.exact_address ?? ''),
        status: detail.status,
        createdDate: detail.start_date,
      };
    });

  return {
    submissions,
    isLoading,
    isError: reportQuery.isError,
    totalInstances: certInstances.length,
    loadedInstances: detailQueries.filter((q) => q.data).length,
  };
}
