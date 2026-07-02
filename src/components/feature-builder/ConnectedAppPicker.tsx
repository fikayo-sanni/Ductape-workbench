/* eslint-disable @typescript-eslint/no-explicit-any */
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ConnectedAppPickerProps {
  apps: any[];
  value?: string;
  onChange: (app: any | null) => void;
  label?: string;
  className?: string;
}

export function ConnectedAppPicker({
  apps,
  value,
  onChange,
  label = 'Select App',
  className,
}: ConnectedAppPickerProps) {
  return (
    <div className={className}>
      <Label>{label}</Label>
      <Select
        value={value || ''}
        onValueChange={(id) => {
          const app = apps.find((a) => a._id === id || a.app_id === id);
          onChange(app || null);
        }}
      >
        <SelectTrigger className="mt-2">
          <SelectValue placeholder="Choose an app..." />
        </SelectTrigger>
        <SelectContent>
          {apps.map((app) => (
            <SelectItem key={app._id || app.app_id} value={app._id || app.app_id}>
              {app.app_name || app.name || app.tag}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
