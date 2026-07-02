import { Database, Zap, Bell, Box, Share2, Layers, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ResilienceComponentCategory } from './types';
import { RESILIENCE_CATEGORIES } from './componentIoRegistry';

const CATEGORY_ICONS: Record<ResilienceComponentCategory, typeof Zap> = {
  action: Zap,
  database: Database,
  notification: Bell,
  storage: Box,
  graph: Share2,
  vector: Layers,
  produce: Send,
};

interface ComponentTypePickerProps {
  available: ResilienceComponentCategory[];
  selected?: ResilienceComponentCategory | '';
  onSelect: (category: ResilienceComponentCategory) => void;
}

export function ComponentTypePicker({
  available,
  selected,
  onSelect,
}: ComponentTypePickerProps) {
  const categories = RESILIENCE_CATEGORIES.filter((c) => available.includes(c));

  if (!categories.length) {
    return <p className="text-sm text-grey-600">No component types available for this product.</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {categories.map((category) => {
        const Icon = CATEGORY_ICONS[category];
        return (
          <Button
            key={category}
            type="button"
            variant={selected === category ? 'default' : 'outline'}
            onClick={() => onSelect(category)}
            className="flex flex-col h-auto py-3 gap-1"
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs capitalize">{category}</span>
          </Button>
        );
      })}
    </div>
  );
}
