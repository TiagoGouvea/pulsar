import { iconPaths } from './icons';

export type IconName = keyof typeof iconPaths;

// Material Symbols Outlined glyph as inline SVG (paths from scripts/icons.ts), sized by font-size like the font.
// Decorative by default: pair it with visible text or an aria-label.
export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 -960 960 960"
      className={`inline-block size-[1em] shrink-0 fill-current select-none ${className}`}
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}
