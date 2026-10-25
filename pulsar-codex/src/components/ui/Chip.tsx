import React, { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface ChipProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'surface' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center gap-1.5 rounded-full font-label-code uppercase tracking-wider';

  const variants = {
    primary: 'bg-primary text-on-primary',
    secondary: 'bg-secondary text-on-secondary',
    tertiary: 'bg-tertiary text-on-tertiary',
    surface: 'bg-surface-container text-on-surface-variant',
    outline: 'bg-transparent border border-outline text-on-surface'
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-label-code',
    lg: 'px-3 py-1.5 text-label-md'
  };

  const classes = clsx(
    baseClasses,
    variants[variant],
    sizes[size],
    className
  );

  return (
    <div className={classes} {...props}>
      {icon && <span>{icon}</span>}
      {children}
    </div>
  );
};

export default Chip;
