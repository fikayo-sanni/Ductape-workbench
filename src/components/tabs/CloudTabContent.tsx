import { Tab } from '@/types/tab';
import { Cloud } from 'lucide-react';
import CloudConnectionsSettings from '@/components/cloud/CloudConnectionsSettings';
import { connectionNeedsSetup } from '@/components/cloud/cloudConnection.constants';

interface CloudTabContentProps {
  tab: Tab;
}

function pickCloudConnectionData(
  tabData: Record<string, unknown>,
  itemId?: string,
): CloudConnectionsSettingsTabData | undefined {
  const id = String(tabData.id || itemId || '');
  if (!id) return undefined;

  return {
    id,
    display_name: tabData.display_name as string | undefined,
    tag: tabData.tag as string | undefined,
    description: tabData.description as string | undefined,
    provider: tabData.provider as CloudConnectionsSettingsTabData['provider'],
    status: tabData.status as string | undefined,
    scopes: Array.isArray(tabData.scopes) ? (tabData.scopes as string[]) : undefined,
    account_identifier: tabData.account_identifier as string | undefined,
    metadata: tabData.metadata as Record<string, unknown> | undefined,
    setupPayload: tabData.setupPayload as Record<string, unknown> | undefined,
    isSetup: Boolean(tabData.isSetup),
  };
}

export default function CloudTabContent({ tab }: CloudTabContentProps) {
  const tabData = (tab.data || {}) as Record<string, unknown>;
  const isLegacyNew = Boolean(tabData.isNew);
  const connection = isLegacyNew
    ? undefined
    : pickCloudConnectionData(tabData, tab.itemId);
  const status = connection?.status as string | undefined;
  const mode = connectionNeedsSetup(status) ? 'setup' : 'detail';

  if (isLegacyNew) {
    return (
      <div className="h-full overflow-auto bg-grey-100 p-6">
        <div className="max-w-lg mx-auto bg-white rounded-lg border border-grey-400 p-8 shadow-sm text-center">
          <Cloud className="h-10 w-10 text-primary mx-auto mb-4" />
          <h1 className="text-lg font-semibold text-grey">New cloud connection</h1>
          <p className="text-sm text-grey-600 mt-2">
            Click <strong>Add</strong> in the Cloud sidebar to choose a provider and start setup.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-grey-100">
      <CloudConnectionsSettings
        mode={mode}
        connection={connection}
        connectionId={tab.itemId}
        tabId={tab.id}
        initialSetup={tabData.setupPayload as Record<string, unknown> | undefined}
      />
    </div>
  );
}

type CloudConnectionsSettingsTabData = {
  id: string;
  display_name?: string;
  tag?: string;
  description?: string;
  provider?: 'aws' | 'gcp' | 'azure';
  status?: string;
  scopes?: string[];
  account_identifier?: string;
  metadata?: Record<string, unknown>;
  setupPayload?: Record<string, unknown>;
  isSetup?: boolean;
};
