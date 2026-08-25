import {useWorkbenchStore} from '@/stores/workbench-store';
import {Tab} from '@/types/tab';
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
import FeatureExplorerTab from './tabs/FeatureExplorerTab';
import FeatureRunTab from './tabs/FeatureRunTab';
import AgentExplorerTab from './tabs/AgentExplorerTab';
import AgentRunTab from './tabs/AgentRunTab';
import CacheTabContent from './tabs/CacheTabContent';
import WebhookTabContent from './tabs/WebhookTabContent';
import WebhookExplorerTab from './tabs/WebhookExplorerTab';
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
import NotificationTemplateTabContent from './tabs/NotificationTemplateTabContent';
import NotificationExplorerTab from './tabs/NotificationExplorerTab';
import ResilienceComponentTab from './tabs/ResilienceComponentTab';
import NewMessageTabContent from './tabs/NewMessageTabContent';
import MessageTabContent from './tabs/MessageTabContent';
import NewMessageBrokerTopicContent from './tabs/NewMessageBrokerTopicContent';
import RequestBuilder from './tabs/RequestBuilder';
import NewProductTabContent from './tabs/NewProductTabContent';
import NewAppTabContent from './tabs/NewAppTabContent';
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
import JobRunDetailContent from './tabs/JobRunDetailContent';
import NewJobTabContent from './tabs/NewJobTabContent';
import JobExplorerTab from './tabs/JobExplorerTab';
import GenericComponentContent from './tabs/GenericComponentContent';
import PricingTabContent from './tabs/PricingTabContent';
import CloudTabContent from './tabs/CloudTabContent';

function FeatureTabContent({tab}: {tab: Tab}) {
  // Check if this is a component from product (not app)
  if (tab.data?.componentType) {
    const componentType = tab.data.componentType;

    // App-level components (from app versions)
    if (
      ['auth', 'environment', 'webhook', 'healthcheck', 'new-webhook'].includes(
        componentType,
      )
    ) {
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
        return (
          <GenericComponentContent component={tab.data} type={componentType} />
        );
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
    <div className="p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-semibold text-grey mb-2">
        {tab.title}
      </h2>
      <p className="text-sm sm:text-base text-grey-600">
        {tab.type.charAt(0).toUpperCase() + tab.type.slice(1)} configuration
        will appear here.
      </p>
    </div>
  );
}

function UnavailableFeaturePanel({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="flex-1 flex items-center justify-center bg-grey-50/50 p-8">
      <div className="text-center max-w-md">
        <h2 className="text-lg font-semibold text-grey">{title}</h2>
        <p className="text-sm text-grey-500 mt-2">{message}</p>
      </div>
    </div>
  );
}

export default function TabContent() {
  const {tabs, activeTabId, activeView} = useWorkbenchStore();

  if (tabs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-grey-100 p-4 sm:p-6 md:p-8">
        <div className="text-center text-grey-600 max-w-xs sm:max-w-md px-4">
          <p className="text-base sm:text-lg mb-2">No tab selected</p>
          <p className="text-xs sm:text-sm">
            {activeView === 'cloud'
              ? 'Add or select a cloud connection from the sidebar'
              : 'Open an item from the sidebar or create a new one'}
          </p>
        </div>
      </div>
    );
  }

  // Render content for a given tab (keeps all tabs mounted; we hide inactive ones to avoid remount/refetch on switch)
  const renderTabContent = (tab: Tab) => {
    const legacyTabType = tab.type as string;
    if (legacyTabType === 'feature-builder' || legacyTabType === 'workflow-builder') {
      return (
        <UnavailableFeaturePanel
          key={tab.id}
          title="Feature flow builder unavailable"
          message="The drag-and-drop feature diagram has been removed. Use the feature explorer to view runs and configuration."
        />
      );
    }
    if (legacyTabType === 'resilience-flow') {
      return (
        <UnavailableFeaturePanel
          key={tab.id}
          title="Resilience flow diagram unavailable"
          message="The drag-and-drop resilience flow diagram has been removed. Use the quota, fallback, or healthcheck explorer instead."
        />
      );
    }

    switch (tab.type) {
      case 'request':
        // Check if this is a new request creation tab (with or without full data after refresh)
        if (tab.isDirty && !tab.itemId) {
          return <RequestBuilder key={tab.id} tabId={tab.id} data={tab.data} />;
        }

        // Check if this is an action request (from app actions)
        if (tab.data?.componentType === 'action') {
          return (
            <ActionViewTabContent
              key={tab.id}
              action={tab.data}
              appTag={tab.data?.appTag}
              productTag={tab.data?.productTag}
              envSlug={tab.data?.envSlug}
            />
          );
        }

        // Regular request (manual API testing) - Responsive layout
        return (
          <div
            key={tab.id}
            className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden"
          >
            {/* Request Panel - Full width on mobile, half on desktop */}
            <div className="flex-1 lg:border-r border-grey-400 bg-white overflow-auto min-h-[300px] lg:min-h-0">
              <RequestPanel />
            </div>

            {/* Response Panel - Full width on mobile, half on desktop */}
            <div className="flex-1 bg-white-700 overflow-auto min-h-[300px] lg:min-h-0">
              <ResponsePanel />
            </div>
          </div>
        );

      case 'app':
        // Check if this is a new app creation tab
        if (tab.isDirty && !tab.itemId && !tab.data?._id) {
          return (
            <NewAppTabContent key={tab.id} tabId={tab.id} data={tab.data} />
          );
        }
        // Use key to force remount when switching between different apps
        return (
          <AppTabContent
            key={tab.id}
            tabId={tab.id}
            app={tab.data}
            appId={tab.itemId}
          />
        );

      case 'product':
        // Check if this is a new product creation tab
        if (tab.isDirty && !tab.itemId && !tab.data?._id) {
          return (
            <NewProductTabContent key={tab.id} tabId={tab.id} data={tab.data} />
          );
        }
        return (
          <ProductTabContent
            key={tab.id}
            tabId={tab.id}
            product={tab.data}
            productId={tab.itemId}
          />
        );

      case 'auth':
        // Check if this is a new auth creation tab
        if (tab.isDirty && tab.data?.isNew) {
          return (
            <NewAuthTabContent key={tab.id} tabId={tab.id} data={tab.data} />
          );
        }
        // This would handle viewing an auth, but for now just show the new auth content
        return (
          <NewAuthTabContent key={tab.id} tabId={tab.id} data={tab.data} />
        );

      case 'logs':
        return <Logs key={tab.id} />;

      case 'dashboard':
        return <Dashboard key={tab.id} />;

      case 'tokens':
        return <TokensTabContent key={tab.id} />;

      case 'teams':
        return <TeamsTabContent key={tab.id} />;

      case 'partnership':
        // Check if this is a specific partnership detail view (has itemId) or the management view (no itemId)
        if (tab.itemId) {
          return <PartnershipDetailTabContent key={tab.id} tab={tab} />;
        }
        return <PartnershipTabContent key={tab.id} />;

      case 'brief':
        // Product brief view/edit/create
        return (
          <BriefTabContent
            key={tab.id}
            tab={tab as typeof tab & {data: NonNullable<typeof tab.data>}}
          />
        );

      case 'storage':
        // Check if this is a storage explorer tab
        if (tab.data?.isExplorer) {
          return (
            <StorageExplorerTab
              key={tab.id}
              tabId={tab.id}
              storage={tab.data.storage}
            />
          );
        }
        // Check if this is a new storage creation tab
        if (tab.isDirty && tab.data?.isNew) {
          return (
            <NewStorageTabContent key={tab.id} tabId={tab.id} data={tab.data} />
          );
        }
        return <StorageTabContent key={tab.id} storage={tab.data} />;

      case 'cache':
        // Check if this is a new cache creation tab
        if (tab.isDirty && tab.data?.isNew) {
          return (
            <NewCacheTabContent key={tab.id} tabId={tab.id} data={tab.data} />
          );
        }
        return <CacheTabContent key={tab.id} cache={tab.data} />;

      case 'cache-values':
        return <CacheValuesTabContent key={tab.id} cache={tab.data} />;

      case 'message-broker-events':
        return <MessageBrokerEventsTabContent key={tab.id} broker={tab.data} />;

      case 'database':
        // Check if this is a database explorer tab
        if (tab.data?.isExplorer) {
          return (
            <DatabaseExplorerTab key={tab.id} database={tab.data.database} />
          );
        }
        // Check if this is a new database creation tab
        if (tab.isDirty && tab.data?.isNew) {
          return (
            <NewDatabaseTabContent
              key={tab.id}
              tabId={tab.id}
              data={tab.data}
            />
          );
        }
        return <DatabaseTabContent key={tab.id} database={tab.data} />;

      case 'graph':
        // Check if this is a graph explorer tab
        if (tab.data?.isExplorer) {
          return <GraphExplorerTab key={tab.id} graph={tab.data.graph} />;
        }
        // Check if this is a new graph creation tab
        if (tab.isDirty && tab.data?.isNew) {
          return (
            <NewGraphTabContent key={tab.id} tabId={tab.id} data={tab.data} />
          );
        }
        return <GraphTabContent key={tab.id} graph={tab.data} />;

      case 'vector':
        // Check if this is a vector explorer tab
        if (tab.data?.isExplorer) {
          return <VectorExplorerTab key={tab.id} vector={tab.data.vector} />;
        }
        return <VectorTabContent key={tab.id} vector={tab.data} />;

      case 'feature':
        // Check if this is a feature explorer tab (from ProductTabContent: product + feature)
        if (tab.data?.isExplorer) {
          return (
            <FeatureExplorerTab
              key={tab.id}
              tabId={tab.id}
              feature={tab.data.feature}
              product={tab.data.product}
            />
          );
        }
        // Default feature view (can be extended later for feature creation/editing)
        return (
          <FeatureExplorerTab
            key={tab.id}
            tabId={tab.id}
            feature={tab.data}
          />
        );

      case 'feature-run':
        // Check if we have the run data (may be missing after page reload)
        if (!tab.data?.run) {
          return (
            <div
              key={tab.id}
              className="flex-1 flex flex-col items-center justify-center bg-background-tertiary p-4 sm:p-6"
            >
              <div className="text-center text-grey-200 max-w-xs sm:max-w-md">
                <p className="text-base sm:text-lg mb-2">
                  Run data not available
                </p>
                <p className="text-xs sm:text-sm">
                  The feature run data has expired. Please open the run again
                  from the feature explorer.
                </p>
              </div>
            </div>
          );
        }
        return (
          <FeatureRunTab
            key={tab.id}
            tabId={tab.id}
            run={tab.data.run}
            featureName={tab.data.featureName}
            featureTag={tab.data.featureTag}
            workspaceId={tab.data.workspaceId}
          />
        );

      case 'agent':
        // Check if this is an agent explorer tab
        if (tab.data?.isExplorer) {
          return <AgentExplorerTab key={tab.id} agent={tab.data.agent} />;
        }
        // Default agent view
        return <AgentExplorerTab key={tab.id} agent={tab.data} />;

      case 'agent-run':
        // Check if we have the run data (may be missing after page reload)
        if (!tab.data?.run) {
          return (
            <div
              key={tab.id}
              className="flex-1 flex flex-col items-center justify-center bg-background-tertiary p-4 sm:p-6"
            >
              <div className="text-center text-grey-200 max-w-xs sm:max-w-md">
                <p className="text-base sm:text-lg mb-2">
                  Run data not available
                </p>
                <p className="text-xs sm:text-sm">
                  The agent run data has expired. Please open the run again from
                  the agent explorer.
                </p>
              </div>
            </div>
          );
        }
        return (
          <AgentRunTab
            key={tab.id}
            run={tab.data.run}
            agentName={tab.data.agentName}
            agentTag={tab.data.agentTag}
          />
        );

      case 'message-broker':
        // Check if this is a new message broker creation tab
        if (tab.isDirty && tab.data?.isNew) {
          return (
            <NewMessageBrokerTabContent
              key={tab.id}
              tabId={tab.id}
              data={tab.data}
            />
          );
        }
        return <FeatureTabContent key={tab.id} tab={tab} />;

      case 'webhook':
        // Check if this is a new webhook creation tab
        if (tab.isDirty && tab.data?.isNew) {
          return (
            <NewWebhookTabContent key={tab.id} tabId={tab.id} data={tab.data} />
          );
        }
        return <WebhookTabContent key={tab.id} webhook={tab.data} />;

      case 'webhook-explorer':
        return (
          <WebhookExplorerTab key={tab.id} tabId={tab.id} webhook={tab.data} />
        );

      case 'healthcheck':
        // Check if this is a new healthcheck creation tab
        if (tab.isDirty && tab.data?.isNew) {
          return <NewHealthcheckTabContent key={tab.id} data={tab.data} />;
        }
        if (tab.data?.isExplorer || tab.data?.resource) {
          return <ResilienceComponentTab key={tab.id} kind="healthcheck" resource={tab.data.resource || tab.data.healthcheck || tab.data} product={tab.data.product || { tag: tab.data.productTag }} env={tab.data.env || tab.data.selectedEnv} />;
        }
        return <HealthcheckTabContent key={tab.id} data={tab.data} />;

      case 'notification':
      case 'notifier':
        // Check if this is a new notification creation tab
        if (tab.isDirty && tab.data?.isNew) {
          return (
            <NewNotificationTabContent
              key={tab.id}
              tabId={tab.id}
              data={tab.data}
            />
          );
        }
        return <NotificationTabContent key={tab.id} data={tab.data} />;

      case 'new-notification':
        // Create new notification/notifier
        return (
          <NewNotificationTabContent
            key={tab.id}
            tabId={tab.id}
            data={tab.data}
          />
        );

      case 'notification-template':
        // Create/edit notification template (IProductNotificationTemplate via SDK notifications.messages)
        return (
          <NotificationTemplateTabContent
            key={tab.id}
            tabId={tab.id}
            data={tab.data}
          />
        );

      case 'notification-explorer':
        // Notification explorer: product-only = Product Mode (notifier cards); product+notification+env+isExplorer = Notifier+Env Mode (sidebar + overview/templates)
        return <NotificationExplorerTab key={tab.id} data={tab.data} />;

      case 'job-explorer':
        // Single-job explorer: past/future invocations, timeline, metrics
        return (
          <JobExplorerTab
            key={tab.id}
            tabId={tab.id}
            job={tab.data?.job || {}}
            product={tab.data?.product || {tag: '', name: '', envs: []}}
            env={tab.data?.env}
            initialActiveSection={tab.data?.activeSection}
          />
        );

      case 'message':
        // View message details
        return <MessageTabContent key={tab.id} data={tab.data} />;

      case 'new-message':
        // Create new message
        return (
          <NewMessageTabContent key={tab.id} tabId={tab.id} data={tab.data} />
        );

      case 'new-topic':
        // Create new topic/queue for message broker
        return (
          <NewMessageBrokerTopicContent
            key={tab.id}
            tabId={tab.id}
            data={tab.data}
          />
        );

      case 'quota':
        // Check if this is a new quota creation tab
        if (tab.isDirty && tab.data?.isNew) {
          return (
            <NewQuotaTabContent key={tab.id} tabId={tab.id} data={tab.data} />
          );
        }
        return <ResilienceComponentTab key={tab.id} kind="quota" resource={tab.data?.resource || tab.data?.quota || tab.data} product={tab.data?.product || { tag: tab.data?.productTag }} env={tab.data?.env || tab.data?.selectedEnv} />;

      case 'fallback':
        // Check if this is a new fallback creation tab
        if (tab.isDirty && tab.data?.isNew) {
          return (
            <NewFallbackTabContent
              key={tab.id}
              tabId={tab.id}
              data={tab.data}
            />
          );
        }
        return <ResilienceComponentTab key={tab.id} kind="fallback" resource={tab.data?.resource || tab.data?.fallback || tab.data} product={tab.data?.product || { tag: tab.data?.productTag }} env={tab.data?.env || tab.data?.selectedEnv} />;

      case 'job':
        // Check if this is a new job creation tab
        if (tab.isDirty && tab.data?.isNew) {
          return (
            <NewJobTabContent key={tab.id} tabId={tab.id} data={tab.data} />
          );
        }
        return <JobTabContent key={tab.id} job={tab.data} />;

      case 'job-run':
        return (
          <JobRunDetailContent
            key={tab.id}
            executionId={tab.itemId ?? tab.data?.id ?? ''}
            productTag={tab.data?.productTag}
            productName={tab.data?.productName}
            jobName={tab.data?.jobName}
          />
        );

      case 'session':
        // Check if this is a new session creation tab
        if (tab.isDirty && tab.data?.isNew) {
          return (
            <NewSessionTabContent key={tab.id} tabId={tab.id} data={tab.data} />
          );
        }
        return <SessionTabContent key={tab.id} session={tab.data} />;

      case 'session-activity':
        return <SessionActivityTab key={tab.id} tabId={tab.id} {...tab.data} />;

      case 'session-dashboard':
        return <SessionDashboard key={tab.id} {...tab.data} />;

      case 'session-user':
        return <SessionUserTab key={tab.id} {...tab.data} />;

      case 'marketplace':
        return <MarketplaceTabContent key={tab.id} />;

      case 'pricing':
        return <PricingTabContent key={tab.id} />;

      case 'settings':
        return <SettingsTabContent key={tab.id} />;

      case 'cloud':
        return <CloudTabContent key={tab.id} tab={tab} />;

      default:
        return (
          <div key={tab.id} className="p-4 sm:p-6">
            <p className="text-sm sm:text-base text-grey-600">
              Unknown tab type: {tab.type}
            </p>
          </div>
        );
    }
  };

  // Keep all tab panels mounted; stack with absolute positioning so Safari gets a stable
  // flex height (display:none + flex-1 siblings collapses to 0px in WebKit).
  return (
    <div className="flex-1 min-h-0 overflow-hidden w-full relative">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={
              isActive
                ? 'absolute inset-0 flex flex-col min-h-0 overflow-hidden w-full [&>*]:min-h-0'
                : 'absolute inset-0 flex flex-col min-h-0 overflow-hidden w-full invisible pointer-events-none [&>*]:min-h-0'
            }
            aria-hidden={!isActive}
          >
            {renderTabContent(tab)}
          </div>
        );
      })}
    </div>
  );
}
