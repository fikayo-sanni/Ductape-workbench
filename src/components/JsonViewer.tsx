import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { Button } from './ui/button';

interface JsonViewerProps {
  data: any;
  defaultExpanded?: boolean;
  onCopy?: (text: string) => void;
}

interface JsonNodeProps {
  data: any;
  keyName?: string;
  level?: number;
  isLast?: boolean;
  defaultExpanded?: boolean;
}

function JsonNode({ data, keyName, level = 0, isLast = true, defaultExpanded = false }: JsonNodeProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || level < 2);

  const isObject = data !== null && typeof data === 'object' && !Array.isArray(data);
  const isArray = Array.isArray(data);
  const isExpandable = isObject || isArray;
  const isEmpty = isExpandable && Object.keys(data).length === 0;

  const renderValue = (value: any) => {
    if (value === null) return <span className="text-grey-500 dark:text-grey-400 italic">null</span>;
    if (value === undefined) return <span className="text-grey-500 dark:text-grey-400 italic">undefined</span>;
    if (typeof value === 'string') return <span className="text-emerald-700 dark:text-emerald-400">&quot;{value}&quot;</span>;
    if (typeof value === 'number') return <span className="text-blue-700 dark:text-blue-400">{value}</span>;
    if (typeof value === 'boolean') return <span className="text-amber-700 dark:text-amber-400">{String(value)}</span>;
    return <span className="text-grey dark:text-grey-300">{String(value)}</span>;
  };

  const getPreview = () => {
    if (isEmpty) return isArray ? '[]' : '{}';
    if (isArray) return `Array(${data.length})`;
    if (isObject) return `Object(${Object.keys(data).length})`;
    return '';
  };

  const indent = level * 16;

  if (!isExpandable) {
    return (
      <div className="flex items-start gap-2 py-0.5" style={{ paddingLeft: `${indent}px` }}>
        {keyName && (
          <>
            <span className="text-slate-700 dark:text-slate-300 font-medium">{keyName}</span>
            <span className="text-slate-500 dark:text-slate-400">:</span>
          </>
        )}
        {renderValue(data)}
        {!isLast && <span className="text-slate-400 dark:text-slate-500">,</span>}
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex items-start gap-1 py-0.5 hover:bg-slate-50 dark:hover:bg-grey-400/20 cursor-pointer group rounded px-1"
        style={{ paddingLeft: `${indent}px` }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <button className="flex items-center justify-center w-4 h-5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </button>
        {keyName && (
          <>
            <span className="text-slate-700 dark:text-slate-300 font-medium">{keyName}</span>
            <span className="text-slate-500 dark:text-slate-400">:</span>
          </>
        )}
        <span className="text-slate-500 dark:text-slate-400">{isArray ? '[' : '{'}</span>
        {!isExpanded && (
          <>
            <span className="text-slate-400 dark:text-slate-500 text-xs ml-1">{getPreview()}</span>
            <span className="text-slate-500 dark:text-slate-400">{isArray ? ']' : '}'}</span>
          </>
        )}
      </div>

      {isExpanded && (
        <>
          {isArray ? (
            data.map((item: any, index: number) => (
              <JsonNode
                key={index}
                data={item}
                level={level + 1}
                isLast={index === data.length - 1}
                defaultExpanded={defaultExpanded}
              />
            ))
          ) : (
            Object.entries(data).map(([key, value], index, array) => (
              <JsonNode
                key={key}
                keyName={key}
                data={value}
                level={level + 1}
                isLast={index === array.length - 1}
                defaultExpanded={defaultExpanded}
              />
            ))
          )}
          <div className="flex items-start py-0.5 text-slate-500 dark:text-slate-400" style={{ paddingLeft: `${indent}px` }}>
            {isArray ? ']' : '}'}
            {!isLast && <span className="text-slate-400 dark:text-slate-500">,</span>}
          </div>
        </>
      )}
    </div>
  );
}

export function JsonViewer({ data, defaultExpanded = false, onCopy }: JsonViewerProps) {
  const handleCopy = () => {
    const text = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(text);
    onCopy?.(text);
  };

  return (
    <div className="relative bg-white dark:bg-background-secondary rounded-lg border border-grey-400 overflow-hidden">
      <div className="sticky top-0 bg-slate-50 dark:bg-background border-b border-grey-400 px-4 py-2 flex items-center justify-between z-10">
        <span className="text-xs font-medium text-slate-600 dark:text-grey">JSON Data</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 gap-1"
        >
          <Copy className="h-3.5 w-3.5" />
          <span className="text-xs">Copy</span>
        </Button>
      </div>
      <div className="p-4 text-sm font-mono overflow-auto max-h-[600px] bg-slate-50/30 dark:bg-background-secondary/50 leading-relaxed">
        <JsonNode data={data} defaultExpanded={defaultExpanded} />
      </div>
    </div>
  );
}
