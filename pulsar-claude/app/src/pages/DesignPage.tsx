import { useState, type ReactNode } from 'react';
import {
  Button,
  Card,
  Chip,
  EyeToggle,
  GroupBadge,
  IndicatorLabel,
  NumberInput,
  Sheet,
  Slider,
  Toggle,
} from '../design';

// Dev-only catalog of the design system (route /_design, emulator builds only).
const samples = {
  exercise: { name: 'Exercício Físico', abbreviation: 'EXE', emoji: '🏃' },
  coffee: { name: 'Café', abbreviation: 'CAF', emoji: '☕' },
  energy: { name: 'Nível de Energia', abbreviation: 'ENE', emoji: '⚡' },
  focus: { name: 'Concentração', abbreviation: null, emoji: null },
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-space-md">
      <h2 className="font-headline-md text-headline-md">{title}</h2>
      {children}
    </section>
  );
}

export default function DesignPage() {
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [scale, setScale] = useState<number | null>(7);
  const [wide, setWide] = useState<number | null>(null);
  const [cups, setCups] = useState<number | null>(2);
  const [mood, setMood] = useState<string | null>('Bom');
  const [reminder, setReminder] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState('Nível de Energia');

  return (
    <main className="mx-auto flex w-full max-w-(--container-app) flex-col gap-space-xl px-margin py-space-xl">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile">Design system</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Página de desenvolvimento do Pulsar
          </p>
        </div>
        <EyeToggle />
      </header>

      <Section title="Grupos e indicadores">
        <div className="flex flex-wrap items-center gap-2">
          <GroupBadge group="factor" />
          <GroupBadge group="result" />
          <GroupBadge group="factor" plural />
          <GroupBadge group="result" plural />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <IndicatorLabel indicator={samples.exercise} variant="badge" group="factor" />
          <IndicatorLabel indicator={samples.coffee} variant="badge" group="factor" />
          <IndicatorLabel indicator={samples.energy} variant="badge" group="result" />
          <IndicatorLabel indicator={samples.focus} variant="badge" group="result" />
        </div>
        <p className="font-body-lg text-body-lg">
          Nos dias com{' '}
          <IndicatorLabel indicator={samples.exercise} className="font-semibold text-secondary" />: Sim, sua{' '}
          <IndicatorLabel indicator={samples.energy} className="font-semibold text-primary" /> média foi
          7,4/10.
        </p>
      </Section>

      <Section title="Botões">
        <div className="flex flex-wrap gap-2">
          <Button icon="add">Registrar agora</Button>
          <Button variant="factor">Registrar fator</Button>
          <Button variant="neutral" icon="arrow_back">
            Voltar
          </Button>
          <Button variant="ghost">Lembrar depois</Button>
          <Button variant="danger">Excluir</Button>
          <Button disabled>Desativado</Button>
        </div>
      </Section>

      <Section title="Cartões e controles">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-space-lg">
          <Card>
            <IndicatorLabel indicator={samples.exercise} variant="badge" group="factor" />
            <div role="group" aria-label="Sim ou não" className="grid grid-cols-2 gap-2">
              <Chip
                tone="factor"
                icon="check_circle"
                selected={answer === true}
                onClick={() => setAnswer(true)}
              >
                Sim
              </Chip>
              <Chip tone="factor" selected={answer === false} onClick={() => setAnswer(false)}>
                Não
              </Chip>
            </div>
          </Card>
          <Card>
            <IndicatorLabel indicator={samples.coffee} variant="badge" group="factor" />
            <NumberInput label="Café" unit="xícaras" value={cups} onChange={setCups} min={0} step={0.5} />
          </Card>
          <Card>
            <IndicatorLabel indicator={samples.energy} variant="badge" group="result" />
            <Slider
              label="Energia"
              value={scale}
              onChange={setScale}
              minLabel="0 (Esgotado)"
              maxLabel="10 (Pleno)"
            />
          </Card>
          <Card>
            <IndicatorLabel indicator={samples.focus} variant="badge" group="result" />
            <Slider label="Escala 0–100" min={0} max={100} step={5} value={wide} onChange={setWide} />
          </Card>
          <Card>
            <span className="font-label-lg text-label-lg">Opções ordenadas</span>
            <div className="grid grid-cols-4 gap-1.5">
              {['Ruim', 'Regular', 'Bom', 'Excelente'].map((o) => (
                <Chip key={o} tone="result" selected={mood === o} onClick={() => setMood(o)} className="px-2">
                  {o}
                </Chip>
              ))}
            </div>
          </Card>
          <Card>
            <Toggle
              label="Lembrete diário às 20h"
              description="Horário de Brasília"
              checked={reminder}
              onChange={setReminder}
            />
          </Card>
        </div>
      </Section>

      <Section title="Sheet">
        <Button variant="neutral" icon="add_circle" onClick={() => setSheetOpen(true)}>
          Abrir “Novo indicador”
        </Button>
        <Sheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title="Novo Indicador"
          description="Exemplo de formulário em bottom sheet."
        >
          <label className="flex flex-col gap-1">
            <span className="px-1 font-label-md text-label-md">Nome do indicador</span>
            {/* Explicit editing shows the real name on purpose (spec 4.4). */}
            <input
              data-privacy-allow
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-full bg-surface-container-low px-4 font-body-lg text-body-lg focus:ring-2 focus:ring-primary-container focus:outline-none"
            />
          </label>
          <Button fullWidth onClick={() => setSheetOpen(false)}>
            Salvar
          </Button>
        </Sheet>
      </Section>
    </main>
  );
}
