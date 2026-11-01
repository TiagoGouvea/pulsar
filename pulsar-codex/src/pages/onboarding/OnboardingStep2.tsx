import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heading } from '@components/ui/Heading';
import { Text } from '@components/ui/Text';
import { Card } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { MaterialIcon } from '@components/ui/MaterialIcon';
import { useOnboardingCompletion } from '@features/onboarding/useOnboardingCompletion';
import { useScrollToTop } from '@features/onboarding/useScrollToTop';

export const OnboardingStep2: React.FC = () => {
  const navigate = useNavigate();
  const { complete, isCompleting, error } = useOnboardingCompletion();
  useScrollToTop();

  const handleNext = () => {
    navigate('/onboarding/3');
  };

  const handleBack = () => {
    navigate('/onboarding/1');
  };

  const handleSkip = () => {
    void complete();
  };

  return (
    <div className="flex flex-col min-h-screen px-gutter pb-32">
      {/* Progress Tracker */}
      <div className="pt-16 px-gutter pt-space-md pb-space-sm flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <span className="font-label-code text-label-code text-on-surface-variant uppercase tracking-wider">Passo 02 // 03</span>
          <span className="font-label-code text-label-code text-primary font-semibold uppercase tracking-wider">Resultados</span>
        </div>
        <div className="flex items-center gap-1.5 w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-primary rounded-full opacity-60"></div>
          <div className="h-full w-1/3 bg-primary rounded-full transition-all duration-500 shadow-sm"></div>
          <div className="h-full w-1/3 bg-surface-variant rounded-full opacity-60"></div>
        </div>
      </div>

      <div className="flex-1 flex flex-col mt-space-md">
        {/* Hero Graphic */}
        <div className="px-gutter my-space-md">
          <div className="relative w-full rounded-lg bg-surface-container-low p-space-lg overflow-hidden shadow-sm flex flex-col items-center">
            <div className="absolute -right-10 -top-8 w-44 h-44 bg-primary-fixed/50 rounded-full blur-2xl pointer-events-none"></div>
            <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-tertiary-fixed/40 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="relative w-full max-w-[280px] h-44 flex items-center justify-center">
              {/* Center Result Core */}
              <div className="w-16 h-16 rounded-full bg-surface-container-lowest shadow-md flex items-center justify-center z-10">
                <div className="w-11 h-11 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-sm">
                  <MaterialIcon name="bolt" size={24} />
                </div>
              </div>

              {/* Connecting Rays */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" fill="none" viewBox="0 0 280 176">
                <circle className="text-surface-variant" cx="140" cy="88" r="64" stroke="currentColor" strokeDasharray="3 3" strokeWidth="1.5"></circle>
                <line className="text-primary-fixed-dim" stroke="currentColor" strokeWidth="1.5" x1="140" x2="52" y1="88" y2="40"></line>
                <line className="text-primary-fixed-dim" stroke="currentColor" strokeWidth="1.5" x1="140" x2="228" y1="88" y2="40"></line>
                <line className="text-primary-fixed-dim" stroke="currentColor" strokeWidth="1.5" x1="140" x2="52" y1="88" y2="136"></line>
                <line className="text-primary-fixed-dim" stroke="currentColor" strokeWidth="1.5" x1="140" x2="228" y1="88" y2="136"></line>
              </svg>

              {/* Floating Result Nodes */}
              <div className="absolute left-2 top-3 bg-surface-container-lowest shadow-md px-1.5 py-1 rounded-full flex items-center gap-1 animate-bounce" style={{ animationDuration: '3s' }}>
                <span className="px-1 py-0.5 rounded bg-primary/10 text-primary font-label-code text-label-code">ENE</span>
                <MaterialIcon name="flash_on" size={14} className="text-primary" />
                <span className="font-label-md text-label-md text-on-surface">Energia</span>
              </div>

              <div className="absolute right-2 top-3 bg-surface-container-lowest shadow-md px-1.5 py-1 rounded-full flex items-center gap-1 animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.3s' }}>
                <span className="px-1 py-0.5 rounded bg-primary/10 text-primary font-label-code text-label-code">CON</span>
                <MaterialIcon name="psychology" size={14} className="text-primary" />
                <span className="font-label-md text-label-md text-on-surface">Concentração</span>
              </div>

              <div className="absolute left-2 bottom-3 bg-surface-container-lowest shadow-md px-1.5 py-1 rounded-full flex items-center gap-1 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.1s' }}>
                <span className="px-1 py-0.5 rounded bg-primary/10 text-primary font-label-code text-label-code">HUM</span>
                <MaterialIcon name="mood" size={14} className="text-primary" />
                <span className="font-label-md text-label-md text-on-surface">Humor</span>
              </div>

              <div className="absolute right-2 bottom-3 bg-surface-container-lowest shadow-md px-1.5 py-1 rounded-full flex items-center gap-1 animate-bounce" style={{ animationDuration: '2.8s', animationDelay: '0.5s' }}>
                <span className="px-1 py-0.5 rounded bg-primary/10 text-primary font-label-code text-label-code">DOR</span>
                <MaterialIcon name="healing" size={14} className="text-primary" />
                <span className="font-label-md text-label-md text-on-surface">Dor</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-2 bg-primary-fixed/60 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
              <span className="font-label-code text-label-code text-on-primary-fixed uppercase tracking-wider font-semibold">Medições e Percepções</span>
            </div>
          </div>
        </div>

        {/* Narrative Header */}
        <div className="px-gutter flex flex-col gap-space-xs mt-space-xs mb-space-md">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-code text-label-code uppercase">Passo 2 de 3 • Resultados</span>
          </div>
          <Heading level={1} variant="mobile">
            Acompanhe como você se sente
          </Heading>
          <Text variant="body-md" color="on-surface-variant" align="left">
            Resultados são percepções ou medições que você quer acompanhar. Defina o que considera ideal: quanto maior melhor, quanto menor melhor, ou uma faixa ideal.
          </Text>
        </div>

        {/* Interactive Sandbox */}
        <div className="px-gutter mb-space-md">
          <Card padding="lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MaterialIcon name="touch_app" size={20} className="text-primary" />
                <span className="font-label-lg text-label-lg text-on-surface">Exemplos de definição</span>
              </div>
              <span className="font-label-code text-label-code text-primary font-semibold uppercase">Interativo</span>
            </div>

            {/* Demo Item 1 */}
            <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col gap-2 mb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-label-code text-label-code font-bold shrink-0">ENE</span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-lg text-label-lg text-on-surface truncate">Nível de Energia</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Scale de 0 a 10</span>
                  </div>
                </div>
              </div>
              <div className="bg-surface-container-high rounded-full px-4 py-2 flex items-center justify-between">
                <span className="font-label-code text-label-code text-on-surface-variant">0</span>
                <div className="flex items-center gap-3">
                  {[0, 2, 4, 6, 8, 10].map((value) => (
                    <button key={value} className={`w-6 h-6 rounded-full flex items-center justify-center font-label-code text-label-code transition-colors ${value === 7 ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}>
                      {value}
                    </button>
                  ))}
                </div>
                <span className="font-label-code text-label-code text-on-surface-variant">10</span>
              </div>
            </div>

            {/* Demo Item 2 */}
            <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-label-code text-label-code font-bold shrink-0">DOR</span>
                  <div className="flex flex-col min-w-0">
                    <span className="font-label-lg text-label-lg text-on-surface truncate">Dor de Cabeça</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Menor é melhor</span>
                  </div>
                </div>
                <span className="font-label-code text-label-code text-tertiary uppercase font-semibold">Menor ⬇️</span>
              </div>
              <div className="bg-surface-container-high rounded-full px-4 py-2 flex items-center justify-between">
                <span className="font-label-code text-label-code text-on-surface-variant">10</span>
                <div className="flex items-center gap-3">
                  {[10, 8, 6, 4, 2, 0].map((value) => (
                    <button key={value} className={`w-6 h-6 rounded-full flex items-center justify-center font-label-code text-label-code transition-colors ${value === 3 ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}>
                      {value}
                    </button>
                  ))}
                </div>
                <span className="font-label-code text-label-code text-on-surface-variant">0</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="fixed bottom-0 w-full bg-surface pt-safe pb-safe px-gutter py-4 border-t border-outline/20">
        <div className="max-w-md mx-auto">
          {error && <p role="alert" className="body-sm text-error mb-space-sm">{error}</p>}
          <div className="flex items-center justify-between">
            <Button variant="text" onClick={handleBack} disabled={isCompleting}>
              Voltar
            </Button>
            <Button variant="text" onClick={handleSkip} className="text-primary" disabled={isCompleting}>
              {isCompleting ? 'Salvando…' : 'Pular'}
            </Button>
            <Button variant="primary" onClick={handleNext} disabled={isCompleting}>
              Próximo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingStep2;
