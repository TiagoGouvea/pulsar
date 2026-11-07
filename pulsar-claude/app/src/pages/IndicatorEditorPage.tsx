import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { createIndicator, getIndicator, updateIndicator, type StoredIndicator } from '../data/indicators';
import { Button, EmptyState, Sheet } from '../design';
import type { IndicatorInput } from '../domain/indicator';
import { IndicatorEditor } from '../indicators/IndicatorEditor';
import { draftFromIndicator, emptyIndicatorDraft } from '../indicators/draft';

/** Fields that stay editable after the first record (spec 4.1). */
function editableOnly(input: IndicatorInput): Partial<IndicatorInput> {
  return {
    name: input.name,
    abbreviation: input.abbreviation,
    emoji: input.emoji,
    desiredDirection: input.desiredDirection,
    idealRange: input.idealRange,
  };
}

type LoadState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; indicator: StoredIndicator | null };

interface IndicatorEditorPageProps {
  mode: 'create' | 'edit';
}

/**
 * Route wrapper of the indicator sheet: "Novo Indicador" (create) and "Editar Indicador"
 * (edit with locked fields once there is history). The list screen itself comes later (F-2.05).
 * Only edit mode reads, once and unary, so the route never keeps a live listener open.
 */
export function IndicatorEditorPage({ mode }: IndicatorEditorPageProps) {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const uid = user?.uid ?? '';
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createDraft] = useState(() => emptyIndicatorDraft());

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    setBusy(false);
    setError(null);
    if (!uid) {
      setState({ status: 'error' });
      return;
    }

    if (mode === 'create') {
      setState({ status: 'ready', indicator: null });
      return;
    }

    getIndicator(uid, id ?? '')
      .then((indicator) => {
        if (active) setState({ status: 'ready', indicator });
      })
      .catch(() => {
        if (active) setState({ status: 'error' });
      });
    return () => {
      active = false;
    };
  }, [uid, id, mode]);

  const close = () => navigate('/indicators', { replace: true });

  async function handleSubmit(input: IndicatorInput) {
    if (!uid || busy || state.status !== 'ready') return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'create') {
        // Creation time as sort key appends the new indicator without reading the whole list.
        await createIndicator(uid, { ...input, sortOrder: Date.now() });
      } else if (state.indicator) {
        await updateIndicator(
          uid,
          state.indicator.id,
          state.indicator.lockedAt != null ? editableOnly(input) : input,
        );
      }
      close();
    } catch {
      setError('Não foi possível salvar o indicador. Tente novamente.');
      setBusy(false);
    }
  }

  if (state.status === 'loading') {
    return (
      <p role="status" className="px-1 font-body-md text-body-md text-on-surface-variant">
        Carregando indicador…
      </p>
    );
  }

  if (state.status === 'error') {
    return (
      <EmptyState
        icon="tune"
        title="Não foi possível carregar o indicador"
        description="Verifique sua conexão e tente novamente."
        action={
          <Button variant="neutral" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
        }
      />
    );
  }

  if (mode === 'edit' && !state.indicator) {
    return (
      <EmptyState
        icon="tune"
        title="Indicador não encontrado"
        description="Ele pode ter sido removido ou ainda não foi carregado."
        action={
          <Button variant="neutral" onClick={close}>
            Voltar
          </Button>
        }
      />
    );
  }

  const locked = mode === 'edit' && state.indicator?.lockedAt != null;

  return (
    <Sheet
      open
      onClose={close}
      title={mode === 'create' ? 'Novo Indicador' : 'Editar Indicador'}
      description={
        mode === 'create'
          ? 'Configure uma variável biológica ou comportamental para alimentar suas correlações.'
          : 'Campos travados ficam desabilitados depois do primeiro registro.'
      }
    >
      <IndicatorEditor
        initial={state.indicator ? draftFromIndicator(state.indicator) : createDraft}
        locked={locked}
        submitLabel={mode === 'create' ? 'Criar Indicador' : 'Salvar alterações'}
        busy={busy}
        error={error}
        onSubmit={(input) => void handleSubmit(input)}
        onCancel={close}
      />
    </Sheet>
  );
}
