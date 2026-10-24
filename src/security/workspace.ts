import { realpath, stat } from "node:fs/promises";
import path from "node:path";

export async function assertWorkspace(workspace: string, protectedRoot: string): Promise<string> {
  const workspaceReal = await realpath(workspace);
  const rootReal = await realpath(protectedRoot);
  if (!(await stat(workspaceReal)).isDirectory()) {
    throw new Error(`Workspace não é um diretório: ${workspaceReal}`);
  }
  if (workspaceReal === rootReal) {
    throw new Error("O workspace do projeto não pode ser a raiz do harness.");
  }
  return workspaceReal;
}

export function assertPathInside(candidate: string, root: string): string {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Caminho fora do workspace autorizado: ${candidate}`);
  }
  return path.resolve(candidate);
}
