export interface TenantConfig {
  id: string;
  displayName: string;
  /** Platform REST base, ends in /api (e.g. https://func-doozer-c824-api-dev.azurewebsites.net/api) */
  apiBaseUrl: string;
  /** Tenant-scoped X-Api-Key */
  apiKey: string;
  tenantGuid: string;
  workerGuid: string;
}

export interface Worker {
  worker_guid: string;
  name: string;
  role: string | null;
  description: string | null;
  email: string | null;
  picture: string | null;
  hire_status: string | null;
  tool_guids: string[];
  knowledge_guids: string[];
}

export interface Paged<T> {
  items: T[];
  total_count?: number;
  page?: number;
  page_size?: number;
  status_counts?: Record<string, number>;
}

export interface WorkflowSummary {
  workflow_guid: string;
  workflow_name: string;
  description: string | null;
  version: number;
  step_count?: number;
  updated_at?: string;
}

/** Item from GET /tenants/{t}/workflow-instances (fields=summary). */
export interface WorkflowInstanceSummary {
  id: string;
  workflow_guid: string;
  workflow_short_name: string;
  worker_guid: string | null;
  status: string;
  start_date: string;
  end_date: string | null;
  duration_seconds: number | null;
  created_at: string;
  error_message: string | null;
  /** Present only with fields=full */
  data_dictionary?: Record<string, unknown>;
  final_output?: unknown;
}

export interface InstanceStepCosts {
  prompt_tokens?: number;
  completion_tokens?: number;
  cost?: number;
  model?: string;
}

export interface InstanceStep {
  sequence: number;
  step_id: string;
  step_name: string;
  status: string;
  start_time: string;
  end_time: string | null;
  result?: { output?: unknown } | null;
  costs?: InstanceStepCosts | null;
  warnings?: unknown[];
}

export interface WorkflowInstanceDetail {
  id: string;
  workflow_guid: string;
  workflow_short_name: string;
  status: string;
  start_date: string;
  end_date: string | null;
  duration_seconds: number | null;
  data_dictionary: Record<string, unknown>;
  /** string from LLM paths, dict/list from HTTP paths — parse tolerantly */
  final_output: unknown;
  error_message?: string | null;
  failed_step_id?: string | null;
  failed_step_name?: string | null;
  cumulative_tokens?: number;
  cumulative_cost_usd?: number;
  steps?: InstanceStep[];
}

export interface CertificateSubmission {
  instanceId: string;
  certificateNumber: string;
  customerName: string;
  customerEmail: string;
  exactAddress: string;
  status: string;
  createdDate: string;
}
