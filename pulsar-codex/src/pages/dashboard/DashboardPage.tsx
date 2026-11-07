import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFirebase } from '@lib/firebase/context';
import { useAccountSaveInvite } from '@features/account/useAccountSaveInvite';
import { valueTypeSummary } from '@features/indicators/model';
import { createIndicator } from '@features/indicators/repository';
import { INITIAL_INDICATOR_SUGGESTIONS } from '@features/indicators/suggestions';
import type { Indicator, IndicatorSuggestion } from '@features/indicators/types';
import { useIndicators } from '@features/indicators/useIndicators';
import { MaterialIcon, MaterialIconName } from '@components/ui/MaterialIcon';
import { AccountSaveInvite } from './AccountSaveInvite';

const suggestionIcons: Record<string, MaterialIconName> = {
  exercise: 'fitness_center',
  coffee: 'coffee',
  energy: 'bolt',
  focus: 'psychology'
};

const groupLabel = {
  factor: 'Fator',
  result: 'Resultado'
} as const;

const groupTone = {
  factor: 'bg-secondary-fixed text-on-secondary-fixed-variant',
  result: 'bg-primary-fixed text-on-primary-fixed'
} as const;

const iconTone = {
  factor: 'bg-secondary-fixed/50 text-secondary',
  result: 'bg-primary-fixed/50 text-primary'
} as const;

function mergeIndicators(remote: Indicator[], optimistic: Indicator[]): Indicator[] {
  const byId = new Map<string, Indicator>();
  for (const indicator of remote) byId.set(indicator.id, indicator);
  for (const indicator of optimistic) {
    if (!byId.has(indicator.id)) byId.set(indicator.id, indicator);
  }
  return [...byId.values()].sort((left, right) => left.sortOrder - right.sortOrder);
}

export const DashboardPage: React.FC = () => {
  const { user, anonymous } = useFirebase();
  const remoteIndicators = useIndicators(user?.uid);
  const [optimistic, setOptimistic] = useState<Indicator[]>([]);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const invite = useAccountSaveInvite(anonymous);

  const indicators = mergeIndicators(remoteIndicators, optimistic).filter((indicator) => !indicator.archivedAt);
  const addedKeys = new Set(
    INITIAL_INDICATOR_SUGGESTIONS
      .filter((suggestion) =>
        indicators.some(
          (indicator) => indicator.group === suggestion.group && indicator.name === suggestion.name
        )
      )
      .map((suggestion) => suggestion.key)
  );
  const availableSuggestions = INITIAL_INDICATOR_SUGGESTIONS.filter(
    (suggestion) => !addedKeys.has(suggestion.key)
  );
  const sessionTag = user?.uid ? `#${user.uid.replace(/-/g, '').slice(-4).toUpperCase()}` : '#PLS';
  const accountTitle = !user ? 'Sessão não iniciada' : anonymous ? 'Conta anônima neste navegador' : 'Conta salva';
  const accountDescription = !user
    ? 'Sua sessão ainda não foi iniciada. Volte ao onboarding para começar sem cadastro ou entre na sua conta salva.'
    : anonymous
      ? 'Seus dados estão associados a esta sessão. Salvar a conta com Google ou e-mail mantém o mesmo identificador e evita perder o acesso ao trocar de dispositivo.'
      : 'Sua conta está vinculada e seus indicadores continuam associados ao mesmo identificador.';

  async function addSuggestion(suggestion: IndicatorSuggestion) {
    if (pendingKey) return;
    if (!user) {
      setActionError('Sua sessão ainda está sendo preparada. Tente novamente em instantes.');
      return;
    }

    setPendingKey(suggestion.key);
    setActionError('');
    setNotice('');

    try {
      const created = await createIndicator(user.uid, suggestion.input);
      setOptimistic((current) => [...current.filter((item) => item.id !== created.id), created]);
      invite.markUsefulInteraction();
      setNotice(`${suggestion.name} adicionado. Nenhum outro indicador foi criado automaticamente.`);
    } catch {
      setActionError('Não foi possível adicionar o indicador agora. Tente novamente.');
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto px-gutter pt-space-sm pb-10 flex flex-col gap-space-lg">
      <div className="flex items-start justify-between gap-space-md">
        <div className="min-w-0">
          <span className="font-label-code text-label-code uppercase tracking-wider text-outline">Laboratório pessoal</span>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Bem-vindo ao Pulsar</h1>
        </div>
        <div className="flex items-center gap-1.5 bg-surface-container px-3 py-1.5 rounded-full shadow-sm shrink-0" aria-label="Sessão atual">
          <span className={`w-2 h-2 rounded-full ${anonymous ? 'bg-secondary animate-pulse' : 'bg-tertiary'}`} aria-hidden="true" />
          <span className="font-label-code text-label-code text-on-surface font-semibold tracking-normal">{sessionTag}</span>
          <span className="font-label-code text-label-code text-outline font-normal" aria-hidden="true">| Dia 1</span>
        </div>
      </div>

      <section className="relative overflow-hidden bg-gradient-to-br from-surface-container-low via-surface-container-lowest to-surface-container-low p-space-lg rounded-lg shadow-sm" aria-labelledby="dashboard-purpose">
        <div className="absolute -right-12 -top-12 w-36 h-36 rounded-full bg-primary-fixed/25 blur-2xl pointer-events-none" aria-hidden="true" />
        <div className="flex items-start gap-space-md relative z-10">
          <span className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 shadow-sm" aria-hidden="true">
            <MaterialIcon name="science" size={22} />
          </span>
          <div className="flex-1 space-y-1 min-w-0">
            <h2 id="dashboard-purpose" className="font-headline-md text-headline-md text-on-surface">
              Sua rotina, seus dados, suas conclusões
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
              Escolha abaixo as variáveis iniciais para começar sua série temporal ou crie uma do zero. Você continua no controle do que registra.
            </p>
          </div>
        </div>
      </section>

      {invite.visible && (
        <div aria-live="polite">
          <AccountSaveInvite onDismiss={invite.dismiss} />
        </div>
      )}

      {notice && (
        <p role="status" className="rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed px-space-md py-space-sm font-body-sm text-body-sm">
          {notice}
        </p>
      )}
      {actionError && (
        <p role="alert" className="rounded-2xl bg-error-container text-on-error-container px-space-md py-space-sm font-body-sm text-body-sm">
          {actionError}
        </p>
      )}

      {indicators.length > 0 && (
        <section aria-labelledby="my-indicators-heading" className="flex flex-col gap-space-sm">
          <div className="flex items-center justify-between gap-space-sm px-1">
            <h2 id="my-indicators-heading" className="font-label-code text-label-code uppercase tracking-wider text-on-surface-variant">
              Seus indicadores
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high font-label-code text-label-code text-primary font-semibold">
              {indicators.length}
            </span>
          </div>
          <ul className="flex flex-col gap-space-sm">
            {indicators.map((indicator) => (
              <li key={indicator.id} className="rounded-lg bg-surface-container-lowest p-space-md shadow-sm flex items-center gap-space-sm">
                <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconTone[indicator.group]}`} aria-hidden="true">
                  <span className="font-label-code text-label-code font-bold">{indicator.abbreviation}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`px-2 py-0.5 rounded-full font-label-code text-label-code uppercase tracking-wider ${groupTone[indicator.group]}`}>
                      {groupLabel[indicator.group]}
                    </span>
                    <span className="font-body-sm text-body-sm text-outline">{valueTypeSummary(indicator)}</span>
                  </div>
                  <h3 className="font-label-lg text-label-lg text-on-surface truncate mt-0.5">{indicator.name}</h3>
                </div>
                <span className="font-label-code text-label-code text-tertiary text-right shrink-0">Pronto</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {availableSuggestions.length > 0 && (
        <section aria-labelledby="suggestions-heading" className="flex flex-col gap-space-sm">
          <div className="flex flex-wrap items-center justify-between gap-space-xs px-1">
            <div className="flex items-center gap-2">
              <h2 id="suggestions-heading" className="font-label-code text-label-code uppercase tracking-wider text-on-surface-variant">
                Sugestões iniciais
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-surface-container-high font-label-code text-label-code text-primary font-semibold">
                {availableSuggestions.length} prontas
              </span>
            </div>
            <span className="font-label-md text-label-md text-outline">Nenhum auto-criado</span>
          </div>

          <ul className="flex flex-col gap-space-sm">
            {availableSuggestions.map((suggestion) => {
              const isAdding = pendingKey === suggestion.key;
              return (
                <li key={suggestion.key} className="rounded-lg bg-surface-container-lowest p-space-md shadow-sm">
                  <div className="flex items-center justify-between gap-space-sm">
                    <div className="flex items-center gap-space-sm min-w-0">
                      <span className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${iconTone[suggestion.group]}`} aria-hidden="true">
                        <MaterialIcon name={suggestionIcons[suggestion.key] ?? 'science'} size={22} />
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full font-label-code text-label-code ${groupTone[suggestion.group]}`}>
                            {suggestion.abbreviation}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full font-label-code text-label-code uppercase tracking-wider ${suggestion.group === 'factor' ? 'bg-secondary/10 text-secondary' : 'bg-primary/10 text-primary'}`}>
                            {groupLabel[suggestion.group]}
                          </span>
                          <span className="font-body-sm text-body-sm text-outline truncate">{suggestion.meta}</span>
                        </div>
                        <h3 className="font-headline-md text-headline-md text-on-surface truncate mt-0.5">{suggestion.name}</h3>
                        <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{suggestion.valueSummary}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`shrink-0 min-h-[44px] px-3.5 py-2 rounded-full font-label-lg text-label-lg active:scale-95 transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-60 ${suggestion.group === 'factor' ? 'bg-secondary text-on-secondary' : 'bg-primary text-on-primary'}`}
                      aria-label={`Adicionar ${suggestion.name}`}
                      onClick={() => void addSuggestion(suggestion)}
                      disabled={pendingKey !== null}
                    >
                      <MaterialIcon name={isAdding ? 'hourglass_top' : 'add'} size={18} />
                      <span>{isAdding ? 'Adicionando…' : 'Adicionar'}</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="bg-surface-container-low p-space-lg rounded-lg space-y-3" aria-labelledby="custom-indicator-heading">
        <div className="space-y-1">
          <h2 id="custom-indicator-heading" className="font-headline-md text-headline-md text-on-surface">
            Quer rastrear algo específico?
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Personalize nome, unidade, tipo de resposta e frequência de coleta como preferir.
          </p>
        </div>
        <Link
          to="/indicators/new"
          onClick={invite.markUsefulInteraction}
          className="w-full min-h-[48px] rounded-full bg-surface-container-highest text-primary font-label-lg text-label-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm hover:bg-surface-variant"
        >
          <MaterialIcon name="add_circle" size={20} />
          <span>Criar meu próprio indicador</span>
        </Link>
      </section>

      <section className="bg-surface-container-lowest p-space-lg rounded-lg shadow-sm space-y-space-md" aria-labelledby="insights-explained-heading">
        <div className="flex items-center justify-between gap-space-sm">
          <div className="flex items-center gap-2 min-w-0">
            <MaterialIcon name="insights" size={22} className="text-primary" />
            <h2 id="insights-explained-heading" className="font-headline-md text-headline-md text-on-surface">
              Como os insights funcionam?
            </h2>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-surface-container font-label-code text-label-code text-outline uppercase tracking-wider shrink-0">
            Metodologia
          </span>
        </div>

        <div className="relative w-full h-24 bg-surface-container-low rounded flex items-center justify-center overflow-hidden px-4" aria-hidden="true">
          <svg className="w-full h-full" fill="none" preserveAspectRatio="none" viewBox="0 0 320 80">
            <path d="M 0 50 Q 80 20, 160 55 T 320 30" fill="none" opacity="0.35" stroke="#0051d5" strokeDasharray="4 4" strokeWidth="2" />
            <path d="M 0 35 Q 90 65, 170 30 T 320 50" fill="none" opacity="0.45" stroke="#7c3aed" strokeDasharray="4 4" strokeWidth="2" />
            <circle cx="80" cy="35" fill="#0051d5" opacity="0.6" r="3" />
            <circle cx="240" cy="40" fill="#7c3aed" opacity="0.6" r="3" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low/90 via-transparent to-transparent flex items-end justify-center pb-2">
            <span className="font-label-code text-label-code text-on-surface-variant flex items-center gap-1.5 bg-surface-container-lowest/80 px-2.5 py-1 rounded-full backdrop-blur-sm shadow-sm">
              <MaterialIcon name="schedule" size={14} className="text-primary" />
              {indicators.length ? 'Aguardando seus primeiros registros' : 'Aguardando seus primeiros indicadores'}
            </span>
          </div>
        </div>

        <div className="space-y-space-sm font-body-sm text-body-sm text-on-surface-variant">
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-surface-container text-on-surface font-label-code text-label-code flex items-center justify-center shrink-0 mt-0.5">1</span>
            <p><strong className="font-semibold text-on-surface">Dia 1:</strong> retrato factual do seu preenchimento, sem conclusões.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-surface-container text-on-surface font-label-code text-label-code flex items-center justify-center shrink-0 mt-0.5">2</span>
            <p><strong className="font-semibold text-on-surface">A partir do Dia 2:</strong> comparações descritivas entre seus dias.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-surface-container-high text-primary font-label-code text-label-code flex items-center justify-center shrink-0 mt-0.5 font-bold">14</span>
            <p><strong className="font-semibold text-primary">A partir de 14 pares válidos:</strong> primeiras associações estatísticas, sempre apresentadas como possibilidades.</p>
          </div>
        </div>
      </section>

      <section className="bg-surface-container-low p-space-md rounded-lg flex items-start gap-space-sm" aria-labelledby="data-protection-heading">
        <span className="w-8 h-8 rounded-full bg-surface-container-high text-secondary flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">
          <MaterialIcon name="lock" size={18} />
        </span>
        <div className="space-y-1 min-w-0">
          <h2 id="data-protection-heading" className="font-label-lg text-label-lg text-on-surface font-semibold">
            {accountTitle}
          </h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            {accountDescription}
          </p>
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
