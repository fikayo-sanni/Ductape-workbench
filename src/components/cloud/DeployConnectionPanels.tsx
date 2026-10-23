import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { INTERNAL_KEY, SCALE_DOWN_KEY, VERIFIER_FIELD, deployFields, expressFields, fargateFields, parseExpressOutputs, parseFargateOutputs, setupFiles, type IAccessGaps } from '@/utils/deployConnection';

/** The optional Fargate fields of an AWS connection, fillable by pasting the stack outputs so nothing is copied by hand. */
export function FargateFieldsPanel({
  provider, values, errors, onChange, onFill,
}: { provider: string; values: Record<string, string>; errors: Record<string, string>; onChange: (key: string, value: string) => void; onFill: (filled: Record<string, string>) => void }) {
  const fields = fargateFields(provider);
  const [pasted, setPasted] = useState('');
  const [note, setNote] = useState<string | undefined>();
  const [expressPasted, setExpressPasted] = useState('');
  const [expressNote, setExpressNote] = useState<string | undefined>();
  if (fields.length === 0) return null;
  return (
    <div className="space-y-4 rounded-lg border border-grey-400 bg-white p-4">
      <div>
        <h4 className="text-sm font-semibold text-grey">AWS Fargate (optional)</h4>
        <p className="mt-1 text-xs text-grey-600">Only if you want to deploy containers to Fargate as well as Lambda. It needs a domain you own, a certificate for it, and the second setup file above. A release that stops taking traffic keeps running until you remove it.</p>
      </div>
      <div>
        <Label htmlFor="deploy-fargate-paste">Paste the stack outputs</Label>
        <Textarea
          id="deploy-fargate-paste" className="mt-2 h-20 font-mono text-xs" value={pasted} placeholder="aws cloudformation describe-stacks --stack-name ductape-fargate"
          onChange={(event) => {
            const text = event.target.value;
            setPasted(text);
            if (!text.trim()) { setNote(undefined); return; }
            const result = parseFargateOutputs(text);
            if (Object.keys(result.values).length > 0) onFill(result.values);
            setNote(result.error ?? 'Filled every field below.');
          }}
        />
        {note ? <p className="mt-1 text-xs text-grey-600">{note}</p> : null}
      </div>
      <div className="rounded-md border border-grey-400 p-3">
        <p className="text-xs font-semibold text-grey">ECS Express Mode (optional, builds on the details below)</p>
        <p className="mt-1 text-xs text-grey-600">AWS builds the load balancer and HTTPS for you, so no domain or certificate is needed. It moves traffic itself: Ductape cannot split traffic or check a release before it is serving, so it checks afterwards and returns to the last good release if that fails.</p>
        <Label htmlFor="deploy-express-paste" className="mt-3 block">Paste the Express stack outputs</Label>
        <Textarea
          id="deploy-express-paste" className="mt-2 h-16 font-mono text-xs" value={expressPasted} placeholder="aws cloudformation describe-stacks --stack-name ductape-ecs-express"
          onChange={(event) => {
            const text = event.target.value;
            setExpressPasted(text);
            if (!text.trim()) { setExpressNote(undefined); return; }
            const result = parseExpressOutputs(text);
            if (Object.keys(result.values).length > 0) onFill(result.values);
            setExpressNote(result.error ?? 'Filled the role below.');
          }}
        />
        {expressNote ? <p className="mt-1 text-xs text-grey-600">{expressNote}</p> : null}
        {expressFields(provider).map((field) => (
          <div key={field.key} className="mt-3">
            <Label htmlFor={`deploy-${field.key}`}>{field.label} (optional)</Label>
            <Input
              id={`deploy-${field.key}`} className="mt-2 font-mono text-xs" value={values[field.key] ?? ''} placeholder={field.placeholder}
              aria-invalid={errors[field.key] ? true : undefined} onChange={(event) => onChange(field.key, event.target.value)}
            />
            {errors[field.key] ? <p role="alert" className="mt-1 text-xs text-red">{errors[field.key]}</p> : <p className="mt-1 text-xs text-grey-600">{field.help}</p>}
          </div>
        ))}
      </div>
      {fields.map((field) => (
        <div key={field.key}>
          <Label htmlFor={`deploy-${field.key}`}>{field.label} (optional)</Label>
          <Input
            id={`deploy-${field.key}`} className="mt-2 font-mono text-xs" value={values[field.key] ?? ''} placeholder={field.placeholder}
            aria-invalid={errors[field.key] ? true : undefined} onChange={(event) => onChange(field.key, event.target.value)}
          />
          {errors[field.key] ? <p role="alert" className="mt-1 text-xs text-red">{errors[field.key]}</p> : <p className="mt-1 text-xs text-grey-600">{field.help}</p>}
        </div>
      ))}
      <div className="rounded-md border border-grey-400 p-3">
        <div className="flex items-start gap-3">
          <input
            id="deploy-fargate-internal" type="checkbox" className="mt-1 h-4 w-4" checked={values[INTERNAL_KEY] === 'true'}
            onChange={(event) => onChange(INTERNAL_KEY, event.target.checked ? 'true' : 'false')}
          />
          <div>
            <Label htmlFor="deploy-fargate-internal">The load balancer is internal</Label>
            <p className="mt-1 text-xs text-grey-600">Turn on when the stack was made with Scheme=internal. Ductape cannot reach such a load balancer, so each release is checked from inside your network by a small relay function the stack creates. It calls only HTTPS hosts under your domain and holds no key. Your domain must resolve to the load balancer from inside the network.</p>
          </div>
        </div>
        {values[INTERNAL_KEY] === 'true' ? (
          <div className="mt-3">
            <Label htmlFor={`deploy-${VERIFIER_FIELD.key}`}>{VERIFIER_FIELD.label}</Label>
            <Input
              id={`deploy-${VERIFIER_FIELD.key}`} className="mt-2 font-mono text-xs" value={values[VERIFIER_FIELD.key] ?? ''} placeholder={VERIFIER_FIELD.placeholder}
              aria-invalid={errors[VERIFIER_FIELD.key] ? true : undefined} onChange={(event) => onChange(VERIFIER_FIELD.key, event.target.value)}
            />
            {errors[VERIFIER_FIELD.key] ? <p role="alert" className="mt-1 text-xs text-red">{errors[VERIFIER_FIELD.key]}</p> : <p className="mt-1 text-xs text-grey-600">{VERIFIER_FIELD.help}</p>}
          </div>
        ) : null}
      </div>
      <div className="flex items-start gap-3 rounded-md border border-grey-400 p-3">
        <input
          id="deploy-fargate-scale-down" type="checkbox" className="mt-1 h-4 w-4" checked={values[SCALE_DOWN_KEY] === 'true'}
          onChange={(event) => onChange(SCALE_DOWN_KEY, event.target.checked ? 'true' : 'false')}
        />
        <div>
          <Label htmlFor="deploy-fargate-scale-down">Scale down releases that no longer serve</Label>
          <p className="mt-1 text-xs text-grey-600">Off by default. When on, a release that is not serving, was not serving just before, and is not being checked is set to zero tasks, so it stops costing. Nothing is deleted. Asking for it again (a rollback to it) brings it back at its old size, after a short wait, so rolling back past the previous release is no longer instant.</p>
        </div>
      </div>
    </div>
  );
}

/** The extra fields a connection needs to deploy. A secret never goes in one: these are names, roles and ids of the customer's own resources. */
export function DeployFieldsPanel({
  provider, values, errors, onChange,
}: { provider: string; values: Record<string, string>; errors: Record<string, string>; onChange: (key: string, value: string) => void }) {
  const fields = deployFields(provider);
  if (fields.length === 0) return null;
  return (
    <div className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div>
        <h4 className="text-sm font-semibold text-grey">Deploy settings</h4>
        <p className="mt-1 text-xs text-grey-600">Where Ductape builds and runs your code. These are the outputs of the setup step above; none is a secret.</p>
      </div>
      {fields.map((field) => (
        <div key={field.key}>
          <Label htmlFor={`deploy-${field.key}`}>{field.label}{field.required ? '' : ' (optional)'}</Label>
          <Input
            id={`deploy-${field.key}`} className="mt-2 font-mono text-xs" value={values[field.key] ?? ''} placeholder={field.placeholder}
            aria-invalid={errors[field.key] ? true : undefined} onChange={(event) => onChange(field.key, event.target.value)}
          />
          {errors[field.key] ? <p role="alert" className="mt-1 text-xs text-red">{errors[field.key]}</p> : <p className="mt-1 text-xs text-grey-600">{field.help}</p>}
        </div>
      ))}
    </div>
  );
}

function save(filename: string, mime: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** The template that creates what Ductape builds on, to save and read before running it in the customer's own cloud. */
export function SetupFilesPanel({ provider, setup }: { provider: string; setup: Record<string, unknown> | undefined }) {
  const files = setupFiles(provider, setup);
  if (files.length === 0) return null;
  return (
    <div className="space-y-3 rounded-lg border border-grey-400 bg-white p-4 shadow-sm">
      <div>
        <h4 className="text-sm font-semibold text-grey">Setup files</h4>
        <p className="mt-1 text-xs text-grey-600">Read each one before you run it. They create resources in your own account; nothing in them is usable by anyone else.</p>
      </div>
      {files.map((file) => (
        <div key={file.filename} className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => save(file.filename, file.mime, file.text)}>
              <Download className="h-3.5 w-3.5" />Save {file.filename}
            </Button>
            <span className="text-xs text-grey-600">{file.label}</span>
          </div>
          <code className="block overflow-x-auto whitespace-pre rounded-md bg-grey-100 px-3 py-2 text-[11px] text-grey-700">{file.howTo}</code>
        </div>
      ))}
    </div>
  );
}

/** What a failed validation lacks, one line each, with how to put it right. */
export function AccessGapsPanel({ gaps }: { gaps: IAccessGaps }) {
  return (
    <div role="alert" className="space-y-2 rounded-lg border border-red/30 bg-red/5 p-4">
      <p className="text-sm font-semibold text-grey">{gaps.title}</p>
      <ul className="max-h-60 space-y-1 overflow-auto">
        {gaps.items.map((item) => (
          <li key={item.label} className="text-xs text-grey-600">
            <span className="font-mono text-grey">{item.label}</span>
            {item.detail ? <span> - {item.detail}</span> : null}
          </li>
        ))}
      </ul>
      <p className="text-xs text-grey-600">{gaps.fix}</p>
    </div>
  );
}
