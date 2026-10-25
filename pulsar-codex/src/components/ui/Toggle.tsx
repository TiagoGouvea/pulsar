import React, { HTMLAttributes, ChangeEvent } from 'react';
import clsx from 'clsx';

interface ToggleProps extends Omit<HTMLAttributes<HTMLLabelElement>, 'onChange'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ checked, onChange, label, className, ...props }) => {
  const handleToggle = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  return (
    <label className={clsx('flex items-center cursor-pointer', className)} {...props}>
      {label && (
        <span className="mr-3 font-label-md text-on-surface">
          {label}
        </span>
      )}
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={handleToggle}
        />
        <div
          className={clsx(
            'w-11 h-6 rounded-full transition-colors duration-200 ease-in-out',
            checked ? 'bg-primary' : 'bg-surface-variant'
          )}
        >
          <div
            className={clsx(
              'absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ease-in-out shadow-sm',
              checked ? 'translate-x-5' : 'translate-x-0'
            )}
          />
        </div>
      </div>
    </label>
  );
};

export default Toggle;
