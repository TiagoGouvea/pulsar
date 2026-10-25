import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button, Card, Chip, GroupBadge, Icon, NumberInput, Sheet, Slider, Toggle } from '..';

const designDir = join(__dirname, '..');

// Minimum touch size in px implied by Tailwind sizing classes (h-N / w-N / min-h-N / min-w-N, 1 unit = 4px).
function touchSize(el: Element, axis: 'h' | 'w'): number {
  const sizes = [...el.classList]
    .map((c) => c.match(new RegExp(`^(?:min-)?${axis}-(\\d+(?:\\.\\d+)?)$`)))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => Number(m[1]) * 4);
  return Math.max(0, ...sizes);
}

function expectTouchTarget(el: Element) {
  expect(touchSize(el, 'h'), `height of ${el.outerHTML.slice(0, 80)}`).toBeGreaterThanOrEqual(44);
  expect(touchSize(el, 'w') || 44, `width of ${el.outerHTML.slice(0, 80)}`).toBeGreaterThanOrEqual(44);
}

describe('F-0.02 design tokens', () => {
  const css = readFileSync(join(designDir, 'tokens.css'), 'utf8');

  it('declares colors, typography, radii and spacing inside @theme', () => {
    expect(css).toContain('@theme');
    for (const token of ['--color-primary', '--color-secondary', '--font-display', '--radius-', '--spacing-']) {
      expect(css).toContain(token);
    }
  });

  it('components use no hard-coded colors', () => {
    const files = readdirSync(designDir).filter((f) => f.endsWith('.tsx'));
    expect(files.length).toBeGreaterThanOrEqual(9);
    for (const file of files) {
      const src = readFileSync(join(designDir, file), 'utf8');
      expect(src, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(src, file).not.toMatch(/\b(?:rgba?|hsla?)\(/);
      expect(src, file).not.toMatch(/-\[#/);
    }
  });
});

describe('F-0.02 GroupBadge', () => {
  it('distinguishes Fator and Resultado by text, not only by color', () => {
    const { container: a } = render(<GroupBadge group="factor" />);
    const { container: b } = render(<GroupBadge group="result" />);
    expect(a.textContent).toContain('Fator');
    expect(b.textContent).toContain('Resultado');
    expect(a.textContent).not.toContain('Resultado');
    expect(b.textContent).not.toContain('Fator');
  });
});

describe('F-0.02 touch targets and accessible labels', () => {
  it('Button and Chip are >= 44px with an accessible name', () => {
    render(
      <>
        <Button>Salvar</Button>
        <Button size="lg">Continuar</Button>
        <Chip>Sim</Chip>
      </>,
    );
    for (const name of ['Salvar', 'Continuar', 'Sim']) {
      expectTouchTarget(screen.getByRole('button', { name }));
    }
  });

  it('Toggle is a labelled switch with a >= 44px target', () => {
    render(<Toggle label="Lembrete diário" checked={false} onChange={vi.fn()} />);
    expectTouchTarget(screen.getByRole('switch', { name: 'Lembrete diário' }));
  });

  it('NumberInput steppers and field are labelled and >= 44px', () => {
    render(<NumberInput label="Água" value={2} onChange={vi.fn()} />);
    expectTouchTarget(screen.getByRole('button', { name: /diminuir água/i }));
    expectTouchTarget(screen.getByRole('button', { name: /aumentar água/i }));
    expect(screen.getByRole('textbox', { name: /água/i })).toBeInTheDocument();
  });

  it('Slider options are labelled radios with >= 44px targets', () => {
    render(<Slider label="Energia" value={null} onChange={vi.fn()} />);
    expect(screen.getByRole('radiogroup', { name: 'Energia' })).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios.length).toBeGreaterThan(1);
    radios.forEach(expectTouchTarget);
  });

  it('Sheet is a labelled dialog whose close button is labelled and >= 44px', () => {
    render(
      <Sheet open onClose={vi.fn()} title="Novo indicador">
        <p>conteúdo</p>
      </Sheet>,
    );
    expect(screen.getByRole('dialog', { name: 'Novo indicador' })).toBeInTheDocument();
    expectTouchTarget(screen.getByRole('button', { name: 'Fechar' }));
  });

  it('Card and Icon render children/name', () => {
    render(
      <Card>
        <Icon name="add" />
        corpo
      </Card>,
    );
    expect(screen.getByText('corpo')).toBeInTheDocument();
  });
});
