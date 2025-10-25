import {
  Activity,
  TrendingUp,
  TrendingDown,
  Package,
  Grid3x3,
  Zap,
  Database,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data for the dashboard
const stats = [
  {
    title: 'Active Products',
    value: '12',
    change: '+3 this month',
    trend: 'up',
    icon: Package,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    title: 'Active Apps',
    value: '24',
    change: '+5 this week',
    trend: 'up',
    icon: Grid3x3,
    color: 'text-green',
    bgColor: 'bg-green/10',
  },
  {
    title: 'Total API Calls',
    value: '1.2M',
    change: '+12.5%',
    trend: 'up',
    icon: Activity,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    title: 'Features Deployed',
    value: '48',
    change: '+8 this month',
    trend: 'up',
    icon: Zap,
    color: 'text-yellow',
    bgColor: 'bg-yellow/10',
  },
];

const productHealth = [
  { name: 'Payment Gateway', status: 'healthy', apps: 8, apiCalls: '450K/day' },
  { name: 'User Management', status: 'healthy', apps: 5, apiCalls: '320K/day' },
  { name: 'Analytics Platform', status: 'healthy', apps: 6, apiCalls: '280K/day' },
  { name: 'Notification Service', status: 'warning', apps: 3, apiCalls: '125K/day' },
  { name: 'File Storage', status: 'healthy', apps: 2, apiCalls: '95K/day' },
];

const recentActivity = [
  { time: '2m ago', event: 'Payment Gateway - App v2.1 deployed', type: 'success' },
  { time: '5m ago', event: 'Analytics Platform - New feature activated', type: 'success' },
  { time: '12m ago', event: 'Notification Service - High latency detected', type: 'warning' },
  { time: '18m ago', event: 'User Management - Session feature updated', type: 'success' },
  { time: '25m ago', event: 'New product "Email Service" created', type: 'success' },
  { time: '32m ago', event: 'File Storage - Cache optimization applied', type: 'success' },
];

const topProducts = [
  { name: 'Payment Gateway', apps: 8, requests: '450K', growth: '+15%' },
  { name: 'User Management', apps: 5, requests: '320K', growth: '+8%' },
  { name: 'Analytics Platform', apps: 6, requests: '280K', growth: '+22%' },
  { name: 'Notification Service', apps: 3, requests: '125K', growth: '+5%' },
  { name: 'File Storage', apps: 2, requests: '95K', growth: '+12%' },
];

const resourceUsage = [
  { name: 'Databases', count: 15, type: 'database', status: 'healthy' },
  { name: 'Storage Buckets', count: 8, type: 'storage', status: 'healthy' },
  { name: 'Cache Instances', count: 12, type: 'cache', status: 'healthy' },
  { name: 'Message Queues', count: 6, type: 'queue', status: 'warning' },
];

export default function Dashboard() {
  return (
    <div className="bg-grey-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-grey mb-1">Workspace Dashboard</h1>
            <p className="text-sm text-grey-600">
              Monitor your products, apps, and infrastructure in real-time
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-grey-600">
            <Clock className="h-4 w-4" />
            <span>Last updated: Just now</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
            return (
              <div
                key={stat.title}
                className="bg-white rounded-lg border border-grey-400 p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', stat.bgColor)}>
                    <Icon className={cn('h-5 w-5', stat.color)} />
                  </div>
                  <div
                    className={cn(
                      'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded',
                      stat.trend === 'up'
                        ? 'text-green bg-green/10'
                        : 'text-red bg-red/10'
                    )}
                  >
                    <TrendIcon className="h-3 w-3" />
                    {stat.change}
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-grey mb-1">{stat.value}</h3>
                <p className="text-sm text-grey-600">{stat.title}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Health */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-grey">Product Health</h2>
              <Package className="h-5 w-5 text-grey-600" />
            </div>
            <div className="space-y-3">
              {productHealth.map((product) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between p-3 rounded-lg border border-grey-400 hover:border-primary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full',
                        product.status === 'healthy' && 'bg-green',
                        product.status === 'warning' && 'bg-yellow',
                        product.status === 'error' && 'bg-red'
                      )}
                    />
                    <div>
                      <h4 className="text-sm font-medium text-grey">{product.name}</h4>
                      <p className="text-xs text-grey-600">
                        {product.apps} apps • {product.apiCalls}
                      </p>
                    </div>
                  </div>
                  {product.status === 'healthy' ? (
                    <CheckCircle className="h-5 w-5 text-green" />
                  ) : product.status === 'warning' ? (
                    <AlertTriangle className="h-5 w-5 text-yellow" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-grey">Recent Activity</h2>
              <Activity className="h-5 w-5 text-grey-600" />
            </div>
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                      activity.type === 'success' && 'bg-green',
                      activity.type === 'warning' && 'bg-yellow',
                      activity.type === 'error' && 'bg-red'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-grey truncate">{activity.event}</p>
                    <p className="text-xs text-grey-600">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Products by Usage */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-grey">Top Products by Usage</h2>
            <BarChart3 className="h-5 w-5 text-grey-600" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-grey-400">
                  <th className="text-left text-sm font-medium text-grey-600 pb-3">Product</th>
                  <th className="text-right text-sm font-medium text-grey-600 pb-3">Apps</th>
                  <th className="text-right text-sm font-medium text-grey-600 pb-3">API Calls</th>
                  <th className="text-right text-sm font-medium text-grey-600 pb-3">Growth</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => (
                  <tr key={index} className="border-b border-grey-400 last:border-b-0">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-grey-600" />
                        <span className="text-sm text-grey font-medium">{product.name}</span>
                      </div>
                    </td>
                    <td className="text-right text-sm text-grey">{product.apps}</td>
                    <td className="text-right text-sm text-grey">{product.requests}</td>
                    <td className="text-right">
                      <span className="text-sm font-medium text-green">
                        {product.growth}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resource Usage */}
        <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-grey">Resource Usage</h2>
            <Database className="h-5 w-5 text-grey-600" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {resourceUsage.map((resource) => (
              <div
                key={resource.name}
                className="p-4 rounded-lg border border-grey-400 hover:border-primary transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <Database className="h-5 w-5 text-grey-600" />
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      resource.status === 'healthy' && 'bg-green',
                      resource.status === 'warning' && 'bg-yellow',
                      resource.status === 'error' && 'bg-red'
                    )}
                  />
                </div>
                <h3 className="text-2xl font-bold text-grey mb-1">{resource.count}</h3>
                <p className="text-sm text-grey-600">{resource.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
