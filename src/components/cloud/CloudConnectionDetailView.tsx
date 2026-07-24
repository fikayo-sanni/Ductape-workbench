import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Database,
  HardDrive,
  Loader2,
  MessageSquare,
  Server,
  Share2,
  Shield,
  Boxes,
  Bell,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import CloudConnectionResourcesPanel from '@/components/cloud/CloudConnectionResourcesPanel';
import CloudConnectionTagBadge from '@/components/cloud/CloudConnectionTagBadge';
import CloudCopySnippet from '@/components/cloud/CloudCopySnippet';
import CloudProviderIcon from '@/components/cloud/CloudProviderIcon';
import {
  SCOPE_LABELS,
  connectionStatusMeta,
  isCloudConnectionActive,
  type CloudProvider,
} from '@/components/cloud/cloudConnection.constants';
import {
  CLOUD_PROVIDER_GUIDES,
  providerBadgeClass,
} from '@/components/cloud/cloudSetupGuide';
import type { SDKProxyService } from '@/services/sdkProxy';

const SCOPE_ICONS: Record<string, typeof HardDrive> = {
  storage: HardDrive,
  broker: MessageSquare,
  database: Database,
  graph: Share2,
  vector: Boxes,
  notifications: Bell,
};

export interface CloudConnectionDetailViewProps {
  connection: {
    id?: string;
    display_name?: string;
    tag?: string;
    description?: string;
    provider?: CloudProvider;
    status?: string;
    scopes?: string[];
    account_identifier?: string;
  };
  sdkProxy: SDKProxyService;
  loadingConnection: boolean;
  hasFetchedConnection: boolean;
  onValidate: () => void;
  validating: boolean;
  onDelete: () => void;
  deleting: boolean;
  showSetupTab: boolean;
  setupContent?: ReactNode;
  securityGroupsContent?: ReactNode;
  settingsContent?: ReactNode;
}

function MetaItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-grey-300/80 bg-grey-100/40 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-grey-600">{label}</p>
      <div className="mt-1.5 text-sm text-grey">{children}</div>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const meta = connectionStatusMeta(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
        meta.className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', meta.dotClassName)} />
      {meta.label}
    </span>
  );
}

export default function CloudConnectionDetailView({
  connection,
  sdkProxy,
  loadingConnection,
  hasFetchedConnection,
  onValidate,
  validating,
  onDelete,
  deleting,
  showSetupTab,
  setupContent,
  securityGroupsContent,
  settingsContent,
}: CloudConnectionDetailViewProps) {
  const provider = (connection.provider || 'aws') as CloudProvider;
  const guide = CLOUD_PROVIDER_GUIDES[provider];
  const scopes = connection.scopes || [];
  const isActive = isCloudConnectionActive(connection.status);
  const showSecurityGroupsTab = Boolean(securityGroupsContent);
  const defaultTab = showSetupTab
    ? 'setup'
    : isActive && scopes.length > 0
      ? 'resources'
      : 'overview';
  const [activeTab, setActiveTab] = useState(defaultTab);
  const sdkSnippet = connection.tag ? `cloud: '${connection.tag}'` : '';

  useEffect(() => {
    if (showSetupTab) {
      setActiveTab('setup');
    }
  }, [showSetupTab, connection.id, connection.tag]);

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-grey-100">
      {showSetupTab && (
        <div className="flex items-center gap-2 px-6 py-2.5 bg-amber-500/8 border-b border-amber-500/20 text-sm text-amber-900">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            Finish setup in the <strong>Setup</strong> tab to activate this connection.
          </span>
        </div>
      )}

      <div className="bg-white border-b border-grey-400 px-6 py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4 min-w-0">
            <CloudProviderIcon provider={provider} size="lg" showActiveRing={isActive} />
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-grey truncate tracking-tight">
                {connection.display_name || 'Cloud connection'}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium border',
                    providerBadgeClass(provider),
                  )}
                >
                  {guide.shortLabel}
                </span>
                <StatusBadge status={connection.status} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isActive && (
              <Button
                variant="outline"
                size="sm"
                onClick={onValidate}
                disabled={validating}
                className="gap-1.5"
              >
                {validating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Re-validate
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              disabled={deleting}
              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            >
              Remove
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
          <MetaItem label="Connection tag">
            {connection.tag ? (
              <CloudConnectionTagBadge tag={connection.tag} />
            ) : (
              <span className="text-grey-600">—</span>
            )}
          </MetaItem>
          <MetaItem label="Cloud account">
            {connection.account_identifier ? (
              <span className="font-mono text-sm block truncate">{connection.account_identifier}</span>
            ) : (
              <span className="text-grey-600 text-sm">Not linked yet</span>
            )}
          </MetaItem>
          <MetaItem label="In your code">
            {sdkSnippet ? (
              <CloudCopySnippet value={sdkSnippet} label="SDK reference" />
            ) : (
              <span className="text-grey-600">—</span>
            )}
          </MetaItem>
        </div>

        {connection.description ? (
          <p className="text-sm text-grey-600 mt-4 leading-relaxed border-t border-grey-300 pt-4">
            {connection.description}
          </p>
        ) : null}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="sticky top-0 z-20 bg-white border-b border-grey-400 px-6 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
          <TabsList className="h-11 bg-transparent p-0 gap-8 rounded-none w-full justify-start">
            <TabsTrigger
              value="overview"
              className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-3 text-grey-600 data-[state=active]:border-primary data-[state=active]:text-grey data-[state=active]:shadow-none data-[state=active]:bg-transparent"
            >
              Overview
            </TabsTrigger>
            {isActive && scopes.length > 0 && (
              <TabsTrigger
                value="resources"
                className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-3 text-grey-600 data-[state=active]:border-primary data-[state=active]:text-grey data-[state=active]:shadow-none data-[state=active]:bg-transparent gap-1.5"
              >
                <Server className="h-3.5 w-3.5" />
                Resources
              </TabsTrigger>
            )}
            {showSecurityGroupsTab && (
              <TabsTrigger
                value="security-groups"
                className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-3 text-grey-600 data-[state=active]:border-primary data-[state=active]:text-grey data-[state=active]:shadow-none data-[state=active]:bg-transparent gap-1.5"
              >
                <Shield className="h-3.5 w-3.5" />
                Private access
              </TabsTrigger>
            )}
            {showSetupTab && (
              <TabsTrigger
                value="setup"
                className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-3 text-grey-600 data-[state=active]:border-primary data-[state=active]:text-grey data-[state=active]:shadow-none data-[state=active]:bg-transparent gap-2"
              >
                Setup
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              </TabsTrigger>
            )}
            {settingsContent && (
              <TabsTrigger
                value="settings"
                className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-3 text-grey-600 data-[state=active]:border-primary data-[state=active]:text-grey data-[state=active]:shadow-none data-[state=active]:bg-transparent"
              >
                Settings
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <div className="p-6 max-w-4xl mx-auto w-full pb-10">
          <TabsContent value="overview" className="mt-0 space-y-4">
                {connection.tag && isActive && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex gap-3">
                    <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-grey">Link in products</p>
                      <p className="text-xs text-grey-600 mt-1 leading-relaxed">
                        Pass{' '}
                        <code className="font-mono text-primary text-[11px]">{sdkSnippet}</code> when
                        creating storage, databases, or message brokers — Ductape resolves credentials
                        at runtime.
                      </p>
                    </div>
                  </div>
                )}

                <section className="bg-white rounded-lg border border-grey-400 shadow-sm p-5">
                  <h2 className="text-sm font-semibold text-grey flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Permissions
                  </h2>
                  <p className="text-xs text-grey-600 mt-1 mb-4">
                    What this connection can access in your cloud account.
                  </p>
                  {loadingConnection && !hasFetchedConnection ? (
                    <div className="flex items-center gap-2 text-sm text-grey-600 py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Loading connection details…
                    </div>
                  ) : scopes.length === 0 ? (
                    <p className="text-sm text-grey-600 py-2">No permissions recorded.</p>
                  ) : (
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {scopes.map((scope) => {
                        const info = SCOPE_LABELS[scope] || { label: scope, description: '' };
                        const Icon = SCOPE_ICONS[scope] || Shield;
                        return (
                          <li
                            key={scope}
                            className="flex items-start gap-3 rounded-lg border border-grey-300 bg-grey-100/30 px-3 py-3 transition-colors hover:border-grey-400"
                          >
                            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-grey">{info.label}</p>
                              {info.description ? (
                                <p className="text-xs text-grey-600 mt-0.5 leading-snug">
                                  {info.description}
                                </p>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>

                {!isActive && (
                  <button
                    type="button"
                    onClick={() => showSetupTab && setActiveTab('setup')}
                    disabled={!showSetupTab}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 rounded-lg border border-grey-400 bg-white px-4 py-3 text-left shadow-sm transition-colors',
                      showSetupTab && 'hover:border-primary hover:bg-primary/5 cursor-pointer',
                      !showSetupTab && 'cursor-default',
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium text-grey">Connection not active yet</p>
                      <p className="text-xs text-grey-600 mt-0.5">
                        {showSetupTab
                          ? 'Open Setup to finish linking your cloud account.'
                          : 'Validate the connection to browse resources and use in products.'}
                      </p>
                    </div>
                    {showSetupTab && <ArrowRight className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                )}
          </TabsContent>

          {isActive && scopes.length > 0 && (
            <TabsContent value="resources" className="mt-0">
              <CloudConnectionResourcesPanel
                sdkProxy={sdkProxy}
                connection={connection}
                variant="panel"
              />
            </TabsContent>
          )}

          {showSecurityGroupsTab && (
            <TabsContent value="security-groups" className="mt-0 space-y-6">
              {securityGroupsContent}
            </TabsContent>
          )}

          {showSetupTab && (
            <TabsContent value="setup" className="mt-0 space-y-6">
              {setupContent}
            </TabsContent>
          )}

          {settingsContent && (
            <TabsContent value="settings" className="mt-0 space-y-6">
              {settingsContent}
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}
