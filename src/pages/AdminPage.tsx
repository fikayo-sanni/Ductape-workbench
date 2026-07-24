import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  CheckCircle,
  Loader,
  RefreshCw,
  Shield,
  XCircle,
} from 'lucide-react';
import apiClient from '@/config/axiosinstance';
import adminServices, {
  getInstanceStatus,
  hasAdminToken,
  InstanceStatusResponse,
} from '@/services/adminServices';
import { useAuth } from '@/store/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function tierBadge(tier: string | null | undefined) {
  if (!tier) return null;
  const colorMap: Record<string, string> = {
    starter: 'bg-blue-100 text-blue-800',
    team: 'bg-purple-100 text-purple-800',
    business: 'bg-green-100 text-green-800',
  };
  const cls = colorMap[tier.toLowerCase()] || 'bg-grey-100 text-grey-700';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${cls}`}>
      {tier}
    </span>
  );
}

function statusBadge(status: string | null | undefined) {
  if (!status) return null;
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3" />
        Active
      </span>
    );
  }
  if (status === 'expired') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
        <AlertTriangle className="h-3 w-3" />
        Expired
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
      <XCircle className="h-3 w-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// License Tab
// ---------------------------------------------------------------------------

function LicenseTab({ instanceStatus, onRefresh }: {
  instanceStatus: InstanceStatusResponse | undefined;
  onRefresh: () => void;
}) {
  const [activationCode, setActivationCode] = useState('');
  const [activating, setActivating] = useState(false);

  const handleActivate = async () => {
    if (!activationCode.trim()) {
      toast.error('Please enter an activation code');
      return;
    }
    setActivating(true);
    try {
      await apiClient.post('/users/v1/instance-activate', {
        activation_code: activationCode.trim(),
        tier: 'starter',
        billing_period: 'monthly',
        instance_url: window.location.origin,
      });
      toast.success('Instance activated successfully');
      setActivationCode('');
      onRefresh();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { errors?: string } }; message?: string };
      toast.error(error?.response?.data?.errors || error?.message || 'Activation failed');
    } finally {
      setActivating(false);
    }
  };

  if (!instanceStatus) {
    return (
      <div className="flex justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { activated, tier, limits, expires_at, read_only } = instanceStatus;

  return (
    <div className="space-y-6">
      {read_only && (
        <div className="rounded-10px border border-yellow-300 bg-yellow-50 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <p className="text-sm text-yellow-800 font-medium">
            This instance is in read-only mode. The license has expired. Re-activate to restore full access.
          </p>
        </div>
      )}

      {activated ? (
        <section className="rounded-10px border border-grey-400 bg-white p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-grey">Current License</h2>
            {statusBadge('active')}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-grey-600 mb-1">Tier</p>
              {tierBadge(tier)}
            </div>
            <div>
              <p className="text-xs text-grey-600 mb-1">Expires</p>
              <p className="text-sm font-medium text-grey">{formatDate(expires_at)}</p>
            </div>
            {limits && (
              <>
                <div>
                  <p className="text-xs text-grey-600 mb-1">Max Users</p>
                  <p className="text-sm font-medium text-grey">
                    {limits.max_users ?? 'Unlimited'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-grey-600 mb-1">Max Workspaces</p>
                  <p className="text-sm font-medium text-grey">
                    {limits.max_workspaces ?? 'Unlimited'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-grey-600 mb-1">Max Products</p>
                  <p className="text-sm font-medium text-grey">
                    {limits.max_products ?? 'Unlimited'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-grey-600 mb-1">Max API Requests / Month</p>
                  <p className="text-sm font-medium text-grey">
                    {limits.max_api_requests_month ?? 'Unlimited'}
                  </p>
                </div>
              </>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-10px border border-grey-400 bg-white p-6 text-center space-y-3">
          <Shield className="h-10 w-10 text-grey-400 mx-auto" />
          <p className="text-grey font-semibold">No license activated</p>
          <p className="text-sm text-grey-600">
            Activate a license to unlock usage limits and access controls.{' '}
            <a
              href="https://ductape.app/pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Purchase a license
            </a>
          </p>
        </section>
      )}

      <section className="rounded-10px border border-grey-400 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-grey">
          {activated ? 'Re-activate' : 'Activate License'}
        </h2>
        <p className="text-sm text-grey-600">
          Enter your activation code from the Ductape cloud dashboard.
        </p>
        <div className="flex gap-3 max-w-md">
          <Input
            placeholder="Activation code"
            value={activationCode}
            onChange={(e) => setActivationCode(e.target.value)}
            className="h-10"
          />
          <Button onClick={handleActivate} disabled={activating} className="h-10 px-6">
            {activating ? <Loader className="h-4 w-4 animate-spin" /> : 'Activate'}
          </Button>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cloud Admin — Licenses tab
// ---------------------------------------------------------------------------

interface LicenseRow {
  _id: string;
  activation_code: string;
  tier: string;
  billing_period: string;
  status: string;
  purchased_by_email: string;
  instance_url: string;
  activated_at: string;
  expires_at: string | null;
}

function CloudLicensesTab() {
  const [statusFilter, setStatusFilter] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [page, setPage] = useState(1);
  const [editTarget, setEditTarget] = useState<LicenseRow | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [revokeTarget, setRevokeTarget] = useState<LicenseRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    tier: 'starter',
    billing_period: 'monthly',
    purchased_by_email: '',
    activation_code: '',
  });

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-licenses', statusFilter, tierFilter, page],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (tierFilter) params.tier = tierFilter;
      const res = await adminServices.listLicenses(params as any);
      return res.data;
    },
  });

  const licenses: LicenseRow[] = data?.data?.licenses ?? data?.data ?? [];
  const total: number = data?.data?.total ?? licenses.length;
  const pageCount = Math.ceil(total / 20);

  const { mutate: revoke, isPending: revoking } = useMutation({
    mutationFn: (id: string) => adminServices.revokeLicense(id),
    onSuccess: () => {
      toast.success('License revoked');
      setRevokeTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-licenses'] });
    },
    onError: () => toast.error('Failed to revoke license'),
  });

  const { mutate: updateLicense, isPending: updating } = useMutation({
    mutationFn: ({ id, data: d }: { id: string; data: object }) =>
      adminServices.updateLicense(id, d),
    onSuccess: () => {
      toast.success('License updated');
      setEditTarget(null);
      queryClient.invalidateQueries({ queryKey: ['admin-licenses'] });
    },
    onError: () => toast.error('Failed to update license'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="All tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All tiers</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="team">Team</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setCreateOpen(true)} size="sm">
          Create License
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="rounded-10px border border-grey-400 bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Instance URL</TableHead>
                  <TableHead>Activated</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {licenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-grey-600 py-8">
                      No licenses found
                    </TableCell>
                  </TableRow>
                ) : (
                  licenses.map((lic) => (
                    <TableRow key={lic._id}>
                      <TableCell className="font-mono text-xs">{lic.activation_code}</TableCell>
                      <TableCell>{tierBadge(lic.tier)}</TableCell>
                      <TableCell className="capitalize text-sm">{lic.billing_period}</TableCell>
                      <TableCell>{statusBadge(lic.status)}</TableCell>
                      <TableCell className="text-sm">{lic.purchased_by_email}</TableCell>
                      <TableCell className="text-sm max-w-[160px] truncate">{lic.instance_url || 'N/A'}</TableCell>
                      <TableCell className="text-sm">{formatDate(lic.activated_at)}</TableCell>
                      <TableCell className="text-sm">{formatDate(lic.expires_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              setEditTarget(lic);
                              setEditForm({
                                tier: lic.tier,
                                billing_period: lic.billing_period,
                                status: lic.status,
                                purchased_by_email: lic.purchased_by_email,
                              });
                            }}
                          >
                            Edit
                          </Button>
                          {lic.status !== 'revoked' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-red border-red hover:bg-red hover:text-white"
                              onClick={() => setRevokeTarget(lic)}
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-grey-600">
                Page {page} of {pageCount}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= pageCount}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit dialog */}
      <Dialog open={Boolean(editTarget)} onOpenChange={(open) => { if (!open) setEditTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit License</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Tier</Label>
              <Select value={editForm.tier} onValueChange={(v) => setEditForm({ ...editForm, tier: v })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Billing Period</Label>
              <Select value={editForm.billing_period} onValueChange={(v) => setEditForm({ ...editForm, billing_period: v })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Purchased By Email</Label>
              <Input
                className="mt-1.5"
                value={editForm.purchased_by_email}
                onChange={(e) => setEditForm({ ...editForm, purchased_by_email: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button
                disabled={updating}
                onClick={() => {
                  if (editTarget) {
                    updateLicense({ id: editTarget._id, data: editForm });
                  }
                }}
              >
                {updating ? <Loader className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke confirm dialog */}
      <Dialog open={Boolean(revokeTarget)} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke License</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-grey-600 pt-2">
            Are you sure you want to revoke this license? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>Cancel</Button>
            <Button
              className="bg-red hover:bg-red/90 text-white"
              disabled={revoking}
              onClick={() => { if (revokeTarget) revoke(revokeTarget._id); }}
            >
              {revoking ? <Loader className="h-4 w-4 animate-spin" /> : 'Revoke'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create license dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create License Manually</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Tier</Label>
              <Select value={createForm.tier} onValueChange={(v) => setCreateForm({ ...createForm, tier: v })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="team">Team</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Billing Period</Label>
              <Select value={createForm.billing_period} onValueChange={(v) => setCreateForm({ ...createForm, billing_period: v })}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Purchased By Email</Label>
              <Input
                className="mt-1.5"
                placeholder="user@example.com"
                value={createForm.purchased_by_email}
                onChange={(e) => setCreateForm({ ...createForm, purchased_by_email: e.target.value })}
              />
            </div>
            <div>
              <Label>Activation Code (optional)</Label>
              <Input
                className="mt-1.5"
                placeholder="Leave blank to auto-generate"
                value={createForm.activation_code}
                onChange={(e) => setCreateForm({ ...createForm, activation_code: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button
                onClick={async () => {
                  try {
                    await adminServices.updateLicense('create', createForm);
                    toast.success('License created');
                    setCreateOpen(false);
                    queryClient.invalidateQueries({ queryKey: ['admin-licenses'] });
                  } catch {
                    toast.error('Failed to create license');
                  }
                }}
              >
                Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cloud Admin — Purchases tab
// ---------------------------------------------------------------------------

interface PurchaseRow {
  _id: string;
  created_at: string;
  tier: string;
  billing_period: string;
  email: string;
  paystack_reference: string;
  amount: number;
  status: string;
}

function PurchasesTab() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-purchases', page],
    queryFn: async () => {
      const res = await adminServices.listPurchases({ page, limit: 20 });
      return res.data;
    },
  });

  const purchases: PurchaseRow[] = data?.data?.purchases ?? data?.data ?? [];
  const summary = data?.data?.summary ?? {};
  const total: number = data?.data?.total ?? purchases.length;
  const pageCount = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-10px border border-grey-400 bg-white p-4">
          <p className="text-xs text-grey-600 mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-grey">
            ${(summary.total_revenue ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-10px border border-grey-400 bg-white p-4">
          <p className="text-xs text-grey-600 mb-1">Active Licenses</p>
          <p className="text-2xl font-bold text-grey">{summary.active_count ?? 0}</p>
        </div>
        <div className="rounded-10px border border-grey-400 bg-white p-4">
          <p className="text-xs text-grey-600 mb-1">Expired Licenses</p>
          <p className="text-2xl font-bold text-grey">{summary.expired_count ?? 0}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="rounded-10px border border-grey-400 bg-white overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-grey-600 py-8">
                      No purchases found
                    </TableCell>
                  </TableRow>
                ) : (
                  purchases.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell className="text-sm">{formatDate(p.created_at)}</TableCell>
                      <TableCell>{tierBadge(p.tier)}</TableCell>
                      <TableCell className="capitalize text-sm">{p.billing_period}</TableCell>
                      <TableCell className="text-sm">{p.email}</TableCell>
                      <TableCell className="font-mono text-xs">{p.paystack_reference}</TableCell>
                      <TableCell className="text-sm">${(p.amount / 100).toFixed(2)}</TableCell>
                      <TableCell>{statusBadge(p.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-grey-600">Page {page} of {pageCount}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="outline" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Users tab
// ---------------------------------------------------------------------------

interface UserRow {
  _id: string;
  firstname: string;
  lastname: string;
  email: string;
  created: string;
  status: string;
}

function UsersTab({ instanceStatus }: { instanceStatus: InstanceStatusResponse | undefined }) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users-list'],
    queryFn: async () => {
      const res = await apiClient.get('/users/v1/details/users', {
        params: { limit: 100 },
      });
      return res.data;
    },
    enabled: Boolean(user?._id),
  });

  const users: UserRow[] = data?.data?.users ?? [];
  const maxUsers = instanceStatus?.limits?.max_users ?? null;
  const userCount = users.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-grey">Users</h2>
          {maxUsers !== null && (
            <p className="text-sm text-grey-600 mt-0.5">
              {userCount} / {maxUsers} users
            </p>
          )}
        </div>
        {maxUsers !== null && (
          <div className="text-right">
            <div className="w-48 h-2 rounded-full bg-grey-200">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${Math.min((userCount / maxUsers) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-grey-600 mt-1">
              {Math.round((userCount / maxUsers) * 100)}% of limit
            </p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-10px border border-grey-400 bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-grey-600 py-8">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u._id}>
                    <TableCell className="text-sm font-medium text-grey">
                      {u.firstname} {u.lastname}
                    </TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell className="text-sm">{formatDate(u.created)}</TableCell>
                    <TableCell>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        u.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-grey-100 text-grey-600'
                      }`}>
                        {u.status ?? 'active'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workspaces tab
// ---------------------------------------------------------------------------

interface WorkspaceRow {
  _id?: string;
  workspace_id?: string;
  workspace_name?: string;
  name?: string;
  created_at?: string;
  createdAt?: string;
  memberCount?: number;
}

function WorkspacesTab({ instanceStatus }: { instanceStatus: InstanceStatusResponse | undefined }) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-workspaces-list', user?._id],
    queryFn: async () => {
      const res = await apiClient.get(`/workspaces/v1/fetch/${user!._id}`, {
        params: { public_key: user!.public_key, user_id: user!._id },
      });
      return res.data;
    },
    enabled: Boolean(user?._id && user?.public_key),
  });

  const workspaces: WorkspaceRow[] = data?.data ?? [];
  const maxWorkspaces = instanceStatus?.limits?.max_workspaces ?? null;
  const workspaceCount = workspaces.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-grey">Workspaces</h2>
          {maxWorkspaces !== null && (
            <p className="text-sm text-grey-600 mt-0.5">
              {workspaceCount} / {maxWorkspaces} workspaces
            </p>
          )}
        </div>
        {maxWorkspaces !== null && (
          <div className="text-right">
            <div className="w-48 h-2 rounded-full bg-grey-200">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${Math.min((workspaceCount / maxWorkspaces) * 100, 100)}%` }}
              />
            </div>
            <p className="text-xs text-grey-600 mt-1">
              {Math.round((workspaceCount / maxWorkspaces) * 100)}% of limit
            </p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="rounded-10px border border-grey-400 bg-white overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Members</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspaces.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-grey-600 py-8">
                    No workspaces found
                  </TableCell>
                </TableRow>
              ) : (
                workspaces.map((w, idx) => (
                  <TableRow key={w.workspace_id ?? w._id ?? idx}>
                    <TableCell className="text-sm font-medium text-grey">
                      {w.workspace_name ?? w.name ?? 'Unnamed'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(w.created_at ?? w.createdAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {w.memberCount ?? 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Instance Health tab
// ---------------------------------------------------------------------------

function InstanceHealthTab({ instanceStatus, onValidate, validating }: {
  instanceStatus: InstanceStatusResponse | undefined;
  onValidate: () => void;
  validating: boolean;
}) {
  if (!instanceStatus) {
    return (
      <div className="flex justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const { activated, tier, expires_at, read_only } = instanceStatus;

  return (
    <div className="space-y-6">
      {read_only && (
        <div className="rounded-10px border border-yellow-300 bg-yellow-50 p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-800">Read-Only Mode Active</p>
            <p className="text-xs text-yellow-700 mt-0.5">
              The license has expired. Existing data is readable but new writes are blocked.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-10px border border-grey-400 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-grey">Instance Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-grey-600 mb-1">Activation</p>
            {activated ? statusBadge('active') : <span className="text-sm text-grey-600">Not activated</span>}
          </div>
          <div>
            <p className="text-xs text-grey-600 mb-1">Tier</p>
            {tierBadge(tier) ?? <span className="text-sm text-grey-600">None</span>}
          </div>
          <div>
            <p className="text-xs text-grey-600 mb-1">Expires</p>
            <p className="text-sm font-medium text-grey">{formatDate(expires_at)}</p>
          </div>
          <div>
            <p className="text-xs text-grey-600 mb-1">Read-Only Mode</p>
            <p className={`text-sm font-semibold ${read_only ? 'text-yellow-700' : 'text-green-700'}`}>
              {read_only ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-10px border border-grey-400 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-grey">License Validation</h2>
            <p className="text-sm text-grey-600 mt-1">
              Manually trigger a validation check against the Ductape cloud.
            </p>
          </div>
          <Button onClick={onValidate} disabled={validating} className="flex items-center gap-2">
            {validating ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Validate now
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main AdminPage
// ---------------------------------------------------------------------------

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [validating, setValidating] = useState(false);
  const isCloudAdmin = hasAdminToken();

  const { data: statusData, refetch: refetchStatus } = useQuery({
    queryKey: ['instance-status'],
    queryFn: getInstanceStatus,
    staleTime: 30_000,
  });

  const instanceStatus = statusData;

  const handleRefreshStatus = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['instance-status'] });
    void refetchStatus();
  }, [queryClient, refetchStatus]);

  const handleValidate = async () => {
    setValidating(true);
    try {
      await apiClient.get('/users/v1/instance-validate');
      toast.success('Validation complete');
      handleRefreshStatus();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { errors?: string } }; message?: string };
      toast.error(error?.response?.data?.errors || error?.message || 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-grey-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-grey">Instance Admin</h1>
          <p className="text-grey-600 text-sm">
            Manage your self-hosted Ductape instance, license, and users.
          </p>
        </div>

        <Tabs defaultValue="license">
          <TabsList className="bg-white border border-grey-400 rounded-10px p-1">
            <TabsTrigger value="license" className="rounded-md">License</TabsTrigger>
            {isCloudAdmin && (
              <TabsTrigger value="cloud-licenses" className="rounded-md">
                Licenses (Cloud Admin)
              </TabsTrigger>
            )}
            {isCloudAdmin && (
              <TabsTrigger value="purchases" className="rounded-md">Purchases</TabsTrigger>
            )}
            <TabsTrigger value="users" className="rounded-md">Users</TabsTrigger>
            <TabsTrigger value="workspaces" className="rounded-md">Workspaces</TabsTrigger>
            <TabsTrigger value="health" className="rounded-md">Instance Health</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="license">
              <LicenseTab instanceStatus={instanceStatus} onRefresh={handleRefreshStatus} />
            </TabsContent>

            {isCloudAdmin && (
              <TabsContent value="cloud-licenses">
                <CloudLicensesTab />
              </TabsContent>
            )}

            {isCloudAdmin && (
              <TabsContent value="purchases">
                <PurchasesTab />
              </TabsContent>
            )}

            <TabsContent value="users">
              <UsersTab instanceStatus={instanceStatus} />
            </TabsContent>

            <TabsContent value="workspaces">
              <WorkspacesTab instanceStatus={instanceStatus} />
            </TabsContent>

            <TabsContent value="health">
              <InstanceHealthTab
                instanceStatus={instanceStatus}
                onValidate={handleValidate}
                validating={validating}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
