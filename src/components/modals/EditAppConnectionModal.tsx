import { useEffect, useMemo, useState } from 'react';
import { KeyRound, Loader2, Plus, Plug, RotateCcw, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDuctape } from '@/hooks/useDuctape';
import { connectDuctapeWorkspace } from '@/helpers/ductape';
import { useAuth } from '@/store/useAuth';

type Mapping = {
  app_env_slug: string;
  product_env_slug: string;
  variables?: Array<{ key: string; value: unknown }>;
  auth?: { auth_tag: string; data: unknown; values?: string; expiry?: number };
  credentials?: Record<string, unknown>;
};

type Field = { key: string; location: 'headers' | 'query' | 'params' | 'body'; sampleValue?: string };
type SharedField = Field & { actions: string[] };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productTag: string;
  accessTag: string;
  app: any;
  productApp: any;
  productEnvs: Array<{ slug?: string; env_name?: string }>;
  onSuccess?: () => void;
}

function fieldsForAuth(auth: any, version: any): Field[] {
  const source = auth?.setup_type === 'token_access'
    ? auth.tokens
    : version?.actions?.find((action: any) => action.tag === auth?.action_tag);
  const fields: Field[] = [];
  for (const location of ['headers', 'query', 'params', 'body'] as const) {
    for (const item of source?.[location]?.data ?? []) {
      if (item?.key) fields.push({ key: item.key, location, sampleValue: item.sampleValue });
    }
  }
  return fields;
}

function sharedFieldsForActions(version: any): SharedField[] {
  const fields = new Map<string, SharedField>();
  for (const action of version?.actions ?? []) {
    for (const location of ['headers', 'query', 'params', 'body'] as const) {
      for (const item of action?.[location]?.data ?? []) {
        const key = String(item?.key ?? '').trim();
        if (!key) continue;
        const compoundKey = `${location}:${key}`;
        const current: SharedField = fields.get(compoundKey) ?? {
          key,
          location,
          sampleValue: item?.sampleValue,
          actions: [],
        };
        const actionTag = String(action?.tag ?? action?.name ?? '').trim();
        if (actionTag && !current.actions.includes(actionTag)) current.actions.push(actionTag);
        fields.set(compoundKey, current);
      }
    }
  }
  return [...fields.values()].sort((left, right) =>
    right.actions.length - left.actions.length
    || left.location.localeCompare(right.location)
    || left.key.localeCompare(right.key));
}

function hasSavedCredentials(auth: Mapping['auth']): boolean {
  if (!auth?.auth_tag) return false;
  if (typeof auth.values === 'string' && auth.values.trim().length > 0) return true;
  if (typeof auth.data === 'string' && auth.data.trim().length > 0) return true;
  if (!auth.data || typeof auth.data !== 'object' || Array.isArray(auth.data)) return false;
  return ['headers', 'query', 'params', 'body'].some(location => {
    const values = (auth.data as Record<string, unknown>)[location];
    return Boolean(values && typeof values === 'object' && Object.values(values as Record<string, unknown>).some(value => value !== '' && value != null));
  });
}

export default function EditAppConnectionModal({
  open,
  onOpenChange,
  productTag,
  accessTag,
  app,
  productApp,
  productEnvs,
  onSuccess,
}: Props) {
  const { user, currentWorkspaceId } = useAuth();
  const productBuilder = useDuctape({
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
    type: 'product',
  }) as any;
  const workspaceDuctape = useMemo(() => {
    if (!currentWorkspaceId || !user?._id || !user?.auth_token || !user?.public_key) return null;
    return connectDuctapeWorkspace({
      workspace_id: currentWorkspaceId,
      user_id: user._id,
      token: user.auth_token,
      public_key: user.public_key,
    });
  }, [currentWorkspaceId, user?._id, user?.auth_token, user?.public_key]);
  const version = useMemo(
    () => app?.versions?.find((item: any) => item.tag === productApp?.version)
      ?? app?.versions?.find((item: any) => item.latest)
      ?? app?.versions?.[0],
    [app, productApp?.version],
  );
  const sharedCredentialFields = useMemo(() => sharedFieldsForActions(version), [version]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [replaceAuth, setReplaceAuth] = useState<Record<string, boolean>>({});
  const [authValues, setAuthValues] = useState<Record<string, Record<string, string>>>({});
  const [sharedCredentials, setSharedCredentials] = useState<Record<string, Array<{ location: Field['location']; key: string; value: string }>>>({});
  const [secrets, setSecrets] = useState<Array<{ key: string; description?: string }>>([]);
  const [loadingSecrets, setLoadingSecrets] = useState(false);
  const [secretTarget, setSecretTarget] = useState<{ env: string; index: number } | null>(null);
  const [newSecret, setNewSecret] = useState({ key: '', value: '', description: '' });
  const [creatingSecret, setCreatingSecret] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const existing = productApp?.envs ?? [];
    const nextMappings = productEnvs.map(productEnv => {
      const saved = existing.find((mapping: Mapping) => mapping.product_env_slug === productEnv.slug);
      return saved ? {
        ...saved,
        variables: (saved.variables ?? []).map((variable: any) => ({ ...variable })),
        auth: saved.auth ? { ...saved.auth } : undefined,
      } : {
        product_env_slug: String(productEnv.slug || ''),
        app_env_slug: '',
        variables: [],
        auth: version?.auths?.[0] ? { auth_tag: version.auths[0].tag, data: {} } : undefined,
      };
    });
    setMappings(nextMappings);
    setReplaceAuth({});
    setSharedCredentials(Object.fromEntries(nextMappings.map(mapping => [
      mapping.product_env_slug,
      Object.entries(mapping.credentials ?? {}).map(([compoundKey, value]) => {
        const separator = compoundKey.indexOf(':');
        return {
          location: (separator > 0 ? compoundKey.slice(0, separator) : 'headers') as Field['location'],
          key: separator > 0 ? compoundKey.slice(separator + 1) : compoundKey,
          value: String(value ?? ''),
        };
      }),
    ])));
    setAuthValues({});
  }, [open, productApp, productEnvs, version]);

  useEffect(() => {
    if (!open || !workspaceDuctape) return;
    let active = true;
    setLoadingSecrets(true);
    Promise.resolve(workspaceDuctape.secrets.list())
      .then((items: any[]) => {
        if (!active) return;
        setSecrets((items ?? []).map(item => ({ key: String(item.key), description: item.description })).filter(item => item.key));
      })
      .catch(() => { if (active) toast.error('Failed to load workspace secrets'); })
      .finally(() => { if (active) setLoadingSecrets(false); });
    return () => { active = false; };
  }, [open, workspaceDuctape]);

  const updateMapping = (index: number, update: Partial<Mapping>) => {
    setMappings(current => current.map((mapping, i) => i === index ? { ...mapping, ...update } : mapping));
  };

  const updateVariable = (index: number, key: string, value: string) => {
    setMappings(current => current.map((mapping, i) => {
      if (i !== index) return mapping;
      const variables = [...(mapping.variables ?? [])];
      const found = variables.findIndex(variable => variable.key === key);
      if (found >= 0) variables[found] = { ...variables[found], value };
      else variables.push({ key, value });
      return { ...mapping, variables };
    }));
  };

  const save = async () => {
    try {
      setSaving(true);
      const envs = mappings.map((mapping) => {
        if (!mapping.app_env_slug) throw new Error(`Choose an App environment for ${mapping.product_env_slug}`);
        let next = { ...mapping };
        if (!replaceAuth[mapping.product_env_slug] && !hasSavedCredentials(mapping.auth)) {
          delete next.auth;
        }
        const shared = sharedCredentials[mapping.product_env_slug] ?? [];
        const credentials: Record<string, string> = {};
        for (const credential of shared) {
          if (!credential.key.trim() || !credential.value) throw new Error(`Complete or remove the shared credential in ${mapping.product_env_slug}`);
          credentials[`${credential.location}:${credential.key.trim()}`] = credential.value;
        }
        next.credentials = credentials;
        if (replaceAuth[mapping.product_env_slug]) {
          const auth = version?.auths?.find((item: any) => item.tag === mapping.auth?.auth_tag);
          if (!auth) throw new Error(`Choose authentication for ${mapping.product_env_slug}`);
          const data: Record<string, Record<string, string>> = { headers: {}, query: {}, params: {}, body: {} };
          for (const field of fieldsForAuth(auth, version)) {
            const value = authValues[mapping.product_env_slug]?.[`${field.location}:${field.key}`] ?? '';
            if (!value) throw new Error(`${field.key} is required for ${mapping.product_env_slug}`);
            data[field.location][field.key] = value;
          }
          next = { ...next, auth: { auth_tag: auth.tag, data } };
        }
        return next;
      });
      await productBuilder.init(productTag);
      await productBuilder.apps.update(accessTag, { envs });
      toast.success('App connection updated');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update App connection');
    } finally {
      setSaving(false);
    }
  };

  const createSecret = async () => {
    if (!secretTarget || !newSecret.key.trim() || !newSecret.value) {
      toast.error('Enter a secret key and value');
      return;
    }
    const key = newSecret.key.trim().replace(/[^A-Za-z0-9_]/g, '_');
    try {
      setCreatingSecret(true);
      if (!workspaceDuctape) throw new Error('Workspace secrets are unavailable');
      await workspaceDuctape.secrets.create({
        key,
        value: newSecret.value,
        description: newSecret.description || `Shared credential for ${accessTag}`,
        token_type: 'credential',
        scope: [accessTag],
        envs: [secretTarget.env],
      });
      setSecrets(current => current.some(item => item.key === key) ? current : [...current, { key, description: newSecret.description }]);
      setSharedCredentials(current => ({
        ...current,
        [secretTarget.env]: current[secretTarget.env].map((item, index) =>
          index === secretTarget.index ? { ...item, value: `$Secret{${key}}` } : item),
      }));
      setSecretTarget(null);
      setNewSecret({ key: '', value: '', description: '' });
      toast.success('Secret created and selected');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create secret');
    } finally {
      setCreatingSecret(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plug className="h-4 w-4" />Edit connection</DialogTitle>
          <DialogDescription>Update environment mappings and shared configuration. Saved credentials remain unchanged unless replaced.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {mappings.map((mapping, index) => {
            const selectedAuth = version?.auths?.find((item: any) => item.tag === mapping.auth?.auth_tag);
            const credentialsSaved = hasSavedCredentials(mapping.auth);
            const variableKeys = new Set<string>([
              ...(version?.variables ?? []).map((variable: any) => variable.key),
              ...(version?.envs?.find((env: any) => env.slug === mapping.app_env_slug)?.base_url_variables ?? []).map((variable: any) => variable.key),
              ...(mapping.variables ?? []).map(variable => variable.key),
            ]);
            return (
              <section key={mapping.product_env_slug} className="border border-grey-300 dark:border-grey-500 rounded-lg p-4 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-grey">{mapping.product_env_slug}</p>
                  <p className="text-xs text-grey-500">Product environment</p>
                </div>
                <div className="space-y-1.5">
                  <Label>App environment</Label>
                  <Select value={mapping.app_env_slug} onValueChange={value => updateMapping(index, { app_env_slug: value })}>
                    <SelectTrigger><SelectValue placeholder="Select environment" /></SelectTrigger>
                    <SelectContent>{(version?.envs ?? []).map((env: any) => <SelectItem key={env.slug} value={env.slug}>{env.env_name || env.slug}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {[...variableKeys].map(key => (
                  <div key={key} className="space-y-1.5">
                    <Label htmlFor={`${mapping.product_env_slug}-${key}`}>{key}</Label>
                    <Input id={`${mapping.product_env_slug}-${key}`} value={String(mapping.variables?.find(variable => variable.key === key)?.value ?? '')} onChange={event => updateVariable(index, key, event.target.value)} />
                  </div>
                ))}
                <div className="space-y-3 border-t border-grey-200 dark:border-grey-500 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div><p className="text-sm font-medium text-grey">Authentication</p><p className="text-xs text-grey-500">Optional. Leave empty if this environment does not require authentication.</p></div>
                    {(version?.auths?.length ?? 0) > 0 && (
                      <Button type="button" variant={replaceAuth[mapping.product_env_slug] ? 'default' : 'outline'} size="sm" onClick={() => setReplaceAuth(current => ({ ...current, [mapping.product_env_slug]: !current[mapping.product_env_slug] }))}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />{credentialsSaved ? 'Replace saved auth' : replaceAuth[mapping.product_env_slug] ? 'Cancel auth setup' : 'Use App authentication'}
                      </Button>
                    )}
                  </div>
                  {credentialsSaved && !replaceAuth[mapping.product_env_slug] && <p className="text-xs text-green">Encrypted App authentication is configured.</p>}
                  {replaceAuth[mapping.product_env_slug] && (
                    <>
                      <Select value={mapping.auth?.auth_tag || ''} onValueChange={value => updateMapping(index, { auth: { auth_tag: value, data: {} } })}>
                        <SelectTrigger><SelectValue placeholder="Select authentication" /></SelectTrigger>
                        <SelectContent>{version.auths.map((auth: any) => <SelectItem key={auth.tag} value={auth.tag}>{auth.name || auth.tag}</SelectItem>)}</SelectContent>
                      </Select>
                      {fieldsForAuth(selectedAuth, version).map(field => {
                        const fieldKey = `${field.location}:${field.key}`;
                        return <div key={fieldKey} className="space-y-1.5"><Label>{field.key} <span className="text-grey-400">({field.location})</span></Label><Input type="password" placeholder={field.sampleValue || ''} value={authValues[mapping.product_env_slug]?.[fieldKey] || ''} onChange={event => setAuthValues(current => ({ ...current, [mapping.product_env_slug]: { ...(current[mapping.product_env_slug] ?? {}), [fieldKey]: event.target.value } }))} /></div>;
                      })}
                    </>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between"><Label>Shared credentials</Label><Button type="button" variant="ghost" size="sm" disabled={sharedCredentialFields.length === 0} onClick={() => {
                      const used = new Set((sharedCredentials[mapping.product_env_slug] ?? []).map(item => `${item.location}:${item.key}`));
                      const candidate = sharedCredentialFields.find(field => !used.has(`${field.location}:${field.key}`));
                      if (!candidate) return;
                      setSharedCredentials(current => ({ ...current, [mapping.product_env_slug]: [...(current[mapping.product_env_slug] ?? []), { location: candidate.location, key: candidate.key, value: '' }] }));
                    }}><Plus className="h-3.5 w-3.5 mr-1" />Add credential</Button></div>
                    {(sharedCredentials[mapping.product_env_slug] ?? []).map((credential, credentialIndex) => (
                      <div key={credentialIndex} className="grid grid-cols-[minmax(0,1fr)_minmax(180px,0.8fr)_36px] gap-2 items-center">
                        <Select value={`${credential.location}:${credential.key}`} onValueChange={value => {
                          const separator = value.indexOf(':');
                          const location = value.slice(0, separator) as Field['location'];
                          const key = value.slice(separator + 1);
                          setSharedCredentials(current => ({ ...current, [mapping.product_env_slug]: current[mapping.product_env_slug].map((item, i) => i === credentialIndex ? { ...item, location, key } : item) }));
                        }}><SelectTrigger className="min-w-0 overflow-hidden [&>span]:block [&>span]:truncate"><SelectValue placeholder="Select action field" /></SelectTrigger><SelectContent>
                          {!sharedCredentialFields.some(field => field.location === credential.location && field.key === credential.key) && credential.key && <SelectItem value={`${credential.location}:${credential.key}`}>{credential.key} ({credential.location})</SelectItem>}
                          {sharedCredentialFields.map(field => <SelectItem key={`${field.location}:${field.key}`} value={`${field.location}:${field.key}`}>{field.key} ({field.location}){field.actions.length ? ` · ${field.actions.length} action${field.actions.length === 1 ? '' : 's'}` : ''}</SelectItem>)}
                        </SelectContent></Select>
                        <div className="flex gap-1.5 min-w-0">
                          <Select value={credential.value} onValueChange={value => setSharedCredentials(current => ({ ...current, [mapping.product_env_slug]: current[mapping.product_env_slug].map((item, i) => i === credentialIndex ? { ...item, value } : item) }))}>
                            <SelectTrigger className="min-w-0 overflow-hidden [&>span]:block [&>span]:truncate"><SelectValue placeholder={loadingSecrets ? 'Loading secrets...' : 'Select secret'} /></SelectTrigger>
                            <SelectContent>
                              {credential.value && !/^\$Secret\{[^}]+\}$/.test(credential.value) && <SelectItem value={credential.value}>Current saved value</SelectItem>}
                              {secrets.map(secret => <SelectItem key={secret.key} value={`$Secret{${secret.key}}`}>{secret.key}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <Button type="button" variant="outline" size="icon" title="Create secret" onClick={() => { setSecretTarget({ env: mapping.product_env_slug, index: credentialIndex }); setNewSecret({ key: '', value: '', description: '' }); }}><KeyRound className="h-4 w-4" /></Button>
                        </div>
                        <Button type="button" variant="ghost" size="icon" title="Remove credential" onClick={() => setSharedCredentials(current => ({ ...current, [mapping.product_env_slug]: current[mapping.product_env_slug].filter((_, i) => i !== credentialIndex) }))}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                    {secretTarget?.env === mapping.product_env_slug && (
                      <div className="border border-grey-200 dark:border-grey-500 rounded-md p-3 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium text-grey"><KeyRound className="h-4 w-4" />Create workspace secret</div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="Secret key" value={newSecret.key} onChange={event => setNewSecret(current => ({ ...current, key: event.target.value.replace(/[^A-Za-z0-9_]/g, '_') }))} />
                          <Input type="password" placeholder="Secret value" value={newSecret.value} onChange={event => setNewSecret(current => ({ ...current, value: event.target.value }))} />
                        </div>
                        <Input placeholder="Description (optional)" value={newSecret.description} onChange={event => setNewSecret(current => ({ ...current, description: event.target.value }))} />
                        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" size="sm" onClick={() => setSecretTarget(null)}>Cancel</Button><Button type="button" size="sm" disabled={creatingSecret || !newSecret.key || !newSecret.value} onClick={createSecret}>{creatingSecret && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}Create &amp; select</Button></div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving || mappings.length === 0}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save connection</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
