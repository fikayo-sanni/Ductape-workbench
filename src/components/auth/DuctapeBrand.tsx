import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface DuctapeBrandProps {
  showWorkbenchLabel?: boolean;
  showBeta?: boolean;
  className?: string;
  linkTo?: string;
}

export function DuctapeLogo({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  const logoSrc = `${import.meta.env.BASE_URL}favicon.svg`;

  return (
    <img
      src={logoSrc}
      alt=""
      width={size}
      height={size}
      className={cn('flex-shrink-0 object-contain', className)}
      aria-hidden
    />
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
