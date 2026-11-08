import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import {
  archiveIndicator,
  reorderIndicators,
  restoreIndicator,
  useIndicators,
  type StoredIndicator as Indicator,
} from '../data/indicators';
import { Button, EmptyState, Icon, Sheet } from '../design';
import type { IndicatorGroup } from '../design';
import { ArchivedIndicatorCard, IndicatorCard } from '../indicators/IndicatorCard';

/** Filters of the list: everything, only factors, only results or only archived ones. */
type ListFilter = 'all' | 'factor' | 'result' | 'archived';

const FILTER_LABELS: { value: ListFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'factor', label: 'Fatores' },
  { value: 'result', label: 'Resultados' },
  { value: 'archived', label: 'Arquivados' },
];

const GROUP_SUBTITLES: Record<IndicatorGroup, string> = {
  factor: 'O que fiz, consumi ou vivi',
  result: 'Como fiquei ou o que percebi',
};

const GROUP_ICON: Record<IndicatorGroup, 'input' | 'output'> = {
  factor: 'input',
  result: 'output',
};

const linkClass =
  'flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary-container px-5 font-label-lg text-label-lg text-on-primary shadow-md shadow-primary/20 transition-transform active:scale-[0.98]';

function SectionHeader({ group, title, count }: { group: IndicatorGroup; title: string; count: number }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={`flex size-7 shrink-0 items-center justify-center rounded-full ${
            group === 'factor' ? 'bg-secondary text-on-secondary' : 'bg-primary text-on-primary'
          }`}
        >
          <Icon name={GROUP_ICON[group]} className="text-[16px]" />
        </span>
        <div className="flex min-w-0 flex-col">
          <h2 className="font-headline-md text-headline-md tracking-tight text-on-surface">{title}</h2>
          <span className="font-label-code text-label-code tracking-wider text-on-surface-variant uppercase">
            {GROUP_SUBTITLES[group]}
          </span>
        </div>
      </div>
      <span className="shrink-0 rounded-full bg-surface-container-high px-2.5 py-1 font-label-code text-label-code text-on-surface-variant">
        {count} {count === 1 ? 'Ativo' : 'Ativos'}
      </span>
    </div>
  );
}

/**
 * "Meus indicadores" (/indicators): factors and results in separate lists, with reorder,
 * archive/restore and the entry to the indicator editor (spec 4.5 and 7.3).
 */
export function IndicatorsPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const navigate = useNavigate();

  const { indicators, loading, error: loadError } = useIndicators(uid);
  const [filter, setFilter] = useState<ListFilter>('all');
  const [archivedOpen, setArchivedOpen] = useState(true);
  const [optionsFor, setOptionsFor] = useState<Indicator | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const active = indicators.filter((indicator) => indicator.archivedAt == null);
  const archived = indicators.filter((indicator) => indicator.archivedAt != null);
  const factors = active.filter((indicator) => indicator.group === 'factor');
  const results = active.filter((indicator) => indicator.group === 'result');

  const counts: Record<ListFilter, number> = {
    all: active.length,
    factor: factors.length,
    result: results.length,
    archived: archived.length,
  };

  async function run(action: () => Promise<void>) {
    setActionError(null);
    try {
      await action();
    } catch {
      setActionError('Não foi possível atualizar os indicadores. Tente novamente.');
    }
  }
  /** Moves an indicator one position up or down inside its own group (spec 4.5). */
  function move(indicator: Indicator, direction: -1 | 1) {
    const siblings = active.filter((item) => item.group === indicator.group);
    const index = siblings.findIndex((item) => item.id === indicator.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= siblings.length) return;
    const ids = siblings.map((item) => item.id);
    const [moved] = ids.splice(index, 1);
    if (!moved) return;
    ids.splice(target, 0, moved);
    const expectedOrder = new Map(siblings.map((item) => [item.id, item.sortOrder]));
    void run(() => reorderIndicators(uid, indicator.group, ids, expectedOrder));
  }

  function archive(indicator: Indicator) {
    setOptionsFor(null);
    void run(() => archiveIndicator(uid, indicator.id));
  }

  function restore(indicator: Indicator) {
    void run(() => restoreIndicator(uid, indicator.id));
  }

  function edit(indicator: Indicator) {
    setOptionsFor(null);
    navigate(`/indicators/${indicator.id}/edit`);
  }

  return (
    <div className="flex flex-col gap-space-lg pb-8">
      <div className="flex flex-col gap-space-md pt-2">
        <div className="flex items-start justify-between gap-space-sm">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile tracking-tight text-on-surface">
              Meus Indicadores
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Personalize o que você monitora na sua rotina diária.
            </p>
          </div>
          <button
            type="button"
            aria-label="Informações sobre os indicadores"
            onClick={() => setInfoOpen(true)}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-primary shadow-sm transition-transform active:scale-90"
          >
            <Icon name="science" className="text-[20px]" />
          </button>
        </div>
        <Link to="/indicators/new" className={linkClass}>
          <Icon name="add_circle" className="text-[20px]" />
          Novo Indicador
        </Link>
      </div>

      <div className="-mx-margin flex items-center gap-space-sm overflow-x-auto px-margin pb-1">
        {FILTER_LABELS.map((option) => {
          const selected = filter === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setFilter(option.value);
                if (option.value === 'archived') setArchivedOpen(true);
              }}
              className={`flex h-11 shrink-0 items-center gap-1 rounded-full px-4 font-label-md text-label-md tracking-tight transition-all ${
                selected
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {option.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                  selected ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container-high text-on-surface'
                }`}
              >
                {counts[option.value]}
              </span>
            </button>
          );
        })}
      </div>

      {actionError && (
        <p
          role="alert"
          className="rounded-md bg-error-container px-3 py-2 font-body-sm text-body-sm text-on-error-container"
        >
          {actionError}
        </p>
      )}

      {loading && (
        <p role="status" className="font-body-md text-body-md text-on-surface-variant">
          Carregando indicadores…
        </p>
      )}

      {loadError && (
        <p role="alert" className="font-body-md text-body-md text-error">
          Não foi possível carregar os indicadores. Tente novamente.
        </p>
      )}

      {!loading && !loadError && indicators.length === 0 && (
        <EmptyState
          icon="tune"
          title="Nenhum indicador ainda"
          description="Crie seus indicadores para acompanhar fatores e resultados ao longo do tempo."
        />
      )}

      {(filter === 'all' || filter === 'factor') && factors.length > 0 && (
        <section className="flex flex-col gap-space-md">
          <SectionHeader group="factor" title="Fatores" count={factors.length} />
          <div data-testid="factor-list" className="flex flex-col gap-space-sm">
            {factors.map((indicator, index) => (
              <IndicatorCard
                key={indicator.id}
                indicator={indicator}
                first={index === 0}
                last={index === factors.length - 1}
                onMoveUp={() => move(indicator, -1)}
                onMoveDown={() => move(indicator, 1)}
                onOpenOptions={() => setOptionsFor(indicator)}
              />
            ))}
          </div>
        </section>
      )}

      {(filter === 'all' || filter === 'result') && results.length > 0 && (
        <section className="flex flex-col gap-space-md">
          <SectionHeader group="result" title="Resultados" count={results.length} />
          <div data-testid="result-list" className="flex flex-col gap-space-sm">
            {results.map((indicator, index) => (
              <IndicatorCard
                key={indicator.id}
                indicator={indicator}
                first={index === 0}
                last={index === results.length - 1}
                onMoveUp={() => move(indicator, -1)}
                onMoveDown={() => move(indicator, 1)}
                onOpenOptions={() => setOptionsFor(indicator)}
              />
            ))}
          </div>
        </section>
      )}

      {(filter === 'all' || filter === 'archived') && indicators.length > 0 && (
        <section className="flex flex-col gap-space-sm pt-2">
          <button
            type="button"
            aria-expanded={archivedOpen}
            aria-controls="archived-content"
            onClick={() => setArchivedOpen((open) => !open)}
            className="flex w-full items-center justify-between gap-2 rounded-lg bg-surface-container p-3 text-left transition-colors hover:bg-surface-container-high"
          >
            <span className="flex min-w-0 items-center gap-space-sm">
              <Icon name="inventory_2" className="text-[20px] text-outline" />
              <span className="font-headline-md text-headline-md text-on-surface">Arquivados</span>
              <span className="rounded-full bg-surface-dim px-2 py-0.5 font-label-code text-label-code text-on-surface-variant">
                {archived.length}
              </span>
            </span>
            <Icon
              name="expand_more"
              className={`shrink-0 text-[20px] text-on-surface-variant transition-transform ${
                archivedOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          <div
            id="archived-content"
            data-testid="archived-list"
            className={`flex flex-col gap-space-sm ${archivedOpen ? '' : 'hidden'}`}
          >
            {archived.map((indicator) => (
              <ArchivedIndicatorCard
                key={indicator.id}
                indicator={indicator}
                onRestore={() => restore(indicator)}
              />
            ))}
            {archived.length === 0 && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Nenhum indicador arquivado até agora.
              </p>
            )}
          </div>
        </section>
      )}

      <aside className="flex flex-col gap-space-xs rounded-lg bg-surface-container-high p-3 shadow-sm">
        <span className="flex items-center gap-2 font-label-lg text-label-lg text-primary">
          <Icon name="verified" className="text-[18px]" />
          Regra de Integridade dos Dados
        </span>
        <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
          Tipo de resposta, unidade de medida e agregação ficam travados após o primeiro registro para
          garantir rigor estatístico. Nome, sigla, ordem e direção permanecem sempre editáveis.
        </p>
      </aside>

      <Sheet
        open={optionsFor !== null}
        onClose={() => setOptionsFor(null)}
        title="Opções do Indicador"
        description="Edite os dados ou tire o indicador do preenchimento diário."
      >
        <div className="flex flex-col gap-2 pb-2">
          <Button variant="neutral" icon="edit_note" fullWidth onClick={() => optionsFor && edit(optionsFor)}>
            Editar Parâmetros
          </Button>
          <Button
            variant="danger"
            icon="inventory_2"
            fullWidth
            onClick={() => optionsFor && archive(optionsFor)}
          >
            Arquivar Indicador
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        title="Sobre os indicadores"
        description="Cada indicador é uma variável que você mede na rotina."
      >
        <div className="flex flex-col gap-2 pb-2 font-body-md text-body-md text-on-surface-variant">
          <p>
            <strong className="text-on-surface">Fatores</strong> são o que você faz, consome ou vive.
          </p>
          <p>
            <strong className="text-on-surface">Resultados</strong> são o que você sente, mede ou percebe.
          </p>
          <p>
            Arquivar um indicador não apaga o histórico: ele sai do preenchimento diário e continua contando
            nas análises.
          </p>
        </div>
      </Sheet>
    </div>
  );
}
