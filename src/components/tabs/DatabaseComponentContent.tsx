import { Database, Copy, Eye, EyeOff, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface DatabaseComponentContentProps {
  database: any;
}

export default function DatabaseComponentContent({ database }: DatabaseComponentContentProps) {
  const [showSecrets, setShowSecrets] = useState(false);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getDBTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      postgresql: 'bg-blue-500/10 text-blue-500',
      mysql: 'bg-orange-500/10 text-orange-500',
      mongodb: 'bg-green/10 text-green',
      redis: 'bg-red/10 text-red',
    };
    return colors[type] || 'bg-grey-400 text-grey-600';
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-green/10 flex items-center justify-center">
                <Database className="h-6 w-6 text-green" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-grey">{database.name}</h1>
                <p className="text-sm text-grey-600">{database.tag}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button variant="outline" size="sm" className="gap-2 text-red hover:text-red">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>

          {database.description && (
            <p className="text-grey-600 mt-4">{database.description}</p>
          )}
        </div>

        {/* Database Configuration */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-grey mb-4">Database Configuration</h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-grey-600">Database Type</label>
              <div className="mt-1">
                <span className={cn('inline-flex px-3 py-1 rounded-full text-sm font-medium uppercase', getDBTypeColor(database.type))}>
                  {database.type}
                </span>
              </div>
            </div>

            {database.host && (
              <div>
                <label className="text-sm font-medium text-grey-600">Host</label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-grey-100 rounded-lg border border-grey-400 font-mono text-sm">
                    {database.host}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(database.host, 'Host')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {database.port && (
              <div>
                <label className="text-sm font-medium text-grey-600">Port</label>
                <div className="mt-1">
                  <code className="inline-block px-3 py-2 bg-grey-100 rounded-lg border border-grey-400 font-mono text-sm">
                    {database.port}
                  </code>
                </div>
              </div>
            )}

            {database.database && (
              <div>
                <label className="text-sm font-medium text-grey-600">Database Name</label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-grey-100 rounded-lg border border-grey-400 font-mono text-sm">
                    {database.database}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(database.database, 'Database name')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Connection Details */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-grey">Connection Details</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSecrets(!showSecrets)}
              className="gap-2"
            >
              {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showSecrets ? 'Hide' : 'Show'}
            </Button>
          </div>

          <div className="space-y-4">
            {database.connection_url && (
              <div>
                <label className="text-sm font-medium text-grey-600">Connection URL</label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-grey-100 rounded-lg border border-grey-400 font-mono text-sm break-all">
                    {showSecrets ? database.connection_url : '•'.repeat(60)}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(database.connection_url, 'Connection URL')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {database.username && (
              <div>
                <label className="text-sm font-medium text-grey-600">Username</label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-grey-100 rounded-lg border border-grey-400 font-mono text-sm">
                    {database.username}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(database.username, 'Username')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {database.password && (
              <div>
                <label className="text-sm font-medium text-grey-600">Password</label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 px-3 py-2 bg-grey-100 rounded-lg border border-grey-400 font-mono text-sm">
                    {showSecrets ? database.password : '•'.repeat(20)}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(database.password, 'Password')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 p-3 bg-yellow/5 border border-yellow/20 rounded-lg">
            <p className="text-sm text-grey-600">
              <strong>Security Note:</strong> Database credentials should be stored securely using environment variables or secret management systems.
            </p>
          </div>
        </div>

        {/* Database Actions */}
        {database.actions && database.actions.length > 0 && (
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-grey mb-4">Database Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {database.actions.map((action: any, index: number) => (
                <div key={index} className="p-3 border border-grey-400 rounded-lg hover:border-primary transition-colors">
                  <p className="text-sm font-medium text-grey">{action.name}</p>
                  <p className="text-xs text-grey-600 mt-1">{action.query_type || 'Query'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage Information */}
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-grey mb-2">Database Connection Active</h3>
          <p className="text-sm text-grey-600">
            This database is configured and ready for use. Ensure proper connection pooling and security measures in production.
          </p>
        </div>
      </div>
    </div>
  );
}
