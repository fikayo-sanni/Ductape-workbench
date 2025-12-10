import { useState } from 'react';
import {
  Brain,
  Plus,
  Info,
  Loader2,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { useWorkbenchStore } from '@/stores/workbench-store';

interface NewModelTabContentProps {
  productId?: string;
  productTag?: string;
  productEnvs?: Array<{ slug: string; active?: boolean }>;
  onSave?: (data: any) => void;
}

type LLMProvider = 'anthropic' | 'openai' | 'google' | 'cohere' | 'custom';

interface ModelEnvConfig {
  slug: string;
  apiKey: string;
  baseUrl?: string;
  active: boolean;
}

const LLM_PROVIDERS: { value: LLMProvider; label: string; models: string[] }[] = [
  {
    value: 'anthropic',
    label: 'Anthropic',
    models: [
      'claude-opus-4-20250514',
      'claude-sonnet-4-20250514',
      'claude-3-5-sonnet-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ],
  },
  {
    value: 'openai',
    label: 'OpenAI',
    models: [
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-4',
      'gpt-4-32k',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
    ],
  },
  {
    value: 'google',
    label: 'Google',
    models: [
      'gemini-2.0-flash',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-pro',
    ],
  },
  {
    value: 'cohere',
    label: 'Cohere',
    models: [
      'command-r-plus',
      'command-r',
      'command',
      'command-light',
    ],
  },
  {
    value: 'custom',
    label: 'Custom',
    models: [],
  },
];

export default function NewModelTabContent({
  productId,
  productTag,
  productEnvs = [],
  onSave,
}: NewModelTabContentProps) {
  const { updateTab, activeTabId } = useWorkbenchStore();

  // Form state
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState<LLMProvider>('anthropic');
  const [model, setModel] = useState('claude-sonnet-4-20250514');
  const [customModel, setCustomModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState<number | undefined>(undefined);
  const [topP, setTopP] = useState<number | undefined>(undefined);
  const [timeout, setTimeout] = useState<number | undefined>(undefined);
  const [envConfigs, setEnvConfigs] = useState<ModelEnvConfig[]>(
    productEnvs.map((env) => ({
      slug: env.slug,
      apiKey: '',
      baseUrl: '',
      active: env.active ?? true,
    }))
  );

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Get available models for current provider
  const availableModels = LLM_PROVIDERS.find((p) => p.value === provider)?.models || [];

  // Auto-generate tag from name
  const handleNameChange = (value: string) => {
    setName(value);
    const generatedTag = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setTag(generatedTag);
  };

  // Handle provider change
  const handleProviderChange = (newProvider: LLMProvider) => {
    setProvider(newProvider);
    const providerModels = LLM_PROVIDERS.find((p) => p.value === newProvider)?.models || [];
    if (providerModels.length > 0) {
      setModel(providerModels[0]);
    } else {
      setModel('');
    }
  };

  // Update env config
  const handleEnvConfigChange = (
    slug: string,
    field: keyof ModelEnvConfig,
    value: string | boolean
  ) => {
    setEnvConfigs((prev) =>
      prev.map((env) =>
        env.slug === slug ? { ...env, [field]: value } : env
      )
    );
  };

  // Validate form
  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!tag.trim()) {
      newErrors.tag = 'Tag is required';
    } else if (!/^[a-z0-9-]+$/.test(tag)) {
      newErrors.tag = 'Tag must be lowercase letters, numbers, and hyphens only';
    }

    if (provider === 'custom' && !customModel.trim()) {
      newErrors.model = 'Model name is required for custom provider';
    } else if (provider !== 'custom' && !model) {
      newErrors.model = 'Please select a model';
    }

    // Check at least one env has API key
    const hasApiKey = envConfigs.some((env) => env.apiKey.trim());
    if (!hasApiKey) {
      newErrors.envs = 'At least one environment must have an API key';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validate()) {
      toast.error('Please fix the validation errors');
      return;
    }

    setIsSaving(true);
    try {
      const modelData = {
        name,
        tag,
        description,
        provider,
        model: provider === 'custom' ? customModel : model,
        temperature,
        ...(maxTokens && { maxTokens }),
        ...(topP && { topP }),
        ...(timeout && { timeout }),
        envs: envConfigs.filter((env) => env.apiKey.trim()),
      };

      // Call onSave if provided
      if (onSave) {
        await onSave(modelData);
      }

      // Update tab to remove dirty state
      if (activeTabId) {
        updateTab(activeTabId, { isDirty: false });
      }

      toast.success('Model configuration created successfully');
    } catch (error) {
      toast.error('Failed to create model configuration');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full overflow-auto bg-grey-100">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-rose-500/10 flex items-center justify-center">
            <Brain className="h-6 w-6 text-rose-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-grey">New LLM Model</h1>
            <p className="text-sm text-grey-600">Configure a reusable LLM model for your agents</p>
          </div>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-grey mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name" className="flex items-center gap-1">
                  Name
                  <span className="text-red">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Claude Sonnet"
                  className={cn('mt-1', errors.name && 'border-red')}
                />
                {errors.name && <p className="text-xs text-red mt-1">{errors.name}</p>}
              </div>
              <div>
                <Label htmlFor="tag" className="flex items-center gap-1">
                  Tag
                  <span className="text-red">*</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-grey-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Reference this tag in your agent definitions</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="tag"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="claude-sonnet"
                  className={cn('mt-1 font-mono', errors.tag && 'border-red')}
                />
                {errors.tag && <p className="text-xs text-red mt-1">{errors.tag}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this model configuration..."
                className="mt-1 h-20"
              />
            </div>
          </div>
        </div>

        {/* Model Configuration */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-grey mb-4">Model Configuration</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Provider</Label>
                <Select value={provider} onValueChange={(v) => handleProviderChange(v as LLMProvider)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LLM_PROVIDERS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-1">
                  Model
                  <span className="text-red">*</span>
                </Label>
                {provider === 'custom' ? (
                  <Input
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="model-name"
                    className={cn('mt-1', errors.model && 'border-red')}
                  />
                ) : (
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className={cn('mt-1', errors.model && 'border-red')}>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {errors.model && <p className="text-xs text-red mt-1">{errors.model}</p>}
              </div>
            </div>

            {/* Temperature Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="flex items-center gap-1">
                  Temperature
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-grey-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Controls randomness. Lower = more focused, higher = more creative</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <span className="text-sm font-medium text-grey">{temperature}</span>
              </div>
              <Slider
                value={[temperature]}
                onValueChange={(val) => setTemperature(val[0])}
                min={0}
                max={2}
                step={0.1}
              />
              <div className="flex justify-between text-xs text-grey-500 mt-1">
                <span>Focused (0)</span>
                <span>Balanced (1)</span>
                <span>Creative (2)</span>
              </div>
            </div>

            {/* Advanced Options Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-primary hover:underline"
            >
              {showAdvanced ? 'Hide' : 'Show'} advanced options
            </button>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-grey-400">
                <div>
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    value={maxTokens || ''}
                    onChange={(e) => setMaxTokens(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    placeholder="4096"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="topP">Top P</Label>
                  <Input
                    id="topP"
                    type="number"
                    step="0.1"
                    min="0"
                    max="1"
                    value={topP || ''}
                    onChange={(e) => setTopP(e.target.value ? parseFloat(e.target.value) : undefined)}
                    placeholder="1.0"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="timeout">Timeout (ms)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={timeout || ''}
                    onChange={(e) => setTimeout(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    placeholder="30000"
                    className="mt-1"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Environment Configuration */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-grey mb-4">API Keys</h2>
          <p className="text-sm text-grey-600 mb-4">
            API keys are encrypted and stored securely. Configure keys for each environment.
          </p>
          {errors.envs && <p className="text-xs text-red mb-4">{errors.envs}</p>}

          {envConfigs.length > 0 ? (
            <div className="space-y-4">
              {envConfigs.map((env) => (
                <div
                  key={env.slug}
                  className="p-4 rounded-lg border border-grey-400 bg-grey-50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-grey">{env.slug}</span>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={env.active}
                        onChange={(e) =>
                          handleEnvConfigChange(env.slug, 'active', e.target.checked)
                        }
                        className="rounded border-grey-400"
                      />
                      Active
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">API Key</Label>
                      <Input
                        type="password"
                        value={env.apiKey}
                        onChange={(e) =>
                          handleEnvConfigChange(env.slug, 'apiKey', e.target.value)
                        }
                        placeholder="sk-..."
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Base URL (optional)</Label>
                      <Input
                        value={env.baseUrl}
                        onChange={(e) =>
                          handleEnvConfigChange(env.slug, 'baseUrl', e.target.value)
                        }
                        placeholder="https://api.provider.com"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-grey-500">
              <p className="text-sm">No environments configured for this product</p>
              <p className="text-xs mt-1">Add environments to the product first</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pb-6">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Create Model
          </Button>
        </div>
      </div>
    </div>
  );
}
