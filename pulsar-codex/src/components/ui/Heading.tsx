import React, { ElementType, HTMLAttributes } from 'react';
import clsx from 'clsx';

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  variant?: 'mobile' | 'desktop';
  children: React.ReactNode;
}

export const Heading: React.FC<HeadingProps> = ({
  level,
  variant = 'mobile',
  children,
  className,
  ...props
}) => {
  const baseClasses = 'font-headline text-on-surface tracking-tight';

  const variants = {
    mobile: {
      1: 'text-headline-xl-mobile font-bold',
      2: 'text-headline-lg-mobile font-semibold',
      3: 'text-headline-md font-semibold',
      4: 'text-label-lg font-medium',
      5: 'text-label-md font-medium',
      6: 'text-label-sm font-medium'
    },
    desktop: {
      1: 'text-headline-xl font-bold',
      2: 'text-headline-lg font-semibold',
      3: 'text-headline-md font-semibold',
      4: 'text-label-lg font-medium',
      5: 'text-label-md font-medium',
      6: 'text-label-sm font-medium'
    }
  };

  const classes = clsx(
    baseClasses,
    variants[variant][level],
    className
  );

  const Element = `h${level}` as ElementType;

  return (
    <Element className={classes} {...props}>
      {children}
    </Element>
  );
};

export default Heading;
