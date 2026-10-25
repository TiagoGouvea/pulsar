import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heading } from '@components/ui/Heading';
import { Text } from '@components/ui/Text';
import { Card } from '@components/ui/Card';
import { Button } from '@components/ui/Button';

export const OnboardingStep1: React.FC = () => {
  const navigate = useNavigate();

  const handleNext = () => {
    navigate('/onboarding/2');
  };

  const handleBack = () => {
    navigate('/onboarding');
  };

  const handleSkip = () => {
    navigate('/onboarding/3');
  };

  return (
    <div className="flex flex-col min-h-screen px-gutter pb-safe">
      {/* Progress Tracker */}
      <div className="pt-16 px-gutter pt-space-md pb-space-sm flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <span className="font-label-code text-label-code text-on-surface-variant uppercase tracking-wider">Passo 01 // 03</span>
          <span className="font-label-code text-label-code text-primary font-semibold uppercase tracking-wider">Fatores</span>
        </div>
        <div className="flex items-center gap-1.5 w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-primary rounded-full transition-all duration-500 shadow-sm"></div>
          <div className="h-full w-1/3 bg-surface-variant rounded-full opacity-60"></div>
          <div className="h-full w-1/3 bg-surface-variant rounded-full opacity-60"></div>
        </div>
      </div>

      <div className="flex-1 flex flex-col mt-space-md">
        {/* Hero Graphic */}
        <div className="px-gutter my-space-md">
          <Card padding="lg" hover variant="elevated">
            <div className="relative w-full rounded-lg bg-surface-container-low p-space-lg overflow-hidden shadow-sm flex flex-col items-center">
              <div className="absolute -right-12 -top-12 w-48 h-48 bg-secondary-fixed/50 rounded-full blur-2xl pointer-events-none"></div>
              <div className="absolute -left-10 -bottom-10 w-44 h-44 bg-primary-fixed/40 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="relative w-full max-w-[280px] h-44 flex items-center justify-center">
                {/* Center Pulsar Core */}
                <div className="w-16 h-16 rounded-full bg-surface-container-lowest shadow-md flex items-center justify-center z-10">
                  <div className="w-11 h-11 rounded-full bg-secondary text-on-secondary flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[24px]">science</span>
                  </div>
                </div>

                {/* Connecting Rays */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" fill="none" viewBox="0 0 280 176">
                  <circle className="text-surface-variant" cx="140" cy="88" r="64" stroke="currentColor" strokeDasharray="3 3" strokeWidth="1.5"></circle>
                  <line className="text-secondary-fixed-dim" stroke="currentColor" strokeWidth="1.5" x1="140" x2="52" y1="88" y2="40"></line>
                  <line className="text-secondary-fixed-dim" stroke="currentColor" strokeWidth="1.5" x1="140" x2="228" y1="88" y2="40"></line>
                  <line className="text-secondary-fixed-dim" stroke="currentColor" strokeWidth="1.5" x1="140" x2="52" y1="88" y2="136"></line>
                  <line className="text-secondary-fixed-dim" stroke="currentColor" strokeWidth="1.5" x1="140" x2="228" y1="88" y2="136"></line>
                </svg>

                {/* Floating Factor Nodes */}
                <div className="absolute left-2 top-3 bg-surface-container-lowest shadow-md px-2.5 py-1.5 rounded-full flex items-center gap-1.5 animate-bounce" style={{ animationDuration: '3.2s' }}>
                  <span className="px-1.5 py-0.5 rounded bg-secondary/10 text-secondary font-label-code text-label-code">CAF</span>
                  <span className="material-symbols-outlined text-[16px] text-secondary">coffee</span>
                  <span className="font-label-md text-label-md text-on-surface">Café</span>
                </div>

                <div className="absolute right-2 top-3 bg-surface-container-lowest shadow-md px-2.5 py-1.5 rounded-full flex items-center gap-1.5 animate-bounce" style={{ animationDuration: '2.8s', animationDelay: '0.4s' }}>
                  <span className="px-1.5 py-0.5 rounded bg-secondary/10 text-secondary font-label-code text-label-code">EXE</span>
                  <span className="material-symbols-outlined text-[16px] text-secondary">fitness_center</span>
                  <span className="font-label-md text-label-md text-on-surface">Treino</span>
                </div>

                <div className="absolute left-2 bottom-3 bg-surface-container-lowest shadow-md px-2.5 py-1.5 rounded-full flex items-center gap-1.5 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.2s' }}>
                  <span className="px-1.5 py-0.5 rounded bg-secondary/10 text-secondary font-label-code text-label-code">Q10</span>
                  <span className="material-symbols-outlined text-[16px] text-secondary">medication</span>
                  <span className="font-label-md text-label-md text-on-surface">Suplemento</span>
                </div>

                <div className="absolute right-2 bottom-3 bg-surface-container-lowest shadow-md px-2.5 py-1.5 rounded-full flex items-center gap-1.5 animate-bounce" style={{ animationDuration: '3s', animationDelay: '0.6s' }}>
                  <span className="px-1.5 py-0.5 rounded bg-secondary/10 text-secondary font-label-code text-label-code">SLP</span>
                  <span className="material-symbols-outlined text-[16px] text-secondary">bedtime</span>
                  <span className="font-label-md text-label-md text-on-surface">Leitura</span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mt-2 bg-secondary-fixed/60 px-3 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                <span className="font-label-code text-label-code text-on-secondary-fixed uppercase tracking-wider font-semibold">Inputs Bio-Comportamentais</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Narrative Header */}
        <div className="px-gutter flex flex-col gap-space-xs mt-space-xs mb-space-md">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-code text-label-code uppercase">Passo 1 de 3 • Fatores</span>
          </div>
          <Heading level={1} variant="mobile">
            Observe sua rotina sem burocracia
          </Heading>
          <Text variant="body-md" color="on-surface-variant" align="left">
            Fatores são hábitos, atividades e consumos do seu dia a dia. Você não precisa preencher dezenas de perguntas: registre apenas o que quiser em 15 segundos.
          </Text>
        </div>

        {/* Interactive Sandbox */}
        <div className="px-gutter mb-space-md">
          <Card padding="lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[20px]">touch_app</span>
                <span className="font-label-lg text-label-lg text-on-surface">Exemplos práticos de registro</span>
              </div>
              <span className="font-label-code text-label-code text-secondary font-semibold uppercase">Interativo</span>
            </div>

            {/* Demo Item 1 */}
            <div className="bg-surface-container-low rounded-lg p-space-sm flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="px-2 py-0.5 rounded bg-secondary/10 text-secondary font-label-code text-label-code font-bold shrink-0">EXE</span>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-lg text-label-lg text-on-surface truncate">Exercício Físico</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Intensidade moderada</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button className="h-10 rounded-full bg-secondary text-on-secondary font-label-md text-label-md flex items-center justify-center shadow-sm active:scale-95 transition-all">
                  Sim
                </button>
                <button className="h-10 rounded-full bg-surface-container text-on-surface-variant font-label-md text-label-md flex items-center justify-center hover:bg-surface-container-high active:scale-95 transition-all">
                  Não
                </button>
              </div>
            </div>

            {/* Demo Item 2 */}
            <div className="bg-surface-container-low rounded-lg p-space-sm flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="px-2 py-0.5 rounded bg-secondary/10 text-secondary font-label-code text-label-code font-bold shrink-0">CAF</span>
                <div className="flex flex-col min-w-0">
                  <span className="font-label-lg text-label-lg text-on-surface truncate">Café Expresso</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Xícaras (200ml)</span>
                </div>
              </div>
              <div className="flex items-center justify-between bg-surface-container-low p-1.5 rounded-full">
                <button className="w-10 h-10 rounded-full bg-surface-container text-on-surface flex items-center justify-center active:scale-90 transition-transform shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">remove</span>
                </button>
                <div className="flex flex-col items-center justify-center">
                  <span className="font-stat-display text-stat-display text-secondary leading-none">2</span>
                  <span className="font-label-code text-label-code text-on-surface-variant uppercase">Xícaras</span>
                </div>
                <button className="w-10 h-10 rounded-full bg-secondary text-on-secondary flex items-center justify-center active:scale-90 transition-transform shadow-xs">
                  <span className="material-symbols-outlined text-[20px]">add</span>
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 w-full bg-surface pt-safe pb-safe px-gutter py-4 border-t border-outline/20">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <Button variant="text" onClick={handleBack}>
            Voltar
          </Button>
          <Button variant="text" onClick={handleSkip} className="text-primary">
            Pular
          </Button>
          <Button variant="primary" onClick={handleNext}>
            Próximo
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingStep1;
