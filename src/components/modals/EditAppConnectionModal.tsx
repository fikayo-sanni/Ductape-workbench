import { useEffect, useMemo, useState } from 'react';
import { Loader2, Plug, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDuctape } from '@/hooks/useDuctape';
import { useAuth } from '@/store/useAuth';

type Mapping = {
  app_env_slug: string;
  product_env_slug: string;
  variables?: Array<{ key: string; value: unknown }>;
  auth?: { auth_tag: string; data: unknown; values?: string; expiry?: number };
};

type Field = { key: string; location: 'headers' | 'query' | 'params' | 'body'; sampleValue?: string };

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
  const version = useMemo(
    () => app?.versions?.find((item: any) => item.tag === productApp?.version)
      ?? app?.versions?.find((item: any) => item.latest)
      ?? app?.versions?.[0],
    [app, productApp?.version],
  );
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [replaceAuth, setReplaceAuth] = useState<Record<string, boolean>>({});
  const [authValues, setAuthValues] = useState<Record<string, Record<string, string>>>({});
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
    setReplaceAuth(Object.fromEntries(nextMappings.filter(mapping => !existing.some((saved: Mapping) => saved.product_env_slug === mapping.product_env_slug && saved.auth)).map(mapping => [mapping.product_env_slug, true])));
    setAuthValues({});
  }, [open, productApp, productEnvs, version]);

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
        if (!replaceAuth[mapping.product_env_slug]) return mapping;
        const auth = version?.auths?.find((item: any) => item.tag === mapping.auth?.auth_tag);
        if (!auth) throw new Error(`Choose authentication for ${mapping.product_env_slug}`);
        const data: Record<string, Record<string, string>> = { headers: {}, query: {}, params: {}, body: {} };
        for (const field of fieldsForAuth(auth, version)) {
          const value = authValues[mapping.product_env_slug]?.[`${field.location}:${field.key}`] ?? '';
          if (!value) throw new Error(`${field.key} is required for ${mapping.product_env_slug}`);
          data[field.location][field.key] = value;
        }
        return { ...mapping, auth: { auth_tag: auth.tag, data } };
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
                {(version?.auths?.length ?? 0) > 0 && (
                  <div className="space-y-3 border-t border-grey-200 dark:border-grey-500 pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <div><p className="text-sm font-medium text-grey">Authentication</p><p className="text-xs text-grey-500">{mapping.auth?.data && !replaceAuth[mapping.product_env_slug] ? 'Encrypted credentials are currently saved.' : 'Enter credentials for this environment.'}</p></div>
                      <Button type="button" variant={replaceAuth[mapping.product_env_slug] ? 'default' : 'outline'} size="sm" onClick={() => setReplaceAuth(current => ({ ...current, [mapping.product_env_slug]: !current[mapping.product_env_slug] }))}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />Replace credentials
                      </Button>
                    </div>
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
                  </div>
                )}
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
