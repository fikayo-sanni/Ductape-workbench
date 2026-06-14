import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AuthPageShellProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  testId?: string;
  wide?: boolean;
  className?: string;
}

export default function AuthPageShell({
  children,
  title,
  subtitle,
  icon,
  testId,
  wide = false,
  className,
}: AuthPageShellProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'relative overflow-hidden bg-white border border-grey-400 rounded-10px shadow-sm',
        wide ? 'px-5 sm:px-10 py-9' : 'px-4 sm:px-7 py-8',
        className,
      )}
    >
      {(title || subtitle || icon) && (
        <div className="flex flex-col items-center text-center gap-2 mb-8">
          {icon && (
            <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              {icon}
            </div>
          )}
          {title && <h1 className="text-grey text-2xl font-bold tracking-tight">{title}</h1>}
          {subtitle && <p className="text-grey-600 text-sm max-w-sm">{subtitle}</p>}
        </div>
      )}

      {children}
    </div>
  );
}
