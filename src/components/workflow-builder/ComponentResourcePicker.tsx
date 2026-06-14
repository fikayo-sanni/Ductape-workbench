/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConnectedAppPicker } from './ConnectedAppPicker';
import { SearchableActionPicker } from './SearchableActionPicker';
import { ComponentTypePicker } from './ComponentTypePicker';
import type { ProductContext, ResilienceComponentCategory, ResilienceOptionDraft } from './types';
import { COMPONENT_IO_REGISTRY } from './componentIoRegistry';

interface ComponentResourcePickerProps {
  product: ProductContext;
  connectedApps?: any[];
  selectedAppData?: any;
  onAdd: (option: Partial<ResilienceOptionDraft>) => void;
  showQuotaField?: boolean;
}

const DB_ACTIONS = ['create', 'read', 'update', 'delete', 'list', 'upsert'];

export function ComponentResourcePicker({
  product,
  connectedApps = [],
  selectedAppData: externalAppData,
  onAdd,
  showQuotaField = false,
}: ComponentResourcePickerProps) {
  const [category, setCategory] = useState<ResilienceComponentCategory | ''>('');
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [selectedDatabase, setSelectedDatabase] = useState<any>(null);
  const [dbAction, setDbAction] = useState('');

  const available = useMemo(() => {
    const list: ResilienceComponentCategory[] = [];
    if (connectedApps.length > 0) list.push('action');
    if (product.databases?.length) list.push('database');
    if (product.features?.length) list.push('feature');
    if (product.notifications?.length) list.push('notification');
    if (product.storages?.length) list.push('storage');
    if (product.graphs?.length) list.push('graph');
    if (product.vectors?.length) list.push('vector');
    if (product.messageBrokers?.length) list.push('produce');
    return list;
  }, [product, connectedApps]);

  const appActions = useMemo(() => {
    const appData = externalAppData || selectedApp;
    const latestVersion = appData?.versions?.find((v: any) => v.latest) || appData?.versions?.[0];
    return latestVersion?.actions || appData?.actions || [];
  }, [externalAppData, selectedApp]);

  const emit = (partial: Partial<ResilienceOptionDraft>) => {
    onAdd(partial);
    setCategory('');
    setSelectedApp(null);
    setSelectedDatabase(null);
    setDbAction('');
  };

  return (
    <div className="space-y-4">
      <ComponentTypePicker
        available={available}
        selected={category}
        onSelect={(c) => {
          setCategory(c);
          setSelectedApp(null);
          setSelectedDatabase(null);
        }}
      />

      {category === 'action' && (
        <div className="space-y-3">
          <ConnectedAppPicker
            apps={connectedApps}
            value={selectedApp?._id || selectedApp?.app_id}
            onChange={setSelectedApp}
          />
          {selectedApp && (
            <SearchableActionPicker
              actions={appActions}
              onSelect={(action) => {
                const spec = COMPONENT_IO_REGISTRY.action;
                emit({
                  type: 'action',
                  name: action.name,
                  tag: action.tag,
                  event: action.tag,
                  app: selectedApp.app_tag || selectedApp.tag,
                  action,
                  retries: 1,
                  quota: showQuotaField ? 1 : undefined,
                });
              }}
            />
          )}
        </div>
      )}

      {category === 'database' && product.databases && (
        <div className="space-y-3">
          <Label>Select Database</Label>
          <Select
            value={selectedDatabase?._id || ''}
            onValueChange={(id) => {
              setSelectedDatabase(product.databases?.find((d) => d._id === id) || null);
              setDbAction('');
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose a database..." />
            </SelectTrigger>
            <SelectContent>
              {product.databases.map((db) => (
                <SelectItem key={db._id} value={db._id}>
                  {db.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedDatabase && (
            <div>
              <Label>Database action</Label>
              <Select value={dbAction} onValueChange={setDbAction}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose action..." />
                </SelectTrigger>
                <SelectContent>
                  {DB_ACTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {dbAction && (
                <button
                  type="button"
                  className="mt-2 text-sm text-primary hover:underline"
                  onClick={() =>
                    emit({
                      type: 'database_action',
                      name: `${selectedDatabase.name} - ${dbAction}`,
                      tag: `${selectedDatabase.tag}:${dbAction}`,
                      event: dbAction,
                      database: selectedDatabase._id,
                      retries: 1,
                      quota: showQuotaField ? 1 : undefined,
                    })
                  }
                >
                  Add {dbAction} action
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {category === 'feature' && product.features && (
        <div>
          <Label>Select Feature</Label>
          <Select
            onValueChange={(id) => {
              const feature = product.features?.find((f) => f._id === id);
              if (feature) {
                emit({
                  type: 'feature',
                  name: feature.name,
                  tag: feature.tag,
                  event: feature.tag,
                  retries: 1,
                  quota: showQuotaField ? 1 : undefined,
                });
              }
            }}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Choose a feature..." />
            </SelectTrigger>
            <SelectContent>
              {product.features.map((f) => (
                <SelectItem key={f._id} value={f._id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {category === 'notification' && product.notifications && (
        <div>
          <Label>Select Notification</Label>
          <Select
            onValueChange={(id) => {
              const n = product.notifications?.find((x) => x._id === id);
              if (n) {
                emit({
                  type: 'notification',
                  name: n.name,
                  tag: n.tag,
                  event: n.tag,
                  retries: 1,
                  quota: showQuotaField ? 1 : undefined,
                });
              }
            }}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Choose notification..." />
            </SelectTrigger>
            <SelectContent>
              {product.notifications.map((n) => (
                <SelectItem key={n._id} value={n._id}>
                  {n.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {category === 'storage' && product.storages && (
        <div>
          <Label>Select Storage</Label>
          <Select
            onValueChange={(id) => {
              const s = product.storages?.find((x) => x._id === id);
              if (s) {
                emit({
                  type: 'storage',
                  name: s.name,
                  tag: s.tag,
                  event: 'upload',
                  retries: 1,
                  quota: showQuotaField ? 1 : undefined,
                });
              }
            }}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Choose storage..." />
            </SelectTrigger>
            <SelectContent>
              {product.storages.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {category === 'graph' && product.graphs && (
        <div>
          <Label>Select Graph</Label>
          <Select
            onValueChange={(id) => {
              const g = product.graphs?.find((x) => x._id === id);
              if (g) {
                emit({
                  type: 'graph',
                  name: g.name,
                  tag: g.tag,
                  event: 'query',
                  retries: 1,
                  quota: showQuotaField ? 1 : undefined,
                });
              }
            }}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Choose graph..." />
            </SelectTrigger>
            <SelectContent>
              {product.graphs.map((g) => (
                <SelectItem key={g._id} value={g._id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {category === 'vector' && product.vectors && (
        <div>
          <Label>Select Vector DB</Label>
          <Select
            onValueChange={(id) => {
              const v = product.vectors?.find((x) => x._id === id);
              if (v) {
                emit({
                  type: 'vector',
                  name: v.name,
                  tag: v.tag,
                  event: 'search',
                  retries: 1,
                  quota: showQuotaField ? 1 : undefined,
                });
              }
            }}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Choose vector DB..." />
            </SelectTrigger>
            <SelectContent>
              {product.vectors.map((v) => (
                <SelectItem key={v._id} value={v._id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {category === 'produce' && product.messageBrokers && (
        <div>
          <Label>Select Message Broker</Label>
          <Select
            onValueChange={(id) => {
              const b = product.messageBrokers?.find((x) => x._id === id);
              if (b) {
                emit({
                  type: 'produce',
                  name: b.name,
                  tag: b.tag,
                  event: b.tag,
                  retries: 1,
                  quota: showQuotaField ? 1 : undefined,
                });
              }
            }}
          >
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Choose broker..." />
            </SelectTrigger>
            <SelectContent>
              {product.messageBrokers.map((b) => (
                <SelectItem key={b._id} value={b._id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
