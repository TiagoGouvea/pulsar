import type { ProviderModality } from "../domain/types.js";

export function shouldMarkProviderCostUncertain(input: {
  modality: ProviderModality;
  outcome: "ready_for_verification" | "changes_requested" | "blocked" | "failed";
  hasUsage: boolean;
  partialUsage?: boolean;
  phase?: string;
}): boolean {
  if (input.modality !== "metered_api" || input.outcome !== "failed") return false;
  if (input.hasUsage && !input.partialUsage) return false;
  return !["runtime_setup", "session_setup"].includes(input.phase ?? "");
}
