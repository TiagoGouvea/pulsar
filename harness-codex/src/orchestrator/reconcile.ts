import type { StateStore } from "../state/store.js";
import { createId, nowUtc, parseUsdToMicros, sha256 } from "../utils/core.js";

export interface ReconcileInterruptedCallInput {
  runId: string;
  providerCallId: string;
  actualCostUsd: string;
  inputTokens?: number;
  outputTokens?: number;
  note: string;
  retryInterruptedTask?: boolean;
}

export interface ReconciledCall {
  providerCallId: string;
  taskId: string;
  attemptNumber: number;
  actualCostMicros: string;
  taskMadeRetryable: boolean;
}

export function reconcileInterruptedCall(store: StateStore, input: ReconcileInterruptedCallInput): ReconciledCall {
  const actualCostMicros = parseUsdToMicros(input.actualCostUsd);
  if (actualCostMicros == null || actualCostMicros < 0n) throw new Error("Custo real inválido; informe USD com até 6 casas decimais.");
  if (!input.note.trim()) throw new Error("Informe a evidência usada para reconciliar a cobrança.");
  for (const [label, value] of [["inputTokens", input.inputTokens], ["outputTokens", input.outputTokens]] as const) {
    if (value != null && (!Number.isSafeInteger(value) || value < 0)) throw new Error(`${label} deve ser um inteiro não negativo.`);
  }

  const call = store.get<Record<string, unknown>>(
    `SELECT pc.*, a.id AS attempt_id, a.run_id, a.task_id, a.number AS attempt_number, a.started_at AS attempt_started_at,
            a.status AS attempt_status, a.result_json, t.state AS task_state
     FROM provider_calls pc
     JOIN attempts a ON a.id=pc.attempt_id
     JOIN tasks t ON t.run_id=a.run_id AND t.id=a.task_id
     WHERE pc.id=? AND a.run_id=?`,
    input.providerCallId, input.runId,
  );
  if (!call) throw new Error("Chamada não encontrada nesta execução.");
  if (call.state !== "uncertain") throw new Error(`A chamada está em estado ${String(call.state)}, não uncertain; nenhuma alteração feita.`);
  if (call.modality !== "metered_api") throw new Error("Reconciliação manual só é válida para chamadas pagas por uso.");

  const reservation = store.get<Record<string, unknown>>(
    `SELECT * FROM cost_reservations
     WHERE provider_call_id=? AND state IN ('active','uncertain')
     UNION ALL
     SELECT * FROM cost_reservations
     WHERE provider_call_id IS NULL AND run_id=? AND task_id=? AND state IN ('active','uncertain')
       AND created_at>=? AND created_at<=?
     ORDER BY created_at DESC LIMIT 1`,
    input.providerCallId, input.runId, String(call.task_id), String(call.attempt_started_at), String(call.started_at),
  );
  if (!reservation) throw new Error("Reserva ativa/incerta da chamada não encontrada; nenhuma alteração feita.");

  const taskId = String(call.task_id);
  const attemptId = String(call.attempt_id);
  let retryTask = false;
  if (input.retryInterruptedTask) {
    const run = store.get<Record<string, unknown>>("SELECT state FROM runs WHERE id=?", input.runId);
    const blockerEvent = store.get<Record<string, unknown>>(
      "SELECT payload_json FROM events WHERE run_id=? AND type='run.blocked' ORDER BY sequence DESC LIMIT 1",
      input.runId,
    );
    let blocker: Record<string, unknown> = {};
    if (typeof blockerEvent?.payload_json === "string") {
      try { blocker = JSON.parse(blockerEvent.payload_json) as Record<string, unknown>; } catch { /* handled by validation below */ }
    }
    if (run?.state !== "blocked" || blocker.cause !== "interrupted_attempt_requires_reconciliation" || blocker.taskId !== taskId) {
      throw new Error("A execução não está bloqueada aguardando reconciliação desta tarefa; nenhuma alteração feita.");
    }
    if (call.attempt_status !== "running" || call.result_json != null || call.task_state !== "blocked") {
      throw new Error("A tentativa/tarefa não corresponde a uma implementação interrompida sem resultado; nenhuma alteração feita.");
    }
    retryTask = true;
  }

  const reconciledAt = nowUtc();
  const failureResult = {
    taskId,
    outcome: "failed",
    summary: "Execução interrompida manualmente antes de produzir resultado; custo reconciliado a partir da atividade do provedor.",
    changedFiles: [],
    claimedChecks: [],
    decisions: [],
    blockers: ["pi_execution_failed"],
    suggestedFollowUps: ["Retentar a tarefa a partir do início; não há resultado parcial validado."],
    usage: {
      ...(input.inputTokens == null ? {} : { inputTokens: input.inputTokens }),
      ...(input.outputTokens == null ? {} : { outputTokens: input.outputTokens }),
      costUsd: input.actualCostUsd,
    },
  };

  store.transaction(() => {
    const updatedCall = store.get<Record<string, unknown>>(
      "SELECT state FROM provider_calls WHERE id=?", input.providerCallId,
    );
    const updatedReservation = store.get<Record<string, unknown>>(
      "SELECT state FROM cost_reservations WHERE id=?", String(reservation.id),
    );
    if (updatedCall?.state !== "uncertain" || !["active", "uncertain"].includes(String(updatedReservation?.state))) {
      throw new Error("O estado da chamada/reserva mudou durante a reconciliação; nenhuma alteração feita.");
    }
    store.run(
      `UPDATE provider_calls SET state='reconciled', input_tokens=COALESCE(?, input_tokens),
       output_tokens=COALESCE(?, output_tokens), reported_micros=?, uncertain_micros=NULL, finished_at=? WHERE id=?`,
      input.inputTokens ?? null, input.outputTokens ?? null, actualCostMicros, reconciledAt, input.providerCallId,
    );
    store.run(
      "UPDATE cost_reservations SET state='released', released_at=? WHERE id=?",
      reconciledAt, String(reservation.id),
    );
    store.run(
      `INSERT INTO ledger_entries(id, run_id, task_id, provider_call_id, kind, amount_micros, currency, note, created_at)
       VALUES (?, ?, ?, ?, 'reconciliation', ?, 'USD', ?, ?)`,
      createId("ledger"), input.runId, taskId, input.providerCallId, actualCostMicros, input.note.trim(), reconciledAt,
    );
    store.event(input.runId, "provider_call.reconciled", "provider_call", input.providerCallId, {
      taskId, attemptId, attemptNumber: call.attempt_number,
      reservationId: reservation.id,
      estimatedMicros: String(call.estimated_micros ?? reservation.amount_micros),
      actualCostMicros: actualCostMicros.toString(),
      inputTokens: input.inputTokens ?? null,
      outputTokens: input.outputTokens ?? null,
      note: input.note.trim(),
      taskMadeRetryable: retryTask,
    });

    if (retryTask) {
      store.run(
        `UPDATE attempts SET status='failed', failure_signature=?, result_json=?, finished_at=?
         WHERE id=? AND status='running'`,
        sha256(`interrupted:${input.providerCallId}`), JSON.stringify(failureResult), reconciledAt, attemptId,
      );
      store.run("UPDATE sessions SET finished_at=COALESCE(finished_at, ?) WHERE attempt_id=?", reconciledAt, attemptId);
      store.setTaskState(input.runId, taskId, "changes_requested");
      store.event(input.runId, "task.interruption_reconciled", "task", taskId, {
        taskId, attemptId, attemptNumber: call.attempt_number, providerCallId: input.providerCallId,
        retryable: true,
      });
    }
  });

  return {
    providerCallId: input.providerCallId,
    taskId,
    attemptNumber: Number(call.attempt_number),
    actualCostMicros: actualCostMicros.toString(),
    taskMadeRetryable: retryTask,
  };
}
