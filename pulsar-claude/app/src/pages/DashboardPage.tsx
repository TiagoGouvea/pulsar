import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { SaveAccountInviteBanner } from '../account/SaveAccountInviteBanner';
import { useAuth } from '../auth/AuthProvider';
import { listEntryDates } from '../data/entries';
import { createSuggestedIndicator, listIndicatorIdentities } from '../data/indicators';
import { Button, Card, GroupBadge, Icon, IndicatorLabel } from '../design';
import {
  INDICATOR_SUGGESTIONS,
  suggestionIndicatorId,
  type IndicatorSuggestion,
  type SuggestionKey,
} from '../features/indicators/suggestions';

const codeLabel = 'font-label-code text-label-code tracking-wider uppercase';

/**
 * Dashboard of a new account (design/dashboard_inicial_estado_vazio).
 *
 * Nothing is created automatically: the welcome card offers 3-4 quick-start suggestions plus
 * "Criar meu próprio indicador". Once indicators exist the page explains that insights arrive
 * with the first records, and the first saved record gets a discreet acknowledgement.
 */
export function DashboardPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const [activeIndicatorCount, setActiveIndicatorCount] = useState<number | null>(null);
  const [entryCount, setEntryCount] = useState<number | null>(null);
  const [isFirstRecordDay, setIsFirstRecordDay] = useState(false);
  const [existingSuggestionKeys, setExistingSuggestionKeys] = useState<SuggestionKey[]>([]);
  const [loading, setLoading] = useState(Boolean(uid));
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [creatingKey, setCreatingKey] = useState<SuggestionKey | null>(null);
  const [addedKeys, setAddedKeys] = useState<SuggestionKey[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!uid) {
      setActiveIndicatorCount(null);
      setEntryCount(null);
      setIsFirstRecordDay(false);
      setExistingSuggestionKeys([]);
      setAddedKeys([]);
      setLoading(false);
      return;
    }

    // Aggregation queries are one-shot: the dashboard never leaves a realtime Listen channel open.
    setActiveIndicatorCount(null);
    setEntryCount(null);
    setIsFirstRecordDay(false);
    setExistingSuggestionKeys([]);
    setAddedKeys([]);
    setLoading(true);
    setLoadError(null);
    void (async () => {
      try {
        const [indicators, entries] = await Promise.all([listIndicatorIdentities(uid), listEntryDates(uid)]);
        if (!active) return;
        const activeIds = new Set(indicators.filter((indicator) => indicator.active).map(({ id }) => id));
        const existingIds = new Set(indicators.map(({ id }) => id));
        const activeEntries = entries.filter((entry) => activeIds.has(entry.indicatorId));
        setActiveIndicatorCount(activeIds.size);
        setEntryCount(activeEntries.length);
        setIsFirstRecordDay(activeEntries.length === 1 && entries.length === 1);
        setExistingSuggestionKeys(
          INDICATOR_SUGGESTIONS.filter(({ key }) => existingIds.has(suggestionIndicatorId(key))).map(
            ({ key }) => key,
          ),
        );
        setLoading(false);
      } catch (cause) {
        if (!active) return;
        setLoadError(cause instanceof Error ? cause : new Error('Unable to load dashboard data.'));
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [uid]);

  const hasIndicators = (activeIndicatorCount ?? 0) > 0;
  const totalEntries = entryCount ?? 0;
  const hasEntries = totalEntries > 0;
  const ready = !loading && !loadError;
  const showEmpty = ready && !hasIndicators;
  const showNoRecords = ready && hasIndicators && !hasEntries;
  const showSuggestions = ready && !hasEntries;

  const createdKeys = new Set<SuggestionKey>([...addedKeys, ...existingSuggestionKeys]);
  const createdSuggestions = INDICATOR_SUGGESTIONS.filter((suggestion) => createdKeys.has(suggestion.key));
  const remainingSuggestions = INDICATOR_SUGGESTIONS.length - createdSuggestions.length;

  async function addSuggestion(suggestion: IndicatorSuggestion) {
    if (!uid || creatingKey !== null) return;
    setCreatingKey(suggestion.key);
    setCreateError(null);
    try {
      const active = await createSuggestedIndicator(uid, suggestionIndicatorId(suggestion.key), {
        ...suggestion.indicator,
        sortOrder: suggestion.sortOrder,
      });
      if (!active) {
        setExistingSuggestionKeys((keys) => [...keys, suggestion.key]);
        setCreateError('Este indicador está arquivado. Para usá-lo, restaure-o em Meus indicadores.');
        return;
      }
      setAddedKeys((keys) => (keys.includes(suggestion.key) ? keys : [...keys, suggestion.key]));
      setActiveIndicatorCount((count) => (count ?? 0) + 1);
    } catch {
      setCreateError('Não foi possível adicionar a sugestão. Verifique a conexão e tente novamente.');
    } finally {
      setCreatingKey(null);
    }
  }

  return (
    <div className="flex flex-col gap-space-lg pb-space-lg">
      <SaveAccountInviteBanner />
      <header className="flex flex-col gap-space-xs pt-2">
        <span className={`${codeLabel} text-on-surface-variant`}>Laboratório Pessoal</span>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">
          Bem-vindo ao Pulsar
        </h1>
      </header>

      {loadError && (
        <p role="alert" className="font-body-md text-body-md text-error">
          Não foi possível carregar seus dados. Verifique a conexão e tente novamente.
        </p>
      )}

      {loading && !loadError && (
        <p role="status" className="font-body-md text-body-md text-on-surface-variant">
          Carregando seus dados…
        </p>
      )}

      {showEmpty && <WelcomeCard />}

      {showNoRecords && <NoRecordsCard />}

      {ready && hasEntries && isFirstRecordDay && <FirstRecordThanks />}

      {ready && hasEntries && !isFirstRecordDay && <PanelSummary entryCount={totalEntries} />}

      {ready && createError && (
        <p role="alert" className="font-body-md text-body-md text-error">
          {createError}
        </p>
      )}

      {showSuggestions && (
        <section aria-labelledby="suggestions-title" className="flex flex-col gap-space-md">
          <div className="flex flex-wrap items-center justify-between gap-x-space-sm gap-y-1 px-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2 id="suggestions-title" className={`${codeLabel} text-on-surface-variant`}>
                Sugestões Científicas Iniciais
              </h2>
              <span className="shrink-0 rounded-full bg-surface-container-high px-2 py-0.5 font-label-code text-label-code font-semibold text-primary">
                {remainingSuggestions} {remainingSuggestions === 1 ? 'Pronta' : 'Prontas'}
              </span>
            </div>
            <span className="shrink-0 font-label-md text-label-md text-on-surface-variant">
              Nenhum auto-criado
            </span>
          </div>

          <div id="indicators-catalog" className="flex flex-col gap-space-sm">
            {INDICATOR_SUGGESTIONS.map((suggestion) => (
              <SuggestionCard
                key={suggestion.key}
                suggestion={suggestion}
                added={createdSuggestions.some((created) => created.key === suggestion.key)}
                busy={creatingKey === suggestion.key}
                disabled={creatingKey !== null}
                onAdd={() => void addSuggestion(suggestion)}
              />
            ))}
          </div>
        </section>
      )}

      {showSuggestions && <CreateOwnIndicatorCard />}

      {ready && !hasEntries && <InsightsExplanationCard />}
    </div>
  );
}

function WelcomeCard() {
  return (
    <Card className="relative gap-space-md overflow-hidden bg-gradient-to-br from-surface-container-low via-surface-container-lowest to-surface-container-low">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -right-12 size-36 rounded-full bg-primary-fixed/25 blur-2xl"
      />
      <div className="relative z-10 flex items-start gap-space-md">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary shadow-level-1">
          <Icon name="science" className="text-[22px]" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-headline-md text-headline-md text-on-surface">
            Sua rotina, seus dados, suas conclusões
          </h2>
          <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
            O Pulsar cruza o que você faz com o que você sente. Escolha as variáveis iniciais abaixo para
            começar sua série temporal ou crie uma do zero.
          </p>
        </div>
      </div>
    </Card>
  );
}

function SuggestionCard({
  suggestion,
  added,
  busy,
  disabled,
  onAdd,
}: {
  suggestion: IndicatorSuggestion;
  added: boolean;
  busy: boolean;
  disabled: boolean;
  onAdd: () => void;
}) {
  const isFactor = suggestion.indicator.group === 'factor';
  const designId = suggestion.indicator.abbreviation?.toLowerCase();

  return (
    <Card
      id={designId ? `card-${designId}` : undefined}
      data-testid={`suggestion-${suggestion.key}`}
      className="gap-0 p-space-md"
    >
      <div className="flex items-center justify-between gap-space-sm">
        <div className="flex min-w-0 flex-1 items-center gap-space-sm">
          <span
            aria-hidden="true"
            className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
              isFactor ? 'bg-secondary-fixed/50 text-secondary' : 'bg-primary-fixed/50 text-primary'
            }`}
          >
            <Icon name={suggestion.icon} className="text-[22px]" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-1">
              <IndicatorLabel
                indicator={suggestion.indicator}
                variant="badge"
                group={suggestion.indicator.group}
                abbreviationOnly
              />
              <GroupBadge group={suggestion.indicator.group} />
            </div>
            <span className="mt-1 truncate font-body-sm text-body-sm text-on-surface-variant">
              • {suggestion.meta}
            </span>
            <h3 className="truncate font-headline-md text-headline-md text-on-surface">
              <IndicatorLabel indicator={suggestion.indicator} />
            </h3>
            <p className="truncate font-body-sm text-body-sm text-on-surface-variant">{suggestion.format}</p>
          </div>
        </div>
        <Button
          variant={isFactor ? 'factor' : 'primary'}
          icon={added ? 'check_circle' : 'add'}
          onClick={onAdd}
          disabled={added || disabled}
          className="shrink-0 !px-3.5"
        >
          {added ? 'Adicionado' : busy ? 'Adicionando' : 'Adicionar'}
        </Button>
      </div>
    </Card>
  );
}

function CreateOwnIndicatorCard() {
  return (
    <Card className="gap-3 bg-surface-container-low">
      <div className="flex flex-col gap-1">
        <h2 className="font-headline-md text-headline-md text-on-surface">Quer rastrear algo específico?</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Personalize nome, unidade, tipo de resposta e frequência de coleta como preferir.
        </p>
      </div>
      <Link
        to="/indicators/new"
        data-testid="create-own-indicator"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-surface-container-highest font-label-lg text-label-lg text-primary shadow-level-1 transition-transform active:scale-[0.98]"
      >
        <Icon name="add_circle" className="text-[20px]" />
        Criar meu próprio indicador
      </Link>
    </Card>
  );
}

function RegisterNowLink() {
  return (
    <Link
      to="/register"
      className="inline-flex min-h-11 items-center justify-center rounded-full bg-surface-container-highest px-4 font-label-lg text-label-lg text-primary"
    >
      Registrar agora
    </Link>
  );
}

function NoRecordsCard() {
  return (
    <Card data-testid="indicators-without-records" className="gap-space-sm">
      <div className="flex items-start gap-space-sm">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed-variant">
          <Icon name="insights" className="text-[22px]" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className={`${codeLabel} text-on-surface-variant`}>Estado atual</span>
          <h2 className="font-headline-md text-headline-md text-on-surface">
            Seus indicadores ainda não têm registros
          </h2>
        </div>
      </div>
      <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
        Os insights aparecerão conforme você preencher seus dias: primeiro vem o retrato do dia, depois as
        comparações e, com dados suficientes, as possíveis associações.
      </p>
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-surface-container-low px-2.5 py-1 font-label-code text-label-code text-on-surface-variant">
        <Icon name="schedule" className="text-[14px] text-primary" />
        Aguardando primeiros dados de registro
      </span>
      <RegisterNowLink />
    </Card>
  );
}

function FirstRecordThanks() {
  return (
    <Card data-testid="first-record-thanks" className="gap-space-sm border border-tertiary-fixed-dim/60">
      <div className="flex items-start gap-space-sm">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tertiary/10 text-tertiary">
          <Icon name="verified" className="text-[22px]" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className={`${codeLabel} text-on-surface-variant`}>Primeiro registro</span>
          <h2 className="font-headline-md text-headline-md text-on-surface">
            Obrigado pelo primeiro registro.
          </h2>
        </div>
      </div>
      <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
        Seu primeiro dia está salvo. Volte amanhã para acompanhar suas comparações — no seu ritmo, sem
        cobranças.
      </p>
    </Card>
  );
}

function PanelSummary({ entryCount }: { entryCount: number }) {
  return (
    <Card className="gap-space-xs">
      <span className={`${codeLabel} text-on-surface-variant`}>Seu painel</span>
      <h2 className="font-headline-md text-headline-md text-on-surface">
        {entryCount} registros no seu histórico
      </h2>
      <p className="font-body-md text-body-md text-on-surface-variant">
        Continue registrando para que os insights ganhem força ao longo dos dias.
      </p>
      <RegisterNowLink />
    </Card>
  );
}

function TimelineStep({ marker, title, children }: { marker: string; title: string; children: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-container font-label-code text-label-code text-on-surface">
        {marker}
      </span>
      <span className="font-body-sm text-body-sm text-on-surface-variant">
        <strong className="font-semibold text-on-surface">{title}</strong> {children}
      </span>
    </li>
  );
}

function InsightsExplanationCard() {
  return (
    <Card data-testid="insights-explanation" className="gap-space-md">
      <div className="flex flex-wrap items-center justify-between gap-x-space-sm gap-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <Icon name="insights" className="text-[22px] text-primary" />
          <h2 className="font-headline-md text-headline-md text-on-surface">Como os Insights funcionam?</h2>
        </div>
        <span
          className={`${codeLabel} shrink-0 rounded-full bg-surface-container px-2 py-0.5 text-on-surface-variant`}
        >
          Metodologia
        </span>
      </div>

      <div className="relative flex h-24 w-full items-center justify-center overflow-hidden rounded-2xl bg-surface-container-low px-4">
        <svg
          aria-hidden="true"
          className="h-full w-full"
          viewBox="0 0 320 80"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M 0 50 Q 80 20, 160 55 T 320 30"
            className="text-secondary"
            opacity="0.35"
            stroke="currentColor"
            strokeDasharray="4 4"
            strokeWidth="2"
          />
          <path
            d="M 0 35 Q 90 65, 170 30 T 320 50"
            className="text-primary"
            opacity="0.45"
            stroke="currentColor"
            strokeDasharray="4 4"
            strokeWidth="2"
          />
          <circle cx="80" cy="35" r="3" className="fill-secondary" opacity="0.6" />
          <circle cx="240" cy="40" r="3" className="fill-primary" opacity="0.6" />
        </svg>
        <span className="absolute right-0 bottom-2 left-0 flex justify-center">
          <span className="flex items-center gap-1.5 rounded-full bg-surface-container-lowest/80 px-2.5 py-1 font-label-code text-label-code text-on-surface-variant shadow-level-1 backdrop-blur-sm">
            <Icon name="schedule" className="text-[14px] text-primary" />
            Aguardando primeiros dados de registro
          </span>
        </span>
      </div>

      <ol className="flex flex-col gap-space-sm">
        <TimelineStep marker="1" title="Dia 1:">
          Retrato factual e visual imediato do seu preenchimento.
        </TimelineStep>
        <TimelineStep marker="2" title="A partir do Dia 2:">
          Comparações descritivas entre seus dias de rotina.
        </TimelineStep>
        <TimelineStep marker="14" title="A partir de 14 pares válidos:">
          Primeiras possíveis associações estatísticas entre fatores e resultados.
        </TimelineStep>
      </ol>
      <RegisterNowLink />
    </Card>
  );
}
