import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { BrandMark, EyeToggle, Icon, type IconName } from '../design';

interface NavigationItem {
  label: string;
  path: string;
  icon: IconName;
}

const navigationItems: NavigationItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'ssid_chart' },
  { label: 'Registrar', path: '/register', icon: 'edit_note' },
  { label: 'Indicadores', path: '/indicators', icon: 'tune' },
  { label: 'Conclusões', path: '/saved-insights', icon: 'lightbulb' },
];

/**
 * App shell: header with the brand, the global eye toggle and the profile shortcut,
 * a single centered column (max-width var(--container-app)) and the bottom navigation.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-dvh bg-surface text-on-surface">
      <header className="fixed inset-x-0 top-0 z-50 bg-surface/85 pt-safe shadow-[0_1px_8px_rgba(19,27,46,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-(--container-app) items-center justify-between px-margin">
          <div className="flex min-w-0 items-center gap-space-sm">
            <BrandMark />
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="font-headline-md text-headline-md tracking-tight text-on-surface">Pulsar</span>
              <span className="rounded-full bg-surface-container-high px-2 py-0.5 font-label-code text-label-code tracking-wider text-primary uppercase">
                Beta V1
              </span>
            </div>
          </div>
          <div className="flex items-center gap-space-sm">
            <EyeToggle />
            <Link
              to="/settings"
              aria-label="Abrir configurações"
              className="flex min-h-11 min-w-11 items-center justify-center transition-transform active:scale-95"
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-on-primary ring-2 ring-primary-fixed/50">
                <Icon name="person" className="text-[18px]" />
              </span>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-dvh w-full max-w-(--container-app) flex-col px-margin pt-20 pb-24">
        {children}
      </main>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-50 bg-surface/90 pb-safe shadow-[0_-2px_12px_rgba(19,27,46,0.05)] backdrop-blur-xl"
      >
        <div className="mx-auto flex h-16 w-full max-w-md items-center justify-around px-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.path;
            const isRegister = item.path === '/register';
            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={`flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center rounded-lg transition-colors ${
                  isActive ? 'font-semibold text-primary' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {/* Fixed icon slot keeps every label on the same baseline, even with the raised FAB. */}
                <span className="relative flex h-7 w-full items-center justify-center">
                  {isRegister ? (
                    <span className="absolute -top-4 flex size-11 items-center justify-center rounded-full bg-primary-container text-on-primary shadow-[0_4px_12px_rgba(99,14,212,0.3)] active:scale-95">
                      <Icon name={item.icon} className="text-[22px]" />
                    </span>
                  ) : (
                    <>
                      <Icon name={item.icon} className="text-[24px]" />
                      {isActive && <span className="absolute -bottom-1 size-1.5 rounded-full bg-primary" />}
                    </>
                  )}
                </span>
                <span className="font-label-md text-label-md tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
