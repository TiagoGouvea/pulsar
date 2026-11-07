import React, { useEffect } from 'react';
import { MaterialIcon } from './MaterialIcon';

interface BottomSheetProps {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Mobile bottom sheet used for the indicator action menus, following the
 * official design: dimmed backdrop, rounded top panel and a drag pill.
 * Escape and a backdrop tap close it.
 */
export function BottomSheet({ open, title, subtitle, onClose, children }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-sm"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute bottom-0 inset-x-0 max-w-md mx-auto bg-surface rounded-t-3xl p-space-lg flex flex-col gap-space-md shadow-xl max-h-[85vh] overflow-y-auto"
      >
        <div className="w-12 h-1.5 rounded-full bg-outline-variant mx-auto" aria-hidden="true" />
        <div className="flex items-center justify-between gap-space-sm">
          <div className="flex flex-col min-w-0">
            <h2 className="font-headline-md text-headline-md text-on-surface truncate">{title}</h2>
            {subtitle && (
              <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                {subtitle}
              </span>
            )}
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface shrink-0"
          >
            <MaterialIcon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default BottomSheet;
