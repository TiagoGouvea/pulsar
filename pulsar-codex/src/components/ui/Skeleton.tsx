import React, { HTMLAttributes } from 'react';
import clsx from 'clsx';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circle' | 'rect' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  animation = 'pulse',
  className,
  ...props
}) => {
  const baseClasses = 'bg-surface-variant/20 animate-pulse';

  const variants = {
    text: 'w-24 h-4 rounded',
    circle: 'rounded-full',
    rect: 'rounded-lg',
    rounded: 'rounded'
  };

  const animations = {
    pulse: 'animate-pulse',
    wave: 'animate-wave'
  };

  const classes = clsx(
    baseClasses,
    variants[variant],
    animations[animation],
    className
  );

  return (
    <div
      className={classes}
      style={{ width, height }}
      {...props}
    />
  );
};

export default Skeleton;
