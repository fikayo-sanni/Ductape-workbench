import { useState } from 'react';
import {
  Boxes,
  Plus,
  Trash2,
  Info,
  Loader2,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface NewVectorTabContentProps {
  productId?: string;
  productTag?: string;
  productEnvs?: Array<{ slug: string; active?: boolean }>;
  onSave?: (data: any) => void;
}

type VectorProvider = 'pinecone' | 'qdrant' | 'weaviate' | 'milvus' | 'chroma' | 'pgvector';
type DistanceMetric = 'cosine' | 'euclidean' | 'dotproduct';

interface VectorEnvConfig {
  slug: string;
  apiKey: string;
  baseUrl?: string;
  active: boolean;
}

const VECTOR_PROVIDERS: { value: VectorProvider; label: string; description: string }[] = [
  { value: 'pinecone', label: 'Pinecone', description: 'Fully managed vector database' },
  { value: 'qdrant', label: 'Qdrant', description: 'High-performance vector similarity engine' },
  { value: 'weaviate', label: 'Weaviate', description: 'AI-native vector database' },
  { value: 'milvus', label: 'Milvus', description: 'Open-source vector database' },
  { value: 'chroma', label: 'Chroma', description: 'Lightweight embedding database' },
  { value: 'pgvector', label: 'PGVector', description: 'PostgreSQL vector extension' },
];

const DISTANCE_METRICS: { value: DistanceMetric; label: string; description: string }[] = [
  { value: 'cosine', label: 'Cosine Similarity', description: 'Measures angle between vectors (most common)' },
  { value: 'euclidean', label: 'Euclidean Distance', description: 'Measures straight-line distance' },
  { value: 'dotproduct', label: 'Dot Product', description: 'Measures magnitude and direction' },
];

const COMMON_DIMENSIONS = [
  { value: 384, label: '384 (all-MiniLM-L6)' },
  { value: 768, label: '768 (BERT-base)' },
  { value: 1024, label: '1024 (text-embedding-3-small)' },
  { value: 1536, label: '1536 (text-embedding-ada-002)' },
  { value: 3072, label: '3072 (text-embedding-3-large)' },
];

export default function NewVectorTabContent({
  productId,
  productTag,
  productEnvs = [],
  onSave,
}: NewVectorTabContentProps) {
  const { updateTab, activeTabId } = useWorkbenchStore();

  // Form state
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState<VectorProvider>('pinecone');
  const [dimensions, setDimensions] = useState<number>(1536);
  const [customDimensions, setCustomDimensions] = useState('');
  const [metric, setMetric] = useState<DistanceMetric>('cosine');
  const [indexName, setIndexName] = useState('');
  const [envConfigs, setEnvConfigs] = useState<VectorEnvConfig[]>(
    productEnvs.map((env) => ({
      slug: env.slug,
      apiKey: '',
      baseUrl: '',
      active: env.active ?? true,
    }))
  );

  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-generate tag from name
  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate tag if user hasn't manually edited it
    const generatedTag = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setTag(generatedTag);
  };

  // Update env config
  const handleEnvConfigChange = (
    slug: string,
    field: keyof VectorEnvConfig,
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

    if (!dimensions || dimensions < 1) {
      newErrors.dimensions = 'Dimensions must be a positive number';
    }

    if (!indexName.trim()) {
      newErrors.indexName = 'Index name is required';
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
      const vectorData = {
        name,
        tag,
        description,
        provider,
        dimensions: customDimensions ? parseInt(customDimensions, 10) : dimensions,
        metric,
        indexName,
        envs: envConfigs.filter((env) => env.apiKey.trim()),
      };

      // Call onSave if provided
      if (onSave) {
        await onSave(vectorData);
      }

      // Update tab to remove dirty state
      if (activeTabId) {
        updateTab(activeTabId, { isDirty: false });
      }

      toast.success('Vector store created successfully');
    } catch (error) {
      toast.error('Failed to create vector store');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full overflow-auto bg-grey-100">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Boxes className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-grey">New Vector Store</h1>
            <p className="text-sm text-grey-600">Configure a vector database for semantic search and embeddings</p>
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
                  placeholder="Product Embeddings"
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
                        <p>Unique identifier used in SDK calls</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="tag"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="product-embeddings"
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
                placeholder="Describe what this vector store is used for..."
                className="mt-1 h-20"
              />
            </div>
          </div>
        </div>

        {/* Provider Configuration */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-grey mb-4">Provider Configuration</h2>
          <div className="space-y-4">
            <div>
              <Label>Vector Database Provider</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as VectorProvider)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VECTOR_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <div>
                        <span className="font-medium">{p.label}</span>
                        <span className="text-grey-500 ml-2 text-xs">{p.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="indexName" className="flex items-center gap-1">
                Index / Collection Name
                <span className="text-red">*</span>
              </Label>
              <Input
                id="indexName"
                value={indexName}
                onChange={(e) => setIndexName(e.target.value)}
                placeholder="my-index"
                className={cn('mt-1', errors.indexName && 'border-red')}
              />
              {errors.indexName && <p className="text-xs text-red mt-1">{errors.indexName}</p>}
              <p className="text-xs text-grey-500 mt-1">The name of the index or collection in your vector database</p>
            </div>
          </div>
        </div>

        {/* Vector Configuration */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-grey mb-4">Vector Configuration</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="flex items-center gap-1">
                  Dimensions
                  <span className="text-red">*</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-grey-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Must match your embedding model's output dimensions</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Select
                  value={dimensions.toString()}
                  onValueChange={(v) => {
                    if (v === 'custom') {
                      setDimensions(0);
                    } else {
                      setDimensions(parseInt(v, 10));
                      setCustomDimensions('');
                    }
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_DIMENSIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value.toString()}>
                        {d.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
                {dimensions === 0 && (
                  <Input
                    type="number"
                    value={customDimensions}
                    onChange={(e) => setCustomDimensions(e.target.value)}
                    placeholder="Enter custom dimensions"
                    className="mt-2"
                  />
                )}
              </div>

              <div>
                <Label>Distance Metric</Label>
                <Select value={metric} onValueChange={(v) => setMetric(v as DistanceMetric)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTANCE_METRICS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        <div>
                          <span className="font-medium">{m.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-grey-500 mt-1">
                  {DISTANCE_METRICS.find((m) => m.value === metric)?.description}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Environment Configuration */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-grey mb-4">Environment Configuration</h2>
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
                        placeholder="Enter API key"
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
                        placeholder="https://..."
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
            Create Vector Store
          </Button>
        </div>
      </div>
    </div>
  );
}
