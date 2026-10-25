import type { HarnessConfig } from "../config/schema.js";
import type { ModelCandidate } from "../domain/types.js";
import type { StateStore } from "../state/store.js";
import { createId, formatMicros, nowUtc, parseUsdToMicros } from "../utils/core.js";

export interface BudgetSnapshot {
  limitMicros: bigint | null;
  confirmedMicros: bigint;
  reservedMicros: bigint;
  uncertainMicros: bigint;
  usableMicros: bigint | null;
}

function sumField(rows: Array<Record<string, unknown>>, field: string): bigint {
  return rows.reduce((total, row) => {
    const value = row[field];
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "bigint") return total;
    return total + BigInt(value);
  }, 0n);
}

export class BudgetLedger {
  constructor(private readonly store: StateStore, private readonly config: HarnessConfig) {}

  snapshot(runId: string): BudgetSnapshot {
    const confirmedRows = this.store.all<Record<string, unknown>>(
      "SELECT amount_micros FROM ledger_entries WHERE run_id=? AND kind IN ('charge','reconciliation')", runId,
    );
    const reservationRows = this.store.all<Record<string, unknown>>(
      "SELECT amount_micros FROM cost_reservations WHERE run_id=? AND state IN ('active','uncertain')", runId,
    );
    const uncertainRows = this.store.all<Record<string, unknown>>(
      "SELECT amount_micros FROM cost_reservations WHERE run_id=? AND state='uncertain'", runId,
    );
    const limitMicros = parseUsdToMicros(this.config.budget.projectLimit);
    const confirmedMicros = sumField(confirmedRows, "amount_micros");
    const reservedMicros = sumField(reservationRows, "amount_micros");
    const uncertainMicros = sumField(uncertainRows, "amount_micros");
    return {
      limitMicros,
      confirmedMicros,
      reservedMicros,
      uncertainMicros,
      usableMicros: limitMicros == null ? null : limitMicros - confirmedMicros - reservedMicros,
    };
  }

  milestoneSnapshot(runId: string, milestoneId: string): BudgetSnapshot {
    const confirmedRows = this.store.all<Record<string, unknown>>(
      `SELECT le.amount_micros FROM ledger_entries le
       JOIN tasks t ON t.run_id=le.run_id AND t.id=le.task_id
       WHERE le.run_id=? AND t.milestone_id=? AND le.kind IN ('charge','reconciliation')`, runId, milestoneId,
    );
    const reservationRows = this.store.all<Record<string, unknown>>(
      `SELECT cr.amount_micros FROM cost_reservations cr
       JOIN tasks t ON t.run_id=cr.run_id AND t.id=cr.task_id
       WHERE cr.run_id=? AND t.milestone_id=? AND cr.state IN ('active','uncertain')`, runId, milestoneId,
    );
    const uncertainRows = this.store.all<Record<string, unknown>>(
      `SELECT cr.amount_micros FROM cost_reservations cr
       JOIN tasks t ON t.run_id=cr.run_id AND t.id=cr.task_id
       WHERE cr.run_id=? AND t.milestone_id=? AND cr.state='uncertain'`, runId, milestoneId,
    );
    const limitMicros = parseUsdToMicros(this.config.budget.milestoneLimits[milestoneId] ?? this.config.budget.milestoneLimit);
    const confirmedMicros = sumField(confirmedRows, "amount_micros");
    const reservedMicros = sumField(reservationRows, "amount_micros");
    const uncertainMicros = sumField(uncertainRows, "amount_micros");
    return {
      limitMicros, confirmedMicros, reservedMicros, uncertainMicros,
      usableMicros: limitMicros == null ? null : limitMicros - confirmedMicros - reservedMicros,
    };
  }

  estimate(candidate: ModelCandidate, inputTokens: number, outputTokens: number): bigint {
    if (candidate.modality !== "metered_api") return 0n;
    if (!candidate.inputUsdPerMillion || !candidate.outputUsdPerMillion) {
      throw new Error(`Preço desconhecido para ${candidate.alias}.`);
    }
    const inputRate = parseUsdToMicros(candidate.inputUsdPerMillion) ?? 0n;
    const outputRate = parseUsdToMicros(candidate.outputUsdPerMillion) ?? 0n;
    return (inputRate * BigInt(inputTokens) + outputRate * BigInt(outputTokens) + 999_999n) / 1_000_000n;
  }

  reserve(runId: string, taskId: string, candidate: ModelCandidate, amountMicros: bigint): string {
    if (candidate.modality === "metered_api" && this.config.budget.projectLimit == null) {
      throw new Error("Chamadas pagas estão bloqueadas: defina budget.projectLimit.");
    }
    const id = createId("reservation");
    this.store.transaction(() => {
      const snapshot = this.snapshot(runId);
      const finalReserve = snapshot.limitMicros == null ? 0n :
        snapshot.limitMicros * BigInt(this.config.budget.finalVerificationReservePercent) / 100n;
      if (snapshot.usableMicros != null && snapshot.usableMicros - finalReserve < amountMicros) {
        throw new Error(`Orçamento insuficiente: necessário USD ${formatMicros(amountMicros)}.`);
      }
      const task = this.store.get<Record<string, unknown>>("SELECT milestone_id FROM tasks WHERE run_id=? AND id=?", runId, taskId);
      if (task) {
        const milestoneId = String(task.milestone_id);
        const milestone = this.milestoneSnapshot(runId, milestoneId);
        if (milestone.usableMicros != null && milestone.usableMicros < amountMicros) {
          throw new Error(`Teto de ${milestoneId} insuficiente: necessário USD ${formatMicros(amountMicros)}.`);
        }
      }
      const taskLimit = parseUsdToMicros(this.config.budget.taskLimit);
      if (taskLimit != null) {
        const taskRows = this.store.all<Record<string, unknown>>(
          `SELECT amount_micros FROM ledger_entries WHERE run_id=? AND task_id=? AND kind IN ('charge','reconciliation')
           UNION ALL SELECT amount_micros FROM cost_reservations WHERE run_id=? AND task_id=? AND state IN ('active','uncertain')`,
          runId, taskId, runId, taskId,
        );
        if (taskLimit - sumField(taskRows, "amount_micros") < amountMicros) {
          throw new Error(`Teto da tarefa ${taskId} insuficiente: necessário USD ${formatMicros(amountMicros)}.`);
        }
      }
      const dailyLimit = parseUsdToMicros(this.config.budget.dailyLimit);
      if (dailyLimit != null) {
        const day = nowUtc().slice(0, 10);
        const dailyRows = this.store.all<Record<string, unknown>>(
          `SELECT amount_micros FROM ledger_entries WHERE run_id=? AND substr(created_at,1,10)=? AND kind IN ('charge','reconciliation')
           UNION ALL SELECT amount_micros FROM cost_reservations WHERE run_id=? AND substr(created_at,1,10)=? AND state IN ('active','uncertain')`,
          runId, day, runId, day,
        );
        if (dailyLimit - sumField(dailyRows, "amount_micros") < amountMicros) {
          throw new Error(`Teto diário insuficiente: necessário USD ${formatMicros(amountMicros)}.`);
        }
      }
      this.store.run(
        "INSERT INTO cost_reservations(id, run_id, task_id, amount_micros, state, created_at) VALUES (?, ?, ?, ?, 'active', ?)",
        id, runId, taskId, amountMicros, nowUtc(),
      );
      this.store.event(runId, "budget.reserved", "cost_reservation", id, { taskId, amountMicros: amountMicros.toString() });
    });
    return id;
  }

  reconcile(input: { runId: string; taskId: string; reservationId: string; providerCallId?: string; amountMicros: bigint; uncertain?: boolean }): void {
    this.store.transaction(() => {
      this.store.run(
        "UPDATE cost_reservations SET state=?, released_at=? WHERE id=? AND state='active'",
        input.uncertain ? "uncertain" : "released", input.uncertain ? null : nowUtc(), input.reservationId,
      );
      if (!input.uncertain) {
        this.store.run(
          "INSERT INTO ledger_entries(id, run_id, task_id, provider_call_id, kind, amount_micros, currency, note, created_at) VALUES (?, ?, ?, ?, 'charge', ?, 'USD', ?, ?)",
          createId("ledger"), input.runId, input.taskId, input.providerCallId ?? null, input.amountMicros,
          "Consumo reconciliado da chamada", nowUtc(),
        );
      }
      this.store.event(input.runId, input.uncertain ? "budget.uncertain" : "budget.reconciled", "cost_reservation", input.reservationId, {
        amountMicros: input.amountMicros.toString(),
      });
    });
  }
}
