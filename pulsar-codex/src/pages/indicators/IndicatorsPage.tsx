import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { MaterialIcon } from '@components/ui/MaterialIcon';
import { BottomSheet } from '@components/ui/BottomSheet';
import { useFirebase } from '@lib/firebase/context';
import { useIndicators } from '@features/indicators/useIndicators';
import {
  dailyAggregationSummary,
  directionSummary,
  displayAbbreviation,
  frequencySummary,
  reorderPlan,
  valueTypeName,
  valueTypeSummary,
  valueTypeIcon
} from '@features/indicators/model';
import type { Indicator } from '@features/indicators/types';
import {
  archiveIndicator,
  reorderIndicators,
  restoreIndicator
} from '@features/indicators/repository';

type IndicatorFilter = 'all' | 'factors' | 'results' | 'archived';

const filterTabs: Array<{ value: IndicatorFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'factors', label: 'Fatores' },
  { value: 'results', label: 'Resultados' },
  { value: 'archived', label: 'Arquivados' }
];

function sortWithinGroup(list: Indicator[]): Indicator[] {
  return [...list].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder || left.createdAt.localeCompare(right.createdAt)
  );
}

function archivedDaysText(archivedAt: string | null): string {
  if (!archivedAt) return '';
  const parsed = Date.parse(archivedAt);
  if (Number.isNaN(parsed)) return '';
  const days = Math.floor((Date.now() - parsed) / 86400000);
  if (days <= 0) return 'Desativado hoje';
  if (days === 1) return 'Desativado há 1 dia';
  return `Desativado há ${days} dias`;
}

function groupChips(indicator: Indicator): string[] {
  const chips = [valueTypeSummary(indicator), frequencySummary(indicator)];
  const aggregation = dailyAggregationSummary(indicator);
  if (aggregation) chips.push(aggregation);
  const direction = directionSummary(indicator);
  if (direction) chips.push(direction);
  return chips;
}

function typeIcon(indicator: Indicator) {
  return (
    <MaterialIcon
      name={valueTypeIcon(indicator.valueType)}
      size={14}
      className={indicator.group === 'factor' ? 'text-secondary' : 'text-primary'}
    />
  );
}

export const IndicatorsPage: React.FC = () => {
  const { user } = useFirebase();
  const uid = user?.uid;
  const indicators = useIndicators(uid);
  const location = useLocation();
  const navigate = useNavigate();

  const initialNotice = (location.state as { notice?: string } | null)?.notice ?? '';
  const [notice, setNotice] = useState(initialNotice);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<IndicatorFilter>('all');
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [menuTarget, setMenuTarget] = useState<Indicator | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    if (initialNotice) navigate('/indicators', { replace: true });
  }, [initialNotice, navigate]);

  const active = useMemo(() => indicators.filter((indicator) => !indicator.archivedAt), [indicators]);
  const archived = useMemo(
    () => sortWithinGroup(indicators.filter((indicator) => indicator.archivedAt)),
    [indicators]
  );
  const factors = useMemo(
    () => sortWithinGroup(active.filter((indicator) => indicator.group === 'factor')),
    [active]
  );
  const results = useMemo(
    () => sortWithinGroup(active.filter((indicator) => indicator.group === 'result')),
    [active]
  );

  const counts = {
    all: active.length,
    factors: factors.length,
    results: results.length,
    archived: archived.length
  };

  const showFactors = filter === 'all' || filter === 'factors';
  const showResults = filter === 'all' || filter === 'results';
  const showArchived = filter === 'all' || filter === 'archived';

  async function runAction(id: string, action: () => Promise<void>, message: string) {
    if (pendingAction) return;
    setPendingAction(id);
    setError('');
    try {
      await action();
      setNotice(message);
      setMenuTarget(null);
    } catch {
      setError('Não foi possível concluir a ação. Verifique a conexão e tente novamente.');
    } finally {
      setPendingAction(null);
    }
  }

  function archive(target: Indicator) {
    if (!uid) return;
    void runAction(
      target.id,
      () => archiveIndicator(uid, target.id),
      `${target.name} foi arquivado. O histórico continua preservado.`
    );
  }

  function restore(target: Indicator) {
    if (!uid) return;
    void runAction(
      target.id,
      () => restoreIndicator(uid, target.id),
      `${target.name} foi restaurado para o registro diário.`
    );
  }

  async function move(target: Indicator, direction: -1 | 1) {
    if (!uid || pendingAction) return;
    const groupList = target.group === 'factor' ? factors : results;
    const index = groupList.findIndex((indicator) => indicator.id === target.id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= groupList.length) return;

    const ordered = [...groupList];
    [ordered[index], ordered[nextIndex]] = [ordered[nextIndex], ordered[index]];
    const changes = reorderPlan(indicators, ordered.map((indicator) => indicator.id));

    setPendingAction(target.id);
    setError('');
    try {
      await reorderIndicators(uid, changes);
    } catch {
      setError('Não foi possível reordenar agora. Tente novamente.');
    } finally {
      setPendingAction(null);
    }
  }

  function renderCard(indicator: Indicator) {
    const groupList = indicator.group === 'factor' ? factors : results;
    const index = groupList.findIndex((item) => item.id === indicator.id);
    const isFirst = index <= 0;
    const isLast = index === groupList.length - 1;
    const tone = indicator.group === 'factor' ? 'factor' : 'result';
    return (
      <li
        key={indicator.id}
        className="rounded-2xl bg-surface-container-lowest p-space-md shadow-sm flex flex-col gap-space-sm"
      >
        <div className="flex items-center justify-between gap-space-xs">
          <div className="flex items-center gap-space-sm min-w-0">
            <span className="text-outline-variant shrink-0" aria-hidden="true">
              <MaterialIcon name="drag_indicator" size={20} />
            </span>
            <span className="flex flex-col gap-0.5">
              <button
                type="button"
                aria-label={`Mover ${indicator.name} para cima`}
                disabled={isFirst || pendingAction !== null}
                onClick={() => void move(indicator, -1)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <MaterialIcon name="arrow_upward" size={16} />
              </button>
              <button
                type="button"
                aria-label={`Mover ${indicator.name} para baixo`}
                disabled={isLast || pendingAction !== null}
                onClick={() => void move(indicator, 1)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <MaterialIcon name="arrow_downward" size={16} />
              </button>
            </span>
            <span
              className={clsx(
                'px-2 py-0.5 rounded-full font-label-code text-label-code tracking-wider uppercase shrink-0',
                tone === 'factor'
                  ? 'bg-secondary/10 text-secondary'
                  : 'bg-primary/10 text-primary'
              )}
            >
              {displayAbbreviation(indicator)}
            </span>
            <h3 className="font-label-lg text-label-lg text-on-surface truncate">{indicator.name}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className="w-2 h-2 rounded-full bg-tertiary"
              aria-label="Ativo"
              role="img"
            />
            <button
              type="button"
              aria-label={`Opções para ${indicator.name}`}
              onClick={() => setMenuTarget(indicator)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <MaterialIcon name="more_vert" size={18} />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-space-xs pt-1">
          {groupChips(indicator).map((chip, chipIndex) => (
            <span
              key={`${indicator.id}-chip-${chipIndex}`}
              className="px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface-variant font-label-md text-label-md flex items-center gap-1"
            >
              {chipIndex === 0 ? typeIcon(indicator) : null}
              {chip}
            </span>
          ))}
        </div>
      </li>
    );
  }

  function renderSection(
    id: string,
    group: 'factor' | 'result',
    list: Indicator[],
    visible: boolean
  ) {
    if (!visible) return null;
    const forced = filter === (group === 'factor' ? 'factors' : 'results');
    if (list.length === 0 && !forced) return null;
    return (
      <section className="flex flex-col gap-space-md" aria-labelledby={`${id}-heading`}>
        <div className="flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={clsx(
                'w-7 h-7 rounded-full flex items-center justify-center shadow-sm shrink-0',
                group === 'factor' ? 'bg-secondary text-on-secondary' : 'bg-primary text-on-primary'
              )}
              aria-hidden="true"
            >
              <MaterialIcon name={group === 'factor' ? 'input' : 'output'} size={16} />
            </span>
            <span className="flex flex-col min-w-0">
              <h2 id={`${id}-heading`} className="font-headline-md text-headline-md text-on-surface">
                {group === 'factor' ? 'Fatores' : 'Resultados'}
              </h2>
              <span
                className={clsx(
                  'font-label-code text-label-code uppercase tracking-wider truncate',
                  group === 'factor' ? 'text-secondary' : 'text-primary'
                )}
              >
                {group === 'factor' ? 'O que fiz, consumi ou vivi' : 'Como fiquei ou o que percebi'}
              </span>
            </span>
          </div>
          <span
            className={clsx(
              'px-2.5 py-1 rounded-full font-label-code text-label-code shrink-0',
              group === 'factor'
                ? 'bg-secondary-fixed text-on-secondary-fixed'
                : 'bg-primary-fixed text-on-primary-fixed'
            )}
          >
            {list.length} Ativos
          </span>
        </div>
        {list.length === 0 ? (
          <p className="rounded-2xl bg-surface-container-low px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant">
            Nenhum {group === 'factor' ? 'Fator' : 'Resultado'} ativo ainda.
          </p>
        ) : (
          <ul className="flex flex-col gap-space-sm">{list.map(renderCard)}</ul>
        )}
      </section>
    );
  }

  const menuTargetBusy = menuTarget !== null && pendingAction === menuTarget.id;

  return (
    <div className="w-full max-w-xl mx-auto px-gutter pt-space-sm pb-10 flex flex-col gap-space-lg">
      <div className="flex flex-col gap-space-md pt-2">
        <div className="flex items-start justify-between gap-space-sm">
          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface tracking-tight">
              Meus Indicadores
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Personalize o que você monitora na sua rotina diária.
            </p>
          </div>
        </div>
        <Link
          to="/indicators/new"
          className="w-full min-h-[48px] rounded-full bg-primary-container text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-space-sm shadow-md active:scale-[0.98] transition-transform"
        >
          <MaterialIcon name="add_circle" size={20} />
          <span>Novo Indicador</span>
        </Link>
      </div>

      {notice && (
        <p role="status" className="rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed px-space-md py-space-sm font-body-sm text-body-sm">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-2xl bg-error-container text-on-error-container px-space-md py-space-sm font-body-sm text-body-sm">
          {error}
        </p>
      )}

      {indicators.length === 0 ? (
        <section className="rounded-2xl bg-surface-container-low p-space-lg flex flex-col gap-space-md text-center">
          <span className="w-12 h-12 rounded-full bg-primary-fixed text-primary flex items-center justify-center mx-auto shadow-sm" aria-hidden="true">
            <MaterialIcon name="tune" size={26} />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="font-headline-md text-headline-md text-on-surface">Nenhum indicador ainda</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Crie um Fator (o que você faz) ou um Resultado (o que você percebe) para começar a
              acompanhar sua rotina.
            </p>
          </div>
          <Link
            to="/indicators/new"
            className="w-full min-h-[48px] rounded-full bg-primary text-on-primary font-label-lg text-label-lg flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform"
          >
            <MaterialIcon name="add_circle" size={20} />
            <span>Criar primeiro indicador</span>
          </Link>
        </section>
      ) : (
        <>
          <div
            className="w-full overflow-x-auto pb-1 -mx-gutter px-gutter"
            style={{ scrollbarWidth: 'none' }}
            role="group"
            aria-label="Filtrar indicadores"
          >
            <div className="flex items-center gap-space-sm min-w-max">
              {filterTabs.map((tab) => {
                const activeTab = filter === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    aria-pressed={activeTab}
                    onClick={() => setFilter(tab.value)}
                    className={clsx(
                      'px-4 py-2 rounded-full font-label-md text-label-md tracking-tight transition-all shrink-0',
                      activeTab
                        ? 'bg-primary text-on-primary shadow-sm'
                        : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                    )}
                  >
                    {tab.label}
                    <span
                      className={clsx(
                        'ml-1 text-[11px] font-semibold px-1.5 py-0.5 rounded-full',
                        activeTab ? 'bg-white/20' : 'bg-surface-dim text-on-surface-variant'
                      )}
                    >
                      {counts[tab.value]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {renderSection('factors', 'factor', factors, showFactors)}
          {renderSection('results', 'result', results, showResults)}

          {showArchived && (
            <section className="flex flex-col gap-space-sm pt-2" aria-labelledby="archived-heading">
              <button
                type="button"
                id="archived-heading"
                aria-label="Seção de arquivados"
                aria-expanded={archivedExpanded || filter === 'archived'}
                onClick={() => setArchivedExpanded((expanded) => !expanded)}
                className="w-full flex items-center justify-between p-space-md rounded-2xl bg-surface-container hover:bg-surface-container-high transition-colors text-left"
              >
                <span className="flex items-center gap-space-sm min-w-0">
                  <MaterialIcon name="inventory_2" size={20} className="text-outline" />
                  <span className="font-headline-md text-headline-md text-on-surface">Arquivados</span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-dim text-on-surface-variant font-label-code text-label-code">
                    {counts.archived}
                  </span>
                </span>
                <MaterialIcon
                  name="expand_more"
                  size={20}
                  className={clsx(
                    'text-on-surface-variant transition-transform duration-200',
                    (archivedExpanded || filter === 'archived') && 'rotate-180'
                  )}
                />
              </button>
              {(archivedExpanded || filter === 'archived') && (
                <div className="flex flex-col gap-space-sm">
                  {archived.length === 0 ? (
                    <p className="rounded-2xl bg-surface-container-low px-space-md py-space-sm font-body-sm text-body-sm text-on-surface-variant">
                      Nenhum indicador arquivado.
                    </p>
                  ) : (
                    archived.map((indicator) => (
                      <div
                        key={indicator.id}
                        className="rounded-2xl bg-surface-container-lowest/80 p-space-md shadow-sm flex flex-col gap-space-sm"
                      >
                        <div className="flex items-center justify-between gap-space-xs">
                          <div className="flex items-center gap-space-sm min-w-0">
                            <span className="px-2 py-0.5 rounded-full bg-surface-dim text-outline font-label-code text-label-code tracking-wider uppercase shrink-0">
                              {displayAbbreviation(indicator)}
                            </span>
                            <h3 className="font-label-lg text-label-lg text-on-surface-variant truncate">
                              {indicator.name}
                            </h3>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-outline font-label-code text-label-code uppercase tracking-wider shrink-0">
                            Arquivado
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-space-sm pt-1">
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            {valueTypeName(indicator.valueType)} • {archivedDaysText(indicator.archivedAt)}
                          </span>
                          <button
                            type="button"
                            aria-label={`Restaurar ${indicator.name}`}
                            disabled={pendingAction !== null}
                            onClick={() => restore(indicator)}
                            className="px-3 min-h-[36px] rounded-full bg-primary-fixed text-primary font-label-md text-label-md flex items-center gap-1 active:scale-95 transition-transform disabled:opacity-60"
                          >
                            <MaterialIcon name={pendingAction === indicator.id ? 'hourglass_top' : 'restore'} size={16} />
                            <span>{pendingAction === indicator.id ? 'Restaurando…' : 'Restaurar'}</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                  <div className="p-space-sm rounded-xl bg-surface-container-low text-on-surface-variant font-body-sm text-body-sm flex items-start gap-2">
                    <MaterialIcon name="info" size={18} className="text-outline shrink-0 mt-0.5" />
                    <span>
                      Indicadores arquivados não aparecem no preenchimento diário, mas mantêm seu
                      histórico preservado nas análises de correlação.
                    </span>
                  </div>
                </div>
              )}
            </section>
          )}

          <aside className="rounded-2xl bg-surface-container-high p-space-md flex flex-col gap-space-xs mt-2 shadow-sm">
            <div className="flex items-center gap-2 text-primary font-label-lg text-label-lg">
              <MaterialIcon name="verified_user" size={18} />
              <span>Regra de integridade dos dados</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              Tipo de resposta, unidade de medida e agregação ficam travados após o primeiro registro
              para garantir rigor estatístico. Nome, sigla, ordem e direção permanecem sempre
              editáveis.
            </p>
          </aside>
        </>
      )}

      <BottomSheet
        open={menuTarget !== null}
        title="Opções do Indicador"
        subtitle={menuTarget?.name}
        onClose={() => setMenuTarget(null)}
      >
        <button
          type="button"
          onClick={() => {
            if (!menuTarget) return;
            navigate(`/indicators/${menuTarget.id}/edit`);
          }}
          className="w-full min-h-[48px] rounded-2xl bg-surface-container-lowest p-space-md flex items-center justify-between text-on-surface font-label-lg text-label-lg hover:bg-surface-container active:scale-[0.99] transition-all"
        >
          <span className="flex items-center gap-3">
            <MaterialIcon name="edit" size={20} className="text-primary" />
            <span>Editar parâmetros</span>
          </span>
          <MaterialIcon name="chevron_right" size={18} className="text-outline" />
        </button>
        <button
          type="button"
          disabled={menuTargetBusy}
          onClick={() => {
            if (menuTarget) archive(menuTarget);
          }}
          className="w-full min-h-[48px] rounded-2xl bg-surface-container-lowest p-space-md flex items-center justify-between text-error font-label-lg text-label-lg hover:bg-error-container/20 active:scale-[0.99] transition-all disabled:opacity-60"
        >
          <span className="flex items-center gap-3">
            <MaterialIcon name={menuTargetBusy ? 'hourglass_top' : 'inventory_2'} size={20} className="text-error" />
            <span>{menuTargetBusy ? 'Arquivando…' : 'Arquivar indicador'}</span>
          </span>
          <MaterialIcon name="chevron_right" size={18} className="text-outline" />
        </button>
      </BottomSheet>
    </div>
  );
};

export default IndicatorsPage;
