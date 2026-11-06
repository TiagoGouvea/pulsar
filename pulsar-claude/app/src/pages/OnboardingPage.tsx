import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { Button, Card, Chip, EyeToggle, Icon, IndicatorLabel, type IconName } from '../design';

const exerciseSource = { name: 'Exercício Físico', abbreviation: 'EXE' };
const coffeeSource = { name: 'Café Expresso', abbreviation: 'CAF' };
const coenzymeSource = { name: 'Coenzima Q10', abbreviation: 'Q10' };
const readingSource = { name: 'Leitura', abbreviation: 'SLP' };
const energySource = { name: 'Nível de Energia', abbreviation: 'NRG' };
const focusSource = { name: 'Concentração / Foco', abbreviation: 'FOC' };
const headacheSource = { name: 'Dor de Cabeça', abbreviation: 'DOR' };

/** Small mono label used by the trackers and badges across the three steps. */
function CodeLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span className={`font-label-code text-label-code tracking-wider uppercase ${className}`}>
      {children}
    </span>
  );
}

/** Three-segment progress bar; `filled` segments are highlighted. */
function ProgressTracker({
  left,
  right,
  filled,
  accent = 'primary',
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  filled: number;
  accent?: 'primary' | 'factor';
}) {
  return (
    <div className="flex flex-col gap-space-xs">
      <div className="mb-1 flex items-center justify-between text-on-surface-variant">
        <CodeLabel>{left}</CodeLabel>
        <CodeLabel className={`font-semibold ${accent === 'factor' ? 'text-secondary' : 'text-primary'}`}>
          {right}
        </CodeLabel>
      </div>
      <div className="flex h-1.5 w-full items-center gap-1.5">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={`h-full flex-1 rounded-full ${
              index < filled
                ? accent === 'factor'
                  ? 'bg-secondary'
                  : 'bg-primary'
                : 'bg-surface-variant opacity-60'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

/** Sigla pill + icon + display name, as the design shows floating factor nodes. */
function FactorNode({
  source,
  icon,
  position,
  delay,
}: {
  source: { name: string; abbreviation: string };
  icon: IconName;
  position: string;
  delay: string;
}) {
  return (
    <span
      className={`absolute flex max-w-[140px] animate-bounce items-center gap-1 rounded-full bg-surface-container-lowest px-2 py-1 shadow-md ${position}`}
      style={{ animationDuration: '3s', animationDelay: delay }}
    >
      <IndicatorLabel
        indicator={source}
        variant="badge"
        group="factor"
        className="max-w-[115px] min-w-0 overflow-hidden !rounded-full !px-1.5 !py-0.5 !text-[10px] [&>span:last-child]:truncate"
      />
      <Icon name={icon} className="text-[14px] text-secondary" />
    </span>
  );
}

// Step 1 hero: floating factor nodes around the Pulsar core (design: onboarding_1_fatores).
function FactorsHero() {
  return (
    <div className="relative flex w-full flex-col items-center overflow-hidden rounded-lg bg-surface-container-low p-space-lg shadow-level-1">
      <span className="pointer-events-none absolute -top-12 -right-12 size-48 rounded-full bg-secondary-fixed/50 blur-2xl" />
      <span className="pointer-events-none absolute -bottom-10 -left-10 size-44 rounded-full bg-primary-fixed/40 blur-2xl" />
      <div className="relative flex h-44 w-full max-w-[280px] items-center justify-center">
        <div className="z-10 flex size-16 items-center justify-center rounded-full bg-surface-container-lowest shadow-md">
          <span className="flex size-11 items-center justify-center rounded-full bg-secondary text-on-secondary shadow-sm">
            <Icon name="science" className="text-[24px]" />
          </span>
        </div>
        <svg
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 280 176"
          fill="none"
        >
          <circle
            className="text-surface-variant"
            cx="140"
            cy="88"
            r="64"
            stroke="currentColor"
            strokeDasharray="3 3"
            strokeWidth="1.5"
          />
          <line
            className="text-secondary-fixed-dim"
            x1="140"
            x2="52"
            y1="88"
            y2="40"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <line
            className="text-secondary-fixed-dim"
            x1="140"
            x2="228"
            y1="88"
            y2="40"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <line
            className="text-secondary-fixed-dim"
            x1="140"
            x2="52"
            y1="88"
            y2="136"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <line
            className="text-secondary-fixed-dim"
            x1="140"
            x2="228"
            y1="88"
            y2="136"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
        <FactorNode source={coffeeSource} icon="coffee" position="left-1 top-4" delay="0s" />
        <FactorNode source={exerciseSource} icon="fitness_center" position="right-1 top-4" delay="0.4s" />
        <FactorNode source={coenzymeSource} icon="medication" position="bottom-4 left-1" delay="0.2s" />
        <FactorNode source={readingSource} icon="bedtime" position="bottom-4 right-1" delay="0.6s" />
      </div>
      <span className="mt-2 flex items-center gap-1.5 rounded-full bg-secondary-fixed/60 px-3 py-1">
        <span className="size-1.5 rounded-full bg-secondary" />
        <CodeLabel className="font-semibold text-on-secondary-fixed">Inputs Bio-Comportamentais</CodeLabel>
      </span>
    </div>
  );
}

// Step 1 sandbox: illustrative examples of how quick a record feels (static demo data, not app state).
function FactorsSandbox() {
  const [exercise, setExercise] = useState(true);
  const [coffee, setCoffee] = useState(2);
  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Icon name="touch_app" className="text-[20px] text-secondary" />
          <span className="font-label-lg text-label-lg text-on-surface">Exemplos práticos de registro</span>
        </span>
        <CodeLabel className="font-semibold text-secondary uppercase">Interativo</CodeLabel>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-surface-container-low p-space-sm">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex min-w-0 flex-col">
            <IndicatorLabel
              indicator={exerciseSource}
              className="font-label-lg text-label-lg text-on-surface"
            />
            <span className="font-body-sm text-body-sm text-on-surface-variant">Intensidade moderada</span>
          </span>
        </span>
        <span className="flex shrink-0 items-center rounded-full bg-surface-container-high p-1">
          <Chip selected={!exercise} onClick={() => setExercise(false)}>
            Não
          </Chip>
          <Chip selected={exercise} tone="factor" onClick={() => setExercise(true)}>
            Sim
          </Chip>
        </span>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-surface-container-low p-space-sm">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex min-w-0 flex-col">
            <IndicatorLabel
              indicator={coffeeSource}
              className="flex w-full font-label-lg text-label-lg text-on-surface [&>span:last-child]:break-words"
            />
            <span className="font-body-sm text-body-sm text-on-surface-variant">Dose de cafeína</span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-surface-container-high px-2 py-1">
          <button
            type="button"
            aria-label="Diminuir dose de cafeína"
            onClick={() => setCoffee((value) => Math.max(0, value - 1))}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-surface-container-lowest text-on-surface transition-transform active:scale-95"
          >
            <Icon name="remove" className="text-[16px]" />
          </button>
          <span className="min-w-[20px] text-center font-label-lg text-label-lg text-on-surface">
            {coffee}
          </span>
          <span className="pr-1 font-body-sm text-body-sm text-on-surface-variant">xíc</span>
          <button
            type="button"
            aria-label="Aumentar dose de cafeína"
            onClick={() => setCoffee((value) => Math.min(10, value + 1))}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full bg-secondary text-on-secondary transition-transform active:scale-95"
          >
            <Icon name="add" className="text-[16px]" />
          </button>
        </span>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-surface-container-low p-space-sm">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="flex min-w-0 flex-col">
            <IndicatorLabel
              indicator={coenzymeSource}
              className="font-label-lg text-label-lg text-on-surface"
            />
            <span className="font-body-sm text-body-sm text-on-surface-variant">Suplementação celular</span>
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-surface-container-highest px-3 py-1.5 font-label-code text-label-code font-bold text-secondary">
          200 mg
        </span>
      </div>
    </Card>
  );
}

/** Segmented 0–10 scale used by the step 2 simulator. */
function ScaleBar({ value, color }: { value: number; color: 'primary' | 'secondary' }) {
  const filledClass = color === 'primary' ? 'bg-primary' : 'bg-secondary';
  const trackClass = color === 'primary' ? 'bg-primary-container' : 'bg-secondary-container';
  return (
    <div className="flex items-center justify-between gap-1 pt-space-xs" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => (
        <span
          key={index}
          className={`h-3 flex-1 rounded-full ${index < value ? trackClass : 'bg-surface-container-high'} ${
            index === value - 1 ? `h-4 ${filledClass} shadow-sm` : ''
          }`}
        />
      ))}
    </div>
  );
}

// Step 2 hero: radial bio-feedback graphic (design: onboarding_2_resultados).
function ResultsHero() {
  return (
    <div className="relative my-space-xs flex size-44 items-center justify-center">
      <span className="absolute inset-0 rounded-full bg-primary/10 blur-xl" />
      <span className="absolute inset-2 flex items-center justify-center rounded-full bg-surface-container-low shadow-level-1">
        <svg aria-hidden="true" className="size-36 -rotate-90" viewBox="0 0 120 120">
          <circle
            className="text-surface-container-high"
            cx="60"
            cy="60"
            fill="none"
            r="50"
            stroke="currentColor"
            strokeWidth="8"
          />
          <circle
            className="text-primary-container"
            cx="60"
            cy="60"
            fill="none"
            r="50"
            stroke="currentColor"
            strokeDasharray="314"
            strokeDashoffset="75"
            strokeLinecap="round"
            strokeWidth="8"
          />
          <circle
            className="text-secondary-container"
            cx="60"
            cy="60"
            fill="none"
            r="38"
            stroke="currentColor"
            strokeDasharray="238"
            strokeDashoffset="60"
            strokeLinecap="round"
            strokeWidth="4"
          />
        </svg>
      </span>
      <span className="relative z-10 flex size-20 flex-col items-center justify-center rounded-full bg-primary text-on-primary shadow-md">
        <Icon name="vital_signs" className="text-[28px]" />
        <CodeLabel className="mt-0.5 tracking-widest">RES // 02</CodeLabel>
      </span>
      <span className="absolute top-2 right-4 flex items-center gap-1 rounded-full bg-surface-container-highest px-space-xs py-0.5 font-label-code text-label-code text-primary shadow-level-1">
        <span className="size-1.5 animate-ping rounded-full bg-primary" />
        <span>+24%</span>
      </span>
      <span className="absolute bottom-3 left-3 rounded-full bg-secondary-fixed px-space-xs py-0.5 font-label-code text-label-code text-secondary shadow-level-1">
        r = +0.82
      </span>
    </div>
  );
}

// Step 3: factor → result convergence diagram (design: onboarding_3_associa_es).
function ConvergenceDiagram() {
  return (
    <Card>
      <div className="mb-space-md flex items-center justify-between">
        <span className="flex items-center gap-space-xs">
          <CodeLabel className="rounded-full bg-secondary-fixed px-2 py-0.5 text-on-secondary-fixed">
            FAT • INSUMO
          </CodeLabel>
          <Icon name="arrow_forward" className="text-[16px] text-on-surface-variant" />
          <CodeLabel className="rounded-full bg-primary-fixed px-2 py-0.5 text-on-primary-fixed">
            RES • IMPACTO
          </CodeLabel>
        </span>
        <CodeLabel className="rounded-full bg-primary-fixed/40 px-2 py-0.5 text-primary">
          r = +0.68 (Moderada-Alta)
        </CodeLabel>
      </div>
      <div className="relative flex h-28 flex-col justify-between rounded-2xl bg-surface-container-low p-2">
        <svg
          aria-hidden="true"
          className="h-full w-full"
          viewBox="0 0 320 90"
          fill="none"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id="onboardingFactorGrad"
              gradientUnits="userSpaceOnUse"
              x1="0"
              x2="320"
              y1="0"
              y2="0"
            >
              <stop offset="0%" stopColor="#0051d5" stopOpacity="0.25" />
              <stop offset="50%" stopColor="#0051d5" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient
              id="onboardingResultLine"
              gradientUnits="userSpaceOnUse"
              x1="0"
              x2="320"
              y1="0"
              y2="0"
            >
              <stop offset="0%" stopColor="#0051d5" />
              <stop offset="45%" stopColor="#316bf3" />
              <stop offset="100%" stopColor="#630ed4" />
            </linearGradient>
          </defs>
          <path
            d="M 10,75 C 60,75 100,55 160,40 C 220,25 270,18 310,18 L 310,85 L 10,85 Z"
            fill="url(#onboardingFactorGrad)"
          />
          <path
            d="M 10,72 Q 40,65 75,70 T 145,50 T 215,32 T 310,18"
            fill="none"
            stroke="url(#onboardingResultLine)"
            strokeLinecap="round"
            strokeWidth="2.5"
          />
          <circle className="fill-secondary" cx="75" cy="70" r="4.5" />
          <circle className="fill-secondary-container" cx="145" cy="50" r="4.5" />
          <circle className="animate-pulse fill-primary" cx="215" cy="32" r="5" />
          <circle className="fill-primary" cx="310" cy="18" r="6" />
          <circle cx="310" cy="18" r="10" fill="none" stroke="#7c3aed" strokeOpacity="0.3" strokeWidth="2" />
        </svg>
        <div className="flex items-center justify-between px-1 font-label-code text-[10px] text-on-surface-variant">
          <span className="flex items-center gap-1">
            ENTRADA (
            <IndicatorLabel indicator={exerciseSource} />)
          </span>
          <span className="hidden font-semibold text-primary sm:inline">T+Δ • CONVERGÊNCIA ANALÍTICA</span>
          <span className="flex items-center gap-1">
            EFEITO (
            <IndicatorLabel indicator={energySource} />)
          </span>
        </div>
      </div>
    </Card>
  );
}

/** One "platform guarantee" row of the step 3 bento. */
function Guarantee({
  icon,
  title,
  text,
  circle,
}: {
  icon: IconName;
  title: string;
  text: string;
  circle: string;
}) {
  return (
    <div className="flex items-center gap-space-md rounded-2xl bg-surface-container-lowest p-space-sm">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${circle}`}>
        <Icon name={icon} className="text-[20px]" />
      </span>
      <span className="flex min-w-0 flex-col">
        <h2 className="font-label-lg text-label-lg text-on-surface">{title}</h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{text}</p>
      </span>
    </div>
  );
}

/**
 * First-access tutorial: three steps (Factors, Results, Associations) following
 * design/onboarding_1_fatores, onboarding_2_resultados and onboarding_3_associa_es.
 * Finishing or skipping records onboardingCompleted=true and lands on the dashboard.
 */
export function OnboardingPage() {
  const { user, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // StrictMode can fire the click effect twice; only the first completion may run.
  const inFlight = useRef(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [step]);

  async function finish() {
    if (inFlight.current || !user) return;
    inFlight.current = true;
    setFinishing(true);
    setError(null);
    try {
      await completeOnboarding();
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Não foi possível concluir a introdução. Tente novamente.');
      setFinishing(false);
    }
    inFlight.current = false;
  }

  function next() {
    setStep((current) => Math.min(2, current + 1));
  }

  function back() {
    setStep((current) => Math.max(0, current - 1));
  }

  return (
    <div className="flex min-h-dvh flex-col bg-surface text-on-surface">
      <header className="fixed inset-x-0 top-0 z-50 bg-surface/85 pt-safe shadow-[0_1px_8px_rgba(19,27,46,0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-(--container-app) items-center justify-between gap-space-sm px-gutter">
          <div className="flex min-w-0 items-center gap-space-sm">
            <button
              type="button"
              aria-label="Voltar"
              onClick={back}
              disabled={step === 0 || finishing}
              className="flex size-11 shrink-0 items-center justify-center rounded-full text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-35"
            >
              <Icon name="arrow_back" className="text-[22px]" />
            </button>
            <span className="flex min-w-0 items-center gap-1">
              <span className="size-2 shrink-0 rounded-full bg-primary" />
              <CodeLabel className="truncate text-on-surface-variant">Pulsar // Bio-Exp</CodeLabel>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <EyeToggle compact />
            <Button variant="ghost" onClick={finish} disabled={finishing || !user} className="min-h-11 px-3">
              Pular
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-dvh w-full max-w-(--container-app) flex-col px-gutter pt-20 pb-8">
        {step === 0 && (
          <div className="flex flex-1 flex-col gap-space-md">
            <ProgressTracker left="Passo 01 // 03" right="Fatores" filled={1} accent="factor" />
            <FactorsHero />
            <div className="mt-space-xs flex flex-col gap-space-xs">
              <span className="self-start rounded-full bg-secondary-fixed px-2.5 py-0.5 font-label-code text-label-code text-on-secondary-fixed uppercase">
                Passo 1 de 3 • Fatores
              </span>
              <h1 className="font-headline-xl-mobile text-headline-xl-mobile tracking-tight text-balance">
                Observe sua rotina sem burocracia
              </h1>
              <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
                Fatores são hábitos, atividades e consumos do seu dia a dia. Você não precisa preencher
                dezenas de perguntas: registre apenas o que quiser em 15 segundos.
              </p>
            </div>
            <FactorsSandbox />
            <div className="mb-space-lg flex items-start gap-space-sm rounded-2xl bg-tertiary/10 p-space-md">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-tertiary text-on-tertiary">
                <Icon name="verified" className="text-[16px]" />
              </span>
              <p className="font-body-sm text-body-sm leading-snug text-on-surface">
                <strong className="font-semibold text-tertiary">Zero fricção:</strong> Nenhum campo é
                obrigatório. Responda apenas o que fizer sentido no seu dia a dia e descubra correlações reais
                com sua energia.
              </p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-1 flex-col gap-space-lg">
            <ProgressTracker left="Passo 02 • Resultados" right="66% Concluído" filled={2} />
            <div className="flex flex-col items-center gap-space-sm pt-space-xs text-center">
              <ResultsHero />
              <span className="inline-flex items-center gap-space-xs rounded-full bg-primary-fixed px-space-md py-1 text-on-primary-fixed">
                <span className="size-2 rounded-full bg-primary" />
                <CodeLabel>Passo 2 de 3 • Resultados</CodeLabel>
              </span>
              <h1 className="mt-space-xs font-headline-xl-mobile text-headline-xl-mobile tracking-tight">
                Acompanhe como seu corpo responde
              </h1>
              <p className="max-w-sm font-body-md text-body-md text-on-surface-variant">
                Resultados são os efeitos que você percebe ou afere: níveis de energia, nitidez mental, sono
                regenerativo ou remissão de sintomas.
              </p>
            </div>
            <Card>
              <div className="flex items-center justify-between pb-space-xs">
                <span className="flex items-center gap-space-xs">
                  <span className="rounded-full bg-primary-fixed px-space-xs py-0.5 font-label-code text-label-code text-primary">
                    RES
                  </span>
                  <span className="font-label-lg text-label-lg text-on-surface">Simulador de Percepção</span>
                </span>
                <CodeLabel className="text-on-surface-variant">TEMPO REAL</CodeLabel>
              </div>
              <div className="flex flex-col gap-space-xs rounded-2xl bg-surface-container-low p-space-md">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-space-xs">
                    <Icon name="bolt" className="text-[20px] text-primary" />
                    <IndicatorLabel
                      indicator={energySource}
                      className="font-label-md text-label-md text-on-surface"
                    />
                  </span>
                  <span className="font-headline-md text-headline-md font-bold text-primary">
                    8<span className="font-body-sm text-body-sm text-on-surface-variant">/10</span>
                  </span>
                </div>
                <ScaleBar value={8} color="primary" />
                <div className="flex justify-between pt-0.5 font-label-code text-label-code text-on-surface-variant">
                  <span>0 (Exaustão)</span>
                  <span className="font-semibold text-primary">Pico de Atividade</span>
                  <span>10 (Vigor)</span>
                </div>
              </div>
              <div className="flex flex-col gap-space-xs rounded-2xl bg-surface-container-low p-space-md">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-space-xs">
                    <Icon name="psychology" className="text-[20px] text-secondary" />
                    <IndicatorLabel
                      indicator={focusSource}
                      className="font-label-md text-label-md text-on-surface"
                    />
                  </span>
                  <span className="font-headline-md text-headline-md font-bold text-secondary">
                    7<span className="font-body-sm text-body-sm text-on-surface-variant">/10</span>
                  </span>
                </div>
                <ScaleBar value={7} color="secondary" />
                <div className="flex justify-between pt-0.5 font-label-code text-label-code text-on-surface-variant">
                  <span>Disperso</span>
                  <span className="font-semibold text-secondary">Flow Profundo</span>
                  <span>Imersão</span>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-surface-container-low p-space-md">
                <span className="flex items-center gap-space-sm">
                  <span className="flex size-8 items-center justify-center rounded-full bg-surface-container text-on-surface">
                    <Icon name="healing" className="text-[18px]" />
                  </span>
                  <span className="flex flex-col">
                    <IndicatorLabel
                      indicator={headacheSource}
                      className="font-label-md text-label-md text-on-surface"
                    />
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Registro binário
                    </span>
                  </span>
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-tertiary-fixed px-space-md py-1.5 text-on-tertiary-fixed shadow-level-1">
                  <Icon name="check_circle" className="text-[16px]" />
                  <span className="font-label-md text-label-md font-semibold">Sem sintomas</span>
                </span>
              </div>
            </Card>
            <div className="flex items-start gap-space-md rounded-lg bg-surface-container-high/60 p-space-md">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary shadow-level-1">
                <Icon name="tune" className="text-[20px]" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-label-lg text-label-lg font-semibold text-on-surface">
                  Direção Desejável Personalizada
                </span>
                <p className="font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                  Você parametriza a meta de cada bio-variável: mais energia (quanto maior, melhor) ou menos
                  estresse e dores (quanto menor, melhor). O algoritmo ajusta as correlações automaticamente.
                </p>
              </span>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-1 flex-col gap-space-lg">
            <ProgressTracker left="Fase de Onboarding" right="3 de 3 Concluído" filled={3} />
            <span className="mb-space-sm inline-flex items-center gap-space-xs self-start rounded-full bg-surface-container-high px-3 py-1 text-primary">
              <span className="size-1.5 rounded-full bg-primary" />
              <CodeLabel>Passo 3 de 3 • Ciência Pessoal</CodeLabel>
            </span>
            <div className="flex flex-col gap-space-xs">
              <h1 className="font-headline-xl-mobile text-headline-xl-mobile tracking-tight">
                Descubra associações reais nos seus dados
              </h1>
              <p className="font-body-md text-body-md leading-relaxed text-on-surface-variant">
                O algoritmo do Pulsar cruza o que você faz com o que você sente. Sem palpites: correlações
                matemáticas calculadas direto no seu dispositivo.
              </p>
            </div>
            <ConvergenceDiagram />
            <Card>
              <div className="mb-space-sm flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-fixed px-2.5 py-1 font-label-code text-label-code text-on-primary-fixed">
                  <Icon name="insights" className="text-[14px]" />
                  <span>Possível Associação (r = +0.68)</span>
                </span>
                <CodeLabel className="text-on-surface-variant">N = 28 dias</CodeLabel>
              </div>
              <div className="mb-space-sm grid grid-cols-2 gap-space-sm">
                <div className="flex flex-col rounded-2xl bg-surface-container-low p-space-sm">
                  <CodeLabel className="flex items-center gap-1 text-on-surface-variant">
                    COM
                    <IndicatorLabel indicator={exerciseSource} />
                  </CodeLabel>
                  <span className="mt-0.5 flex items-baseline gap-1">
                    <span className="font-stat-display text-stat-display text-on-surface">7.4</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">/ 10</span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 font-label-code text-[10px] font-semibold text-tertiary">
                    ▲ +27%
                    <IndicatorLabel indicator={energySource} />
                  </span>
                </div>
                <div className="flex flex-col rounded-2xl bg-surface-container-low p-space-sm">
                  <CodeLabel className="text-on-surface-variant">DIAS DE REPOUSO</CodeLabel>
                  <span className="mt-0.5 flex items-baseline gap-1">
                    <span className="font-stat-display text-stat-display text-on-surface-variant">5.8</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">/ 10</span>
                  </span>
                  <span className="mt-0.5 font-label-code text-[10px] text-on-surface-variant">
                    Linha Base Observada
                  </span>
                </div>
              </div>
              <p className="mb-space-xs font-body-sm text-body-sm leading-relaxed text-on-surface-variant">
                Nos dias com <IndicatorLabel indicator={exerciseSource} /> registrado, sua pontuação de
                energia média atingiu 7,4 vs 5,8 em períodos de descanso.
              </p>
              <div className="flex items-start gap-1.5 pt-space-xs text-on-surface-variant">
                <Icon name="verified" className="mt-0.5 shrink-0 text-[16px]" />
                <p className="font-label-code text-label-code leading-tight">
                  Rigor do Pulsar: Correlação estatística preliminar calculada por pareamento temporal. Não
                  implica causalidade direta sem replicação contínua.
                </p>
              </div>
            </Card>
            <div className="mb-space-xl flex flex-col gap-space-xs">
              <CodeLabel className="mb-1 text-on-surface-variant">Garantias da Plataforma</CodeLabel>
              <Guarantee
                icon="no_accounts"
                title="Conta Anônima Inicial"
                text="Comece agora mesmo no aparelho. Sem login, e-mail ou burocracia."
                circle="bg-secondary-fixed text-on-secondary-fixed"
              />
              <Guarantee
                icon="visibility_off"
                title="Modo Siglas Imediato"
                text="Discrição total em público: oculte textos sensíveis com um toque."
                circle="bg-surface-container-high text-primary"
              />
              <Guarantee
                icon="bolt"
                title="15 Segundos por Dia"
                text="Teclado de micro-pills e atalhos rápidos desenhados para uma só mão."
                circle="bg-primary-fixed text-on-primary-fixed"
              />
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="font-body-md text-body-md text-error">
            {error}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-space-sm pt-space-md">
          {step === 0 ? (
            <>
              <Button
                size="lg"
                fullWidth
                variant="factor"
                icon="arrow_forward"
                iconPosition="right"
                onClick={next}
              >
                Próximo: Resultados
              </Button>
              <Button variant="neutral" fullWidth onClick={finish} disabled={finishing || !user}>
                Pular introdução
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-space-md">
              <Button variant="neutral" icon="arrow_back" onClick={back} disabled={finishing}>
                Voltar
              </Button>
              {step === 1 ? (
                <Button size="lg" fullWidth icon="arrow_forward" iconPosition="right" onClick={next}>
                  Próximo: Descobertas
                </Button>
              ) : (
                <Button
                  size="lg"
                  fullWidth
                  icon="arrow_forward"
                  iconPosition="right"
                  onClick={finish}
                  disabled={finishing || !user}
                >
                  Começar a Explorar
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
