import React, { HTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  variant?: 'default' | 'elevated' | 'outline';
}

export const Card: React.FC<CardProps> = ({
  children,
  hover = false,
  padding = 'md',
  variant = 'default',
  className,
  ...props
}) => {
  const baseClasses = 'bg-surface-container-lowest rounded-lg';

  const variants = {
    default: 'shadow-sm',
    elevated: 'shadow-md',
    outline: 'border border-outline'
  };

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5'
  };

  const classes = clsx(
    baseClasses,
    variants[variant],
    paddings[padding],
    hover && 'hover:shadow-md transition-all duration-200',
    className
  );

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export default Card;
