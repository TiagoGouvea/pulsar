import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { HarnessConfig } from "../config/schema.js";
import type { StateStore } from "../state/store.js";
import { runProcess } from "../utils/process.js";
import { writeJson } from "../utils/core.js";

export interface HostingSnapshot {
  milestoneId: string;
  revision: string;
  siteId: string;
  url: string;
  deployedAt: string;
}

function parseJsonOutput(output: string): Record<string, unknown> {
  const start = output.indexOf("{");
  if (start < 0) throw new Error("Firebase CLI não retornou JSON.");
  try {
    return JSON.parse(output.slice(start)) as Record<string, unknown>;
  } catch {
    throw new Error("Firebase CLI retornou JSON inválido.");
  }
}

function firebaseResult(output: string): Record<string, unknown> {
  const parsed = parseJsonOutput(output);
  if (parsed.status === "error") {
    const error = typeof parsed.error === "string" ? parsed.error : "erro não detalhado";
    throw new Error(`Firebase CLI: ${error}`);
  }
  return (parsed.result && typeof parsed.result === "object" ? parsed.result : parsed) as Record<string, unknown>;
}

async function directoryHash(directory: string): Promise<string> {
  const hash = createHash("sha256");
  const walk = async (current: string): Promise<void> => {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (entry.isFile()) {
        hash.update(path.relative(directory, absolute).split(path.sep).join("/"));
        hash.update("\0");
        hash.update(await readFile(absolute));
        hash.update("\0");
      }
    }
  };
  await walk(directory);
  return hash.digest("hex");
}

export function makeHostingSnapshotSiteId(prefix: string, milestoneId: string, versionHash: string): string {
  const milestone = milestoneId.toLowerCase().replaceAll(/[^a-z0-9-]/g, "-").replaceAll(/-+/g, "-").replaceAll(/^-|-$/g, "") || "stage";
  const suffix = versionHash.slice(0, 10);
  const availableMilestoneLength = 30 - prefix.length - suffix.length - 2;
  const truncatedMilestone = milestone.slice(0, availableMilestoneLength).replace(/-+$/g, "") || "v";
  return `${prefix}-${truncatedMilestone}-${suffix}`;
}

function siteIdsFromList(result: Record<string, unknown>): string[] {
  const sites = Array.isArray(result.sites) ? result.sites : [];
  return sites.flatMap((item) => {
    if (!item || typeof item !== "object" || typeof (item as Record<string, unknown>).name !== "string") return [];
    const id = String((item as Record<string, unknown>).name).split("/").at(-1);
    return id ? [id] : [];
  });
}

export async function deployHostingSnapshot(input: {
  config: HarnessConfig;
  milestoneId: string;
  revision: string;
}): Promise<HostingSnapshot | null> {
  const settings = input.config.hostingSnapshots;
  if (!settings?.enabled) return null;

  const workspace = path.resolve(input.config.project.workspace);
  const firebaseConfigPath = path.resolve(workspace, settings.firebaseConfig);
  const firebaseConfig = JSON.parse(await readFile(firebaseConfigPath, "utf8")) as Record<string, unknown>;
  const sourceHosting = firebaseConfig.hosting;
  const hosting: unknown = Array.isArray(sourceHosting)
    ? sourceHosting.find((entry: unknown) => entry && typeof entry === "object")
    : sourceHosting;
  if (!hosting || typeof hosting !== "object" || typeof (hosting as Record<string, unknown>).public !== "string") {
    throw new Error(`Configuração Hosting inválida em ${firebaseConfigPath}: campo public ausente.`);
  }
  const publicDirectory = path.resolve(workspace, String((hosting as Record<string, unknown>).public));
  const versionHash = createHash("sha256").update(input.milestoneId).update("\0").update(input.revision).update("\0").update(await directoryHash(publicDirectory)).digest("hex");
  const siteId = makeHostingSnapshotSiteId(settings.sitePrefix, input.milestoneId, versionHash);
  const command = ["yarn", "firebase"];
  const runFirebase = async (args: string[], timeoutMs = 120_000) => {
    const result = await runProcess([...command, ...args, "--project", settings.firebaseProjectId, "--json"], {
      cwd: workspace,
      timeoutMs,
      redactPatterns: input.config.security.redactPatterns,
    });
    if (result.timedOut) throw new Error(`Firebase CLI excedeu o limite de ${Math.round(timeoutMs / 60_000)} minuto(s): ${args[0]}.`);
    if (result.stdout.trimStart().startsWith("{")) {
      try { return firebaseResult(result.stdout); }
      catch (error) { throw new Error(`Firebase CLI (${args[0]}): ${error instanceof Error ? error.message : String(error)}`); }
    }
    if (result.exitCode !== 0) {
      const diagnostic = result.stderr.trim() || result.stdout.trim() || `código ${result.exitCode}`;
      throw new Error(`Comando Firebase falhou (${args[0]}): ${diagnostic.slice(0, 1200)}`);
    }
    return firebaseResult(result.stdout);
  };

  const listed = await runFirebase(["hosting:sites:list"]);
  const siteIds = siteIdsFromList(listed);
  if (!siteIds.includes(siteId)) {
    if (siteIds.length >= 36) throw new Error("Firebase Hosting atingiu o limite de 36 sites; não foi criado um novo snapshot.");
    await runFirebase(["hosting:sites:create", siteId]);
  }

  const temporaryConfig = path.join(workspace, `.firebase-snapshot-${siteId}-${process.pid}-${Date.now()}.json`);
  const deployConfig = {
    hosting: {
      ...(hosting as Record<string, unknown>),
      site: siteId,
      public: publicDirectory,
    },
  };
  delete (deployConfig.hosting as Record<string, unknown>).target;
  try {
    await writeFile(temporaryConfig, `${JSON.stringify(deployConfig, null, 2)}\n`, { flag: "wx", mode: 0o600 });
    await runFirebase(["deploy", "--config", temporaryConfig, "--only", "hosting"], 15 * 60_000);
  } finally {
    await unlink(temporaryConfig).catch((error: unknown) => {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    });
  }

  return {
    milestoneId: input.milestoneId,
    revision: input.revision,
    siteId,
    url: `https://${siteId}.web.app`,
    deployedAt: new Date().toISOString(),
  };
}

export async function persistHostingSnapshot(input: {
  config: HarnessConfig;
  store: StateStore;
  runId: string;
  snapshot: HostingSnapshot;
}): Promise<void> {
  const directory = path.join(input.config.storage.root, "runs", input.runId, "hosting-snapshots");
  await mkdir(directory, { recursive: true });
  await writeJson(path.join(directory, `${input.snapshot.siteId}.json`), input.snapshot);
  const indexPath = path.join(directory, "index.json");
  let snapshots: HostingSnapshot[] = [];
  try {
    const existing = JSON.parse(await readFile(indexPath, "utf8")) as unknown;
    if (Array.isArray(existing)) snapshots = existing as HostingSnapshot[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const next = [...snapshots.filter((item) => item.siteId !== input.snapshot.siteId), input.snapshot];
  await writeJson(indexPath, next);
  input.store.event(input.runId, "hosting.snapshot_deployed", "milestone", input.snapshot.milestoneId, input.snapshot);
}
