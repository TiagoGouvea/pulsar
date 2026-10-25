import type { HTMLAttributes } from 'react';

// Level-1 surface: white, rounded-lg (2rem), soft shadow.
export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-lg bg-surface-container-lowest p-4 shadow-level-1 ${className}`}
      {...rest}
    />
  );
}
