import { randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { HarnessConfig } from "../config/schema.js";
import { Orchestrator } from "../orchestrator/controller.js";

function json(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(value));
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  let body = "";
  for await (const chunk of request) {
    body += String(chunk);
    if (body.length > 64_000) throw new Error("Payload excedeu 64 KB.");
  }
  return JSON.parse(body || "{}") as Record<string, unknown>;
}

export async function startDashboard(config: HarnessConfig, runId: string): Promise<{ url: string; token: string }> {
  const orchestrator = new Orchestrator(config);
  const token = randomBytes(24).toString("hex");
  const origin = `http://${config.dashboard.host}:${config.dashboard.port}`;
  const handleRequest = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    try {
      const url = new URL(request.url ?? "/", origin);
      if (request.method === "GET" && url.pathname === "/") {
        response.writeHead(200, {
          "content-type": "text/html; charset=utf-8", "cache-control": "no-store",
          "content-security-policy": "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'",
          "x-frame-options": "DENY",
        });
        response.end(page(token, runId));
        return;
      }
      if (request.method === "GET" && url.pathname === "/api/status") {
        const run = orchestrator.store.getRun(runId);
        if (!run) return json(response, 404, { error: "Run inexistente." });
        return json(response, 200, {
          run,
          milestones: orchestrator.store.listMilestones(runId),
          tasks: orchestrator.store.listTasks(runId),
          events: orchestrator.store.listEvents(runId, 30),
        });
      }
      if (request.method === "POST" && url.pathname.startsWith("/api/")) {
        if (request.headers.origin !== origin || request.headers["x-harness-token"] !== token) {
          return json(response, 403, { error: "Origem ou token inválido." });
        }
        const body = await readJson(request);
        if (url.pathname === "/api/control") {
          const command = typeof body.command === "string" ? body.command : "";
          if (!new Set(["pause", "cancel"]).has(command)) return json(response, 400, { error: "Comando inválido." });
          const id = orchestrator.store.enqueueCommand(runId, command);
          return json(response, 202, { id });
        }
        if (url.pathname === "/api/approve") {
          if (typeof body.milestoneId !== "string" || typeof body.revision !== "string") return json(response, 400, { error: "Marco/revisão inválidos." });
          await orchestrator.approve(runId, body.milestoneId, body.revision, "dashboard-human");
          return json(response, 200, { ok: true });
        }
        if (url.pathname === "/api/feedback") {
          if (typeof body.content !== "string" || body.content.length > 50_000) return json(response, 400, { error: "Feedback inválido." });
          const milestoneId = typeof body.milestoneId === "string" ? body.milestoneId : config.project.milestones[0]?.id;
          if (!milestoneId) return json(response, 400, { error: "Nenhuma etapa configurada." });
          const output = await orchestrator.importFeedbackContent(runId, body.content, milestoneId);
          return json(response, 200, { ok: true, output });
        }
      }
      json(response, 404, { error: "Não encontrado." });
    } catch (error) {
      json(response, 500, { error: error instanceof Error ? error.message : String(error) });
    }
  };
  const server = createServer((request, response) => { void handleRequest(request, response); });
  server.on("close", () => orchestrator.close());
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.dashboard.port, config.dashboard.host, resolve);
  });
  return { url: origin, token };
}

function page(token: string, runId: string): string {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Harness — ${runId}</title><style>
body{font:15px system-ui;margin:0;background:#10131a;color:#e8edf5}main{max-width:1100px;margin:auto;padding:28px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}.card{background:#181e29;border:1px solid #2d3748;border-radius:12px;padding:16px}
button{background:#4f7cff;color:white;border:0;border-radius:8px;padding:9px 14px;margin-right:8px}button.danger{background:#b73b4b}code{word-break:break-all}li{margin:.45rem 0}.muted{color:#9aa8bd}
</style></head><body><main><h1>Harness</h1><p class="muted">Run <code>${runId}</code></p><div id="summary" class="card">Carregando…</div>
<p><button data-command="pause">Pausar</button><button class="danger" data-command="cancel">Cancelar</button></p>
<section class="card"><h2>Revisão humana</h2><p><button id="approve">Aprovar revisão exibida</button></p><label for="feedback">Solicitar ajustes</label><textarea id="feedback" rows="5" style="width:100%;background:#10131a;color:inherit"></textarea><p><button id="send-feedback">Enviar feedback</button></p></section>
<div class="grid"><section class="card"><h2>Tarefas</h2><ul id="tasks"></ul></section><section class="card"><h2>Eventos</h2><ul id="events"></ul></section></div>
<script>
const token=${JSON.stringify(token)};
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eventDetail=e=>{try{const p=JSON.parse(e.payload_json||'{}');return p.summary||p.cause||p.phase||''}catch{return''}};
async function refresh(){const r=await fetch('/api/status',{cache:'no-store'});const d=await r.json();
window.currentStatus=d;
document.querySelector('#summary').innerHTML='<strong>Estado:</strong> '+esc(d.run.state)+'<br><strong>Revisão:</strong> <code>'+esc(d.run.revision||'n/a')+'</code>';
document.querySelector('#tasks').innerHTML=d.tasks.map(t=>'<li><strong>'+esc(t.id)+'</strong> — '+esc(t.state)+'<br>'+esc(t.title)+'</li>').join('');
document.querySelector('#events').innerHTML=d.events.map(e=>{const detail=eventDetail(e);return '<li>'+esc(e.created_at)+' — '+esc(e.type)+(detail?'<br><span class="muted">'+esc(detail)+'</span>':'')+'</li>'}).join('');}
document.querySelectorAll('[data-command]').forEach(b=>b.onclick=async()=>{await fetch('/api/control',{method:'POST',headers:{'content-type':'application/json','x-harness-token':token},body:JSON.stringify({command:b.dataset.command})});await refresh()});
document.querySelector('#approve').onclick=async()=>{const m=window.currentStatus.milestones.find(x=>x.state==='awaiting_human');if(!m)return alert('Nenhum marco aguardando aceite.');const r=await fetch('/api/approve',{method:'POST',headers:{'content-type':'application/json','x-harness-token':token},body:JSON.stringify({milestoneId:m.id,revision:m.revision})});const d=await r.json();if(!r.ok)alert(d.error);await refresh()};
document.querySelector('#send-feedback').onclick=async()=>{const content=document.querySelector('#feedback').value;const state=await fetch('/api/state',{headers:{'x-harness-token':token}}).then(r=>r.json());const milestoneId=state.milestones.find(m=>m.state!=='approved')?.id;if(!milestoneId)return alert('Nenhuma etapa disponível.');const r=await fetch('/api/feedback',{method:'POST',headers:{'content-type':'application/json','x-harness-token':token},body:JSON.stringify({milestoneId,content})});const d=await r.json();if(!r.ok)alert(d.error);else document.querySelector('#feedback').value='';await refresh()};
refresh();setInterval(refresh,3000);
</script></main></body></html>`;
}
