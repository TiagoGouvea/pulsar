import { readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { ZodError } from "zod";
import { harnessConfigSchema, type HarnessConfig } from "./schema.js";

function absoluteFrom(base: string, value: string): string {
  return path.isAbsolute(value) ? path.normalize(value) : path.resolve(base, value);
}

export async function loadConfig(configPath: string): Promise<HarnessConfig> {
  const absolutePath = path.resolve(configPath);
  const configDirectory = path.dirname(absolutePath);
  let raw: unknown;
  try {
    raw = parse(await readFile(absolutePath, "utf8"));
  } catch (error) {
    throw new Error(`Não foi possível ler a configuração ${absolutePath}: ${String(error)}`);
  }

  try {
    const parsed = harnessConfigSchema.parse(raw);
    return {
      ...parsed,
      project: {
        ...parsed.project,
        workspace: absoluteFrom(configDirectory, parsed.project.workspace),
        specs: parsed.project.specs.map((item) => absoluteFrom(configDirectory, item)),
        ...(parsed.project.designDirectory
          ? { designDirectory: absoluteFrom(configDirectory, parsed.project.designDirectory) }
          : {}),
      },
      storage: { ...parsed.storage, root: absoluteFrom(configDirectory, parsed.storage.root) },
      configPath: absolutePath,
      configDirectory,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`).join("\n");
      throw new Error(`Configuração inválida:\n${details}`);
    }
    throw error;
  }
}
