import { useState } from 'react';
import { Button } from './button';
import { Textarea } from './textarea';
import { Label } from './label';
import { Eye, EyeOff, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  minHeight?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Enter markdown text...',
  label,
  className,
  minHeight = 'min-h-[120px]',
}: MarkdownEditorProps) {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold text-grey">{label}</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="h-7 text-xs"
          >
            {showPreview ? (
              <>
                <EyeOff className="h-3 w-3 mr-1" />
                Edit
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </>
            )}
          </Button>
        </div>
      )}

      <div className="relative">
        {!showPreview ? (
          <>
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className={cn('font-mono text-sm', minHeight)}
            />
            <div className="absolute bottom-2 right-2 text-xs text-grey-500 flex items-center gap-1">
              <FileText className="h-3 w-3" />
              Markdown supported
            </div>
          </>
        ) : (
          <div className={cn(
            'border border-grey-400 rounded-md p-4 bg-white overflow-auto',
            minHeight
          )}>
            {value ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {value}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-grey-500 text-sm italic">{placeholder}</p>
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-grey-600">
        Use **bold**, *italic*, `code`, links, lists, and more markdown syntax
      </p>
    </div>
  );
}

export function MarkdownViewer({ content, className }: { content: string; className?: string }) {
  if (!content) return null;

  return (
    <div className={cn('prose prose-sm max-w-none', className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

