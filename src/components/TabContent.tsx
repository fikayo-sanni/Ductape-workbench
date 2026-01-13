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
import StorageExplorerTab from './tabs/StorageExplorerTab';
import DatabaseTabContent from './tabs/DatabaseTabContent';
import DatabaseExplorerTab from './tabs/DatabaseExplorerTab';
import GraphTabContent from './tabs/GraphTabContent';
import GraphExplorerTab from './tabs/GraphExplorerTab';
import NewGraphTabContent from './tabs/NewGraphTabContent';
import VectorTabContent from './tabs/VectorTabContent';
import VectorExplorerTab from './tabs/VectorExplorerTab';
import WorkflowExplorerTab from './tabs/WorkflowExplorerTab';
import WorkflowRunTab from './tabs/WorkflowRunTab';
import AgentExplorerTab from './tabs/AgentExplorerTab';
import AgentRunTab from './tabs/AgentRunTab';
import CacheTabContent from './tabs/CacheTabContent';
import WebhookTabContent from './tabs/WebhookTabContent';
import NewWebhookTabContent from './tabs/NewWebhookTabContent';
import HealthcheckTabContent from './tabs/HealthcheckTabContent';
import NewHealthcheckTabContent from './tabs/NewHealthcheckTabContent';
import NewSessionTabContent from './tabs/NewSessionTabContent';
import SessionTabContent from './tabs/SessionTabContent';
import SessionActivityTab from './tabs/SessionActivityTab';
import SessionDashboard from './tabs/SessionDashboard';
import SessionUserTab from './tabs/SessionUserTab';
import SettingsTabContent from './tabs/SettingsTabContent';
import NotificationTabContent from './tabs/NotificationTabContent';
import NewNotificationTabContent from './tabs/NewNotificationTabContent';
import NotificationExplorerTab from './tabs/NotificationExplorerTab';
import FallbackExplorerTab from './tabs/FallbackExplorerTab';
import QuotaExplorerTab from './tabs/QuotaExplorerTab';
import HealthcheckExplorerTab from './tabs/HealthcheckExplorerTab';
import NewMessageTabContent from './tabs/NewMessageTabContent';
import MessageTabContent from './tabs/MessageTabContent';
import NewMessageBrokerTopicContent from './tabs/NewMessageBrokerTopicContent';
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
import MessageBrokerTabContent from './tabs/MessageBrokerTabContent';
import StorageComponentContent from './tabs/StorageComponentContent';
import CacheComponentContent from './tabs/CacheComponentContent';
import CacheValuesTabContent from './tabs/CacheValuesTabContent';
import MessageBrokerEventsTabContent from './tabs/MessageBrokerEventsTabContent';
import DatabaseComponentContent from './tabs/DatabaseComponentContent';
import JobTabContent from './tabs/JobTabContent';
import NewJobTabContent from './tabs/NewJobTabContent';
import JobsExplorerTab from './tabs/JobsExplorerTab';
import GenericComponentContent from './tabs/GenericComponentContent';
import PricingTabContent from './tabs/PricingTabContent';

function FeatureTabContent({ tab }: { tab: Tab }) {
    // Check if this is a component from product (not app)
    if (tab.data?.componentType) {
      const componentType = tab.data.componentType;

      // App-level components (from app versions)
      if (['auth', 'environment', 'webhook', 'healthcheck', 'new-webhook'].includes(componentType)) {
        switch (componentType) {
          case 'auth':
            // Check if this is a new auth creation tab
            if (tab.data?.isNew) {
              return <NewAuthTabContent tabId={tab.id} data={tab.data} />;
            }
            return <AuthTabContent auth={tab.data} />;
          case 'environment':
            return <EnvironmentTabContent environment={tab.data} />;
          case 'new-webhook':
            // Direct new webhook creation tab
            return <NewWebhookTabContent tabId={tab.id} data={tab.data} />;
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
      case 'message-broker':
        return <MessageBrokerTabContent messageBroker={tab.data} />;
      case 'fallback':
      case 'quota':
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
          return <RequestBuilder key={activeTab.id} tabId={activeTab.id} data={activeTab.data} />;
        }

        // Check if this is an action request (from app actions)
        if (activeTab.data?.componentType === 'action') {
          return (
            <ActionViewTabContent
              key={activeTab.id}
              action={activeTab.data}
              appTag={activeTab.data?.appTag}
              productTag={activeTab.data?.productTag}
              envSlug={activeTab.data?.envSlug}
            />
          );
        }

        // Regular request (manual API testing)
        return (
          <div key={activeTab.id} className="flex-1 flex flex-col lg:flex-row min-h-0">
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
          return <NewAppTabContent key={activeTab.id} tabId={activeTab.id} data={activeTab.data} />;
        }
        // Use key to force remount when switching between different apps
        return <AppTabContent key={activeTab.id} app={activeTab.data} appId={activeTab.itemId} />;

      case 'product':
        // Check if this is a new product creation tab
        if (activeTab.isDirty && !activeTab.itemId && !activeTab.data?._id) {
          return <NewProductTabContent key={activeTab.id} tabId={activeTab.id} data={activeTab.data} />;
        }
        return <ProductTabContent key={activeTab.id} tabId={activeTab.id} product={activeTab.data} productId={activeTab.itemId} />;

      case 'auth':
        // Check if this is a new auth creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewAuthTabContent key={activeTab.id} tabId={activeTab.id} data={activeTab.data} />;
        }
        // This would handle viewing an auth, but for now just show the new auth content
        return <NewAuthTabContent key={activeTab.id} tabId={activeTab.id} data={activeTab.data} />;

      case 'logs':
        return <Logs key={activeTab.id} />;

      case 'dashboard':
        return <Dashboard key={activeTab.id} />;

      case 'tokens':
        return <TokensTabContent key={activeTab.id} />;

      case 'teams':
        return <TeamsTabContent key={activeTab.id} />;

      case 'partnership':
        // Check if this is a specific partnership detail view (has itemId) or the management view (no itemId)
        if (activeTab.itemId) {
          return <PartnershipDetailTabContent key={activeTab.id} tab={activeTab} />;
        }
        return <PartnershipTabContent key={activeTab.id} />;

      case 'brief':
        // Product brief view/edit/create
        return <BriefTabContent key={activeTab.id} tab={activeTab as typeof activeTab & { data: NonNullable<typeof activeTab.data> }} />;

      case 'storage':
        // Check if this is a storage explorer tab
        if (activeTab.data?.isExplorer) {
          return <StorageExplorerTab key={activeTab.id} tabId={activeTab.id} storage={activeTab.data.storage} />;
        }
        // Check if this is a new storage creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewStorageTabContent key={activeTab.id} tabId={activeTab.id} data={activeTab.data} />;
        }
        return <StorageTabContent key={activeTab.id} storage={activeTab.data} />;

      case 'cache':
        // Check if this is a new cache creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewCacheTabContent key={activeTab.id} tabId={activeTab.id} data={activeTab.data} />;
        }
        return <CacheTabContent key={activeTab.id} cache={activeTab.data} />;

      case 'cache-values':
        return <CacheValuesTabContent key={activeTab.id} cache={activeTab.data} />;

      case 'message-broker-events':
        return <MessageBrokerEventsTabContent key={activeTab.id} broker={activeTab.data} />;

      case 'database':
        // Check if this is a database explorer tab
        if (activeTab.data?.isExplorer) {
          return <DatabaseExplorerTab key={activeTab.id} database={activeTab.data.database} />;
        }
        // Check if this is a new database creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewDatabaseTabContent key={activeTab.id} tabId={activeTab.id} data={activeTab.data} />;
        }
        return <DatabaseTabContent key={activeTab.id} database={activeTab.data} />;

      case 'graph':
        // Check if this is a graph explorer tab
        if (activeTab.data?.isExplorer) {
          return <GraphExplorerTab key={activeTab.id} graph={activeTab.data.graph} />;
        }
        // Check if this is a new graph creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewGraphTabContent key={activeTab.id} tabId={activeTab.id} data={activeTab.data} />;
        }
        return <GraphTabContent key={activeTab.id} graph={activeTab.data} />;

      case 'vector':
        // Check if this is a vector explorer tab
        if (activeTab.data?.isExplorer) {
          return <VectorExplorerTab key={activeTab.id} vector={activeTab.data.vector} />;
        }
        return <VectorTabContent key={activeTab.id} vector={activeTab.data} />;

      case 'workflow':
        // Check if this is a workflow explorer tab
        if (activeTab.data?.isExplorer) {
          return <WorkflowExplorerTab key={activeTab.id} workflow={activeTab.data.workflow} />;
        }
        // Default workflow view (can be extended later for workflow creation/editing)
        return <WorkflowExplorerTab key={activeTab.id} workflow={activeTab.data} />;

      case 'workflow-run':
        // Check if we have the run data (may be missing after page reload)
        if (!activeTab.data?.run) {
          return (
            <div key={activeTab.id} className="flex-1 flex flex-col items-center justify-center bg-background-tertiary p-6">
              <div className="text-center text-grey-200 max-w-md">
                <p className="text-lg mb-2">Run data not available</p>
                <p className="text-sm">The workflow run data has expired. Please open the run again from the workflow explorer.</p>
              </div>
            </div>
          );
        }
        return <WorkflowRunTab key={activeTab.id} run={activeTab.data.run} workflowName={activeTab.data.workflowName} workflowTag={activeTab.data.workflowTag} />;

      case 'agent':
        // Check if this is an agent explorer tab
        if (activeTab.data?.isExplorer) {
          return <AgentExplorerTab key={activeTab.id} agent={activeTab.data.agent} />;
        }
        // Default agent view
        return <AgentExplorerTab key={activeTab.id} agent={activeTab.data} />;

      case 'agent-run':
        // Check if we have the run data (may be missing after page reload)
        if (!activeTab.data?.run) {
          return (
            <div key={activeTab.id} className="flex-1 flex flex-col items-center justify-center bg-background-tertiary p-6">
              <div className="text-center text-grey-200 max-w-md">
                <p className="text-lg mb-2">Run data not available</p>
                <p className="text-sm">The agent run data has expired. Please open the run again from the agent explorer.</p>
              </div>
            </div>
          );
        }
        return <AgentRunTab key={activeTab.id} run={activeTab.data.run} agentName={activeTab.data.agentName} agentTag={activeTab.data.agentTag} />;

      case 'message-broker':
        // Check if this is a new message broker creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewMessageBrokerTabContent key={activeTab.id} tabId={activeTab.id} data={activeTab.data} />;
        }
        return <FeatureTabContent key={activeTab.id} tab={activeTab} />;

      case 'webhook':
        // Check if this is a new webhook creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewWebhookTabContent key={activeTab.id} tabId={activeTab.id} data={activeTab.data} />;
        }
        return <WebhookTabContent key={activeTab.id} webhook={activeTab.data} />;

      case 'healthcheck':
        // Check if this is a new healthcheck creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewHealthcheckTabContent key={activeTab.id} data={activeTab.data} />;
        }
        return <HealthcheckTabContent key={activeTab.id} data={activeTab.data} />;

      case 'notification':
      case 'notifier':
        // Check if this is a new notification creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewNotificationTabContent key={activeTab.id} tabId={activeTab.id} data={activeTab.data} />;
        }
        return <NotificationTabContent key={activeTab.id} data={activeTab.data} />;

      case 'new-notification':
        // Create new notification/notifier
        return <NewNotificationTabContent key={activeTab.id} tabId={activeTab.id} data={activeTab.data} />;

      case 'notification-explorer':
        // Notification explorer tab with product envs
        return <NotificationExplorerTab key={activeTab.id} product={activeTab.data?.product || { tag: '', name: '', envs: [] }} />;

      case 'fallback-explorer':
        // Fallback explorer tab with product envs
        return <FallbackExplorerTab key={activeTab.id} product={activeTab.data?.product || { tag: '', name: '', envs: [] }} />;

      case 'quota-explorer':
        // Quota explorer tab with product envs
        return <QuotaExplorerTab key={activeTab.id} product={activeTab.data?.product || { tag: '', name: '', envs: [] }} />;

      case 'healthcheck-explorer':
        // Healthcheck explorer tab with product envs
        return <HealthcheckExplorerTab key={activeTab.id} product={activeTab.data?.product || { tag: '', name: '', envs: [] }} />;

      case 'jobs-explorer':
        // Jobs explorer tab with product envs
        return <JobsExplorerTab key={activeTab.id} product={activeTab.data?.product || { tag: '', name: '', envs: [] }} />;

      case 'message':
        // View message details
        return <MessageTabContent key={activeTab.id} data={activeTab.data} />;

      case 'new-message':
        // Create new message
        return <NewMessageTabContent key={activeTab.id} tabId={activeTab.id} data={activeTab.data} />;

      case 'new-topic':
        // Create new topic/queue for message broker
        return <NewMessageBrokerTopicContent key={activeTab.id} tabId={activeTab.id} data={activeTab.data} />;

      case 'feature':
        // Check if this is a new feature creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewFeatureTabContent key={activeTab.id} tabId={activeTab.id} type={activeTab.type} data={activeTab.data} />;
        }
        return <FeatureTabContent key={activeTab.id} tab={activeTab} />;

      case 'quota':
        // Check if this is a new quota creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewQuotaTabContent key={activeTab.id} tabId={activeTab.id} data={activeTab.data} />;
        }
        return <FeatureTabContent key={activeTab.id} tab={activeTab} />;

      case 'fallback':
        // Check if this is a new fallback creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewFallbackTabContent key={activeTab.id} tabId={activeTab.id} data={activeTab.data} />;
        }
        return <FeatureTabContent key={activeTab.id} tab={activeTab} />;

      case 'job':
        // Check if this is a new job creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewJobTabContent key={activeTab.id} tabId={activeTab.id} data={activeTab.data} />;
        }
        return <JobTabContent key={activeTab.id} job={activeTab.data} />;

      case 'session':
        // Check if this is a new session creation tab
        if (activeTab.isDirty && activeTab.data?.isNew) {
          return <NewSessionTabContent key={activeTab.id} tabId={activeTab.id} data={activeTab.data} />;
        }
        return <SessionTabContent key={activeTab.id} session={activeTab.data} />;

      case 'session-activity':
        return <SessionActivityTab key={activeTab.id} {...activeTab.data} />;

      case 'session-dashboard':
        return <SessionDashboard key={activeTab.id} {...activeTab.data} />;

      case 'session-user':
        return <SessionUserTab key={activeTab.id} {...activeTab.data} />;

      case 'marketplace':
        return <MarketplaceTabContent key={activeTab.id} />;

      case 'pricing':
        return <PricingTabContent key={activeTab.id} />;

      case 'settings':
        return <SettingsTabContent key={activeTab.id} />;

      default:
        return (
          <div key={activeTab.id} className="p-6">
            <p className="text-grey-600">Unknown tab type: {activeTab.type}</p>
          </div>
        );
    }
  };

  return <div className="flex-1 flex flex-col min-h-0 overflow-hidden">{renderTabContent()}</div>;
}
