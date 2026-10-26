import type { ButtonHTMLAttributes } from 'react';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'factor' | 'neutral' | 'ghost' | 'danger';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary-container text-on-primary shadow-md shadow-primary/20',
  factor: 'bg-secondary text-on-secondary shadow-sm',
  neutral: 'bg-surface-container text-on-surface hover:bg-surface-container-high',
  ghost: 'border border-outline-variant bg-transparent text-on-surface',
  danger: 'bg-error text-on-error',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  icon?: IconName;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  fullWidth,
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-5 font-label-lg text-label-lg transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${size === 'lg' ? 'h-14' : 'h-12'} ${fullWidth ? 'w-full' : ''} ${variants[variant]} ${className}`}
      {...rest}
    >
      {icon && <Icon name={icon} className="text-[20px]" />}
      {children}
    </button>
  );
}
