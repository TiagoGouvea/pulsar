import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import clsx from 'clsx';
import { MaterialIcon } from '@components/ui/MaterialIcon';
import { IndicatorForm } from '@components/indicators/IndicatorForm';
import { useFirebase } from '@lib/firebase/context';
import { useIndicators } from '@features/indicators/useIndicators';
import {
  buildIndicatorPatch,
  formStateFromIndicator,
  isStructurallyFrozen
} from '@features/indicators/model';
import {
  archiveIndicator,
  restoreIndicator,
  updateIndicator
} from '@features/indicators/repository';
import type { IndicatorInput } from '@features/indicators/types';

export const EditIndicatorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useFirebase();
  const uid = user?.uid;
  const indicators = useIndicators(uid);
  const navigate = useNavigate();

  const indicator = useMemo(
    () => indicators.find((item) => item.id === id) ?? null,
    [indicators, id]
  );

  const [pending, setPending] = useState(false);
  const [statusPending, setStatusPending] = useState(false);
  const [serverError, setServerError] = useState('');
  const [statusError, setStatusError] = useState('');

  if (!uid) {
    return (
      <div className="w-full max-w-xl mx-auto px-gutter pt-space-lg pb-10">
        <p role="status" className="font-body-md text-body-md text-on-surface-variant">
          Preparando sua sessão…
        </p>
      </div>
    );
  }

  if (!indicator) {
    return (
      <div className="w-full max-w-xl mx-auto px-gutter pt-space-lg pb-10 flex flex-col gap-space-md">
        <Link
          to="/indicators"
          className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          aria-label="Voltar para Meus Indicadores"
        >
          <MaterialIcon name="arrow_back" size={20} />
        </Link>
        {indicators.length === 0 ? (
          <p role="status" className="font-body-md text-body-md text-on-surface-variant">
            Carregando seus indicadores…
          </p>
        ) : (
          <div className="rounded-2xl bg-surface-container-low p-space-lg flex flex-col gap-space-sm">
            <h1 className="font-headline-md text-headline-md text-on-surface">
              Indicador não encontrado
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Este indicador pode ter sido removido da sua lista.
            </p>
            <Link
              to="/indicators"
              className="w-full min-h-[44px] rounded-full bg-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center"
            >
              Ir para Meus Indicadores
            </Link>
          </div>
        )}
      </div>
    );
  }

  const frozen = isStructurallyFrozen(indicator);
  const archived = indicator.archivedAt != null;

  async function submit(input: IndicatorInput) {
    if (!uid || !indicator) return;
    setPending(true);
    setServerError('');
    try {
      const patch = buildIndicatorPatch(indicator, { ...input, sortOrder: indicator.sortOrder });
      await updateIndicator(uid, indicator.id, patch);
      navigate('/indicators', {
        state: { notice: `${input.name} atualizado.` }
      });
    } catch {
      setServerError('Não foi possível salvar as alterações agora. Tente novamente.');
      setPending(false);
    }
  }

  async function toggleArchive() {
    if (!uid || !indicator) return;
    setStatusPending(true);
    setStatusError('');
    try {
      if (archived) {
        await restoreIndicator(uid, indicator.id);
      } else {
        await archiveIndicator(uid, indicator.id);
      }
    } catch {
      setStatusError(
        archived
          ? 'Não foi possível restaurar o indicador agora. Tente novamente.'
          : 'Não foi possível arquivar o indicador agora. Tente novamente.'
      );
    } finally {
      setStatusPending(false);
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
          <div className="flex items-center gap-space-xs flex-wrap">
            <span className="font-label-code text-label-code uppercase tracking-wider text-primary">
              Editar indicador
            </span>
            {frozen && (
              <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-outline font-label-code text-label-code uppercase tracking-wider">
                Estrutura travada
              </span>
            )}
            {archived && (
              <span className="px-2 py-0.5 rounded-full bg-surface-dim text-outline font-label-code text-label-code uppercase tracking-wider">
                Arquivado
              </span>
            )}
          </div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface font-semibold tracking-tight truncate">
            {indicator.name}
          </h1>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-space-sm rounded-2xl bg-surface-container-low p-space-md">
        <div className="flex flex-col min-w-0">
          <span className="font-label-md text-label-md text-on-surface font-semibold">
            Status do indicador
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            {archived
              ? 'Fora do preenchimento diário; o histórico continua preservado.'
              : 'Aparece no preenchimento diário e nas análises.'}
          </span>
        </div>
        <button
          type="button"
          disabled={statusPending}
          onClick={() => void toggleArchive()}
          className={clsx(
            'px-4 min-h-[40px] rounded-full font-label-lg text-label-lg flex items-center gap-1.5 active:scale-95 transition-transform disabled:opacity-60 shrink-0',
            archived ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container-highest text-error'
          )}
        >
          <MaterialIcon
            name={statusPending ? 'hourglass_top' : archived ? 'restore' : 'inventory_2'}
            size={18}
          />
          <span>
            {statusPending ? 'Aguarde…' : archived ? 'Restaurar' : 'Arquivar'}
          </span>
        </button>
      </div>
      {statusError && (
        <p role="alert" className="rounded-2xl bg-error-container text-on-error-container px-space-md py-space-sm font-body-sm text-body-sm">
          {statusError}
        </p>
      )}

      {frozen && (
        <p className="rounded-2xl bg-surface-container-high px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant">
          Este indicador já possui registros. Grupo, tipo de resposta, unidade, frequência e
          agregação ficam travados; nome, sigla, emoji e direção continuam editáveis.
        </p>
      )}

      <IndicatorForm
        initial={formStateFromIndicator(indicator)}
        frozen={frozen}
        submitLabel="Salvar alterações"
        pending={pending}
        serverError={serverError}
        onSubmit={(input) => void submit(input)}
        onCancel={() => navigate('/indicators')}
      />
    </div>
  );
};

export default EditIndicatorPage;
