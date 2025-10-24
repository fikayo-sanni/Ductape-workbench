import { useState } from 'react';
import { Input } from './ui/input';
import { Search, FileText, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Log {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  source: string;
}

// Empty logs array - will be populated from API
const logs: Log[] = [];

export default function LogsSidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    return (
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.source.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const getLevelIcon = (level: Log['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow" />;
      case 'info':
      default:
        return <FileText className="h-4 w-4 text-primary" />;
    }
  };

  const getLevelColor = (level: Log['level']) => {
    switch (level) {
      case 'success':
        return 'bg-green/10 text-green';
      case 'error':
        return 'bg-red/10 text-red';
      case 'warning':
        return 'bg-yellow/10 text-yellow';
      case 'info':
      default:
        return 'bg-blue-400/50 text-primary';
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-full flex flex-col bg-white border-r border-grey-400">
      {/* Header */}
      <div className="p-4 border-b border-grey-400">
        <h2 className="text-lg font-semibold text-grey mb-2">Logs</h2>
        <p className="text-xs text-grey-600">
          View workspace activity and logs
        </p>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-grey-400">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
          <Input
            placeholder="Search logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Logs List */}
      <div className="flex-1 overflow-auto p-4">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-grey-600 text-sm">
            {searchQuery ? 'No matching logs' : 'No logs yet'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map((log: Log) => (
              <div
                key={log.id}
                className={cn(
                  'p-3 rounded-lg border border-grey-400 cursor-pointer hover:border-primary transition-colors',
                  selectedLogId === log.id && 'border-primary bg-blue-400'
                )}
                onClick={() => setSelectedLogId(log.id)}
              >
                {/* Log Header */}
                <div className="flex items-start gap-2 mb-2">
                  {getLevelIcon(log.level)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          getLevelColor(log.level)
                        )}
                      >
                        {log.level.toUpperCase()}
                      </span>
                      <span className="text-xs text-grey-600">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-grey font-medium line-clamp-2">
                      {log.message}
                    </p>
                  </div>
                </div>

                {/* Source */}
                <div className="flex items-center gap-1 text-xs text-grey-600">
                  <span>Source:</span>
                  <span className="font-medium">{log.source}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
