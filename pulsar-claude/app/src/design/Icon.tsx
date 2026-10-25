// Material Symbols Outlined (self-hosted). Decorative by default: pair it with visible text or an aria-label.
export function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined leading-none select-none ${className}`}>
      {name}
    </span>
  );
}
