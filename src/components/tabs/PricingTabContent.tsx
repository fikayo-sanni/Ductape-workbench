import React, {useEffect, useState} from 'react';
import {
  Plus,
  Coins,
  Clock,
  Zap,
  TrendingUp,
  Edit,
  Trash2,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Users,
  Package,
  HardDrive,
  ShoppingBag,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Receipt,
  Clock1,
  Signal,
  ArrowLeft,
  Check,
} from 'lucide-react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import * as z from 'zod';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {useMutation, useQueryClient, useQuery} from '@tanstack/react-query';
import pricingServices from '@/services/pricingServices';
import toast from 'react-hot-toast';
import {useAuth} from '@/store/useAuth';
import {
  Pricing,
  PricingMode,
  PaymentInterval,
  PricingPlan,
  BillingPlan,
} from '@/types/pricing';
import {useWorkbenchStore} from '@/stores/workbench-store';
import BillingsInfo from '../billing-form';
import {useNavigate} from 'react-router-dom';

export type PricingBundle = Pricing;

// Bundle customer subscription interface
interface BundleCustomer {
  workspace_id: string;
  workspace_name: string;
  subscribed_date: string;
  status: 'active' | 'trialing' | 'past_due';
  mrr: number;
  api_usage: number;
  app_tags: string[];
}

// Map bundle IDs to their subscribed customers
const BUNDLE_CUSTOMERS: Record<string, BundleCustomer[]> = {
  price_1: [
    // Starter Plan
    {
      workspace_id: 'ws_003',
      workspace_name: 'DataFlow Systems',
      subscribed_date: '2024-08-15',
      status: 'active',
      mrr: 29,
      api_usage: 5000,
      app_tags: ['ductape:dashboard', 'ductape:pipeline'],
    },
    {
      workspace_id: 'ws_007',
      workspace_name: 'NextGen Solutions',
      subscribed_date: '2024-10-01',
      status: 'active',
      mrr: 29,
      api_usage: 3500,
      app_tags: ['ductape:crm'],
    },
  ],
  price_2: [
    // Professional Plan
    {
      workspace_id: 'ws_001',
      workspace_name: 'Acme Corporation',
      subscribed_date: '2024-01-10',
      status: 'active',
      mrr: 99,
      api_usage: 22000,
      app_tags: ['ductape:ecommerce', 'ductape:inventory'], //['E-commerce Platform', 'Inventory Manager', 'Customer Portal'],
    },
    {
      workspace_id: 'ws_005',
      workspace_name: 'Tech Innovators Inc',
      subscribed_date: '2024-06-20',
      status: 'active',
      mrr: 99,
      api_usage: 18000,
      app_tags: ['ductape:project_management', 'ductape:team_collaboration'],
    },
    {
      workspace_id: 'ws_008',
      workspace_name: 'Digital Ventures',
      subscribed_date: '2024-09-12',
      status: 'trialing',
      mrr: 0,
      api_usage: 12000,
      app_tags: ['ductape:marketing_automation', 'ductape:analytics'],
    },
  ],
  price_3: [
    // Enterprise Plan
    {
      workspace_id: 'ws_004',
      workspace_name: 'CloudNine Solutions',
      subscribed_date: '2023-11-05',
      status: 'active',
      mrr: 299,
      api_usage: 45000,
      app_tags: [
        'ductape:enterprise_erp',
        'ductape:hr_management',
        'ductape:financial_system',
        'ductape:supply_chain',
      ],
    },
    {
      workspace_id: 'ws_009',
      workspace_name: 'Global Systems Corp',
      subscribed_date: '2024-03-18',
      status: 'active',
      mrr: 299,
      api_usage: 38000,
      app_tags: [
        'ductape:multi_tenant_platform',
        'ductape:api_gateway',
        'ductape:data_warehouse',
      ],
    },
  ],
  price_4: [
    // Pay Per Request
    {
      workspace_id: 'ws_002',
      workspace_name: 'TechStart Inc',
      subscribed_date: '2024-02-28',
      status: 'active',
      mrr: 0,
      api_usage: 12300,
      app_tags: ['ductape:mobile_app_backend', 'ductape:push_notifications'],
    },
    {
      workspace_id: 'ws_006',
      workspace_name: 'Startup Labs',
      subscribed_date: '2024-07-10',
      status: 'active',
      mrr: 0,
      api_usage: 8500,
      app_tags: ['ductape:mvp_product', 'ductape:user_auth'],
    },
  ],
  price_5: [], // One-Time Setup Fee (no recurring customers)
};

// Expenditure types
enum ExpenditureStatus {
  PAID = 'paid',
  PENDING = 'pending',
  OVERDUE = 'overdue',
  FAILED = 'failed',
}

enum ExpenditureCategory {
  DUCTAPE_SUBSCRIPTION = 'ductape_subscription',
  BUNDLE_SUBSCRIPTION = 'bundle_subscription',
  USAGE_BASED = 'usage_based',
  INFRASTRUCTURE = 'infrastructure',
  SERVICES = 'services',
  HOSTING = 'hosting',
  SOFTWARE = 'software',
  OPERATIONS = 'operations',
  MARKETING = 'marketing',
}

interface Expenditure {
  _id: string;
  reference_number: string;
  vendor_name: string;
  category: ExpenditureCategory;
  amount: number;
  currency: string;
  status: ExpenditureStatus;
  due_date: string;
  paid_date?: string;
  description: string;
  workspace_id?: string; // For bundle subscriptions with other workspaces
  bundle_name?: string; // For bundle subscriptions
  usage_count?: number; // For usage-based billing
  created_at: string;
}

const DUMMY_EXPENDITURES: Expenditure[] = [
  // Ductape Platform Subscription
  {
    _id: 'exp_1',
    reference_number: 'DTP-2024-001',
    vendor_name: 'Ductape',
    category: ExpenditureCategory.DUCTAPE_SUBSCRIPTION,
    amount: 199,
    currency: 'USD',
    status: ExpenditureStatus.PAID,
    due_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    paid_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Ductape Enterprise Plan - Monthly subscription',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },

  // Bundle Subscriptions with other workspaces
  {
    _id: 'exp_2',
    reference_number: 'BUN-2024-001',
    vendor_name: 'Acme Corp Workspace',
    category: ExpenditureCategory.BUNDLE_SUBSCRIPTION,
    amount: 99,
    currency: 'USD',
    status: ExpenditureStatus.PAID,
    due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    paid_date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Professional API Bundle',
    workspace_id: 'ws_acme_001',
    bundle_name: 'Professional API Bundle',
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'exp_3',
    reference_number: 'BUN-2024-002',
    vendor_name: 'TechFlow Solutions',
    category: ExpenditureCategory.BUNDLE_SUBSCRIPTION,
    amount: 149,
    currency: 'USD',
    status: ExpenditureStatus.PENDING,
    due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Enterprise Integration Bundle',
    workspace_id: 'ws_techflow_001',
    bundle_name: 'Enterprise Integration Bundle',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },

  // Usage-based billing with other workspaces
  {
    _id: 'exp_4',
    reference_number: 'USG-2024-001',
    vendor_name: 'DataStream Inc',
    category: ExpenditureCategory.USAGE_BASED,
    amount: 45.5,
    currency: 'USD',
    status: ExpenditureStatus.PAID,
    due_date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    paid_date: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'API usage charges - 4,550 requests',
    workspace_id: 'ws_datastream_001',
    usage_count: 4550,
    created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'exp_5',
    reference_number: 'USG-2024-002',
    vendor_name: 'CloudSync Services',
    category: ExpenditureCategory.USAGE_BASED,
    amount: 78.25,
    currency: 'USD',
    status: ExpenditureStatus.PAID,
    due_date: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    paid_date: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Storage and sync - 7,825 requests',
    workspace_id: 'ws_cloudsync_001',
    usage_count: 7825,
    created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'exp_6',
    reference_number: 'USG-2024-003',
    vendor_name: 'API Gateway Pro',
    category: ExpenditureCategory.USAGE_BASED,
    amount: 124.0,
    currency: 'USD',
    status: ExpenditureStatus.OVERDUE,
    due_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Gateway services - 12,400 requests',
    workspace_id: 'ws_apigateway_001',
    usage_count: 12400,
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    _id: 'exp_7',
    reference_number: 'BUN-2024-003',
    vendor_name: 'FinTech Partners',
    category: ExpenditureCategory.BUNDLE_SUBSCRIPTION,
    amount: 299,
    currency: 'USD',
    status: ExpenditureStatus.PENDING,
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Premium Financial API Bundle',
    workspace_id: 'ws_fintech_001',
    bundle_name: 'Premium Financial API Bundle',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Income types
interface IncomeRecord {
  _id: string;
  month: string;
  revenue: number;
  invoices_count: number;
  paid_invoices: number;
  pending_invoices: number;
  average_invoice_value: number;
  currency: string;
}

// Workspace invoice details
interface WorkspaceInvoice {
  workspace_id: string;
  workspace_name: string;
  bundle_name: string;
  bundle_price: number;
  usage_count: number;
  usage_cost: number;
  total_amount: number;
  currency: string;
  status: 'paid' | 'pending';
}

// Map monthly income to workspace invoices
const WORKSPACE_INVOICES: Record<string, WorkspaceInvoice[]> = {
  income_1: [
    {
      workspace_id: 'ws_001',
      workspace_name: 'Acme Corporation',
      bundle_name: 'Professional Plan',
      bundle_price: 99,
      usage_count: 15000,
      usage_cost: 0,
      total_amount: 99,
      currency: 'USD',
      status: 'paid',
    },
    {
      workspace_id: 'ws_002',
      workspace_name: 'TechStart Inc',
      bundle_name: 'Pay Per Request',
      bundle_price: 0,
      usage_count: 8500,
      usage_cost: 85,
      total_amount: 85,
      currency: 'USD',
      status: 'paid',
    },
    {
      workspace_id: 'ws_003',
      workspace_name: 'DataFlow Systems',
      bundle_name: 'Starter Plan',
      bundle_price: 29,
      usage_count: 5000,
      usage_cost: 0,
      total_amount: 29,
      currency: 'USD',
      status: 'pending',
    },
  ],
  income_2: [
    {
      workspace_id: 'ws_001',
      workspace_name: 'Acme Corporation',
      bundle_name: 'Professional Plan',
      bundle_price: 99,
      usage_count: 18500,
      usage_cost: 0,
      total_amount: 99,
      currency: 'USD',
      status: 'paid',
    },
    {
      workspace_id: 'ws_002',
      workspace_name: 'TechStart Inc',
      bundle_name: 'Pay Per Request',
      bundle_price: 0,
      usage_count: 12300,
      usage_cost: 123,
      total_amount: 123,
      currency: 'USD',
      status: 'paid',
    },
    {
      workspace_id: 'ws_004',
      workspace_name: 'CloudNine Solutions',
      bundle_name: 'Enterprise Plan',
      bundle_price: 299,
      usage_count: 45000,
      usage_cost: 0,
      total_amount: 299,
      currency: 'USD',
      status: 'paid',
    },
  ],
  income_3: [
    {
      workspace_id: 'ws_001',
      workspace_name: 'Acme Corporation',
      bundle_name: 'Professional Plan',
      bundle_price: 99,
      usage_count: 22000,
      usage_cost: 0,
      total_amount: 99,
      currency: 'USD',
      status: 'paid',
    },
    {
      workspace_id: 'ws_002',
      workspace_name: 'TechStart Inc',
      bundle_name: 'Pay Per Request',
      bundle_price: 0,
      usage_count: 15400,
      usage_cost: 154,
      total_amount: 154,
      currency: 'USD',
      status: 'paid',
    },
    {
      workspace_id: 'ws_004',
      workspace_name: 'CloudNine Solutions',
      bundle_name: 'Enterprise Plan',
      bundle_price: 299,
      usage_count: 52000,
      usage_cost: 0,
      total_amount: 299,
      currency: 'USD',
      status: 'paid',
    },
    {
      workspace_id: 'ws_005',
      workspace_name: 'FinTech Partners',
      bundle_name: 'Professional Plan',
      bundle_price: 99,
      usage_count: 19000,
      usage_cost: 0,
      total_amount: 99,
      currency: 'USD',
      status: 'pending',
    },
  ],
  income_4: [
    {
      workspace_id: 'ws_001',
      workspace_name: 'Acme Corporation',
      bundle_name: 'Professional Plan',
      bundle_price: 99,
      usage_count: 25000,
      usage_cost: 0,
      total_amount: 99,
      currency: 'USD',
      status: 'paid',
    },
    {
      workspace_id: 'ws_002',
      workspace_name: 'TechStart Inc',
      bundle_name: 'Pay Per Request',
      bundle_price: 0,
      usage_count: 18700,
      usage_cost: 187,
      total_amount: 187,
      currency: 'USD',
      status: 'paid',
    },
    {
      workspace_id: 'ws_004',
      workspace_name: 'CloudNine Solutions',
      bundle_name: 'Enterprise Plan',
      bundle_price: 299,
      usage_count: 58000,
      usage_cost: 0,
      total_amount: 299,
      currency: 'USD',
      status: 'paid',
    },
    {
      workspace_id: 'ws_005',
      workspace_name: 'FinTech Partners',
      bundle_name: 'Professional Plan',
      bundle_price: 99,
      usage_count: 21500,
      usage_cost: 0,
      total_amount: 99,
      currency: 'USD',
      status: 'paid',
    },
  ],
};

const DUMMY_INCOME: IncomeRecord[] = [
  {
    _id: 'income_1',
    month: 'January 2024',
    revenue: 12450,
    invoices_count: 45,
    paid_invoices: 42,
    pending_invoices: 3,
    average_invoice_value: 296.43,
    currency: 'USD',
  },
  {
    _id: 'income_2',
    month: 'February 2024',
    revenue: 15600,
    invoices_count: 52,
    paid_invoices: 50,
    pending_invoices: 2,
    average_invoice_value: 300,
    currency: 'USD',
  },
  {
    _id: 'income_3',
    month: 'March 2024',
    revenue: 18900,
    invoices_count: 63,
    paid_invoices: 58,
    pending_invoices: 5,
    average_invoice_value: 300,
    currency: 'USD',
  },
  {
    _id: 'income_4',
    month: 'April 2024',
    revenue: 21340,
    invoices_count: 71,
    paid_invoices: 68,
    pending_invoices: 3,
    average_invoice_value: 300.56,
    currency: 'USD',
  },
  {
    _id: 'income_5',
    month: 'May 2024',
    revenue: 24780,
    invoices_count: 82,
    paid_invoices: 80,
    pending_invoices: 2,
    average_invoice_value: 302.2,
    currency: 'USD',
  },
  {
    _id: 'income_6',
    month: 'June 2024',
    revenue: 28450,
    invoices_count: 95,
    paid_invoices: 92,
    pending_invoices: 3,
    average_invoice_value: 299.47,
    currency: 'USD',
  },
];

const getModeIcon = (mode: string) => {
  switch (mode) {
    case PricingMode.PER_REQUEST:
      return <Zap className="h-4 w-4" />;
    case PricingMode.RECURRING:
      return <Clock className="h-4 w-4" />;
    case PricingMode.ONE_TIME:
      return <DollarSign className="h-4 w-4" />;
    case PricingMode.UPFRONT:
      return <TrendingUp className="h-4 w-4" />;
    default:
      return <DollarSign className="h-4 w-4" />;
  }
};

const getModeLabel = (mode: string) => {
  switch (mode) {
    case PricingMode.PER_REQUEST:
      return 'Per Request';
    case PricingMode.RECURRING:
      return 'Recurring';
    case PricingMode.ONE_TIME:
      return 'One-Time';
    case PricingMode.UPFRONT:
      return 'Upfront';
    default:
      return mode;
  }
};

const getIntervalLabel = (interval?: string) => {
  if (!interval) return '';
  return interval.charAt(0).toUpperCase() + interval.slice(1).replace('-', ' ');
};

const formatPrice = (price: number, currency: string, mode: string) => {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: mode === PricingMode.PER_REQUEST ? 4 : 2,
  }).format(price);

  return formatted;
};

const getExpenditureStatusIcon = (status: ExpenditureStatus) => {
  switch (status) {
    case ExpenditureStatus.PAID:
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case ExpenditureStatus.PENDING:
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    case ExpenditureStatus.OVERDUE:
      return <XCircle className="h-4 w-4 text-orange-600" />;
    case ExpenditureStatus.FAILED:
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getExpenditureStatusBadgeVariant = (
  status: ExpenditureStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case ExpenditureStatus.PAID:
      return 'default';
    case ExpenditureStatus.PENDING:
      return 'secondary';
    case ExpenditureStatus.OVERDUE:
    case ExpenditureStatus.FAILED:
      return 'destructive';
    default:
      return 'outline';
  }
};

const getCategoryIcon = (category: ExpenditureCategory) => {
  switch (category) {
    case ExpenditureCategory.DUCTAPE_SUBSCRIPTION:
      return <Package className="h-4 w-4" />;
    case ExpenditureCategory.BUNDLE_SUBSCRIPTION:
      return <ShoppingBag className="h-4 w-4" />;
    case ExpenditureCategory.USAGE_BASED:
      return <Zap className="h-4 w-4" />;
    case ExpenditureCategory.INFRASTRUCTURE:
      return <Package className="h-4 w-4" />;
    case ExpenditureCategory.SERVICES:
      return <Zap className="h-4 w-4" />;
    case ExpenditureCategory.HOSTING:
      return <HardDrive className="h-4 w-4" />;
    case ExpenditureCategory.SOFTWARE:
      return <FileText className="h-4 w-4" />;
    case ExpenditureCategory.MARKETING:
      return <TrendingUp className="h-4 w-4" />;
    default:
      return <DollarSign className="h-4 w-4" />;
  }
};

const getCategoryLabel = (category: ExpenditureCategory) => {
  switch (category) {
    case ExpenditureCategory.DUCTAPE_SUBSCRIPTION:
      return 'Ductape Subscription';
    case ExpenditureCategory.BUNDLE_SUBSCRIPTION:
      return 'Bundle Subscription';
    case ExpenditureCategory.USAGE_BASED:
      return 'Usage-Based';
    default:
      return (
        category.charAt(0).toUpperCase() + category.slice(1).replace('_', ' ')
      );
  }
};

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

// Chart colors matching design language
const CHART_COLORS = {
  primary: '#8B5CF6',
  green: '#10B981',
  blue: '#3B82F6',
  orange: '#F59E0B',
  red: '#EF4444',
  purple: '#A855F7',
  grey: '#6B7280',
};

// Form validation schema
const bundleFormSchema = z.object({
  name: z.string().min(1, 'Bundle name is required'),
  pricing_mode: z.nativeEnum(PricingMode),
  interval: z.nativeEnum(PaymentInterval).optional(),
  unit_price: z.coerce.number().min(0, 'Price must be positive'),
  currency: z.string().min(1, 'Currency is required'),
  overage_price: z.coerce
    .number()
    .min(0, 'Overage price must be positive')
    .optional(),
  per_minute: z.coerce.number().min(0).optional(),
  per_hour: z.coerce.number().min(0).optional(),
  per_day: z.coerce.number().min(0).optional(),
  per_week: z.coerce.number().min(0).optional(),
  per_month: z.coerce.number().min(0).optional(),
});

type BundleFormValues = z.infer<typeof bundleFormSchema>;
type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'NGN' | 'KES' | 'GHS' | 'ZAR';

export default function PricingTabContent() {
  const {currentWorkspaceId, user} = useAuth();
  const navigate = useNavigate();
  const [pricingBundles, setPricingBundles] = useState<PricingBundle[]>([]);
  const [expenditures] = useState<Expenditure[]>(DUMMY_EXPENDITURES);
  const [incomeRecords] = useState<IncomeRecord[]>(DUMMY_INCOME);
  const {billingView, setBillingView} = useWorkbenchStore();
  // Monthly drill-down state
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] =
    useState<WorkspaceInvoice | null>(null);
  const [invoiceDetailOpen, setInvoiceDetailOpen] = useState(false);

  // Bundle management state
  const [bundleFormOpen, setBundleFormOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<PricingBundle | null>(
    null,
  );
  const [deletingBundle, setDeletingBundle] = useState<PricingBundle | null>(
    null,
  );

  // Upgrade plan state
  const [upgradePlanOpen, setUpgradePlanOpen] = useState(false);

  // Usage details state
  const [usageDetailsOpen, setUsageDetailsOpen] = useState(false);

  // Bundle expansion state
  const [expandedBundleId, setExpandedBundleId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [planDetailOpen, setPlanDetailOpen] = useState(false);

  const queryClient = useQueryClient();

  const handleMonthClick = (incomeId: string) => {
    setExpandedMonth(expandedMonth === incomeId ? null : incomeId);
  };

  const handleViewInvoice = (invoice: WorkspaceInvoice) => {
    setSelectedInvoice(invoice);
    setInvoiceDetailOpen(true);
  };

  const handleAddBundle = () => {
    setEditingBundle(null);
    setBundleFormOpen(true);
  };

  // Subscribe and payment section

  const handleSubscribe = async (planId: string | null) => {
    try {
      const response = await pricingServices.createSubscription({
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        payload: {
          plan_id: planId || '',
          workspace_id: currentWorkspaceId || '',
        },
      });

      if (response.status) {
        toast.success(response.data.message);
        // Handle successful subscription
        console.log('Subscription created:', response.data.subscription);
      }
    } catch (error) {
      toast.error('Failed to create subscription');
    }
  };

  // Get Billing Report
  const {data: billingData, isLoading: billingDataLoading} = useQuery({
    queryKey: ['billingReport', user?._id, currentWorkspaceId],
    queryFn: () =>
      pricingServices.fetchBillingReport({
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        workspace_id: currentWorkspaceId || '',
      }),
    enabled: !!user?._id && !!currentWorkspaceId,
  });

  useEffect(() => {
    const handleCallback = async () => {
      console.log('Callback triggered');

      if (billingDataLoading) {
        console.log('Waiting for billingData...');
        return;
      }

      console.log('billingData ready:', billingData);

      const searchParams = new URLSearchParams(window.location.search);
      const reference = searchParams.get('reference');
      const trxref = searchParams.get('trxref');
      const planId = sessionStorage.getItem('pendingPlanId');

      if (!reference && !trxref) {
        console.warn('No payment reference');
        return;
      }

      if (!user?.auth_token || !user?._id || !user?.public_key) {
        console.error('Missing auth');
        return;
      }

      try {
        console.log('Payment detected');

        if (!billingData) {
          console.log('No billingData → running handleSubscribe');

          await handleSubscribe(planId);
        } else {
          console.log('billingData exists → checking plan change');

          const pendingPlanChange = sessionStorage.getItem('pendingPlanChange');

          if (pendingPlanChange) {
            console.log('Running changeSubscription');

            const planData = JSON.parse(pendingPlanChange);

            await pricingServices.changeSubscription(
              {
                user_id: user._id,
                public_key: user.public_key,
              },
              planData,
              user.auth_token,
            );

            sessionStorage.removeItem('pendingPlanChange');

            toast.success('Payment successful! Subscription updated.');
          } else {
            console.log('No pending plan change');
          }
        }

        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } catch (error) {
        console.error('Callback error:', error);
      }
    };

    handleCallback();
  }, [billingDataLoading, billingData]);

  const editMutation = useMutation({
    mutationFn: (data: {
      _id: string;
      user_id: string;
      public_key: string;
      workspace_id: string;
      name: string;
      pricing_mode: string;
      interval: string;
      unit_price: number;
      currency: string;
      overage_price: number;
      limits?: {
        per_minute?: number;
        per_hour?: number;
        per_day?: number;
        per_week?: number;
        per_month?: number;
      };
    }) => {
      const {_id, user_id, public_key, workspace_id, ...pricingPlan} = data;
      return pricingServices.editBundles({
        _id,
        user_id,
        public_key,
        workspace_id,
        payload: pricingPlan as PricingPlan,
      });
    },

    onSuccess: data => {
      if (!data) return;
      toast.success('Bundle edited successfully');

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({queryKey: ['bundles']});
    },

    onError: (error: Error) => {
      toast.error(error.message || 'Failed to edit bundle');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (payload: {
      _id: string;
      user_id: string;
      public_key: string;
      workspace_id: string;
    }) => pricingServices.deleteBundle(payload),

    onSuccess: () => {
      toast.success('Bundle deleted successfully');
      queryClient.invalidateQueries({queryKey: ['pricingBundles']});
    },

    onError: error => {
      toast.error(error.message || 'Failed to delete bundle');
    },
  });

  const handleDeleteBundle = (bundleId: string) => {
    if (!user?._id || !user?.public_key || !currentWorkspaceId || !bundleId)
      return;

    deleteMutation.mutate({
      _id: bundleId || '',
      user_id: user?._id || '',
      public_key: user?.public_key,
      workspace_id: currentWorkspaceId || '',
    });
  };

  const form = useForm<BundleFormValues>({
    resolver: zodResolver(bundleFormSchema),
    defaultValues: {
      name: '',
      pricing_mode: PricingMode.RECURRING,
      interval: PaymentInterval.MONTHLY,
      unit_price: 0,
      currency: 'USD',
    },
  });

  useEffect(() => {
    if (editingBundle) {
      form.reset({
        name: editingBundle.name,
        pricing_mode: editingBundle.pricing_mode as PricingMode,
        interval: editingBundle.interval as PaymentInterval,
        unit_price: editingBundle.unit_price,
        currency: editingBundle.currency,
      });
    }
  }, [editingBundle, form]);

  // Update form when editing bundle changes
  const handleFormOpen = () => {
    if (editingBundle) {
      form.reset({
        name: editingBundle.name,
        pricing_mode: editingBundle.pricing_mode as PricingMode,
        interval: editingBundle.interval as PaymentInterval,
        unit_price: editingBundle.unit_price,
        currency: editingBundle.currency,
        per_minute: editingBundle.limits?.per_minute,
        per_hour: editingBundle.limits?.per_hour,
        per_day: editingBundle.limits?.per_day,
        per_week: editingBundle.limits?.per_week,
        per_month: editingBundle.limits?.per_month,
      });
    } else {
      form.reset({
        name: '',
        pricing_mode: PricingMode.RECURRING,
        interval: PaymentInterval.MONTHLY,
        unit_price: 0,
        currency: 'USD',
      });
    }
  };

  const useCreateBundle = useMutation({
    mutationFn: pricingServices.createBundle,
    onSuccess: newBundle => {
      if (newBundle) {
        toast.success('Bundle created successfully');
        form.reset();
      }

      queryClient.invalidateQueries({queryKey: ['pricingBundles']});
    },
    onError: error => {
      console.error('Error creating bundle:', error);
      toast.error('Failed to create bundle');
    },
  });

  const onSubmit = async (data: BundleFormValues) => {
    // Prepare limits object
    const limits: Record<string, number> = {};
    if (data.per_minute) limits.per_minute = data.per_minute || 0;
    if (data.per_hour) limits.per_hour = data.per_hour || 0;
    if (data.per_day) limits.per_day = data.per_day || 0;
    if (data.per_week) limits.per_week = data.per_week || 0;
    if (data.per_month) limits.per_month = data.per_month || 0;

    if (editingBundle) {
      // EDIT MODE - Use handleEditBundle logic
      if (!user?._id || !user?.public_key) {
        toast.error('User information is required');
        return;
      }

      // Combine form data with editingBundle data
      const bundleData = {
        _id: editingBundle._id, // Use the ID from editingBundle
        name: data.name,
        pricing_mode: data.pricing_mode,
        interval: data.interval,
        unit_price: data.unit_price,
        currency: data.currency,
        overage_price: data.overage_price,
        per_minute: data.per_minute,
        per_hour: data.per_hour,
        per_day: data.per_day,
        per_week: data.per_week,
        per_month: data.per_month,
      };

      // Create payload matching the mutationFn structure
      const payload = {
        _id: bundleData._id,
        user_id: user._id,
        public_key: user.public_key,
        workspace_id: currentWorkspaceId || '',
        name: bundleData.name,
        pricing_mode: bundleData.pricing_mode as string,
        interval: (bundleData.interval as string) || '',
        unit_price: bundleData.unit_price,
        currency: bundleData.currency,
        overage_price: bundleData.overage_price || 0,
        ...(Object.keys(limits).length > 0 && {limits}),
      };

      // Call edit mutation
      editMutation.mutate(payload, {
        onSuccess: () => {
          setBundleFormOpen(false);
          setEditingBundle(null);
        },
        onError: () => {
          // Keep modal open on error
        },
      });
    } else {
      // CREATE MODE - Add new bundle
      const payload = {
        name: data.name,
        pricing_mode: data.pricing_mode,
        interval: data.interval,
        unit_price: data.unit_price,
        currency: data.currency,
        overage_price: data.overage_price,
        ...limits,
      };

      useCreateBundle.mutate(
        {
          user_id: user?._id || '',
          public_key: user?.public_key || '',
          workspace_id: currentWorkspaceId || '',
          payload,
        },
        {
          onSuccess: () => {
            setBundleFormOpen(false);
          },
        },
      );
    }
  };

  // When clicking edit button
  const handleEditClick = (bundle: React.SetStateAction<Pricing | null>) => {
    setEditingBundle(bundle);
    setBundleFormOpen(true);
  };

  const {data: totalIncomeData, status: isLoadingIncome} = useQuery({
    queryKey: ['incomes', user?._id, currentWorkspaceId],
    queryFn: () =>
      pricingServices.fetchTotalIncome({
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        workspace_id: currentWorkspaceId || '', // Changed from workspace._id
      }),
    enabled: !!user?._id && !!currentWorkspaceId, // Both conditions
  });

  const {data: totalExpenseData, status: isLoadingExpense} = useQuery({
    queryKey: ['expenses', user?._id, currentWorkspaceId],
    queryFn: () =>
      pricingServices.fetchTotalExpense({
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        workspace_id: currentWorkspaceId || '', // Changed from workspace._id
      }),
    enabled: !!user?._id && !!currentWorkspaceId, // Both conditions
  });

  // console.log("total incomes", {totalIncomeData, isLoadingIncome});
  const incomeData = totalIncomeData?.data;
  // console.log("total expense", {totalExpenseData, isLoadingExpense});
  const expenseData = totalExpenseData?.data;

  const {data: bundleData, isLoading} = useQuery({
    queryKey: ['bundles', user?._id, currentWorkspaceId],
    queryFn: () =>
      pricingServices.fetchBundles({
        user_id: user?._id || '',
        public_key: user?.public_key || '',
        workspace_id: currentWorkspaceId || '',
      }),
    enabled: !!user?._id && !!currentWorkspaceId,
  });

  const pricingData = bundleData?.data;
  // console.log('pricing bundles', {pricingData, isLoading});

  const activePricings =
    pricingData?.pricings?.filter(pricing => pricing.is_active) || [];

  const bundleSubscriptions = new Map<string, Set<string>>();

  Object.values(WORKSPACE_INVOICES).forEach(invoices => {
    invoices.forEach(invoice => {
      if (!bundleSubscriptions.has(invoice.bundle_name)) {
        bundleSubscriptions.set(invoice.bundle_name, new Set());
      }
      bundleSubscriptions.get(invoice.bundle_name)?.add(invoice.workspace_id);
    });
  });

  sessionStorage.setItem('billingData', JSON.stringify(billingData));
  console.log('Before redirect:', sessionStorage.getItem('billingData'));
  const currentBillingReport = billingData?.data?.currentBillingReport;
  const planDetails =
    billingData?.data?.planChangeHistory?.previousPlanReport?.planDetails;
  const workspaceInfo = currentBillingReport?.workspace_id;
  const subscriptionInfo = currentBillingReport?.subscription_id;
  const planInfo = currentBillingReport?.plan_id;
  const resourceUsage = currentBillingReport?.resourceUsage || {};

  const calculateUsage = (used, limit) => {
    if (!limit) return {percentage: 0, used: 0, limit: 0};
    const percentage = (used / limit) * 100;
    return {
      percentage: Math.min(percentage, 100), // Cap at 100% for progress bar
      used,
      limit,
      overage: Math.max(0, used - limit),
    };
  };

  const requestsUsage = calculateUsage(
    (resourceUsage as any)?.requests || 0,
    planInfo?.monthlyRequests || 1000000,
  );

  const storageUsage = calculateUsage(
    (resourceUsage as any).storageUnits || 0,
    planInfo?.productLimits?.storageUnits || 100,
  );

  const usersUsage = calculateUsage(
    (resourceUsage as any).users || 0,
    planInfo?.users || 20,
  );

  const calculateUserOverageCost = (overage, planInfo) => {
    return 'TBD';
  };

  const calculateTotalCost = (
    report,
    planInfo,
    requestsUsage,
    storageUsage,
    usersUsage,
  ) => {
    const basePrice = report?.basePrice || planInfo?.monthlyPrice || 199;

    const requestsOverageCost =
      requestsUsage.overage > 0
        ? (requestsUsage.overage / 1000) *
          (planInfo?.usagePricing?.additionalRequestPrice || 0.05)
        : 0;

    const storageOverageCost =
      storageUsage.overage > 0
        ? storageUsage.overage *
          (planInfo?.usagePricing?.additionalStoragePrice || 0.3)
        : 0;

    const total = basePrice + requestsOverageCost + storageOverageCost;
    return total.toFixed(2);
  };

  const generateHistoricalData = currentReport => {
    const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
    return months.map((month, index) => ({
      month,
      api: Math.round(
        ((resourceUsage as any).requests || 1150000) * (0.8 + index * 0.04),
      ),
      storage: Math.round(
        ((resourceUsage as any).storageUnits || 108) * (0.8 + index * 0.04),
      ),
      users: Math.min((resourceUsage as any).users || 8, 20),
    }));
  };

  const formatDate = (dateString, p0?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Get Billing Plans
  const {data: billingPlans, isLoading: billingPlansLoading} = useQuery({
    queryKey: ['billingPlans', user?._id],
    queryFn: () =>
      pricingServices.fetchBillingData({
        user_id: user?._id || '',
        public_key: user?.public_key || '',
      }),
    enabled: !!user?._id && !!user?.public_key,
  });

  // console.log('Billing Plans', billingPlans);
  console.log('Billing Plans Load State', billingPlansLoading);

  const formatStorage = gb => {
    if (gb === null || gb === undefined) return 'Unlimited';
    if (gb >= 1000) return `${gb / 1000}TB`;
    if (gb === 0) return '0GB';
    return `${gb}GB`;
  };

  const formatNumber = num => {
    if (num === null || num === undefined) return 'Unlimited';
    return num.toLocaleString();
  };

  const pricingPlans = billingPlans?.data || [];

  const currentPlan = currentBillingReport?.plan_id?.name || '';

  const tierPlans = pricingPlans.filter(
    plan => plan.name !== 'Enterprise Plan',
  );

  const highlightedPlan = pricingPlans.find(
    plan => plan.name == 'Enterprise Plan',
  );

  const PlanCard = ({
    plan,
    onSelect,
  }: {
    plan: BillingPlan;
    onSelect: () => void;
  }) => {
    const isCurrentPlan = plan.name === currentPlan;

    return (
      <div
        onClick={onSelect}
        className={`cursor-pointer relative bg-white max-w-[322px] w-auto rounded-lg p-5 transition-all hover:shadow-lg
      ${
        isCurrentPlan
          ? 'border-2 border-primary'
          : 'border border-grey-400 hover:border-primary'
      }`}
      >
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-[20px] font-bold text-grey">{plan.name}</h3>

            {isCurrentPlan && (
              <Badge className="bg-primary/20 text-primary">Current Plan</Badge>
            )}
          </div>

          <div className="flex items-baseline gap-1">
            <span className="text-[40px] font-bold text-grey">
              ${plan.monthlyPrice !== null ? plan.monthlyPrice : 'Custom'}
            </span>
            {plan.monthlyPrice !== null && (
              <span className="text-grey-600 text-sm">/month</span>
            )}
          </div>
          {plan.isPayAsYouGo && (
            <span className="text-xs text-grey-600">Pay as you go</span>
          )}
        </div>

        <ul className="space-y-2 mb-4">
          <li className="flex items-start gap-2 text-sm py-1">
            <CheckCircle className="h-4 w-4 text-green mt-0.5 flex-shrink-0" />
            <span className="font-medium text-base text-[#78797A]">
              {formatNumber(plan.monthlyRequests)} API requests/month
            </span>
          </li>

          <li className="flex items-start gap-2 text-sm py-1">
            <CheckCircle className="h-4 w-4 text-green mt-0.5 flex-shrink-0" />
            <span className="font-medium text-base text-[#78797A]">
              {formatStorage(plan.fileTransfer)} storage
            </span>
          </li>

          <li className="flex items-start gap-2 text-sm py-1">
            <CheckCircle className="h-4 w-4 text-green mt-0.5 flex-shrink-0" />
            <span className="font-medium text-base text-[#78797A]">
              {plan.users !== null ? `${plan.users} users` : 'Unlimited users'}
            </span>
          </li>

          <li className="flex items-start gap-2 text-sm py-1">
            <CheckCircle className="h-4 w-4 text-green mt-0.5 flex-shrink-0" />
            <span className="font-medium text-base text-[#78797A]">
              {plan.logsRetentionDays} days logs retention
            </span>
          </li>

          {plan.customFeatures?.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm py-1">
              <CheckCircle className="h-4 w-4 text-green mt-0.5 flex-shrink-0" />
              <span className="font-medium text-base text-[#78797A]">
                {feature}
              </span>
            </li>
          ))}

          {plan.productLimits && (
            <>
              <li className="flex items-start gap-2 text-sm py-1">
                <CheckCircle className="h-4 w-4 text-green mt-0.5 flex-shrink-0" />
                <span className="font-medium text-base text-[#78797A]">
                  {plan.productLimits.databases} databases
                </span>
              </li>
              <li className="flex items-start gap-2 text-sm py-1">
                <CheckCircle className="h-4 w-4 text-green mt-0.5 flex-shrink-0" />
                <span className="font-medium text-base text-[#78797A]">
                  {plan.productLimits.caches} caches
                </span>
              </li>
            </>
          )}
        </ul>

        {plan.usagePricing && (
          <div className="bg-[#78797A80]/15 rounded border border-[#78797A80]/15 p-2 mb-4">
            <p className="text-xs font-semibold text-[#78797A] mb-1">
              Overage Pricing:
            </p>

            <ul className="text-xs text-[#78797A] space-y-0.5 pl-4">
              <li>
                • API: ${plan.usagePricing.additionalRequestPrice} per request
              </li>
              <li>
                • Storage: ${plan.usagePricing.additionalStoragePrice} per GB
              </li>
              {plan.usagePricing?.additionalUserPrice > 0 && (
                <li>
                  • Users: ${plan.usagePricing?.additionalUserPrice} per user
                </li>
              )}
            </ul>
          </div>
        )}

        {plan.marketplaceAccess && (
          <div className="text-xs text-grey-600 mb-2">
            Marketplace revenue share: {plan.marketplaceAccess.revenueShare}%
          </div>
        )}

        <Button
          disabled={isCurrentPlan}
          className="mt-auto w-full text-[12px] font-semibold text-grey"
          variant="outline"
        >
          {isCurrentPlan ? 'Current Plan' : `Upgrade to ${plan.name}`}
        </Button>
      </div>
    );
  };

  const UltimatePlanCard = ({plan, onSelect}) => {
    return (
      <div
        className="cursor-pointer relative bg-white md:col-span-2 w-full transition-all hover:shadow-lg rounded-lg border-4 border-[#391484] p-5 mt-4"
        onClick={onSelect}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-[20px] font-bold text-grey">{plan.name}</h3>
              <Badge className="bg-[#391484] text-white">Best Value</Badge>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-[40px] font-bold text-grey">
                {plan.monthlyPrice !== null ? plan.monthlyPrice : 'Custom'}
              </span>
              {plan.monthlyPrice !== null && (
                <span className="text-grey-600 text-sm">/month</span>
              )}
            </div>
          </div>
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-4 py-2">
          <li className="flex items-start gap-2 text-sm py-1">
            <CheckCircle className="h-4 w-4 text-[#391484] mt-0.5 flex-shrink-0" />
            <span className="font-medium text-base text-[#78797A]">
              {formatNumber(plan.monthlyRequests)} api requests/month
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm py-1">
            <CheckCircle className="h-4 w-4 text-[#391484] mt-0.5 flex-shrink-0" />
            <span className="font-medium text-base text-[#78797A]">
              {formatStorage(plan.fileTransfer)} storage
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm py-1">
            <CheckCircle className="h-4 w-4 text-[#391484] mt-0.5 flex-shrink-0" />
            <span className="font-medium text-base text-[#78797A]">
              {plan.users !== null ? plan.users : 'Unlimited'} users
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm py-1">
            <CheckCircle className="h-4 w-4 text-[#391484] mt-0.5 flex-shrink-0" />
            <span className="font-medium text-base text-[#78797A]">
              {plan.logsRetentionDays} days logs retention
            </span>
          </li>
          <li className="flex items-start gap-2 text-sm py-1">
            <CheckCircle className="h-4 w-4 text-[#391484] mt-0.5 flex-shrink-0" />
            <span className="font-medium text-base text-[#78797A]">
              Everything in Pro
            </span>
          </li>
          {plan.customFeatures?.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm py-1">
              <CheckCircle className="h-4 w-4 text-[#391484] mt-0.5 flex-shrink-0" />
              <span className="font-medium text-base text-[#78797A]">
                {feature}
              </span>
            </li>
          ))}
        </ul>

        {plan.usagePricing && (
          <div className="bg-[#78797A80]/15 rounded border border-[#78797A80]/15 p-2 mb-4 mt-3">
            <p className="text-xs font-semibold text-[#78797A] mb-1">
              Overage Pricing:
            </p>
            <ul className="text-xs text-[#78797A] space-y-0.5 pl-4">
              <li>
                • API: ${plan.usagePricing.additionalRequestPrice} per request
              </li>
              <li>
                • Storage: ${plan.usagePricing.additionalStoragePrice} per GB
              </li>
              {plan.usagePricing.additionalUserPrice > 0 && (
                <li>
                  • Users: ${plan.usagePricing.additionalUserPrice} per user
                </li>
              )}
            </ul>
          </div>
        )}

        <Button className="mt-auto bg-white hover:bg-white w-full text-[12px] font-semibold text-grey">
          Contact Sales
        </Button>
      </div>
    );
  };

  // Prepare data for bundle subscription distribution chart
  const chartColors = [
    CHART_COLORS.primary,
    CHART_COLORS.blue,
    CHART_COLORS.orange,
    CHART_COLORS.green,
    CHART_COLORS.purple,
  ];
  const modeDistribution = Array.from(bundleSubscriptions.entries())
    .map(([bundleName, workspaceIds], index) => ({
      name: bundleName,
      value: workspaceIds.size,
      fill: chartColors[index % chartColors.length],
    }))
    .sort((a, b) => b.value - a.value); // Sort by subscription count descending

  // Calculate expenditure stats
  const totalExpenditureAmount = expenditures.reduce(
    (sum, exp) => sum + exp.amount,
    0,
  );

  // Prepare expenditure category distribution for pie chart
  const categoryDistribution = expenseData?.categoryBreakdown;
  const filterDistribution = categoryDistribution?.filter(
    item => item.amount > 0,
  );
  const COLORS = ['#0088FE', '#8884d8', '#FFBB28', '#FF8042'];

  // Prepare revenue trend data
  const revenueTrendData = incomeRecords.map(record => ({
    month: record.month.split(' ')[0].substring(0, 3),
    revenue: record.revenue,
    invoices: record.invoices_count,
  }));

  // Calculate revenue growth
  const currentMonthRevenue =
    incomeRecords[incomeRecords.length - 1]?.revenue || 0;
  const previousMonthRevenue =
    incomeRecords[incomeRecords.length - 2]?.revenue || 0;
  const revenueGrowth =
    previousMonthRevenue > 0
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) *
        100
      : 0;

  const totalRevenue = incomeRecords.reduce(
    (sum, record) => sum + record.revenue,
    0,
  );

  const handleBackToPlans = () => {
    setPlanDetailOpen(false);
    setUpgradePlanOpen(true);
    setSelectedPlan(null);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-grey-100">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
        <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Coins className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold text-grey">
                  Pricing & Billing
                </h1>
              </div>
              <p className="text-grey-600 pl-9">
                Manage your pricing bundles, track income and expenses
              </p>
            </div>
            <Button
              className="gap-2 my-auto"
              onClick={handleAddBundle}
              disabled
            >
              <Plus className="h-4 w-4" />
              New Bundle
            </Button>
          </div>
        </div>

        {billingView === 'expenses' && (
          <>
            <section className="flex flex-col justify-center border border-grey-400 rounded-[5px] p-4 md:p-6 w-full">
              <div className="flex flex-col md:flex-row">
                <div className="flex flex-col md:flex-row justify-between items-start w-full md:pr-10 gap-4 md:gap-0">
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <Receipt
                        width={24}
                        height={24}
                        className="text-primary"
                      />
                      <div className="pl-2">
                        <p className="text-sm md:text-base text-grey font-bold">
                          YOUR BILLING SUMMARY
                        </p>
                        <p className="text-sm text-grey-600">
                          ${planInfo?.monthlyPrice || 0}.00/month • Renews on{' '}
                          {formatDate(subscriptionInfo?.nextBillingDate)}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4">
                      <p className="text-grey text-[32px] font-bold pb-1">
                        ${currentBillingReport?.totalCost?.toFixed(2) || '0.00'}
                      </p>
                      <p className="text-xs text-primary font-semibold">
                        TOTAL AMOUNT DUE
                      </p>
                    </div>
                  </div>

                  <span className="text-sm font-bold text-primary bg-[#0846A6] bg-opacity-15 px-2 py-1 rounded-[5px] ml-auto uppercase">
                    {planInfo?.isEnterprise ? 'Enterprise' : planInfo?.name}
                  </span>
                </div>

                <div className="flex flex-col ml-auto justify-between border-l border-l-[#8F92A1] pl-5 pr-10 border-opacity-[40%] w-1/3">
                  <div className="flex items-center">
                    <FileText width={24} height={24} className="text-primary" />
                    <div className="pl-2">
                      <p className="text-grey-700 text-sm font-normal">
                        Current Plan Billing
                      </p>
                      <p className="text-[20px] text-grey font-bold">
                        $ {(planInfo?.monthlyPrice || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Clock width={24} height={24} className="text-primary" />
                    <div className="pl-2">
                      <p className="text-grey-700 text-sm font-normal">
                        Next Billing Date
                      </p>
                      <p className="text-[20px] text-grey font-bold">
                        {formatDate(subscriptionInfo?.nextBillingDate) ||
                          'March 1, 2025'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center border-t mt-10 pt-6 border-t-[#8F92A1] border-opacity-[40%]">
                <div className="flex items-center space-x-2">
                  <Signal width={24} height={24} className="text-primary" />
                  <p className="text-grey text-[20px] font-bold">
                    Current Plan Resource Usage
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 w-[141px] h-[33px] border border-primary text-primary"
                    onClick={() => setUsageDetailsOpen(true)}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    View Usage Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 w-[111px] h-[33px] border border-primary bg-primary text-white hover:bg-primary"
                    onClick={() => setUpgradePlanOpen(true)}
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    Upgrade Plan
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
                {/* API Requests */}
                <div className="bg-white rounded-lg border border-grey-400 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-semibold text-grey">
                        API Requests
                      </span>
                    </div>
                    <span className="text-xs text-grey-600">
                      {requestsUsage.percentage.toFixed(0)}% used
                    </span>
                  </div>
                  <div className="mb-2">
                    <div className="w-full bg-grey-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{width: `${requestsUsage.percentage}%`}}
                      ></div>
                    </div>
                  </div>
                  <p className="text-xs text-grey-600 mb-1">
                    {requestsUsage.used.toLocaleString()} /{' '}
                    {requestsUsage.limit.toLocaleString()} requests
                  </p>
                  {(requestsUsage as any)?.overage > 0 ? (
                    <div className="bg-primary/10 border border-primary/20 rounded px-2 py-1">
                      <p className="text-xs font-semibold text-primary/80">
                        Overage: +
                        {(requestsUsage as any)?.overage.toLocaleString()}{' '}
                        requests
                      </p>
                      <p className="text-xs text-primary/60">
                        $
                        {(
                          ((requestsUsage.overage as any) / 1000) *
                          (planInfo?.usagePricing?.additionalRequestPrice ||
                            0.05)
                        ).toFixed(2)}{' '}
                        @ $
                        {(
                          planInfo?.usagePricing?.additionalRequestPrice || 0.0
                        ).toFixed(2)}
                        /1K
                      </p>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded px-2 py-1">
                      <p className="text-xs font-semibold text-green-700">
                        Within limits
                      </p>
                      <p className="text-xs text-green-600">
                        {requestsUsage.limit - requestsUsage.used} requests
                        remaining
                      </p>
                    </div>
                  )}
                </div>

                {/* Storage */}
                <div className="bg-white rounded-lg border border-grey-400 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-semibold text-grey">
                        Storage
                      </span>
                    </div>
                    <span className="text-xs text-grey-600">
                      {storageUsage.percentage.toFixed(0)}% used
                    </span>
                  </div>
                  <div className="mb-2">
                    <div className="w-full bg-grey-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[#00875A] h-2 rounded-full"
                        style={{width: `${storageUsage.percentage}%`}}
                      ></div>
                    </div>
                  </div>
                  <p className="text-xs text-grey-600 mb-1">
                    {storageUsage.used} GB / {storageUsage.limit} GB
                  </p>
                  {(storageUsage.overage as any) > 0 ? (
                    <div className="bg-[#00875A]/10 border border-[#00875A]/20 rounded px-2 py-1">
                      <p className="text-xs font-semibold text-[#00875A]/70">
                        Overage: +{storageUsage.overage} GB
                      </p>
                      <p className="text-xs text-[#00875A]/60">
                        $
                        {(
                          (storageUsage.overage as any) *
                          (planInfo?.usagePricing?.additionalStoragePrice ||
                            0.3)
                        ).toFixed(2)}{' '}
                        @ $
                        {(
                          planInfo?.usagePricing?.additionalStoragePrice || 0.3
                        ).toFixed(2)}
                        /GB
                      </p>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded px-2 py-1">
                      <p className="text-xs font-semibold text-green-700">
                        Within limits
                      </p>
                      <p className="text-xs text-green-600">
                        {storageUsage.limit - storageUsage.used} GB remaining
                      </p>
                    </div>
                  )}
                </div>

                {/* Active Users */}
                <div className="bg-white rounded-lg border border-grey-400 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-orange-500" />
                      <span className="text-sm font-semibold text-grey">
                        Users
                      </span>
                    </div>
                    <span className="text-xs text-grey-600">
                      {usersUsage.used} / {usersUsage.limit}
                    </span>
                  </div>
                  <div className="mb-2">
                    <div className="w-full bg-grey-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-orange-500 h-2 rounded-full"
                        style={{width: `${usersUsage.percentage}%`}}
                      ></div>
                    </div>
                  </div>
                  <p className="text-xs text-grey-600 mb-1">
                    {usersUsage.limit - usersUsage.used} user slots remaining
                  </p>
                  {(usersUsage as any).overage > 0 ? (
                    <div className="bg-orange-50 border border-orange-200 rounded px-2 py-1">
                      <p className="text-xs font-semibold text-orange-700">
                        Overage: +{usersUsage.overage} users
                      </p>
                      <p className="text-xs text-orange-600">
                        Additional users will be billed
                      </p>
                    </div>
                  ) : (
                    <div className="bg-orange-50 border border-orange-200 rounded px-2 py-1">
                      <p className="text-xs font-semibold text-orange-700">
                        No overage
                      </p>
                      <p className="text-xs text-orange-600">
                        Within plan limits
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div className="bg-white rounded-lg border border-grey-400 shadow-sm">
              <div className=" flex gap-2 p-4 border-b border-grey-400">
                <Clock1 className="text-primary" width={24} height={24} />
                <h3 className="text-lg font-semibold text-grey">
                  Recent Expenses
                </h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Reference</TableHead>
                      <TableHead className="font-semibold">Vendor</TableHead>
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="font-semibold">Details</TableHead>
                      <TableHead className="font-semibold">Amount</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(expenseData?.recentExpenses ?? []).map(expenditure => (
                      <TableRow
                        key={expenditure.vendor}
                        className="hover:bg-grey-100 transition-colors"
                      >
                        <TableCell>
                          <span className="font-medium text-grey">
                            {expenditure.reference}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-grey-700">
                              {expenditure.vendor}
                            </span>
                            <span className="text-xs text-grey-600">
                              {expenditure.details}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="gap-1.5 text-grey"
                          >
                            {getCategoryIcon(
                              expenditure?.category as ExpenditureCategory,
                            )}
                            {getCategoryLabel(
                              expenditure?.category as ExpenditureCategory,
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {expenditure?.usage_count && (
                            <span className="text-sm text-grey-600">
                              {expenditure?.usage_count.toLocaleString()}{' '}
                              requests
                            </span>
                          )}
                          {expenditure?.bundle_name && (
                            <span className="text-sm text-grey-600">
                              {expenditure?.bundle_name}
                            </span>
                          )}
                          {!expenditure?.usage_count &&
                            !expenditure?.bundle_name && (
                              <span className="text-sm text-grey-600">-</span>
                            )}
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-red">
                            {formatCurrency(
                              expenditure.amount,
                              expenseData?.currency as CurrencyCode,
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getExpenditureStatusIcon(
                              expenditure?.status as ExpenditureStatus,
                            )}
                            <Badge
                              variant={getExpenditureStatusBadgeVariant(
                                expenditure?.status as ExpenditureStatus,
                              )}
                            >
                              {expenditure.status.charAt(0).toUpperCase() +
                                expenditure.status.slice(1)}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}

        {/* Pricing Section */}
        {billingView === 'bundles' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-grey-400 shadow-sm">
              <div className="p-4 border-b border-grey-400">
                <h3 className="text-lg font-semibold text-grey">
                  Active Pricing Bundles: {activePricings.length ?? 0}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Mode</TableHead>
                      <TableHead className="font-semibold">Price</TableHead>
                      <TableHead className="font-semibold">Interval</TableHead>
                      <TableHead className="font-semibold">
                        Overage Pricing
                      </TableHead>
                      <TableHead className="font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activePricings.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-5 font-semibold"
                        >
                          No active pricing bundles
                        </TableCell>
                      </TableRow>
                    ) : (
                      activePricings.map(bundle => {
                        const customers = BUNDLE_CUSTOMERS[bundle._id] || [];
                        const isExpanded = expandedBundleId === bundle._id;

                        return (
                          <React.Fragment key={bundle._id}>
                            <TableRow
                              className="hover:bg-grey-100 transition-colors cursor-pointer"
                              onClick={() =>
                                setExpandedBundleId(
                                  isExpanded ? null : bundle._id,
                                )
                              }
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {customers.length > 0 ? (
                                    isExpanded ? (
                                      <ChevronDown className="h-4 w-4 text-grey-600" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-grey-600" />
                                    )
                                  ) : (
                                    <div className="w-4" />
                                  )}
                                  <span className="font-medium text-grey">
                                    {bundle.name}
                                  </span>
                                  {customers.length > 0 && (
                                    <Badge
                                      variant="secondary"
                                      className="text-xs text-grey"
                                    >
                                      {customers.length}{' '}
                                      {customers.length === 1
                                        ? 'customer'
                                        : 'customers'}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="gap-1.5 text-grey"
                                >
                                  {getModeIcon(bundle?.pricing_mode)}
                                  {getModeLabel(bundle?.pricing_mode)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="font-mono font-semibold text-grey">
                                  {formatPrice(
                                    bundle.unit_price,
                                    bundle.currency,
                                    bundle.pricing_mode,
                                  )}
                                </span>
                              </TableCell>
                              <TableCell>
                                {bundle.interval ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-grey"
                                  >
                                    {getIntervalLabel(bundle.interval)}
                                  </Badge>
                                ) : (
                                  <span className="text-grey-600 text-sm">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {bundle.pricing_mode ===
                                PricingMode.RECURRING ? (
                                  <div className="text-xs text-grey-700">
                                    <span className="font-mono font-semibold">
                                      $0.05
                                    </span>{' '}
                                    per 1,000 API requests
                                  </div>
                                ) : bundle.pricing_mode ===
                                  PricingMode.PER_REQUEST ? (
                                  <div className="text-xs text-grey-700">
                                    <p>Standard rate applies</p>
                                  </div>
                                ) : (
                                  <span className="text-grey-600 text-sm">
                                    N/A
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleEditClick(bundle);
                                    }}
                                    title="Edit bundle"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={e => {
                                      e.stopPropagation();
                                      setDeletingBundle(bundle);
                                    }}
                                    title="Delete bundle"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>

                            {/* Expandable Customer List */}
                            {isExpanded && customers.length > 0 && (
                              <TableRow>
                                <TableCell
                                  colSpan={6}
                                  className="bg-grey-50 p-0"
                                >
                                  <div className="p-4">
                                    <h4 className="text-sm font-semibold text-grey mb-3 flex items-center gap-2">
                                      <Users className="h-4 w-4" />
                                      Subscribed Customers
                                    </h4>
                                    <div className="space-y-2">
                                      {customers.map(customer => (
                                        <div
                                          key={customer.workspace_id}
                                          className="bg-white rounded-lg border border-grey-300 p-3"
                                        >
                                          <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <span className="text-xs font-semibold text-primary">
                                                  {customer.workspace_name.charAt(
                                                    0,
                                                  )}
                                                </span>
                                              </div>
                                              <div>
                                                <p className="text-sm font-semibold text-grey">
                                                  {customer.workspace_name}
                                                </p>
                                                <p className="text-xs text-grey-600">
                                                  Since{' '}
                                                  {new Date(
                                                    customer.subscribed_date,
                                                  ).toLocaleDateString()}
                                                </p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                              <div className="text-right">
                                                <p className="text-xs text-grey-600">
                                                  API Usage
                                                </p>
                                                <p className="text-sm font-semibold text-grey">
                                                  {customer.api_usage.toLocaleString()}
                                                </p>
                                              </div>
                                              {customer.mrr > 0 && (
                                                <div className="text-right">
                                                  <p className="text-xs text-grey-600">
                                                    MRR
                                                  </p>
                                                  <p className="text-sm font-semibold text-grey">
                                                    ${customer.mrr}
                                                  </p>
                                                </div>
                                              )}
                                              <Badge
                                                variant={
                                                  customer.status === 'active'
                                                    ? 'default'
                                                    : customer.status ===
                                                        'trialing'
                                                      ? 'secondary'
                                                      : 'destructive'
                                                }
                                              >
                                                {customer.status}
                                              </Badge>
                                            </div>
                                          </div>

                                          {/* App Tags */}
                                          {customer.app_tags.length > 0 && (
                                            <div className="pt-3 border-t border-grey-400">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <Package className="h-3.5 w-3.5 text-grey-600" />
                                                <span className="text-xs text-grey-600 font-medium">
                                                  Apps:
                                                </span>
                                                {customer.app_tags.map(
                                                  (tag, idx) => (
                                                    <Badge
                                                      key={idx}
                                                      variant="outline"
                                                      className="text-xs text-grey"
                                                    >
                                                      {tag}
                                                    </Badge>
                                                  ),
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Distribution Chart */}
            <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-grey mb-4">
                Bundle Distribution
              </h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={modeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="name"
                    tick={{fontSize: 12}}
                    stroke="#6B7280"
                  />
                  <YAxis tick={{fontSize: 12}} stroke="#6B7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                    }}
                    formatter={value => {
                      if (value === undefined || value === null)
                        return ['', ''];
                      const numValue =
                        typeof value === 'number'
                          ? value
                          : parseInt(String(value), 10);
                      if (isNaN(numValue)) return ['', ''];
                      return [
                        `${numValue} subscription${numValue !== 1 ? 's' : ''}`,
                        '',
                      ];
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pricing Bundles Table */}
          </div>
        )}

        {/* Income Section */}
        {billingView === 'revenue' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
              <div className="flex flex-col md:flex-row">
                <div className="flex flex-col md:flex-row justify-between items-start w-full md:pr-10 gap-4 md:gap-0">
                  <div className="flex flex-col">
                    <div className="flex items-center space-x-2">
                      <Receipt
                        width={24}
                        height={24}
                        className="text-primary"
                      />
                      <div className="pl-2">
                        <p className="text-sm md:text-base text-grey font-bold">
                          YOUR INCOME SUMMARY
                        </p>
                        <p className="text-sm text-grey-600">
                          Income Period: February 1, 2025 - March 1, 2025
                        </p>
                      </div>
                    </div>

                    <div className="pt-4">
                      <p className="text-grey text-[32px] font-bold pb-1">
                        $121,567.00
                      </p>
                      <p className="text-xs text-primary font-semibold">
                        TOTAL INCOME
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col ml-auto justify-between border-l border-l-[#8F92A1] pl-5 pr-10 border-opacity-[40%] w-1/3">
                  <div className="flex items-center">
                    <FileText width={24} height={24} className="text-primary" />
                    <div className="pl-2">
                      <p className="text-grey-700 text-sm font-normal">
                        Income this Month
                      </p>
                      <p className="text-[20px] text-grey font-bold">
                        $ {(199.0).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <FileText width={24} height={24} className="text-primary" />
                    <div className="pl-2">
                      <p className="text-grey-700 text-sm font-normal">
                        Average per month
                      </p>
                      <p className="text-[20px] text-grey font-bold">
                        $ {(121567.0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Trend Chart */}
            <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-grey mb-4">
                Revenue Trend
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueTrendData}>
                  <defs>
                    <linearGradient
                      id="colorRevenue"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={CHART_COLORS.primary}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={CHART_COLORS.primary}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="month"
                    tick={{fontSize: 12}}
                    stroke="#6B7280"
                  />
                  <YAxis tick={{fontSize: 12}} stroke="#6B7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                    }}
                    formatter={(value: any) => [
                      `$${value.toLocaleString()}`,
                      'Revenue',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={CHART_COLORS.primary}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Income Records Table */}
            <div className="bg-white rounded-lg border border-grey-400 shadow-sm">
              <div className="p-4 border-b border-grey-400">
                <h3 className="text-lg font-semibold text-grey">
                  Monthly Breakdown
                </h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Month</TableHead>
                      <TableHead className="font-semibold">Revenue</TableHead>
                      <TableHead className="font-semibold">Invoices</TableHead>
                      <TableHead className="font-semibold">Paid</TableHead>
                      <TableHead className="font-semibold">Pending</TableHead>
                      <TableHead className="font-semibold">Avg Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {incomeRecords.map(record => {
                      const isExpanded = expandedMonth === record._id;
                      const workspaceInvoices =
                        WORKSPACE_INVOICES[record._id] || [];

                      return (
                        <>
                          {/* Month Row */}
                          <TableRow
                            key={record._id}
                            className="hover:bg-grey-100 transition-colors cursor-pointer"
                            onClick={() => handleMonthClick(record._id)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-grey-600" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-grey-600" />
                                )}
                                <span className="font-medium text-grey">
                                  {record.month}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold text-green">
                                {formatCurrency(
                                  record.revenue,
                                  record.currency,
                                )}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-grey-700">
                                {record.invoices_count}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="default" className="bg-green">
                                {record.paid_invoices}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {record.pending_invoices}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold text-grey">
                                {formatCurrency(
                                  record.average_invoice_value,
                                  record.currency,
                                )}
                              </span>
                            </TableCell>
                          </TableRow>

                          {/* Expanded Workspace Invoices */}
                          {isExpanded && (
                            <TableRow key={`${record._id}-expanded`}>
                              <TableCell colSpan={6} className="bg-grey-50 p-0">
                                <div className="p-4">
                                  <div className="bg-white rounded-lg border border-grey-400 overflow-hidden">
                                    <div className="p-3 border-b border-grey-400 bg-grey-100">
                                      <h4 className="text-sm font-semibold text-grey">
                                        Workspace Invoices - {record.month}
                                      </h4>
                                    </div>
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead className="font-semibold text-xs">
                                            Workspace
                                          </TableHead>
                                          <TableHead className="font-semibold text-xs">
                                            Bundle
                                          </TableHead>
                                          <TableHead className="font-semibold text-xs">
                                            Usage
                                          </TableHead>
                                          <TableHead className="font-semibold text-xs">
                                            Bundle Price
                                          </TableHead>
                                          <TableHead className="font-semibold text-xs">
                                            Usage Cost
                                          </TableHead>
                                          <TableHead className="font-semibold text-xs">
                                            Total
                                          </TableHead>
                                          <TableHead className="font-semibold text-xs">
                                            Status
                                          </TableHead>
                                          <TableHead className="font-semibold text-xs">
                                            Actions
                                          </TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {workspaceInvoices.map(invoice => (
                                          <TableRow
                                            key={invoice.workspace_id}
                                            className="hover:bg-grey-100"
                                          >
                                            <TableCell>
                                              <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                                                  <Users className="h-3 w-3 text-primary" />
                                                </div>
                                                <span className="text-sm font-medium text-grey">
                                                  {invoice.workspace_name}
                                                </span>
                                              </div>
                                            </TableCell>
                                            <TableCell>
                                              <Badge
                                                variant="outline"
                                                className="gap-1 text-xs text-grey"
                                              >
                                                <Package className="h-3 w-3" />
                                                {invoice.bundle_name}
                                              </Badge>
                                            </TableCell>
                                            <TableCell>
                                              <div className="flex items-center gap-1">
                                                <Zap className="h-3 w-3 text-blue-500" />
                                                <span className="text-xs text-grey-600">
                                                  {invoice.usage_count.toLocaleString()}
                                                </span>
                                              </div>
                                            </TableCell>
                                            <TableCell>
                                              <span className="text-sm font-mono text-grey">
                                                {formatCurrency(
                                                  invoice.bundle_price,
                                                  invoice.currency,
                                                )}
                                              </span>
                                            </TableCell>
                                            <TableCell>
                                              <span className="text-sm font-mono text-grey">
                                                {formatCurrency(
                                                  invoice.usage_cost,
                                                  invoice.currency,
                                                )}
                                              </span>
                                            </TableCell>
                                            <TableCell>
                                              <span className="text-sm font-semibold text-green">
                                                {formatCurrency(
                                                  invoice.total_amount,
                                                  invoice.currency,
                                                )}
                                              </span>
                                            </TableCell>
                                            <TableCell>
                                              <Badge
                                                variant={
                                                  invoice.status === 'paid'
                                                    ? 'default'
                                                    : 'secondary'
                                                }
                                                className={
                                                  invoice.status === 'paid'
                                                    ? 'bg-green text-xs'
                                                    : 'text-xs'
                                                }
                                              >
                                                {invoice.status
                                                  .charAt(0)
                                                  .toUpperCase() +
                                                  invoice.status.slice(1)}
                                              </Badge>
                                            </TableCell>
                                            <TableCell>
                                              <Button
                                                variant="ghost"
                                                size="sm"
                                                className="gap-1 h-7 text-xs"
                                                onClick={e => {
                                                  e.stopPropagation();
                                                  handleViewInvoice(invoice);
                                                }}
                                              >
                                                <FileText className="h-3 w-3" />
                                                View
                                              </Button>
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        {/* Expenditure Section */}
        {billingView === 'expenses' && (
          <div className="space-y-6">
            {/* Stats */}
            {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red/10 flex items-center justify-center">
                    <ShoppingBag className="h-5 w-5 text-red" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-grey">${expenseData?.totalSpending.toLocaleString()}</p>
                    <p className="text-sm text-grey-600">Total Spending</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-grey">{expenseData?.paid}</p>
                    <p className="text-sm text-grey-600">Paid</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow/10 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-yellow" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-grey">{expenseData?.pending}</p>
                    <p className="text-sm text-grey-600">Pending</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange/10 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-orange" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-grey">{expenseData?.issues}</p>
                    <p className="text-sm text-grey-600">Issues</p>
                  </div>
                </div>
              </div>
            </div> */}

            {/* Category Distribution Chart */}
            {/* <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-grey mb-4">Category Breakdown</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={filterDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    nameKey="category"
                    label={(props: any) => {
                      const { category, percentage } = props;
                      return `${category || ''} ${percentage ? (percentage) : 0}%`;
                    }}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {(filterDistribution ?? []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div> */}

            {/* Expenditures Table */}
          </div>
        )}

        {/* Bundle Form Dialog */}
        <Dialog
          open={bundleFormOpen}
          onOpenChange={open => {
            setBundleFormOpen(open);
            if (open) handleFormOpen();
          }}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-grey">
                {editingBundle ? 'Edit Pricing Bundle' : 'New Pricing Bundle'}
              </DialogTitle>
              <DialogDescription>
                {editingBundle
                  ? 'Update bundle details and pricing configuration'
                  : 'Create a new pricing bundle for your products'}
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 mt-4"
            >
              {/* Bundle Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Bundle Name *</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="e.g., Professional Plan"
                  className={form.formState.errors.name ? 'border-red-500' : ''}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              {/* Pricing Mode and Interval */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pricing_mode">Pricing Mode *</Label>
                  <Select
                    value={form.watch('pricing_mode')}
                    onValueChange={value =>
                      form.setValue('pricing_mode', value as PricingMode)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PricingMode.RECURRING}>
                        Recurring
                      </SelectItem>
                      <SelectItem value={PricingMode.PER_REQUEST}>
                        Per Request
                      </SelectItem>
                      <SelectItem value={PricingMode.ONE_TIME}>
                        One-Time
                      </SelectItem>
                      <SelectItem value={PricingMode.UPFRONT}>
                        Upfront
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {form.watch('pricing_mode') === PricingMode.RECURRING && (
                  <div className="space-y-2">
                    <Label htmlFor="interval">Billing Interval *</Label>
                    <Select
                      value={form.watch('interval') || PaymentInterval.MONTHLY}
                      onValueChange={value =>
                        form.setValue('interval', value as PaymentInterval)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PaymentInterval.DAILY}>
                          Daily
                        </SelectItem>
                        <SelectItem value={PaymentInterval.WEEKLY}>
                          Weekly
                        </SelectItem>
                        <SelectItem value={PaymentInterval.BI_WEEKLY}>
                          Bi-Weekly
                        </SelectItem>
                        <SelectItem value={PaymentInterval.MONTHLY}>
                          Monthly
                        </SelectItem>
                        <SelectItem value={PaymentInterval.QUARTERLY}>
                          Quarterly
                        </SelectItem>
                        <SelectItem value={PaymentInterval.YEARLY}>
                          Yearly
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Price and Currency */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit_price">
                    {form.watch('pricing_mode') === PricingMode.PER_REQUEST
                      ? 'Price per Request *'
                      : 'Price *'}
                  </Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    {...form.register('unit_price')}
                    placeholder="0.00"
                    className={
                      form.formState.errors.unit_price ? 'border-red-500' : ''
                    }
                  />
                  {form.formState.errors.unit_price && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.unit_price.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Select
                    value={form.watch('currency')}
                    onValueChange={value => form.setValue('currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="NGN">NGN (₦)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Overage Pricing - Only show for RECURRING bundles */}
              {form.watch('pricing_mode') === PricingMode.RECURRING && (
                <div className="space-y-2">
                  <Label htmlFor="overage_price">
                    Overage Price (Optional)
                  </Label>
                  <p className="text-xs text-grey-600">
                    Price per 1,000 API requests when limit is exceeded
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-grey-600">$</span>
                    <Input
                      id="overage_price"
                      type="number"
                      step="0.01"
                      {...form.register('overage_price')}
                      placeholder="0.05"
                      className={`max-w-[200px] ${form.formState.errors.overage_price ? 'border-red-500' : ''}`}
                    />
                    <span className="text-sm text-grey-600">
                      per 1,000 requests
                    </span>
                  </div>
                  {form.formState.errors.overage_price && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.overage_price.message}
                    </p>
                  )}
                </div>
              )}

              {/* Rate Limits */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">
                  Rate Limits (Optional)
                </Label>
                <p className="text-sm text-grey-600">
                  Set usage limits for this bundle
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                  <div className="space-y-1">
                    <Label htmlFor="per_minute" className="text-xs">
                      Per Minute
                    </Label>
                    <Input
                      id="per_minute"
                      type="number"
                      {...form.register('per_minute')}
                      placeholder="e.g., 100"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="per_hour" className="text-xs">
                      Per Hour
                    </Label>
                    <Input
                      id="per_hour"
                      type="number"
                      {...form.register('per_hour')}
                      placeholder="e.g., 5000"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="per_day" className="text-xs">
                      Per Day
                    </Label>
                    <Input
                      id="per_day"
                      type="number"
                      {...form.register('per_day')}
                      placeholder="e.g., 100000"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="per_week" className="text-xs">
                      Per Week
                    </Label>
                    <Input
                      id="per_week"
                      type="number"
                      {...form.register('per_week')}
                      placeholder="e.g., 500000"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="per_month" className="text-xs">
                      Per Month
                    </Label>
                    <Input
                      id="per_month"
                      type="number"
                      {...form.register('per_month')}
                      placeholder="e.g., 2000000"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end pt-4 border-t border-grey-400">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setBundleFormOpen(false);
                    setEditingBundle(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingBundle ? 'Update Bundle' : 'Create Bundle'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={!!deletingBundle}
          onOpenChange={open => !open && setDeletingBundle(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-grey">
                Delete Pricing Bundle
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this bundle? This action cannot
                be undone.
              </DialogDescription>
            </DialogHeader>

            {deletingBundle && (
              <div className="space-y-4 mt-4">
                <div className="bg-grey-100 rounded-lg border border-grey-400 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red/10 flex items-center justify-center">
                      <Package className="h-5 w-5 text-red" />
                    </div>
                    <div>
                      <p className="font-semibold text-grey">
                        {deletingBundle.name}
                      </p>
                      <p className="text-sm text-grey-600">
                        {getModeLabel(deletingBundle.pricing_mode)}
                        {deletingBundle.interval &&
                          ` - ${getIntervalLabel(deletingBundle.interval)}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setDeletingBundle(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (deletingBundle) {
                        handleDeleteBundle(deletingBundle._id);
                        setDeletingBundle(null);
                      }
                    }}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete Bundle
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Invoice Detail Modal */}
        <Dialog open={invoiceDetailOpen} onOpenChange={setInvoiceDetailOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-grey">
                Invoice Details - {selectedInvoice?.workspace_name}
              </DialogTitle>
              <DialogDescription>
                Complete invoice information for this workspace
              </DialogDescription>
            </DialogHeader>

            {selectedInvoice && (
              <div className="space-y-4 mt-4">
                {/* Invoice Summary */}
                <div className="bg-grey-100 rounded-lg border border-grey-400 p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-grey-600 mb-1">Workspace</p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <p className="font-semibold text-grey">
                          {selectedInvoice.workspace_name}
                        </p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-grey-600 mb-1">Status</p>
                      <Badge
                        variant={
                          selectedInvoice.status === 'paid'
                            ? 'default'
                            : 'secondary'
                        }
                        className={
                          selectedInvoice.status === 'paid' ? 'bg-green' : ''
                        }
                      >
                        {selectedInvoice.status.charAt(0).toUpperCase() +
                          selectedInvoice.status.slice(1)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Billing Details */}
                <div className="bg-white rounded-lg border border-grey-400">
                  <div className="p-4 border-b border-grey-400">
                    <h4 className="text-sm font-semibold text-grey">
                      Billing Details
                    </h4>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-grey-600">Bundle</p>
                        <Badge
                          variant="outline"
                          className="gap-1 mt-1 text-grey"
                        >
                          <Package className="h-3 w-3" />
                          {selectedInvoice.bundle_name}
                        </Badge>
                      </div>
                      <p className="font-mono font-semibold text-grey">
                        {formatCurrency(
                          selectedInvoice.bundle_price,
                          selectedInvoice.currency,
                        )}
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-grey-400">
                      <div>
                        <p className="text-sm text-grey-600">Usage</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Zap className="h-3 w-3 text-blue-500" />
                          <span className="text-sm text-grey-600">
                            {selectedInvoice.usage_count.toLocaleString()}{' '}
                            requests
                          </span>
                        </div>
                      </div>
                      <p className="font-mono font-semibold text-grey">
                        {formatCurrency(
                          selectedInvoice.usage_cost,
                          selectedInvoice.currency,
                        )}
                      </p>
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t-2 border-grey-400">
                      <p className="text-base font-semibold text-grey">
                        Total Amount
                      </p>
                      <p className="text-xl font-bold text-green">
                        {formatCurrency(
                          selectedInvoice.total_amount,
                          selectedInvoice.currency,
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setInvoiceDetailOpen(false)}
                  >
                    Close
                  </Button>
                  <Button className="gap-2">
                    <Download className="h-4 w-4" />
                    Download Invoice
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Upgrade Plan Dialog */}
        <Dialog open={upgradePlanOpen} onOpenChange={setUpgradePlanOpen}>
          <DialogContent className="max-w-[1086px] w-full max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[24px] font-bold text-grey">
                Upgrade Workspace
              </DialogTitle>
              <DialogDescription className="font-medium text-base text-grey">
                Choose the plan that best fits your needs. You can upgrade or
                downgrade at any time.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-4">
              {/* Current Plan Indicator */}

              {/* Plans Grid */}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tierPlans.map(plan => (
                  <PlanCard
                    key={plan.name}
                    plan={plan}
                    onSelect={() => {
                      setSelectedPlan(plan);
                      setPlanDetailOpen(true);
                    }}
                  />
                ))}

                {highlightedPlan && (
                  <UltimatePlanCard
                    plan={highlightedPlan}
                    onSelect={() => {
                      setSelectedPlan(highlightedPlan);
                      setPlanDetailOpen(true);
                    }}
                  />
                )}
              </div>

              {/* Footer Info */}
              <div className="bg-primary/15 rounded-lg border border-primary/50 p-4 mt-2">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-primary">
                    <p className="font-semibold mb-1">Upgrade Information</p>
                    <ul className="space-y-1 text-primary">
                      <li>• Upgrades take effect immediately</li>
                      <li>
                        • Downgrades will be applied at the end of your current
                        billing cycle
                      </li>
                      <li>
                        • Pro-rated charges/credits will be applied to your next
                        invoice
                      </li>
                      <li>• No cancellation fees or long-term commitments</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Usage Details Modal */}
        <Dialog open={usageDetailsOpen} onOpenChange={setUsageDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-grey">
                Usage Details
              </DialogTitle>
              <DialogDescription>
                Detailed breakdown of your current Ductape plan usage and
                billing cycle.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 space-y-6">
              {/* Current Plan Summary */}
              <div className="bg-gradient-to-r from-primary/10 to-blue-50 rounded-lg border border-primary/20 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-grey">
                      {planInfo?.name}
                    </h3>
                    <p className="text-sm text-grey-600">
                      Billing cycle:{' '}
                      {formatDate(currentBillingReport?.billingPeriodStart)} -{' '}
                      {formatDate(currentBillingReport?.billingPeriodEnd)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      {' '}
                      ${planInfo?.monthlyPrice?.toFixed(2) || '00.00'}
                    </p>
                    <p className="text-xs text-grey-600">per month</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green" />
                  <span className="text-grey-700">
                    Plan renews on{' '}
                    {formatDate(subscriptionInfo?.nextBillingDate)}
                  </span>
                </div>
              </div>

              {/* Usage Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* API Requests */}
                <div className="bg-white rounded-lg border border-grey-400 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Zap className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="font-semibold text-grey">
                        API Requests
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl font-bold text-grey">
                        {(
                          (resourceUsage as any).requests || 0
                        ).toLocaleString()}
                      </span>
                      <span className="text-sm text-grey-600">
                        of{' '}
                        {(
                          planInfo?.monthlyRequests || 1000000
                        ).toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-grey-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${
                          requestsUsage.percentage > 100
                            ? 'bg-orange-500'
                            : 'bg-primary'
                        }`}
                        style={{
                          width: `${Math.min(requestsUsage.percentage, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-grey-600">
                      {requestsUsage.percentage.toFixed(1)}% used
                    </p>

                    <div className="mt-3 pt-3 border-t border-grey-300">
                      {(requestsUsage as any).overage > 0 ? (
                        <div className="bg-orange-50 border border-orange-200 rounded px-2 py-1.5">
                          <p className="text-xs font-semibold text-orange-700">
                            Overage
                          </p>
                          <p className="text-sm font-bold text-orange-800">
                            +{(requestsUsage as any).overage.toLocaleString()}{' '}
                            requests
                          </p>
                          <p className="text-xs text-orange-600">
                            $
                            {(
                              ((requestsUsage as any) / 1000) *
                              (planInfo?.usagePricing?.additionalRequestPrice ||
                                0.05)
                            ).toFixed(2)}{' '}
                            @ $
                            {(
                              planInfo?.usagePricing?.additionalRequestPrice ||
                              0.05
                            ).toFixed(2)}
                            /1K
                          </p>
                        </div>
                      ) : (
                        <div className="bg-green-50 border border-green-200 rounded px-2 py-1.5">
                          <p className="text-xs font-semibold text-green-700">
                            Within Limit
                          </p>
                          <p className="text-sm font-bold text-green-800">
                            {(
                              requestsUsage.limit - requestsUsage.used
                            ).toLocaleString()}{' '}
                            available
                          </p>
                          <p className="text-xs text-green-600">
                            $0.00 overage
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Storage */}
                <div className="bg-white rounded-lg border border-grey-400 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                        <HardDrive className="h-4 w-4 text-purple-600" />
                      </div>
                      <span className="font-semibold text-grey">Storage</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl font-bold text-grey">
                        {storageUsage.used} GB
                      </span>
                      <span className="text-sm text-grey-600">
                        of {storageUsage.limit} GB
                      </span>
                    </div>
                    <div className="w-full bg-grey-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${
                          storageUsage.percentage > 100
                            ? 'bg-orange-500'
                            : 'bg-[#00875A]'
                        }`}
                        style={{
                          width: `${Math.min(storageUsage.percentage, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-grey-600">
                      {storageUsage.percentage.toFixed(1)}% used
                    </p>

                    <div className="mt-3 pt-3 border-t border-grey-300">
                      {(storageUsage as any).overage > 0 ? (
                        <div className="bg-orange-50 border border-orange-200 rounded px-2 py-1.5">
                          <p className="text-xs font-semibold text-orange-700">
                            Overage
                          </p>
                          <p className="text-sm font-bold text-orange-800">
                            +{storageUsage.overage} GB
                          </p>
                          <p className="text-xs text-orange-600">
                            $
                            {(
                              (storageUsage as any).overage *
                              (planInfo?.usagePricing?.additionalStoragePrice ||
                                0.3)
                            ).toFixed(2)}{' '}
                            @ $
                            {(
                              planInfo?.usagePricing?.additionalStoragePrice ||
                              0.3
                            ).toFixed(2)}
                            /GB
                          </p>
                        </div>
                      ) : (
                        <div className="bg-green-50 border border-green-200 rounded px-2 py-1.5">
                          <p className="text-xs font-semibold text-green-700">
                            Within Limit
                          </p>
                          <p className="text-sm font-bold text-green-800">
                            {storageUsage.limit - storageUsage.used} GB
                            available
                          </p>
                          <p className="text-xs text-green-600">
                            $0.00 overage
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Users */}
                <div className="bg-white rounded-lg border border-grey-400 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                        <Users className="h-4 w-4 text-green-600" />
                      </div>
                      <span className="font-semibold text-grey">Users</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl font-bold text-grey">
                        {usersUsage.used}
                      </span>
                      <span className="text-sm text-grey-600">
                        of {usersUsage.limit}
                      </span>
                    </div>
                    <div className="w-full bg-grey-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-green h-2 rounded-full"
                        style={{width: `${usersUsage.percentage}%`}}
                      ></div>
                    </div>
                    <p className="text-xs text-grey-600">
                      {usersUsage.percentage.toFixed(1)}% used
                    </p>

                    <div className="mt-3 pt-3 border-t border-grey-300">
                      {(usersUsage as any).overage > 0 ? (
                        <div className="bg-orange-50 border border-orange-200 rounded px-2 py-1.5">
                          <p className="text-xs font-semibold text-orange-700">
                            Overage
                          </p>
                          <p className="text-sm font-bold text-orange-800">
                            +{usersUsage.overage} users
                          </p>
                          <p className="text-xs text-orange-600">
                            Additional users will be billed
                          </p>
                        </div>
                      ) : (
                        <div className="bg-green-50 border border-green-200 rounded px-2 py-1.5">
                          <p className="text-xs font-semibold text-green-700">
                            Within Limit
                          </p>
                          <p className="text-sm font-bold text-green-800">
                            {usersUsage.limit - usersUsage.used} available
                          </p>
                          <p className="text-xs text-green-600">
                            $0.00 overage
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Usage History Chart */}
              <div className="bg-white rounded-lg border border-grey-400 p-5">
                <h3 className="text-lg font-semibold text-grey mb-4">
                  Usage Trends (Last 6 Months)
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart
                    data={generateHistoricalData(currentBillingReport)}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="month"
                      tick={{fontSize: 12}}
                      stroke="#6B7280"
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{fontSize: 12}}
                      stroke="#6B7280"
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{fontSize: 12}}
                      stroke="#6B7280"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="api"
                      stroke={CHART_COLORS.blue}
                      name="API Requests"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="storage"
                      stroke={CHART_COLORS.purple}
                      name="Storage (GB)"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="users"
                      stroke={CHART_COLORS.green}
                      name="Users"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Cost Breakdown */}
              <div className="bg-white rounded-lg border border-grey-400 p-5">
                <h3 className="text-lg font-semibold text-grey mb-4">
                  Cost Breakdown
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-grey-300">
                    <span className="text-sm text-grey-700">
                      Base Plan ({planInfo?.name || 'Enterprise'})
                    </span>
                    <span className="text-sm font-semibold text-grey">
                      ${planInfo?.monthlyPrice?.toFixed(2) || '199.00'}
                    </span>
                  </div>

                  {(requestsUsage as any).overage > 0 && (
                    <div className="flex justify-between items-center pb-2 border-b border-grey-300">
                      <span className="text-sm text-grey-700">
                        API Overage (+
                        {(requestsUsage as any).overage.toLocaleString()}{' '}
                        requests)
                      </span>
                      <span className="text-sm font-semibold text-orange-700">
                        $
                        {(
                          ((requestsUsage as any).overage / 1000) *
                          (planInfo?.usagePricing?.additionalRequestPrice ||
                            0.05)
                        ).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {(storageUsage as any).overage > 0 && (
                    <div className="flex justify-between items-center pb-2 border-b border-grey-300">
                      <span className="text-sm text-grey-700">
                        Storage Overage (+{storageUsage.overage} GB)
                      </span>
                      <span className="text-sm font-semibold text-orange-700">
                        $
                        {(
                          (storageUsage as any).overage *
                          (planInfo?.usagePricing?.additionalStoragePrice ||
                            0.3)
                        ).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {(usersUsage as any).overage > 0 && (
                    <div className="flex justify-between items-center pb-2 border-b border-grey-300">
                      <span className="text-sm text-grey-700">
                        User Overage (+{usersUsage.overage} users)
                      </span>
                      <span className="text-sm font-semibold text-orange-700">
                        $
                        {calculateUserOverageCost(usersUsage.overage, planInfo)}
                      </span>
                    </div>
                  )}

                  {!requestsUsage.overage &&
                    !storageUsage.overage &&
                    !usersUsage.overage && (
                      <div className="flex justify-between items-center pb-2 border-b border-grey-300">
                        <span className="text-sm text-grey-700">
                          No overages
                        </span>
                        <span className="text-sm font-semibold text-green">
                          $0.00
                        </span>
                      </div>
                    )}

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-base font-bold text-grey">
                      Total (
                      {formatDate(
                        currentBillingReport?.billingPeriodStart,
                        'MMMM yyyy',
                      )}
                      )
                    </span>
                    <span className="text-xl font-bold text-primary">
                      $
                      {calculateTotalCost(
                        currentBillingReport,
                        planInfo,
                        requestsUsage,
                        storageUsage,
                        usersUsage,
                      )}
                    </span>
                  </div>
                </div>
              </div>
              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setUsageDetailsOpen(false)}
                >
                  Close
                </Button>
                <Button
                  className="flex-1 gap-2"
                  onClick={() => {
                    setUsageDetailsOpen(false);
                    setUpgradePlanOpen(true);
                  }}
                >
                  <TrendingUp className="h-4 w-4" />
                  Upgrade Plan
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={planDetailOpen} onOpenChange={setPlanDetailOpen}>
          <DialogContent className="max-w-[1088px] max-h-[90vh] overflow-y-auto">
            {selectedPlan && (
              <section className="flex flex-col justify-center py-3 w-full pb-10">
                <button
                  onClick={handleBackToPlans}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft width={17} height={12} className="dark:invert" />
                  <p className="text-sm font-semibold text-grey-800 dark:text-grey">
                    Back
                  </p>
                </button>
                <DialogHeader>
                  <DialogTitle className="!text-2xl !text-grey !font-bold !pt-5">
                    Upgrade Workspace {currentPlan ? `from ${currentPlan}` : ''}{' '}
                    to {selectedPlan.name}
                  </DialogTitle>
                  <DialogDescription className="!text-xl !font-bold !text-grey pt-4">
                    {selectedPlan.name} plan details
                  </DialogDescription>
                </DialogHeader>

                <div className="mb-10 mt-1 py-5 px-10 bg-white border border-grey-400 rounded-[5px] flex items-start justify-between">
                  <div className="w-full text-sm flex justify-between items-start">
                    <ul className="space-y-2 my-4 text-base font-medium text-grey">
                      {/* API Requests */}
                      <li className="flex gap-2">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green font-bold" />
                          <span>
                            {selectedPlan.monthlyRequests?.toLocaleString() ||
                              'Unlimited'}{' '}
                            API requests/month
                          </span>
                        </div>
                      </li>

                      {/* Storage */}
                      <li className="flex gap-2">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green font-bold" />
                          <span>
                            {selectedPlan.fileTransfer === 0
                              ? '0GB'
                              : selectedPlan.fileTransfer
                                ? `${selectedPlan.fileTransfer}GB storage`
                                : 'Unlimited storage'}
                          </span>
                        </div>
                      </li>

                      {/* Users */}
                      <li className="flex gap-2">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green font-bold" />
                          <span>
                            {selectedPlan.users !== null
                              ? `${selectedPlan.users} users`
                              : 'Unlimited users'}
                          </span>
                        </div>
                      </li>

                      {/* Apps */}
                      <li className="flex gap-2">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green font-bold" />
                          <span>
                            {selectedPlan.apps !== null
                              ? `${selectedPlan.apps} apps`
                              : 'Unlimited apps'}
                          </span>
                        </div>
                      </li>

                      {/* Products */}
                      <li className="flex gap-2">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green font-bold" />
                          <span>
                            {selectedPlan.products !== null
                              ? `${selectedPlan.products} products`
                              : 'Unlimited products'}
                          </span>
                        </div>
                      </li>

                      {/* Logs Retention */}
                      <li className="flex gap-2">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green font-bold" />
                          <span>
                            {selectedPlan.logsRetentionDays} days logs retention
                          </span>
                        </div>
                      </li>

                      {/* Usage Data Retention */}
                      <li className="flex gap-2">
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-4 h-4 text-green font-bold" />
                          <span>
                            {selectedPlan.usageDataRetentionDays} days usage
                            data retention
                          </span>
                        </div>
                      </li>

                      {/* Product Limits - if they exist */}
                      {selectedPlan.productLimits && (
                        <>
                          <li className="flex gap-2">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green font-bold" />
                              <span>
                                {selectedPlan.productLimits.databases} databases
                              </span>
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green font-bold" />
                              <span>
                                {selectedPlan.productLimits.caches} caches
                              </span>
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green font-bold" />
                              <span>
                                {selectedPlan.productLimits.actions} actions
                              </span>
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green font-bold" />
                              <span>
                                {selectedPlan.productLimits.storageUnits}{' '}
                                storage units
                              </span>
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green font-bold" />
                              <span>
                                {selectedPlan.productLimits.messageBrokers}{' '}
                                message brokers
                              </span>
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green font-bold" />
                              <span>
                                {selectedPlan.productLimits.notifiers} notifiers
                              </span>
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green font-bold" />
                              <span>
                                {selectedPlan.productLimits.jobs} jobs
                              </span>
                            </div>
                          </li>
                          <li className="flex gap-2">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green font-bold" />
                              <span>
                                {selectedPlan.productLimits.cloudFunctions}{' '}
                                cloud functions
                              </span>
                            </div>
                          </li>
                        </>
                      )}

                      {/* Marketplace Access */}
                      {selectedPlan.marketplaceAccess && (
                        <li className="flex gap-2">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green font-bold" />
                            <span>
                              Marketplace{' '}
                              {selectedPlan.marketplaceAccess.canPublish
                                ? 'publishing'
                                : 'access'}{' '}
                              • {selectedPlan.marketplaceAccess.revenueShare}%
                              revenue share
                            </span>
                          </div>
                        </li>
                      )}

                      {/* Custom Features */}
                      {selectedPlan.customFeatures?.map((feature, i) => (
                        <li key={i} className="flex gap-2">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green font-bold" />
                            <span>{feature}</span>
                          </div>
                        </li>
                      ))}
                    </ul>

                    {/* Price Section */}
                    <div className="space-y-2 my-4">
                      <p className="font-bold text-[40px] text-grey">
                        {selectedPlan.monthlyPrice !== null ? (
                          <>
                            ${selectedPlan.monthlyPrice}
                            {selectedPlan.monthlyPrice > 0 && (
                              <span className="font-bold text-sm text-grey">
                                /month
                              </span>
                            )}
                          </>
                        ) : (
                          'Custom Pricing'
                        )}
                      </p>
                      {selectedPlan.isPayAsYouGo && (
                        <p className="text-sm text-grey-600">
                          Pay-as-you-go pricing
                        </p>
                      )}
                      {selectedPlan.tag === 'enterprise' && (
                        <p className="text-sm text-grey-600">
                          Contact sales for pricing
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="w-full mt-6 text-grey">
                  <>
                    <BillingsInfo
                      selectedPlan={selectedPlan}
                      subscriptionId={
                        billingData?.data?.currentBillingReport?.subscription_id
                          ?._id
                      }
                    />
                  </>
                </div>
              </section>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </div>
  );
}
