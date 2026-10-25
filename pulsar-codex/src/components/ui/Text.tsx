import React, { HTMLAttributes } from 'react';
import clsx from 'clsx';

interface TextProps extends HTMLAttributes<HTMLParagraphElement> {
  variant?: 'body-lg' | 'body-md' | 'body-sm' | 'label-lg' | 'label-md' | 'label-code' | 'stat-display';
  color?: 'on-surface' | 'on-surface-variant' | 'primary' | 'secondary' | 'tertiary' | 'error';
  align?: 'left' | 'center' | 'right';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  truncate?: boolean;
}

export const Text: React.FC<TextProps> = ({
  variant = 'body-md',
  color = 'on-surface',
  align = 'left',
  weight = 'regular',
  truncate = false,
  children,
  className,
  ...props
}) => {
  const baseClasses = clsx(
    'font-body',
    align === 'center' && 'text-center',
    align === 'right' && 'text-right',
    truncate && 'truncate'
  );

  const variants = {
    'body-lg': 'font-body-lg text-body-lg',
    'body-md': 'font-body-md text-body-md',
    'body-sm': 'font-body-sm text-body-sm',
    'label-lg': 'font-label-lg text-label-lg',
    'label-md': 'font-label-md text-label-md',
    'label-code': 'font-label-code text-label-code',
    'stat-display': 'font-stat-display text-stat-display'
  };

  const colors = {
    'on-surface': 'text-on-surface',
    'on-surface-variant': 'text-on-surface-variant',
    primary: 'text-primary',
    secondary: 'text-secondary',
    tertiary: 'text-tertiary',
    error: 'text-error'
  };

  const weights = {
    regular: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold'
  };

  const classes = clsx(
    baseClasses,
    variants[variant],
    colors[color],
    weights[weight],
    className
  );

  return (
    <p className={classes} {...props}>
      {children}
    </p>
  );
};

export default Text;
