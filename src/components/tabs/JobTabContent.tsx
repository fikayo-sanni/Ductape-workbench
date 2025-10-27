import { Clock, Zap, RefreshCw, Loader2, Tag, CheckCircle, Database, Mail, Terminal, HardDrive, Layers, GitBranch, Server, Webhook } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useDuctape } from '@/hooks/useDuctape';
import { useAuth } from '@/store/useAuth';

interface JobTabContentProps {
  job: any;
}

export default function JobTabContent({ job }: JobTabContentProps) {
  
  const { user, currentWorkspaceId } = useAuth();
  const productTag = job?.productTag;
  
  // Initialize SDK
  const ductape = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product',
  });

  // Fetch job details from SDK
  const { data: jobData, isLoading } = useQuery({
    queryKey: ['job', productTag, job?.tag],
    queryFn: async () => {
      if (!ductape || !productTag || !job?.tag) return job;
      const productBuilder = ductape as any;
      await productBuilder.init(productTag);
      return await productBuilder.jobs?.fetch(job.tag);
    },
    enabled: !!ductape && !!productTag && !!job?.tag,
  });

  const displayData = jobData || job;
  
  // Extract product info for header
  const product = job?.productName && job?.productTag ? {
    name: job.productName,
    tag: job.productTag,
    logo: job.productLogo,
  } : null;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-sm text-grey-600">Loading job details...</p>
        </div>
      </div>
    );
  }

  const getJobStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'running':
        return 'bg-green/10 text-green';
      case 'scheduled':
      case 'pending':
        return 'bg-blue/10 text-blue';
      case 'paused':
      case 'stopped':
        return 'bg-orange-500/10 text-orange-500';
      case 'failed':
      case 'error':
        return 'bg-red/10 text-red';
      default:
        return 'bg-grey-400 text-grey';
    }
  };

  const formatSchedule = (schedule: any) => {
    if (!schedule) return 'Manual';
    if (typeof schedule === 'string') return schedule;
    if (schedule.cron) return `Cron: ${schedule.cron}`;
    if (schedule.interval) return `Interval: Every ${schedule.interval}`;
    return 'Manual';
  };

  // Fetch component details based on job type
  const { data: componentData } = useQuery({
    queryKey: ['job-component', productTag, displayData.type, displayData.event],
    queryFn: async () => {
      if (!ductape || !productTag || !displayData.type || !displayData.event) return null;
      
      const productBuilder = ductape as any;
      await productBuilder.init(productTag);

      // Fetch appropriate component based on type
      if (displayData.type === 'database_action') {
        // Try to find the database action
        try {
          const databases = await productBuilder.databases?.fetchAll();
          for (const db of databases || []) {
            const dbDetails = await productBuilder.databases?.fetch(db.tag);
            const action = dbDetails?.actions?.find((a: any) => a.tag === displayData.event);
            if (action) {
              return { type: 'database', db, action };
            }
          }
        } catch (e) {
          console.error('Error fetching database action:', e);
        }
      } else if (displayData.type === 'action' && displayData.app) {
        // Fetch app action
        try {
          const apps = await productBuilder.apps?.fetchAll();
          const app = apps?.find((a: any) => a.tag === displayData.app);
          if (app) {
            const action = app.actions?.find((a: any) => a.tag === displayData.event);
            return { type: 'app', app, action };
          }
        } catch (e) {
          console.error('Error fetching app action:', e);
        }
      } else if (displayData.type === 'notification') {
        // Fetch notification
        try {
          const notifications = await productBuilder.notifications?.fetchAll();
          const notification = notifications?.find((n: any) => n.tag === displayData.event);
          return { type: 'notification', notification };
        } catch (e) {
          console.error('Error fetching notification:', e);
        }
      } else if (displayData.type === 'function') {
        // Fetch function
        try {
          const functions = await productBuilder.functions?.fetchAll();
          const func = functions?.find((f: any) => f.tag === displayData.event);
          return { type: 'function', function: func };
        } catch (e) {
          console.error('Error fetching function:', e);
        }
      } else if (displayData.type === 'storage') {
        // Fetch storage
        try {
          const storages = await productBuilder.storage?.fetchAll();
          const storage = storages?.find((s: any) => s.tag === displayData.event);
          return { type: 'storage', storage };
        } catch (e) {
          console.error('Error fetching storage:', e);
        }
      }

      return null;
    },
    enabled: !!ductape && !!productTag && !!displayData.type && !!displayData.event,
  });

  const getComponentIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'database_action':
      case 'database':
        return { Icon: Database, color: 'text-blue', bgColor: 'bg-blue/10' };
      case 'action':
      case 'app':
        return { Icon: Server, color: 'text-purple-500', bgColor: 'bg-purple-500/10' };
      case 'notification':
        return { Icon: Mail, color: 'text-orange-500', bgColor: 'bg-orange-500/10' };
      case 'function':
        return { Icon: Terminal, color: 'text-green', bgColor: 'bg-green/10' };
      case 'storage':
        return { Icon: HardDrive, color: 'text-red', bgColor: 'bg-red/10' };
      case 'publish':
      case 'message-broker':
        return { Icon: Layers, color: 'text-indigo-500', bgColor: 'bg-indigo-500/10' };
      case 'fallback':
      case 'quota':
      case 'feature':
        return { Icon: GitBranch, color: 'text-yellow-600', bgColor: 'bg-yellow-600/10' };
      default:
        return { Icon: Webhook, color: 'text-grey', bgColor: 'bg-grey/10' };
    }
  };

  const getComponentName = (type: string) => {
    const nameMap: Record<string, string> = {
      'database_action': 'Database Action',
      'action': 'App Action',
      'notification': 'Notification',
      'function': 'Function',
      'storage': 'Storage',
      'publish': 'Message Broker',
      'message-broker': 'Message Broker',
      'fallback': 'Fallback',
      'quota': 'Quota',
      'feature': 'Feature',
    };
    return nameMap[type?.toLowerCase()] || 'Component';
  };

  return (
    <div className="h-full overflow-auto bg-grey-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Product Context Header */}
        {product && (
          <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20 p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
                {product.logo ? (
                  <img
                    src={product.logo}
                    alt={product.name}
                    className="w-full h-full rounded-lg object-cover"
                  />
                ) : (
                  product.name?.split(' ').map((word: string) => word[0]).join('').toUpperCase().slice(0, 2)
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-grey">Job for {product.name}</h2>
                  <span className="px-2 py-1 bg-primary/20 text-primary text-xs font-medium rounded">
                    {product.tag}
                  </span>
                </div>
                <p className="text-sm text-grey-600">
                  This job is configured for your product and runs based on your specified schedule
                </p>
              </div>
              {displayData.status && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green" />
                  <span className={cn('font-medium', getJobStatusColor(displayData.status))}>
                    {displayData.status}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
              <Zap className="h-6 w-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-grey mb-2">{displayData.name}</h1>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-sm text-grey-600 flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  <span className="font-mono">{displayData.tag}</span>
                </span>
                {displayData.status && (
                  <span className={cn('px-3 py-1 rounded text-xs font-medium uppercase', getJobStatusColor(displayData.status))}>
                    {displayData.status}
                  </span>
                )}
              </div>
              {displayData.description && (
                <p className="text-sm text-grey-600">{displayData.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Job Configuration */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-grey mb-4">Job Configuration</h2>

          <div className="space-y-4">
            {/* Job Name */}
            <div>
              <Label className="text-sm font-semibold text-grey">Job Name</Label>
              <Input
                value={displayData.name}
                readOnly
                className="mt-2"
              />
            </div>

            {/* Job Tag */}
            <div>
              <Label className="text-sm font-semibold text-grey">Tag</Label>
              <Input
                value={displayData.tag}
                readOnly
                className="mt-2 font-mono"
              />
            </div>

            {/* Schedule */}
            <div>
              <Label className="text-sm font-semibold text-grey">Schedule</Label>
              <div className="mt-2 relative">
                <Input
                  value={formatSchedule(displayData.schedule)}
                  readOnly
                  className="pr-10"
                />
                <Clock className="h-4 w-4 text-grey-400 absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-xs text-grey-600 mt-1">
                {displayData.schedule ? 'Automated job execution based on schedule' : 'Job runs manually when triggered'}
              </p>
            </div>

            {/* Description */}
            {displayData.description && (
              <div>
                <Label className="text-sm font-semibold text-grey">Description</Label>
                <textarea
                  value={displayData.description}
                  readOnly
                  className="mt-2 w-full min-h-[80px] px-3 py-2 text-sm rounded-md border border-grey-400 bg-white resize-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Component Being Executed */}
        {componentData && (
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-grey mb-4">Component Being Executed</h2>
            
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
              {(() => {
                const { Icon, color, bgColor } = getComponentIcon(displayData.type);
                return (
                  <div className={cn('w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0', bgColor)}>
                    <Icon className={cn('h-7 w-7', color)} />
                  </div>
                );
              })()}
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-base font-semibold text-grey">
                    {getComponentName(displayData.type)}
                  </h3>
                  <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-medium rounded">
                    {displayData.type}
                  </span>
                </div>
                
                {/* Display specific component details */}
                {componentData.type === 'database' && componentData.db && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-blue" />
                      <p className="text-sm text-grey-600">
                        <span className="font-medium text-grey">Database:</span> {componentData.db.name}
                        {componentData.db.tag && (
                          <span className="ml-2 text-xs text-grey-500 font-mono">({componentData.db.tag})</span>
                        )}
                      </p>
                    </div>
                    {componentData.action && (
                      <div className="flex items-center gap-2 ml-6">
                        <Zap className="h-3 w-3 text-primary" />
                        <p className="text-sm text-grey-600">
                          <span className="font-medium text-grey">Action:</span> {componentData.action.name}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {componentData.type === 'app' && componentData.app && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-purple-500" />
                      <p className="text-sm text-grey-600">
                        <span className="font-medium text-grey">App:</span> {componentData.app.name}
                        {componentData.app.tag && (
                          <span className="ml-2 text-xs text-grey-500 font-mono">({componentData.app.tag})</span>
                        )}
                      </p>
                    </div>
                    {componentData.action && (
                      <div className="flex items-center gap-2 ml-6">
                        <Zap className="h-3 w-3 text-primary" />
                        <p className="text-sm text-grey-600">
                          <span className="font-medium text-grey">Action:</span> {componentData.action.name}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {componentData.type === 'notification' && componentData.notification && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-orange-500" />
                    <p className="text-sm text-grey-600">
                      <span className="font-medium text-grey">Notification:</span> {componentData.notification.name}
                    </p>
                  </div>
                )}
                
                {componentData.type === 'function' && componentData.function && (
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-green" />
                    <p className="text-sm text-grey-600">
                      <span className="font-medium text-grey">Function:</span> {componentData.function.name}
                    </p>
                  </div>
                )}
                
                {componentData.type === 'storage' && componentData.storage && (
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-red" />
                    <p className="text-sm text-grey-600">
                      <span className="font-medium text-grey">Storage:</span> {componentData.storage.name}
                    </p>
                  </div>
                )}
                
                {/* Fallback if no specific component found */}
                {!['database', 'app', 'notification', 'function', 'storage'].includes(componentData.type) && (
                  <p className="text-sm text-grey-600">
                    <span className="font-medium text-grey">Event Tag:</span> {displayData.event}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Execution Details */}
        {(displayData.lastRun || displayData.nextRun || displayData.runCount) && (
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-grey mb-4">Execution Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {displayData.runCount !== undefined && (
                <div className="flex items-center gap-3 p-3 bg-purple-500/5 rounded-lg">
                  <RefreshCw className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-xs text-grey-600">Times Executed</p>
                    <p className="text-lg font-semibold text-grey">{displayData.runCount}</p>
                  </div>
                </div>
              )}

              {displayData.lastRun && (
                <div className="flex items-center gap-3 p-3 bg-blue/10 rounded-lg">
                  <Clock className="h-5 w-5 text-blue" />
                  <div>
                    <p className="text-xs text-grey-600">Last Run</p>
                    <p className="text-sm font-semibold text-grey">
                      {new Date(displayData.lastRun).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {displayData.nextRun && (
                <div className="flex items-center gap-3 p-3 bg-green/10 rounded-lg">
                  <Clock className="h-5 w-5 text-green" />
                  <div>
                    <p className="text-xs text-grey-600">Next Run</p>
                    <p className="text-sm font-semibold text-grey">
                      {new Date(displayData.nextRun).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Job Behavior Info */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-grey mb-4">How Jobs Work</h2>
          <div className="space-y-3 text-sm text-grey-600">
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                1
              </span>
              <div>
                <p className="font-semibold text-grey">Scheduled Execution</p>
                <p className="text-xs">Jobs run automatically based on your defined schedule (cron, interval, or manual)</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                2
              </span>
              <div>
                <p className="font-semibold text-grey">Background Processing</p>
                <p className="text-xs">Jobs execute in the background without blocking your application</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                3
              </span>
              <div>
                <p className="font-semibold text-grey">Error Handling</p>
                <p className="text-xs">Failed jobs are logged and can be retried or handled according to your configuration</p>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-purple-500" />
              <h3 className="text-sm font-semibold text-grey">Automated Tasks</h3>
            </div>
            <p className="text-xs text-grey-600">
              Run repetitive tasks automatically without manual intervention
            </p>
          </div>

          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-blue" />
              <h3 className="text-sm font-semibold text-grey">Scheduled Execution</h3>
            </div>
            <p className="text-xs text-grey-600">
              Execute jobs at specific times or intervals using cron or interval-based scheduling
            </p>
          </div>

          <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <RefreshCw className="h-5 w-5 text-green" />
              <h3 className="text-sm font-semibold text-grey">Reliable Processing</h3>
            </div>
            <p className="text-xs text-grey-600">
              Built-in retry logic and error handling for robust background job execution
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">ℹ️ About Jobs</h3>
          <p className="text-xs text-blue-800">
            Jobs are background tasks that execute on a schedule. They're perfect for data processing, sending periodic notifications, 
            cleaning up old records, or any task that needs to run automatically. Use cron expressions for precise scheduling or 
            intervals for recurring tasks.
          </p>
        </div>
      </div>
    </div>
  );
}
