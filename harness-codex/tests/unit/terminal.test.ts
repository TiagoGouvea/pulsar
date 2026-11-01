import { describe, expect, test } from "vitest";
import { terminalTimestamp, toneForMessage } from "../../src/utils/terminal.js";

describe("saída de terminal", () => {
  test("mostra apenas HH:mm:ss no fuso configurado sem alterar o instante UTC de origem", () => {
    expect(terminalTimestamp("2026-10-31T15:00:00.000Z", "America/Sao_Paulo")).toBe("12:00:00");
  });

  test("classifica início, sucesso, alerta e falha para as cores semânticas", () => {
    expect(toneForMessage("Tarefa task-002: criar registro")).toBe("blue");
    expect(toneForMessage("Tarefa task-002 concluída · custo USD 0.01")).toBe("green");
    expect(toneForMessage("RECUPERAÇÃO task-002: nova sessão autorizada")).toBe("yellow");
    expect(toneForMessage("ALERTA: custo incerto")).toBe("yellow");
    expect(toneForMessage("Atenção: chamada cara")).toBe("yellow");
  });
});
