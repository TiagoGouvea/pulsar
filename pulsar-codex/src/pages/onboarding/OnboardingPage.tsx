import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heading } from '@components/ui/Heading';
import { Text } from '@components/ui/Text';
import { Card } from '@components/ui/Card';
import { Button } from '@components/ui/Button';
import { useFirebase } from '@lib/firebase/context';
import { accountErrorMessage } from '@features/auth/errors';

const OnboardingStep1 = React.lazy(() => import('@pages/onboarding/OnboardingStep1'));
const OnboardingStep2 = React.lazy(() => import('@pages/onboarding/OnboardingStep2'));
const OnboardingStep3 = React.lazy(() => import('@pages/onboarding/OnboardingStep3'));

export const OnboardingPage: React.FC = () => {
  const { step } = useParams();
  const navigate = useNavigate();
  const { signInAnonymous, isLoading, anonymous, user, initializationError } = useFirebase();
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    if (isStarting) return;
    setIsStarting(true);
    setError('');
    try {
      await signInAnonymous();
      navigate('/onboarding/1');
    } catch (failure) {
      setError(accountErrorMessage(failure));
    } finally {
      setIsStarting(false);
    }
  };

  if (step === '1') {
    return <OnboardingStep1 />;
  }

  if (step === '2') {
    return <OnboardingStep2 />;
  }

  if (step === '3') {
    return <OnboardingStep3 />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-gutter pb-safe">
      <div className="w-full max-w-md space-y-space-xl">
        <div className="flex flex-col items-center text-center space-y-space-md">
          <div className="w-24 h-24 rounded-full bg-primary-fixed/50 text-primary flex items-center justify-center mb-space-md">
            <span className="material-symbols-outlined text-[48px]">science</span>
          </div>
          <Heading level={1} variant="mobile">
            Seu laboratório pessoal
          </Heading>
          <Text variant="body-lg" color="on-surface-variant" align="center">
            Acompanhe fatores e resultados, descubra possíveis associações e tome decisões baseadas em evidências.
          </Text>
        </div>

        <Card padding="lg" hover variant="elevated">
          <div className="flex flex-col space-y-space-md">
            <div className="flex items-start gap-space-md">
              <div className="w-10 h-10 rounded-full bg-secondary-fixed/50 text-secondary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
              </div>
              <div>
                <Heading level={3} variant="mobile">
                  Rápido e fácil
                </Heading>
                <Text variant="body-sm" color="on-surface-variant">
                  Registre apenas o que quiser em poucos toques.
                </Text>
              </div>
            </div>

            <div className="flex items-start gap-space-md">
              <div className="w-10 h-10 rounded-full bg-primary-fixed/50 text-primary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
              </div>
              <div>
                <Heading level={3} variant="mobile">
                  Descobertas inteligentes
                </Heading>
                <Text variant="body-sm" color="on-surface-variant">
                  O Pulsar correlaciona seus dados e mostra possíveis associações.
                </Text>
              </div>
            </div>

            <div className="flex items-start gap-space-md">
              <div className="w-10 h-10 rounded-full bg-tertiary-fixed/50 text-tertiary flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">lock</span>
              </div>
              <div>
                <Heading level={3} variant="mobile">
                  Totalmente privado
                </Heading>
                <Text variant="body-sm" color="on-surface-variant">
                  Seus dados são seu. Nada é compartilhado sem sua permissão.
                </Text>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex flex-col space-y-space-sm">
          {(anonymous || !user) && <p className="body-sm text-on-surface-variant text-center">
            Comece sem cadastro. Na conta anônima, sair, limpar os dados do navegador ou perder a sessão pode tornar seus dados inacessíveis. Você pode vincular Google ou e-mail depois, sem mudar seu UID.
          </p>}
          {(error || initializationError) && <p role="alert" className="body-sm text-error">{error || initializationError}</p>}
          <Button variant="primary" size="lg" fullWidth className="min-h-[48px]" disabled={isLoading || isStarting} onClick={handleStart}>
            {isLoading || isStarting ? 'Preparando sessão…' : 'Começar agora'}
          </Button>
          <button type="button" className="min-h-[44px] text-secondary label-lg" onClick={() => navigate('/account')}>Já tenho uma conta salva</button>
          <Text variant="body-sm" color="on-surface-variant" align="center">
            Ao continuar, você concorda com os Termos de Uso e Política de Privacidade.
          </Text>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
