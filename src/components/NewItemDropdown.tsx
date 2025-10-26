import { useState } from 'react';
import { Button } from './ui/button';
import {
  Plus,
  FileText,
  Grid3x3,
  Package,
  HardDrive,
  Users,
  Zap,
  Database,
  MessageSquare,
  Bell,
  Shield,
  BarChart3,
  Activity,
  Heart,
  ListTree,
  Key
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewItemOption {
  id: string;
  label: string;
  icon: typeof FileText;
  description: string;
  category: 'common' | 'product' | 'app';
}

const newItemOptions: NewItemOption[] = [
  // Common
  {
    id: 'request',
    label: 'Request',
    icon: FileText,
    description: 'Create a new API request',
    category: 'common',
  },

    {
    id: 'feature',
    label: 'Feature',
    icon: Zap,
    description: 'Add a new workflow',
    category: 'common',
  },

  // App Items
  {
    id: 'app',
    label: 'App',
    icon: Grid3x3,
    description: 'Create a new application',
    category: 'app',
  },
  {
    id: 'auth',
    label: 'Auth',
    icon: Key,
    description: 'Create authentication for an app',
    category: 'app',
  },

  // Product Items
  {
    id: 'product',
    label: 'Product',
    icon: Package,
    description: 'Create a new product/integration',
    category: 'product',
  },
  {
    id: 'storage',
    label: 'Storage Bucket',
    icon: HardDrive,
    description: 'Add cloud storage to product',
    category: 'product',
  },
  {
    id: 'session',
    label: 'Session',
    icon: Users,
    description: 'Add session management',
    category: 'product',
  },
  {
    id: 'cache',
    label: 'Cache',
    icon: Activity,
    description: 'Add caching layer',
    category: 'product',
  },
  {
    id: 'healthcheck',
    label: 'Healthcheck',
    icon: Heart,
    description: 'Add health monitoring',
    category: 'product',
  },
  {
    id: 'database',
    label: 'Database',
    icon: Database,
    description: 'Add database connection',
    category: 'product',
  },
  {
    id: 'message-broker',
    label: 'Message Broker',
    icon: MessageSquare,
    description: 'Add message queue',
    category: 'product',
  },
  {
    id: 'notification',
    label: 'Notification',
    icon: Bell,
    description: 'Add notification service',
    category: 'product',
  },
  {
    id: 'fallback',
    label: 'Fallback',
    icon: Shield,
    description: 'Add fallback strategy',
    category: 'product',
  },
  {
    id: 'quota',
    label: 'Quota',
    icon: BarChart3,
    description: 'Add usage quota',
    category: 'product',
  },
  {
    id: 'job',
    label: 'Job',
    icon: ListTree,
    description: 'Add background job',
    category: 'product',
  },
];

interface NewItemDropdownProps {
  onSelect: (itemId: string) => void;
}

export default function NewItemDropdown({ onSelect }: NewItemDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (itemId: string) => {
    onSelect(itemId);
    setIsOpen(false);
  };

  const categories = [
    { id: 'common', label: 'Common' },
    { id: 'app', label: 'Application' },
    { id: 'product', label: 'Product Features' },
  ];

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="sm"
        className="h-auto px-2 md:px-4 py-1.5 md:py-2 bg-primary text-white hover:bg-primary/90 shadow-sm hover:shadow"
        data-intro="new-button"
      >
        <Plus className="h-4 w-4 md:mr-2" />
        <span className="hidden md:inline">New</span>
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 md:left-auto right-0 md:right-auto mt-2 w-[calc(100vw-24px)] md:w-80 bg-white rounded-lg shadow-xl border border-grey-400 z-50 max-h-[calc(100vh-120px)] md:max-h-[600px] overflow-auto">
            {categories.map((category) => {
              const categoryItems = newItemOptions.filter(
                (item) => item.category === category.id
              );

              if (categoryItems.length === 0) return null;

              return (
                <div key={category.id} className="border-b border-grey-400 last:border-b-0 shadow-sm">
                  <div className="px-4 py-2 bg-grey-100">
                    <h3 className="text-xs font-semibold text-grey-600 uppercase">
                      {category.label}
                    </h3>
                  </div>
                  <div className="p-2">
                    {categoryItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item.id)}
                          className={cn(
                            'w-full flex items-start gap-3 px-3 py-2.5 rounded-md hover:bg-grey-100 transition-colors text-left'
                          )}
                        >
                          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-grey">
                              {item.label}
                            </div>
                            <div className="text-xs text-grey-600 mt-0.5">
                              {item.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
