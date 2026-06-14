import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface DuctapeBrandProps {
  showWorkbenchLabel?: boolean;
  showBeta?: boolean;
  className?: string;
  linkTo?: string;
}

export function DuctapeLogo({ className }: { className?: string }) {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('flex-shrink-0', className)}
      aria-hidden
    >
      <path
        d="M14 10C10 10 8 14 8 18V22C8 24 6 26 6 26C6 26 8 28 8 30V34C8 38 10 42 14 42"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        className="text-primary"
      />
      <path
        d="M34 10C38 10 40 14 40 18V22C40 24 42 26 42 26C42 26 40 28 40 30V34C40 38 38 42 34 42"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        className="text-primary"
      />
      <path d="M16 20H32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary" />
      <path d="M16 26H32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary" />
      <path d="M16 32H32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-primary" />
      <circle cx="16" cy="20" r="2" fill="currentColor" className="text-primary" />
      <circle cx="32" cy="26" r="2" fill="currentColor" className="text-primary" />
      <circle cx="16" cy="32" r="2" fill="currentColor" className="text-primary" />
    </svg>
  );
}

export default function DuctapeBrand({
  showWorkbenchLabel = true,
  showBeta = true,
  className,
  linkTo = '/',
}: DuctapeBrandProps) {
  const content = (
    <div className={cn('flex items-center gap-2 sm:gap-3', className)}>
      <DuctapeLogo />
      <div className="text-lg sm:text-xl font-bold text-primary leading-none">Ductape</div>
      {showBeta && (
        <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">
          Beta
        </span>
      )}
      {showWorkbenchLabel && (
        <span className="hidden sm:inline text-sm text-grey-600 font-medium whitespace-nowrap">
          Workbench
        </span>
      )}
    </div>
  );

  if (linkTo) {
    return (
      <Link to={linkTo} className="hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
