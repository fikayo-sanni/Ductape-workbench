import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DetailsSidebarProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}

export default function DetailsSidebar({
  title,
  subtitle,
  icon,
  onClose,
  children,
  width = 'w-[450px]',
}: DetailsSidebarProps) {
  return (
    <div className={`fixed top-0 right-0 h-full ${width} bg-white shadow-2xl border-l border-grey-400 z-50 overflow-y-auto`}>
      <div className="sticky top-0 bg-white border-b border-grey-300 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <h3 className="text-lg font-semibold text-grey">{title}</h3>
            {subtitle && (
              <p className="text-xs text-grey-600">{subtitle}</p>
            )}
          </div>
        </div>
        <Button onClick={onClose} variant="ghost" size="sm">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
