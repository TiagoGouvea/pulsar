// Temporary landing until F-1.01/F-1.03 add the auth bootstrap and the app shell.
export function HomePlaceholder() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-(--container-app) flex-col justify-center gap-2 px-margin">
      <h1 className="font-headline-xl-mobile text-headline-xl-mobile">Pulsar</h1>
      <p className="font-body-lg text-body-lg text-on-surface-variant">
        Registre o que você faz e descubra possíveis relações com como você se sente.
      </p>
    </main>
  );
}
