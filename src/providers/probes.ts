import type { HarnessConfig } from "../config/schema.js";
import type { ModelCandidate } from "../domain/types.js";
import type { CheckResult } from "../domain/types.js";
import { safeError } from "../utils/core.js";

interface LmModel {
  key?: string;
  id?: string;
  loaded_instances?: unknown[];
  state?: string;
  max_context_length?: number;
  quantization?: string;
}

export async function probeCandidate(config: HarnessConfig, candidate: ModelCandidate): Promise<CheckResult[]> {
  if (candidate.executor === "fake") {
    return [{
      id: `model.${candidate.alias}.fake`, status: "pass", scope: "stage", importance: "informational",
      summary: "Executor determinístico disponível.", evidence: "Não realiza inferência externa.",
    }];
  }
  if (candidate.modality === "local") return probeLmStudio(config, candidate);
  return probeRemote(candidate);
}

async function probeLmStudio(config: HarnessConfig, candidate: ModelCandidate): Promise<CheckResult[]> {
  const endpoint = new URL("/api/v1/models", candidate.endpoint ?? config.localInference.baseUrl);
  const headers: Record<string, string> = {};
  const token = process.env.LM_STUDIO_API_TOKEN;
  if (token) headers.authorization = `Bearer ${token}`;
  try {
    const response = await fetch(endpoint, { headers, signal: AbortSignal.timeout(5_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json() as { models?: LmModel[]; data?: LmModel[] } | LmModel[];
    const models = Array.isArray(payload) ? payload : (payload.models ?? payload.data ?? []);
    const matched = models.find((model) => model.key === candidate.modelId || model.id === candidate.modelId);
    return [{
      id: `model.${candidate.alias}.availability`,
      status: matched ? "pass" : "block",
      scope: "stage",
      importance: "required",
      summary: matched ? "Modelo encontrado no LM Studio." : "Modelo não encontrado pelo ID configurado.",
      evidence: matched ? JSON.stringify({ id: matched.id ?? matched.key, state: matched.state, quantization: matched.quantization }) : `IDs disponíveis: ${models.map((item) => item.id ?? item.key).join(", ") || "nenhum"}`,
      ...(matched ? {} : { remediation: "Execute `lms ls`, ajuste models[].modelId e carregue o modelo com `lms load`." }),
    }, {
      id: `model.${candidate.alias}.inference`, status: "skip", scope: "stage", importance: "recommended",
      summary: "Smoke test de inferência não executado automaticamente.",
      evidence: "Use `models probe --alias ... --inference`; o probe respeita o orçamento de diagnóstico.",
    }];
  } catch (error) {
    return [{
      id: `model.${candidate.alias}.endpoint`, status: "block", scope: "stage", importance: "required",
      summary: "LM Studio não respondeu.", evidence: safeError(error),
      remediation: "Inicie com `lms server start` e confirme a URL configurada.",
    }];
  }
}

async function probeRemote(candidate: ModelCandidate): Promise<CheckResult[]> {
  const credential = candidate.credentialEnv ? process.env[candidate.credentialEnv] : undefined;
  if (!credential) {
    return [{
      id: `model.${candidate.alias}.credential`, status: "block", scope: "stage", importance: "required",
      summary: "Credencial ausente.", evidence: candidate.credentialEnv ? `Variável ${candidate.credentialEnv} não definida.` : "credentialEnv não configurado.",
      remediation: "Defina a variável somente no ambiente do processo e execute o probe novamente.",
    }];
  }
  if (candidate.provider === "openrouter") {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { authorization: `Bearer ${credential}` }, signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json() as { data?: Array<{ id: string }> };
      const available = data.data?.some((item) => item.id === candidate.modelId) ?? false;
      return [{
        id: `model.${candidate.alias}.catalog`, status: available ? "pass" : "block", scope: "stage", importance: "required",
        summary: available ? "Modelo disponível no OpenRouter." : "Modelo ausente no catálogo atual do OpenRouter.",
        evidence: `Modelo consultado: ${candidate.modelId}`,
      }, {
        id: `model.${candidate.alias}.inference`, status: "skip", scope: "stage", importance: "recommended",
        summary: "Inferência paga não executada.", evidence: "Exige diagnosticsLimit explícito e opção --inference.",
      }];
    } catch (error) {
      return [{
        id: `model.${candidate.alias}.endpoint`, status: "block", scope: "stage", importance: "required",
        summary: "Falha ao consultar o provedor.", evidence: safeError(error),
      }];
    }
  }
  return [{
    id: `model.${candidate.alias}.credential`, status: "pass", scope: "stage", importance: "informational",
    summary: "Credencial configurada; valor não exibido.", evidence: `Variável ${candidate.credentialEnv ?? "configurada"}.`,
  }, {
    id: `model.${candidate.alias}.inference`, status: "skip", scope: "stage", importance: "recommended",
    summary: "Disponibilidade real ainda não validada.", evidence: "Execute um probe de inferência com orçamento de diagnóstico.",
  }];
}
