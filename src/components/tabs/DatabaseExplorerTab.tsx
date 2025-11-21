import React, { useState } from 'react';
import {
  Table,
  Database,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  Check,
  Filter,
  Download,
  MoreVertical,
  GitBranch,
  Zap,
  ArrowUpCircle,
  ArrowDownCircle,
  Play,
  Eye,
  EyeOff,
  Columns,
  Edit,
  X,
  ChevronDown,
  ChevronRight,
  Code,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import CodeSidebar from '@/components/CodeSidebar';

// Dummy data for database tables and records
const DUMMY_TABLES_SQL = [
  { name: 'users', type: 'table', rowCount: 1247 },
  { name: 'products', type: 'table', rowCount: 532 },
  { name: 'orders', type: 'table', rowCount: 8934 },
  { name: 'customers', type: 'table', rowCount: 3241 },
  { name: 'sessions', type: 'table', rowCount: 12453 },
  { name: 'audit_logs', type: 'table', rowCount: 45623 },
];

const DUMMY_COLLECTIONS_NOSQL = [
  { name: 'users', type: 'collection', documentCount: 1247 },
  { name: 'products', type: 'collection', documentCount: 532 },
  { name: 'orders', type: 'collection', documentCount: 8934 },
  { name: 'analytics', type: 'collection', documentCount: 125834 },
  { name: 'sessions', type: 'collection', documentCount: 12453 },
];

const DUMMY_MIGRATIONS = [
  {
    name: 'create_users_table',
    tag: 'migration_001',
    status: 'completed',
    description: 'Initial users table creation',
    created_at: '2024-01-15 10:00:00',
    up_statements: 3,
    down_statements: 1
  },
  {
    name: 'add_email_verification',
    tag: 'migration_002',
    status: 'completed',
    description: 'Add email verification columns',
    created_at: '2024-01-20 14:30:00',
    up_statements: 2,
    down_statements: 2
  },
  {
    name: 'create_products_index',
    tag: 'migration_003',
    status: 'pending',
    description: 'Add index on products.category',
    created_at: '2024-02-01 09:15:00',
    up_statements: 1,
    down_statements: 1
  },
];

const DUMMY_ACTIONS = [
  {
    name: 'getUser',
    tag: 'action_get_user',
    type: 'read',
    tableName: 'users',
    description: 'Fetch user by ID or email',
    parameters: ['id', 'email'],
  },
  {
    name: 'createOrder',
    tag: 'action_create_order',
    type: 'create',
    tableName: 'orders',
    description: 'Create a new order',
    parameters: ['user_id', 'product_id', 'amount'],
  },
  {
    name: 'updateProduct',
    tag: 'action_update_product',
    type: 'update',
    tableName: 'products',
    description: 'Update product details',
    parameters: ['id', 'name', 'price', 'stock'],
  },
  {
    name: 'deleteSession',
    tag: 'action_delete_session',
    type: 'delete',
    tableName: 'sessions',
    description: 'Remove expired sessions',
    parameters: ['session_id'],
  },
];

const DUMMY_USERS_DATA = [
  { id: 1, email: 'john.doe@example.com', name: 'John Doe', role: 'admin', phone: '+1-555-0101', address: '123 Main St', city: 'New York', country: 'USA', subscription: 'enterprise', total_orders: 47, lifetime_value: '$12,450', last_login: '2024-03-15 09:23:00', created_at: '2024-01-15 10:30:00', is_active: true },
  { id: 2, email: 'jane.smith@example.com', name: 'Jane Smith', role: 'user', phone: '+1-555-0102', address: '456 Oak Ave', city: 'Los Angeles', country: 'USA', subscription: 'pro', total_orders: 23, lifetime_value: '$3,890', last_login: '2024-03-14 18:45:00', created_at: '2024-01-16 14:22:00', is_active: true },
  { id: 3, email: 'bob.wilson@example.com', name: 'Bob Wilson', role: 'user', phone: '+1-555-0103', address: '789 Pine Rd', city: 'Chicago', country: 'USA', subscription: 'free', total_orders: 5, lifetime_value: '$450', last_login: '2024-03-13 14:12:00', created_at: '2024-01-17 09:15:00', is_active: true },
  { id: 4, email: 'alice.brown@example.com', name: 'Alice Brown', role: 'moderator', phone: '+44-20-7946-0958', address: '12 Kings Road', city: 'London', country: 'UK', subscription: 'pro', total_orders: 31, lifetime_value: '$5,670', last_login: '2024-02-28 11:30:00', created_at: '2024-01-18 16:45:00', is_active: false },
  { id: 5, email: 'charlie.davis@example.com', name: 'Charlie Davis', role: 'user', phone: '+1-555-0105', address: '321 Elm St', city: 'Boston', country: 'USA', subscription: 'free', total_orders: 8, lifetime_value: '$720', last_login: '2024-03-15 07:18:00', created_at: '2024-01-19 11:20:00', is_active: true },
  { id: 6, email: 'emily.johnson@example.com', name: 'Emily Johnson', role: 'user', phone: '+1-555-0106', address: '654 Maple Dr', city: 'Seattle', country: 'USA', subscription: 'pro', total_orders: 19, lifetime_value: '$2,890', last_login: '2024-03-14 22:05:00', created_at: '2024-01-20 08:45:00', is_active: true },
  { id: 7, email: 'michael.chen@example.com', name: 'Michael Chen', role: 'moderator', phone: '+86-10-1234-5678', address: '88 Chaoyang Rd', city: 'Beijing', country: 'China', subscription: 'enterprise', total_orders: 52, lifetime_value: '$15,230', last_login: '2024-03-15 03:42:00', created_at: '2024-01-21 13:30:00', is_active: true },
  { id: 8, email: 'sarah.miller@example.com', name: 'Sarah Miller', role: 'user', phone: '+1-555-0108', address: '987 Birch Ln', city: 'Austin', country: 'USA', subscription: 'pro', total_orders: 14, lifetime_value: '$1,950', last_login: '2024-03-12 16:20:00', created_at: '2024-01-22 10:15:00', is_active: true },
  { id: 9, email: 'david.garcia@example.com', name: 'David Garcia', role: 'user', phone: '+34-91-123-4567', address: 'Calle Mayor 45', city: 'Madrid', country: 'Spain', subscription: 'free', total_orders: 2, lifetime_value: '$180', last_login: '2024-02-15 19:33:00', created_at: '2024-01-23 16:20:00', is_active: false },
  { id: 10, email: 'lisa.anderson@example.com', name: 'Lisa Anderson', role: 'admin', created_at: '2024-01-24 09:00:00', is_active: true },
  { id: 11, email: 'james.martinez@example.com', name: 'James Martinez', role: 'user', created_at: '2024-01-25 11:45:00', is_active: true },
  { id: 12, email: 'maria.rodriguez@example.com', name: 'Maria Rodriguez', role: 'user', created_at: '2024-01-26 14:30:00', is_active: true },
  { id: 13, email: 'robert.lee@example.com', name: 'Robert Lee', role: 'moderator', created_at: '2024-01-27 10:10:00', is_active: true },
  { id: 14, email: 'jennifer.white@example.com', name: 'Jennifer White', role: 'user', created_at: '2024-01-28 15:55:00', is_active: false },
  { id: 15, email: 'william.taylor@example.com', name: 'William Taylor', role: 'user', created_at: '2024-01-29 08:30:00', is_active: true },
  { id: 16, email: 'patricia.thomas@example.com', name: 'Patricia Thomas', role: 'user', created_at: '2024-01-30 12:40:00', is_active: true },
  { id: 17, email: 'richard.jackson@example.com', name: 'Richard Jackson', role: 'admin', created_at: '2024-01-31 09:25:00', is_active: true },
  { id: 18, email: 'linda.harris@example.com', name: 'Linda Harris', role: 'user', created_at: '2024-02-01 14:15:00', is_active: true },
  { id: 19, email: 'charles.martin@example.com', name: 'Charles Martin', role: 'user', created_at: '2024-02-02 11:50:00', is_active: false },
  { id: 20, email: 'barbara.thompson@example.com', name: 'Barbara Thompson', role: 'moderator', created_at: '2024-02-03 16:05:00', is_active: true },
  { id: 21, email: 'joseph.garcia@example.com', name: 'Joseph Garcia', role: 'user', created_at: '2024-02-04 10:30:00', is_active: true },
  { id: 22, email: 'susan.clark@example.com', name: 'Susan Clark', role: 'user', created_at: '2024-02-05 13:20:00', is_active: true },
  { id: 23, email: 'thomas.rodriguez@example.com', name: 'Thomas Rodriguez', role: 'user', created_at: '2024-02-06 08:45:00', is_active: true },
  { id: 24, email: 'jessica.lewis@example.com', name: 'Jessica Lewis', role: 'user', created_at: '2024-02-07 15:35:00', is_active: false },
  { id: 25, email: 'daniel.walker@example.com', name: 'Daniel Walker', role: 'admin', created_at: '2024-02-08 09:10:00', is_active: true },
  { id: 26, email: 'nancy.hall@example.com', name: 'Nancy Hall', role: 'user', created_at: '2024-02-09 12:00:00', is_active: true },
  { id: 27, email: 'matthew.allen@example.com', name: 'Matthew Allen', role: 'moderator', created_at: '2024-02-10 14:45:00', is_active: true },
  { id: 28, email: 'betty.young@example.com', name: 'Betty Young', role: 'user', created_at: '2024-02-11 10:20:00', is_active: true },
  { id: 29, email: 'anthony.king@example.com', name: 'Anthony King', role: 'user', created_at: '2024-02-12 16:30:00', is_active: true },
  { id: 30, email: 'dorothy.wright@example.com', name: 'Dorothy Wright', role: 'user', created_at: '2024-02-13 11:15:00', is_active: false },
  { id: 31, email: 'mark.hill@example.com', name: 'Mark Hill', role: 'user', created_at: '2024-02-14 13:25:00', is_active: true },
  { id: 32, email: 'sandra.scott@example.com', name: 'Sandra Scott', role: 'user', created_at: '2024-02-15 09:40:00', is_active: true },
  { id: 33, email: 'steven.green@example.com', name: 'Steven Green', role: 'moderator', created_at: '2024-02-16 15:10:00', is_active: true },
  { id: 34, email: 'ashley.baker@example.com', name: 'Ashley Baker', role: 'user', created_at: '2024-02-17 11:35:00', is_active: false },
  { id: 35, email: 'kevin.adams@example.com', name: 'Kevin Adams', role: 'user', created_at: '2024-02-18 14:05:00', is_active: true },
  { id: 36, email: 'donna.nelson@example.com', name: 'Donna Nelson', role: 'user', created_at: '2024-02-19 08:20:00', is_active: true },
  { id: 37, email: 'brian.carter@example.com', name: 'Brian Carter', role: 'admin', created_at: '2024-02-20 12:50:00', is_active: true },
  { id: 38, email: 'carol.mitchell@example.com', name: 'Carol Mitchell', role: 'user', created_at: '2024-02-21 10:15:00', is_active: true },
  { id: 39, email: 'george.perez@example.com', name: 'George Perez', role: 'user', created_at: '2024-02-22 16:40:00', is_active: false },
  { id: 40, email: 'michelle.roberts@example.com', name: 'Michelle Roberts', role: 'moderator', created_at: '2024-02-23 09:05:00', is_active: true },
  { id: 41, email: 'edward.turner@example.com', name: 'Edward Turner', role: 'user', created_at: '2024-02-24 13:30:00', is_active: true },
  { id: 42, email: 'laura.phillips@example.com', name: 'Laura Phillips', role: 'user', created_at: '2024-02-25 11:00:00', is_active: true },
  { id: 43, email: 'ronald.campbell@example.com', name: 'Ronald Campbell', role: 'user', created_at: '2024-02-26 15:20:00', is_active: true },
  { id: 44, email: 'kimberly.parker@example.com', name: 'Kimberly Parker', role: 'user', created_at: '2024-02-27 08:45:00', is_active: false },
  { id: 45, email: 'jason.evans@example.com', name: 'Jason Evans', role: 'user', created_at: '2024-02-28 12:10:00', is_active: true },
  { id: 46, email: 'deborah.edwards@example.com', name: 'Deborah Edwards', role: 'user', created_at: '2024-02-29 14:35:00', is_active: true },
  { id: 47, email: 'jeffrey.collins@example.com', name: 'Jeffrey Collins', role: 'moderator', created_at: '2024-03-01 10:00:00', is_active: true },
  { id: 48, email: 'helen.stewart@example.com', name: 'Helen Stewart', role: 'user', created_at: '2024-03-02 16:25:00', is_active: true },
  { id: 49, email: 'ryan.sanchez@example.com', name: 'Ryan Sanchez', role: 'user', created_at: '2024-03-03 09:50:00', is_active: false },
  { id: 50, email: 'sharon.morris@example.com', name: 'Sharon Morris', role: 'admin', created_at: '2024-03-04 13:15:00', is_active: true },
  { id: 51, email: 'jacob.rogers@example.com', name: 'Jacob Rogers', role: 'user', created_at: '2024-03-05 11:40:00', is_active: true },
  { id: 52, email: 'cynthia.reed@example.com', name: 'Cynthia Reed', role: 'user', created_at: '2024-03-06 15:05:00', is_active: true },
  { id: 53, email: 'gary.cook@example.com', name: 'Gary Cook', role: 'user', created_at: '2024-03-07 08:30:00', is_active: true },
  { id: 54, email: 'kathleen.morgan@example.com', name: 'Kathleen Morgan', role: 'user', created_at: '2024-03-08 12:55:00', is_active: false },
  { id: 55, email: 'nicholas.bell@example.com', name: 'Nicholas Bell', role: 'moderator', created_at: '2024-03-09 10:20:00', is_active: true },
  { id: 56, email: 'amy.murphy@example.com', name: 'Amy Murphy', role: 'user', created_at: '2024-03-10 14:45:00', is_active: true },
  { id: 57, email: 'jonathan.bailey@example.com', name: 'Jonathan Bailey', role: 'user', created_at: '2024-03-11 09:10:00', is_active: true },
  { id: 58, email: 'angela.rivera@example.com', name: 'Angela Rivera', role: 'user', created_at: '2024-03-12 13:35:00', is_active: true },
  { id: 59, email: 'jeremy.cooper@example.com', name: 'Jeremy Cooper', role: 'user', created_at: '2024-03-13 11:00:00', is_active: false },
  { id: 60, email: 'melissa.richardson@example.com', name: 'Melissa Richardson', role: 'admin', created_at: '2024-03-14 15:25:00', is_active: true },
  { id: 61, email: 'timothy.cox@example.com', name: 'Timothy Cox', role: 'user', created_at: '2024-03-15 08:50:00', is_active: true },
  { id: 62, email: 'brenda.howard@example.com', name: 'Brenda Howard', role: 'user', created_at: '2024-03-16 12:15:00', is_active: true },
  { id: 63, email: 'sean.ward@example.com', name: 'Sean Ward', role: 'moderator', created_at: '2024-03-17 10:40:00', is_active: true },
  { id: 64, email: 'katherine.torres@example.com', name: 'Katherine Torres', role: 'user', created_at: '2024-03-18 15:05:00', is_active: false },
  { id: 65, email: 'eric.peterson@example.com', name: 'Eric Peterson', role: 'user', created_at: '2024-03-19 09:30:00', is_active: true },
  { id: 66, email: 'anna.gray@example.com', name: 'Anna Gray', role: 'user', created_at: '2024-03-20 13:55:00', is_active: true },
  { id: 67, email: 'douglas.ramirez@example.com', name: 'Douglas Ramirez', role: 'user', created_at: '2024-03-21 11:20:00', is_active: true },
  { id: 68, email: 'rebecca.james@example.com', name: 'Rebecca James', role: 'user', created_at: '2024-03-22 15:45:00', is_active: true },
  { id: 69, email: 'peter.watson@example.com', name: 'Peter Watson', role: 'user', created_at: '2024-03-23 08:10:00', is_active: false },
  { id: 70, email: 'christine.brooks@example.com', name: 'Christine Brooks', role: 'moderator', created_at: '2024-03-24 12:35:00', is_active: true },
  { id: 71, email: 'adam.kelly@example.com', name: 'Adam Kelly', role: 'user', created_at: '2024-03-25 10:00:00', is_active: true },
  { id: 72, email: 'frances.sanders@example.com', name: 'Frances Sanders', role: 'user', created_at: '2024-03-26 14:25:00', is_active: true },
  { id: 73, email: 'benjamin.price@example.com', name: 'Benjamin Price', role: 'admin', created_at: '2024-03-27 09:50:00', is_active: true },
  { id: 74, email: 'janet.bennett@example.com', name: 'Janet Bennett', role: 'user', created_at: '2024-03-28 13:15:00', is_active: false },
  { id: 75, email: 'harold.wood@example.com', name: 'Harold Wood', role: 'user', created_at: '2024-03-29 11:40:00', is_active: true },
  { id: 76, email: 'diane.barnes@example.com', name: 'Diane Barnes', role: 'user', created_at: '2024-03-30 15:05:00', is_active: true },
  { id: 77, email: 'jack.ross@example.com', name: 'Jack Ross', role: 'moderator', created_at: '2024-03-31 08:30:00', is_active: true },
  { id: 78, email: 'joyce.henderson@example.com', name: 'Joyce Henderson', role: 'user', created_at: '2024-04-01 12:55:00', is_active: true },
  { id: 79, email: 'gerald.coleman@example.com', name: 'Gerald Coleman', role: 'user', created_at: '2024-04-02 10:20:00', is_active: false },
  { id: 80, email: 'rose.jenkins@example.com', name: 'Rose Jenkins', role: 'user', created_at: '2024-04-03 14:45:00', is_active: true },
  { id: 81, email: 'carl.perry@example.com', name: 'Carl Perry', role: 'user', created_at: '2024-04-04 09:10:00', is_active: true },
  { id: 82, email: 'judy.powell@example.com', name: 'Judy Powell', role: 'user', created_at: '2024-04-05 13:35:00', is_active: true },
  { id: 83, email: 'keith.long@example.com', name: 'Keith Long', role: 'user', created_at: '2024-04-06 11:00:00', is_active: true },
  { id: 84, email: 'theresa.patterson@example.com', name: 'Theresa Patterson', role: 'user', created_at: '2024-04-07 15:25:00', is_active: false },
  { id: 85, email: 'roger.hughes@example.com', name: 'Roger Hughes', role: 'admin', created_at: '2024-04-08 08:50:00', is_active: true },
  { id: 86, email: 'evelyn.flores@example.com', name: 'Evelyn Flores', role: 'user', created_at: '2024-04-09 12:15:00', is_active: true },
  { id: 87, email: 'arthur.washington@example.com', name: 'Arthur Washington', role: 'moderator', created_at: '2024-04-10 10:40:00', is_active: true },
  { id: 88, email: 'marie.butler@example.com', name: 'Marie Butler', role: 'user', created_at: '2024-04-11 15:05:00', is_active: true },
  { id: 89, email: 'lawrence.simmons@example.com', name: 'Lawrence Simmons', role: 'user', created_at: '2024-04-12 09:30:00', is_active: false },
  { id: 90, email: 'martha.foster@example.com', name: 'Martha Foster', role: 'user', created_at: '2024-04-13 13:55:00', is_active: true },
  { id: 91, email: 'frank.gonzales@example.com', name: 'Frank Gonzales', role: 'user', created_at: '2024-04-14 11:20:00', is_active: true },
  { id: 92, email: 'gloria.bryant@example.com', name: 'Gloria Bryant', role: 'user', created_at: '2024-04-15 15:45:00', is_active: true },
  { id: 93, email: 'terry.alexander@example.com', name: 'Terry Alexander', role: 'user', created_at: '2024-04-16 08:10:00', is_active: true },
  { id: 94, email: 'judith.russell@example.com', name: 'Judith Russell', role: 'user', created_at: '2024-04-17 12:35:00', is_active: false },
  { id: 95, email: 'albert.griffin@example.com', name: 'Albert Griffin', role: 'moderator', created_at: '2024-04-18 10:00:00', is_active: true },
  { id: 96, email: 'julia.diaz@example.com', name: 'Julia Diaz', role: 'user', created_at: '2024-04-19 14:25:00', is_active: true },
  { id: 97, email: 'randy.hayes@example.com', name: 'Randy Hayes', role: 'user', created_at: '2024-04-20 09:50:00', is_active: true },
  { id: 98, email: 'cheryl.myers@example.com', name: 'Cheryl Myers', role: 'admin', created_at: '2024-04-21 13:15:00', is_active: true },
  { id: 99, email: 'eugene.ford@example.com', name: 'Eugene Ford', role: 'user', created_at: '2024-04-22 11:40:00', is_active: false },
  { id: 100, email: 'kathryn.hamilton@example.com', name: 'Kathryn Hamilton', role: 'user', created_at: '2024-04-23 15:05:00', is_active: true },
];

const DUMMY_PRODUCTS_DATA = [
  { id: 1, name: 'Premium Subscription', price: 29.99, category: 'subscription', stock: null, created_at: '2024-01-10 08:00:00', features: { maxUsers: 10, storage: '100GB', support: '24/7', analytics: true, customDomain: true } },
  { id: 2, name: 'Pro Plan', price: 49.99, category: 'subscription', stock: null, created_at: '2024-01-11 10:30:00', features: { maxUsers: 25, storage: '500GB', support: 'priority', analytics: true, customDomain: true, apiAccess: true } },
  { id: 3, name: 'API Credits (1000)', price: 10.00, category: 'credits', stock: 999999, created_at: '2024-01-12 14:15:00', features: { credits: 1000, validity: '30 days', endpoints: ['v1', 'v2'] } },
  { id: 4, name: 'Enterprise License', price: 299.99, category: 'license', stock: null, created_at: '2024-01-13 09:45:00', features: { maxUsers: -1, storage: 'unlimited', support: 'dedicated', sla: '99.99%', customization: true, onPremise: true } },
  { id: 5, name: 'Basic Plan', price: 9.99, category: 'subscription', stock: null, created_at: '2024-01-14 11:20:00', features: { maxUsers: 3, storage: '10GB', support: 'email', analytics: false } },
  { id: 6, name: 'API Credits (5000)', price: 45.00, category: 'credits', stock: 500000, created_at: '2024-01-15 13:40:00' },
  { id: 7, name: 'Starter Package', price: 19.99, category: 'package', stock: 250, created_at: '2024-01-16 09:30:00' },
  { id: 8, name: 'Advanced Analytics', price: 79.99, category: 'addon', stock: null, created_at: '2024-01-17 14:55:00' },
  { id: 9, name: 'Team License (5 users)', price: 149.99, category: 'license', stock: 100, created_at: '2024-01-18 10:15:00' },
  { id: 10, name: 'API Credits (10000)', price: 85.00, category: 'credits', stock: 200000, created_at: '2024-01-19 15:20:00' },
  { id: 11, name: 'Professional Support', price: 99.99, category: 'support', stock: null, created_at: '2024-01-20 08:45:00' },
  { id: 12, name: 'Custom Domain', price: 15.99, category: 'addon', stock: null, created_at: '2024-01-21 12:30:00' },
  { id: 13, name: 'Priority Queue Access', price: 24.99, category: 'addon', stock: null, created_at: '2024-01-22 09:10:00' },
  { id: 14, name: 'Ultimate Plan', price: 199.99, category: 'subscription', stock: null, created_at: '2024-01-23 14:00:00' },
  { id: 15, name: 'Storage Upgrade (100GB)', price: 12.99, category: 'storage', stock: null, created_at: '2024-01-24 10:40:00' },
  { id: 16, name: 'Business License', price: 499.99, category: 'license', stock: 50, created_at: '2024-01-25 16:25:00' },
  { id: 17, name: 'API Credits (25000)', price: 200.00, category: 'credits', stock: 100000, created_at: '2024-01-26 11:50:00' },
  { id: 18, name: 'White Label Solution', price: 999.99, category: 'enterprise', stock: 10, created_at: '2024-01-27 13:15:00' },
  { id: 19, name: 'Backup Service', price: 19.99, category: 'service', stock: null, created_at: '2024-01-28 09:35:00' },
  { id: 20, name: 'SSL Certificate', price: 49.99, category: 'security', stock: null, created_at: '2024-01-29 14:20:00' },
  { id: 21, name: 'Storage Upgrade (500GB)', price: 49.99, category: 'storage', stock: null, created_at: '2024-01-30 10:05:00' },
  { id: 22, name: 'API Rate Limit Boost', price: 34.99, category: 'addon', stock: null, created_at: '2024-01-31 15:40:00' },
  { id: 23, name: 'Dedicated Instance', price: 799.99, category: 'enterprise', stock: 5, created_at: '2024-02-01 08:30:00' },
  { id: 24, name: 'Migration Service', price: 149.99, category: 'service', stock: 25, created_at: '2024-02-02 12:55:00' },
  { id: 25, name: 'Compliance Package', price: 299.99, category: 'security', stock: null, created_at: '2024-02-03 09:20:00' },
  { id: 26, name: 'Monitoring Dashboard', price: 39.99, category: 'addon', stock: null, created_at: '2024-02-04 11:10:00' },
  { id: 27, name: 'Data Export Tool', price: 24.99, category: 'addon', stock: null, created_at: '2024-02-05 14:25:00' },
  { id: 28, name: 'Team License (10 users)', price: 249.99, category: 'license', stock: 75, created_at: '2024-02-06 09:40:00' },
  { id: 29, name: 'API Credits (50000)', price: 375.00, category: 'credits', stock: 50000, created_at: '2024-02-07 16:15:00' },
  { id: 30, name: 'Storage Upgrade (1TB)', price: 89.99, category: 'storage', stock: null, created_at: '2024-02-08 10:30:00' },
  { id: 31, name: 'Email Marketing Add-on', price: 54.99, category: 'addon', stock: null, created_at: '2024-02-09 13:45:00' },
  { id: 32, name: 'Mobile App Builder', price: 129.99, category: 'addon', stock: null, created_at: '2024-02-10 08:20:00' },
  { id: 33, name: 'Advanced Security Suite', price: 179.99, category: 'security', stock: null, created_at: '2024-02-11 15:35:00' },
  { id: 34, name: 'Developer Tools Package', price: 69.99, category: 'package', stock: 150, created_at: '2024-02-12 11:50:00' },
  { id: 35, name: 'Premium Support', price: 199.99, category: 'support', stock: null, created_at: '2024-02-13 14:05:00' },
  { id: 36, name: 'Load Balancer', price: 299.99, category: 'enterprise', stock: 20, created_at: '2024-02-14 09:20:00' },
  { id: 37, name: 'Database Replication', price: 349.99, category: 'enterprise', stock: 15, created_at: '2024-02-15 12:35:00' },
  { id: 38, name: 'API Credits (100000)', price: 650.00, category: 'credits', stock: 25000, created_at: '2024-02-16 10:50:00' },
  { id: 39, name: 'Multi-Region Hosting', price: 449.99, category: 'enterprise', stock: 10, created_at: '2024-02-17 15:05:00' },
  { id: 40, name: 'CI/CD Pipeline', price: 89.99, category: 'addon', stock: null, created_at: '2024-02-18 08:15:00' },
  { id: 41, name: 'Container Registry', price: 44.99, category: 'addon', stock: null, created_at: '2024-02-19 13:30:00' },
  { id: 42, name: 'Team License (20 users)', price: 449.99, category: 'license', stock: 40, created_at: '2024-02-20 11:45:00' },
  { id: 43, name: 'Automated Testing Suite', price: 119.99, category: 'addon', stock: null, created_at: '2024-02-21 16:00:00' },
  { id: 44, name: 'Performance Monitoring', price: 64.99, category: 'addon', stock: null, created_at: '2024-02-22 09:15:00' },
  { id: 45, name: 'Log Aggregation', price: 74.99, category: 'addon', stock: null, created_at: '2024-02-23 14:30:00' },
  { id: 46, name: 'Disaster Recovery', price: 549.99, category: 'enterprise', stock: 8, created_at: '2024-02-24 10:45:00' },
  { id: 47, name: 'API Gateway', price: 159.99, category: 'enterprise', stock: 30, created_at: '2024-02-25 15:55:00' },
  { id: 48, name: 'Serverless Functions', price: 29.99, category: 'addon', stock: null, created_at: '2024-02-26 08:10:00' },
  { id: 49, name: 'Edge Computing', price: 199.99, category: 'enterprise', stock: 12, created_at: '2024-02-27 13:25:00' },
  { id: 50, name: 'API Credits (250000)', price: 1499.99, category: 'credits', stock: 10000, created_at: '2024-02-28 11:40:00' },
  { id: 51, name: 'Storage Upgrade (5TB)', price: 399.99, category: 'storage', stock: null, created_at: '2024-02-29 16:50:00' },
  { id: 52, name: 'Content Delivery Network', price: 129.99, category: 'addon', stock: null, created_at: '2024-03-01 09:05:00' },
  { id: 53, name: 'DDoS Protection', price: 249.99, category: 'security', stock: null, created_at: '2024-03-02 14:20:00' },
  { id: 54, name: 'Team License (50 users)', price: 999.99, category: 'license', stock: 20, created_at: '2024-03-03 10:35:00' },
  { id: 55, name: 'Web Application Firewall', price: 179.99, category: 'security', stock: null, created_at: '2024-03-04 15:45:00' },
  { id: 56, name: 'Identity Management', price: 89.99, category: 'security', stock: null, created_at: '2024-03-05 08:00:00' },
  { id: 57, name: 'Secret Management', price: 54.99, category: 'security', stock: null, created_at: '2024-03-06 13:15:00' },
  { id: 58, name: 'Audit Logging', price: 69.99, category: 'security', stock: null, created_at: '2024-03-07 11:30:00' },
  { id: 59, name: 'Compliance Monitoring', price: 149.99, category: 'security', stock: null, created_at: '2024-03-08 16:40:00' },
  { id: 60, name: 'Vulnerability Scanning', price: 99.99, category: 'security', stock: null, created_at: '2024-03-09 09:55:00' },
  { id: 61, name: 'Penetration Testing', price: 499.99, category: 'security', stock: 15, created_at: '2024-03-10 15:10:00' },
  { id: 62, name: 'Incident Response', price: 299.99, category: 'support', stock: null, created_at: '2024-03-11 10:25:00' },
  { id: 63, name: 'Training Package', price: 199.99, category: 'support', stock: 50, created_at: '2024-03-12 14:35:00' },
  { id: 64, name: 'Consulting Hours (10h)', price: 1499.99, category: 'support', stock: 30, created_at: '2024-03-13 08:50:00' },
  { id: 65, name: 'API Credits (500000)', price: 2799.99, category: 'credits', stock: 5000, created_at: '2024-03-14 13:05:00' },
  { id: 66, name: 'Storage Upgrade (10TB)', price: 749.99, category: 'storage', stock: null, created_at: '2024-03-15 11:20:00' },
  { id: 67, name: 'Database Backup Service', price: 79.99, category: 'service', stock: null, created_at: '2024-03-16 16:30:00' },
  { id: 68, name: 'Managed Kubernetes', price: 599.99, category: 'enterprise', stock: 8, created_at: '2024-03-17 09:45:00' },
  { id: 69, name: 'Service Mesh', price: 279.99, category: 'enterprise', stock: 12, created_at: '2024-03-18 15:00:00' },
  { id: 70, name: 'Observability Platform', price: 349.99, category: 'addon', stock: null, created_at: '2024-03-19 10:15:00' },
  { id: 71, name: 'Infrastructure as Code', price: 119.99, category: 'addon', stock: null, created_at: '2024-03-20 14:25:00' },
  { id: 72, name: 'Team License (100 users)', price: 1899.99, category: 'license', stock: 10, created_at: '2024-03-21 08:40:00' },
  { id: 73, name: 'Blue-Green Deployment', price: 159.99, category: 'addon', stock: null, created_at: '2024-03-22 13:55:00' },
  { id: 74, name: 'A/B Testing Platform', price: 99.99, category: 'addon', stock: null, created_at: '2024-03-23 11:10:00' },
  { id: 75, name: 'Feature Flags Service', price: 49.99, category: 'addon', stock: null, created_at: '2024-03-24 16:20:00' },
  { id: 76, name: 'Microservices Gateway', price: 249.99, category: 'enterprise', stock: 15, created_at: '2024-03-25 09:35:00' },
  { id: 77, name: 'Event Streaming Platform', price: 399.99, category: 'enterprise', stock: 10, created_at: '2024-03-26 14:50:00' },
  { id: 78, name: 'GraphQL API Layer', price: 139.99, category: 'addon', stock: null, created_at: '2024-03-27 10:05:00' },
  { id: 79, name: 'API Credits (1000000)', price: 4999.99, category: 'credits', stock: 2000, created_at: '2024-03-28 15:15:00' },
  { id: 80, name: 'Storage Upgrade (50TB)', price: 2999.99, category: 'storage', stock: null, created_at: '2024-03-29 08:30:00' },
];

const DUMMY_ORDERS_DATA = Array.from({ length: 150 }, (_, i) => {
  const orderId = 1001 + i;
  const userId = (i % 100) + 1;
  const productId = (i % 80) + 1;
  const statuses = ['completed', 'pending', 'failed'];
  const status = statuses[i % 10 < 7 ? 0 : (i % 10 < 9 ? 1 : 2)];
  const baseDate = new Date('2024-02-01');
  const daysToAdd = Math.floor(i / 3);
  const hours = 8 + (i % 9);
  const minutes = (i * 13) % 60;
  const orderDate = new Date(baseDate);
  orderDate.setDate(orderDate.getDate() + daysToAdd);
  const created_at = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}-${String(orderDate.getDate()).padStart(2, '0')} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

  const prices = [29.99, 49.99, 10.00, 299.99, 9.99, 45.00, 19.99, 79.99, 149.99, 85.00, 99.99, 15.99, 24.99, 199.99, 12.99, 499.99, 200.00, 999.99, 19.99, 49.99, 39.99, 24.99, 249.99, 375.00, 89.99, 54.99, 129.99, 179.99, 69.99, 199.99, 299.99, 349.99, 650.00, 449.99, 89.99, 44.99, 449.99, 119.99, 64.99, 74.99, 549.99, 159.99, 29.99, 199.99, 1499.99, 399.99, 129.99, 249.99, 999.99, 179.99];
  const amount = prices[i % prices.length];

  return { id: orderId, user_id: userId, product_id: productId, amount, status, created_at };
});

const DUMMY_CUSTOMERS_DATA = [
  { id: 1, company_name: 'Acme Corporation', contact_email: 'contact@acme.com', phone: '+1-555-0101', country: 'USA', total_orders: 45, created_at: '2023-06-15 09:30:00' },
  { id: 2, company_name: 'TechStart Solutions', contact_email: 'info@techstart.com', phone: '+1-555-0102', country: 'USA', total_orders: 32, created_at: '2023-07-22 14:15:00' },
  { id: 3, company_name: 'Global Industries', contact_email: 'sales@globalind.com', phone: '+44-20-5550103', country: 'UK', total_orders: 67, created_at: '2023-08-10 11:45:00' },
  { id: 4, company_name: 'Innovation Labs', contact_email: 'hello@innovationlabs.io', phone: '+1-555-0104', country: 'Canada', total_orders: 23, created_at: '2023-09-05 16:20:00' },
  { id: 5, company_name: 'Digital Dynamics', contact_email: 'contact@digitaldyn.com', phone: '+61-2-5550105', country: 'Australia', total_orders: 51, created_at: '2023-10-18 10:00:00' },
  { id: 6, company_name: 'CloudNine Systems', contact_email: 'support@cloudnine.com', phone: '+1-555-0106', country: 'USA', total_orders: 89, created_at: '2023-11-02 13:30:00' },
  { id: 7, company_name: 'DataFlow Inc', contact_email: 'info@dataflow.com', phone: '+49-30-5550107', country: 'Germany', total_orders: 41, created_at: '2023-12-14 08:45:00' },
  { id: 8, company_name: 'NextGen Enterprises', contact_email: 'business@nextgen.com', phone: '+1-555-0108', country: 'USA', total_orders: 76, created_at: '2024-01-08 15:10:00' },
  { id: 9, company_name: 'Quantum Solutions', contact_email: 'contact@quantumsol.com', phone: '+33-1-5550109', country: 'France', total_orders: 28, created_at: '2024-02-20 12:25:00' },
  { id: 10, company_name: 'StreamTech Co', contact_email: 'hello@streamtech.io', phone: '+1-555-0110', country: 'USA', total_orders: 94, created_at: '2024-03-05 09:40:00' },
  { id: 11, company_name: 'Velocity Networks', contact_email: 'sales@velocity.net', phone: '+1-555-0111', country: 'USA', total_orders: 37, created_at: '2024-03-19 14:55:00' },
  { id: 12, company_name: 'Infinite Systems', contact_email: 'info@infinitesys.com', phone: '+81-3-5550112', country: 'Japan', total_orders: 62, created_at: '2024-04-02 11:15:00' },
  { id: 13, company_name: 'Horizon Tech', contact_email: 'contact@horizontech.com', phone: '+65-5550113', country: 'Singapore', total_orders: 48, created_at: '2024-04-15 16:30:00' },
  { id: 14, company_name: 'Pinnacle Group', contact_email: 'business@pinnacle.com', phone: '+1-555-0114', country: 'Canada', total_orders: 71, created_at: '2024-04-28 10:45:00' },
  { id: 15, company_name: 'Synergy Digital', contact_email: 'hello@synergydigital.com', phone: '+1-555-0115', country: 'USA', total_orders: 55, created_at: '2024-05-10 13:20:00' },
  { id: 16, company_name: 'Apex Innovations', contact_email: 'info@apexinnov.com', phone: '+44-20-5550116', country: 'UK', total_orders: 83, created_at: '2024-05-22 08:35:00' },
  { id: 17, company_name: 'Fusion Enterprises', contact_email: 'contact@fusionent.com', phone: '+1-555-0117', country: 'USA', total_orders: 39, created_at: '2024-06-04 15:50:00' },
  { id: 18, company_name: 'Vortex Solutions', contact_email: 'sales@vortexsol.com', phone: '+49-30-5550118', country: 'Germany', total_orders: 66, created_at: '2024-06-18 12:05:00' },
  { id: 19, company_name: 'Nexus Technologies', contact_email: 'info@nexustech.io', phone: '+1-555-0119', country: 'USA', total_orders: 91, created_at: '2024-07-01 09:20:00' },
  { id: 20, company_name: 'Catalyst Systems', contact_email: 'hello@catalystsys.com', phone: '+61-2-5550120', country: 'Australia', total_orders: 44, created_at: '2024-07-15 14:40:00' },
];

type SidebarView = 'tables' | 'migrations' | 'actions';

interface DatabaseExplorerTabProps {
  database: {
    name: string;
    tag: string;
    type?: string;
    env: {
      slug: string;
      connection_url: string;
    };
  };
}

export default function DatabaseExplorerTab({ database }: DatabaseExplorerTabProps) {
  const isNoSQL = database.type?.toLowerCase().includes('mongo') ||
                  database.type?.toLowerCase().includes('redis') ||
                  database.type?.toLowerCase().includes('cassandra');

  const tables = isNoSQL ? DUMMY_COLLECTIONS_NOSQL : DUMMY_TABLES_SQL;

  // Sidebar state
  const [sidebarView, setSidebarView] = useState<SidebarView>('tables');
  const [selectedTable, setSelectedTable] = useState<typeof tables[0] | null>(null);
  const [selectedMigration, setSelectedMigration] = useState<typeof DUMMY_MIGRATIONS[0] | null>(null);
  const [selectedAction, setSelectedAction] = useState<typeof DUMMY_ACTIONS[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSidebarRefreshing, setIsSidebarRefreshing] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [showActions, setShowActions] = useState(true);

  // CRUD Dialogs
  const [showInsertDialog, setShowInsertDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showCreateTableDialog, setShowCreateTableDialog] = useState(false);
  const [showCreateActionDialog, setShowCreateActionDialog] = useState(false);
  const [showAddColumnsDialog, setShowAddColumnsDialog] = useState(false);
  const [showEditColumnsDialog, setShowEditColumnsDialog] = useState(false);
  const [showDeleteColumnsDialog, setShowDeleteColumnsDialog] = useState(false);
  const [showCreateIndexDialog, setShowCreateIndexDialog] = useState(false);
  const [showViewIndexesDialog, setShowViewIndexesDialog] = useState(false);
  const [showExportDataDialog, setShowExportDataDialog] = useState(false);
  const [showCodeSidebar, setShowCodeSidebar] = useState(false);

  // Confirmation dialogs
  const [showAddColumnsConfirm, setShowAddColumnsConfirm] = useState(false);
  const [showEditColumnsConfirm, setShowEditColumnsConfirm] = useState(false);
  const [showDeleteColumnsConfirm, setShowDeleteColumnsConfirm] = useState(false);

  // Column management state
  const [columnsToDelete, setColumnsToDelete] = useState<string[]>([]);
  const [columnToEdit, setColumnToEdit] = useState<string | null>(null);
  const [editColumnForm, setEditColumnForm] = useState<{
    name: string;
    type: string;
    nullable: boolean;
    defaultValue?: string;
    hasDefaultValue?: boolean;
  } | null>(null);
  const [newColumns, setNewColumns] = useState<Array<{
    name: string;
    type: string;
    nullable: boolean;
    primaryKey: boolean;
    unique: boolean;
    enumValues?: string[];
    defaultValue?: string;
    hasDefaultValue?: boolean;
  }>>([]);

  // Filter and query state
  const [filterSearch, setFilterSearch] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [queryConditions, setQueryConditions] = useState<Array<{
    field: string;
    operator: string;
    value: string;
  }>>([]);

  // Selected row for edit/delete
  const [selectedRow, setSelectedRow] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [jsonValidationErrors, setJsonValidationErrors] = useState<Record<string, string>>({});

  // Table schema state
  const [tableName, setTableName] = useState('');
  const [tableTag, setTableTag] = useState('');
  const [tableDescription, setTableDescription] = useState('');
  const [tableColumns, setTableColumns] = useState<Array<{
    name: string;
    type: string;
    nullable: boolean;
    primaryKey: boolean;
    unique: boolean;
    enumValues?: string[];
    defaultValue?: string;
    hasDefaultValue?: boolean;
  }>>([
    { name: 'id', type: 'integer', nullable: false, primaryKey: true, unique: true }
  ]);
  const [tableRelationships, setTableRelationships] = useState<Array<{
    columnName: string;
    referencedTable: string;
    referencedColumn: string;
    onDelete: string;
    onUpdate: string;
  }>>([]);

  // Action form state
  const [actionName, setActionName] = useState('');

  // Code generator state
  const [selectedOperation, setSelectedOperation] = useState<
    'query' | 'insert' | 'update' | 'delete' | 'upsert' | 'count' | 'sum' | 'avg' | 'min' | 'max' | 'aggregate' | 'aggregate-conditional' | 'groupBy' | 'raw'
  >('query');
  const [actionDescription, setActionDescription] = useState('');
  const [actionType, setActionType] = useState<'read' | 'create' | 'update' | 'delete'>('read');
  const [actionTable, setActionTable] = useState('');
  const [actionParameters, setActionParameters] = useState<string[]>(['']);

  // Get current table data
  const getCurrentTableData = () => {
    if (!selectedTable) return [];

    const tableDataMap: Record<string, any[]> = {
      users: DUMMY_USERS_DATA,
      products: DUMMY_PRODUCTS_DATA,
      orders: DUMMY_ORDERS_DATA,
      customers: DUMMY_CUSTOMERS_DATA,
    };

    return tableDataMap[selectedTable.name] || [];
  };

  const rawTableData = getCurrentTableData();

  // Apply search filter and query conditions to table data
  const tableData = rawTableData.filter(row => {
    // Apply search filter
    if (filterSearch) {
      const matchesSearch = Object.values(row).some(value =>
        String(value || '').toLowerCase().includes(filterSearch.toLowerCase())
      );
      if (!matchesSearch) return false;
    }

    // Apply query conditions
    if (queryConditions.length > 0) {
      return queryConditions.every(condition => {
        if (!condition.field || !condition.operator || condition.value === '') return true;

        const cellValue = String(row[condition.field] || '').toLowerCase();
        const conditionValue = condition.value.toLowerCase();

        switch (condition.operator) {
          case 'equals':
            return cellValue === conditionValue;
          case 'contains':
            return cellValue.includes(conditionValue);
          case 'starts_with':
            return cellValue.startsWith(conditionValue);
          case 'ends_with':
            return cellValue.endsWith(conditionValue);
          case 'greater_than':
            return parseFloat(cellValue) > parseFloat(conditionValue);
          case 'less_than':
            return parseFloat(cellValue) < parseFloat(conditionValue);
          default:
            return true;
        }
      });
    }

    return true;
  });

  const allColumns = rawTableData.length > 0 ? Object.keys(rawTableData[0]) : [];
  const columns = selectedFields.length > 0 ? selectedFields : allColumns;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsRefreshing(false);
    toast.success('Data refreshed');
  };

  const handleSidebarRefresh = async () => {
    setIsSidebarRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setIsSidebarRefreshing(false);
    toast.success(`${sidebarView.charAt(0).toUpperCase() + sidebarView.slice(1)} list refreshed`);
  };

  const handleInsertOpen = () => {
    const emptyData: Record<string, any> = {};
    columns.forEach(col => {
      if (col !== 'id') {
        emptyData[col] = '';
      }
    });
    setFormData(emptyData);
    setShowInsertDialog(true);
  };

  const handleEditOpen = (row: any) => {
    setSelectedRow(row);
    setFormData({ ...row });
    setShowEditDialog(true);
  };

  const handleDeleteOpen = (row: any) => {
    setSelectedRow(row);
    setShowDeleteDialog(true);
  };

  const handleInsert = async () => {
    // Check for JSON validation errors
    if (Object.keys(jsonValidationErrors).length > 0) {
      toast.error('Please fix JSON validation errors before submitting');
      return;
    }

    // Parse JSON strings for JSON-type columns
    const processedData = { ...formData };
    Object.keys(processedData).forEach(key => {
      const columnType = getColumnType(key);
      if ((columnType === 'json' || columnType === 'jsonb') && typeof processedData[key] === 'string' && processedData[key].trim()) {
        try {
          processedData[key] = JSON.parse(processedData[key]);
        } catch (error) {
          // This shouldn't happen as we've already validated, but just in case
          console.error(`Failed to parse JSON for column ${key}:`, error);
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success(`New record inserted into ${selectedTable?.name}`);
    setShowInsertDialog(false);
    setFormData({});
    setJsonValidationErrors({});
  };

  const handleUpdate = async () => {
    // Check for JSON validation errors
    if (Object.keys(jsonValidationErrors).length > 0) {
      toast.error('Please fix JSON validation errors before submitting');
      return;
    }

    // Parse JSON strings for JSON-type columns
    const processedData = { ...formData };
    Object.keys(processedData).forEach(key => {
      const columnType = getColumnType(key);
      if ((columnType === 'json' || columnType === 'jsonb') && typeof processedData[key] === 'string' && processedData[key].trim()) {
        try {
          processedData[key] = JSON.parse(processedData[key]);
        } catch (error) {
          // This shouldn't happen as we've already validated, but just in case
          console.error(`Failed to parse JSON for column ${key}:`, error);
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success(`Record updated in ${selectedTable?.name}`);
    setShowEditDialog(false);
    setFormData({});
    setSelectedRow(null);
    setJsonValidationErrors({});
  };

  const handleDelete = async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success(`Record deleted from ${selectedTable?.name}`);
    setShowDeleteDialog(false);
    setSelectedRow(null);
  };

  const handleCreateTable = async () => {
    if (!tableName.trim()) {
      toast.error('Please enter a table name');
      return;
    }
    if (!tableTag.trim()) {
      toast.error('Please enter a table tag');
      return;
    }
    if (tableColumns.length === 0) {
      toast.error('Please add at least one column');
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    const relationshipText = !isNoSQL && tableRelationships.length > 0
      ? ` and ${tableRelationships.length} relationship${tableRelationships.length > 1 ? 's' : ''}`
      : '';
    toast.success(`${isNoSQL ? 'Collection' : 'Table'} "${tableName}" created successfully with ${tableColumns.length} columns${relationshipText}`);
    setShowCreateTableDialog(false);
    // Reset form
    setTableName('');
    setTableTag('');
    setTableDescription('');
    setTableColumns([{ name: 'id', type: 'integer', nullable: false, primaryKey: true, unique: true }]);
    setTableRelationships([]);
  };

  const generateTableTag = () => {
    const sanitizedTag = tableName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    setTableTag(sanitizedTag);
  };

  const addColumn = () => {
    setTableColumns([...tableColumns, {
      name: '',
      type: 'string',
      nullable: true,
      primaryKey: false,
      unique: false
    }]);
  };

  const removeColumn = (index: number) => {
    if (tableColumns.length > 1) {
      setTableColumns(tableColumns.filter((_, i) => i !== index));
    }
  };

  const updateColumn = (index: number, field: string, value: any) => {
    const newColumns = [...tableColumns];
    newColumns[index] = { ...newColumns[index], [field]: value };
    setTableColumns(newColumns);
  };

  // Helper functions for new columns management
  const addNewColumnRow = () => {
    setNewColumns([
      ...newColumns,
      { name: '', type: 'string', nullable: true, primaryKey: false, unique: false }
    ]);
  };

  const removeNewColumnRow = (index: number) => {
    if (newColumns.length > 1) {
      setNewColumns(newColumns.filter((_, i) => i !== index));
    }
  };

  const updateNewColumn = (index: number, field: string, value: any) => {
    const updated = [...newColumns];
    updated[index] = { ...updated[index], [field]: value };
    setNewColumns(updated);
  };

  const handleAddColumns = () => {
    // Validate that all new columns have names
    if (newColumns.some(col => !col.name.trim())) {
      toast.error('All columns must have a name');
      return;
    }
    // Show confirmation dialog
    setShowAddColumnsConfirm(true);
  };

  const confirmAddColumns = () => {
    toast.success(`${newColumns.length} column(s) added successfully`);
    setShowAddColumnsConfirm(false);
    setShowAddColumnsDialog(false);
    // Reset new columns
    setNewColumns([]);
  };

  // Helper functions for edit columns management
  const handleEditColumn = (columnName: string) => {
    setColumnToEdit(columnName);
    // Initialize edit form with dummy data (in real app, fetch from schema)
    setEditColumnForm({
      name: columnName,
      type: columnName.includes('id') ? 'integer' :
            columnName.includes('email') ? 'string' :
            columnName.includes('active') || columnName.includes('is_') ? 'boolean' :
            columnName.includes('price') || columnName.includes('amount') ? 'decimal' :
            columnName.includes('date') || columnName.includes('time') || columnName.includes('at') ? 'datetime' : 'string',
      nullable: true,
      defaultValue: undefined,
      hasDefaultValue: false,
    });
  };

  const saveEditColumn = () => {
    if (!editColumnForm?.name.trim()) {
      toast.error('Column name is required');
      return;
    }
    setShowEditColumnsConfirm(true);
  };

  const confirmEditColumn = () => {
    toast.success(`Column "${columnToEdit}" updated successfully`);
    setShowEditColumnsConfirm(false);
    setShowEditColumnsDialog(false);
    setColumnToEdit(null);
    setEditColumnForm(null);
  };

  // Helper functions for delete columns management
  const toggleColumnForDeletion = (columnName: string) => {
    setColumnsToDelete(prev =>
      prev.includes(columnName)
        ? prev.filter(col => col !== columnName)
        : [...prev, columnName]
    );
  };

  const handleDeleteColumns = () => {
    if (columnsToDelete.length === 0) {
      toast.error('Please select at least one column to delete');
      return;
    }
    setShowDeleteColumnsConfirm(true);
  };

  const confirmDeleteColumns = () => {
    toast.success(`${columnsToDelete.length} column(s) deleted successfully`);
    setShowDeleteColumnsConfirm(false);
    setShowDeleteColumnsDialog(false);
    setColumnsToDelete([]);
  };

  const addRelationship = () => {
    setTableRelationships([...tableRelationships, {
      columnName: '',
      referencedTable: '',
      referencedColumn: 'id',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    }]);
  };

  const removeRelationship = (index: number) => {
    setTableRelationships(tableRelationships.filter((_, i) => i !== index));
  };

  const updateRelationship = (index: number, field: string, value: any) => {
    const newRelationships = [...tableRelationships];
    newRelationships[index] = { ...newRelationships[index], [field]: value };
    setTableRelationships(newRelationships);
  };

  const handleRunMigration = async (migration: typeof DUMMY_MIGRATIONS[0]) => {
    toast.success(`Running migration: ${migration.name}...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success(`Migration ${migration.name} completed`);
  };

  const handleRunAction = async (action: typeof DUMMY_ACTIONS[0]) => {
    toast.success(`Executing action: ${action.name}...`);
    await new Promise(resolve => setTimeout(resolve, 800));
    toast.success(`Action ${action.name} completed`);
  };

  const handleCreateAction = async () => {
    if (!actionName.trim()) {
      toast.error('Please enter an action name');
      return;
    }
    if (!actionTable.trim()) {
      toast.error('Please select a target table');
      return;
    }

    const validParams = actionParameters.filter(p => p.trim() !== '');

    await new Promise(resolve => setTimeout(resolve, 500));
    toast.success(`Action "${actionName}" created successfully with ${validParams.length} parameters`);
    setShowCreateActionDialog(false);
    // Reset form
    setActionName('');
    setActionDescription('');
    setActionType('read');
    setActionTable('');
    setActionParameters(['']);
  };

  const addActionParameter = () => {
    setActionParameters([...actionParameters, '']);
  };

  const removeActionParameter = (index: number) => {
    if (actionParameters.length > 1) {
      setActionParameters(actionParameters.filter((_, i) => i !== index));
    }
  };

  const updateActionParameter = (index: number, value: string) => {
    const newParams = [...actionParameters];
    newParams[index] = value;
    setActionParameters(newParams);
  };

  // State for expandable JSON cells (tracks individual cells for independent expansion)
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());

  const toggleCell = (cellId: string) => {
    setExpandedCells(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cellId)) {
        newSet.delete(cellId);
      } else {
        newSet.add(cellId);
      }
      return newSet;
    });
  };

  // Check if a row has any expanded cells
  const rowHasExpandedCells = (rowIndex: number): boolean => {
    return columns.some(col => {
      const cellId = `${rowIndex}-${col}`;
      return expandedCells.has(cellId);
    });
  };

  // Validate JSON input
  const validateJson = (value: string, columnName: string) => {
    if (!value.trim()) {
      setJsonValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[columnName];
        return updated;
      });
      return true;
    }

    try {
      JSON.parse(value);
      setJsonValidationErrors(prev => {
        const updated = { ...prev };
        delete updated[columnName];
        return updated;
      });
      return true;
    } catch (error) {
      setJsonValidationErrors(prev => ({
        ...prev,
        [columnName]: (error as Error).message
      }));
      return false;
    }
  };

  // Get column type
  const getColumnType = (columnName: string): string => {
    const column = tableColumns.find(col => col.name === columnName);
    return column?.type || 'text';
  };

  // Code generator utility functions
  const inferColumnType = (value: any): 'number' | 'boolean' | 'date' | 'object' | 'string' => {
    if (value === null || value === undefined) return 'string';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'string') {
      // Check if it's a date string
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date';
      // Check if it's a numeric string with $
      if (/^\$[\d,]+\.?\d*$/.test(value)) return 'string';
    }
    return 'string';
  };

  const getPlaceholderValue = (columnName: string, type: 'number' | 'boolean' | 'date' | 'object' | 'string'): string => {
    switch (type) {
      case 'number':
        if (columnName.toLowerCase().includes('price') || columnName.toLowerCase().includes('cost')) return '29.99';
        if (columnName.toLowerCase().includes('stock') || columnName.toLowerCase().includes('quantity')) return '100';
        if (columnName.toLowerCase().includes('count') || columnName.toLowerCase().includes('total')) return '10';
        return '42';
      case 'boolean':
        return 'true';
      case 'date':
        return "'2024-03-15 10:30:00'";
      case 'object':
        return '{ key: "value" }';
      case 'string':
      default:
        if (columnName.toLowerCase().includes('email')) return "'user@example.com'";
        if (columnName.toLowerCase().includes('name')) return "'John Doe'";
        if (columnName.toLowerCase().includes('status')) return "'active'";
        if (columnName.toLowerCase().includes('category')) return "'electronics'";
        if (columnName.toLowerCase().includes('role')) return "'user'";
        return "'example value'";
    }
  };

  const getSchemaFromTableData = () => {
    if (!selectedTable || rawTableData.length === 0) return {};

    const firstRow = rawTableData[0];
    const schema: Record<string, 'number' | 'boolean' | 'date' | 'object' | 'string'> = {};

    Object.keys(firstRow).forEach(key => {
      schema[key] = inferColumnType(firstRow[key]);
    });

    return schema;
  };

  const generateQueryCode = (tableName: string, _envSlug: string, _language: string) => {
    const schema = getSchemaFromTableData();
    const columns = Object.keys(schema);

    // Find appropriate columns for WHERE clause
    const numericCols = columns.filter(col => schema[col] === 'number' && col !== 'id');
    const stringCols = columns.filter(col => schema[col] === 'string' && col !== 'id');

    const whereConditions: string[] = [];

    // Add a string equality condition
    if (stringCols.length > 0) {
      const col = stringCols[0];
      const placeholder = getPlaceholderValue(col, 'string');
      whereConditions.push(`    ${col}: ${placeholder}`);
    }

    // Add a numeric comparison
    if (numericCols.length > 0) {
      const col = numericCols[0];
      whereConditions.push(`    ${col}: { $GT: 100 }`);
    }

    const whereClause = whereConditions.length > 0
      ? `\n  where: {\n${whereConditions.join(',\n')}\n  },`
      : '\n  where: { status: \'active\' },';

    return `// Query records from ${tableName}
const records = await ductape.database.query({
  table: '${tableName}',${whereClause}
  limit: 10
});`;
  };

  const generateInsertCode = (tableName: string, _envSlug: string, _language: string) => {
    const schema = getSchemaFromTableData();
    const columns = Object.keys(schema).filter(col => col !== 'id' && col !== 'created_at' && col !== 'updated_at');

    const dataFields = columns.slice(0, 5).map(col => {
      const type = schema[col];
      const placeholder = getPlaceholderValue(col, type);
      return `    ${col}: ${placeholder}`;
    });

    return `// Insert a new record
const newRecord = await ductape.database.insert({
  table: '${tableName}',
  data: {
${dataFields.join(',\n')}
  }
});`;
  };

  const generateUpdateCode = (tableName: string, _envSlug: string, _language: string) => {
    const schema = getSchemaFromTableData();
    const columns = Object.keys(schema).filter(col => col !== 'id' && col !== 'created_at' && col !== 'updated_at');

    // Pick 2-3 columns to update
    const updateFields = columns.slice(0, 2).map(col => {
      const type = schema[col];
      const placeholder = getPlaceholderValue(col, type);
      return `    ${col}: ${placeholder}`;
    });

    return `// Update an existing record
await ductape.database.update({
  table: '${tableName}',
  where: { id: 1 },
  data: {
${updateFields.join(',\n')}
  }
});`;
  };

  const generateDeleteCode = (tableName: string, _envSlug: string, _language: string) => {
    return `// Delete a record
await ductape.database.delete({
  table: '${tableName}',
  where: { id: 1 }
});`;
  };

  const generateAggregateCode = (tableName: string, _envSlug: string, _language: string) => {
    const schema = getSchemaFromTableData();
    const numericCols = Object.keys(schema).filter(col => schema[col] === 'number' && col !== 'id');

    if (numericCols.length === 0) {
      return `// Aggregate data
// Available aggregation functions: $COUNT, $SUM, $AVG, $MIN, $MAX
const stats = await ductape.database.aggregate({
  table: '${tableName}',
  operations: {
    total_count: { $COUNT: '*' }
  }
});
console.log(stats);`;
    }

    const aggCol = numericCols[0];

    return `// Get aggregated statistics
// Available aggregation functions: $COUNT, $SUM, $AVG, $MIN, $MAX
const stats = await ductape.database.aggregate({
  table: '${tableName}',
  operations: {
    total_count: { $COUNT: '*' },
    avg_${aggCol}: { $AVG: '${aggCol}' },
    min_${aggCol}: { $MIN: '${aggCol}' },
    max_${aggCol}: { $MAX: '${aggCol}' },
    total_${aggCol}: { $SUM: '${aggCol}' }
  }
});
console.log(stats);`;
  };

  const generateAggregateConditionalCode = (tableName: string, _envSlug: string, _language: string) => {
    const schema = getSchemaFromTableData();
    const numericCols = Object.keys(schema).filter(col => schema[col] === 'number' && col !== 'id');
    const allCols = Object.keys(schema);

    // Find columns for conditional filtering
    const statusCol = allCols.find(col => col.toLowerCase().includes('status'));
    const activeCol = allCols.find(col => col.toLowerCase().includes('active') || col.toLowerCase().includes('enabled'));
    const boolCol = allCols.find(col =>
      schema[col] === 'boolean' ||
      col.toLowerCase().includes('verified') ||
      col.toLowerCase().includes('published')
    );

    if (numericCols.length === 0) {
      return `// Conditional aggregation with nested conditionals
const conditionalStats = await ductape.database.aggregate({
  table: '${tableName}',
  operations: {
    total_count: { $COUNT: '*' }
  },
  where: {
    $AND: {
      ${statusCol || 'status'}: 'active'
    }
  }
});
console.log('Conditional stats:', conditionalStats);`;
    }

    const aggCol = numericCols[0];

    // Build complex nested conditional with $OR inside $AND
    const whereClause = statusCol && (boolCol || activeCol)
      ? `  where: {
    $AND: {
      ${aggCol}: { $GT: 0 },
      $OR: {
        ${statusCol}: 'active',
        ${boolCol || activeCol}: true
      }
    }
  }`
      : statusCol
      ? `  where: {
    $AND: {
      ${aggCol}: { $GT: 0 },
      ${statusCol}: { $IN: ['active', 'pending'] }
    }
  }`
      : `  where: {
    $AND: {
      ${aggCol}: { $GT: 0 },
      ${allCols[1] || 'status'}: 'active'
    }
  }`;

    return `// Conditional aggregation with nested conditionals ($OR inside $AND)
const conditionalStats = await ductape.database.aggregate({
  table: '${tableName}',
  operations: {
    total_count: { $COUNT: '*' }
  },
${whereClause}
});
console.log('Conditional stats:', conditionalStats);`;
  };

  const generateGroupByCode = (tableName: string, _envSlug: string, _language: string) => {
    const schema = getSchemaFromTableData();
    const stringCols = Object.keys(schema).filter(col => schema[col] === 'string' && col !== 'id');
    const numericCols = Object.keys(schema).filter(col => schema[col] === 'number' && col !== 'id');

    const groupByCol = stringCols.find(col =>
      col.toLowerCase().includes('category') ||
      col.toLowerCase().includes('status') ||
      col.toLowerCase().includes('type') ||
      col.toLowerCase().includes('role')
    ) || stringCols[0] || 'status';

    const aggregateCol = numericCols[0] || 'id';

    return `// Group by and aggregate
const grouped = await ductape.database.groupBy({
  table: '${tableName}',
  groupBy: ['${groupByCol}'],
  aggregate: {
    count: { $COUNT: '*' }${numericCols.length > 0 ? `,\n    total_${aggregateCol}: { $SUM: '${aggregateCol}' }` : ''}
  },
  orderBy: { count: 'desc' }
});`;
  };

  const generateUpsertCode = (tableName: string, _envSlug: string, _language: string) => {
    const schema = getSchemaFromTableData();
    const columns = Object.keys(schema).filter(col => col !== 'id' && col !== 'created_at' && col !== 'updated_at');

    const dataFields = columns.slice(0, 5).map(col => {
      const type = schema[col];
      const placeholder = getPlaceholderValue(col, type);
      return `    ${col}: ${placeholder}`;
    });

    const uniqueCol = columns.find(col =>
      col.toLowerCase().includes('email') ||
      col.toLowerCase().includes('username') ||
      col.toLowerCase().includes('unique')
    ) || 'id';

    return `// Insert or update (upsert)
const result = await ductape.database.upsert({
  table: '${tableName}',
  data: {
${dataFields.join(',\n')}
  },
  conflictKeys: ['${uniqueCol}']
});`;
  };

  const generateCountCode = (tableName: string, _envSlug: string, _language: string) => {
    return `// Count total records
const totalCount = await ductape.database.count({
  table: '${tableName}'
});
console.log('Total records:', totalCount);

// Count with filter
const filteredCount = await ductape.database.count({
  table: '${tableName}',
  where: { /* your conditions */ }
});
console.log('Filtered count:', filteredCount);`;
  };

  const generateSumCode = (tableName: string, _envSlug: string, _language: string) => {
    const schema = getSchemaFromTableData();
    const numericCols = Object.keys(schema).filter(col => schema[col] === 'number' && col !== 'id');
    const allCols = Object.keys(schema);

    const sumCol = numericCols.find(col =>
      col.toLowerCase().includes('price') ||
      col.toLowerCase().includes('amount') ||
      col.toLowerCase().includes('total') ||
      col.toLowerCase().includes('quantity')
    ) || numericCols[0] || 'amount';

    // Find common filter columns
    const statusCol = allCols.find(col => col.toLowerCase().includes('status'));
    const activeCol = allCols.find(col => col.toLowerCase().includes('active') || col.toLowerCase().includes('enabled'));

    const whereCondition = statusCol
      ? `{ ${statusCol}: 'active' }`
      : activeCol
      ? `{ ${activeCol}: true }`
      : `{ ${sumCol}: { $GT: 0 } }`;

    return `// Sum column values
const total = await ductape.database.sum({
  table: '${tableName}',
  column: '${sumCol}'
});
console.log('Total ${sumCol}:', total);

// Sum with filter
const filteredTotal = await ductape.database.sum({
  table: '${tableName}',
  column: '${sumCol}',
  where: ${whereCondition}
});
console.log('Filtered total:', filteredTotal);`;
  };

  const generateAvgCode = (tableName: string, _envSlug: string, _language: string) => {
    const schema = getSchemaFromTableData();
    const numericCols = Object.keys(schema).filter(col => schema[col] === 'number' && col !== 'id');
    const allCols = Object.keys(schema);

    const avgCol = numericCols.find(col =>
      col.toLowerCase().includes('price') ||
      col.toLowerCase().includes('amount') ||
      col.toLowerCase().includes('rating') ||
      col.toLowerCase().includes('score')
    ) || numericCols[0] || 'amount';

    // Find common filter columns
    const statusCol = allCols.find(col => col.toLowerCase().includes('status'));
    const activeCol = allCols.find(col => col.toLowerCase().includes('active') || col.toLowerCase().includes('enabled'));

    const whereCondition = statusCol
      ? `{ ${statusCol}: 'active' }`
      : activeCol
      ? `{ ${activeCol}: true }`
      : `{ ${avgCol}: { $GT: 0 } }`;

    return `// Calculate average
const average = await ductape.database.avg({
  table: '${tableName}',
  column: '${avgCol}'
});
console.log('Average ${avgCol}:', average);

// Average with filter
const filteredAverage = await ductape.database.avg({
  table: '${tableName}',
  column: '${avgCol}',
  where: ${whereCondition}
});
console.log('Filtered average:', filteredAverage);`;
  };

  const generateMinCode = (tableName: string, _envSlug: string, _language: string) => {
    const schema = getSchemaFromTableData();
    const numericCols = Object.keys(schema).filter(col => schema[col] === 'number' && col !== 'id');
    const allCols = Object.keys(schema);

    const minCol = numericCols.find(col =>
      col.toLowerCase().includes('price') ||
      col.toLowerCase().includes('amount') ||
      col.toLowerCase().includes('age')
    ) || numericCols[0] || 'amount';

    // Find common filter columns
    const statusCol = allCols.find(col => col.toLowerCase().includes('status'));
    const activeCol = allCols.find(col => col.toLowerCase().includes('active') || col.toLowerCase().includes('enabled'));

    const whereCondition = statusCol
      ? `{ ${statusCol}: 'active' }`
      : activeCol
      ? `{ ${activeCol}: true }`
      : `{ ${minCol}: { $GT: 0 } }`;

    return `// Find minimum value
const minimum = await ductape.database.min({
  table: '${tableName}',
  column: '${minCol}'
});
console.log('Minimum ${minCol}:', minimum);

// Minimum with filter
const filteredMin = await ductape.database.min({
  table: '${tableName}',
  column: '${minCol}',
  where: ${whereCondition}
});
console.log('Filtered minimum:', filteredMin);`;
  };

  const generateMaxCode = (tableName: string, _envSlug: string, _language: string) => {
    const schema = getSchemaFromTableData();
    const numericCols = Object.keys(schema).filter(col => schema[col] === 'number' && col !== 'id');
    const allCols = Object.keys(schema);

    const maxCol = numericCols.find(col =>
      col.toLowerCase().includes('price') ||
      col.toLowerCase().includes('amount') ||
      col.toLowerCase().includes('age')
    ) || numericCols[0] || 'amount';

    // Find common filter columns
    const statusCol = allCols.find(col => col.toLowerCase().includes('status'));
    const activeCol = allCols.find(col => col.toLowerCase().includes('active') || col.toLowerCase().includes('enabled'));

    const whereCondition = statusCol
      ? `{ ${statusCol}: 'active' }`
      : activeCol
      ? `{ ${activeCol}: true }`
      : `{ ${maxCol}: { $GT: 0 } }`;

    return `// Find maximum value
const maximum = await ductape.database.max({
  table: '${tableName}',
  column: '${maxCol}'
});
console.log('Maximum ${maxCol}:', maximum);

// Maximum with filter
const filteredMax = await ductape.database.max({
  table: '${tableName}',
  column: '${maxCol}',
  where: ${whereCondition}
});
console.log('Filtered maximum:', filteredMax);`;
  };

  const generateRawCode = (tableName: string, _envSlug: string, _language: string) => {
    return `// Execute raw SQL query
const result = await ductape.database.raw({
  query: 'SELECT * FROM ${tableName} WHERE id = $1',
  params: [1]
});
console.log('Rows:', result.data);
console.log('Row count:', result.rowCount);

// For complex queries not supported by the abstraction
const complexQuery = await ductape.database.raw({
  query: \`
    SELECT
      column1,
      column2,
      COUNT(*) as count
    FROM ${tableName}
    WHERE column1 > $1
    GROUP BY column1, column2
    ORDER BY count DESC
  \`,
  params: [100]
});`;
  };

  // Generate code examples for database operations
  const generateCodeSections = (language: string, env?: string) => {
    const tableName = selectedTable?.name || 'your_table';
    const envSlug = env || 'prd';

    // Common sections for all operations
    const initSection = language === 'typescript'
      ? {
          title: 'Init Ductape',
          code: `import Ductape from "@ductape/sdk"

const ductape = new Ductape({
  workspace_id: 'your-workspace-id',
  user_id: 'your-user-id',
  private_key: 'your-private-key'
});`,
        }
      : {
          title: 'Init Ductape',
          code: `const Ductape = require("@ductape/sdk")

const ductape = new Ductape({
  workspace_id: 'your-workspace-id',
  user_id: 'your-user-id',
  private_key: 'your-private-key'
});`,
        };

    const connectSection = {
      title: 'Database Connection',
      code: `// Configure database connection
// The SDK automatically translates queries to the target database type
await ductape.database.connect({
  env: '${envSlug}',
  product: 'my_product',
  database: 'my_database',
});`,
    };

    const transactionSection = {
      title: 'Transactions (Optional)',
      code: `// Use transactions for operations that need atomicity
// Transactions ensure all operations succeed or all fail together
const result = await ductape.database.transaction(
  {
    timeout: 30000, // time in milliseconds - Optional
    isolationLevel: 'READ_COMMITTED', // Optional
  },
  async (transaction) => {
    // All database operations within this callback use the transaction
    await ductape.database.insert({
      table: '${tableName}',
      data: { /* your data here */ },
      transaction, // Pass the transaction to ensure atomicity
    });

    // You can perform multiple operations in a transaction
    // If any operation fails, all changes are rolled back
  }
);`,
    };

    // Generate operation-specific examples based on selected operation
    const operationSections = [];

    switch (selectedOperation) {
      case 'query':
        operationSections.push(
          {
            title: 'Basic Query',
            code: generateQueryCode(tableName, envSlug, language),
          },
          {
            title: 'Advanced Filtering',
            code: `// Query with comparison operators based on ${tableName} schema
${generateQueryCode(tableName, envSlug, language).replace('Basic Query', 'Advanced query')}`,
          }
        );
        break;

      case 'insert':
        operationSections.push({
          title: `Insert into ${tableName}`,
          code: generateInsertCode(tableName, envSlug, language),
        });
        break;

      case 'update':
        operationSections.push({
          title: `Update ${tableName}`,
          code: generateUpdateCode(tableName, envSlug, language),
        });
        break;

      case 'delete':
        operationSections.push({
          title: `Delete from ${tableName}`,
          code: generateDeleteCode(tableName, envSlug, language),
        });
        break;

      case 'aggregate':
        operationSections.push({
          title: `Aggregate ${tableName}`,
          code: generateAggregateCode(tableName, envSlug, language),
        });
        break;

      case 'aggregate-conditional':
        operationSections.push({
          title: `Aggregate ${tableName} with Conditions`,
          code: generateAggregateConditionalCode(tableName, envSlug, language),
        });
        break;

      case 'groupBy':
        operationSections.push({
          title: `Group By in ${tableName}`,
          code: generateGroupByCode(tableName, envSlug, language),
        });
        break;

      case 'upsert':
        operationSections.push({
          title: `Upsert into ${tableName}`,
          code: generateUpsertCode(tableName, envSlug, language),
        });
        break;

      case 'count':
        operationSections.push({
          title: `Count Records in ${tableName}`,
          code: generateCountCode(tableName, envSlug, language),
        });
        break;

      case 'sum':
        operationSections.push({
          title: `Sum Values in ${tableName}`,
          code: generateSumCode(tableName, envSlug, language),
        });
        break;

      case 'avg':
        operationSections.push({
          title: `Average Values in ${tableName}`,
          code: generateAvgCode(tableName, envSlug, language),
        });
        break;

      case 'min':
        operationSections.push({
          title: `Minimum Value in ${tableName}`,
          code: generateMinCode(tableName, envSlug, language),
        });
        break;

      case 'max':
        operationSections.push({
          title: `Maximum Value in ${tableName}`,
          code: generateMaxCode(tableName, envSlug, language),
        });
        break;

      case 'raw':
        operationSections.push({
          title: `Raw SQL Query on ${tableName}`,
          code: generateRawCode(tableName, envSlug, language),
        });
        break;

      default:
        // Default to showing query examples
        operationSections.push({
          title: 'Query Records',
          code: generateQueryCode(tableName, envSlug, language),
        });
    }

    return [initSection, connectSection, transactionSection, ...operationSections];
  };

  const getValueDisplay = (value: any, rowIndex?: number, columnName?: string) => {
    if (value === null || value === undefined) {
      return <span className="text-grey-400 italic">null</span>;
    }

    if (typeof value === 'boolean') {
      return value ?
        <span className="text-green font-semibold">true</span> :
        <span className="text-red font-semibold">false</span>;
    }

    // Handle JSON objects and arrays - show badge with chevron
    if (typeof value === 'object') {
      const isArray = Array.isArray(value);
      const preview = isArray ? `Array[${value.length}]` : `Object{${Object.keys(value).length}}`;

      if (rowIndex !== undefined && columnName) {
        const cellId = `${rowIndex}-${columnName}`;
        const isExpanded = expandedCells.has(cellId);

        return (
          <button
            onClick={() => toggleCell(cellId)}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {preview}
          </button>
        );
      }

      return (
        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-mono bg-primary/10 text-primary border border-primary/20">
          {preview}
        </span>
      );
    }

    return String(value);
  };

  // Render subtable for expanded cells with nested JSON data
  const renderExpandedCellsSubtable = (row: any, rowIndex: number) => {
    // Get all expanded cells for this row
    const expandedCellsForRow = columns
      .map(col => {
        const cellId = `${rowIndex}-${col}`;
        if (expandedCells.has(cellId)) {
          return { column: col, value: row[col] };
        }
        return null;
      })
      .filter(Boolean);

    if (expandedCellsForRow.length === 0) return null;

    return (
      <div className="p-4 bg-grey-50 space-y-4">
        {expandedCellsForRow.map((cell: any) => {
          const { column, value } = cell;
          const isArray = Array.isArray(value);

          return (
            <div key={column} className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-grey-700">{column}</span>
                <span className="text-xs text-grey-500 font-mono">
                  {isArray ? `Array[${value.length}]` : `Object{${Object.keys(value).length}}`}
                </span>
              </div>

              {isArray ? (
                // Render array as a scrollable single-line display
                <div className="rounded-md border border-grey-400 bg-white overflow-x-auto">
                  <div className="px-4 py-3 flex items-center gap-2 min-w-max">
                    <span className="text-grey-600 font-mono text-sm">[</span>
                    {value.map((item: any, idx: number) => (
                      <span key={idx} className="inline-flex items-center gap-2">
                        {typeof item === 'object' && item !== null ? (
                          <span className="inline-block px-2 py-1 bg-grey-100 rounded text-xs font-mono text-grey-700 max-w-xs overflow-hidden text-ellipsis whitespace-nowrap" title={JSON.stringify(item)}>
                            {JSON.stringify(item)}
                          </span>
                        ) : typeof item === 'boolean' ? (
                          <span className={`font-semibold text-sm ${item ? 'text-green' : 'text-red'}`}>
                            {String(item)}
                          </span>
                        ) : typeof item === 'number' ? (
                          <span className="text-blue-600 font-mono text-sm">{item}</span>
                        ) : item === null ? (
                          <span className="text-grey-400 italic text-sm">null</span>
                        ) : (
                          <span className="text-grey-700 text-sm">"{String(item)}"</span>
                        )}
                        {idx < value.length - 1 && <span className="text-grey-500 font-mono">,</span>}
                      </span>
                    ))}
                    <span className="text-grey-600 font-mono text-sm">]</span>
                  </div>
                </div>
              ) : (
                // Render object with keys as table headers
                (() => {
                  const keys = Object.keys(value);
                  const entries = Object.entries(value);

                  return (
                    <div className="rounded-md border border-grey-400 overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-grey-50 border-b border-grey-400">
                          <tr>
                            {keys.map((key) => (
                              <th key={key} className="px-4 py-3 text-left text-xs font-semibold text-grey-600 uppercase tracking-wider whitespace-nowrap">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          <tr className="group hover:bg-grey-50 transition-colors">
                            {entries.map(([key, val]: [string, any]) => (
                              <td key={key} className="px-4 py-3 text-sm text-grey">
                                {typeof val === 'object' && val !== null ? (
                                  <pre className="text-xs font-mono text-grey-700 whitespace-pre-wrap">
                                    {JSON.stringify(val, null, 2)}
                                  </pre>
                                ) : typeof val === 'boolean' ? (
                                  <span className={val ? 'text-green font-semibold' : 'text-red font-semibold'}>
                                    {String(val)}
                                  </span>
                                ) : typeof val === 'number' ? (
                                  <span className="text-blue-600 font-mono">{val}</span>
                                ) : val === null ? (
                                  <span className="text-grey-400 italic">null</span>
                                ) : (
                                  <span className="text-grey-700">{String(val)}</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const filteredTables = tables.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMigrations = DUMMY_MIGRATIONS.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredActions = DUMMY_ACTIONS.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.tag.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewChange = (view: SidebarView) => {
    setSidebarView(view);
    setSearchQuery('');
    setSelectedTable(null);
    setSelectedMigration(null);
    setSelectedAction(null);
  };

  const getActionTypeColor = (type: string) => {
    switch (type) {
      case 'read': return 'bg-blue/10 text-blue';
      case 'create': return 'bg-green/10 text-green';
      case 'update': return 'bg-yellow/10 text-yellow';
      case 'delete': return 'bg-red/10 text-red';
      default: return 'bg-grey-400/10 text-grey-600';
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex bg-grey-100">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-grey-400 flex flex-col flex-shrink-0">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-4 border-b border-grey-400">
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-5 w-5 text-blue" />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-grey text-sm truncate">{database.name}</h2>
              <p className="text-xs text-grey-600 truncate">{database.env.slug}</p>
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex gap-1 mb-3 bg-grey-100 p-1 rounded">
            <button
              onClick={() => handleViewChange('tables')}
              className={cn(
                'flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors',
                sidebarView === 'tables'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-grey-600 hover:text-grey'
              )}
            >
              <Table className="h-3 w-3 inline mr-1" />
              Tables
            </button>
            {!isNoSQL && (
              <button
                onClick={() => handleViewChange('migrations')}
                className={cn(
                  'flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors',
                  sidebarView === 'migrations'
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-grey-600 hover:text-grey'
                )}
              >
                <GitBranch className="h-3 w-3 inline mr-1" />
                Migrations
              </button>
            )}
            <button
              onClick={() => handleViewChange('actions')}
              className={cn(
                'flex-1 px-2 py-1.5 text-xs font-medium rounded transition-colors',
                sidebarView === 'actions'
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-grey-600 hover:text-grey'
              )}
            >
              <Zap className="h-3 w-3 inline mr-1" />
              Actions
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-600" />
            <Input
              type="text"
              placeholder={`Search ${sidebarView}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          <div className="flex items-center justify-between px-2 py-2">
            <div className="text-xs font-semibold text-grey-600 uppercase tracking-wide">
              {sidebarView === 'tables' && `${isNoSQL ? 'Collections' : 'Tables'} (${filteredTables.length})`}
              {sidebarView === 'migrations' && `Migrations (${filteredMigrations.length})`}
              {sidebarView === 'actions' && `Actions (${filteredActions.length})`}
            </div>
            <div className="flex gap-1">
              <button
                onClick={handleSidebarRefresh}
                disabled={isSidebarRefreshing}
                className="text-grey-600 hover:text-primary transition-colors"
                title="Refresh list"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isSidebarRefreshing && 'animate-spin')} />
              </button>
              {sidebarView === 'tables' && (
                <button
                  onClick={() => setShowCreateTableDialog(true)}
                  className="text-grey-600 hover:text-primary transition-colors"
                  title={`Create new ${isNoSQL ? 'collection' : 'table'}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
              {sidebarView === 'actions' && (
                <button
                  onClick={() => setShowCreateActionDialog(true)}
                  className="text-grey-600 hover:text-primary transition-colors"
                  title="Create new action"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tables List */}
          {sidebarView === 'tables' && (
            <div className="space-y-1">
              {filteredTables.map((table) => (
                <button
                  key={table.name}
                  onClick={() => setSelectedTable(table)}
                  className={cn(
                    'w-full flex items-center justify-between px-2 py-2 rounded text-sm transition-colors',
                    selectedTable?.name === table.name
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-grey hover:bg-grey-100'
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Table className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{table.name}</span>
                  </div>
                  <span className="text-xs text-grey-600 flex-shrink-0">
                    {'rowCount' in table ? table.rowCount : table.documentCount}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Migrations List */}
          {sidebarView === 'migrations' && !isNoSQL && (
            <div className="space-y-1">
              {filteredMigrations.map((migration) => (
                <button
                  key={migration.tag}
                  onClick={() => setSelectedMigration(migration)}
                  className={cn(
                    'w-full px-2 py-2 rounded text-sm transition-colors text-left',
                    selectedMigration?.tag === migration.tag
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-grey hover:bg-grey-100'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <GitBranch className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate font-medium">{migration.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-grey-600 ml-5">
                    <span className={cn(
                      'px-1.5 py-0.5 rounded',
                      migration.status === 'completed' ? 'bg-green/10 text-green' : 'bg-yellow/10 text-yellow'
                    )}>
                      {migration.status}
                    </span>
                    <span>{migration.tag}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Actions List */}
          {sidebarView === 'actions' && (
            <div className="space-y-1">
              {filteredActions.map((action) => (
                <button
                  key={action.tag}
                  onClick={() => setSelectedAction(action)}
                  className={cn(
                    'w-full px-2 py-2 rounded text-sm transition-colors text-left',
                    selectedAction?.tag === action.tag
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-grey hover:bg-grey-100'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate font-medium">{action.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-grey-600 ml-5">
                    <span className={cn('px-1.5 py-0.5 rounded uppercase', getActionTypeColor(action.type))}>
                      {action.type}
                    </span>
                    <span className="truncate">{action.tableName}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info - Fixed */}
        <div className="flex-shrink-0 p-3 border-t border-grey-400 bg-grey-50">
          <div className="text-xs text-grey-600">
            <div className="flex items-center justify-between mb-1">
              <span>Database Type:</span>
              <span className="font-semibold text-grey">{database.type || 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Status:</span>
              <span className="flex items-center gap-1 text-green">
                <div className="w-2 h-2 rounded-full bg-green" />
                Connected
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* Tables View */}
        {sidebarView === 'tables' && !selectedTable && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Table className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-grey mb-2">
                No {isNoSQL ? 'Collection' : 'Table'} Selected
              </h3>
              <p className="text-sm text-grey-600">
                Select a {isNoSQL ? 'collection' : 'table'} from the sidebar to view its data
              </p>
            </div>
          </div>
        )}

        {sidebarView === 'tables' && selectedTable && (
          <>
            {/* Table Header - Fixed */}
            <div className="flex-shrink-0 bg-white border-b border-grey-400 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Table className="h-5 w-5 text-blue" />
                  <div>
                    <h2 className="text-lg font-semibold text-grey">{selectedTable.name}</h2>
                    <p className="text-xs text-grey-600">
                      {'rowCount' in selectedTable
                        ? `${selectedTable.rowCount} rows`
                        : `${selectedTable.documentCount} documents`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCodeSidebar(true)}
                    className="gap-2"
                  >
                    <Code className="h-4 w-4" />
                    Code
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="gap-2"
                  >
                    <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                    Refresh
                  </Button>

                  {/* Search Bar */}
                  <div className="relative w-48">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-grey-400" />
                    <Input
                      type="text"
                      placeholder="Search..."
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>

                  {/* Field Selector */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Eye className="h-4 w-4" />
                        Fields ({selectedFields.length > 0 ? selectedFields.length : allColumns.length})
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64" align="end">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">Select Fields</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFields([])}
                            className="h-6 text-xs"
                          >
                            Show All
                          </Button>
                        </div>
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {allColumns.map(field => (
                            <div key={field} className="flex items-center space-x-2">
                              <Checkbox
                                id={`field-${field}`}
                                checked={selectedFields.length === 0 || selectedFields.includes(field)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedFields(prev => {
                                      // If all fields were selected (empty array), select just this field
                                      if (prev.length === 0) {
                                        return [field];
                                      }
                                      // Otherwise add this field to the selection
                                      return prev.includes(field) ? prev : [...prev, field];
                                    });
                                  } else {
                                    setSelectedFields(prev => {
                                      // If all fields were selected (empty array), select all except this one
                                      if (prev.length === 0) {
                                        return allColumns.filter(f => f !== field);
                                      }
                                      // Otherwise just remove this field
                                      const newFields = prev.filter(f => f !== field);
                                      // If we removed all fields, return empty array to show all
                                      return newFields.length === 0 ? [] : newFields;
                                    });
                                  }
                                }}
                              />
                              <label
                                htmlFor={`field-${field}`}
                                className="text-sm font-medium leading-none cursor-pointer"
                              >
                                {field}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Query Builder */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Filter className="h-4 w-4" />
                        Query
                        {queryConditions.length > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 bg-primary text-white text-xs rounded-full">
                            {queryConditions.length}
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96" align="end">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">Query Conditions</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setQueryConditions(prev => [...prev, { field: '', operator: 'contains', value: '' }])}
                            className="h-6 text-xs gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            Add
                          </Button>
                        </div>
                        <div className="max-h-96 overflow-y-auto space-y-3">
                          {queryConditions.map((condition, index) => (
                            <div key={index} className="space-y-2 p-3 border rounded-lg bg-grey-50">
                              <Select
                                value={condition.field}
                                onValueChange={(value) => {
                                  const newConditions = [...queryConditions];
                                  newConditions[index].field = value;
                                  setQueryConditions(newConditions);
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Select field" />
                                </SelectTrigger>
                                <SelectContent>
                                  {allColumns.map(col => (
                                    <SelectItem key={col} value={col}>{col}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Select
                                value={condition.operator}
                                onValueChange={(value) => {
                                  const newConditions = [...queryConditions];
                                  newConditions[index].operator = value;
                                  setQueryConditions(newConditions);
                                }}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="equals">Equals</SelectItem>
                                  <SelectItem value="contains">Contains</SelectItem>
                                  <SelectItem value="starts_with">Starts with</SelectItem>
                                  <SelectItem value="ends_with">Ends with</SelectItem>
                                  <SelectItem value="greater_than">Greater than</SelectItem>
                                  <SelectItem value="less_than">Less than</SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Value"
                                  value={condition.value}
                                  onChange={(e) => {
                                    const newConditions = [...queryConditions];
                                    newConditions[index].value = e.target.value;
                                    setQueryConditions(newConditions);
                                  }}
                                  className="h-8 text-xs flex-1"
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setQueryConditions(prev => prev.filter((_, i) => i !== index))}
                                  className="h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                          {queryConditions.length === 0 && (
                            <p className="text-sm text-grey-600 text-center py-4">
                              No query conditions. Click "Add" to create one.
                            </p>
                          )}
                        </div>
                        {queryConditions.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQueryConditions([])}
                            className="w-full"
                          >
                            Clear All
                          </Button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button
                    size="sm"
                    onClick={handleInsertOpen}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Insert Row
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2" onClick={() => setShowAddColumnsDialog(true)}>
                        <Plus className="h-4 w-4" />
                        Add Columns
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" onClick={() => setShowEditColumnsDialog(true)}>
                        <Edit className="h-4 w-4" />
                        Edit Columns
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" onClick={() => setShowDeleteColumnsDialog(true)}>
                        <Trash2 className="h-4 w-4" />
                        Delete Columns
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" onClick={() => setShowCreateIndexDialog(true)}>
                        <Database className="h-4 w-4" />
                        Create Index
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" onClick={() => setShowViewIndexesDialog(true)}>
                        <Eye className="h-4 w-4" />
                        View Indexes
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" onClick={() => setShowExportDataDialog(true)}>
                        <Download className="h-4 w-4" />
                        Export Data
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-auto p-4">
              {tableData.length === 0 ? (
                <div className="bg-white rounded-lg border border-grey-400 p-12 text-center">
                  <Table className="h-12 w-12 text-grey-400 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-grey mb-2">No Data</h3>
                  <p className="text-sm text-grey-600 mb-4">
                    This {isNoSQL ? 'collection' : 'table'} doesn't have any data yet
                  </p>
                  <Button onClick={handleInsertOpen} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Insert First Row
                  </Button>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-grey-400 overflow-hidden relative">
                  {/* Floating Actions Toggle Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowActions(!showActions)}
                    className="absolute top-3 left-3 z-20 shadow-lg gap-1.5"
                    title={showActions ? "Hide actions column" : "Show actions column"}
                  >
                    {showActions ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    <span className="text-xs">{showActions ? 'Hide' : 'Show'}</span>
                  </Button>

                  <div className="overflow-x-auto">
                    <table className="w-full relative">
                      <thead className="bg-grey-50 border-b border-grey-400">
                        <tr>
                          {columns.map((col) => (
                            <th
                              key={col}
                              className="px-4 py-3 text-left text-xs font-semibold text-grey-600 uppercase tracking-wider whitespace-nowrap"
                            >
                              {col}
                            </th>
                          ))}
                          {showActions && (
                            <th className="px-4 py-3 text-left text-xs font-semibold text-grey-600 uppercase tracking-wider w-24 sticky right-0 bg-grey-50 shadow-[-4px_0_8px_rgba(0,0,0,0.05)] z-10">
                              Actions
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-grey-400">
                        {tableData
                          .slice((currentPage - 1) * pageSize, currentPage * pageSize)
                          .map((row, rowIndex) => {
                            const actualRowIndex = (currentPage - 1) * pageSize + rowIndex;
                            const hasExpandedCells = rowHasExpandedCells(actualRowIndex);

                            return (
                              <React.Fragment key={rowIndex}>
                                <tr className="group hover:bg-grey-50 transition-colors">
                                  {columns.map((col) => (
                                    <td
                                      key={col}
                                      className="px-4 py-3 text-sm text-grey"
                                    >
                                      {getValueDisplay(row[col], actualRowIndex, col)}
                                    </td>
                                  ))}
                                  {showActions && (
                                    <td className="pl-3 pr-3 text-left sticky right-0 bg-white shadow-[-4px_0_8px_rgba(0,0,0,0.05)] group-hover:bg-grey-50 transition-colors z-10">
                                      <div className="flex items-center justify-start gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEditOpen(row)}
                                          className="h-8 w-8 p-0"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteOpen(row)}
                                          className="h-8 w-8 p-0 text-red hover:text-red hover:bg-red/10"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    </td>
                                  )}
                                </tr>
                                {hasExpandedCells && (
                                  <tr>
                                    <td colSpan={columns.length + (showActions ? 1 : 0)} className="p-0 bg-grey-50">
                                      {renderExpandedCellsSubtable(row, actualRowIndex)}
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="bg-grey-50 border-t border-grey-400 px-4 py-3">
                    <div className="flex items-center justify-between text-sm text-grey-600">
                      <div className="flex items-center gap-4">
                        <div>
                          Showing <span className="font-semibold text-grey">
                            {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, tableData.length)}
                          </span> of{' '}
                          <span className="font-semibold text-grey">
                            {'rowCount' in selectedTable ? selectedTable.rowCount : selectedTable.documentCount}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs">Rows per page:</span>
                          <select
                            value={pageSize}
                            onChange={(e) => {
                              setPageSize(Number(e.target.value));
                              setCurrentPage(1);
                            }}
                            className="h-7 px-2 py-1 text-xs border border-grey-400 rounded bg-white"
                          >
                            <option value={10}>10</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(currentPage - 1)}
                        >
                          Previous
                        </Button>
                        <span className="text-xs px-2">
                          Page {currentPage} of {Math.ceil(tableData.length / pageSize)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage >= Math.ceil(tableData.length / pageSize)}
                          onClick={() => setCurrentPage(currentPage + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Migrations View */}
        {sidebarView === 'migrations' && !isNoSQL && !selectedMigration && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <GitBranch className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-grey mb-2">No Migration Selected</h3>
              <p className="text-sm text-grey-600">
                Select a migration from the sidebar to view its details
              </p>
            </div>
          </div>
        )}

        {sidebarView === 'migrations' && !isNoSQL && selectedMigration && (
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                      <GitBranch className="h-5 w-5 text-green" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-grey">{selectedMigration.name}</h2>
                      <p className="text-sm text-grey-600">{selectedMigration.tag}</p>
                    </div>
                  </div>
                  <span className={cn(
                    'px-3 py-1 rounded text-xs font-medium uppercase',
                    selectedMigration.status === 'completed' ? 'bg-green/10 text-green' : 'bg-yellow/10 text-yellow'
                  )}>
                    {selectedMigration.status}
                  </span>
                </div>

                {selectedMigration.description && (
                  <p className="text-grey-600 mb-4">{selectedMigration.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 bg-grey-50 rounded-lg">
                    <p className="text-xs text-grey-600 mb-1">Created At</p>
                    <p className="text-sm font-medium text-grey">{selectedMigration.created_at}</p>
                  </div>
                  <div className="p-3 bg-grey-50 rounded-lg">
                    <p className="text-xs text-grey-600 mb-1">Statements</p>
                    <p className="text-sm font-medium text-grey">
                      <ArrowUpCircle className="h-3.5 w-3.5 inline text-green mr-1" />
                      {selectedMigration.up_statements} up
                      <ArrowDownCircle className="h-3.5 w-3.5 inline text-red ml-3 mr-1" />
                      {selectedMigration.down_statements} down
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  {selectedMigration.status === 'pending' && (
                    <Button
                      onClick={() => handleRunMigration(selectedMigration)}
                      className="gap-2"
                    >
                      <Play className="h-4 w-4" />
                      Run Migration (Up)
                    </Button>
                  )}
                  {selectedMigration.status === 'completed' && (
                    <Button
                      variant="outline"
                      onClick={() => handleRunMigration(selectedMigration)}
                      className="gap-2"
                    >
                      <ArrowDownCircle className="h-4 w-4" />
                      Rollback (Down)
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions View */}
        {sidebarView === 'actions' && !selectedAction && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Zap className="h-12 w-12 text-grey-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-grey mb-2">No Action Selected</h3>
              <p className="text-sm text-grey-600">
                Select an action from the sidebar to view its details
              </p>
            </div>
          </div>
        )}

        {sidebarView === 'actions' && selectedAction && (
          <div className="flex-1 overflow-auto p-6">
            <div className="max-w-3xl mx-auto">
              <div className="bg-white rounded-lg border border-grey-400 p-6 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-yellow/10 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-yellow" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-grey">{selectedAction.name}</h2>
                      <p className="text-sm text-grey-600">{selectedAction.tag}</p>
                    </div>
                  </div>
                  <span className={cn('px-3 py-1 rounded text-xs font-medium uppercase', getActionTypeColor(selectedAction.type))}>
                    {selectedAction.type}
                  </span>
                </div>

                {selectedAction.description && (
                  <p className="text-grey-600 mb-4">{selectedAction.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-3 bg-grey-50 rounded-lg">
                    <p className="text-xs text-grey-600 mb-1">Target Table</p>
                    <p className="text-sm font-medium text-grey">{selectedAction.tableName}</p>
                  </div>
                  <div className="p-3 bg-grey-50 rounded-lg">
                    <p className="text-xs text-grey-600 mb-1">Parameters</p>
                    <p className="text-sm font-medium text-grey">{selectedAction.parameters.length}</p>
                  </div>
                </div>

                {selectedAction.parameters.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-grey mb-3">Parameters</h3>
                    <div className="space-y-2">
                      {selectedAction.parameters.map((param) => (
                        <div key={param} className="p-2 bg-grey-50 rounded border border-grey-400">
                          <code className="text-sm text-grey">{param}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => handleRunAction(selectedAction)}
                  className="gap-2"
                >
                  <Play className="h-4 w-4" />
                  Execute Action
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Table Dialog */}
      <Dialog open={showCreateTableDialog} onOpenChange={setShowCreateTableDialog}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className='text-grey'>Create New {isNoSQL ? 'Collection' : 'Table'}</DialogTitle>
            <DialogDescription>
              Define the schema for your new {isNoSQL ? 'collection' : 'table'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="table-name">Name *</Label>
              <Input
                id="table-name"
                placeholder={`Enter ${isNoSQL ? 'collection' : 'table'} name`}
                value={tableName}
                onChange={(e) => {
                  const name = e.target.value;
                  setTableName(name);
                  // Auto-generate tag from name
                  const sanitizedTag = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                  setTableTag(sanitizedTag);
                  // Auto-generate description
                  if (name.trim()) {
                    setTableDescription(`${isNoSQL ? 'Collection' : 'Table'} for storing ${name.toLowerCase()} data`);
                  } else {
                    setTableDescription('');
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="table-tag">Tag *</Label>
              <div className="flex gap-2">
                <Input
                  id="table-tag"
                  placeholder="e.g., users_table"
                  value={tableTag}
                  onChange={(e) => setTableTag(e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={generateTableTag}
                  size="sm"
                  disabled={!tableName.trim()}
                >
                  Auto-generate
                </Button>
              </div>
              <p className="text-xs text-grey-600">
                A unique identifier for this {isNoSQL ? 'collection' : 'table'} (auto-generated from name)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="table-description">Description</Label>
              <Textarea
                id="table-description"
                placeholder="Optional description (supports markdown)"
                rows={2}
                value={tableDescription}
                onChange={(e) => setTableDescription(e.target.value)}
              />
              <p className="text-xs text-grey-600">Supports markdown formatting</p>
            </div>

            {/* Schema Builder */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Columns / Fields</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addColumn}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Column
                </Button>
              </div>

              <div className="space-y-3">
                {tableColumns.map((column, index) => (
                  <div key={index} className="border border-grey-400 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-grey">Column {index + 1}</h4>
                      {tableColumns.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeColumn(index)}
                          className="h-7 w-7 p-0 text-grey-600 hover:text-red"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Column Name *</Label>
                        <Input
                          placeholder="e.g., email, created_at"
                          value={column.name}
                          onChange={(e) => updateColumn(index, 'name', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Data Type *</Label>
                        <select
                          value={column.type}
                          onChange={(e) => {
                            updateColumn(index, 'type', e.target.value);
                            // Initialize enumValues array when enum type is selected
                            if (e.target.value === 'enum' && !column.enumValues) {
                              updateColumn(index, 'enumValues', ['']);
                            }
                          }}
                          className="w-full h-9 px-3 py-2 text-sm border border-grey-400 rounded bg-white"
                        >
                          <option value="string">String / VARCHAR</option>
                          <option value="text">Text</option>
                          <option value="integer">Integer</option>
                          <option value="bigint">Big Integer</option>
                          <option value="float">Float</option>
                          <option value="decimal">Decimal</option>
                          <option value="boolean">Boolean</option>
                          <option value="date">Date</option>
                          <option value="datetime">DateTime</option>
                          <option value="timestamp">Timestamp</option>
                          <option value="json">JSON</option>
                          <option value="uuid">UUID</option>
                          <option value="enum">Enum</option>
                        </select>
                      </div>
                    </div>

                    {/* Enum Values Section */}
                    {column.type === 'enum' && (
                      <div className="space-y-2 p-3 bg-grey-50 rounded border border-grey-300">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Enum Values *</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const currentValues = column.enumValues || [];
                              updateColumn(index, 'enumValues', [...currentValues, '']);
                            }}
                            className="h-6 text-xs gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            Add Value
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {(column.enumValues || ['']).map((enumValue, enumIndex) => (
                            <div key={enumIndex} className="flex gap-2">
                              <Input
                                placeholder={`Value ${enumIndex + 1}`}
                                value={enumValue}
                                onChange={(e) => {
                                  const newEnumValues = [...(column.enumValues || [])];
                                  newEnumValues[enumIndex] = e.target.value;
                                  updateColumn(index, 'enumValues', newEnumValues);
                                }}
                                className="h-8 text-xs"
                              />
                              {(column.enumValues || []).length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newEnumValues = (column.enumValues || []).filter((_, i) => i !== enumIndex);
                                    updateColumn(index, 'enumValues', newEnumValues.length > 0 ? newEnumValues : ['']);
                                  }}
                                  className="h-8 w-8 p-0 text-grey-600 hover:text-red"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-grey-600">Define the possible values for this enum field</p>
                      </div>
                    )}

                    {/* Default Value - Only for non-unique columns */}
                    {!column.primaryKey && !column.unique && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Default Value</Label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={column.hasDefaultValue || false}
                              onChange={(e) => {
                                const isChecked = e.target.checked;
                                const newColumns = [...tableColumns];
                                newColumns[index] = {
                                  ...newColumns[index],
                                  hasDefaultValue: isChecked,
                                  defaultValue: isChecked ? (newColumns[index].defaultValue || '') : ''
                                };
                                setTableColumns(newColumns);
                              }}
                              className="rounded border-grey-400"
                            />
                            <span className="text-xs text-grey-600">Set default</span>
                          </label>
                        </div>

                        {column.hasDefaultValue && (
                          <>
                            {column.type === 'enum' && column.enumValues?.length ? (
                              <select
                                value={column.defaultValue || (column.nullable ? '' : column.enumValues.filter(v => v)[0] || '')}
                                onChange={(e) => updateColumn(index, 'defaultValue', e.target.value)}
                                className="w-full h-9 px-3 py-2 text-xs border border-grey-400 rounded bg-white"
                              >
                                {column.nullable && <option value="">None (NULL)</option>}
                                {column.enumValues.filter(v => v).map((enumValue, enumIdx) => (
                                  <option key={enumIdx} value={enumValue}>
                                    {enumValue}
                                  </option>
                                ))}
                              </select>
                            ) : column.type === 'boolean' ? (
                              <select
                                value={column.defaultValue || ''}
                                onChange={(e) => updateColumn(index, 'defaultValue', e.target.value)}
                                className="w-full h-9 px-3 py-2 text-xs border border-grey-400 rounded bg-white"
                              >
                                <option value="">None (NULL)</option>
                                <option value="true">true</option>
                                <option value="false">false</option>
                              </select>
                            ) : ['integer', 'bigint', 'float', 'decimal'].includes(column.type) ? (
                              <Input
                                type="number"
                                step={column.type === 'float' || column.type === 'decimal' ? '0.01' : '1'}
                                placeholder="e.g., 0"
                                value={column.defaultValue || ''}
                                onChange={(e) => updateColumn(index, 'defaultValue', e.target.value)}
                                className="h-9 text-xs"
                              />
                            ) : ['date', 'datetime', 'timestamp'].includes(column.type) ? (
                              <div className="space-y-2">
                                <select
                                  value={column.defaultValue?.startsWith('$') ? column.defaultValue : 'custom'}
                                  onChange={(e) => {
                                    if (e.target.value === 'custom') {
                                      updateColumn(index, 'defaultValue', '');
                                    } else {
                                      updateColumn(index, 'defaultValue', e.target.value);
                                    }
                                  }}
                                  className="w-full h-9 px-3 py-2 text-xs border border-grey-400 rounded bg-white"
                                >
                                  <option value="$Now">$Now (Current timestamp)</option>
                                  <option value="custom">Custom datetime</option>
                                </select>
                                {(!column.defaultValue || !column.defaultValue.startsWith('$')) && (
                                  <Input
                                    type="datetime-local"
                                    value={column.defaultValue || ''}
                                    onChange={(e) => updateColumn(index, 'defaultValue', e.target.value)}
                                    className="h-9 text-xs"
                                  />
                                )}
                              </div>
                            ) : (
                              <Input
                                placeholder="e.g., &quot;example&quot;"
                                value={column.defaultValue || ''}
                                onChange={(e) => updateColumn(index, 'defaultValue', e.target.value)}
                                className="h-9 text-xs"
                              />
                            )}
                            <p className="text-xs text-grey-600">
                              {column.type === 'enum' && column.enumValues?.length
                                ? 'Select a default value from the enum values'
                                : ['date', 'datetime', 'timestamp'].includes(column.type)
                                ? 'Use $Now for current timestamp, or enter a specific value'
                                : 'Enter a default value for this column'}
                            </p>
                          </>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={column.nullable}
                          onChange={(e) => updateColumn(index, 'nullable', e.target.checked)}
                          className="rounded border-grey-400"
                        />
                        <span className="text-xs text-grey-600">Nullable</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={column.unique}
                          onChange={(e) => updateColumn(index, 'unique', e.target.checked)}
                          className="rounded border-grey-400"
                        />
                        <span className="text-xs text-grey-600">Unique</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={column.primaryKey}
                          onChange={(e) => updateColumn(index, 'primaryKey', e.target.checked)}
                          className="rounded border-grey-400"
                        />
                        <span className="text-xs text-grey-600">Primary Key</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Relationships Section - Only for SQL databases */}
            {!isNoSQL && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Relationships (Foreign Keys)</Label>
                    <p className="text-xs text-grey-600 mt-1">Define relationships to other tables</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRelationship}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Relationship
                  </Button>
                </div>

                {tableRelationships.length > 0 && (
                  <div className="space-y-3">
                    {tableRelationships.map((relationship, index) => (
                      <div key={index} className="border border-grey-400 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-grey">Relationship {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeRelationship(index)}
                            className="h-7 w-7 p-0 text-grey-600 hover:text-red"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Column Name *</Label>
                            <select
                              value={relationship.columnName}
                              onChange={(e) => updateRelationship(index, 'columnName', e.target.value)}
                              className="w-full h-9 px-3 py-2 text-sm border border-grey-400 rounded bg-white"
                            >
                              <option value="">Select column...</option>
                              {tableColumns.map((col) => (
                                <option key={col.name} value={col.name}>
                                  {col.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Referenced Table *</Label>
                            <select
                              value={relationship.referencedTable}
                              onChange={(e) => updateRelationship(index, 'referencedTable', e.target.value)}
                              className="w-full h-9 px-3 py-2 text-sm border border-grey-400 rounded bg-white"
                            >
                              <option value="">Select table...</option>
                              {tables.map((table) => (
                                <option key={table.name} value={table.name}>
                                  {table.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-2">
                            <Label className="text-xs">Referenced Column *</Label>
                            <Input
                              placeholder="e.g., id"
                              value={relationship.referencedColumn}
                              onChange={(e) => updateRelationship(index, 'referencedColumn', e.target.value)}
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">On Delete</Label>
                            <select
                              value={relationship.onDelete}
                              onChange={(e) => updateRelationship(index, 'onDelete', e.target.value)}
                              className="w-full h-9 px-3 py-2 text-sm border border-grey-400 rounded bg-white"
                            >
                              <option value="CASCADE">CASCADE</option>
                              <option value="SET NULL">SET NULL</option>
                              <option value="RESTRICT">RESTRICT</option>
                              <option value="NO ACTION">NO ACTION</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">On Update</Label>
                            <select
                              value={relationship.onUpdate}
                              onChange={(e) => updateRelationship(index, 'onUpdate', e.target.value)}
                              className="w-full h-9 px-3 py-2 text-sm border border-grey-400 rounded bg-white"
                            >
                              <option value="CASCADE">CASCADE</option>
                              <option value="SET NULL">SET NULL</option>
                              <option value="RESTRICT">RESTRICT</option>
                              <option value="NO ACTION">NO ACTION</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTableDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTable} className="gap-2">
              <Check className="h-4 w-4" />
              Create {isNoSQL ? 'Collection' : 'Table'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Action Dialog */}
      <Dialog open={showCreateActionDialog} onOpenChange={setShowCreateActionDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className='text-grey'>Create New Action</DialogTitle>
            <DialogDescription>
              Define a new database action for performing operations on your data
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="action-name">Action Name *</Label>
              <Input
                id="action-name"
                placeholder="e.g., getUser, createOrder, updateProduct"
                value={actionName}
                onChange={(e) => setActionName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="action-description">Description</Label>
              <Textarea
                id="action-description"
                placeholder="Describe what this action does..."
                rows={2}
                value={actionDescription}
                onChange={(e) => setActionDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="action-type">Action Type *</Label>
                <select
                  id="action-type"
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as any)}
                  className="w-full h-10 px-3 py-2 text-sm border border-grey-400 rounded bg-white"
                >
                  <option value="read">Read (SELECT)</option>
                  <option value="create">Create (INSERT)</option>
                  <option value="update">Update (UPDATE)</option>
                  <option value="delete">Delete (DELETE)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="action-table">Target Table *</Label>
                <select
                  id="action-table"
                  value={actionTable}
                  onChange={(e) => setActionTable(e.target.value)}
                  className="w-full h-10 px-3 py-2 text-sm border border-grey-400 rounded bg-white"
                >
                  <option value="">Select a table...</option>
                  {tables.map((table) => (
                    <option key={table.name} value={table.name}>
                      {table.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Parameters */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Parameters</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addActionParameter}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Parameter
                </Button>
              </div>

              <div className="space-y-2">
                {actionParameters.map((param, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder={`e.g., ${actionTable ? actionTable.slice(0, -1) : 'user'}_id, email, limit`}
                      value={param}
                      onChange={(e) => updateActionParameter(index, e.target.value)}
                      className="flex-1"
                    />
                    {actionParameters.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeActionParameter(index)}
                        className="h-10 w-10 p-0 text-grey-600 hover:text-red"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <p className="text-xs text-grey-600">
                Parameters define the inputs this action will accept when executed
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <Zap className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">About Actions</p>
                  <p className="text-blue-800">
                    Actions are reusable database operations. Once created, you can execute them with different parameter values directly from the database explorer.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateActionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAction} className="gap-2">
              <Check className="h-4 w-4" />
              Create Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Insert Dialog */}
      <Dialog open={showInsertDialog} onOpenChange={setShowInsertDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className='text-grey'>Insert New Row</DialogTitle>
            <DialogDescription>
              Add a new record to the {selectedTable?.name} {isNoSQL ? 'collection' : 'table'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {columns.filter(col => col !== 'id').map((col) => {
              const columnType = getColumnType(col);
              const isJsonType = columnType === 'json' || columnType === 'jsonb';

              return (
                <div key={col} className="space-y-2">
                  <Label htmlFor={col} className="text-sm font-medium">
                    {col}
                    {isJsonType && <span className="text-xs text-grey-500 ml-1">(JSON)</span>}
                  </Label>
                  {isJsonType ? (
                    <>
                      <Textarea
                        id={col}
                        value={typeof formData[col] === 'object' ? JSON.stringify(formData[col], null, 2) : (formData[col] || '')}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({ ...formData, [col]: value });
                          validateJson(value, col);
                        }}
                        placeholder={`Enter JSON object or array`}
                        rows={6}
                        className={jsonValidationErrors[col] ? 'border-red' : ''}
                      />
                      {jsonValidationErrors[col] && (
                        <p className="text-xs text-red mt-1">
                          Invalid JSON: {jsonValidationErrors[col]}
                        </p>
                      )}
                      <p className="text-xs text-grey-600 mt-1">
                        Enter a valid JSON object or array (e.g., {`{"key": "value"}`} or {`["item1", "item2"]`})
                      </p>
                    </>
                  ) : col.includes('description') || col.length > 20 ? (
                    <Textarea
                      id={col}
                      value={formData[col] || ''}
                      onChange={(e) => setFormData({ ...formData, [col]: e.target.value })}
                      placeholder={`Enter ${col}`}
                      rows={3}
                    />
                  ) : (
                    <Input
                      id={col}
                      type={col.includes('date') || col.includes('time') ? 'datetime-local' :
                            col.includes('price') || col.includes('amount') ? 'number' :
                            col.includes('email') ? 'email' : 'text'}
                      value={formData[col] || ''}
                      onChange={(e) => setFormData({ ...formData, [col]: e.target.value })}
                      placeholder={`Enter ${col}`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowInsertDialog(false);
              setJsonValidationErrors({});
            }}>
              Cancel
            </Button>
            <Button onClick={handleInsert} className="gap-2">
              <Check className="h-4 w-4" />
              Insert Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className='text-grey'>Edit Row</DialogTitle>
            <DialogDescription>
              Update the record in the {selectedTable?.name} {isNoSQL ? 'collection' : 'table'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {columns.map((col) => {
              const columnType = getColumnType(col);
              const isJsonType = columnType === 'json' || columnType === 'jsonb';

              return (
                <div key={col} className="space-y-2">
                  <Label htmlFor={`edit-${col}`} className="text-sm font-medium">
                    {col}
                    {isJsonType && <span className="text-xs text-grey-500 ml-1">(JSON)</span>}
                  </Label>
                  {isJsonType ? (
                    <>
                      <Textarea
                        id={`edit-${col}`}
                        value={typeof formData[col] === 'object' ? JSON.stringify(formData[col], null, 2) : (formData[col] || '')}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData({ ...formData, [col]: value });
                          validateJson(value, col);
                        }}
                        disabled={col === 'id'}
                        placeholder={`Enter JSON object or array`}
                        rows={6}
                        className={jsonValidationErrors[col] ? 'border-red' : ''}
                      />
                      {jsonValidationErrors[col] && (
                        <p className="text-xs text-red mt-1">
                          Invalid JSON: {jsonValidationErrors[col]}
                        </p>
                      )}
                      <p className="text-xs text-grey-600 mt-1">
                        Enter a valid JSON object or array (e.g., {`{"key": "value"}`} or {`["item1", "item2"]`})
                      </p>
                    </>
                  ) : col.includes('description') || col.length > 20 ? (
                    <Textarea
                      id={`edit-${col}`}
                      value={formData[col] || ''}
                      onChange={(e) => setFormData({ ...formData, [col]: e.target.value })}
                      disabled={col === 'id'}
                      rows={3}
                    />
                  ) : (
                    <Input
                      id={`edit-${col}`}
                      type={col.includes('date') || col.includes('time') ? 'datetime-local' :
                            col.includes('price') || col.includes('amount') ? 'number' :
                            col.includes('email') ? 'email' : 'text'}
                      value={formData[col] || ''}
                      onChange={(e) => setFormData({ ...formData, [col]: e.target.value })}
                      disabled={col === 'id'}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditDialog(false);
              setJsonValidationErrors({});
            }}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} className="gap-2">
              <Check className="h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className='text-grey'>Delete Row</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {selectedRow && (
            <div className="py-4">
              <div className="bg-grey-50 rounded-lg p-4 border border-grey-400">
                <p className="text-sm font-semibold text-grey mb-2">Record details:</p>
                <div className="space-y-1">
                  {Object.entries(selectedRow).slice(0, 3).map(([key, value]) => (
                    <div key={key} className="text-sm text-grey-600">
                      <span className="font-medium">{key}:</span> {String(value)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Columns Dialog */}
      <Dialog open={showAddColumnsDialog} onOpenChange={(open) => {
        setShowAddColumnsDialog(open);
        if (!open) {
          setNewColumns([]);
          setShowAddColumnsConfirm(false);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className='text-grey'>Add Columns</DialogTitle>
            <DialogDescription>
              Add new columns to the {selectedTable?.name} {isNoSQL ? 'collection' : 'table'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {newColumns.length === 0 && (
              <div className="text-center py-8 border border-dashed border-grey-300 rounded-lg">
                <p className="text-sm text-grey-600 mb-3">
                  No columns added yet. Click the button below to start adding columns.
                </p>
                <Button onClick={addNewColumnRow} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add First Column
                </Button>
              </div>
            )}

            {newColumns.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-grey">Column Definitions</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addNewColumnRow}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Column
                  </Button>
                </div>

                {newColumns.map((column, index) => (
                  <div key={index} className="border border-grey-400 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-grey">Column {index + 1}</h4>
                      {newColumns.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeNewColumnRow(index)}
                          className="h-7 w-7 p-0 text-grey-600 hover:text-red"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Column Name *</Label>
                        <Input
                          placeholder="e.g., email, created_at"
                          value={column.name}
                          onChange={(e) => updateNewColumn(index, 'name', e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Data Type *</Label>
                        <select
                          value={column.type}
                          onChange={(e) => {
                            updateNewColumn(index, 'type', e.target.value);
                            if (e.target.value === 'enum' && !column.enumValues) {
                              updateNewColumn(index, 'enumValues', ['']);
                            }
                          }}
                          className="w-full h-9 px-3 py-2 text-sm border border-grey-400 rounded bg-white"
                        >
                          <option value="string">String / VARCHAR</option>
                          <option value="text">Text</option>
                          <option value="integer">Integer</option>
                          <option value="bigint">Big Integer</option>
                          <option value="float">Float</option>
                          <option value="decimal">Decimal</option>
                          <option value="boolean">Boolean</option>
                          <option value="date">Date</option>
                          <option value="datetime">DateTime</option>
                          <option value="timestamp">Timestamp</option>
                          <option value="json">JSON</option>
                          <option value="uuid">UUID</option>
                          <option value="enum">Enum</option>
                        </select>
                      </div>
                    </div>

                    {/* Enum Values Section */}
                    {column.type === 'enum' && (
                      <div className="space-y-2 p-3 bg-grey-50 rounded border border-grey-300">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Enum Values *</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const currentValues = column.enumValues || [];
                              updateNewColumn(index, 'enumValues', [...currentValues, '']);
                            }}
                            className="h-6 text-xs gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            Add Value
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {(column.enumValues || ['']).map((enumValue, enumIndex) => (
                            <div key={enumIndex} className="flex gap-2">
                              <Input
                                placeholder={`Value ${enumIndex + 1}`}
                                value={enumValue}
                                onChange={(e) => {
                                  const newEnumValues = [...(column.enumValues || [])];
                                  newEnumValues[enumIndex] = e.target.value;
                                  updateNewColumn(index, 'enumValues', newEnumValues);
                                }}
                                className="h-8 text-xs"
                              />
                              {(column.enumValues || []).length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newEnumValues = (column.enumValues || []).filter((_, i) => i !== enumIndex);
                                    updateNewColumn(index, 'enumValues', newEnumValues.length > 0 ? newEnumValues : ['']);
                                  }}
                                  className="h-8 w-8 p-0 text-grey-600 hover:text-red"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={column.nullable}
                          onChange={(e) => updateNewColumn(index, 'nullable', e.target.checked)}
                          className="rounded border-grey-400"
                        />
                        <span className="text-xs text-grey-600">Nullable</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={column.unique}
                          onChange={(e) => updateNewColumn(index, 'unique', e.target.checked)}
                          className="rounded border-grey-400"
                        />
                        <span className="text-xs text-grey-600">Unique</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddColumnsDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddColumns}
              className="gap-2"
              disabled={newColumns.length === 0}
            >
              <Plus className="h-4 w-4" />
              Add {newColumns.length} Column{newColumns.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Columns Confirmation Dialog */}
      <Dialog open={showAddColumnsConfirm} onOpenChange={setShowAddColumnsConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className='text-grey'>Confirm Add Columns</DialogTitle>
            <DialogDescription>
              Are you sure you want to add these columns?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-grey-700 mb-3">
              This will permanently add {newColumns.length} column{newColumns.length !== 1 ? 's' : ''} to the <span className="font-semibold">{selectedTable?.name}</span> {isNoSQL ? 'collection' : 'table'}:
            </p>
            <ul className="space-y-1">
              {newColumns.map((col, idx) => (
                <li key={idx} className="text-sm text-grey-600 flex items-center gap-2">
                  <Columns className="h-3 w-3" />
                  <span className="font-mono">{col.name || `column_${idx + 1}`}</span>
                  <span className="text-grey-500">({col.type})</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-grey-600 mt-3">
              The columns will be added to the table schema immediately.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddColumnsConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAddColumns} className="gap-2">
              <Check className="h-4 w-4" />
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Columns Dialog */}
      <Dialog open={showEditColumnsDialog} onOpenChange={(open) => {
        setShowEditColumnsDialog(open);
        if (!open) {
          setColumnToEdit(null);
          setEditColumnForm(null);
          setShowEditColumnsConfirm(false);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className='text-grey'>Edit Columns</DialogTitle>
            <DialogDescription>
              Modify existing columns in the {selectedTable?.name} {isNoSQL ? 'collection' : 'table'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {!columnToEdit ? (
              <>
                <p className="text-sm text-grey-600">
                  Select a column to edit its properties.
                </p>
                <div className="space-y-3">
                  {columns.map((col) => (
                    <div key={col} className="flex items-center justify-between p-3 border border-grey-300 rounded-lg hover:bg-grey-50">
                      <div className="flex items-center gap-3">
                        <Columns className="h-4 w-4 text-grey-600" />
                        <div>
                          <p className="text-sm font-medium">{col}</p>
                          <p className="text-xs text-grey-600">
                            {col.includes('id') ? 'Integer, Primary Key' :
                             col.includes('name') || col.includes('title') ? 'String' :
                             col.includes('price') || col.includes('amount') ? 'Decimal' :
                             col.includes('date') || col.includes('time') ? 'Datetime' : 'String'}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                        onClick={() => handleEditColumn(col)}
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            ) : editColumnForm ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-medium text-grey">Editing Column</p>
                    <p className="text-xs text-grey-600">Modify the properties below</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setColumnToEdit(null);
                      setEditColumnForm(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="border border-grey-400 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Column Name *</Label>
                      <Input
                        placeholder="e.g., email, created_at"
                        value={editColumnForm.name}
                        onChange={(e) => setEditColumnForm({ ...editColumnForm, name: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Data Type *</Label>
                      <select
                        value={editColumnForm.type}
                        onChange={(e) => setEditColumnForm({ ...editColumnForm, type: e.target.value })}
                        className="w-full h-9 px-3 py-2 text-sm border border-grey-400 rounded bg-white"
                      >
                        <option value="string">String / VARCHAR</option>
                        <option value="text">Text</option>
                        <option value="integer">Integer</option>
                        <option value="bigint">Big Integer</option>
                        <option value="float">Float</option>
                        <option value="decimal">Decimal</option>
                        <option value="boolean">Boolean</option>
                        <option value="date">Date</option>
                        <option value="datetime">DateTime</option>
                        <option value="timestamp">Timestamp</option>
                        <option value="json">JSON</option>
                        <option value="uuid">UUID</option>
                        <option value="enum">Enum</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editColumnForm.nullable}
                        onChange={(e) => setEditColumnForm({ ...editColumnForm, nullable: e.target.checked })}
                        className="rounded border-grey-400"
                      />
                      <span className="text-xs text-grey-600">Nullable</span>
                    </label>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <DialogFooter>
            {columnToEdit ? (
              <>
                <Button variant="outline" onClick={() => {
                  setColumnToEdit(null);
                  setEditColumnForm(null);
                }}>
                  Back
                </Button>
                <Button onClick={saveEditColumn} className="gap-2">
                  <Check className="h-4 w-4" />
                  Save Changes
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setShowEditColumnsDialog(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Columns Confirmation Dialog */}
      <Dialog open={showEditColumnsConfirm} onOpenChange={setShowEditColumnsConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className='text-grey'>Confirm Edit Column</DialogTitle>
            <DialogDescription>
              Are you sure you want to update this column?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-grey-700 mb-3">
              This will modify the column <span className="font-semibold font-mono">{columnToEdit}</span> in the <span className="font-semibold">{selectedTable?.name}</span> {isNoSQL ? 'collection' : 'table'}.
            </p>
            {editColumnForm && (
              <div className="bg-grey-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-grey-600">New Name:</span>
                  <span className="font-mono">{editColumnForm.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-grey-600">Type:</span>
                  <span className="font-mono">{editColumnForm.type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-grey-600">Nullable:</span>
                  <span className="font-mono">{editColumnForm.nullable ? 'Yes' : 'No'}</span>
                </div>
              </div>
            )}
            <p className="text-xs text-grey-600 mt-3">
              Warning: Changing column type or constraints may require data migration or affect existing data.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditColumnsConfirm(false)}>
              Cancel
            </Button>
            <Button onClick={confirmEditColumn} className="gap-2">
              <Check className="h-4 w-4" />
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Columns Dialog */}
      <Dialog open={showDeleteColumnsDialog} onOpenChange={(open) => {
        setShowDeleteColumnsDialog(open);
        if (!open) {
          setColumnsToDelete([]);
          setShowDeleteColumnsConfirm(false);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className='text-grey'>Delete Columns</DialogTitle>
            <DialogDescription>
              Select columns to remove from the {selectedTable?.name} {isNoSQL ? 'collection' : 'table'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium">
                ⚠️ Warning: Deleting columns will permanently remove the data in those columns.
              </p>
            </div>

            {columnsToDelete.length > 0 && (
              <div className="bg-grey-50 border border-grey-300 rounded-lg p-3">
                <p className="text-sm text-grey-700">
                  <span className="font-semibold">{columnsToDelete.length}</span> column{columnsToDelete.length !== 1 ? 's' : ''} selected for deletion
                </p>
              </div>
            )}

            <div className="space-y-2">
              {columns.filter(col => col !== 'id').map((col) => (
                <label
                  key={col}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    columnsToDelete.includes(col)
                      ? 'border-red-400 bg-red-50'
                      : 'border-grey-300 hover:bg-grey-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={columnsToDelete.includes(col)}
                    onChange={() => toggleColumnForDeletion(col)}
                    className="rounded border-grey-400"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{col}</p>
                    <p className="text-xs text-grey-600">
                      {col.includes('id') ? 'Integer' :
                       col.includes('name') || col.includes('title') ? 'String' :
                       col.includes('price') || col.includes('amount') ? 'Decimal' :
                       col.includes('date') || col.includes('time') ? 'Datetime' : 'String'}
                    </p>
                  </div>
                  <Trash2 className={`h-4 w-4 ${columnsToDelete.includes(col) ? 'text-red-600' : 'text-grey-400'}`} />
                </label>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteColumnsDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteColumns}
              className="gap-2"
              disabled={columnsToDelete.length === 0}
            >
              <Trash2 className="h-4 w-4" />
              Delete {columnsToDelete.length > 0 ? columnsToDelete.length : ''} Column{columnsToDelete.length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Columns Confirmation Dialog */}
      <Dialog open={showDeleteColumnsConfirm} onOpenChange={setShowDeleteColumnsConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className='text-grey'>Confirm Delete Columns</DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <p className="text-sm text-red-800 font-medium">
                ⚠️ Warning: This will permanently delete the following columns and all their data:
              </p>
            </div>
            <ul className="space-y-1 mb-3">
              {columnsToDelete.map((col) => (
                <li key={col} className="text-sm text-grey-700 flex items-center gap-2">
                  <Trash2 className="h-3 w-3 text-red-600" />
                  <span className="font-mono">{col}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-grey-600">
              This will remove {columnsToDelete.length} column{columnsToDelete.length !== 1 ? 's' : ''} from the <span className="font-semibold">{selectedTable?.name}</span> {isNoSQL ? 'collection' : 'table'}. All data in these columns will be permanently lost.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteColumnsConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteColumns} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Index Dialog */}
      <Dialog open={showCreateIndexDialog} onOpenChange={setShowCreateIndexDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className='text-grey'>Create Index</DialogTitle>
            <DialogDescription>
              Create an index on the {selectedTable?.name} {isNoSQL ? 'collection' : 'table'} to improve query performance
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="index-name" className="text-sm font-medium">
                Index Name
              </Label>
              <Input
                id="index-name"
                placeholder="e.g., idx_user_email"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Columns
              </Label>
              <p className="text-xs text-grey-600">
                Select the columns to include in this index
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {columns.map((col) => (
                  <label key={col} className="flex items-center gap-3 p-2 border border-grey-300 rounded hover:bg-grey-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-grey-400"
                    />
                    <span className="text-sm">{col}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Index Type
              </Label>
              <select className="w-full h-10 px-3 py-2 text-sm border border-grey-400 rounded bg-white">
                <option value="btree">B-Tree (Default)</option>
                <option value="hash">Hash</option>
                <option value="gin">GIN</option>
                <option value="gist">GiST</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-grey-400"
              />
              <span className="text-sm">Unique Index</span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateIndexDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast.success('Index created successfully');
              setShowCreateIndexDialog(false);
            }} className="gap-2">
              <Database className="h-4 w-4" />
              Create Index
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Data Dialog */}
      <Dialog open={showExportDataDialog} onOpenChange={setShowExportDataDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className='text-grey'>Export Data</DialogTitle>
            <DialogDescription>
              Export data from the {selectedTable?.name} {isNoSQL ? 'collection' : 'table'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Export Format
              </Label>
              <select className="w-full h-10 px-3 py-2 text-sm border border-grey-400 rounded bg-white">
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
                <option value="xlsx">Excel (XLSX)</option>
                <option value="sql">SQL</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Columns to Export
              </Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-grey-300 rounded p-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-grey-400"
                  />
                  <span className="text-sm font-medium">All Columns</span>
                </label>
                {columns.map((col) => (
                  <label key={col} className="flex items-center gap-3 pl-6 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="rounded border-grey-400"
                    />
                    <span className="text-sm">{col}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Export Options
              </Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-grey-400"
                  />
                  <span className="text-sm">Include Headers</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-grey-400"
                  />
                  <span className="text-sm">Export Only Filtered Data</span>
                </label>
              </div>
            </div>

            <div className="bg-grey-50 border border-grey-300 rounded-lg p-3">
              <p className="text-xs text-grey-600">
                {tableData.length} {tableData.length === 1 ? 'row' : 'rows'} will be exported
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDataDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              toast.success('Data exported successfully');
              setShowExportDataDialog(false);
            }} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Indexes Dialog */}
      <Dialog open={showViewIndexesDialog} onOpenChange={setShowViewIndexesDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className='text-grey'>Table Indexes</DialogTitle>
            <DialogDescription>
              View all indexes for the {selectedTable?.name} {isNoSQL ? 'collection' : 'table'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {(() => {
              // Dummy index data - in a real app, this would come from the database schema
              const dummyIndexes = [
                {
                  name: 'idx_primary',
                  columns: ['id'],
                  type: 'PRIMARY',
                  unique: true,
                  method: 'BTREE'
                },
                ...(selectedTable?.name === 'users' ? [
                  {
                    name: 'idx_email_unique',
                    columns: ['email'],
                    type: 'UNIQUE',
                    unique: true,
                    method: 'BTREE'
                  },
                  {
                    name: 'idx_created_at',
                    columns: ['created_at'],
                    type: 'INDEX',
                    unique: false,
                    method: 'BTREE'
                  }
                ] : []),
                ...(selectedTable?.name === 'products' ? [
                  {
                    name: 'idx_category_price',
                    columns: ['category', 'price'],
                    type: 'INDEX',
                    unique: false,
                    method: 'BTREE'
                  },
                  {
                    name: 'idx_sku_unique',
                    columns: ['sku'],
                    type: 'UNIQUE',
                    unique: true,
                    method: 'BTREE'
                  }
                ] : []),
                ...(selectedTable?.name === 'orders' ? [
                  {
                    name: 'idx_user_id',
                    columns: ['user_id'],
                    type: 'INDEX',
                    unique: false,
                    method: 'BTREE'
                  },
                  {
                    name: 'idx_order_date',
                    columns: ['order_date'],
                    type: 'INDEX',
                    unique: false,
                    method: 'BTREE'
                  }
                ] : [])
              ];

              return dummyIndexes.length > 0 ? (
                <div className="space-y-3">
                  {dummyIndexes.map((index, idx) => (
                    <div key={idx} className="border border-grey-300 rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-grey">{index.name}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                              index.type === 'PRIMARY' ? 'bg-blue-100 text-blue-700' :
                              index.type === 'UNIQUE' ? 'bg-purple-100 text-purple-700' :
                              'bg-grey-100 text-grey-700'
                            }`}>
                              {index.type}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-grey-600">
                              <span className="font-medium">Columns:</span>
                              <span className="font-mono">{index.columns.join(', ')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-grey-600">
                              <span className="font-medium">Method:</span>
                              <span>{index.method}</span>
                            </div>
                            {index.unique && (
                              <div className="flex items-center gap-1 text-xs text-grey-600">
                                <Check className="h-3 w-3 text-green-600" />
                                <span>Unique Constraint</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {index.type !== 'PRIMARY' && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              title="Edit Index"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              title="Drop Index"
                              onClick={() => toast.success(`Index "${index.name}" dropped successfully`)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-grey-300 rounded-lg">
                  <Database className="h-12 w-12 text-grey-400 mx-auto mb-3" />
                  <p className="text-sm text-grey-600 mb-2">No indexes found</p>
                  <p className="text-xs text-grey-500">Create an index to improve query performance</p>
                </div>
              );
            })()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewIndexesDialog(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setShowViewIndexesDialog(false);
              setShowCreateIndexDialog(true);
            }} className="gap-2">
              <Plus className="h-4 w-4" />
              Create New Index
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Code Sidebar */}
      {showCodeSidebar && selectedTable && (
        <CodeSidebar
          title={`Database Operations - ${selectedTable.name}`}
          subtitle={`Code examples for ${selectedTable.name} table operations`}
          tag={selectedTable.name}
          onClose={() => setShowCodeSidebar(false)}
          generateCodeSections={generateCodeSections}
          environments={[{ slug: 'prd', env_name: 'Production' }, { slug: 'dev', env_name: 'Development' }]}
          additionalControlsAfterSection="Transactions (Optional)"
          additionalControls={
            <div>
              <Label className="text-sm font-semibold text-grey-700 mb-2 block">
                Operation Type
              </Label>
              <Select value={selectedOperation} onValueChange={(value: any) => setSelectedOperation(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="query">Query / Read</SelectItem>
                  <SelectItem value="insert">Insert / Create</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="upsert">Upsert</SelectItem>
                  <SelectItem value="count">Count</SelectItem>
                  <SelectItem value="sum">Sum</SelectItem>
                  <SelectItem value="avg">Average</SelectItem>
                  <SelectItem value="min">Minimum</SelectItem>
                  <SelectItem value="max">Maximum</SelectItem>
                  <SelectItem value="aggregate">Aggregate (Multiple)</SelectItem>
                  <SelectItem value="aggregate-conditional">Aggregate (Conditional)</SelectItem>
                  <SelectItem value="groupBy">Group By</SelectItem>
                  <SelectItem value="raw">Raw SQL</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
        />
      )}
    </div>
  );
}
