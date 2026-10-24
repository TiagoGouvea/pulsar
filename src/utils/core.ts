import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export function nowUtc(): string {
  return new Date().toISOString();
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
}

export function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function hashFile(filePath: string): Promise<string> {
  return sha256(await readFile(filePath));
}

export async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
}

export function parseUsdToMicros(value: string | null | undefined): bigint | null {
  if (value == null) return null;
  const [whole = "0", decimal = ""] = value.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(decimal.padEnd(6, "0").slice(0, 6));
}

export function formatMicros(value: bigint): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / 1_000_000n;
  const decimal = (absolute % 1_000_000n).toString().padStart(6, "0").replace(/0+$/, "");
  return `${negative ? "-" : ""}${whole}${decimal ? `.${decimal}` : ""}`;
}

export async function ensureDirectory(directory: string): Promise<void> {
  await mkdir(directory, { recursive: true, mode: 0o700 });
}

export function safeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
