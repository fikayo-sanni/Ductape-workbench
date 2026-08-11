import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  clearAgentKeyConfig,
  DEFAULT_MODEL,
  loadAgentKeyConfig,
  MODEL_OPTIONS,
  saveAgentKeyConfig,
  type AgentProvider,
} from '@/services/agent/keyStorage';

const CUSTOM_MODEL_VALUE = '__custom__';

interface AgentSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export default function AgentSettingsDialog({ open, onOpenChange, onSaved }: AgentSettingsDialogProps) {
  const [provider, setProvider] = useState<AgentProvider>('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [modelSelection, setModelSelection] = useState(DEFAULT_MODEL.anthropic);
  const [customModel, setCustomModel] = useState('');

  useEffect(() => {
    if (!open) return;
    const existing = loadAgentKeyConfig();
    if (!existing) return;
    setProvider(existing.provider);
    setApiKey(existing.apiKey);
    if (MODEL_OPTIONS[existing.provider].includes(existing.model)) {
      setModelSelection(existing.model);
      setCustomModel('');
    } else {
      setModelSelection(CUSTOM_MODEL_VALUE);
      setCustomModel(existing.model);
    }
  }, [open]);

  const handleProviderChange = (value: string) => {
    const next = value as AgentProvider;
    setProvider(next);
    setModelSelection(DEFAULT_MODEL[next]);
    setCustomModel('');
  };

  const resolvedModel = modelSelection === CUSTOM_MODEL_VALUE ? customModel.trim() : modelSelection;

  const handleSave = () => {
    if (!apiKey.trim() || !resolvedModel) return;
    saveAgentKeyConfig({ provider, apiKey: apiKey.trim(), model: resolvedModel });
    onSaved();
    onOpenChange(false);
  };

  const handleRemove = () => {
    clearAgentKeyConfig();
    setApiKey('');
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AI Assistant settings</DialogTitle>
          <DialogDescription>
            Bring your own API key. It's stored only in this browser and sent directly to your chosen provider.
            Ductape never sees it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agent-provider">Provider</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger id="agent-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-api-key">API key</Label>
            <Input
              id="agent-api-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agent-model">Model</Label>
            <Select value={modelSelection} onValueChange={setModelSelection}>
              <SelectTrigger id="agent-model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS[provider].map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_MODEL_VALUE}>Custom model ID</SelectItem>
              </SelectContent>
            </Select>
            {modelSelection === CUSTOM_MODEL_VALUE && (
              <Input
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                placeholder="Exact model ID from your provider"
                autoComplete="off"
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleRemove} type="button">
            Remove key
          </Button>
          <Button onClick={handleSave} disabled={!apiKey.trim() || !resolvedModel} type="button">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
