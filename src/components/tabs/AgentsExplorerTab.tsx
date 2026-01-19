import { useState, useEffect } from 'react';
import {
  Bot,
  Play,
  Search,
  RefreshCw,
  Loader2,
  Plus,
  Settings2,
  Code,
  Tag,
  MessageSquare,
  Wrench,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Zap,
  Brain,
  History,
  Sparkles,
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

interface AgentsExplorerTabProps {
  agent: {
    name: string;
    tag: string;
    productTag: string;
    env: {
      slug: string;
    };
  };
}

type SidebarView = 'agents' | 'sessions' | 'models';

// Agent types
type AgentStatus = 'active' | 'inactive' | 'draft';
type SessionStatus = 'active' | 'completed' | 'expired';

interface Agent {
  id: string;
  tag: string;
  name: string;
  description?: string;
  model: string;
  status: AgentStatus;
  toolsCount: number;
  totalSessions: number;
  lastRun: string | null;
}

interface AgentSession {
  id: string;
  agentTag: string;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  messageCount: number;
  toolCalls: number;
  tokenUsage: { input: number; output: number };
}

interface LLMModel {
  id: string;
  tag: string;
  name: string;
  provider: string;
  model: string;
  temperature: number;
  agentsUsing: number;
}

// Dummy agents data
const DUMMY_AGENTS: Agent[] = [
  {
    id: 'agent_1',
    tag: 'customer-support',
    name: 'Customer Support Agent',
    description: 'Handles customer inquiries, order lookups, and returns',
    model: 'claude-sonnet',
    status: 'active',
    toolsCount: 5,
    totalSessions: 3892,
    lastRun: '2024-03-15T11:45:00Z',
  },
  {
    id: 'agent_2',
    tag: 'data-analyst',
    name: 'Data Analysis Agent',
    description: 'Analyzes data, generates reports, and provides insights',
    model: 'gpt-4-turbo',
    status: 'active',
    toolsCount: 8,
    totalSessions: 1247,
    lastRun: '2024-03-15T10:30:00Z',
  },
  {
    id: 'agent_3',
    tag: 'code-assistant',
    name: 'Code Assistant',
    description: 'Helps with code review, debugging, and documentation',
    model: 'claude-sonnet',
    status: 'inactive',
    toolsCount: 3,
    totalSessions: 456,
    lastRun: '2024-03-10T08:00:00Z',
  },
  {
    id: 'agent_4',
    tag: 'sales-helper',
    name: 'Sales Helper',
    description: 'Assists with product recommendations and pricing',
    model: 'gpt-4-turbo',
    status: 'draft',
    toolsCount: 4,
    totalSessions: 0,
    lastRun: null,
  },
];

// Dummy sessions data
const DUMMY_SESSIONS: AgentSession[] = [
  {
    id: 'sess_1',
    agentTag: 'customer-support',
    status: 'completed',
    startedAt: '2024-03-15T11:45:00Z',
    endedAt: '2024-03-15T11:52:00Z',
    messageCount: 12,
    toolCalls: 3,
    tokenUsage: { input: 2456, output: 1823 },
  },
  {
    id: 'sess_2',
    agentTag: 'customer-support',
    status: 'active',
    startedAt: '2024-03-15T12:00:00Z',
    endedAt: null,
    messageCount: 5,
    toolCalls: 1,
    tokenUsage: { input: 1234, output: 892 },
  },
  {
    id: 'sess_3',
    agentTag: 'data-analyst',
    status: 'completed',
    startedAt: '2024-03-15T10:30:00Z',
    endedAt: '2024-03-15T10:45:00Z',
    messageCount: 8,
    toolCalls: 5,
    tokenUsage: { input: 4521, output: 3245 },
  },
];

// Dummy models data
const DUMMY_MODELS: LLMModel[] = [
  {
    id: 'model_1',
    tag: 'claude-sonnet',
    name: 'Claude Sonnet',
    provider: 'anthropic',
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    agentsUsing: 2,
  },
  {
    id: 'model_2',
    tag: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    model: 'gpt-4-turbo',
    temperature: 0.5,
    agentsUsing: 2,
  },
  {
    id: 'model_3',
    tag: 'claude-haiku',
    name: 'Claude Haiku',
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    temperature: 0.3,
    agentsUsing: 0,
  },
];

export default function AgentsExplorerTab({ agent }: AgentsExplorerTabProps) {
  const { setSidebarCollapsed } = useWorkbenchStore();

  // Collapse workbench sidebar when AgentsExplorer opens
  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  // State
  const [sidebarView, setSidebarView] = useState<SidebarView>('agents');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedSession, setSelectedSession] = useState<AgentSession | null>(null);
  const [selectedModel, setSelectedModel] = useState<LLMModel | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [runInput, setRunInput] = useState('');

  // Filter data based on search
  const filteredAgents = DUMMY_AGENTS.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSessions = selectedAgent
    ? DUMMY_SESSIONS.filter(s => s.agentTag === selectedAgent.tag)
    : DUMMY_SESSIONS;

  const filteredModels = DUMMY_MODELS.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
    toast.success('Refreshed agent data');
  };

  const handleRunAgent = async () => {
    if (!selectedAgent || !runInput.trim()) return;

    setIsRunning(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success(`Agent "${selectedAgent.name}" ran successfully`);
      setShowRunModal(false);
      setRunInput('');
    } catch (error) {
      toast.error('Failed to run agent');
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = (status: AgentStatus | SessionStatus) => {
    switch (status) {
      case 'active':
        return 'bg-green/10 text-green';
      case 'completed':
        return 'bg-blue/10 text-blue';
      case 'inactive':
      case 'expired':
        return 'bg-grey-400/50 text-grey-600';
      case 'draft':
        return 'bg-yellow/10 text-yellow-600';
      default:
        return 'bg-grey-400/50 text-grey-600';
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString();
  };

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'anthropic':
        return 'bg-orange-100 text-orange-700';
      case 'openai':
        return 'bg-green-100 text-green-700';
      case 'google':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-grey-100 text-grey-700';
    }
  };

  return (
    <div className="flex h-full bg-grey-100">
      {/* Sidebar */}
      <div className="w-72 border-r border-grey-400 bg-white flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-grey-400">
          <div className="flex items-center gap-2 mb-3">
            <Bot className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-grey">Agents Explorer</h2>
          </div>

          {/* Environment Badge */}
          <div className="flex items-center gap-2 text-xs text-grey-600 mb-3">
            <span className="px-2 py-1 rounded bg-primary/10 text-primary font-medium">
              {agent.env.slug}
            </span>
            <span>{agent.productTag}</span>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-500" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* View Tabs */}
        <div className="flex border-b border-grey-400">
          {(['agents', 'sessions', 'models'] as SidebarView[]).map((view) => (
            <button
              key={view}
              onClick={() => {
                setSidebarView(view);
                setSelectedAgent(null);
                setSelectedSession(null);
                setSelectedModel(null);
              }}
              className={cn(
                'flex-1 px-3 py-2 text-xs font-medium transition-colors',
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
          {sidebarView === 'agents' && (
            <div className="space-y-2">
              {filteredAgents.map((ag) => (
                <button
                  key={ag.id}
                  onClick={() => {
                    setSelectedAgent(ag);
                    setSelectedSession(null);
                    setSelectedModel(null);
                  }}
                  className={cn(
                    'w-full p-3 rounded-lg border text-left transition-colors',
                    selectedAgent?.id === ag.id
                      ? 'border-primary bg-primary/5'
                      : 'border-grey-400 hover:border-grey-500 hover:bg-grey-50'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-sm text-grey truncate">{ag.name}</span>
                    <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', getStatusColor(ag.status))}>
                      {ag.status}
                    </span>
                  </div>
                  <p className="text-xs text-grey-600 mb-2 line-clamp-1">{ag.description}</p>
                  <div className="flex items-center gap-3 text-xs text-grey-500">
                    <span className="flex items-center gap-1">
                      <Brain className="h-3 w-3" />
                      {ag.model}
                    </span>
                    <span className="flex items-center gap-1">
                      <Wrench className="h-3 w-3" />
                      {ag.toolsCount}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {sidebarView === 'sessions' && (
            <div className="space-y-2">
              {filteredSessions.map((sess) => (
                <button
                  key={sess.id}
                  onClick={() => {
                    setSelectedSession(sess);
                    setSelectedAgent(null);
                    setSelectedModel(null);
                  }}
                  className={cn(
                    'w-full p-3 rounded-lg border text-left transition-colors',
                    selectedSession?.id === sess.id
                      ? 'border-primary bg-primary/5'
                      : 'border-grey-400 hover:border-grey-500 hover:bg-grey-50'
                  )}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-sm text-grey">{sess.agentTag}</span>
                    <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium', getStatusColor(sess.status))}>
                      {sess.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-grey-500">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {sess.messageCount}
                    </span>
                    <span className="flex items-center gap-1">
                      <Wrench className="h-3 w-3" />
                      {sess.toolCalls}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {sidebarView === 'models' && (
            <div className="space-y-2">
              {filteredModels.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => {
                    setSelectedModel(mod);
                    setSelectedAgent(null);
                    setSelectedSession(null);
                  }}
                  className={cn(
                    'w-full p-3 rounded-lg border text-left transition-colors',
                    selectedModel?.id === mod.id
                      ? 'border-primary bg-primary/5'
                      : 'border-grey-400 hover:border-grey-500 hover:bg-grey-50'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-medium text-sm text-grey truncate">{mod.name}</span>
                    <span className={cn('px-1.5 py-0.5 rounded text-xs font-medium uppercase', getProviderColor(mod.provider))}>
                      {mod.provider}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-grey-500">
                    <span>{mod.model}</span>
                    <span>T: {mod.temperature}</span>
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
            {selectedAgent ? (
              <>
                <Bot className="h-5 w-5 text-primary" />
                <span className="font-semibold text-grey">{selectedAgent.name}</span>
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getStatusColor(selectedAgent.status))}>
                  {selectedAgent.status}
                </span>
              </>
            ) : selectedSession ? (
              <>
                <History className="h-5 w-5 text-primary" />
                <span className="font-semibold text-grey">Session: {selectedSession.id}</span>
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getStatusColor(selectedSession.status))}>
                  {selectedSession.status}
                </span>
              </>
            ) : selectedModel ? (
              <>
                <Brain className="h-5 w-5 text-primary" />
                <span className="font-semibold text-grey">{selectedModel.name}</span>
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium uppercase', getProviderColor(selectedModel.provider))}>
                  {selectedModel.provider}
                </span>
              </>
            ) : (
              <span className="text-grey-600">Select an agent, session, or model to view details</span>
            )}
          </div>

          {selectedAgent && selectedAgent.status === 'active' && (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowRunModal(true)}
                size="sm"
                className="gap-2"
              >
                <Play className="h-4 w-4" />
                Run Agent
              </Button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6">
          {selectedAgent ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Agent Info Card */}
              <div className="bg-white rounded-lg border border-grey-400 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-grey mb-1">{selectedAgent.name}</h3>
                    <p className="text-sm text-grey-600">{selectedAgent.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-grey-500" />
                    <code className="text-sm bg-grey-100 px-2 py-1 rounded">{selectedAgent.tag}</code>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-grey-50 rounded-lg p-4">
                    <div className="text-lg font-bold text-grey">{selectedAgent.model}</div>
                    <div className="text-sm text-grey-600">Model</div>
                  </div>
                  <div className="bg-grey-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-grey">{selectedAgent.toolsCount}</div>
                    <div className="text-sm text-grey-600">Tools</div>
                  </div>
                  <div className="bg-grey-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-grey">{selectedAgent.totalSessions.toLocaleString()}</div>
                    <div className="text-sm text-grey-600">Total Sessions</div>
                  </div>
                  <div className="bg-grey-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green">96.8%</div>
                    <div className="text-sm text-grey-600">Success Rate</div>
                  </div>
                </div>
              </div>

              {/* Recent Sessions */}
              <div className="bg-white rounded-lg border border-grey-400 p-6">
                <h4 className="font-semibold text-grey mb-4">Recent Sessions</h4>
                <div className="space-y-3">
                  {filteredSessions.slice(0, 5).map((sess) => (
                    <div
                      key={sess.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-grey-400 hover:bg-grey-50"
                    >
                      <div className="flex items-center gap-3">
                        {sess.status === 'completed' && <CheckCircle className="h-5 w-5 text-green" />}
                        {sess.status === 'active' && <Loader2 className="h-5 w-5 text-blue animate-spin" />}
                        {sess.status === 'expired' && <XCircle className="h-5 w-5 text-grey-500" />}
                        <div>
                          <div className="font-medium text-sm text-grey">{sess.id}</div>
                          <div className="text-xs text-grey-600">{formatDate(sess.startedAt)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-grey-600">
                        <span>{sess.messageCount} messages</span>
                        <span>{sess.toolCalls} tool calls</span>
                        <ChevronRight className="h-4 w-4 text-grey-400" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : selectedSession ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Session Details */}
              <div className="bg-white rounded-lg border border-grey-400 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-grey mb-1">Session: {selectedSession.id}</h3>
                    <p className="text-sm text-grey-600">Agent: {selectedSession.agentTag}</p>
                  </div>
                  <span className={cn('px-2 py-1 rounded text-sm font-medium', getStatusColor(selectedSession.status))}>
                    {selectedSession.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <Label className="text-xs text-grey-600">Started At</Label>
                    <div className="text-sm font-medium text-grey">{formatDate(selectedSession.startedAt)}</div>
                  </div>
                  <div>
                    <Label className="text-xs text-grey-600">Ended At</Label>
                    <div className="text-sm font-medium text-grey">{formatDate(selectedSession.endedAt)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-grey-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-grey">{selectedSession.messageCount}</div>
                    <div className="text-sm text-grey-600">Messages</div>
                  </div>
                  <div className="bg-grey-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-grey">{selectedSession.toolCalls}</div>
                    <div className="text-sm text-grey-600">Tool Calls</div>
                  </div>
                  <div className="bg-grey-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-grey">{selectedSession.tokenUsage.input.toLocaleString()}</div>
                    <div className="text-sm text-grey-600">Input Tokens</div>
                  </div>
                  <div className="bg-grey-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-grey">{selectedSession.tokenUsage.output.toLocaleString()}</div>
                    <div className="text-sm text-grey-600">Output Tokens</div>
                  </div>
                </div>
              </div>
            </div>
          ) : selectedModel ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Model Details */}
              <div className="bg-white rounded-lg border border-grey-400 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-grey mb-1">{selectedModel.name}</h3>
                    <p className="text-sm text-grey-600">{selectedModel.model}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-grey-500" />
                    <code className="text-sm bg-grey-100 px-2 py-1 rounded">{selectedModel.tag}</code>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div className="bg-grey-50 rounded-lg p-4">
                    <div className={cn('text-lg font-bold uppercase', getProviderColor(selectedModel.provider).replace('bg-', 'text-').replace('-100', '-700'))}>
                      {selectedModel.provider}
                    </div>
                    <div className="text-sm text-grey-600">Provider</div>
                  </div>
                  <div className="bg-grey-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-grey">{selectedModel.temperature}</div>
                    <div className="text-sm text-grey-600">Temperature</div>
                  </div>
                  <div className="bg-grey-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-grey">{selectedModel.agentsUsing}</div>
                    <div className="text-sm text-grey-600">Agents Using</div>
                  </div>
                  <div className="bg-grey-50 rounded-lg p-4">
                    <div className="text-lg font-bold text-green">Active</div>
                    <div className="text-sm text-grey-600">Status</div>
                  </div>
                </div>
              </div>

              {/* Agents using this model */}
              <div className="bg-white rounded-lg border border-grey-400 p-6">
                <h4 className="font-semibold text-grey mb-4">Agents Using This Model</h4>
                <div className="space-y-3">
                  {DUMMY_AGENTS.filter(a => a.model === selectedModel.tag).map((ag) => (
                    <div
                      key={ag.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-grey-400 hover:bg-grey-50"
                    >
                      <div className="flex items-center gap-3">
                        <Bot className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-medium text-sm text-grey">{ag.name}</div>
                          <div className="text-xs text-grey-600">{ag.tag}</div>
                        </div>
                      </div>
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium', getStatusColor(ag.status))}>
                        {ag.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-grey-500">
              <Bot className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">Select an item</p>
              <p className="text-sm">Choose an agent, session, or model from the sidebar</p>
            </div>
          )}
        </div>
      </div>

      {/* Code Sidebar */}
      <CodeSidebar
        title="Agents SDK"
        language="typescript"
        code={`// Run agent using Ductape SDK
import Ductape from '@ductape/sdk';

const ductape = new Ductape({
  accessKey: 'your-access-key',
});

// Run agent
const result = await ductape.agents.run({
  product: '${agent.productTag}',
  env: '${agent.env.slug}',
  tag: '${selectedAgent?.tag || 'agent-tag'}',
  input: 'Your message to the agent',
  sessionId: 'optional-session-id',
});

console.log('Agent response:', result.output);
console.log('Tool calls:', result.toolCalls);
console.log('Token usage:', result.tokenUsage);`}
      />

      {/* Run Agent Modal */}
      <Dialog open={showRunModal} onOpenChange={setShowRunModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run Agent</DialogTitle>
            <DialogDescription>
              Send a message to the agent
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Agent</Label>
              <div className="flex items-center gap-2 mt-1">
                <Bot className="h-4 w-4 text-primary" />
                <span className="font-medium">{selectedAgent?.name}</span>
              </div>
            </div>

            <div>
              <Label>Message</Label>
              <Textarea
                value={runInput}
                onChange={(e) => setRunInput(e.target.value)}
                placeholder="Enter your message..."
                className="h-32 mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRunModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleRunAgent} disabled={isRunning || !runInput.trim()} className="gap-2">
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
