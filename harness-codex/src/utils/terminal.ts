export type TerminalTone = "blue" | "green" | "yellow" | "red" | "orange" | "cyan";

const ansi: Record<TerminalTone, string> = {
  blue: "34",
  green: "32",
  yellow: "33",
  red: "31",
  orange: "38;5;208",
  cyan: "36",
};

export function colorTerminal(text: string, tone: TerminalTone): string {
  if (!process.stdout.isTTY || process.env.NO_COLOR !== undefined || process.env.TERM === "dumb") return text;
  return `\u001b[${ansi[tone]}m${text}\u001b[0m`;
}

export function terminalTimestamp(value: string | Date = new Date(), timeZone = "America/Sao_Paulo"): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "??:??:??";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

export function terminalLog(message: string, options: { at?: string | Date | undefined; timeZone?: string | undefined; tone?: TerminalTone | undefined } = {}): void {
  const line = `[${terminalTimestamp(options.at, options.timeZone)}] ${message}`;
  console.log(options.tone ? colorTerminal(line, options.tone) : line);
}

export function toneForMessage(message: string): TerminalTone | undefined {
  if (/^Tarefa\s+[^:]+:/.test(message)) return "blue";
  if (/\b(BLOQUEIO|ERRO|falha|falhou|failed|blocked|interrompida|encerrada)\b/i.test(message)) return "red";
  if (/\b(ALERTA|AVISO|ATENÇÃO|RECUPERAÇÃO|incerto|autorizad[ao]|tentativa adicional)\b/i.test(message)) return "yellow";
  if (/\b(concluída|concluído|sucesso|aprovad[ao]|unloaded|carregado)\b/i.test(message)) return "green";
  return undefined;
}
