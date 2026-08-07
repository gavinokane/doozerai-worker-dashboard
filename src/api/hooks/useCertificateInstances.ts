import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';
import type { CertificateSubmission, WorkflowInstanceSummary } from '../types';
import { useTenant } from '../../context/TenantContext';
import { getDateRangeParams } from '../../lib/utils';
import { CERT_WORKFLOW_NAME } from '../../lib/constants';
import { useWorkflowList } from './useWorkflowList';

/**
 * Certificate submissions for the date range. Discovers the workflow by
 * exact name, then fetches its instances with fields=full so
 * data_dictionary arrives in one list call (no per-instance detail fetch).
 */
export function useCertificateInstances(dateRange: string) {
  const { activeTenant } = useTenant();
  const workflowsQuery = useWorkflowList();

  const certWorkflow = workflowsQuery.data?.find(
    (w) => w.workflow_name === CERT_WORKFLOW_NAME,
  );

  const instancesQuery = useQuery({
    queryKey: [
      'certificate-instances',
      activeTenant?.id,
      certWorkflow?.workflow_guid,
      dateRange,
    ],
    queryFn: () =>
      apiClient.getAllPages<WorkflowInstanceSummary>('/workflow-instances', {
        ...getDateRangeParams(dateRange),
        workflow_guid: certWorkflow!.workflow_guid,
        fields: 'full',
      }),
    enabled: !!activeTenant && !!certWorkflow,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const submissions: CertificateSubmission[] = (instancesQuery.data ?? []).map(
    (inst) => {
      const d = inst.data_dictionary ?? {};
      return {
        instanceId: inst.id,
        certificateNumber: String(d.certificate_number ?? ''),
        customerName: String(d.customer_name ?? ''),
        customerEmail: String(d.customer_email ?? ''),
        exactAddress: String(d.exact_address ?? ''),
        status: inst.status,
        createdDate: inst.start_date,
      };
    },
  );

  return {
    submissions,
    isLoading: workflowsQuery.isLoading || instancesQuery.isLoading,
    isError: workflowsQuery.isError || instancesQuery.isError,
    // Workflow-name discovery failed → the panel explains instead of erroring
    workflowFound: !workflowsQuery.isLoading ? !!certWorkflow : true,
  };
}
