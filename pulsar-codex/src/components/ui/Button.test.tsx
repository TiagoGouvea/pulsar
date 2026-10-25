import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders its label and reacts to taps', () => {
    const onTap = vi.fn();
    render(<Button onClick={onTap}>Registrar hoje</Button>);

    const button = screen.getByRole('button', { name: 'Registrar hoje' });
    fireEvent.click(button);

    expect(onTap).toHaveBeenCalledTimes(1);
  });

  it('applies the primary variant classes by default', () => {
    render(<Button>Vamos lá</Button>);
    const button = screen.getByRole('button');
    expect(button.className).toContain('bg-primary');
    expect(button.className).toContain('text-on-primary');
  });

  it('supports fullWidth for fluid mobile layouts', () => {
    render(<Button fullWidth>Continuar</Button>);
    expect(screen.getByRole('button').className).toContain('w-full');
  });

  it('is inert while disabled', () => {
    const onTap = vi.fn();
    render(
      <Button disabled onClick={onTap}>
        Salvar
      </Button>
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onTap).not.toHaveBeenCalled();
  });
});