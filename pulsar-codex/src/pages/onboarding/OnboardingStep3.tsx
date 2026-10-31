import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heading } from '@components/ui/Heading';
import { Text } from '@components/ui/Text';
import { Button } from '@components/ui/Button';
import { useOnboardingCompletion } from '@features/onboarding/useOnboardingCompletion';

const guarantees = [
  {
    icon: 'no_accounts',
    tone: 'bg-secondary-fixed text-on-secondary-fixed-variant',
    title: 'Conta anônima inicial',
    description: 'Comece agora mesmo no aparelho, sem login ou burocracia.'
  },
  {
    icon: 'visibility_off',
    tone: 'bg-primary-fixed text-primary',
    title: 'Modo siglas imediato',
    description: 'Oculte nomes sensíveis com um toque quando precisar.'
  },
  {
    icon: 'bolt',
    tone: 'bg-primary-fixed text-primary',
    title: '15 segundos por dia',
    description: 'Controles rápidos, desenhados para usar com uma mão.'
  }
];

export const OnboardingStep3: React.FC = () => {
  const navigate = useNavigate();
  const { complete, isCompleting, error } = useOnboardingCompletion();

  const handleBack = () => {
    navigate('/onboarding/2');
  };

  const finish = () => {
    void complete();
  };

  return (
    <div className="flex flex-col min-h-screen px-gutter pb-32">
      <div className="w-full max-w-xl mx-auto pt-space-md pb-space-sm flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <span className="font-label-code text-label-code text-on-surface-variant uppercase tracking-wider">Passo 03 // 03</span>
          <span className="font-label-code text-label-code text-primary font-semibold uppercase tracking-wider">Associações</span>
        </div>
        <div className="flex items-center gap-1.5 w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden" aria-hidden="true">
          <div className="h-full w-1/3 bg-primary rounded-full" />
          <div className="h-full w-1/3 bg-primary rounded-full" />
          <div className="h-full w-1/3 bg-primary rounded-full" />
        </div>
      </div>

      <div className="w-full max-w-xl mx-auto flex flex-col gap-space-lg">
        <div className="flex flex-col gap-space-xs">
          <div className="inline-flex items-center gap-space-xs self-start px-3 py-1 rounded-full bg-surface-container-high text-primary font-label-code text-label-code uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />
            <span>Passo 3 de 3 • Ciência pessoal</span>
          </div>
          <Heading level={1} variant="mobile">
            Descubra associações reais nos seus dados
          </Heading>
          <Text variant="body-md" color="on-surface-variant">
            O Pulsar cruza o que você faz com o que você sente. Sem palpites: as associações são calculadas a partir dos seus próprios registros.
          </Text>
        </div>

        <section aria-labelledby="onboarding-association-sample" className="rounded-lg bg-surface-container-lowest p-space-md shadow-sm flex flex-col gap-space-md">
          <div className="flex flex-wrap items-center justify-between gap-space-sm">
            <div className="flex items-center gap-space-xs" aria-hidden="true">
              <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed font-label-code text-label-code">FAT • FATOR</span>
              <span className="material-symbols-outlined text-[16px] text-on-surface-variant">arrow_forward</span>
              <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-code text-label-code">RES • RESULTADO</span>
            </div>
            <span className="font-label-code text-label-code text-primary bg-primary-fixed/50 px-2 py-0.5 rounded-full">Possível associação</span>
          </div>

          <div className="relative w-full h-32 rounded bg-surface-container-low overflow-hidden px-2 pt-3">
            <svg className="w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 320 90" aria-hidden="true">
              <defs>
                <linearGradient id="onboardingAssociationsArea" x1="0" x2="320" y1="0" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0051d5" stopOpacity="0.22" />
                  <stop offset="55%" stopColor="#316bf3" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="onboardingAssociationsLine" x1="0" x2="320" y1="0" y2="0" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#0051d5" />
                  <stop offset="55%" stopColor="#316bf3" />
                  <stop offset="100%" stopColor="#630ed4" />
                </linearGradient>
              </defs>
              <path d="M 10,75 C 60,75 100,55 160,40 C 220,25 270,18 310,18 L 310,85 L 10,85 Z" fill="url(#onboardingAssociationsArea)" />
              <path d="M 10,72 Q 40,65 75,70 T 145,50 T 215,32 T 310,18" fill="none" stroke="url(#onboardingAssociationsLine)" strokeLinecap="round" strokeWidth="2.5" />
              <circle cx="75" cy="70" r="4.5" fill="#0051d5" />
              <circle cx="145" cy="50" r="4.5" fill="#316bf3" />
              <circle cx="215" cy="32" r="5" fill="#630ed4" />
              <circle cx="310" cy="18" r="6" fill="#630ed4" />
              <circle cx="310" cy="18" r="10" fill="none" stroke="#7c3aed" strokeOpacity="0.3" strokeWidth="2" />
            </svg>
            <div className="absolute inset-x-2 bottom-2 flex justify-between gap-1 font-label-code text-[10px] text-on-surface-variant" aria-hidden="true">
              <span>T0 • ENTRADA</span>
              <span className="text-primary font-semibold text-center">T+Δ • ASSOCIAÇÃO</span>
              <span className="text-right">EFEITO</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-space-sm">
            <div className="p-space-sm rounded bg-surface-container-low flex flex-col">
              <span className="font-label-code text-label-code text-on-surface-variant">COM EXERCÍCIO</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-stat-display text-stat-display text-on-surface">7,4</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">/ 10</span>
              </div>
              <span className="font-label-code text-[10px] text-tertiary font-semibold mt-0.5">Energia média observada</span>
            </div>
            <div className="p-space-sm rounded bg-surface-container-low flex flex-col">
              <span className="font-label-code text-label-code text-on-surface-variant">SEM EXERCÍCIO</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-stat-display text-stat-display text-on-surface-variant">5,8</span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">/ 10</span>
              </div>
              <span className="font-label-code text-[10px] text-on-surface-variant mt-0.5">Linha de base observada</span>
            </div>
          </div>

          <div id="onboarding-association-sample" className="flex flex-col gap-space-xs">
            <Heading level={2} variant="mobile">Exemplo de leitura</Heading>
            <Text variant="body-sm" color="on-surface-variant">
              Nos dias com exercício registrado, sua energia média apareceu mais alta. Isso é uma associação, não uma prova de causa.
            </Text>
            <div className="flex items-start gap-1.5 pt-space-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-[16px] text-outline shrink-0 mt-0.5" aria-hidden="true">verified_user</span>
              <p className="font-label-code text-[10px] leading-tight text-outline">
                Correlação estatística não implica causalidade. O Pulsar mostra possíveis associações e mantém a interpretação com você.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="onboarding-guarantees" className="flex flex-col gap-space-xs">
          <h2 id="onboarding-guarantees" className="font-label-code text-label-code text-on-surface-variant uppercase tracking-wider">
            Garantias da plataforma
          </h2>
          {guarantees.map((guarantee) => (
            <div key={guarantee.title} className="flex items-center gap-space-md p-space-sm rounded bg-surface-container-lowest">
              <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${guarantee.tone}`} aria-hidden="true">
                <span className="material-symbols-outlined text-[20px]">{guarantee.icon}</span>
              </span>
              <div className="flex flex-col min-w-0">
                <Heading level={3} variant="mobile">{guarantee.title}</Heading>
                <Text variant="body-sm" color="on-surface-variant">{guarantee.description}</Text>
              </div>
            </div>
          ))}
        </section>

        <Button variant="primary" size="lg" fullWidth className="min-h-[52px]" onClick={finish} disabled={isCompleting}>
          {isCompleting ? 'Salvando conclusão…' : 'Começar a Explorar'}
          {!isCompleting && <span className="material-symbols-outlined text-[20px] ml-2" aria-hidden="true">arrow_forward</span>}
        </Button>
      </div>

      <div className="fixed bottom-0 w-full bg-surface pt-safe pb-safe px-gutter py-4 border-t border-outline/20">
        <div className="max-w-xl mx-auto">
          {error && <p role="alert" className="body-sm text-error mb-space-sm">{error}</p>}
          <div className="flex items-center justify-between gap-space-sm">
            <Button variant="text" onClick={handleBack} disabled={isCompleting}>
              Voltar
            </Button>
            <Button variant="text" onClick={finish} className="text-primary" disabled={isCompleting}>
              Pular
            </Button>
            <Button variant="primary" onClick={finish} disabled={isCompleting}>
              {isCompleting ? 'Salvando…' : 'Concluir'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingStep3;
