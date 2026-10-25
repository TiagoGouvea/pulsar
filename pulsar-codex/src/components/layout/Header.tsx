import React from 'react';
import { Link } from 'react-router-dom';
import { useFirebase } from '@lib/firebase/context';
import { Button } from '@components/ui/Button';

export const Header: React.FC = () => {
  const { user } = useFirebase();

  const isAuthPage = false;

  if (isAuthPage && !user) {
    return (
      <header className="fixed top-0 w-full z-50 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(19,27,46,0.04)]">
        <div className="h-16 px-gutter flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-on-primary text-[18px]">science</span>
            </div>
            <span className="font-headline-md text-headline-md text-on-surface tracking-tight">Pulsar</span>
          </div>
          <div className="flex items-center gap-space-sm">
            <Link
              to="/onboarding"
              className="min-h-[44px] px-space-md flex items-center justify-center rounded-full text-primary hover:bg-surface-container-high transition-colors font-label-lg text-label-lg"
            >
              Começar
            </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(19,27,46,0.04)]">
      <div className="h-16 px-gutter flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[18px]">science</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-headline-md text-headline-md text-on-surface tracking-tight">Pulsar</span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-label-code text-label-code uppercase tracking-wider">Beta V1</span>
          </div>
        </div>
        <div className="flex items-center gap-space-sm">
          <Button
            variant="ghost"
            size="sm"
            className="min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-full bg-surface-container flex items-center justify-center gap-1.5 text-on-surface-variant hover:text-on-surface active:scale-95 transition-transform duration-150"
          >
            <span className="material-symbols-outlined text-[19px] text-secondary">visibility</span>
            <span className="font-label-code text-label-code uppercase tracking-wider text-secondary">Siglas</span>
          </Button>
          <Link to="/account" className="min-h-[44px] min-w-[44px] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center ring-2 ring-primary-fixed/50">
              <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
