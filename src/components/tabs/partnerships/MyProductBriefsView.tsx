import { useState } from 'react';
import { Plus, FileText, Edit, Trash2, Eye, EyeOff, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getDummyWorkspaceBriefs } from '@/data/partnerships.dummy';
import { BriefStatus, IProductBrief } from '@/types/partnership';
import { cn } from '@/lib/utils';
import CreateEditBriefDialog from './CreateEditBriefDialog';
import toast from 'react-hot-toast';

export default function MyProductBriefsView() {
  const [selectedBrief, setSelectedBrief] = useState<IProductBrief | null>(null);
  const [showCreateEditDialog, setShowCreateEditDialog] = useState(false);
  const [statusFilter] = useState<BriefStatus>(BriefStatus.ALL);

  // Mock workspace ID - in real app, get from auth context
  const currentWorkspaceId = 'ws_001';

  // Get briefs for current workspace
  const briefs = getDummyWorkspaceBriefs(currentWorkspaceId, statusFilter);

  const draftBriefs = briefs.filter((b) => b.status === BriefStatus.DRAFT);
  const publishedBriefs = briefs.filter((b) => b.status === BriefStatus.PUBLISHED);

  const handleCreate = () => {
    setSelectedBrief(null);
    setShowCreateEditDialog(true);
  };

  const handleEdit = (brief: IProductBrief) => {
    setSelectedBrief(brief);
    setShowCreateEditDialog(true);
  };

  const handlePublish = (brief: IProductBrief) => {
    toast.success(`"${brief.title}" published successfully`);
  };

  const handleUnpublish = (brief: IProductBrief) => {
    toast.success(`"${brief.title}" unpublished successfully`);
  };

  const handleDelete = (brief: IProductBrief) => {
    if (confirm(`Are you sure you want to delete "${brief.title}"?`)) {
      toast.success(`"${brief.title}" deleted successfully`);
    }
  };

  const BriefCard = ({ brief }: { brief: IProductBrief }) => (
    <div className="bg-white rounded-lg border border-grey-400 p-6 hover:border-primary transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-grey">{brief.title}</h3>
            <Badge
              variant="secondary"
              className={cn(
                brief.status === BriefStatus.PUBLISHED && 'bg-green/10 text-green',
                brief.status === BriefStatus.DRAFT && 'bg-yellow-500/10 text-yellow-700',
                brief.status === BriefStatus.UNPUBLISHED && 'bg-grey-400/10 text-grey-600'
              )}
            >
              {brief.status}
            </Badge>
          </div>
          <p className="text-sm text-grey-600 line-clamp-2 mb-3">{brief.description}</p>
          <p className="text-xs text-grey-500">
            Product: {brief.product?.app_name} • Updated{' '}
            {new Date(brief.updated_at).toLocaleDateString()}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleEdit(brief)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {brief.status === BriefStatus.DRAFT && (
              <DropdownMenuItem onClick={() => handlePublish(brief)}>
                <Eye className="h-4 w-4 mr-2" />
                Publish
              </DropdownMenuItem>
            )}
            {brief.status === BriefStatus.PUBLISHED && (
              <DropdownMenuItem onClick={() => handleUnpublish(brief)}>
                <EyeOff className="h-4 w-4 mr-2" />
                Unpublish
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => handleDelete(brief)} className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {brief.product_details && (
        <div className="text-sm text-grey-600 bg-grey-50 rounded p-3 line-clamp-3">
          {brief.product_details}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-grey mb-2">My Product Briefs</h2>
            <p className="text-sm text-grey-600">
              Create and manage product briefs to showcase your services to potential partners
            </p>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Brief
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-grey-400 p-4">
          <p className="text-2xl font-bold text-grey">{publishedBriefs.length}</p>
          <p className="text-sm text-grey-600">Published</p>
        </div>
        <div className="bg-white rounded-lg border border-grey-400 p-4">
          <p className="text-2xl font-bold text-grey">{draftBriefs.length}</p>
          <p className="text-sm text-grey-600">Drafts</p>
        </div>
        <div className="bg-white rounded-lg border border-grey-400 p-4">
          <p className="text-2xl font-bold text-grey">{briefs.length}</p>
          <p className="text-sm text-grey-600">Total</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({briefs.length})</TabsTrigger>
          <TabsTrigger value="published">Published ({publishedBriefs.length})</TabsTrigger>
          <TabsTrigger value="drafts">Drafts ({draftBriefs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {briefs.length === 0 ? (
            <div className="bg-white rounded-lg border border-grey-400 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-grey-100 flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-grey-400" />
              </div>
              <h3 className="text-lg font-semibold text-grey mb-2">No briefs yet</h3>
              <p className="text-grey-600 mb-6 max-w-md mx-auto">
                Create your first product brief to start attracting potential partners
              </p>
              <Button onClick={handleCreate} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Brief
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {briefs.map((brief) => (
                <BriefCard key={brief._id} brief={brief} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="published" className="mt-6">
          {publishedBriefs.length === 0 ? (
            <div className="bg-white rounded-lg border border-grey-400 p-12 text-center">
              <p className="text-grey-600">No published briefs</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {publishedBriefs.map((brief) => (
                <BriefCard key={brief._id} brief={brief} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="drafts" className="mt-6">
          {draftBriefs.length === 0 ? (
            <div className="bg-white rounded-lg border border-grey-400 p-12 text-center">
              <p className="text-grey-600">No draft briefs</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {draftBriefs.map((brief) => (
                <BriefCard key={brief._id} brief={brief} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <CreateEditBriefDialog
        brief={selectedBrief}
        open={showCreateEditDialog}
        onOpenChange={setShowCreateEditDialog}
      />
    </div>
  );
}
