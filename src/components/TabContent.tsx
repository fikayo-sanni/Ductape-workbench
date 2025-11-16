import { useWorkbenchStore } from '@/stores/workbench-store';
import { Tab } from '@/types/tab';
import RequestPanel from './RequestPanel';
import ResponsePanel from './ResponsePanel';
import ProductTabContent from './tabs/ProductTabContent';
import AppTabContent from './tabs/AppTabContent';
import Logs from './Logs';
import Dashboard from './Dashboard';
import TokensTabContent from './tabs/TokensTabContent';
import TeamsTabContent from './tabs/TeamsTabContent';
import PartnershipTabContent from './tabs/PartnershipTabContent';
import PartnershipDetailTabContent from './tabs/PartnershipDetailTabContent';
import BriefTabContent from './tabs/BriefTabContent';
import MarketplaceTabContent from './tabs/MarketplaceTabContent';
import ActionViewTabContent from './tabs/ActionViewTabContent';
import AuthTabContent from './tabs/AuthTabContent';
import NewAuthTabContent from './tabs/NewAuthTabContent';
import EnvironmentTabContent from './tabs/EnvironmentTabContent';
import StorageTabContent from './tabs/StorageTabContent';
import DatabaseTabContent from './tabs/DatabaseTabContent';
import CacheTabContent from './tabs/CacheTabContent';
import WebhookTabContent from './tabs/WebhookTabContent';
import NewWebhookTabContent from './tabs/NewWebhookTabContent';
import HealthcheckTabContent from './tabs/HealthcheckTabContent';
import NewHealthcheckTabContent from './tabs/NewHealthcheckTabContent';
import NewSessionTabContent from './tabs/NewSessionTabContent';
import SessionTabContent from './tabs/SessionTabContent';
import SettingsTabContent from './tabs/SettingsTabContent';
import NotificationTabContent from './tabs/NotificationTabContent';
import NewNotificationTabContent from './tabs/NewNotificationTabContent';
import NewMessageTabContent from './tabs/NewMessageTabContent';
import MessageTabContent from './tabs/MessageTabContent';
import RequestBuilder from './tabs/RequestBuilder';
import NewProductTabContent from './tabs/NewProductTabContent';
import NewAppTabContent from './tabs/NewAppTabContent';
import NewFeatureTabContent from './tabs/NewFeatureTabContent';
import NewQuotaTabContent from './tabs/NewQuotaTabContent';
import NewFallbackTabContent from './tabs/NewFallbackTabContent';
import NewDatabaseTabContent from './tabs/NewDatabaseTabContent';
import NewStorageTabContent from './tabs/NewStorageTabContent';
import NewCacheTabContent from './tabs/NewCacheTabContent';
import NewMessageBrokerTabContent from './tabs/NewMessageBrokerTabContent';
import StorageComponentContent from './tabs/StorageComponentContent';
import CacheComponentContent from './tabs/CacheComponentContent';
import DatabaseComponentContent from './tabs/DatabaseComponentContent';
import JobTabContent from './tabs/JobTabContent';
import NewJobTabContent from './tabs/NewJobTabContent';
import GenericComponentContent from './tabs/GenericComponentContent';

function FeatureTabContent({ tab }: { tab: Tab }) {
    // Check if this is a component from product (not app)
    if (tab.data?.componentType) {
      const componentType = tab.data.componentType;

      // App-level components (from app versions)
      if (['auth', 'environment', 'webhook', 'healthcheck'].includes(componentType)) {
        switch (componentType) {
          case 'auth':
            // Check if this is a new auth creation tab
            if (tab.data?.isNew) {
              return <NewAuthTabContent tabId={tab.id} data={tab.data} />;
            }
            return <AuthTabContent auth={tab.data} />;
          case 'environment':
            return <EnvironmentTabContent environment={tab.data} />;
          case 'webhook':
            // Check if this is a new webhook creation tab
            if (tab.isDirty && tab.data?.isNew) {
              return <NewWebhookTabContent tabId={tab.id} data={tab.data} />;
            }
            return <WebhookTabContent webhook={tab.data} />;
          case 'healthcheck':
            // Check if this is a new healthcheck creation tab
            if (tab.isDirty && tab.data?.isNew) {
              return <NewHealthcheckTabContent data={tab.data} />;
            }
            return <HealthcheckTabContent data={tab.data} />;
        }
      }

    // Product-level components with dedicated displays
    switch (componentType) {
      case 'storage':
        return <StorageComponentContent storage={tab.data} />;
      case 'cache':
        return <CacheComponentContent cache={tab.data} />;
      case 'database':
        return <DatabaseComponentContent database={tab.data} />;
      case 'session':
        return <SessionTabContent session={tab.data} />;
      case 'fallback':
      case 'quota':
      case 'message-broker':
        return <GenericComponentContent component={tab.data} type={componentType} />;
      case 'job':
        return <JobTabContent job={tab.data} />;
      case 'healthcheck':
        // Check if this is a new healthcheck creation tab
        if (tab.isDirty && tab.data?.isNew) {
          return <NewHealthcheckTabContent data={tab.data} />;
        }
        return <HealthcheckTabContent data={tab.data} />;
      case 'notification':
        // Check if this is a new notification creation tab
        if (tab.isDirty && tab.data?.isNew) {
          return <NewNotificationTabContent tabId={tab.id} data={tab.data} />;
        }
        return <NotificationTabContent data={tab.data} />;
    }
  }

  // Check tab type directly (for app components from ductape-sdk)
  switch (tab.type) {
    case 'storage':
      return <StorageTabContent storage={tab.data} />;
    case 'database':
      return <DatabaseTabContent database={tab.data} />;
    case 'cache':
      return <CacheTabContent cache={tab.data} />;
  }

  // Fallback for unimplemented types
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-grey mb-2">{tab.title}</h2>
      <p className="text-grey-600">
        {tab.type.charAt(0).toUpperCase() + tab.type.slice(1)} configuration will appear here.
      </p>
    </div>
  );
}

export default function TabContent() {
  const { tabs, activeTabId } = useWorkbenchStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (!activeTab) {
    return (
      <div className="flex-1 flex items-center justify-center bg-grey-100 p-6">
        <div className="text-center text-grey-600 max-w-md">
          <p className="text-lg mb-2">No tab selected</p>
          <p className="text-sm">Open an item from the sidebar or create a new one</p>
        </div>
      </div>
    );
  }

  // Render different content based on tab type
  const renderTabContent = () => {
    switch (activeTab.type) {
      case 'request':
        // Check if this is a new request creation tab (with or without full data after refresh)
        if (activeTab.isDirty && !activeTab.itemId) {
          return <RequestBuilder tabId={activeTab.id} data={activeTab.data} />;
        }

        // Check if this is an action request (from app actions)
        if (activeTab.data?.componentType === 'action') {
          return <ActionViewTabContent action={activeTab.data} />;
        }

        // Regular request (manual API testing)
        return (
          <div className="flex-1 flex flex-col lg:flex-row min-h-0">
            {/* Request Panel */}
            <div className="flex-1 border-r border-grey-400 bg-white overflow-auto">
              <RequestPanel />
            </div>

            {/* Response Panel */}
            <div className="flex-1 bg-white-700 overflow-auto">
              <ResponsePanel />
            </div>
          </div>
        );

      case 'app':
        // Check if this is a new app creation tab
        if (activeTab.isDirty && !activeTab.itemId && !activeTab.data?._id) {
          return <NewAppTabContent tabId={activeTab.id} data={activeTab.data} />;
        }
        return <AppTabContent app={activeTab.data} appId={activeTab.itemId} />;

      case 'product':
        // Check if this is a new product creation tab
        if (activeTab.isDirty && !activeTab.itemId && !activeTab.data?._id) {
          return <NewProductTabContent tabId={activeTab.id} data={activeTab.data} />;
        }
        return <ProductTabContent product={activeTab.data} productId={activeTab.itemId} />;

      case 'auth':
        // Check if this is a new auth creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewAuthTabContent tabId={activeTab.id} data={activeTab.data} />;
        }
        // This would handle viewing an auth, but for now just show the new auth content
        return <NewAuthTabContent tabId={activeTab.id} data={activeTab.data} />;

      case 'logs':
        return <Logs />;

      case 'dashboard':
        return <Dashboard />;

      case 'tokens':
        return <TokensTabContent />;

      case 'teams':
        return <TeamsTabContent />;

      case 'partnership':
        // Check if this is a specific partnership detail view (has data) or the management view (no data)
        if (activeTab.data && activeTab.itemId) {
          return <PartnershipDetailTabContent tab={activeTab as typeof activeTab & { data: NonNullable<typeof activeTab.data> }} />;
        }
        return <PartnershipTabContent tabId={activeTab.id} />;

      case 'brief':
        // Product brief view/edit/create
        return <BriefTabContent tab={activeTab as typeof activeTab & { data: NonNullable<typeof activeTab.data> }} />;

      case 'storage':
        // Check if this is a new storage creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewStorageTabContent tabId={activeTab.id} data={activeTab.data} />;
        }
        return <StorageTabContent storage={activeTab.data} />;

      case 'cache':
        // Check if this is a new cache creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewCacheTabContent tabId={activeTab.id} data={activeTab.data} />;
        }
        return <CacheTabContent cache={activeTab.data} />;

      case 'database':
        // Check if this is a new database creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewDatabaseTabContent tabId={activeTab.id} data={activeTab.data} />;
        }
        return <DatabaseTabContent database={activeTab.data} />;

      case 'message-broker':
        // Check if this is a new message broker creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewMessageBrokerTabContent tabId={activeTab.id} data={activeTab.data} />;
        }
        return <FeatureTabContent tab={activeTab} />;

      case 'webhook':
        // Check if this is a new webhook creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewWebhookTabContent tabId={activeTab.id} data={activeTab.data} />;
        }
        return <WebhookTabContent webhook={activeTab.data} />;

      case 'healthcheck':
        // Check if this is a new healthcheck creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewHealthcheckTabContent data={activeTab.data} />;
        }
        return <HealthcheckTabContent data={activeTab.data} />;

      case 'notification':
      case 'notifier':
        // Check if this is a new notification creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewNotificationTabContent tabId={activeTab.id} data={activeTab.data} />;
        }
        return <NotificationTabContent data={activeTab.data} />;

      case 'message':
        // View message details
        return <MessageTabContent data={activeTab.data} />;

      case 'new-message':
        // Create new message
        return <NewMessageTabContent tabId={activeTab.id} data={activeTab.data} />;

      case 'feature':
        // Check if this is a new feature creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewFeatureTabContent tabId={activeTab.id} type={activeTab.type} data={activeTab.data} />;
        }
        return <FeatureTabContent tab={activeTab} />;

      case 'quota':
        // Check if this is a new quota creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewQuotaTabContent tabId={activeTab.id} data={activeTab.data} />;
        }
        return <FeatureTabContent tab={activeTab} />;

      case 'fallback':
        // Check if this is a new fallback creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewFallbackTabContent tabId={activeTab.id} data={activeTab.data} />;
        }
        return <FeatureTabContent tab={activeTab} />;

      case 'job':
        // Check if this is a new job creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewJobTabContent tabId={activeTab.id} data={activeTab.data} />;
        }
        return <JobTabContent job={activeTab.data} />;

      case 'session':
        // Check if this is a new session creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewSessionTabContent tabId={activeTab.id} data={activeTab.data} />;
        }
        return <SessionTabContent session={activeTab.data} />;

      case 'marketplace':
        return <MarketplaceTabContent />;

      case 'settings':
        return <SettingsTabContent />;

      default:
        return (
          <div className="p-6">
            <p className="text-grey-600">Unknown tab type: {activeTab.type}</p>
          </div>
        );
    }
  };

  return <div className="flex-1 flex flex-col min-h-0 overflow-hidden">{renderTabContent()}</div>;
}
