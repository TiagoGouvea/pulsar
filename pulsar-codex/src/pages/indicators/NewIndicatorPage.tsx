import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MaterialIcon } from '@components/ui/MaterialIcon';
import { IndicatorForm } from '@components/indicators/IndicatorForm';
import { useFirebase } from '@lib/firebase/context';
import { useIndicators } from '@features/indicators/useIndicators';
import { nextSortOrder } from '@features/indicators/model';
import { createIndicator } from '@features/indicators/repository';
import type { IndicatorInput } from '@features/indicators/types';

export const NewIndicatorPage: React.FC = () => {
  const { user } = useFirebase();
  const uid = user?.uid;
  const indicators = useIndicators(uid);
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState('');

  async function submit(input: IndicatorInput) {
    if (!uid) {
      setServerError('Sua sessão ainda está sendo preparada. Tente novamente em instantes.');
      return;
    }
    setPending(true);
    setServerError('');
    try {
      await createIndicator(uid, { ...input, sortOrder: nextSortOrder(indicators) });
      navigate('/indicators', {
        state: { notice: `${input.name} criado. Ele já aparece na lista e no registro diário.` }
      });
    } catch {
      setServerError('Não foi possível criar o indicador agora. Tente novamente.');
      setPending(false);
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto px-gutter pt-space-sm pb-10 flex flex-col gap-space-lg">
      <div className="flex items-center gap-space-sm pt-2">
        <Link
          to="/indicators"
          aria-label="Voltar para Meus Indicadores"
          className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface shrink-0"
        >
          <MaterialIcon name="arrow_back" size={20} />
        </Link>
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-space-xs">
            <span className="w-2 h-2 rounded-full bg-primary-container" aria-hidden="true" />
            <span className="font-label-code text-label-code uppercase tracking-wider text-primary">
              Protocolo V1.1
            </span>
          </div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-semibold tracking-tight">
            Novo Indicador
          </h1>
        </div>
      </div>
      <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed -mt-space-sm px-1">
        Configure uma variável biológica ou comportamental para alimentar suas correlações.
      </p>

      <IndicatorForm
        submitLabel="Criar Indicador"
        pending={pending}
        serverError={serverError}
        frozen={false}
        onSubmit={(input) => void submit(input)}
        onCancel={() => navigate('/indicators')}
      />
    </div>
  );
};

export default NewIndicatorPage;
