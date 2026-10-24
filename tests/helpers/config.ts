import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { stringify } from "yaml";
import { loadConfig } from "../../src/config/load.js";
import type { HarnessConfig } from "../../src/config/schema.js";

export async function createTestConfig(root: string, options: {
  testCommand?: string[];
  projectLimit?: string | null;
  executor?: "fake" | "pi";
} = {}): Promise<HarnessConfig> {
  const workspace = path.join(root, "workspace com espaços");
  const inputs = path.join(root, "inputs");
  await mkdir(workspace, { recursive: true });
  await mkdir(inputs, { recursive: true });
  await writeFile(path.join(inputs, "spec.md"), `# Teste

## REQ-001 [required] Criar item

Critérios:

- Item fica visível.

## REQ-002 [required] Filtrar item

Dependências:

- REQ-001

Critérios:

- Filtro ignora caixa.
`);
  const raw = {
    project: { id: `test-${path.basename(root).replace(/[^a-zA-Z0-9_-]/g, "-")}`, workspace, specs: [path.join(inputs, "spec.md")], profile: "generic", timezone: "America/Sao_Paulo" },
    execution: { executor: options.executor ?? "fake", maxConcurrentTasks: 1, maxConcurrentLocalRequests: 1, maxAttemptsPerTask: 2, maxSameFailureCount: 2, taskTimeoutMinutes: 1, staleHeartbeatSeconds: 15, humanGate: "every_milestone", allowProductionDeploy: false, continueWhileAwaitingHuman: false },
    budget: { currency: "USD", projectLimit: options.projectLimit ?? null, dailyLimit: null, milestoneLimit: null, taskLimit: null, diagnosticsLimit: null, finalVerificationReservePercent: 20, warningThresholds: [50, 75, 90], automaticTopUp: false, unknownCostPolicy: "block_paid_calls" },
    localInference: { baseUrl: "http://127.0.0.1:1234", maxLoadedModels: 1, initialContextTokens: 8192, maxOutputTokens: 2048, memoryPressureAction: "pause" },
    review: { requireIndependentSession: true, preferDifferentModelFamily: true, viewportWidths: [390] },
    commands: options.testCommand ? { test: options.testCommand } : {},
    models: [{ alias: "fake", executor: "fake", provider: "fake", modelId: "v1", family: "fake", modality: "fake", capabilities: ["text", "tools", "structured_output"], roles: ["planner", "implementer", "testAuthor", "diagnostic", "functionalReviewer", "securityReviewer", "learningAnalyst"], enabled: true, contextTokens: 8192, maxOutputTokens: 1024 }],
    storage: { root: path.join(root, ".harness"), retentionDays: 1 },
    dashboard: { host: "127.0.0.1", port: 4318 },
    security: { allowedCommands: ["node"], trustMode: "workspace_process", redactPatterns: [] },
  };
  const configPath = path.join(root, "harness.config.yaml");
  await writeFile(configPath, stringify(raw));
  return loadConfig(configPath);
}
