import { useState, useEffect } from 'react';
import {
  Workflow,
  Play,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  Plus,
  Eye,
  Settings2,
  Code,
  Tag,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  GitBranch,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import CodeSidebar from '@/components/CodeSidebar';
import { useWorkbenchStore } from '@/stores/workbench-store';

interface WorkflowExplorerTabProps {
  workflow: {
    name: string;
    tag: string;
    productTag: string;
    env: {
      slug: string;
    };
  };
}

type SidebarView = 'workflows' | 'runs' | 'triggers';

// Workflow status types
type WorkflowStatus = 'active' | 'inactive' | 'draft';
type RunStatus = 'running' | 'completed' | 'failed' | 'pending';

// Dummy workflows data
const DUMMY_WORKFLOWS = [
  {
    id: 'wf_1',
    tag: 'user-onboarding',
    name: 'User Onboarding',
    description: 'Complete user onboarding workflow with email verification',
    status: 'active' as WorkflowStatus,
    stepsCount: 5,
    lastRun: '2024-03-15T10:30:00Z',
    runCount: 1247,
  },
  {
    id: 'wf_2',
    tag: 'payment-processing',
    name: 'Payment Processing',
    description: 'Handle payment transactions and notifications',
    status: 'active' as WorkflowStatus,
    stepsCount: 7,
    lastRun: '2024-03-15T11:45:00Z',
    runCount: 3892,
  },
  {
    id: 'wf_3',
    tag: 'data-sync',
    name: 'Data Synchronization',
    description: 'Sync data between external services',
    status: 'inactive' as WorkflowStatus,
    stepsCount: 3,
    lastRun: '2024-03-10T08:00:00Z',
    runCount: 456,
  },
  {
    id: 'wf_4',
    tag: 'notification-dispatch',
    name: 'Notification Dispatch',
    description: 'Multi-channel notification delivery workflow',
    status: 'draft' as WorkflowStatus,
    stepsCount: 4,
    lastRun: null,
    runCount: 0,
  },
];

// Dummy workflow runs
const DUMMY_RUNS = [
  {
    id: 'run_1',
    workflowTag: 'user-onboarding',
    status: 'completed' as RunStatus,
    startedAt: '2024-03-15T10:30:00Z',
    completedAt: '2024-03-15T10:30:45Z',
    duration: 45000,
    input: { userId: 'user_123', email: 'test@example.com' },
    output: { success: true, verificationSent: true },
  },
  {
    id: 'run_2',
    workflowTag: 'payment-processing',
    status: 'running' as RunStatus,
    startedAt: '2024-03-15T11:45:00Z',
    completedAt: null,
    duration: null,
    input: { orderId: 'order_456', amount: 99.99 },
    output: null,
  },
  {
    id: 'run_3',
    workflowTag: 'user-onboarding',
    status: 'failed' as RunStatus,
    startedAt: '2024-03-15T09:15:00Z',
    completedAt: '2024-03-15T09:15:30Z',
    duration: 30000,
    input: { userId: 'user_789', email: 'invalid' },
    output: { error: 'Invalid email format' },
  },
];

export default function WorkflowExplorerTab({ workflow }: WorkflowExplorerTabProps) {
  const { setSidebarCollapsed } = useWorkbenchStore();

  // Collapse workbench sidebar when WorkflowExplorer opens
  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  // State
  const [sidebarView, setSidebarView] = useState<SidebarView>('workflows');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkflow, setSelectedWorkflow] = useState<typeof DUMMY_WORKFLOWS[0] | null>(null);
  const [selectedRun, setSelectedRun] = useState<typeof DUMMY_RUNS[0] | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [executeInput, setExecuteInput] = useState('{}');

  // Filter workflows based on search
  const filteredWorkflows = DUMMY_WORKFLOWS.filter(wf =>
    wf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wf.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter runs based on selected workflow
  const filteredRuns = selectedWorkflow
    ? DUMMY_RUNS.filter(run => run.workflowTag === selectedWorkflow.tag)
    : DUMMY_RUNS;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    toast.success('Refreshed workflow data');
  };

  const handleExecuteWorkflow = async () => {
    if (!selectedWorkflow) return;

    setIsExecuting(true);
    try {
      // Validate JSON input
      JSON.parse(executeInput);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast.success(`Workflow "${selectedWorkflow.name}" triggered successfully`);
      setShowExecuteModal(false);
      setExecuteInput('{}');
    } catch (error) {
      toast.error('Invalid JSON input');
    } finally {
      setIsExecuting(false);
    }
  };

  const getStatusColor = (status: WorkflowStatus | RunStatus) => {
    switch (status) {
      case 'active':
      case 'completed':
        return 'bg-green/10 text-green';
      case 'running':
      case 'pending':
        return 'bg-blue/10 text-blue';
      case 'inactive':
      case 'draft':
        return 'bg-grey-400/50 text-grey-600';
      case 'failed':
        return 'bg-red/10 text-red';
      default:
        return 'bg-grey-400/50 text-grey-600';
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="flex h-full bg-grey-100">
      {/* Sidebar */}
      <div className="w-72 border-r border-grey-400 bg-white flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-grey-400">
          <div className="flex items-center gap-2 mb-3">
            <Workflow className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-grey">Workflow Explorer</h2>
          </div>

          {/* Environment Badge */}
          <div className="flex items-center gap-2 text-xs text-grey-600 mb-3">
            <span className="px-2 py-1 rounded bg-primary/10 text-primary font-medium">
              {workflow.env.slug}
            </span>
            <span>{workflow.productTag}</span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-500" />
            <Input
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex border-b border-grey-400">
          {(['workflows', 'runs'] as SidebarView[]).map((view) => (
            <button
              key={view}
              onClick={() => setSidebarView(view)}
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium transition-colors',
                sidebarView === view
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-grey-600 hover:text-grey hover:bg-grey-100'
              )}
            >
              {view.charAt(0).toUpperCase() + view.slice(1)}
            </button>
          ))}
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-auto p-3">
          {sidebarView === 'workflows' && (
            <div className="space-y-2">
              {filteredWorkflows.map((wf) => (
                <button
                  key={wf.id}
                  onClick={() => {
                    setSelectedWorkflow(wf);
                    setSelectedRun(null);
                  }}
                  className={cn(
                    'w-full p-3 rounded-lg border text-left transition-colors',
                    selectedWorkflow?.id === wf.id
                      ? 'border-primary bg-primary/5'
                      : 'border-grey-400 hover:border-grey-500 hover:bg-grey-50'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-sm text-grey truncate">{wf.name}</span>
                    <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', getStatusColor(wf.status))}>
                      {wf.status}
                    </span>
                  </div>
                  <p className="text-xs text-grey-600 mb-2 line-clamp-2">{wf.description}</p>
                  <div className="flex items-center gap-3 text-xs text-grey-500">
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      {wf.stepsCount} steps
                    </span>
                    <span className="flex items-center gap-1">
                      <Play className="h-3 w-3" />
                      {wf.runCount} runs
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {sidebarView === 'runs' && (
            <div className="space-y-2">
              {filteredRuns.map((run) => (
                <button
                  key={run.id}
                  onClick={() => setSelectedRun(run)}
                  className={cn(
                    'w-full p-3 rounded-lg border text-left transition-colors',
                    selectedRun?.id === run.id
                      ? 'border-primary bg-primary/5'
                      : 'border-grey-400 hover:border-grey-500 hover:bg-grey-50'
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-sm text-grey">{run.workflowTag}</span>
                    <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', getStatusColor(run.status))}>
                      {run.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-grey-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDuration(run.duration)}
                    </span>
                    <span>{formatDate(run.startedAt)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-grey-400">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="w-full gap-2"
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-grey-400 bg-white flex items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {selectedWorkflow ? (
              <>
                <Workflow className="h-5 w-5 text-primary" />
                <span className="font-semibold text-grey">{selectedWorkflow.name}</span>
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getStatusColor(selectedWorkflow.status))}>
                  {selectedWorkflow.status}
                </span>
              </>
            ) : (
              <span className="text-grey-600">Select a workflow to view details</span>
            )}
          </div>

          {selectedWorkflow && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowExecuteModal(true)}
                size="sm"
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Execute
              </Button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {selectedWorkflow ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Workflow Info Card */}
              <div className="bg-white rounded-lg border border-grey-400 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-grey mb-1">{selectedWorkflow.name}</h3>
                    <p className="text-sm text-grey-600">{selectedWorkflow.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-grey-500" />
                    <code className="text-sm bg-grey-100 px-2 py-1 rounded">{selectedWorkflow.tag}</code>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-grey-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-grey">{selectedWorkflow.stepsCount}</div>
                    <div className="text-sm text-grey-600">Steps</div>
                  </div>
                  <div className="bg-grey-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-grey">{selectedWorkflow.runCount}</div>
                    <div className="text-sm text-grey-600">Total Runs</div>
                  </div>
                  <div className="bg-grey-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green">98.5%</div>
                    <div className="text-sm text-grey-600">Success Rate</div>
                  </div>
                  <div className="bg-grey-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-grey">2.3s</div>
                    <div className="text-sm text-grey-600">Avg Duration</div>
                  </div>
                </div>
              </div>

              {/* Recent Runs */}
              <div className="bg-white rounded-lg border border-grey-400 p-6">
                <h4 className="font-semibold text-grey mb-4">Recent Runs</h4>
                <div className="space-y-3">
                  {filteredRuns.slice(0, 5).map((run) => (
                    <div
                      key={run.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-grey-400 hover:bg-grey-50"
                    >
                      <div className="flex items-center gap-3">
                        {run.status === 'completed' && <CheckCircle className="h-5 w-5 text-green" />}
                        {run.status === 'failed' && <XCircle className="h-5 w-5 text-red" />}
                        {run.status === 'running' && <Loader2 className="h-5 w-5 text-blue animate-spin" />}
                        {run.status === 'pending' && <Clock className="h-5 w-5 text-grey-500" />}
                        <div>
                          <div className="font-medium text-sm text-grey">{run.id}</div>
                          <div className="text-xs text-grey-600">{formatDate(run.startedAt)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-grey-600">{formatDuration(run.duration)}</span>
                        <ChevronRight className="h-4 w-4 text-grey-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : selectedRun ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Run Details */}
              <div className="bg-white rounded-lg border border-grey-400 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-grey mb-1">Run: {selectedRun.id}</h3>
                    <p className="text-sm text-grey-600">Workflow: {selectedRun.workflowTag}</p>
                  </div>
                  <span className={cn('px-2 py-1 rounded text-sm font-medium', getStatusColor(selectedRun.status))}>
                    {selectedRun.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <Label className="text-xs text-grey-600">Started At</Label>
                    <div className="text-sm font-medium text-grey">{formatDate(selectedRun.startedAt)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-grey-600">Completed At</Label>
                    <div className="text-sm font-medium text-grey">{formatDate(selectedRun.completedAt)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-grey-600">Duration</Label>
                    <div className="text-sm font-medium text-grey">{formatDuration(selectedRun.duration)}</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-grey-600 mb-2 block">Input</Label>
                    <pre className="bg-grey-100 rounded-lg p-4 text-sm overflow-auto">
                      {JSON.stringify(selectedRun.input, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <Label className="text-xs text-grey-600 mb-2 block">Output</Label>
                    <pre className="bg-grey-100 rounded-lg p-4 text-sm overflow-auto">
                      {selectedRun.output ? JSON.stringify(selectedRun.output, null, 2) : '-'}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-grey-500">
              <Workflow className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a workflow</p>
              <p className="text-sm">Choose a workflow from the sidebar to view details and execute it</p>
            </div>
          )}
        </div>
      </div>

      {/* Code Sidebar */}
      <CodeSidebar
        title="Workflow SDK"
        language="typescript"
        code={`// Run workflow using Ductape SDK
import Ductape from '@ductape/sdk';

const ductape = new Ductape({
  user_id: 'your-user-id',
  workspace_id: 'your-workspace-id',
  private_key: 'your-private-key',
});

// Execute workflow
const result = await ductape.workflows.run({
  product: '${workflow.productTag}',
  env: '${workflow.env.slug}',
  tag: '${selectedWorkflow?.tag || 'workflow-tag'}',
  input: {
    // Your workflow input
  },
});

console.log('Workflow result:', result);`}
      />

      {/* Execute Workflow Modal */}
      <Dialog open={showExecuteModal} onOpenChange={setShowExecuteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Execute Workflow</DialogTitle>
            <DialogDescription>
              Provide input data for the workflow execution
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Workflow</Label>
              <div className="flex items-center gap-2 mt-1">
                <Workflow className="h-4 w-4 text-primary" />
                <span className="font-medium">{selectedWorkflow?.name}</span>
              </div>
            </div>

            <div>
              <Label>Input (JSON)</Label>
              <Textarea
                value={executeInput}
                onChange={(e) => setExecuteInput(e.target.value)}
                placeholder='{"key": "value"}'
                className="font-mono text-sm h-40 mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExecuteModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleExecuteWorkflow} disabled={isExecuting} className="gap-2">
              {isExecuting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Execute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
