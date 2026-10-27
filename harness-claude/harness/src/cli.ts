#!/usr/bin/env node
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { report } from "./budget.js";
import { loadCtx } from "./config.js";
import { execa } from "execa";
import { designSyncCmd, doctor, formatDoctor, smoke } from "./doctor.js";
import { defaultDeps, Orchestrator } from "./orchestrator.js";

const USAGE = `uso: harness <comando> [opções]
  doctor [--no-auth] [--no-emulators]  verifica ambiente e configuração
  sync-design                           copia project.designSource para o design/ do repo do projeto
  smoke [workerId...]                   microtarefa real com cada worker habilitado (prior do roteador)
  start                                 INIT + loop até o primeiro checkpoint
  resume                                continua do estado atual
  status                                etapa, features, custo, próximo passo
  approve [--yes]                       processa checkpoints/etapa-N/APROVACAO.md (aprovado: fecha a etapa; a próxima começa no resume)
  pause                                 pausa limpa após as tarefas atuais
  report                                custo e desempenho
  apply-proposal <id>                   aplica uma proposta de melhoria do harness
opções globais: --root <dir> (padrão: pasta acima de harness/)`;

async function main() {
  const argv = process.argv.slice(2);
  const flag = (f: string) => argv.includes(f);
  const rootIdx = argv.indexOf("--root");
  const root = resolve(rootIdx >= 0 ? argv[rootIdx + 1] : process.env.HARNESS_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), "..", ".."));
  const [cmd, ...rest] = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--root");
  if (!cmd || flag("--help")) return console.log(USAGE);
  const ctx = loadCtx(root);
  const deps = defaultDeps();
  if (flag("--yes")) deps.confirm = async (s) => (console.log(s), true);
  deps.doctor = async (c) => {
    const r = await doctor(c, { auth: false, emulators: false });
    if (!r.ok) console.log(formatDoctor(r));
    return r.ok;
  };
  const orch = new Orchestrator(ctx, deps);
  const run = async (p: Promise<unknown>) => { const r = await p; console.log(typeof r === "string" && r.includes(" ") ? r : orch.status()); };

  switch (cmd) {
    case "doctor": {
      const r = await doctor(ctx, { auth: !flag("--no-auth"), emulators: !flag("--no-emulators") });
      console.log(formatDoctor(r));
      process.exitCode = r.ok ? 0 : 1;
      return;
    }
    case "sync-design": {
      if (!ctx.config.project.designSource) return console.log("project.designSource não configurado");
      const [bin, ...args] = designSyncCmd(ctx, ctx.config.project.designSource);
      await execa(bin, args, { stdio: "inherit" });
      return console.log(`design copiado para ${args.at(-1)}; faça commit no repo do projeto`);
    }
    case "smoke": return console.log(await smoke(ctx, rest));
    case "start": return run(orch.start());
    case "resume": return run(orch.resume());
    case "status": return console.log(orch.status());
    case "approve": return run(orch.approve());
    case "pause": return console.log(orch.pause());
    case "report": return console.log(report(ctx));
    case "apply-proposal": return console.log(await orch.applyProposal(rest[0]));
    default:
      console.log(USAGE);
      process.exitCode = 2;
  }
}

main().catch((e) => {
  console.error(`erro: ${e?.message ?? e}`);
  process.exitCode = 1;
});
