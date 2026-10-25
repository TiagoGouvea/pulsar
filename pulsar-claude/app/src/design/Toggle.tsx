interface ToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

// On/off switch for settings (lembrete, IA). Not used for Sim/Não answers: those use Chip, since
// "not answered" must stay distinct from "Não".
export function Toggle({ label, description, checked, onChange, disabled }: ToggleProps) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4">
      <span className="flex flex-col">
        <span className="font-label-lg text-label-lg text-on-surface">{label}</span>
        {description && (
          <span className="font-body-sm text-body-sm text-on-surface-variant">{description}</span>
        )}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="flex h-11 w-12 shrink-0 items-center disabled:opacity-50"
      >
        <span
          className={`relative h-11 w-12 rounded-full transition-colors ${checked ? 'bg-primary-container' : 'bg-outline-variant'}`}
        >
          <span
            className={`absolute top-1.5 left-1.5 h-8 w-8 rounded-full bg-surface-container-lowest shadow-level-1 transition-transform ${checked ? 'translate-x-2.5' : ''}`}
          />
        </span>
      </button>
    </label>
  );
}
