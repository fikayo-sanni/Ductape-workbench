import { useRef, useState, type ReactNode } from 'react';
import { Camera, ImageOff, Loader2, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import workspaceServices from '@/services/workspaceServices';
import { LOGO_ACCEPT, validateLogoFile } from '@/utils/logoUpload';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LogoEditorProps {
  /** Current logo URL, if any. */
  logo?: string;
  /** Shown when there is no logo (initials or an icon). */
  fallback: ReactNode;
  /** What the logo is for, used in messages and labels: "product" or "app". */
  subject: string;
  /** Saves the new logo URL ('' removes it). Throw to report a failure. */
  onSave: (logo: string) => Promise<void>;
  /** Size and shape classes for the tile, for example "h-14 w-14 rounded-xl". */
  className?: string;
  /** Classes for the tile when there is no logo (background colour). */
  fallbackClassName?: string;
  disabled?: boolean;
}

/**
 * A logo tile that can be changed in place: hover (or tap) it to upload a new image or remove the current
 * one. The image goes to the workspace upload endpoint, then its public URL is saved by the caller.
 */
export default function LogoEditor({
  logo,
  fallback,
  subject,
  onSave,
  className,
  fallbackClassName,
  disabled,
}: LogoEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [broken, setBroken] = useState(false);

  const save = async (value: string, success: string) => {
    setBusy(true);
    try {
      await onSave(value);
      setBroken(false);
      toast.success(success);
    } catch (error: any) {
      toast.error(error?.response?.data?.errors || error?.message || `Could not update the ${subject} logo`);
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const problem = validateLogoFile(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setBusy(true);
    try {
      const { data } = await workspaceServices.createUploadUrl({
        file,
        fileType: file.type,
        visibility: 'public',
        id: `${subject}-logo-${Date.now()}`,
      });
      await workspaceServices.uploadFileToUrl({ url: data.url, file });
      // For public files the key returned is already the public URL.
      await onSave(data.key);
      setBroken(false);
      toast.success(`${subject[0].toUpperCase()}${subject.slice(1)} logo updated`);
    } catch (error: any) {
      toast.error(error?.response?.data?.errors || error?.message || 'The logo could not be uploaded');
    } finally {
      setBusy(false);
    }
  };

  const showImage = Boolean(logo) && !broken;

  return (
    <>
      <input ref={inputRef} type="file" accept={LOGO_ACCEPT} className="hidden" onChange={handleFile} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled || busy}>
          <button
            type="button"
            className={cn(
              'group relative flex flex-shrink-0 items-center justify-center overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              showImage ? '' : fallbackClassName,
              className,
            )}
            title={`Change ${subject} logo`}
            aria-label={`Change ${subject} logo`}
          >
            {showImage ? (
              <img src={logo} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />
            ) : (
              fallback
            )}
            <span
              className={cn(
                'absolute inset-0 flex items-center justify-center bg-black/50 text-white transition-opacity',
                busy ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100',
              )}
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            </span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[180px]">
          <DropdownMenuItem onSelect={() => inputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            {logo ? 'Upload a new logo' : 'Upload a logo'}
          </DropdownMenuItem>
          {logo ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void save('', 'Logo removed')}>
                <ImageOff className="mr-2 h-4 w-4" />
                Remove logo
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
