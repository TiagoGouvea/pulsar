export interface LabelSource {
  name: string;
  abbreviation?: string | null;
  emoji?: string | null;
}

// Spec 4.4: abbreviation as typed, or the first 3 letters of the name + "...". No collision handling.
export function abbreviationOf(source: LabelSource): string {
  const typed = source.abbreviation?.trim();
  if (typed) return typed;
  return `${Array.from(source.name.trim()).slice(0, 3).join('')}...`;
}

// The single rule for showing an indicator: name only when revealed; emoji only when revealed.
export function indicatorLabel(
  source: LabelSource,
  isNameRevealed: boolean,
): { text: string; emoji: string | null } {
  if (!isNameRevealed) return { text: abbreviationOf(source), emoji: null };
  return { text: source.name, emoji: source.emoji?.trim() || null };
}
