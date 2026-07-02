import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getCloudRegionOptions, type CloudRegionProvider } from '@/utils/cloudRegions';

interface CloudRegionSelectProps {
  provider: CloudRegionProvider;
  value: string;
  onChange: (value: string) => void;
  id?: string;
  className?: string;
  placeholder?: string;
  'aria-label'?: string;
}

/** Dropdown of common regions for a cloud provider (AWS/GCP/Azure) — replaces free-text region inputs. */
export default function CloudRegionSelect({
  provider,
  value,
  onChange,
  id,
  className,
  placeholder = 'Select region',
  'aria-label': ariaLabel,
}: CloudRegionSelectProps) {
  const options = getCloudRegionOptions(provider);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className={className} aria-label={ariaLabel}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
