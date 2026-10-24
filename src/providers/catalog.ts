import type { HarnessConfig } from "../config/schema.js";
import type { ModelCandidate, Role } from "../domain/types.js";

export class ModelCatalog {
  constructor(private readonly config: HarnessConfig) {}

  list(): ModelCandidate[] { return this.config.models; }

  get(alias: string): ModelCandidate {
    const candidate = this.config.models.find((item) => item.alias === alias);
    if (!candidate) throw new Error(`Modelo não encontrado no catálogo: ${alias}`);
    return candidate;
  }

  select(role: Role, required: ModelCandidate["capabilities"] = ["text"]): ModelCandidate {
    const candidates = this.config.models.filter((candidate) =>
      candidate.enabled && candidate.roles.includes(role) && required.every((capability) => candidate.capabilities.includes(capability)),
    );
    const executorMatch = candidates.find((candidate) => candidate.executor === this.config.execution.executor);
    if (!executorMatch) {
      throw new Error(`Nenhum candidato elegível para ${role} com capacidades ${required.join(", ")}.`);
    }
    return executorMatch;
  }
}
