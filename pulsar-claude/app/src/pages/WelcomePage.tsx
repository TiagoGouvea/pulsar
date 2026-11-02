import { Link } from 'react-router';
import { BrandMark, Icon, type IconName } from '../design';

const highlights: { icon: IconName; text: string }[] = [
  { icon: 'input', text: 'Registre fatores: hábitos e atividades do seu dia.' },
  { icon: 'insights', text: 'Registre resultados: como você se sente.' },
  { icon: 'analytics', text: 'Descubra possíveis relações, sem cobrança.' },
];

// Welcome screen shown on first access; the three-step tutorial replaces it in a later feature.
export function WelcomePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-(--container-app) flex-col gap-space-lg px-margin py-space-xl">
      <div className="flex items-center gap-space-sm">
        <BrandMark />
        <span className="font-headline-md text-headline-md tracking-tight">Pulsar</span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-space-md">
        <h1 className="font-headline-xl-mobile text-headline-xl-mobile text-balance">
          Boas-vindas ao Pulsar
        </h1>
        <p className="font-body-lg text-body-lg text-balance text-on-surface-variant">
          Registre o que você faz e descubra possíveis relações com como você se sente.
        </p>
        <ul className="flex flex-col gap-2">
          {highlights.map((item) => (
            <li
              key={item.icon}
              className="flex items-center gap-3 rounded-lg bg-surface-container px-4 py-3 font-body-md text-body-md"
            >
              <Icon name={item.icon} className="text-[24px] text-primary" />
              {item.text}
            </li>
          ))}
        </ul>
      </div>
      <Link
        to="/dashboard"
        className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary-container px-5 font-label-lg text-label-lg text-on-primary shadow-md shadow-primary/20 transition-transform active:scale-[0.98]"
      >
        Começar
      </Link>
    </main>
  );
}
