import { useState } from 'react';
import { useAuth } from '@/store/useAuth';
import { Input } from './ui/input';
import { Search, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IEnvironment } from '@/types/environment';

export default function EnvironmentsSidebar() {
  const { user, currentWorkspaceId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);

  // Get current workspace environments from user
  const currentWorkspace = user?.workspaces?.find(w => w.workspace_id === currentWorkspaceId);
  const environments: IEnvironment[] = (currentWorkspace?.defaultEnvs || []).map((env, idx) => ({
    ...env,
    _id: env.slug || `env-${idx}`,
    description: '',
  }));

  const filteredEnvironments = environments.filter(env => {
    if (!searchQuery) return true;
    return (
      env.env_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      env.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });


  return (
    <div className="h-full flex flex-col bg-white border-r border-grey-400">
      {/* Header */}
      <div className="p-4 border-b border-grey-400">
        <h2 className="text-lg font-semibold text-grey mb-2">Environments</h2>
        <p className="text-xs text-grey-600">
          Manage your workspace environments
        </p>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-grey-400">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
          <Input
            placeholder="Search environments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Environments List */}
      <div className="flex-1 overflow-auto p-4">
        {filteredEnvironments.length === 0 ? (
          <div className="text-center py-8 text-grey-600 text-sm">
            {searchQuery ? 'No matching environments' : 'No environments yet'}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEnvironments.map((env: IEnvironment) => (
              <div
                key={env._id}
                className={cn(
                  'p-3 rounded-lg border border-grey-400 cursor-pointer hover:border-primary transition-colors',
                  selectedEnvId === env._id && 'border-primary bg-blue-400'
                )}
                onClick={() => setSelectedEnvId(env._id)}
              >
                {/* Environment Header */}
                <div className="flex items-start gap-3 mb-2">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-md bg-primary flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    <Settings2 className="h-5 w-5" />
                  </div>

                  {/* Environment Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-grey truncate">
                      {env.env_name}
                    </h3>
                    <p className="text-xs text-grey-600 truncate">{env.slug}</p>
                  </div>

                  {/* Active Badge */}
                  {env.active !== undefined && (
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium flex-shrink-0',
                        env.active
                          ? 'bg-green text-white'
                          : 'bg-grey-400 text-grey'
                      )}
                    >
                      {env.active ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </div>

                {/* Description */}
                {env.description && (
                  <p className="text-xs text-grey-600 mt-2 line-clamp-2">
                    {env.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
