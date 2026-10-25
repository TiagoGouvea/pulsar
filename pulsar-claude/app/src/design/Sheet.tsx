import { useEffect, useId, type ReactNode } from 'react';
import { Icon } from './Icon';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}

// Bottom sheet modal (novo_indicador_modal). Escape and the dimmer close it.
export function Sheet({ open, onClose, title, description, children }: SheetProps) {
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[92dvh] w-full max-w-(--container-app) flex-col overflow-y-auto rounded-t-xl bg-surface-container-lowest pb-6 shadow-level-2"
      >
        <div className="flex justify-center pt-3 pb-1">
          <span className="h-1 w-12 rounded-full bg-outline-variant/60" />
        </div>
        <div className="flex items-start justify-between gap-2 px-gutter pt-2 pb-space-md">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
              {title}
            </h2>
            {description && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">{description}</p>
            )}
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant active:scale-95"
          >
            <Icon name="close" className="text-[20px]" />
          </button>
        </div>
        <div className="flex flex-col gap-space-lg px-gutter">{children}</div>
      </div>
    </div>
  );
}
