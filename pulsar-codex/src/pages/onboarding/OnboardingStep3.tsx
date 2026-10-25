import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heading } from '@components/ui/Heading';
import { Text } from '@components/ui/Text';
import { Card } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { Toggle } from '@components/ui/Toggle';
import { useFirebase } from '@lib/firebase/context';

export const OnboardingStep3: React.FC = () => {
  const navigate = useNavigate();
  const { user, signInGoogle } = useFirebase();
  const [aiConsent, setAiConsent] = useState(false);
  const [privacyRevealed, setPrivacyRevealed] = useState(false);

  const handleNext = async () => {
    // Mark onboarding as completed
    navigate('/dashboard');
  };

  const handleBack = () => {
    navigate('/onboarding/2');
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  const handleGoogleLogin = async () => {
    try {
      await signInGoogle();
    } catch (error) {
      console.error('Failed to sign in with Google:', error);
    }
  };

  return (
    <div className="flex flex-col min-h-screen px-gutter pb-safe">
      {/* Progress Tracker */}
      <div className="pt-16 px-gutter pt-space-md pb-space-sm flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <span className="font-label-code text-label-code text-on-surface-variant uppercase tracking-wider">Passo 03 // 03</span>
          <span className="font-label-code text-label-code text-primary font-semibold uppercase tracking-wider">Privacidade</span>
        </div>
        <div className="flex items-center gap-1.5 w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-primary rounded-full opacity-60"></div>
          <div className="h-full w-1/3 bg-primary rounded-full opacity-60"></div>
          <div className="h-full w-1/3 bg-primary rounded-full transition-all duration-500 shadow-sm"></div>
        </div>
      </div>

      <div className="flex-1 flex flex-col mt-space-md">
        {/* Narrative Header */}
        <div className="px-gutter flex flex-col gap-space-xs mt-space-xs mb-space-md">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed font-label-code text-label-code uppercase">Passo 3 de 3 • Privacidade</span>
          </div>
          <Heading level={1} variant="mobile">
            Seus dados, suas regras
          </Heading>
          <Text variant="body-md" color="on-surface-variant" align="left">
            A correlação estatística não implica causalidade. O Pulsar mostra possíveis associações, nunca conclusões definitivas.
          </Text>
        </div>

        {/* Privacy Card */}
        <div className="px-gutter mb-space-md">
          <Card padding="lg" hover variant="elevated">
            <div className="flex items-start gap-space-md">
              <div className="w-10 h-10 rounded-full bg-tertiary-fixed/50 text-tertiary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">lock</span>
              </div>
              <div className="flex-1 space-y-2">
                <Heading level={3} variant="mobile">
                  Discrição visual
                </Heading>
                <Text variant="body-sm" color="on-surface-variant">
                  O Pulsar começa em modo privado: apenas siglas são exibidas. Você decide quando revelar nomes completos.
                </Text>
                <div className="flex items-center justify-between mt-2">
                  <Text variant="body-sm" color="on-surface">
                    {privacyRevealed ? 'Nomes revelados' : 'Apenas siglas'}
                  </Text>
                  <Toggle checked={privacyRevealed} onChange={setPrivacyRevealed} />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* AI Consent Card */}
        <div className="px-gutter mb-space-md">
          <Card padding="lg" hover variant="elevated">
            <div className="flex items-start gap-space-md">
              <div className="w-10 h-10 rounded-full bg-primary-fixed/50 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
              </div>
              <div className="flex-1 space-y-2">
                <Heading level={3} variant="mobile">
                  IA generativa (opcional)
                </Heading>
                <Text variant="body-sm" color="on-surface-variant">
                  Com sua permissão, o Pulsar pode gerar explicações sobre suas descobertas usando IA.
                </Text>
                <div className="flex items-center justify-between mt-2">
                  <Text variant="body-sm" color="on-surface">
                    {aiConsent ? 'IA habilitada' : 'IA desabilitada'}
                  </Text>
                  <Toggle checked={aiConsent} onChange={setAiConsent} />
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Anonymous Account Warning */}
        <div className="px-gutter mb-space-md">
          <Card padding="lg" variant="elevated" className="border-l-4 border-l-error">
            <div className="flex items-start gap-space-md">
              <div className="w-8 h-8 rounded-full bg-error/10 text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[18px]">warning</span>
              </div>
              <div className="flex-1 space-y-2">
                <Heading level={3} variant="mobile">
                  Conta anônima atual
                </Heading>
                <Text variant="body-sm" color="on-surface-variant">
                  Você está usando uma conta anônima. Se perder o acesso ao navegador ou trocar de dispositivo, seus dados poderão ser perdidos.
                </Text>
                {user?.isAnonymous && (
                  <div className="pt-2">
                    <Button variant="primary" size="sm" fullWidth onClick={handleGoogleLogin}>
                      Salvar minha conta
                    </Button>
                  </div>
                )}
                {user && !user.isAnonymous && (
                  <Text variant="body-sm" color="tertiary">
                    Sua conta foi salva! Continue com segurança.
                  </Text>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Conclusion */}
        <div className="px-gutter mb-space-md">
          <Card padding="lg" hover variant="elevated">
            <div className="flex flex-col items-center text-center space-y-space-md">
              <div className="w-16 h-16 rounded-full bg-primary-fixed/50 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[32px]">celebration</span>
              </div>
              <Heading level={2} variant="mobile">
                Onboarding concluído!
              </Heading>
              <Text variant="body-md" color="on-surface-variant">
                Você está pronto para começar a acompanhar seus fatores e resultados.
              </Text>
              <div className="w-full max-w-xs space-y-space-sm pt-2">
                <Button variant="primary" size="lg" fullWidth onClick={handleNext}>
                  Ir para o dashboard
                </Button>
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
            Concluir
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingStep3;
