import type { ReactNode } from 'react';

// Minimal screen used while auth bootstraps and for routes whose features (tutorial, dashboard) come later.
export function HomePlaceholder({ title = 'Pulsar', children }: { title?: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-(--container-app) flex-col justify-center gap-2 px-margin">
      <h1 className="font-headline-xl-mobile text-headline-xl-mobile">{title}</h1>
      {children}
    </main>
  );
}
