import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'text' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-full font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-primary text-on-primary shadow-sm',
    secondary: 'bg-secondary text-on-secondary shadow-sm',
    tertiary: 'bg-tertiary text-on-tertiary shadow-sm',
    text: 'text-on-surface hover:bg-surface-container',
    ghost: 'text-on-surface hover:bg-surface-container-high'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-label-md',
    md: 'px-4 py-2 text-label-lg',
    lg: 'px-5 py-2.5 text-label-lg',
    xl: 'px-6 py-3 text-headline-md'
  };

  const classes = clsx(
    baseClasses,
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    className
  );

  return (
    <button className={classes} {...props}>
      {leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="ml-2">{rightIcon}</span>}
    </button>
  );
};

export default Button;
