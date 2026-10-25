import React, { InputHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className,
  ...props
}) => {
  const baseClasses = 'w-full bg-surface-container border border-outline rounded-lg px-3 py-2 text-on-surface font-body-md outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:bg-surface-dim disabled:cursor-not-allowed';

  const errorClasses = 'border-error text-error placeholder:text-error-container';

  const classes = clsx(
    baseClasses,
    error && errorClasses,
    fullWidth && 'w-full',
    leftIcon && 'pl-10',
    rightIcon && 'pr-10',
    className
  );

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="font-label-md text-on-surface">
          {label}
        </label>
      )}
      <div className="relative w-full">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            {leftIcon}
          </div>
        )}
        <input className={classes} {...props} />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <span className="font-body-sm text-error">
          {error}
        </span>
      )}
    </div>
  );
};

export default Input;
