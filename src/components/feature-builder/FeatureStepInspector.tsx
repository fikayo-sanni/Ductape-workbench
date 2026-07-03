/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Edge, Node } from '@xyflow/react';
import type { FlowStepNodeData } from '@/components/flow-diagram/flowModels';
import { ConnectedAppPicker } from './ConnectedAppPicker';
import { SearchableActionPicker } from './SearchableActionPicker';
import { StepInputMapper } from './StepInputMapper';
import { StepOutputPreview } from './StepOutputPreview';
import { ConditionEditor } from './ConditionEditor';
import type { ProductContext, FeatureStepDraft } from './types';
import {
  buildParentMappingSources,
  type StepParentInfo,
} from './featureGraphParents';

interface FeatureStepInspectorProps {
  node: Node<FlowStepNodeData> | null;
  edge: Edge | null;
  stepDraft: FeatureStepDraft | null;
  product: ProductContext;
  connectedApps: any[];
  parentInfo: StepParentInfo;
  parentSteps: FeatureStepDraft[];
  featureInputs?: Record<string, unknown>;
  onClose: () => void;
  onUpdateStep: (tag: string, updates: Partial<FeatureStepDraft>) => void;
  onUpdateNode: (nodeId: string, data: Partial<FlowStepNodeData>) => void;
  onUpdateEdge: (edgeId: string, updates: Partial<Edge>) => void;
}

const DB_ACTIONS = ['create', 'read', 'update', 'delete', 'list', 'upsert'];

function stepTypeFromKind(kind: string): string {
  const map: Record<string, string> = {
    action: 'action',
    database: 'database_action',
    produce: 'produce',
    storage: 'storage',
    notification: 'notification',
    graph: 'graph',
    feature: 'child_workflow',
    quota: 'quota',
    fallback: 'fallback',
    healthcheck: 'healthcheck',
  };
  return map[kind] || kind;
}

export function FeatureStepInspector({
  node,
  edge,
  stepDraft,
  product,
  connectedApps,
  parentInfo,
  parentSteps,
  featureInputs = {},
  onClose,
  onUpdateStep,
  onUpdateNode,
  onUpdateEdge,
}: FeatureStepInspectorProps) {
  const mappingSources = useMemo(
    () => buildParentMappingSources(parentInfo, parentSteps, featureInputs),
    [parentInfo, parentSteps, featureInputs],
  );

  const hasValidParent = parentInfo.isLayer1 || parentInfo.parentTags.length > 0;

  if (!node && !edge) return null;

  if (edge && !node) {
    return (
      <aside className="w-80 shrink-0 border-l border-grey-300 bg-white flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Branch edge</h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 space-y-4 overflow-auto flex-1">
          <div>
            <Label>Branch label</Label>
            <Input
              className="mt-1"
              value={String(edge.label || '')}
              onChange={(e) =>
                onUpdateEdge(edge.id, { label: e.target.value, data: { condition: e.target.value } })
              }
              placeholder="e.g. valid == true"
            />
          </div>
          <ConditionEditor
            value={String((edge.data as any)?.condition || edge.label || '')}
            onChange={(val) => onUpdateEdge(edge.id, { label: val, data: { condition: val } })}
            label="Step condition (applied to target step)"
          />
        </div>
      </aside>
    );
  }

  if (!node || !stepDraft) return null;

  const kind = node.data.kind;

  if (kind === 'condition') {
    return (
      <aside className="w-80 shrink-0 border-l border-grey-300 bg-white flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-sm font-semibold">Condition node</h2>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 space-y-4 overflow-auto flex-1">
          <div>
            <Label>Label</Label>
            <Input
              className="mt-1"
              value={node.data.label}
              onChange={(e) => onUpdateNode(node.id, { label: e.target.value })}
            />
          </div>
          <ConditionEditor
            value={String(node.data.meta?.condition || '')}
            onChange={(val) =>
              onUpdateNode(node.id, {
                meta: { ...node.data.meta, condition: val },
              })
            }
            label="Default branch condition"
          />
          <p className="text-xs text-grey-600">
            Connect branches below and set per-edge conditions in the inspector when an edge is selected.
          </p>
        </div>
      </aside>
    );
  }

  if (kind === 'start' || kind === 'end') {
    return (
      <aside className="w-80 shrink-0 border-l border-grey-300 bg-white p-4">
        <p className="text-sm text-grey-600">Start and end nodes are not configurable.</p>
        <Button type="button" variant="outline" size="sm" className="mt-2" onClick={onClose}>
          Close
        </Button>
      </aside>
    );
  }

  const selectedApp = connectedApps.find(
    (a) => (a.app_tag || a.tag) === stepDraft.app,
  );
  const appActions =
    selectedApp?.versions?.find((v: any) => v.latest)?.actions ||
    selectedApp?.actions ||
    [];

  const selectedActionData = appActions.find((a: any) => a.tag === stepDraft.event);

  return (
    <aside className="w-96 shrink-0 border-l border-grey-300 bg-white flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <h2 className="text-sm font-semibold">{node.data.label}</h2>
          <p className="text-xs text-grey-600 font-mono">{stepDraft.tag}</p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-4 space-y-4 overflow-auto flex-1">
        <div
          className={`rounded-lg border p-3 text-xs ${
            hasValidParent
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          <p className="font-semibold mb-1">Parents</p>
          {!hasValidParent ? (
            <p>Connect this step from <strong>Start</strong> (layer 1, uses feature input) or from one or more parent steps.</p>
          ) : parentInfo.isLayer1 ? (
            <p>Layer 1 — parent is <code className="font-mono">$Input{'{field}'}</code></p>
          ) : (
            <p>
              Parent step{parentInfo.parentTags.length > 1 ? 's' : ''}:{' '}
              {parentInfo.parentTags.map((t) => (
                <code key={t} className="font-mono mr-1">$Step{'{'}{t}{'}'}</code>
              ))}
            </p>
          )}
        </div>

        <div>
          <Label>Step name</Label>
          <Input
            className="mt-1"
            value={stepDraft.name || ''}
            onChange={(e) => {
              onUpdateStep(stepDraft.tag, { name: e.target.value });
              onUpdateNode(node.id, { label: e.target.value });
            }}
          />
        </div>

        <div>
          <Label>Step type</Label>
          <Select
            value={stepDraft.type}
            onValueChange={(type) => {
              onUpdateStep(stepDraft.tag, { type });
              onUpdateNode(node.id, { subtitle: type });
            }}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {['action', 'database_action', 'produce', 'storage', 'notification', 'graph', 'vector', 'child_workflow', 'quota', 'fallback'].map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {(kind === 'action' || stepDraft.type === 'action') && (
          <>
            <ConnectedAppPicker
              apps={connectedApps}
              value={selectedApp?._id}
              onChange={(app) => {
                if (app) {
                  onUpdateStep(stepDraft.tag, { app: app.app_tag || app.tag });
                  onUpdateNode(node.id, { meta: { ...node.data.meta, app: app.app_tag || app.tag } });
                }
              }}
            />
            {selectedApp && (
              <SearchableActionPicker
                actions={appActions}
                selectedTag={stepDraft.event}
                onSelect={(action) => {
                  onUpdateStep(stepDraft.tag, { event: action.tag, name: action.name });
                  onUpdateNode(node.id, {
                    label: action.name,
                    meta: { ...node.data.meta, event: action.tag },
                  });
                }}
              />
            )}
          </>
        )}

        {(kind === 'database' || stepDraft.type === 'database_action') && product.databases && (
          <>
            <Label>Database</Label>
            <Select
              value={stepDraft.database || ''}
              onValueChange={(id) => {
                const db = product.databases?.find((d) => d._id === id);
                onUpdateStep(stepDraft.tag, { database: id, event: stepDraft.event || 'read' });
                if (db) {
                  onUpdateNode(node.id, { meta: { ...node.data.meta, database: db.tag } });
                }
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select database" />
              </SelectTrigger>
              <SelectContent>
                {product.databases.map((db) => (
                  <SelectItem key={db._id} value={db._id}>
                    {db.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label className="mt-2">Action</Label>
            <Select
              value={stepDraft.event}
              onValueChange={(event) => {
                onUpdateStep(stepDraft.tag, { event });
                onUpdateNode(node.id, { meta: { ...node.data.meta, event } });
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DB_ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {kind === 'storage' && product.storages && (
          <>
            <Label>Storage</Label>
            <Select
              value={stepDraft.storage || ''}
              onValueChange={(id) => {
                onUpdateStep(stepDraft.tag, { storage: id });
                const s = product.storages?.find((x) => x._id === id);
                if (s) onUpdateNode(node.id, { meta: { ...node.data.meta, storage: s.tag } });
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select storage" />
              </SelectTrigger>
              <SelectContent>
                {product.storages.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {kind === 'graph' && product.graphs && (
          <>
            <Label>Graph</Label>
            <Select
              value={stepDraft.graph || ''}
              onValueChange={(id) => {
                onUpdateStep(stepDraft.tag, { graph: id, event: stepDraft.event || 'query' });
                const g = product.graphs?.find((x) => x._id === id);
                if (g) onUpdateNode(node.id, { meta: { ...node.data.meta, graph: g.tag } });
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select graph" />
              </SelectTrigger>
              <SelectContent>
                {product.graphs.map((g) => (
                  <SelectItem key={g._id} value={g._id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {kind === 'notification' && product.notifications && (
          <>
            <Label>Notification</Label>
            <Select
              value={stepDraft.notification || ''}
              onValueChange={(id) => {
                const n = product.notifications?.find((x) => x._id === id);
                onUpdateStep(stepDraft.tag, { notification: id, event: n?.tag || 'dispatch' });
                if (n) onUpdateNode(node.id, { meta: { ...node.data.meta, notification: n.tag } });
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select notification" />
              </SelectTrigger>
              <SelectContent>
                {product.notifications.map((n) => (
                  <SelectItem key={n._id} value={n._id}>
                    {n.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {kind === 'feature' && product.features && (
          <>
            <Label>Sub-feature</Label>
            <Select
              value={stepDraft.feature || ''}
              onValueChange={(tag) => {
                onUpdateStep(stepDraft.tag, { feature: tag, event: tag, type: 'child_workflow' });
                onUpdateNode(node.id, { meta: { ...node.data.meta, feature: tag } });
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select feature" />
              </SelectTrigger>
              <SelectContent>
                {product.features.map((w) => (
                  <SelectItem key={w.tag} value={w.tag}>
                    {w.name || w.tag}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {!stepDraft.event && (
          <div>
            <Label>Event</Label>
            <Input
              className="mt-1 font-mono text-sm"
              value={stepDraft.event}
              onChange={(e) => {
                onUpdateStep(stepDraft.tag, { event: e.target.value });
                onUpdateNode(node.id, { meta: { ...node.data.meta, event: e.target.value } });
              }}
              placeholder="action-tag or run"
            />
          </div>
        )}

        <ConditionEditor
          value={stepDraft.condition || ''}
          onChange={(condition) => onUpdateStep(stepDraft.tag, { condition })}
        />

        <StepInputMapper
          title={
            parentInfo.isLayer1
              ? 'Input mapping (from feature input)'
              : 'Input mapping (from parent output)'
          }
          action={selectedActionData}
          mappings={stepDraft.input as Record<string, any>}
          onChange={(input) => onUpdateStep(stepDraft.tag, { input })}
          sources={mappingSources}
          parentHint={
            parentInfo.isLayer1
              ? 'Layer 1 steps map from $Input{field} (feature input)'
              : parentSteps.length
                ? `Map from parent output: ${parentInfo.parentTags.join(', ')}`
                : 'Connect a parent step to enable output mapping'
          }
        />

        <StepOutputPreview category={stepTypeFromKind(kind)} />
      </div>
    </aside>
  );
}
