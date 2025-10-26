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
import MarketplaceTabContent from './tabs/MarketplaceTabContent';
import ActionViewTabContent from './tabs/ActionViewTabContent';
import AuthTabContent from './tabs/AuthTabContent';
import NewAuthTabContent from './tabs/NewAuthTabContent';
import EnvironmentTabContent from './tabs/EnvironmentTabContent';
import StorageTabContent from './tabs/StorageTabContent';
import DatabaseTabContent from './tabs/DatabaseTabContent';
import CacheTabContent from './tabs/CacheTabContent';
import NewRequestTabContent from './tabs/NewRequestTabContent';
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
import GenericComponentContent from './tabs/GenericComponentContent';

function FeatureTabContent({ tab }: { tab: Tab }) {
  // Check if this is a component from product (not app)
  if (tab.data?.componentType) {
    const componentType = tab.data.componentType;

    // App-level components (from app versions)
    if (['auth', 'environment'].includes(componentType)) {
      switch (componentType) {
        case 'auth':
          // Check if this is a new auth creation tab
          if (tab.data?.isNew) {
            return <NewAuthTabContent tabId={tab.id} data={tab.data} />;
          }
          return <AuthTabContent auth={tab.data} />;
        case 'environment':
          return <EnvironmentTabContent environment={tab.data} />;
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
      case 'healthcheck':
      case 'notification':
      case 'fallback':
      case 'quota':
      case 'job':
      case 'message-broker':
        return <GenericComponentContent component={tab.data} type={componentType} />;
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
        // Check if this is a new request creation tab with app context
        if (activeTab.data?.isNew && activeTab.data?.appId) {
          return <RequestBuilder tabId={activeTab.id} data={activeTab.data} />;
        }

        // Legacy: Check if this is a new request creation tab
        if (activeTab.isDirty && !activeTab.itemId) {
          return <NewRequestTabContent tabId={activeTab.id} data={activeTab.data} />;
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
        return <AppTabContent app={activeTab.data} />;

      case 'product':
        // Check if this is a new product creation tab
        if (activeTab.isDirty && !activeTab.itemId && !activeTab.data?._id) {
          return <NewProductTabContent tabId={activeTab.id} data={activeTab.data} />;
        }
        return <ProductTabContent product={activeTab.data} />;

      case 'logs':
        return <Logs />;

      case 'dashboard':
        return <Dashboard />;

      case 'tokens':
        return <TokensTabContent />;

      case 'teams':
        return <TeamsTabContent />;

      case 'storage':
        // Check if this is a new storage creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewStorageTabContent tabId={activeTab.id} data={activeTab.data} />;
        }
        return <FeatureTabContent tab={activeTab} />;

      case 'cache':
        // Check if this is a new cache creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewCacheTabContent tabId={activeTab.id} data={activeTab.data} />;
        }
        return <FeatureTabContent tab={activeTab} />;

      case 'database':
        // Check if this is a new database creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewDatabaseTabContent tabId={activeTab.id} data={activeTab.data} />;
        }
        return <FeatureTabContent tab={activeTab} />;

      case 'message-broker':
        // Check if this is a new message broker creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewMessageBrokerTabContent tabId={activeTab.id} data={activeTab.data} />;
        }
        return <FeatureTabContent tab={activeTab} />;

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
        // Check if this is a new component creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewFeatureTabContent tabId={activeTab.id} type={activeTab.type} data={activeTab.data} />;
        }
        return <FeatureTabContent tab={activeTab} />;

      case 'session':
      case 'healthcheck':
      case 'notification':
        // Check if this is a new component creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewFeatureTabContent tabId={activeTab.id} type={activeTab.type} data={activeTab.data} />;
        }
        return <FeatureTabContent tab={activeTab} />;

      case 'marketplace':
        return <MarketplaceTabContent />;

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
