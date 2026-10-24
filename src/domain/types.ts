export const RUN_STATES = [
  "created", "preflight", "planning", "running", "verifying", "awaiting_human",
  "blocked", "paused_budget", "paused", "failed", "completed", "cancelled",
] as const;

export const TASK_STATES = [
  "pending", "ready", "running", "verifying", "changes_requested", "passed",
  "blocked", "failed", "cancelled",
] as const;

export const MILESTONE_STATES = [
  "planned", "in_progress", "automated_review", "awaiting_human", "changes_requested",
  "approved", "blocked",
] as const;

export type RunState = (typeof RUN_STATES)[number];
export type TaskState = (typeof TASK_STATES)[number];
export type MilestoneState = (typeof MILESTONE_STATES)[number];
export type Role = "planner" | "implementer" | "testAuthor" | "diagnostic" |
  "functionalReviewer" | "visualReviewer" | "securityReviewer" | "learningAnalyst";
export type ProviderModality = "metered_api" | "subscription" | "local" | "fake";

export interface Requirement {
  id: string;
  sourcePath: string;
  sourceSection: string;
  description: string;
  priority: "required" | "optional" | "out_of_scope";
  acceptanceCriteria: string[];
  risks: string[];
  dependencies: string[];
  verificationMethod: string;
}

export interface Task {
  id: string;
  runId: string;
  milestoneId: string;
  title: string;
  description: string;
  state: TaskState;
  role: Role;
  requirementIds: string[];
  dependencies: string[];
  acceptanceCriteria: string[];
  plannedFiles: string[];
  maxAttempts: number;
}

export interface ModelCandidate {
  alias: string;
  executor: "pi" | "fake";
  provider: string;
  modelId: string;
  version?: string | undefined;
  endpoint?: string | undefined;
  quantization?: string | undefined;
  family: string;
  modality: ProviderModality;
  capabilities: Array<"text" | "vision" | "tools" | "structured_output" | "reasoning">;
  roles: Role[];
  enabled: boolean;
  contextTokens: number;
  maxOutputTokens: number;
  inputUsdPerMillion?: string | undefined;
  outputUsdPerMillion?: string | undefined;
  credentialEnv?: string | undefined;
}

export interface ExecutionRequest {
  runId: string;
  attemptId: string;
  task: Task;
  workspace: string;
  prompt: string;
  candidate: ModelCandidate;
  timeoutMs: number;
  outputDirectory: string;
}

export interface ExecutionResult {
  taskId: string;
  outcome: "ready_for_verification" | "blocked" | "failed";
  summary: string;
  changedFiles: string[];
  claimedChecks: string[];
  decisions: string[];
  blockers: string[];
  suggestedFollowUps: string[];
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    cachedTokens?: number;
    reasoningTokens?: number;
    costUsd?: string;
    providerRequestId?: string;
  };
}

export interface CheckResult {
  id: string;
  status: "pass" | "warn" | "block" | "skip";
  scope: "global" | "stage";
  importance: "required" | "recommended" | "informational";
  summary: string;
  evidence: string;
  remediation?: string;
}
