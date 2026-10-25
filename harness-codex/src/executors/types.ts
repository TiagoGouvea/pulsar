import type { ExecutionRequest, ExecutionResult } from "../domain/types.js";

export interface Executor {
  readonly name: string;
  execute(request: ExecutionRequest): Promise<ExecutionResult>;
  cancel?(): Promise<void>;
}
