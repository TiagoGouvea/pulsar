import type { HarnessConfig } from "../config/schema.js";
import type { CheckResult, ModelCandidate } from "../domain/types.js";
import { safeError } from "../utils/core.js";
import { withLmStudioModel, type ProcessRunner } from "./lmstudio.js";

interface LmModel {
  key?: string;
  id?: string;
  state?: string;
  quantization?: string;
}

interface ChatCompletion {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: Array<{ function?: { name?: string; arguments?: string } }>;
    };
  }>;
}

export interface ProbeOptions {
  inference?: boolean;
  processRunner?: ProcessRunner;
}

export function openAiEndpoint(baseUrl: string, resource: "models" | "chat/completions"): URL {
  const normalized = baseUrl.replace(/\/+$/, "");
  const versioned = normalized.endsWith("/v1") ? normalized : `${normalized}/v1`;
  return new URL(`${versioned}/${resource}`);
}

export async function probeCandidate(
  config: HarnessConfig,
  candidate: ModelCandidate,
  options: ProbeOptions = {},
): Promise<CheckResult[]> {
  if (candidate.executor === "fake") {
    return [{
      id: `model.${candidate.alias}.fake`, status: "pass", scope: "stage", importance: "informational",
      summary: "Executor determinístico disponível.", evidence: "Não realiza inferência externa.",
    }];
  }
  if (candidate.modality === "local") return probeLmStudio(config, candidate, options);
  return probeRemote(candidate);
}

async function probeLmStudio(config: HarnessConfig, candidate: ModelCandidate, options: ProbeOptions): Promise<CheckResult[]> {
  const baseUrl = candidate.endpoint ?? config.localInference.baseUrl;
  const headers: Record<string, string> = { "content-type": "application/json" };
  const token = process.env.LM_STUDIO_API_TOKEN;
  if (token) headers.authorization = `Bearer ${token}`;
  try {
    const response = await fetch(openAiEndpoint(baseUrl, "models"), { headers, signal: AbortSignal.timeout(5_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json() as { models?: LmModel[]; data?: LmModel[] } | LmModel[];
    const models = Array.isArray(payload) ? payload : (payload.models ?? payload.data ?? []);
    const matched = models.find((model) => model.key === candidate.modelId || model.id === candidate.modelId);
    const availability: CheckResult = {
      id: `model.${candidate.alias}.availability`,
      status: matched ? "pass" : "block",
      scope: "stage",
      importance: "required",
      summary: matched ? "Modelo encontrado no LM Studio." : "Modelo não encontrado pelo ID configurado.",
      evidence: matched ? JSON.stringify({ id: matched.id ?? matched.key, state: matched.state, quantization: matched.quantization }) : `IDs disponíveis: ${models.map((item) => item.id ?? item.key).join(", ") || "nenhum"}`,
      ...(matched ? {} : { remediation: "Ajuste models[].modelId para o ID exato retornado por /v1/models." }),
    };
    if (!matched) return [availability];
    if (!(options.inference ?? false)) {
      return [availability, {
        id: `model.${candidate.alias}.inference`, status: "skip", scope: "stage", importance: "recommended",
        summary: "Smoke test de inferência não solicitado.",
        evidence: "Use `models probe --alias ... --inference`; modelos locais não consomem orçamento de API.",
      }];
    }
    try {
      const inferenceChecks = await withLmStudioModel(
        config,
        candidate,
        async () => probeLocalInference(baseUrl, headers, candidate),
        options.processRunner,
      );
      return [availability, ...inferenceChecks];
    } catch (error) {
      return [availability, {
        id: `model.${candidate.alias}.lifecycle`, status: "block", scope: "stage", importance: "required",
        summary: "Falha ao preparar ou limpar o modelo local.", evidence: safeError(error),
        remediation: "Verifique os recursos do sistema e execute `lms ps`; o harness já tentou descarregar todos os modelos.",
      }];
    }
  } catch (error) {
    return [{
      id: `model.${candidate.alias}.endpoint`, status: "block", scope: "stage", importance: "required",
      summary: "LM Studio não respondeu.", evidence: safeError(error),
      remediation: "Inicie o servidor do LM Studio e confirme a URL OpenAI-compatible configurada.",
    }];
  }
}

async function probeLocalInference(baseUrl: string, headers: Record<string, string>, candidate: ModelCandidate): Promise<CheckResult[]> {
  const checks: CheckResult[] = [];
  const maxTokens = Math.min(Math.max(candidate.maxOutputTokens, 256), 512);
  try {
    const payload = await chatCompletion(baseUrl, headers, {
      model: candidate.modelId,
      messages: [{ role: "user", content: "Responda somente com a palavra: oi" }],
      max_tokens: maxTokens,
      temperature: 0,
    });
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Resposta textual vazia.");
    checks.push({
      id: `model.${candidate.alias}.text`, status: "pass", scope: "stage", importance: "required",
      summary: "Inferência textual respondeu.", evidence: `Resposta: ${JSON.stringify(content.slice(0, 120))}`,
    });
  } catch (error) {
    checks.push({
      id: `model.${candidate.alias}.text`, status: "block", scope: "stage", importance: "required",
      summary: "Smoke test textual falhou.", evidence: safeError(error),
    });
  }

  if (candidate.capabilities.includes("tools")) {
    try {
      const payload = await chatCompletion(baseUrl, headers, {
        model: candidate.modelId,
        messages: [{ role: "user", content: "Chame report_value com value igual a 7. Não responda em texto." }],
        tools: [{
          type: "function",
          function: {
            name: "report_value",
            description: "Registra um número inteiro.",
            parameters: { type: "object", properties: { value: { type: "integer" } }, required: ["value"] },
          },
        }],
        tool_choice: "required",
        max_tokens: maxTokens,
        temperature: 0,
      });
      const toolCall = payload.choices?.[0]?.message?.tool_calls?.[0]?.function;
      const toolArguments = toolCall?.arguments ? JSON.parse(toolCall.arguments) as { value?: unknown } : undefined;
      if (toolCall?.name !== "report_value" || toolArguments?.value !== 7) throw new Error("Tool call esperada não foi emitida corretamente.");
      checks.push({
        id: `model.${candidate.alias}.tools`, status: "pass", scope: "stage", importance: "required",
        summary: "Function calling respondeu corretamente.", evidence: `${toolCall.name}(${toolCall.arguments ?? ""})`,
      });
    } catch (error) {
      checks.push({
        id: `model.${candidate.alias}.tools`, status: "block", scope: "stage", importance: "required",
        summary: "Smoke test de ferramentas falhou.", evidence: safeError(error),
      });
    }
  }
  return checks;
}

async function chatCompletion(
  baseUrl: string,
  headers: Record<string, string>,
  body: Record<string, unknown>,
): Promise<ChatCompletion> {
  const response = await fetch(openAiEndpoint(baseUrl, "chat/completions"), {
    method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${(await response.text()).slice(0, 500)}`);
  return response.json() as Promise<ChatCompletion>;
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
