import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border border-grey-400 px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-grey text-white shadow hover:bg-grey/80',
        secondary:
          'border-transparent bg-[#F0F0F0] text-grey font-semibold hover:bg-grey-100',
        destructive:
          'border-transparent bg-red text-white shadow hover:bg-red/80',
        outline: 'text-grey',
        pending:
          'border-yellow bg-yellow/20 text-[0.625rem] font-semibold text-yellow h-5',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
