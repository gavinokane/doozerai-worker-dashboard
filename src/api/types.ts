export interface TenantConfig {
  id: string;
  displayName: string;
  apiKey: string;
  subscriptionKey: string;
  workerId: number;
}

export interface Worker {
  WorkerID: number;
  Name: string;
  Role: string;
  Email: string;
  HireStatus: string;
  WorkerGUID: string;
  Picture: string;
  tools: WorkerTool[];
}

export interface WorkerTool {
  ToolID: string;
  ToolName: string;
}

export interface WorkflowReportInstance {
  instanceid: string;
  workflow_short_name: string;
  doozer_name: string;
  duration_seconds: number | null;
  status: string;
  _ts: number;
  createddate: string;
  enddate: string | null;
}

export interface WorkflowDefinition {
  id: string;
  short_name: string;
  workflow_name: string;
  description: string;
  worker_id: string;
  version: number;
}

export interface WorkflowInstanceDetail {
  id: string;
  workflow_short_name: string;
  workflow_name: string;
  doozer_name: string;
  status: string;
  start_date: string;
  end_date: string | null;
  duration_seconds: number | null;
  current_step_id: string;
  completed_steps: string[];
  active_steps: string[];
  initial_variables: Record<string, unknown>;
  data_dictinary: Record<string, unknown>;
  execution_steps: ExecutionStep[];
  costs: WorkflowCosts | null;
  error_message: string | null;
  error_step_id: string | null;
  final_output: string | null;
  initiation_context: Record<string, unknown> | null;
}

export interface ExecutionStep {
  step_details: {
    step_id: string;
    step_name: string;
    type: string;
    next_step: string | string[];
    guid: string;
  };
  output_value: unknown;
  start_time: string;
  end_time: string | null;
  duration_seconds: number | null;
  status: string;
  costs: StepCosts | null;
}

export interface StepCosts {
  prompt_tokens: number;
  completion_tokens: number;
  cost: number;
}

export interface WorkflowCosts {
  prompt_tokens: number;
  completion_tokens: number;
  total_cost: number;
}
