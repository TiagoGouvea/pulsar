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

  select(role: Role, required: ModelCandidate["capabilities"] = ["text"], options: { attempt?: number; seed?: string; hard?: boolean; excludeAliases?: string[] } = {}): ModelCandidate {
    const eligible = this.eligible(role, required).filter((candidate) => candidate.executor === this.config.execution.executor);
    const aliases = this.configuredPool(role, options.hard ?? false);
    const candidates = aliases
      ? aliases.map((alias) => eligible.find((candidate) => candidate.alias === alias)).filter((candidate): candidate is ModelCandidate => Boolean(candidate))
      : eligible;
    if (!candidates.length) {
      throw new Error(`Nenhum candidato elegível para ${role} com capacidades ${required.join(", ")}.`);
    }
    const excluded = new Set(options.excludeAliases ?? []);
    return (candidates.find((candidate) => !excluded.has(candidate.alias)) ?? candidates[0]) as ModelCandidate;
  }

  reviewerCandidates(
    role: Role,
    implementer: ModelCandidate,
    seed: string = role,
    required: ModelCandidate["capabilities"] = role === "visualReviewer" ? ["text", "tools", "vision"] : ["text", "tools"],
  ): ModelCandidate[] {
    const eligible = this.eligible(role, required).filter((candidate) => candidate.executor === this.config.execution.executor);
    const aliases = this.configuredPool(role, false);
    const ordered = aliases
      ? aliases.map((alias) => eligible.find((candidate) => candidate.alias === alias)).filter((candidate): candidate is ModelCandidate => Boolean(candidate))
      : eligible;
    const primary = this.config.review.preferDifferentModelFamily
      ? ordered.filter((candidate) => candidate.family !== implementer.family)
      : ordered;
    const primaryCandidates = primary.length ? primary : ordered;
    if (!primaryCandidates.length) return [];
    const primaryIndex = hashSeed(seed) % primaryCandidates.length;
    const rotatedPrimary = [...primaryCandidates.slice(primaryIndex), ...primaryCandidates.slice(0, primaryIndex)];
    const primaryAliases = new Set(ordered.map((candidate) => candidate.alias));
    const diagnosticAliases = this.config.routing?.pools.diagnostic ?? [];
    const emergency = diagnosticAliases
      .map((alias) => this.config.models.find((candidate) => candidate.alias === alias))
      .filter((candidate): candidate is ModelCandidate => Boolean(
        candidate
        && candidate.enabled
        && candidate.executor === this.config.execution.executor
        && candidate.family !== implementer.family
        && required.every((capability) => candidate.capabilities.includes(capability))
        && !primaryAliases.has(candidate.alias),
      ))
      .sort((left, right) => Number(right.modality === "local") - Number(left.modality === "local"));
    return [...rotatedPrimary, ...emergency];
  }

  selectReviewer(
    role: Role,
    implementer: ModelCandidate,
    seed: string = role,
    attempt = 1,
    excludeAliases: string[] = [],
    required: ModelCandidate["capabilities"] = role === "visualReviewer" ? ["text", "tools", "vision"] : ["text", "tools"],
  ): ModelCandidate {
    const candidates = this.reviewerCandidates(role, implementer, seed, required);
    const excluded = new Set(excludeAliases);
    const startIndex = candidates.length ? ((Math.max(attempt - 1, 0) % candidates.length)) : 0;
    const ordered = [...candidates.slice(startIndex), ...candidates.slice(0, startIndex)];
    const candidate = ordered.find((item) => !excluded.has(item.alias));
    if (!candidate) throw new Error(`Pool de revisão esgotado para ${role}; não há revisor elegível ainda não tentado.`);
    return candidate;
  }
}
