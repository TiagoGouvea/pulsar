import { appendFileSync, cpSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { loadCtx, type Ctx } from "../src/config.js";
import { findLeaks } from "../src/gates/privacy-leak.js";
import { registerProtected } from "../src/gates/protected.js";
import { runGates } from "../src/gates/run-gates.js";
import { git } from "../src/git.js";
import { writeJson } from "../src/state.js";
import { makeProject } from "./helpers.js";

const GATES = {
  G1: { name: "install-build", cmd: "node check.mjs build" },
  G2: { name: "lint-format", cmd: "node check.mjs lint" },
  G3: { name: "typecheck", cmd: "node check.mjs typecheck" },
  G4: { name: "unit", cmd: "node check.mjs unit" },
  G7: { name: "protected-tests", builtin: "protected" },
  G8: { name: "privacy-leak", builtin: "privacy", fromStage: 1 },
  G12: { name: "lighthouse", builtin: "lighthouse", scope: "stage" },
  G13: { name: "secrets", builtin: "secrets" },
};
const PROTECTED = "app/src/__tests__/sum.test.js";

let root: string, ctx: Ctx;
const run = () => runGates(ctx, root, { stage: 0, mode: "feature", base: "main", featureId: "F-0.01" });
const commit = async (msg: string) => { await git(root, "add", "-A"); await git(root, "commit", "-qm", msg); };

describe("gates no fixture-app", () => {
  beforeEach(async () => {
    ({ root } = await makeProject({ config: { gates: GATES } }));
    cpSync(join(import.meta.dirname, "fixture-app"), join(root, "app"), { recursive: true });
    await commit("fixture");
    ctx = loadCtx(root);
    writeJson(join(root, ".harness/features.json"), { specHash: "", features: [] });
    registerProtected(ctx, root, "F-0.01", [PROTECTED]);
    await git(root, "checkout", "-qb", "feat/x");
  });

  it("app limpo passa; gates fora de etapa/escopo são pulados", async () => {
    const r = await run();
    expect(r.ok).toBe(true);
    expect(r.results.find((x) => x.id === "G8")!.skipped).toMatch(/etapa 1/);
    expect(r.results.find((x) => x.id === "G12")!.skipped).toMatch(/fim de etapa/);
  });

  it("G2/G3/G4 reprovam lint, tipo e lógica", async () => {
    writeFileSync(join(root, "app/src/sum.js"), "export const sum = (a: any, b) => { console.log(a); return a - b; };\n");
    const r = await run();
    expect(r.failed).toEqual(["G2", "G3", "G4"]);
    expect(r.results.find((x) => x.id === "G2")!.output).toContain("console.log proibido");
  });

  it("G7 reprova teste protegido alterado ou removido e uso de .only/.skip", async () => {
    appendFileSync(join(root, PROTECTED), "\ntest.skip('x', () => {});\n");
    let r = await run();
    expect(r.failed).toEqual(["G7"]);
    expect(r.results.find((x) => x.id === "G7")!.output).toMatch(/alterado[\s\S]*proibido/);
    await git(root, "checkout", "--", PROTECTED);
    writeFileSync(join(root, "app/src/__tests__/other.test.js"), "test.only('y', () => {});\n");
    r = await run();
    expect(r.failed).toEqual(["G7"]);
    await git(root, "rm", "-q", PROTECTED);
    r = await run();
    expect(r.results.find((x) => x.id === "G7")!.output).toContain("removido");
  });

  it("G13 reprova chaves e arquivos .env no diff", async () => {
    writeFileSync(join(root, "app/src/config.js"), `export const k = "sk-ant-api03-${"a".repeat(40)}";\n`);
    writeFileSync(join(root, ".env.local"), "X=1\n");
    await git(root, "add", "-f", "app/src/config.js", ".env.local");
    await git(root, "commit", "-qm", "oops");
    const r = await run();
    expect(r.failed).toEqual(["G13"]);
    const out = r.results.find((x) => x.id === "G13")!.output;
    expect(out).toContain(".env.local");
    expect(out).toContain("possível segredo");
  });

  it("G8: varredura de sentinelas", () => {
    expect(findLeaks(["ZQX_ENERGIA_7F3"], [{ where: "innerText", text: "Energia" }, { where: "button[aria-label]", text: "Editar ZQX_ENERGIA_7F3" }]))
      .toEqual(["ZQX_ENERGIA_7F3 em button[aria-label]"]);
  });
});
