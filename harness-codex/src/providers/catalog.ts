import type { HarnessConfig } from "../config/schema.js";
import type { ModelCandidate, Role } from "../domain/types.js";

function hashSeed(seed: string): number {
  let hash = 0;
  for (const character of seed) hash = ((hash * 31) + (character.codePointAt(0) ?? 0)) >>> 0;
  return hash;
}

export class ModelCatalog {
  constructor(private readonly config: HarnessConfig) {}

  list(): ModelCandidate[] { return this.config.models; }

  get(alias: string): ModelCandidate {
    const candidate = this.config.models.find((item) => item.alias === alias);
    if (!candidate) throw new Error(`Modelo não encontrado no catálogo: ${alias}`);
    return candidate;
  }

  private eligible(role: Role, required: ModelCandidate["capabilities"]): ModelCandidate[] {
    return this.config.models.filter((candidate) =>
      candidate.enabled && candidate.roles.includes(role) && required.every((capability) => candidate.capabilities.includes(capability)),
    );
  }

  private configuredPool(role: Role, hard: boolean): string[] | undefined {
    if (!this.config.routing) return undefined;
    if (role === "implementer" && hard) return this.config.routing.pools.hardImplementer;
    return this.config.routing.pools[role];
  }

  isHardTask(text: string): boolean {
    return this.config.routing?.hardTaskPatterns.some((pattern) => new RegExp(pattern, "i").test(text)) ?? false;
  }

  select(role: Role, required: ModelCandidate["capabilities"] = ["text"], options: { attempt?: number; seed?: string; hard?: boolean } = {}): ModelCandidate {
    const eligible = this.eligible(role, required).filter((candidate) => candidate.executor === this.config.execution.executor);
    const aliases = this.configuredPool(role, options.hard ?? false);
    const candidates = aliases
      ? aliases.map((alias) => eligible.find((candidate) => candidate.alias === alias)).filter((candidate): candidate is ModelCandidate => Boolean(candidate))
      : eligible;
    if (!candidates.length) {
      throw new Error(`Nenhum candidato elegível para ${role} com capacidades ${required.join(", ")}.`);
    }
    const seed = options.seed ?? role;
    const hash = hashSeed(seed);
    const offset = (hash + Math.max(0, (options.attempt ?? 1) - 1)) % candidates.length;
    return candidates[offset] as ModelCandidate;
  }

  selectReviewer(role: Role, implementer: ModelCandidate, seed: string = role, attempt = 1): ModelCandidate {
    const eligible = this.eligible(role, ["text"]).filter((candidate) => candidate.executor === this.config.execution.executor);
    const aliases = this.configuredPool(role, false);
    const ordered = aliases
      ? aliases.map((alias) => eligible.find((candidate) => candidate.alias === alias)).filter((candidate): candidate is ModelCandidate => Boolean(candidate))
      : eligible;
    const candidates = this.config.review.preferDifferentModelFamily
      ? ordered.filter((candidate) => candidate.family !== implementer.family)
      : ordered;
    if (!candidates.length) {
      const candidate = ordered[0];
      if (!candidate) throw new Error(`Nenhum revisor elegível para ${role}.`);
      return candidate;
    }
    const primaryIndex = (hashSeed(seed) + Math.min(Math.max(0, attempt - 1), candidates.length - 1)) % candidates.length;
    if (attempt <= candidates.length + 2) return candidates[primaryIndex] as ModelCandidate;

    const primaryAliases = new Set(ordered.map((candidate) => candidate.alias));
    const diagnosticAliases = this.config.routing?.pools.diagnostic ?? [];
    const emergency = diagnosticAliases
      .map((alias) => this.config.models.find((candidate) => candidate.alias === alias))
      .filter((candidate): candidate is ModelCandidate => Boolean(
        candidate
        && candidate.enabled
        && candidate.executor === this.config.execution.executor
        && candidate.family !== implementer.family
        && candidate.capabilities.includes("text")
        && candidate.capabilities.includes("tools")
        && !primaryAliases.has(candidate.alias),
      ))
      .sort((left, right) => Number(right.modality === "local") - Number(left.modality === "local"));
    const emergencyIndex = emergency.length > 0 ? (attempt - candidates.length - 3) % emergency.length : 0;
    const candidate = emergency[emergencyIndex] ?? candidates[primaryIndex];
    if (!candidate) throw new Error(`Nenhum revisor elegível para ${role}.`);
    return candidate;
  }
}
