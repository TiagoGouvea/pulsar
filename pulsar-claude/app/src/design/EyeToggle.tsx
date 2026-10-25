import { usePrivacy } from '../privacy/PrivacyContext';
import { Icon } from './Icon';

// Global "olhinho": switches indicator names <-> abbreviations everywhere. Closed (siglas) on every app open.
export function EyeToggle() {
  const { isNameRevealed, toggleNames } = usePrivacy();
  return (
    <button
      type="button"
      data-testid="eye-toggle"
      aria-pressed={isNameRevealed}
      aria-label={
        isNameRevealed ? 'Nomes: ocultar nomes dos indicadores' : 'Siglas: mostrar nomes dos indicadores'
      }
      onClick={toggleNames}
      className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full bg-surface-container px-2.5 py-1.5 text-secondary transition-transform active:scale-95"
    >
      <Icon name={isNameRevealed ? 'visibility' : 'visibility_off'} className="text-[19px]" />
      <span className="font-label-code text-label-code tracking-wider uppercase">
        {isNameRevealed ? 'Nomes' : 'Siglas'}
      </span>
    </button>
  );
}
