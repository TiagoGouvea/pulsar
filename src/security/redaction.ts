const DEFAULT_PATTERNS = [
  /\b(?:sk|pk|key)-[A-Za-z0-9_-]{12,}\b/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}\b/gi,
  /\b(?:OPENAI|ANTHROPIC|OPENROUTER|GEMINI|ZAI|DEEPSEEK|MOONSHOT)_API_KEY\s*=\s*\S+/gi,
];

export function redact(value: string, extraPatterns: string[] = []): string {
  const patterns = [...DEFAULT_PATTERNS, ...extraPatterns.map((item) => new RegExp(item, "gi"))];
  return patterns.reduce((current, pattern) => current.replace(pattern, "[REDACTED]"), value);
}
