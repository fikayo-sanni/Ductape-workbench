import React, { useState, useEffect, useMemo } from 'react';
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
  Save,
  Settings2,
  Bookmark,
  Loader2,
  Tag,
  PanelLeft,
  PanelLeftClose,
  FileText,
  Hash,
  BarChart3,
  Network,
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
import { ActivityTimelinePanel } from '@/components/activity/ActivityTimelinePanel';
import toast from 'react-hot-toast';
import CodeSidebar from '@/components/CodeSidebar';
import { useWorkbenchStore } from '@/stores/workbench-store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDuctapeDatabase } from '@/hooks/useDuctapeDatabase';
import { useAuth } from '@/store/useAuth';
import logsServices, { DatabaseDashboardMetrics } from '@/services/logsServices';
import payloadGenerationService from '@/services/payloadGenerationService';

// Column type definitions
type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'json';

interface TableColumn {
  name: string;
  type: ColumnType;
  nullable?: boolean;
}

interface TableDefinition {
  name: string;
  type: 'table' | 'collection';
  rowCount?: number;
  documentCount?: number;
  columns: TableColumn[];
}

// Operators by column type
const OPERATORS_BY_TYPE: Record<ColumnType, { value: string; label: string }[]> = {
  string: [
    { value: '=', label: '=' },
    { value: '!=', label: '!=' },
    { value: 'LIKE', label: 'LIKE' },
    { value: 'ILIKE', label: 'ILIKE' },
    { value: 'STARTS_WITH', label: 'Starts with' },
    { value: 'ENDS_WITH', label: 'Ends with' },
    { value: 'CONTAINS', label: 'Contains' },
    { value: 'IS NULL', label: 'Is null' },
    { value: 'IS NOT NULL', label: 'Is not null' },
  ],
  number: [
    { value: '=', label: '=' },
    { value: '!=', label: '!=' },
    { value: '>', label: '>' },
    { value: '<', label: '<' },
    { value: '>=', label: '>=' },
    { value: '<=', label: '<=' },
    { value: 'BETWEEN', label: 'Between' },
    { value: 'IS NULL', label: 'Is null' },
    { value: 'IS NOT NULL', label: 'Is not null' },
  ],
  boolean: [
    { value: '=', label: '=' },
    { value: '!=', label: '!=' },
    { value: 'IS NULL', label: 'Is null' },
    { value: 'IS NOT NULL', label: 'Is not null' },
  ],
  date: [
    { value: '=', label: '=' },
    { value: '!=', label: '!=' },
    { value: '>', label: 'After' },
    { value: '<', label: 'Before' },
    { value: '>=', label: 'On or after' },
    { value: '<=', label: 'On or before' },
    { value: 'BETWEEN', label: 'Between' },
    { value: 'IS NULL', label: 'Is null' },
    { value: 'IS NOT NULL', label: 'Is not null' },
  ],
  datetime: [
    { value: '=', label: '=' },
    { value: '!=', label: '!=' },
    { value: '>', label: 'After' },
    { value: '<', label: 'Before' },
    { value: '>=', label: 'On or after' },
    { value: '<=', label: 'On or before' },
    { value: 'BETWEEN', label: 'Between' },
    { value: 'IS NULL', label: 'Is null' },
    { value: 'IS NOT NULL', label: 'Is not null' },
  ],
  json: [
    { value: '=', label: '=' },
    { value: '!=', label: '!=' },
    { value: 'IS NULL', label: 'Is null' },
    { value: 'IS NOT NULL', label: 'Is not null' },
  ],
};

// Empty arrays for when SDK data is not available
const EMPTY_TABLES: TableDefinition[] = [];

const EMPTY_MIGRATIONS: any[] = [];
const EMPTY_ACTIONS: IDatabaseAction[] = [];

// Fields that should never be included in update payloads or editable in forms
const IMMUTABLE_FIELDS = ['_id', 'id'];

// Database operation types based on SDK
type DatabaseOperation =
  | 'query' | 'insert' | 'update' | 'delete' | 'upsert'
  | 'count' | 'sum' | 'avg' | 'min' | 'max'
  | 'groupBy' | 'aggregate' | 'raw';

// Database Action interface
interface IDatabaseAction {
  id: string;
  tag: string;
  name: string;
  description?: string;
  operation: DatabaseOperation;
  query: Record<string, any>;
  parameters: Array<{
    name: string;
    path: string;
    defaultValue: any;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  }>;
  createdAt: string;
}

// Helper function to generate tag from name
const generateActionTag = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Database operations configuration for query builder
const DATABASE_OPERATIONS: Record<DatabaseOperation, {
  label: string;
  description: string;
  color: string;
  fields: string[];
}> = {
  query: { label: 'Query', description: 'Select rows from a table', color: 'bg-blue/10 text-blue', fields: ['table', 'columns', 'where', 'orderBy', 'limit', 'offset'] },
  insert: { label: 'Insert', description: 'Add new rows to a table', color: 'bg-green/10 text-green', fields: ['table', 'data', 'returning'] },
  update: { label: 'Update', description: 'Modify existing rows', color: 'bg-yellow/10 text-yellow-600', fields: ['table', 'data', 'where', 'returning'] },
  delete: { label: 'Delete', description: 'Remove rows from a table', color: 'bg-red/10 text-red', fields: ['table', 'where', 'returning'] },
  upsert: { label: 'Upsert', description: 'Insert or update on conflict', color: 'bg-purple-500/10 text-purple-500', fields: ['table', 'data', 'conflictColumn', 'returning'] },
  count: { label: 'Count', description: 'Count matching rows', color: 'bg-grey-400/10 text-grey', fields: ['table', 'where'] },
  sum: { label: 'Sum', description: 'Sum a numeric column', color: 'bg-orange-500/10 text-orange-500', fields: ['table', 'column', 'where'] },
  avg: { label: 'Average', description: 'Average of a numeric column', color: 'bg-cyan-500/10 text-cyan-500', fields: ['table', 'column', 'where'] },
  min: { label: 'Minimum', description: 'Minimum value in a column', color: 'bg-teal-500/10 text-teal-500', fields: ['table', 'column', 'where'] },
  max: { label: 'Maximum', description: 'Maximum value in a column', color: 'bg-pink-500/10 text-pink-500', fields: ['table', 'column', 'where'] },
  groupBy: { label: 'Group By', description: 'Group rows by column(s)', color: 'bg-indigo-500/10 text-indigo-500', fields: ['table', 'groupColumns', 'aggregations', 'where', 'having'] },
  aggregate: { label: 'Aggregate', description: 'Complex aggregation query', color: 'bg-violet-500/10 text-violet-500', fields: ['table', 'aggregations', 'where', 'groupBy'] },
  raw: { label: 'Raw SQL', description: 'Execute raw SQL query', color: 'bg-grey-400/10 text-grey', fields: ['sql', 'params'] },
};


type SidebarView = 'tables' | 'migrations' | 'actions';

interface DatabaseExplorerTabProps {
  database: {
    name: string;
    tag: string;
    type?: string;
    productTag?: string;
    productName?: string;
    productEnvironments?: Array<{ slug: string }>;
    env: {
      slug: string;
      connection_url?: string; // Optional - not used directly, SDK resolves connection via product/database/env
    };
  };
}

export default function DatabaseExplorerTab({ database }: DatabaseExplorerTabProps) {
  const { setSidebarCollapsed } = useWorkbenchStore();
  const { user, currentWorkspaceId } = useAuth();
  const queryClient = useQueryClient();

  // Guard: Show error if critical database data is missing (e.g., tab restored with incomplete data)
  if (!database?.name || !database?.tag || !database?.env?.slug) {
    return (
      <div className="h-full flex items-center justify-center bg-grey-100">
        <div className="text-center">
          <Database className="h-12 w-12 text-grey-400 mx-auto mb-3" />
          <p className="text-grey-600 mb-2">Incomplete database data</p>
          <p className="text-grey-500 text-sm mb-4">
            This tab was restored from an older session with incomplete data.
          </p>
          <p className="text-grey-500 text-sm">
            Please close this tab and reopen the database from your product to reload it.
          </p>
        </div>
      </div>
    );
  }

  // Initialize SDK Database Service
  const dbConfig = {
    workspace_id: currentWorkspaceId || '',
    user_id: user?._id || '',
    token: user?.auth_token || '',
    public_key: user?.public_key || '',
  };

  // Debug: Log config to identify missing values
  console.log('[DB-Explorer] Database service config:', {
    workspace_id: !!dbConfig.workspace_id,
    user_id: !!dbConfig.user_id,
    token: !!dbConfig.token,
    public_key: !!dbConfig.public_key,
    productTag: database.productTag,
  });

  const databaseService = useDuctapeDatabase(dbConfig);

  console.log('[DB-Explorer] databaseService initialized:', !!databaseService);

  // Collapse workbench sidebar when DatabaseExplorer opens
  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  const isNoSQL = database.type?.toLowerCase().includes('mongo') ||
    database.type?.toLowerCase().includes('redis') ||
    database.type?.toLowerCase().includes('cassandra');

  // Establish database connection first before any queries
  const { data: connectionResult, isLoading: isConnecting, error: connectionError, isSuccess: isConnected } = useQuery({
    queryKey: ['database-connection', database.productTag, database.tag, database.env.slug],
    queryFn: async () => {
      if (!databaseService || !database.productTag) {
        throw new Error('Database service not available');
      }
      // Connect to the database
      const result = await databaseService.connect({
        env: database.env.slug,
        product: database.productTag,
        database: database.tag,
      });
      return result;
    },
    enabled: !!databaseService && !!database.productTag,
    staleTime: 30 * 1000, // Reduce stale time to 30 seconds to ensure fresh connections
    refetchOnMount: 'always', // Always re-establish connection when component mounts
    retry: 2, // Retry failed connections
  });

  // Use SDK to fetch tables/collections (only after connection is established)
  const { data: sdkTables, isLoading: isLoadingTables } = useQuery({
    queryKey: ['database-tables', database.productTag, database.tag, database.env.slug],
    queryFn: async () => {
      if (!databaseService || !database.productTag) {
        return null;
      }
      try {
        // Use SDK listTablesWithInfo to get tables with row counts
        const result = await databaseService.listTablesWithInfo({
          product: database.productTag,
          database: database.tag,
          env: database.env.slug,
        });

        console.log('[DB-Explorer] Raw tables result:', result);

        // Transform ITableInfo array to TableDefinition objects
        if (Array.isArray(result)) {
          const tableDefinitions: TableDefinition[] = result.map((tableInfo: any) => {
            // If it's already a TableDefinition object, return as-is
            if (typeof tableInfo === 'object' && tableInfo !== null && 'name' in tableInfo) {
              return {
                name: tableInfo.name,
                type: isNoSQL ? 'collection' : 'table',
                columns: [], // Columns will be fetched when table is selected
                rowCount: tableInfo.estimatedRowCount,
                documentCount: isNoSQL ? tableInfo.estimatedRowCount : undefined,
              } as TableDefinition;
            }
            // Fallback for string names
            return {
              name: String(tableInfo),
              type: isNoSQL ? 'collection' : 'table',
              columns: [],
            } as TableDefinition;
          });
          console.log('[DB-Explorer] Transformed tables:', tableDefinitions);
          return tableDefinitions;
        }

        return result;
      } catch (error) {
        console.error('Error fetching tables:', error);
        return null;
      }
    },
    enabled: !!databaseService && !!database.productTag && isConnected,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Use SDK tables or empty array if not available
  // Filter out internal Ductape system tables from the main tables list
  const DUCTAPE_SYSTEM_TABLES = ['_ductape_migrations', '_ductape_schema', '_ductape_counters'];
  const allTables = sdkTables || EMPTY_TABLES;
  const tables = allTables.filter(t => !DUCTAPE_SYSTEM_TABLES.includes(t.name));

  // Track selected table for schema fetching
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);

  // Fetch table schema/description when a table is selected
  const { data: tableSchema } = useQuery({
    queryKey: ['table-schema', database.productTag, database.tag, database.env.slug, selectedTableName],
    queryFn: async () => {
      if (!databaseService || !database.productTag || !selectedTableName) {
        return null;
      }
      try {
        // Use schema.describe to get column information
        const result = await databaseService.schema.describe(selectedTableName);
        console.log('[DB-Explorer] Table schema:', result);
        return result;
      } catch (error) {
        console.error('Error fetching table schema:', error);
        return null;
      }
    },
    enabled: !!databaseService && !!database.productTag && !!selectedTableName && isConnected,
    staleTime: 60000, // Cache schema for 1 minute
  });

  // Fetch table schema for Query Builder when a table is selected there
  const [queryBuilderTableName, setQueryBuilderTableName] = useState<string | null>(null);

  const { data: queryBuilderTableSchema } = useQuery({
    queryKey: ['query-builder-table-schema', database.productTag, database.tag, database.env.slug, queryBuilderTableName],
    queryFn: async () => {
      if (!databaseService || !database.productTag || !queryBuilderTableName) {
        return null;
      }
      try {
        const result = await databaseService.schema.describe(queryBuilderTableName);
        console.log('[DB-Explorer] Query Builder table schema:', result);
        return result;
      } catch (error) {
        console.error('Error fetching query builder table schema:', error);
        return null;
      }
    },
    enabled: !!databaseService && !!database.productTag && !!queryBuilderTableName && isConnected,
    staleTime: 60000, // Cache schema for 1 minute
  });

  // Compute columns for the query builder table from its schema
  const queryBuilderTableColumns = useMemo(() => {
    if (!queryBuilderTableSchema) return [];

    // Handle ITableSchema format with columns array
    if (queryBuilderTableSchema.columns && Array.isArray(queryBuilderTableSchema.columns)) {
      return queryBuilderTableSchema.columns.map((col: any) => ({
        name: col.name || col.column_name || '',
        type: col.type || col.data_type || 'string',
        nullable: col.nullable ?? col.is_nullable ?? true,
      })).filter((col: any) => col.name);
    }

    return [];
  }, [queryBuilderTableSchema]);

  // Persistent state key
  const stateKey = `db-explorer-state-${database.tag}-${database.env.slug}`;

  // Load persisted state from localStorage
  const getPersistedState = () => {
    try {
      const saved = localStorage.getItem(stateKey);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const persistedState = getPersistedState();

  // Initialize state from persisted values
  const [sidebarView, setSidebarView] = useState<SidebarView>(
    persistedState?.sidebarView || 'tables'
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    persistedState?.isSidebarCollapsed || false
  );
  const [sidebarWidth, setSidebarWidth] = useState<number>(
    persistedState?.sidebarWidth || 256
  );
  const [selectedTable, setSelectedTableInternal] = useState<typeof tables[0] | null>(() => {
    if (persistedState?.selectedTableName) {
      return tables.find(t => t.name === persistedState.selectedTableName) || null;
    }
    return null;
  });

  // Wrapper to update both selectedTable and selectedTableName for schema fetching
  const setSelectedTable = (table: typeof tables[0] | null) => {
    setSelectedTableInternal(table);
    setSelectedTableName(table?.name || null);
  };

  // Sync selectedTableName with initial persisted selectedTable
  useEffect(() => {
    if (selectedTable && !selectedTableName) {
      setSelectedTableName(selectedTable.name);
    }
  }, [selectedTable, selectedTableName]);

  // Reset current page to 1 when switching tables
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedTable?.name]);

  const [selectedMigration, setSelectedMigration] = useState<any | null>(null);
  const [selectedAction, setSelectedAction] = useState<IDatabaseAction | null>(null);
  const [savedActions, setSavedActions] = useState<IDatabaseAction[]>(EMPTY_ACTIONS);
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
  const [showAddColumnsDialog, setShowAddColumnsDialog] = useState(false);
  const [showEditColumnsDialog, setShowEditColumnsDialog] = useState(false);
  const [showDeleteColumnsDialog, setShowDeleteColumnsDialog] = useState(false);
  const [showCreateIndexDialog, setShowCreateIndexDialog] = useState(false);
  const [showViewIndexesDialog, setShowViewIndexesDialog] = useState(false);
  const [showExportDataDialog, setShowExportDataDialog] = useState(false);
  const [showCodeSidebar, setShowCodeSidebar] = useState(false);
  const [generatedPayloadsByEnvOperation, setGeneratedPayloadsByEnvOperation] = useState<
    Record<string, Record<string, Record<string, unknown>>>
  >({});

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
  const [actionDescription, setActionDescription] = useState('');

  // Query Builder state - initialized from persisted state
  const [showQueryBuilder, setShowQueryBuilder] = useState(persistedState?.showQueryBuilder || false);
  const [queryBuilderOperation, setQueryBuilderOperation] = useState<DatabaseOperation>(persistedState?.queryBuilderOperation || 'query');
  const [queryBuilderTableInternal, setQueryBuilderTableInternal] = useState(persistedState?.queryBuilderTable || '');

  // Wrapper to update both queryBuilderTable and queryBuilderTableName for schema fetching
  const queryBuilderTable = queryBuilderTableInternal;
  const setQueryBuilderTable = (tableName: string) => {
    setQueryBuilderTableInternal(tableName);
    setQueryBuilderTableName(tableName || null);
  };

  // Sync queryBuilderTableName with initial persisted queryBuilderTable
  useEffect(() => {
    if (queryBuilderTable && !queryBuilderTableName) {
      setQueryBuilderTableName(queryBuilderTable);
    }
  }, [queryBuilderTable, queryBuilderTableName]);

  const [queryBuilderColumns, setQueryBuilderColumns] = useState<string[]>(persistedState?.queryBuilderColumns || []);
  const [queryBuilderWhere, setQueryBuilderWhere] = useState<Array<{ column: string; operator: string; value: string }>>(persistedState?.queryBuilderWhere || []);
  const [queryBuilderOrderBy, setQueryBuilderOrderBy] = useState<{ column: string; direction: 'ASC' | 'DESC' } | null>(persistedState?.queryBuilderOrderBy || null);
  const [queryBuilderLimit, setQueryBuilderLimit] = useState(persistedState?.queryBuilderLimit || '25');
  const [queryBuilderOffset, setQueryBuilderOffset] = useState(persistedState?.queryBuilderOffset || '0');
  const [queryBuilderData, setQueryBuilderData] = useState<Array<{ column: string; value: string }>>(persistedState?.queryBuilderData || []);
  const [queryBuilderAggColumn, setQueryBuilderAggColumn] = useState(persistedState?.queryBuilderAggColumn || '');
  const [queryBuilderRawSql, setQueryBuilderRawSql] = useState(persistedState?.queryBuilderRawSql || '');
  const [queryBuilderReturning, setQueryBuilderReturning] = useState<string[]>(persistedState?.queryBuilderReturning || []);

  // Generated query preview
  const [generatedQuery, setGeneratedQuery] = useState<Record<string, any> | null>(persistedState?.generatedQuery || null);
  const [queryTestResult, setQueryTestResult] = useState<any>(persistedState?.queryTestResult || null);

  // Persist state to localStorage whenever relevant state changes
  useEffect(() => {
    const stateToSave = {
      sidebarView,
      isSidebarCollapsed,
      sidebarWidth,
      selectedTableName: selectedTable?.name,
      selectedMigrationId: selectedMigration?.id,
      selectedActionTag: selectedAction?.tag,
      showQueryBuilder,
      queryBuilderOperation,
      queryBuilderTable,
      queryBuilderColumns,
      queryBuilderWhere,
      queryBuilderOrderBy,
      queryBuilderLimit,
      queryBuilderOffset,
      queryBuilderData,
      queryBuilderAggColumn,
      queryBuilderRawSql,
      queryBuilderReturning,
      generatedQuery,
      queryTestResult,
    };
    localStorage.setItem(stateKey, JSON.stringify(stateToSave));
  }, [
    stateKey,
    sidebarView,
    isSidebarCollapsed,
    sidebarWidth,
    selectedTable,
    selectedMigration,
    selectedAction,
    showQueryBuilder,
    queryBuilderOperation,
    queryBuilderTable,
    queryBuilderColumns,
    queryBuilderWhere,
    queryBuilderOrderBy,
    queryBuilderLimit,
    queryBuilderOffset,
    queryBuilderData,
    queryBuilderAggColumn,
    queryBuilderRawSql,
    queryBuilderReturning,
    generatedQuery,
    queryTestResult,
  ]);
  const [isTestingQuery, setIsTestingQuery] = useState(false);

  // CodeSidebar state for actions
  const [showActionCodeSidebar, setShowActionCodeSidebar] = useState(false);

  // Save action modal state
  const [showSaveActionModal, setShowSaveActionModal] = useState(false);
  const [showExecuteActionModal, setShowExecuteActionModal] = useState(false);
  const [extractedValues, setExtractedValues] = useState<Array<{
    path: string;
    value: any;
    type: string;
    selected: boolean;
    paramName: string;
  }>>([]);
  const [actionParamValues, setActionParamValues] = useState<Record<string, any>>({});

  // Code generator state
  const [selectedOperation, setSelectedOperation] = useState<
    'query' | 'insert' | 'update' | 'delete' | 'upsert' | 'count' | 'sum' | 'avg' | 'min' | 'max' | 'aggregate' | 'aggregate-conditional' | 'groupBy' | 'raw'
  >('query');

  // Serialize queryConditions for use in query key (ensures refetch on filter change)
  const queryConditionsKey = JSON.stringify(queryConditions);

  // SDK Query for fetching table data
  const { data: sdkTableData, isLoading: isLoadingTableData, refetch: refetchTableData } = useQuery({
    queryKey: ['table-data', database.productTag, database.tag, database.env.slug, selectedTable?.name, currentPage, pageSize, queryConditionsKey],
    queryFn: async () => {
      if (!databaseService || !database.productTag || !selectedTable) {
        return null;
      }
      try {
        // Build where clause from query conditions
        const where: Record<string, any> = {};
        queryConditions.forEach(condition => {
          if (condition.field && condition.operator && condition.value !== '') {
            // Map UI operators to SDK operators
            const operatorMap: Record<string, string> = {
              '=': '$EQ',
              '!=': '$NE',
              '>': '$GT',
              '<': '$LT',
              '>=': '$GTE',
              '<=': '$LTE',
              'LIKE': '$LIKE',
              'ILIKE': '$ILIKE',
              'CONTAINS': '$LIKE',
              'STARTS_WITH': '$LIKE',
              'ENDS_WITH': '$LIKE',
              'IS NULL': '$IS_NULL',
              'IS NOT NULL': '$IS_NOT_NULL',
              'BETWEEN': '$BETWEEN',
              'IN': '$IN',
              'NOT IN': '$NOT_IN',
              // UI uses lowercase with underscores
              'equals': '$EQ',
              'not_equals': '$NE',
              'greater_than': '$GT',
              'less_than': '$LT',
              'greater_than_or_equal': '$GTE',
              'less_than_or_equal': '$LTE',
              'contains': '$LIKE',
              'starts_with': '$LIKE',
              'ends_with': '$LIKE',
              'is_null': '$IS_NULL',
              'is_not_null': '$IS_NOT_NULL',
              'between': '$BETWEEN',
              'in': '$IN',
              'not_in': '$NOT_IN',
            };

            let value: any = condition.value;

            // Handle LIKE patterns (check both uppercase and lowercase variants)
            const op = condition.operator;
            if (op === 'CONTAINS' || op === 'contains') {
              value = `%${condition.value}%`;
            } else if (op === 'STARTS_WITH' || op === 'starts_with') {
              value = `${condition.value}%`;
            } else if (op === 'ENDS_WITH' || op === 'ends_with') {
              value = `%${condition.value}`;
            } else if (op === 'BETWEEN' || op === 'between') {
              // BETWEEN expects an array of two values: [min, max]
              const parts = condition.value.split(',').map((v: string) => v.trim());
              if (parts.length === 2) {
                value = parts;
              }
            } else if (op === 'IN' || op === 'in' || op === 'NOT IN' || op === 'not_in') {
              // IN/NOT IN expects an array of values
              value = condition.value.split(',').map((v: string) => v.trim());
            } else if (op === 'IS NULL' || op === 'is_null' || op === 'IS NOT NULL' || op === 'is_not_null') {
              // NULL checks don't need a value
              value = true;
            }

            // Convert value to appropriate type based on column type
            const columnType = getColumnType(condition.field);
            const isNumericType = ['number', 'integer', 'int', 'bigint', 'smallint', 'decimal', 'numeric', 'float', 'double', 'real'].includes(columnType.toLowerCase());
            const isBooleanType = ['boolean', 'bool'].includes(columnType.toLowerCase());

            if (op !== 'IS NULL' && op !== 'is_null' && op !== 'IS NOT NULL' && op !== 'is_not_null') {
              if (isNumericType) {
                // Convert to number for numeric columns
                if (op === 'BETWEEN' || op === 'between') {
                  value = value.map((v: string) => parseFloat(v));
                } else if (op === 'IN' || op === 'in' || op === 'NOT IN' || op === 'not_in') {
                  value = value.map((v: string) => parseFloat(v));
                } else {
                  value = parseFloat(value);
                }
              } else if (isBooleanType && typeof value === 'string') {
                // Convert to boolean for boolean columns
                value = value.toLowerCase() === 'true';
              }
            }

            const sdkOperator = operatorMap[condition.operator] || '$EQ';
            where[condition.field] = { [sdkOperator]: value };
          }
        });

        const result = await databaseService.query({
          product: database.productTag,
          database: database.tag,
          env: database.env.slug,
          table: selectedTable.name,
          where: Object.keys(where).length > 0 ? where : undefined,
          limit: pageSize,
          offset: (currentPage - 1) * pageSize,
        });

        return result?.data || [];
      } catch (error) {
        console.error('Error fetching table data:', error);
        return null;
      }
    },
    enabled: !!databaseService && !!database.productTag && !!selectedTable,
    staleTime: 10000, // Cache for 10 seconds
  });

  // Get current table data from SDK
  const getCurrentTableData = () => {
    if (!selectedTable) return [];
    return sdkTableData || [];
  };

  const rawTableData = getCurrentTableData();

  // Apply search filter and query conditions to table data
  // Note: When SDK is available, filtering is done server-side, so we only apply client-side
  // filtering for the search box
  const tableData = rawTableData.filter(row => {
    // Apply search filter (always client-side for quick search)
    if (filterSearch) {
      const matchesSearch = Object.values(row).some(value =>
        String(value || '').toLowerCase().includes(filterSearch.toLowerCase())
      );
      if (!matchesSearch) return false;
    }

    // Apply query conditions client-side when SDK is not available
    if (!sdkTableData && queryConditions.length > 0) {
      return queryConditions.every(condition => {
        if (!condition.field || !condition.operator) return true;
        // For NULL operators, we don't need a value
        if (condition.operator !== 'IS NULL' && condition.operator !== 'IS NOT NULL' && condition.value === '') return true;

        const rawValue = row[condition.field];
        const cellValue = String(rawValue || '').toLowerCase();
        const conditionValue = condition.value.toLowerCase();

        switch (condition.operator) {
          case '=':
          case 'equals':
            return cellValue === conditionValue;
          case '!=':
            return cellValue !== conditionValue;
          case 'LIKE':
          case 'ILIKE':
          case 'CONTAINS':
          case 'contains':
            return cellValue.includes(conditionValue);
          case 'STARTS_WITH':
          case 'starts_with':
            return cellValue.startsWith(conditionValue);
          case 'ENDS_WITH':
          case 'ends_with':
            return cellValue.endsWith(conditionValue);
          case '>':
          case 'greater_than':
            return parseFloat(cellValue) > parseFloat(conditionValue);
          case '<':
          case 'less_than':
            return parseFloat(cellValue) < parseFloat(conditionValue);
          case '>=':
            return parseFloat(cellValue) >= parseFloat(conditionValue);
          case '<=':
            return parseFloat(cellValue) <= parseFloat(conditionValue);
          case 'IS NULL':
            return rawValue === null || rawValue === undefined || rawValue === '';
          case 'IS NOT NULL':
            return rawValue !== null && rawValue !== undefined && rawValue !== '';
          case 'BETWEEN': {
            const parts = condition.value.split(',').map((v: string) => parseFloat(v.trim()));
            if (parts.length === 2) {
              const numValue = parseFloat(cellValue);
              return numValue >= parts[0] && numValue <= parts[1];
            }
            return true;
          }
          case 'IN': {
            const values = condition.value.split(',').map((v: string) => v.trim().toLowerCase());
            return values.includes(cellValue);
          }
          case 'NOT IN': {
            const values = condition.value.split(',').map((v: string) => v.trim().toLowerCase());
            return !values.includes(cellValue);
          }
          default:
            return true;
        }
      });
    }

    return true;
  });

  // Get columns from table data, table schema, or selectedTable definition
  const getColumnsFromSchema = () => {
    console.log('[DB-Explorer] getColumnsFromSchema called:', {
      rawTableDataLength: rawTableData.length,
      tableSchema,
      selectedTableColumns: selectedTable?.columns,
    });

    // First try: columns from existing data
    if (rawTableData.length > 0) {
      const cols = Object.keys(rawTableData[0]);
      console.log('[DB-Explorer] Columns from rawTableData:', cols);
      return cols;
    }
    // Second try: columns from schema.describe result (ITableSchema format)
    if (tableSchema && typeof tableSchema === 'object') {
      // ITableSchema has a 'columns' property which is an array of IColumnInfo
      if (tableSchema.columns && Array.isArray(tableSchema.columns)) {
        const cols = tableSchema.columns.map((col: any) => col.name || col.column_name || col).filter(Boolean);
        console.log('[DB-Explorer] Columns from tableSchema.columns:', cols);
        return cols;
      }
      // Fallback: if tableSchema is directly an array of column definitions
      if (Array.isArray(tableSchema)) {
        const cols = tableSchema.map((col: any) => col.name || col.column_name || col).filter(Boolean);
        console.log('[DB-Explorer] Columns from tableSchema (array):', cols);
        return cols;
      }
      // Check for _ductape_schemas format or other schema formats
      console.log('[DB-Explorer] tableSchema keys:', Object.keys(tableSchema));
    }
    // Third try: columns from selectedTable definition
    if (selectedTable?.columns?.length) {
      const cols = selectedTable.columns.map(c => c.name);
      console.log('[DB-Explorer] Columns from selectedTable:', cols);
      return cols;
    }
    console.log('[DB-Explorer] No columns found, returning empty array');
    return [];
  };
  const allColumns = getColumnsFromSchema();
  const columns = selectedFields.length > 0 ? selectedFields : allColumns;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Refetch data from SDK if available
      if (databaseService && database.productTag && selectedTable) {
        await refetchTableData();
      } else {
        // Fallback delay for demo mode
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      toast.success('Data refreshed');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSidebarRefresh = async () => {
    setIsSidebarRefreshing(true);
    try {
      // Refetch tables list from SDK if available
      if (databaseService && database.productTag) {
        await queryClient.invalidateQueries({
          queryKey: ['database-tables', database.productTag, database.tag, database.env.slug]
        });
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      toast.success(`${sidebarView.charAt(0).toUpperCase() + sidebarView.slice(1)} list refreshed`);
    } catch (error) {
      console.error('Error refreshing sidebar:', error);
      toast.error('Failed to refresh');
    } finally {
      setIsSidebarRefreshing(false);
    }
  };

  // SDK Mutation for inserting data
  const insertMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      if (!databaseService || !database.productTag || !selectedTable) {
        throw new Error('SDK not available');
      }
      return databaseService.insert({
        product: database.productTag,
        database: database.tag,
        env: database.env.slug,
        table: selectedTable.name,
        data: [data],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['table-data', database.productTag, database.tag, database.env.slug, selectedTable?.name]
      });
      toast.success(`New record inserted into ${selectedTable?.name}`);
      setShowInsertDialog(false);
      setFormData({});
      setJsonValidationErrors({});
    },
    onError: (error) => {
      console.error('Insert error:', error);
      toast.error('Failed to insert record');
    },
  });

  // SDK Mutation for updating data
  const updateMutation = useMutation({
    mutationFn: async ({ data, where, originalData }: { data: Record<string, any>; where: Record<string, any>; originalData?: Record<string, any> }) => {
      if (!databaseService || !database.productTag || !selectedTable) {
        throw new Error('SDK not available');
      }

      // Filter out immutable fields and only include changed fields
      const filteredData: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        // Skip immutable fields
        if (IMMUTABLE_FIELDS.includes(key.toLowerCase())) {
          continue;
        }
        // Only include fields that have changed (if originalData provided)
        if (originalData) {
          const originalValue = originalData[key];
          // Deep comparison for objects/arrays, simple comparison for primitives
          const hasChanged = JSON.stringify(value) !== JSON.stringify(originalValue);
          if (!hasChanged) {
            continue;
          }
        }
        filteredData[key] = value;
      }

      // If no fields changed, don't make the request
      if (Object.keys(filteredData).length === 0) {
        return { count: 0, data: [] };
      }

      return databaseService.updateRecords({
        product: database.productTag,
        database: database.tag,
        env: database.env.slug,
        table: selectedTable.name,
        data: filteredData,
        where,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['table-data', database.productTag, database.tag, database.env.slug, selectedTable?.name]
      });
      toast.success(`Record updated in ${selectedTable?.name}`);
      setShowEditDialog(false);
      setFormData({});
      setSelectedRow(null);
      setJsonValidationErrors({});
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast.error('Failed to update record');
    },
  });

  // SDK Mutation for deleting data
  const deleteMutation = useMutation({
    mutationFn: async (where: Record<string, any>) => {
      if (!databaseService || !database.productTag || !selectedTable) {
        throw new Error('SDK not available');
      }
      return databaseService.delete({
        product: database.productTag,
        database: database.tag,
        env: database.env.slug,
        table: selectedTable.name,
        where,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['table-data', database.productTag, database.tag, database.env.slug, selectedTable?.name]
      });
      toast.success(`Record deleted from ${selectedTable?.name}`);
      setShowDeleteDialog(false);
      setSelectedRow(null);
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast.error('Failed to delete record');
    },
  });

  // ==================== TABLE SCHEMA MUTATIONS ====================

  // SDK Mutation for creating a table
  const createTableMutation = useMutation({
    mutationFn: async (tableDefinition: {
      name: string;
      columns: Array<{
        name: string;
        type: string;
        nullable?: boolean;
        primaryKey?: boolean;
        unique?: boolean;
        defaultValue?: any;
      }>;
    }) => {
      if (!databaseService || !database.productTag) {
        throw new Error('SDK not available');
      }
      return databaseService.createTable(
        {
          product: database.productTag,
          database: database.tag,
          env: database.env.slug,
        },
        {
          name: tableDefinition.name,
          columns: tableDefinition.columns.map(col => ({
            name: col.name,
            type: col.type as any,
            nullable: col.nullable ?? true,
            primaryKey: col.primaryKey ?? false,
            unique: col.unique ?? false,
            defaultValue: col.defaultValue,
          })),
        },
        { ifNotExists: true }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['database-tables', database.productTag, database.tag, database.env.slug]
      });
      toast.success(`${isNoSQL ? 'Collection' : 'Table'} created successfully`);
      setShowCreateTableDialog(false);
      setTableName('');
      setTableTag('');
      setTableDescription('');
      setTableColumns([{ name: 'id', type: 'integer', nullable: false, primaryKey: true, unique: true }]);
      setTableRelationships([]);
    },
    onError: (error) => {
      console.error('Create table error:', error);
      toast.error(`Failed to create ${isNoSQL ? 'collection' : 'table'}`);
    },
  });

  // SDK Mutation for dropping a table
  const dropTableMutation = useMutation({
    mutationFn: async (tableName: string) => {
      if (!databaseService || !database.productTag) {
        throw new Error('SDK not available');
      }
      return databaseService.dropTable(
        {
          product: database.productTag,
          database: database.tag,
          env: database.env.slug,
        },
        tableName
      );
    },
    onSuccess: (_, tableName) => {
      queryClient.invalidateQueries({
        queryKey: ['database-tables', database.productTag, database.tag, database.env.slug]
      });
      toast.success(`${isNoSQL ? 'Collection' : 'Table'} "${tableName}" dropped successfully`);
      if (selectedTable?.name === tableName) {
        setSelectedTable(null);
      }
    },
    onError: (error) => {
      console.error('Drop table error:', error);
      toast.error(`Failed to drop ${isNoSQL ? 'collection' : 'table'}`);
    },
  });

  // SDK Mutation for altering table (add columns)
  const addColumnsMutation = useMutation({
    mutationFn: async (columns: Array<{
      name: string;
      type: string;
      nullable?: boolean;
      defaultValue?: any;
    }>) => {
      if (!databaseService || !database.productTag || !selectedTable) {
        throw new Error('SDK not available');
      }
      return databaseService.alterTable(
        {
          product: database.productTag,
          database: database.tag,
          env: database.env.slug,
        },
        selectedTable.name,
        columns.map(col => ({
          type: 'ADD' as any,
          column: {
            name: col.name,
            type: col.type as any,
            nullable: col.nullable ?? true,
            defaultValue: col.defaultValue,
          },
        }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['table-schema', database.productTag, database.tag, database.env.slug, selectedTable?.name]
      });
      toast.success(`Column(s) added successfully`);
      setShowAddColumnsDialog(false);
      setShowAddColumnsConfirm(false);
      setNewColumns([]);
    },
    onError: (error) => {
      console.error('Add columns error:', error);
      toast.error('Failed to add columns');
    },
  });

  // SDK Mutation for altering table (drop columns)
  const dropColumnsMutation = useMutation({
    mutationFn: async (columnNames: string[]) => {
      if (!databaseService || !database.productTag || !selectedTable) {
        throw new Error('SDK not available');
      }
      return databaseService.alterTable(
        {
          product: database.productTag,
          database: database.tag,
          env: database.env.slug,
        },
        selectedTable.name,
        columnNames.map(colName => ({
          type: 'DROP' as any,
          columnName: colName,
        }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['table-schema', database.productTag, database.tag, database.env.slug, selectedTable?.name]
      });
      toast.success(`Column(s) deleted successfully`);
      setShowDeleteColumnsDialog(false);
      setShowDeleteColumnsConfirm(false);
      setColumnsToDelete([]);
    },
    onError: (error) => {
      console.error('Drop columns error:', error);
      toast.error('Failed to delete columns');
    },
  });

  // ==================== INDEX MUTATIONS ====================

  // SDK Mutation for creating an index
  const createIndexMutation = useMutation({
    mutationFn: async (indexDef: {
      name: string;
      columns: string[];
      unique?: boolean;
    }) => {
      if (!databaseService || !database.productTag || !selectedTable) {
        throw new Error('SDK not available');
      }
      return databaseService.createIndex({
        product: database.productTag,
        database: database.tag,
        env: database.env.slug,
        table: selectedTable.name,
        index: {
          name: indexDef.name,
          table: selectedTable.name,
          columns: indexDef.columns.map(col => ({ name: col })),
          unique: indexDef.unique ?? false,
        },
        ifNotExists: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['table-indexes', database.productTag, database.tag, database.env.slug, selectedTable?.name]
      });
      toast.success('Index created successfully');
      setShowCreateIndexDialog(false);
    },
    onError: (error) => {
      console.error('Create index error:', error);
      toast.error('Failed to create index');
    },
  });

  // SDK Mutation for dropping an index
  const dropIndexMutation = useMutation({
    mutationFn: async (indexName: string) => {
      if (!databaseService || !database.productTag || !selectedTable) {
        throw new Error('SDK not available');
      }
      return databaseService.dropIndex({
        product: database.productTag,
        database: database.tag,
        env: database.env.slug,
        table: selectedTable.name,
        indexName,
        ifExists: true,
      });
    },
    onSuccess: (_, indexName) => {
      queryClient.invalidateQueries({
        queryKey: ['table-indexes', database.productTag, database.tag, database.env.slug, selectedTable?.name]
      });
      toast.success(`Index "${indexName}" dropped successfully`);
    },
    onError: (error) => {
      console.error('Drop index error:', error);
      toast.error('Failed to drop index');
    },
  });

  // SDK Query for listing indexes
  const { data: tableIndexes, isLoading: isLoadingIndexes, refetch: refetchIndexes } = useQuery({
    queryKey: ['table-indexes', database.productTag, database.tag, database.env.slug, selectedTable?.name],
    queryFn: async () => {
      if (!databaseService || !database.productTag || !selectedTable) {
        return null;
      }
      try {
        const result = await databaseService.listIndexes({
          product: database.productTag,
          database: database.tag,
          env: database.env.slug,
          table: selectedTable.name,
        });
        return result;
      } catch (error) {
        console.error('Error fetching indexes:', error);
        return null;
      }
    },
    enabled: !!databaseService && !!database.productTag && !!selectedTable && showViewIndexesDialog,
    staleTime: 10000,
  });

  // ==================== MIGRATION MUTATIONS ====================

  // Fetch migrations from _ductape_migrations table
  const { data: sdkMigrations, isLoading: isLoadingMigrations, refetch: refetchMigrations } = useQuery({
    queryKey: ['database-migrations', database.productTag, database.tag, database.env.slug],
    queryFn: async () => {
      if (!databaseService || !database.productTag) {
        return null;
      }
      try {
        // Query the _ductape_migrations table directly to get migration history
        const query = {
          product: database.productTag,
          database: database.tag,
          env: database.env.slug,
          table: '_ductape_migrations',
          operation: 'select',
          options: {
            orderBy: { applied_at: 'desc' },
          },
        }

        const result = await databaseService.query(query);
        console.log('[DB-Explorer] Migrations from table:', result);

        // The query returns { data: [...], count: n } format
        const rows = result?.data || result?.rows || (Array.isArray(result) ? result : []);

        if (Array.isArray(rows) && rows.length > 0) {
          return rows.map((row: any) => ({
            tag: row.tag || row.migration_tag || row.name,
            name: row.name || row.migration_name || row.tag,
            status: 'completed',
            appliedAt: row.applied_at || row.appliedAt || row.created_at,
            up: row.up,
            down: row.down,
          }));
        }

        // Return empty array if result is not in expected format
        return [];
      } catch (error) {
        console.error('Error fetching migrations from table:', error);
        return [];
      }
    },
    enabled: !!databaseService && !!database.productTag && isConnected,
    staleTime: 30000,
  });

  // Migration history is now fetched directly from _ductape_migrations table above
  const migrationHistory = Array.isArray(sdkMigrations) ? sdkMigrations : [];

  // SDK Mutation for running a migration
  const runMigrationMutation = useMutation({
    mutationFn: async (migration: { tag: string; name: string; value: { up: Array<string | object>; down: Array<string | object> } }) => {
      if (!databaseService || !database.productTag) {
        throw new Error('SDK not available');
      }
      return databaseService.runMigration(
        {
          tag: migration.tag,
          name: migration.name,
          up: migration.value.up,
          down: migration.value.down,
        },
        {
          product: database.productTag,
          database: database.tag,
          env: database.env.slug,
        }
      );
    },
    onSuccess: (result, migration) => {
      queryClient.invalidateQueries({
        queryKey: ['migration-history', database.productTag, database.tag, database.env.slug]
      });
      queryClient.invalidateQueries({
        queryKey: ['database-tables', database.productTag, database.tag, database.env.slug]
      });
      toast.success(`Migration "${migration.name}" completed successfully`);
    },
    onError: (error, migration) => {
      console.error('Run migration error:', error);
      toast.error(`Failed to run migration "${migration.name}"`);
    },
  });

  // SDK Mutation for rolling back a migration
  const rollbackMigrationMutation = useMutation({
    mutationFn: async (migration: { tag: string; name: string; value: { up: Array<string | object>; down: Array<string | object> } }) => {
      if (!databaseService || !database.productTag) {
        throw new Error('SDK not available');
      }
      return databaseService.rollbackMigration(
        {
          tag: migration.tag,
          name: migration.name,
          up: migration.value.up,
          down: migration.value.down,
        },
        {
          product: database.productTag,
          database: database.tag,
          env: database.env.slug,
        }
      );
    },
    onSuccess: (result, migration) => {
      queryClient.invalidateQueries({
        queryKey: ['migration-history', database.productTag, database.tag, database.env.slug]
      });
      queryClient.invalidateQueries({
        queryKey: ['database-tables', database.productTag, database.tag, database.env.slug]
      });
      toast.success(`Migration "${migration.name}" rolled back successfully`);
    },
    onError: (error, migration) => {
      console.error('Rollback migration error:', error);
      toast.error(`Failed to rollback migration "${migration.name}"`);
    },
  });

  // SDK Mutation for creating a migration
  const createMigrationMutation = useMutation({
    mutationFn: async (migrationData: {
      name: string;
      tag: string;
      description?: string;
      value: { up: Array<string | object>; down: Array<string | object> };
    }) => {
      if (!databaseService || !database.productTag) {
        throw new Error('SDK not available');
      }
      return databaseService.migration.create({
        product: database.productTag,
        database: database.tag,
        data: migrationData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['database-migrations', database.productTag, database.tag]
      });
      toast.success('Migration created successfully');
    },
    onError: (error) => {
      console.error('Create migration error:', error);
      toast.error('Failed to create migration');
    },
  });

  // SDK Mutation for deleting a migration
  const deleteMigrationMutation = useMutation({
    mutationFn: async (tag: string) => {
      if (!databaseService || !database.productTag) {
        throw new Error('SDK not available');
      }
      return databaseService.migration.delete({
        product: database.productTag,
        tag,
      });
    },
    onSuccess: (_, tag) => {
      queryClient.invalidateQueries({
        queryKey: ['database-migrations', database.productTag, database.tag]
      });
      toast.success('Migration deleted successfully');
      if (selectedMigration?.tag === tag) {
        setSelectedMigration(null);
      }
    },
    onError: (error) => {
      console.error('Delete migration error:', error);
      toast.error('Failed to delete migration');
    },
  });

  // ==================== ACTION MUTATIONS ====================

  // Fetch actions from the database definition itself. This keeps product and
  // database tags as separate arguments, including product tags containing ':'.
  const { data: sdkActions, isLoading: isLoadingActions, refetch: refetchActions } = useQuery<any[]>({
    queryKey: ['database-actions', database.productTag, database.tag],
    queryFn: async (): Promise<any[]> => {
      if (!databaseService || !database.productTag) {
        return [];
      }
      try {
        const definition = await databaseService.fetch(database.productTag, database.tag);
        return Array.isArray(definition?.actions) ? definition.actions : [];
      } catch (error) {
        console.error('Error fetching actions:', error);
        throw error;
      }
    },
    enabled: !!databaseService && !!database.productTag,
    staleTime: 30000,
  });

  // SDK Mutation for creating an action
  const createActionMutation = useMutation({
    mutationFn: async (actionData: {
      name: string;
      tag: string;
      tableName: string;
      operation: string;
      description?: string;
      template: any;
      filterTemplate?: any;
    }) => {
      if (!databaseService || !database.productTag) {
        throw new Error('SDK not available');
      }
      return databaseService.action.create({
        name: actionData.name,
        tag: `${database.productTag}:${database.tag}:${actionData.tag}`,
        tableName: actionData.tableName,
        operation: actionData.operation,
        description: actionData.description,
        template: actionData.template,
        filterTemplate: actionData.filterTemplate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['database-actions', database.productTag, database.tag]
      });
      toast.success('Action created successfully');
      setShowSaveActionModal(false);
    },
    onError: (error) => {
      console.error('Create action error:', error);
      toast.error('Failed to create action');
    },
  });

  // SDK Mutation for updating an action
  const updateActionMutation = useMutation({
    mutationFn: async (actionData: {
      tag: string;
      name?: string;
      description?: string;
      template?: any;
      filterTemplate?: any;
    }) => {
      if (!databaseService || !database.productTag) {
        throw new Error('SDK not available');
      }
      return databaseService.action.update({
        tag: actionData.tag,
        name: actionData.name,
        description: actionData.description,
        template: actionData.template,
        filterTemplate: actionData.filterTemplate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['database-actions', database.productTag, database.tag]
      });
      toast.success('Action updated successfully');
    },
    onError: (error) => {
      console.error('Update action error:', error);
      toast.error('Failed to update action');
    },
  });

  // SDK Mutation for deleting an action
  const deleteActionMutation = useMutation({
    mutationFn: async (tag: string) => {
      if (!databaseService || !database.productTag) {
        throw new Error('SDK not available');
      }
      return databaseService.action.delete(tag);
    },
    onSuccess: (_, tag) => {
      queryClient.invalidateQueries({
        queryKey: ['database-actions', database.productTag, database.tag]
      });
      toast.success('Action deleted successfully');
      if (selectedAction?.tag === tag) {
        setSelectedAction(null);
      }
    },
    onError: (error) => {
      console.error('Delete action error:', error);
      toast.error('Failed to delete action');
    },
  });

  // SDK Mutation for executing an action
  const executeActionMutation = useMutation({
    mutationFn: async (options: {
      product: string;
      database: string;
      action: string;
      input: Record<string, any>;
    }) => {
      if (!databaseService || !database.productTag) {
        throw new Error('SDK not available');
      }
      return databaseService.execute({
        product: options.product,
        database: options.database,
        action: options.action,
        env: database.env.slug,
        input: options.input,
      });
    },
    onSuccess: () => {
      toast.success('Action executed successfully');
      // Optionally refresh table data if the action modified data
      queryClient.invalidateQueries({
        queryKey: ['table-data', database.productTag, database.tag, database.env.slug]
      });
    },
    onError: (error) => {
      console.error('Execute action error:', error);
      toast.error('Failed to execute action');
    },
  });

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
          console.error(`Failed to parse JSON for column ${key}:`, error);
        }
      }
    });

    // Use SDK mutation if available, otherwise use demo mode
    if (databaseService && database.productTag && selectedTable) {
      insertMutation.mutate(processedData);
    } else {
      // Fallback demo mode
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success(`New record inserted into ${selectedTable?.name}`);
      setShowInsertDialog(false);
      setFormData({});
      setJsonValidationErrors({});
    }
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
          console.error(`Failed to parse JSON for column ${key}:`, error);
        }
      }
    });

    // Use SDK mutation if available, otherwise use demo mode
    if (databaseService && database.productTag && selectedTable && selectedRow) {
      // Build where clause from the row's primary key, unique field, or first available column
      const pkField = getPrimaryKeyField(selectedRow);
      if (!pkField) {
        toast.error('Cannot update: no unique identifier found for this record');
        return;
      }
      const where = { [pkField.field]: pkField.value };
      // Pass originalData so we only send changed fields
      updateMutation.mutate({ data: processedData, where, originalData: selectedRow });
    } else {
      // Fallback demo mode
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success(`Record updated in ${selectedTable?.name}`);
      setShowEditDialog(false);
      setFormData({});
      setSelectedRow(null);
      setJsonValidationErrors({});
    }
  };

  const handleDelete = async () => {
    // Use SDK mutation if available, otherwise use demo mode
    if (databaseService && database.productTag && selectedTable && selectedRow) {
      // Build where clause from the row's primary key, unique field, or first available column
      const pkField = getPrimaryKeyField(selectedRow);
      if (!pkField) {
        toast.error('Cannot delete: no unique identifier found for this record');
        return;
      }
      const where = { [pkField.field]: pkField.value };
      deleteMutation.mutate(where);
    } else {
      // Fallback demo mode
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success(`Record deleted from ${selectedTable?.name}`);
      setShowDeleteDialog(false);
      setSelectedRow(null);
    }
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

    // Use SDK mutation if available
    if (databaseService && database.productTag) {
      createTableMutation.mutate({
        name: tableName,
        columns: tableColumns,
      });
    } else {
      // Fallback demo mode
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
    }
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
    // Use SDK mutation if available
    if (databaseService && database.productTag && selectedTable) {
      addColumnsMutation.mutate(newColumns);
    } else {
      // Fallback demo mode
      toast.success(`${newColumns.length} column(s) added successfully`);
      setShowAddColumnsConfirm(false);
      setShowAddColumnsDialog(false);
      // Reset new columns
      setNewColumns([]);
    }
  };

  // Helper functions for edit columns management
  const handleEditColumn = (columnName: string) => {
    setColumnToEdit(columnName);
    // Initialize edit form based on column name patterns
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
    // Use SDK mutation if available
    if (databaseService && database.productTag && selectedTable) {
      dropColumnsMutation.mutate(columnsToDelete);
    } else {
      // Fallback demo mode
      toast.success(`${columnsToDelete.length} column(s) deleted successfully`);
      setShowDeleteColumnsConfirm(false);
      setShowDeleteColumnsDialog(false);
      setColumnsToDelete([]);
    }
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

  const handleRunMigration = async (migration: any) => {
    // Use SDK mutation if available
    if (databaseService && database.productTag && migration.value) {
      toast(`Running migration: ${migration.name}...`);
      runMigrationMutation.mutate({
        tag: migration.tag,
        name: migration.name,
        value: migration.value,
      });
    } else {
      // Fallback demo mode
      toast.success(`Running migration: ${migration.name}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(`Migration ${migration.name} completed`);
    }
  };

  const handleRollbackMigration = async (migration: any) => {
    // Use SDK mutation if available
    if (databaseService && database.productTag && migration.value) {
      toast(`Rolling back migration: ${migration.name}...`);
      rollbackMigrationMutation.mutate({
        tag: migration.tag,
        name: migration.name,
        value: migration.value,
      });
    } else {
      // Fallback demo mode
      toast.success(`Rolling back migration: ${migration.name}...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success(`Migration ${migration.name} rolled back`);
    }
  };

  const handleDeleteMigration = async (migration: any) => {
    // Use SDK mutation if available
    if (databaseService && database.productTag) {
      deleteMigrationMutation.mutate(migration.tag);
    } else {
      // Fallback demo mode
      toast.success(`Migration ${migration.name} deleted`);
    }
  };

  // Helper to build where clause with proper operator handling
  const buildWhereClause = (conditions: Array<{ column: string; operator: string; value: string }>) => {
    if (conditions.length === 0) return null;

    const whereObj = conditions.reduce((acc, w) => {
      if (!w.column) return acc;

      // Handle operators that don't need a value
      if (w.operator === 'IS NULL') {
        acc[w.column] = { isNull: true };
      } else if (w.operator === 'IS NOT NULL') {
        acc[w.column] = { isNotNull: true };
      } else if (w.value !== '' && w.value !== undefined) {
        // For operators with values
        if (w.operator === '=') {
          acc[w.column] = w.value;
        } else {
          acc[w.column] = { [w.operator]: w.value };
        }
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.keys(whereObj).length > 0 ? whereObj : null;
  };

  // Generate query from query builder state
  const generateQueryFromBuilder = (): Record<string, any> => {
    const options: Record<string, any> = {};

    if (queryBuilderTable) {
      options.table = queryBuilderTable;
    }

    if (queryBuilderOperation === 'query') {
      if (queryBuilderColumns.length > 0) {
        options.columns = queryBuilderColumns;
      }
      const whereClause = buildWhereClause(queryBuilderWhere);
      if (whereClause) {
        options.where = whereClause;
      }
      if (queryBuilderOrderBy) {
        options.orderBy = queryBuilderOrderBy;
      }
      if (queryBuilderLimit) {
        options.limit = parseInt(queryBuilderLimit) || 25;
      }
      if (queryBuilderOffset) {
        options.offset = parseInt(queryBuilderOffset) || 0;
      }
    } else if (queryBuilderOperation === 'insert' || queryBuilderOperation === 'update' || queryBuilderOperation === 'upsert') {
      if (queryBuilderData.length > 0) {
        options.data = queryBuilderData.reduce((acc, d) => {
          if (d.column && d.value !== undefined) {
            // Try to parse value as JSON, otherwise use as string
            try {
              acc[d.column] = JSON.parse(d.value);
            } catch {
              acc[d.column] = d.value;
            }
          }
          return acc;
        }, {} as Record<string, any>);
      }
      if (queryBuilderOperation === 'update' || queryBuilderOperation === 'upsert') {
        const whereClause = buildWhereClause(queryBuilderWhere);
        if (whereClause) {
          options.where = whereClause;
        }
      }
      if (queryBuilderReturning.length > 0) {
        options.returning = queryBuilderReturning;
      }
    } else if (queryBuilderOperation === 'delete') {
      const whereClause = buildWhereClause(queryBuilderWhere);
      if (whereClause) {
        options.where = whereClause;
      }
    } else if (['count', 'sum', 'avg', 'min', 'max'].includes(queryBuilderOperation)) {
      if (['sum', 'avg', 'min', 'max'].includes(queryBuilderOperation) && queryBuilderAggColumn) {
        options.column = queryBuilderAggColumn;
      }
      const whereClause = buildWhereClause(queryBuilderWhere);
      if (whereClause) {
        options.where = whereClause;
      }
    } else if (queryBuilderOperation === 'raw') {
      return {
        operation: 'raw',
        options: {
          sql: queryBuilderRawSql,
        }
      };
    }

    return {
      operation: queryBuilderOperation,
      options
    };
  };

  // Update generated query when builder state changes
  React.useEffect(() => {
    if (showQueryBuilder || (sidebarView === 'actions' && queryBuilderTable)) {
      setGeneratedQuery(generateQueryFromBuilder());
    }
  }, [queryBuilderOperation, queryBuilderTable, queryBuilderColumns, queryBuilderWhere, queryBuilderOrderBy, queryBuilderLimit, queryBuilderOffset, queryBuilderData, queryBuilderAggColumn, queryBuilderRawSql, queryBuilderReturning, sidebarView, showQueryBuilder]);

  // Test the generated query
  const handleTestQuery = async () => {
    if (!generatedQuery) {
      toast.error('Please configure a query first');
      return;
    }

    setIsTestingQuery(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      setQueryTestResult({
        success: true,
        rowCount: Math.floor(Math.random() * 100) + 1,
        executionTime: Math.floor(Math.random() * 50) + 5,
        data: [
          { id: 1, name: 'Sample Result 1' },
          { id: 2, name: 'Sample Result 2' },
        ]
      });
      toast.success('Query executed successfully');
    } catch (error) {
      toast.error('Query execution failed');
      setQueryTestResult({ success: false, error: 'Query execution failed' });
    } finally {
      setIsTestingQuery(false);
    }
  };

  // Extract parameterizable values from an object
  const extractParameterizableValues = (obj: any, path = ''): Array<{ path: string; value: any; type: string }> => {
    const results: Array<{ path: string; value: any; type: string }> = [];

    const processValue = (key: string, value: any, currentPath: string) => {
      const fullPath = currentPath ? `${currentPath}.${key}` : key;

      if (value === null || value === undefined) return;

      if (Array.isArray(value)) {
        if (value.every(v => typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')) {
          results.push({ path: fullPath, value, type: 'array' });
        }
      } else if (typeof value === 'object') {
        Object.entries(value).forEach(([k, v]) => processValue(k, v, fullPath));
      } else {
        results.push({ path: fullPath, value, type: typeof value });
      }
    };

    Object.entries(obj).forEach(([key, value]) => {
      if (key === 'operation') return;
      processValue(key, value, path);
    });

    return results;
  };

  const generateParamName = (path: string): string => {
    const parts = path.split('.');
    return parts[parts.length - 1].replace(/\[\d+\]/g, '');
  };

  // Open save action modal
  const handleOpenSaveActionModal = () => {
    if (!generatedQuery) {
      toast.error('Please generate a query first');
      return;
    }

    const values = extractParameterizableValues(generatedQuery);
    setExtractedValues(values.map(v => ({
      ...v,
      selected: false,
      paramName: generateParamName(v.path),
    })));
    setActionName('');
    setActionDescription('');
    setShowSaveActionModal(true);
  };

  // Save the action
  const handleSaveAction = () => {
    if (!actionName.trim()) {
      toast.error('Please enter an action name');
      return;
    }

    if (!generatedQuery) {
      toast.error('No query to save');
      return;
    }

    const selectedParams = extractedValues.filter(v => v.selected);
    let parameterizedQuery = JSON.parse(JSON.stringify(generatedQuery));

    const setNestedValue = (obj: any, path: string, value: any) => {
      const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
      let current = obj;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
    };

    selectedParams.forEach(param => {
      setNestedValue(parameterizedQuery, param.path, `{{${param.paramName}}}`);
    });

    const actionTag = generateActionTag(actionName);

    // Use SDK mutation if available
    if (databaseService && database.productTag) {
      createActionMutation.mutate({
        name: actionName,
        tag: actionTag,
        tableName: generatedQuery.table || selectedTable?.name || '',
        operation: generatedQuery.operation,
        description: actionDescription || undefined,
        template: parameterizedQuery,
      });
      // Also update local state for immediate UI feedback
      const newAction: IDatabaseAction = {
        id: `action_${Date.now()}`,
        tag: actionTag,
        name: actionName,
        description: actionDescription || undefined,
        operation: generatedQuery.operation,
        query: parameterizedQuery,
        parameters: selectedParams.map((p: any) => ({
          name: p.paramName,
          path: p.path,
          defaultValue: p.value,
          type: p.type as 'string' | 'number' | 'boolean' | 'array' | 'object',
        })),
        createdAt: new Date().toISOString(),
      };
      setSelectedAction(newAction);
      setShowQueryBuilder(false);
    } else {
      // Fallback demo mode
      const newAction: IDatabaseAction = {
        id: `action_${Date.now()}`,
        tag: actionTag,
        name: actionName,
        description: actionDescription || undefined,
        operation: generatedQuery.operation,
        query: parameterizedQuery,
        parameters: selectedParams.map((p: any) => ({
          name: p.paramName,
          path: p.path,
          defaultValue: p.value,
          type: p.type as 'string' | 'number' | 'boolean' | 'array' | 'object',
        })),
        createdAt: new Date().toISOString(),
      };

      setSavedActions([newAction, ...savedActions]);
      setShowSaveActionModal(false);
      setSelectedAction(newAction);
      setShowQueryBuilder(false);
      toast.success(`Action "${actionName}" saved with tag: ${actionTag}`);
    }
  };

  // Open execute action modal
  const handleOpenExecuteActionModal = (action: IDatabaseAction) => {
    setSelectedAction(action);
    const defaultValues: Record<string, any> = {};
    action.parameters.forEach(param => {
      defaultValues[param.name] = param.defaultValue;
    });
    setActionParamValues(defaultValues);
    setShowExecuteActionModal(true);
  };

  // Execute action with parameters
  const handleExecuteAction = async () => {
    if (!selectedAction) return;

    // Use SDK mutation if available
    if (databaseService && database.productTag) {
      setShowExecuteActionModal(false);
      toast(`Executing action: ${selectedAction.name}...`);
      executeActionMutation.mutate({
        product: database.productTag,
        database: database.tag,
        action: selectedAction.tag,
        input: actionParamValues,
      });
    } else {
      // Fallback demo mode
      let query = JSON.parse(JSON.stringify(selectedAction.query));

      const setNestedValue = (obj: any, path: string, value: any) => {
        const keys = path.replace(/\[(\d+)\]/g, '.$1').split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
          current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = value;
      };

      selectedAction.parameters.forEach((param: any) => {
        setNestedValue(query, param.path, actionParamValues[param.name]);
      });

      setShowExecuteActionModal(false);
      toast.success(`Executing action: ${selectedAction.name}...`);
      await new Promise(resolve => setTimeout(resolve, 800));
      toast.success(`Action ${selectedAction.name} completed`);
    }
  };

  // Delete action
  const handleDeleteAction = (action: IDatabaseAction) => {
    // Use SDK mutation if available
    if (databaseService && database.productTag) {
      deleteActionMutation.mutate(action.tag);
    } else {
      // Fallback demo mode
      setSavedActions(savedActions.filter((a: any) => a.id !== action.id));
      if (selectedAction?.id === action.id) {
        setSelectedAction(null);
      }
      toast.success('Action deleted');
    }
  };

  // Load action - show action details (not query builder)
  const handleLoadAction = (action: IDatabaseAction) => {
    setSelectedAction(action);
    // Load action's query for display
    setGeneratedQuery(action.query);
    // Hide query builder - show action details view instead
    setShowQueryBuilder(false);
  };

  // Generate code sections for action CodeSidebar (Runtime: Vanilla JS / React / Node.js)
  const generateActionCodeSections = (language: string, env?: string, runtime?: string) => {
    if (!selectedAction) return [];

    const envSlug = env || database.env.slug;
    const productTag = database.tag.split(':')[0] || 'your-product';
    const inputParams = selectedAction.parameters.length > 0
      ? selectedAction.parameters.reduce((acc, p) => {
        acc[p.name] = p.defaultValue;
        return acc;
      }, {} as Record<string, any>)
      : {};
    const inputString = JSON.stringify(inputParams, null, 4).split('\n').map((line, i) => i === 0 ? line : '    ' + line).join('\n');

    if (language !== 'typescript' && language !== 'javascript') return [];

    // Frontend: Vanilla JS (publishable key)
    if (runtime === 'vanilla') {
      return [
        {
          title: 'Init (Vanilla JS, publishable key)',
          code: `import { Ductape } from '@ductape/client';

const ductape = new Ductape({
  publishableKey: import.meta.env.VITE_PUBLISHABLE_KEY,
  product: '${productTag}',
  env: '${envSlug}',
});`,
        },
        {
          title: 'Execute database action',
          code: `const result = await ductape.databases.execute({
  database: '${database.tag}',
  action: '${selectedAction.tag}',
  input: ${inputString}
});
console.log('Result:', result);`,
        },
      ];
    }

    // Frontend: React (hooks)
    if (runtime === 'react') {
      return [
        {
          title: 'Setup (Provider)',
          code: `import { DuctapeProvider } from '@ductape/react';

<DuctapeProvider
  config={{
    publishableKey: import.meta.env.VITE_PUBLISHABLE_KEY,
    product: '${productTag}',
    env: '${envSlug}',
  }}
>
  <YourApp />
</DuctapeProvider>`,
        },
        {
          title: 'Run action (useMutation)',
          code: `import { useMutation } from '@ductape/react';

function RunDatabaseAction() {
  const { mutate, data, isLoading } = useMutation(
    async (client) =>
      client.databases.execute({
        database: '${database.tag}',
        action: '${selectedAction.tag}',
        input: ${inputString},
      })
  );

  return (
    <button onClick={() => mutate(undefined)} disabled={isLoading}>
      {isLoading ? 'Running...' : 'Run action'}
    </button>
  );
}`,
        },
      ];
    }

    // Runtime: Node.js (SDK, access key)
    if (runtime === 'node') {
      return [
        {
          title: 'Init (Node.js, access key)',
          code: language === 'typescript'
            ? `import Ductape from '@ductape/sdk';

const ductape = new Ductape({
  accessKey: process.env.DUCTAPE_ACCESS_KEY,
});`
            : `const Ductape = require('@ductape/sdk');

const ductape = new Ductape({
  accessKey: process.env.DUCTAPE_ACCESS_KEY,
});`,
        },
        {
          title: 'Execute database action',
          code: `const result = await ductape.database.execute({
  product: '${productTag}',
  env: '${envSlug}',
  database: '${database.tag}',
  action: '${selectedAction.tag}',
  input: ${inputString}
});
console.log('Result:', result);`,
        },
      ];
    }

    // Fallback when no runtime selector: same as Node
    return [
      {
        title: 'Execute database action',
        code: `await ductape.database.execute({
  product: '${productTag}',
  env: '${envSlug}',
  database: '${database.tag}',
  action: '${selectedAction.tag}',
  input: ${inputString}
});`,
      },
      {
        title: 'Initialize Ductape',
        code: `import Ductape from '@ductape/sdk';

const ductape = new Ductape({
  accessKey: 'your-access-key',
});`,
      },
    ];
  };

  // Use persisted actions when loaded, otherwise retain actions created locally.
  const allActions = sdkActions ? sdkActions.map((a: any) => ({
    id: a.tag,
    tag: a.tag,
    name: a.name,
    description: a.description,
    operation: a.operation ?? a.type,
    query: a.template,
    parameters: [],
    createdAt: a.createdAt || new Date().toISOString(),
  })) : savedActions;

  // Filter actions
  const filteredActions = allActions.filter((a: any) =>
    a?.name?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
    a?.operation?.toLowerCase()?.includes(searchQuery.toLowerCase())
  );

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

  // Get the primary key or unique identifier column for a row
  // Priority: 1) id/ID, 2) _id, 3) primaryKey from schema, 4) unique field from schema, 5) first column with value
  const getPrimaryKeyField = (row: Record<string, any>): { field: string; value: any } | null => {
    // 1. Check for common primary key names
    if (row.id !== undefined) return { field: 'id', value: row.id };
    if (row.ID !== undefined) return { field: 'ID', value: row.ID };
    if (row._id !== undefined) return { field: '_id', value: row._id };

    // 2. Check tableSchema for primaryKey or unique columns
    if (tableSchema?.columns && Array.isArray(tableSchema.columns)) {
      // First look for explicit primaryKey
      const pkColumn = tableSchema.columns.find((col: any) => col.primaryKey === true);
      if (pkColumn && row[pkColumn.name] !== undefined) {
        return { field: pkColumn.name, value: row[pkColumn.name] };
      }

      // Then look for unique columns (like email)
      const uniqueColumn = tableSchema.columns.find((col: any) => col.unique === true);
      if (uniqueColumn && row[uniqueColumn.name] !== undefined) {
        return { field: uniqueColumn.name, value: row[uniqueColumn.name] };
      }
    }

    // 3. Fallback: use the first column that has a non-null value
    const columns = Object.keys(row);
    for (const col of columns) {
      if (row[col] !== null && row[col] !== undefined) {
        console.warn(`[DB-Explorer] No primary key found, using first available column: ${col}`);
        return { field: col, value: row[col] };
      }
    }

    return null;
  };

  // Get column type from tableSchema (fetched from SDK) or tableColumns (for create table dialog)
  const getColumnType = (columnName: string): string => {
    // First try: get from tableSchema (ITableSchema format from schema.describe)
    if (tableSchema?.columns && Array.isArray(tableSchema.columns)) {
      const schemaColumn = tableSchema.columns.find((col: any) => col.name === columnName);
      if (schemaColumn?.type) {
        return schemaColumn.type;
      }
    }
    // Second try: get from tableColumns (used for create table dialog)
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

  useEffect(() => {
    const loadGeneratedPayloads = async () => {
      if (!showCodeSidebar || !selectedTable?.name || !database?.tag || !database?.productTag) return;
      if (!currentWorkspaceId || !user?._id || !user?.public_key) return;

      const envs = (database.productEnvironments || []).map((e: any) => e.slug);
      if (!envs.length) return;

      const operationToMethod: Record<string, string> = {
        query: 'find',
        insert: 'insert',
        update: 'update',
        delete: 'delete',
        upsert: 'upsert',
        count: 'count',
        aggregate: 'aggregate',
        'aggregate-conditional': 'aggregate',
        groupBy: 'aggregate',
        sum: 'sum',
        avg: 'avg',
        min: 'min',
        max: 'max',
        raw: 'query',
      };

      const operations = Object.keys(operationToMethod);
      const nextState: Record<string, Record<string, Record<string, unknown>>> = {};

      await Promise.all(
        envs.map(async (envSlug: string) => {
          nextState[envSlug] = {};
          await Promise.all(
            operations.map(async (operation) => {
              try {
                const result = await payloadGenerationService.generateExecutablePayload({
                  workspace_id: currentWorkspaceId,
                  user_id: user._id,
                  public_key: user.public_key,
                  product_tag: database.productTag!,
                  env_slug: envSlug,
                  operation_family: 'database',
                  method: operationToMethod[operation],
                  targets: {
                    database_tag: database.tag,
                    table: selectedTable.name,
                  },
                  schema_mode: 'best_effort',
                });
                nextState[envSlug][operation] = result.payload || {};
              } catch {
                nextState[envSlug][operation] = {};
              }
            }),
          );
        }),
      );

      setGeneratedPayloadsByEnvOperation(nextState);
    };

    loadGeneratedPayloads();
  }, [
    showCodeSidebar,
    selectedTable?.name,
    database?.tag,
    database?.productTag,
    database?.productEnvironments,
    currentWorkspaceId,
    user?._id,
    user?.public_key,
  ]);

  const buildDynamicDatabaseCode = (
    language: string,
    operation: string,
    payloadTemplate: Record<string, unknown> | undefined,
  ): string | null => {
    if (!payloadTemplate || !Object.keys(payloadTemplate).length) return null;
    const methodMap: Record<string, string> = {
      query: 'query',
      insert: 'insert',
      update: 'update',
      delete: 'delete',
      upsert: 'upsert',
      count: 'count',
      aggregate: 'aggregate',
      'aggregate-conditional': 'aggregate',
      groupBy: 'aggregate',
      sum: 'sum',
      avg: 'avg',
      min: 'min',
      max: 'max',
      raw: 'query',
    };
    const method = methodMap[operation] || 'query';
    const inputPayload = (payloadTemplate.input as Record<string, unknown>) || {};
    const json = JSON.stringify(inputPayload, null, 2);
    if (language === 'typescript' || language === 'javascript') {
      return `const result = await ductape.databases.${method}(${json});

console.log('Result:', result);`;
    }
    if (language === 'python') {
      return `result = ductape.databases.${method}(${json.replace(/"([^"]+)":/g, "'$1':")})
print('Result:', result)`;
    }
    return null;
  };

  // Generate code examples for database operations
  const generateCodeSections = (language: string, env?: string, runtime?: string) => {
    const tableName = selectedTable?.name || 'your_table';
    const envSlug = env || 'prd';
    const dynamicTemplate = generatedPayloadsByEnvOperation[envSlug]?.[selectedOperation];
    const dynamicCode = buildDynamicDatabaseCode(language, selectedOperation, dynamicTemplate);

    // Build operation-specific code sections (shared by runtime and non-runtime paths)
    const buildOperationSections = (): Array<{ title: string; code: string }> => {
      const opSections: Array<{ title: string; code: string }> = [];
      if (dynamicCode) {
        opSections.push({
          title: `Generated ${selectedOperation} payload`,
          code: dynamicCode,
        });
      }
      switch (selectedOperation) {
        case 'query':
          opSections.push(
            { title: 'Basic Query', code: generateQueryCode(tableName, envSlug, language) },
            { title: 'Advanced Filtering', code: `// Query with comparison operators based on ${tableName} schema\n${generateQueryCode(tableName, envSlug, language).replace('Basic Query', 'Advanced query')}` }
          );
          break;
        case 'insert':
          opSections.push({ title: `Insert into ${tableName}`, code: generateInsertCode(tableName, envSlug, language) });
          break;
        case 'update':
          opSections.push({ title: `Update ${tableName}`, code: generateUpdateCode(tableName, envSlug, language) });
          break;
        case 'delete':
          opSections.push({ title: `Delete from ${tableName}`, code: generateDeleteCode(tableName, envSlug, language) });
          break;
        case 'aggregate':
          opSections.push({ title: `Aggregate ${tableName}`, code: generateAggregateCode(tableName, envSlug, language) });
          break;
        case 'aggregate-conditional':
          opSections.push({ title: `Aggregate ${tableName} with Conditions`, code: generateAggregateConditionalCode(tableName, envSlug, language) });
          break;
        case 'groupBy':
          opSections.push({ title: `Group By in ${tableName}`, code: generateGroupByCode(tableName, envSlug, language) });
          break;
        case 'upsert':
          opSections.push({ title: `Upsert into ${tableName}`, code: generateUpsertCode(tableName, envSlug, language) });
          break;
        case 'count':
          opSections.push({ title: `Count Records in ${tableName}`, code: generateCountCode(tableName, envSlug, language) });
          break;
        case 'sum':
          opSections.push({ title: `Sum Values in ${tableName}`, code: generateSumCode(tableName, envSlug, language) });
          break;
        case 'avg':
          opSections.push({ title: `Average Values in ${tableName}`, code: generateAvgCode(tableName, envSlug, language) });
          break;
        case 'min':
          opSections.push({ title: `Minimum Value in ${tableName}`, code: generateMinCode(tableName, envSlug, language) });
          break;
        case 'max':
          opSections.push({ title: `Maximum Value in ${tableName}`, code: generateMaxCode(tableName, envSlug, language) });
          break;
        case 'raw':
          opSections.push({ title: `Raw SQL Query on ${tableName}`, code: generateRawCode(tableName, envSlug, language) });
          break;
        default:
          opSections.push({ title: 'Query Records', code: generateQueryCode(tableName, envSlug, language) });
      }
      return opSections;
    };

    // Runtime-specific: Init + operation sections (query, insert, update, delete, etc. from Operation Type dropdown)
    if (runtime === 'vanilla') {
      const init = {
        title: 'Init (Vanilla JS, publishable key)',
        code: `import { Ductape } from '@ductape/client';

const ductape = new Ductape({
  publishableKey: import.meta.env.VITE_PUBLISHABLE_KEY,
});`,
      };
      const operationSections = buildOperationSections().map(s => ({
        ...s,
        code: s.code.replace(/ductape\.database\./g, 'ductape.databases.'),
      }));
      return [init, ...operationSections];
    }
    if (runtime === 'react') {
      const productPlaceholder = database?.productTag || 'your-product';
      const init = {
        title: 'Setup (Provider + session)',
        code: `// Wrap your app with DuctapeProvider (e.g. in main.tsx).
// Session: your backend calls ductape.sessions.start() (e.g. at login) and returns the token.
// Frontend gets that token (e.g. useAuth().sessionToken) and passes \`session\` in every request below.

import { DuctapeProvider } from '@ductape/react';

<DuctapeProvider
  config={{
    publishableKey: 'your-publishable-key',
    product: '${productPlaceholder}',
    env: '${envSlug}',
  }}
>
  <App />
</DuctapeProvider>`,
      };
      // React: use hooks (useDatabaseQuery, useDatabaseInsert, useDatabaseUpdate, useDatabaseDelete, useMutation)
      const buildReactOperationSections = (): Array<{ title: string; code: string }> => {
        switch (selectedOperation) {
          case 'query':
            return [
              {
                title: 'Basic Query', code: `import { useDatabaseQuery } from '@ductape/react';

function ${tableName.replace(/-/g, '_')}List() {
  const { sessionToken } = useAuth(); // session from your backend
  const { data, isLoading, error } = useDatabaseQuery(
    ['${tableName}', 'list'],
    { table: '${tableName}', limit: 10, session: sessionToken }
  );

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data?.rows?.map((row, i) => (
        <li key={row.id ?? i}>{JSON.stringify(row)}</li>
      ))}
    </ul>
  );
}` },
              {
                title: 'Query with filters', code: `import { useDatabaseQuery } from '@ductape/react';

const { sessionToken } = useAuth();
const { data, isLoading } = useDatabaseQuery(
  ['${tableName}', 'active'],
  { table: '${tableName}', where: { status: 'active' }, limit: 10, session: sessionToken }
);` },
            ];
          case 'insert':
            return [{
              title: `Insert into ${tableName}`, code: `import { useDatabaseInsert } from '@ductape/react';

function Create${tableName.replace(/-/g, '_').replace(/\b\w/g, c => c.toUpperCase())}() {
  const { sessionToken } = useAuth();
  const { mutate, isLoading } = useDatabaseInsert({
    onSuccess: () => console.log('Inserted'),
  });

  return (
    <button
      onClick={() => mutate({ table: '${tableName}', data: { name: 'Jane', email: 'jane@example.com' }, session: sessionToken })}
      disabled={isLoading}
    >
      Create row
    </button>
  );
}` }];
          case 'update':
            return [{
              title: `Update ${tableName}`, code: `import { useDatabaseUpdate } from '@ductape/react';

function Update${tableName.replace(/-/g, '_').replace(/\b\w/g, c => c.toUpperCase())}() {
  const { sessionToken } = useAuth();
  const { mutate, isLoading } = useDatabaseUpdate();

  return (
    <button
      onClick={() => mutate({
        table: '${tableName}',
        where: { id: 1 },
        data: { name: 'Updated Name', status: 'active' },
        session: sessionToken,
      })}
      disabled={isLoading}
    >
      Update row
    </button>
  );
}` }];
          case 'delete':
            return [{
              title: `Delete from ${tableName}`, code: `import { useDatabaseDelete } from '@ductape/react';

function Delete${tableName.replace(/-/g, '_').replace(/\b\w/g, c => c.toUpperCase())}() {
  const { sessionToken } = useAuth();
  const { mutate, isLoading } = useDatabaseDelete();

  return (
    <button
      onClick={() => mutate({ table: '${tableName}', where: { id: 1 }, session: sessionToken })}
      disabled={isLoading}
    >
      Delete row
    </button>
  );
}` }];
          case 'upsert':
            return [{
              title: `Upsert into ${tableName}`, code: `import { useMutation } from '@ductape/react';

const { sessionToken } = useAuth();
const { mutate, isLoading } = useMutation(async (client) =>
  client.databases.upsert({ table: '${tableName}', data: { id: 1, name: 'Jane' }, conflictColumns: ['id'], session: sessionToken })
);` }];
          case 'count':
            return [{
              title: `Count ${tableName}`, code: `import { useMutation } from '@ductape/react';

const { sessionToken } = useAuth();
const { mutate, data, isLoading } = useMutation(async (client) =>
  client.databases.count({ table: '${tableName}', session: sessionToken })
);` }];
          default:
            // sum, avg, min, max, aggregate, groupBy, raw: use useMutation with client.databases
            return [{
              title: `${selectedOperation} – use useMutation`,
              code: `import { useMutation } from '@ductape/react';

const { sessionToken } = useAuth();
const { mutate, data, isLoading } = useMutation(async (client) => {
  return await client.databases.query({ table: '${tableName}', limit: 10, session: sessionToken });
  // Or: client.databases.count({ table: '${tableName}', session: sessionToken })
  // Or: client.databases.sum({ table: '${tableName}', column: 'amount', session: sessionToken })
});

// Trigger: <button onClick={() => mutate(undefined)} disabled={isLoading}>Run</button>
`,
            }];
        }
      };
      const reactSections = buildReactOperationSections();
      return [init, ...reactSections];
    }
    if (runtime === 'node') {
      const init = {
        title: 'Init (Node.js, access key)',
        code: language === 'typescript'
          ? `import Ductape from '@ductape/sdk';

const ductape = new Ductape({
  accessKey: process.env.DUCTAPE_ACCESS_KEY,
});`
          : `const Ductape = require('@ductape/sdk');

const ductape = new Ductape({
  accessKey: process.env.DUCTAPE_ACCESS_KEY,
});`,
      };
      return [init, ...buildOperationSections()];
    }

    // Common sections for all operations (no runtime selector)
    const initSection = language === 'typescript'
      ? {
        title: 'Init Ductape',
        code: `import Ductape from "@ductape/sdk"

const ductape = new Ductape({
  accessKey: 'your-access-key',
});`,
      }
      : {
        title: 'Init Ductape',
        code: `const Ductape = require("@ductape/sdk")

const ductape = new Ductape({
  accessKey: 'your-access-key',
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

    return [initSection, connectSection, transactionSection, ...buildOperationSections()];
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
    t?.name?.toLowerCase()?.includes(searchQuery.toLowerCase()) ?? false
  );

  // Use SDK migrations if available, otherwise use empty array
  // Migrations are now fetched directly from _ductape_migrations table with status already set
  const migrations = Array.isArray(sdkMigrations) ? sdkMigrations : EMPTY_MIGRATIONS;

  const filteredMigrations = migrations.filter((m: any) =>
    m?.name?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
    m?.tag?.toLowerCase()?.includes(searchQuery.toLowerCase())
  );

  const handleViewChange = (view: SidebarView) => {
    setSidebarView(view);
    setSearchQuery('');
    setSelectedTable(null);
    setSelectedMigration(null);
    setSelectedAction(null);
  };

  // Show connecting state while establishing database connection
  if (isConnecting) {
    return (
      <div className="flex-1 flex min-h-0 w-full items-center justify-center bg-gradient-to-br from-grey-50 via-grey-100 to-grey-200">
        <div className="relative">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/10 rounded-full blur-2xl animate-pulse delay-150" />
          </div>

          {/* Main content card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 max-w-sm text-center">
            {/* Animated database icon */}
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <Database className="h-10 w-10 text-primary" />
              </div>
              {/* Animated ring */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-24 h-24 border-2 border-primary/20 rounded-full animate-ping" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-28 h-28 border border-primary/10 rounded-full animate-[ping_2s_ease-in-out_infinite]" />
              </div>
            </div>

            {/* Connection status */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-grey-800">Connecting to Database</h3>
              <p className="text-sm text-grey-600">
                Establishing secure connection to
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-grey-100 rounded-lg">
                <Database className="h-4 w-4 text-primary" />
                <span className="font-medium text-grey-800">{database.name}</span>
              </div>
            </div>

            {/* Progress indicator */}
            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-center gap-2 text-xs text-grey-500">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                </div>
              </div>
              <p className="text-xs text-grey-400">
                Environment: <span className="font-medium text-grey-500">{database.env.slug}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show connection error state
  if (connectionError) {
    const errorMsg = connectionError instanceof Error ? connectionError.message : 'Unknown error occurred';
    const isVpcError = /ETIMEDOUT|ECONNREFUSED|EHOSTUNREACH|ENETUNREACH/i.test(errorMsg);
    return (
      <div className="flex-1 flex min-h-0 w-full items-center justify-center bg-gradient-to-br from-grey-50 via-grey-100 to-grey-200">
        <div className="relative">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red/5 rounded-full blur-3xl" />
          </div>

          {/* Main content card */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 max-w-md text-center">
            {/* Error icon */}
            <div className="relative mb-6">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-red/20 to-red/5 flex items-center justify-center">
                <Database className="h-10 w-10 text-red" />
              </div>
              {/* X indicator */}
              <div className="absolute -bottom-1 -right-1 left-1/2 ml-4 w-8 h-8 bg-red rounded-full flex items-center justify-center shadow-lg">
                <X className="h-5 w-5 text-white" />
              </div>
            </div>

            {/* Error content */}
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-grey-800">Connection Failed</h3>
              <p className="text-sm text-grey-600">
                Unable to connect to
              </p>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-grey-100 rounded-lg">
                <Database className="h-4 w-4 text-grey-500" />
                <span className="font-medium text-grey-800">{database.name}</span>
              </div>
            </div>

            {/* Error message */}
            <div className="mt-4 p-4 bg-red/5 border border-red/20 rounded-xl">
              <p className="text-sm text-red font-medium">{errorMsg}</p>
            </div>

            {/* VPC hint */}
            {isVpcError && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-left space-y-2">
                <div className="flex items-center gap-2">
                  <Network className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-sm font-medium text-amber-800">Database is in a private VPC</p>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed">
                  The proxy cannot reach a private VPC endpoint directly. Set up a VPC connector so Ductape can tunnel through your network:
                </p>
                <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>Open your AWS cloud connection in <strong>Cloud connections</strong></li>
                  <li>Go to the <strong>Private access</strong> tab</li>
                  <li>Select <strong>VPC connector</strong> and configure your VPC and subnets</li>
                  <li>Deploy the agent inside the VPC using the docker command shown</li>
                </ol>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 flex flex-col gap-3">
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['database-connection', database.productTag, database.tag, database.env.slug] })}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Connection
              </Button>
              <p className="text-xs text-grey-400">
                Environment: <span className="font-medium text-grey-500">{database.env.slug}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-h-0 w-full overflow-hidden bg-grey-100">
      {/* Sidebar */}
      <div
        className={cn(
          "bg-white border-r border-grey-300 flex flex-col min-h-0 overflow-hidden transition-all duration-300 relative z-10",
          isSidebarCollapsed ? "w-14" : ""
        )}
        style={{ width: isSidebarCollapsed ? '56px' : `${sidebarWidth}px` }}
      >
        {!isSidebarCollapsed && (
          <div
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary z-50 transition-colors"
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.pageX;
              const startWidth = sidebarWidth;

              const handleMouseMove = (mouseEvent: MouseEvent) => {
                const newWidth = Math.max(200, Math.min(600, startWidth + (mouseEvent.pageX - startX)));
                setSidebarWidth(newWidth);
              };

              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
        )}
        {/* Header - Fixed */}
        <div className={cn('flex-shrink-0 border-b border-grey-400', isSidebarCollapsed ? 'p-2' : 'p-4')}>
          <div className={cn('flex items-center', isSidebarCollapsed ? 'justify-center' : 'gap-2 mb-3')}>
            <button
              onClick={() => {
                if (isSidebarCollapsed) {
                  setIsSidebarCollapsed(false);
                }
              }}
              className={cn(
                'flex items-center justify-center rounded-lg bg-blue/10 flex-shrink-0',
                isSidebarCollapsed ? 'w-8 h-8' : 'w-9 h-9'
              )}
              title={isSidebarCollapsed ? 'Expand sidebar' : database.name}
            >
              <Database className="h-5 w-5 text-blue" />
            </button>
            {!isSidebarCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-grey text-sm truncate">{database.name}</h2>
                  <p className="text-xs text-grey-600 truncate">{database.env.slug}</p>
                </div>
                <button
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="p-1.5 text-grey-500 hover:text-grey hover:bg-grey-100 rounded transition-colors"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* View Tabs - Only show when expanded */}
          {!isSidebarCollapsed && (
            <>
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
            </>
          )}
        </div>

        {/* List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-2 min-h-0">
          {/* Collapsed view - Icon buttons only */}
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => {
                  setIsSidebarCollapsed(false);
                  handleViewChange('tables');
                }}
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                  sidebarView === 'tables'
                    ? 'bg-primary/10 text-primary'
                    : 'text-grey-600 hover:bg-grey-100 hover:text-grey'
                )}
                title={isNoSQL ? 'Collections' : 'Tables'}
              >
                <Table className="h-5 w-5" />
              </button>
              {!isNoSQL && (
                <button
                  onClick={() => {
                    setIsSidebarCollapsed(false);
                    handleViewChange('migrations');
                  }}
                  className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                    sidebarView === 'migrations'
                      ? 'bg-primary/10 text-primary'
                      : 'text-grey-600 hover:bg-grey-100 hover:text-grey'
                  )}
                  title="Migrations"
                >
                  <GitBranch className="h-5 w-5" />
                </button>
              )}
              {/* Actions icon hidden for now */}
            </div>
          ) : (
            <>
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
                      onClick={() => {
                        // Reset query builder state
                        setQueryBuilderOperation('query');
                        setQueryBuilderTable('');
                        setQueryBuilderColumns([]);
                        setQueryBuilderWhere([]);
                        setQueryBuilderOrderBy(null);
                        setQueryBuilderLimit('25');
                        setQueryBuilderOffset('0');
                        setQueryBuilderData([]);
                        setQueryBuilderAggColumn('');
                        setQueryBuilderRawSql('');
                        setQueryBuilderReturning([]);
                        setGeneratedQuery(null);
                        setQueryTestResult(null);
                        setSelectedAction(null);
                        // Show query builder
                        setShowQueryBuilder(true);
                      }}
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
                  {isLoadingTables ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                      <span className="ml-2 text-sm text-grey-600">Loading {isNoSQL ? 'collections' : 'tables'}...</span>
                    </div>
                  ) : (
                    filteredTables.map((table) => (
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
                          {'rowCount' in table && table.rowCount != null ? table.rowCount : 'documentCount' in table && table.documentCount != null ? table.documentCount : '-'}
                        </span>
                      </button>
                    ))
                  )}
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
                      <div className="flex items-center gap-2 text-xs text-grey-600 ml-5 min-w-0">
                        <span className={cn(
                          'px-1.5 py-0.5 rounded flex-shrink-0',
                          migration.status === 'completed' ? 'bg-green/10 text-green' : 'bg-yellow/10 text-yellow'
                        )}>
                          {migration.status}
                        </span>
                        <span className="truncate" title={migration.tag}>{migration.tag}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Actions List */}
              {sidebarView === 'actions' && (
                <div className="space-y-1">
                  {filteredActions.length === 0 ? (
                    <div className="px-2 py-4 text-center">
                      <Bookmark className="h-8 w-8 text-grey-300 mx-auto mb-2" />
                      <p className="text-xs text-grey">No saved actions yet</p>
                      <p className="text-xs text-grey mt-1">
                        Build a query and save it as an action
                      </p>
                    </div>
                  ) : (
                    filteredActions.map((action) => (
                      <div
                        key={action.id}
                        className={cn(
                          'px-2 py-2 rounded text-sm transition-colors cursor-pointer',
                          selectedAction?.id === action.id
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-grey-100'
                        )}
                        onClick={() => handleLoadAction(action)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <Bookmark className="h-3.5 w-3.5 flex-shrink-0 text-grey" />
                            <span className="truncate font-medium text-grey">{action.name}</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenExecuteActionModal(action);
                              }}
                              className="p-1 text-grey hover:text-primary hover:bg-primary/10 rounded transition-colors"
                              title="Execute with parameters"
                            >
                              <Play className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAction(action);
                              }}
                              className="p-1 text-grey hover:text-red hover:bg-red/10 rounded transition-colors"
                              title="Delete action"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap ml-5">
                          <span className={cn('px-1.5 py-0.5 rounded text-xs', DATABASE_OPERATIONS[action.operation as DatabaseOperation]?.color || 'bg-grey-100 text-grey')}>
                            {action.operation}
                          </span>
                          {action.parameters.length > 0 && (
                            <span className="px-1.5 py-0.5 bg-grey-100 rounded text-xs text-grey">
                              {action.parameters.length} param{action.parameters.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {action.description && (
                          <div className="text-xs text-grey mt-1 truncate ml-5">
                            {action.description}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Info - Fixed */}
        <div className={cn('flex-shrink-0 border-t border-grey-400 bg-grey-50', isSidebarCollapsed ? 'p-2' : 'p-3')}>
          {isSidebarCollapsed ? (
            <button
              onClick={() => setIsSidebarCollapsed(false)}
              className="w-full flex items-center justify-center p-2 text-grey-500 hover:text-grey hover:bg-grey-100 rounded transition-colors"
              title="Expand sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          ) : (
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
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        {/* Database Overview - when no table selected */}
        {sidebarView === 'tables' && !selectedTable && (
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-grey-400 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue/10 flex items-center justify-center">
                    <Table className="h-5 w-5 text-blue" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-grey">{tables.length}</div>
                    <div className="text-xs text-grey-500">{isNoSQL ? 'Collections' : 'Tables'}</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-grey-400 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-green/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-green" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-grey">
                      {tables.reduce((acc, t) => acc + ('rowCount' in t && t.rowCount != null ? t.rowCount : 'documentCount' in t && t.documentCount != null ? t.documentCount : 0), 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-grey-500">Total {isNoSQL ? 'Documents' : 'Rows'}</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-grey-400 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Bookmark className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-grey">{savedActions.length}</div>
                    <div className="text-xs text-grey-500">Saved Actions</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-grey-400 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-grey capitalize">{database.type || 'SQL'}</div>
                    <div className="text-xs text-grey-500">Database Type</div>
                  </div>
                </div>
              </div>
            </div>

            <ActivityTimelinePanel
              title="Activity timeline"
              kind="database"
              productTag={database.productTag}
              componentTag={database.tag}
              env={database.env.slug}
              countLabel="operations"
              enabled={!!database.productTag}
            />

            {/* Quick Actions */}
            <div>
              <h3 className="text-sm font-semibold text-grey mb-3">Quick Actions</h3>
              <div className="grid grid-cols-4 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => {
                    setQueryBuilderOperation('query');
                    setShowQueryBuilder(true);
                    if (tables.length > 0) {
                      setSelectedTable(tables[0]);
                    }
                  }}
                >
                  <Search className="h-5 w-5 text-primary" />
                  <span className="text-sm">Query Data</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => {
                    setQueryBuilderOperation('insert');
                    setShowQueryBuilder(true);
                    if (tables.length > 0) {
                      setSelectedTable(tables[0]);
                    }
                  }}
                >
                  <Plus className="h-5 w-5 text-green" />
                  <span className="text-sm">Insert {isNoSQL ? 'Document' : 'Row'}</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => setShowCreateTableDialog(true)}
                >
                  <Table className="h-5 w-5 text-blue" />
                  <span className="text-sm">Create {isNoSQL ? 'Collection' : 'Table'}</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center gap-2"
                  onClick={() => handleViewChange('actions')}
                >
                  <Zap className="h-5 w-5 text-orange-500" />
                  <span className="text-sm">View Actions</span>
                </Button>
              </div>
            </div>

            {/* Tables Overview */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-grey">{isNoSQL ? 'Collections' : 'Tables'}</h3>
                <Button variant="ghost" size="sm" onClick={handleSidebarRefresh}>
                  <RefreshCw className={cn('h-4 w-4', isSidebarRefreshing && 'animate-spin')} />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {tables.slice(0, 6).map((table) => (
                  <button
                    key={table.name}
                    onClick={() => setSelectedTable(table)}
                    className="bg-white rounded-lg border border-grey-400 p-4 text-left hover:border-primary/50 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Table className="h-4 w-4 text-blue" />
                        <span className="font-medium text-grey">{table.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-grey-500">
                      {('rowCount' in table && table.rowCount != null) || ('documentCount' in table && table.documentCount != null) ? (
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {'rowCount' in table && table.rowCount != null
                            ? `${table.rowCount.toLocaleString()} rows`
                            : 'documentCount' in table && table.documentCount != null
                              ? `${table.documentCount.toLocaleString()} docs`
                              : ''}
                        </span>
                      ) : null}
                      {'columnCount' in table && table.columnCount != null && (
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          {table.columnCount} columns
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {tables.length > 6 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => handleViewChange('tables')}
                >
                  View all {tables.length} {isNoSQL ? 'collections' : 'tables'}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>

            {/* Recent Actions */}
            {savedActions.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-grey">Saved Actions</h3>
                  <Button variant="ghost" size="sm" onClick={() => handleViewChange('actions')}>
                    View All
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {savedActions.slice(0, 3).map((action) => (
                    <button
                      key={action.id}
                      onClick={() => handleLoadAction(action)}
                      className="w-full bg-white rounded-lg border border-grey-400 p-3 text-left hover:border-primary/50 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm text-grey">{action.name}</span>
                        <span className={cn('text-xs px-2 py-0.5 rounded', DATABASE_OPERATIONS[action.operation as DatabaseOperation]?.color || 'bg-grey-100 text-grey')}>
                          {action.operation}
                        </span>
                      </div>
                      {action.description && (
                        <p className="text-xs text-grey-500 truncate">{action.description}</p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
                      {'rowCount' in selectedTable && selectedTable.rowCount != null
                        ? `${selectedTable.rowCount} rows`
                        : 'documentCount' in selectedTable && selectedTable.documentCount != null
                          ? `${selectedTable.documentCount} documents`
                          : ''}
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
                                  {allColumns && allColumns.length > 0 ? (
                                    allColumns.filter(col => col).map(col => (
                                      <SelectItem key={col} value={col}>{col}</SelectItem>
                                    ))
                                  ) : (
                                    <SelectItem value="__no_columns__" disabled>No columns available</SelectItem>
                                  )}
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
                                  <SelectItem value="greater_than_or_equal">Greater than or equal</SelectItem>
                                  <SelectItem value="less_than_or_equal">Less than or equal</SelectItem>
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
              {isLoadingTableData ? (
                <div className="bg-white rounded-lg border border-grey-400 p-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mb-4" />
                    <h3 className="text-lg font-semibold text-grey mb-2">Loading Data</h3>
                    <p className="text-sm text-grey-600">
                      Fetching {isNoSQL ? 'documents' : 'rows'} from {selectedTable?.name}...
                    </p>
                  </div>
                </div>
              ) : tableData.length === 0 ? (
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
                          .map((row, rowIndex) => {
                            const actualRowIndex = rowIndex;
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
                            {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, ('rowCount' in selectedTable && selectedTable.rowCount != null ? selectedTable.rowCount : 'documentCount' in selectedTable && selectedTable.documentCount != null ? selectedTable.documentCount : 0))}
                          </span> of{' '}
                          <span className="font-semibold text-grey">
                            {'rowCount' in selectedTable && selectedTable.rowCount != null ? selectedTable.rowCount : 'documentCount' in selectedTable && selectedTable.documentCount != null ? selectedTable.documentCount : 0}
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
                          Page {currentPage} of {Math.ceil(('rowCount' in selectedTable && selectedTable.rowCount != null ? selectedTable.rowCount : 'documentCount' in selectedTable && selectedTable.documentCount != null ? selectedTable.documentCount : 0) / pageSize)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage >= Math.ceil(('rowCount' in selectedTable && selectedTable.rowCount != null ? selectedTable.rowCount : 'documentCount' in selectedTable && selectedTable.documentCount != null ? selectedTable.documentCount : 0) / pageSize)}
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

        {/* Actions View - Query Builder */}
        {sidebarView === 'actions' && (
          <div className="flex-1 overflow-auto p-6">
            {!showQueryBuilder && !selectedAction ? (
              /* Empty state when no query builder and no action selected */
              <div className="max-w-4xl mx-auto flex flex-col items-center justify-center h-full py-20">
                <div className="text-center">
                  <Zap className="h-16 w-16 text-grey-300 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-grey mb-2">Database Actions</h2>
                  <p className="text-sm text-grey mb-6 max-w-md">
                    Create reusable database queries with parameterized values.
                    Select an action from the sidebar or create a new one.
                  </p>
                  <Button
                    onClick={() => {
                      setQueryBuilderOperation('query');
                      setQueryBuilderTable('');
                      setQueryBuilderColumns([]);
                      setQueryBuilderWhere([]);
                      setQueryBuilderOrderBy(null);
                      setQueryBuilderLimit('25');
                      setQueryBuilderOffset('0');
                      setQueryBuilderData([]);
                      setQueryBuilderAggColumn('');
                      setQueryBuilderRawSql('');
                      setQueryBuilderReturning([]);
                      setGeneratedQuery(null);
                      setQueryTestResult(null);
                      setSelectedAction(null);
                      setShowQueryBuilder(true);
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create New Action
                  </Button>
                </div>
              </div>
            ) : !showQueryBuilder && selectedAction ? (
              /* Action Details View */
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Action Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-bold text-grey">{selectedAction.name}</h2>
                      <span className={cn(
                        'px-2 py-0.5 rounded text-xs font-medium',
                        DATABASE_OPERATIONS[selectedAction.operation as DatabaseOperation]?.color || 'bg-grey-100 text-grey'
                      )}>
                        {DATABASE_OPERATIONS[selectedAction.operation as DatabaseOperation]?.label || selectedAction.operation}
                      </span>
                    </div>
                    {/* Action Tag */}
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="h-3.5 w-3.5 text-primary" />
                      <code className="text-sm font-mono px-2 py-0.5 bg-primary/10 text-primary rounded">
                        {selectedAction.tag}
                      </code>
                    </div>
                    {selectedAction.description && (
                      <p className="text-sm text-grey">{selectedAction.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowActionCodeSidebar(true)}
                      className="gap-2"
                    >
                      <Code className="h-4 w-4" />
                      Code
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedAction(null);
                        setGeneratedQuery(null);
                      }}
                      className="gap-2 text-grey"
                    >
                      <X className="h-4 w-4" />
                      Close
                    </Button>
                  </div>
                </div>

                {/* Action Info */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg border border-grey-400 p-4">
                    <Label className="text-xs text-grey uppercase tracking-wide mb-2 block">Operation Type</Label>
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      <span className="font-medium text-grey">
                        {DATABASE_OPERATIONS[selectedAction.operation as DatabaseOperation]?.label || selectedAction.operation}
                      </span>
                    </div>
                    <p className="text-xs text-grey mt-1">
                      {DATABASE_OPERATIONS[selectedAction.operation as DatabaseOperation]?.description}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg border border-grey-400 p-4">
                    <Label className="text-xs text-grey uppercase tracking-wide mb-2 block">Database</Label>
                    <span className="font-medium text-grey">{database.name}</span>
                    <p className="text-xs text-grey mt-1 font-mono">{database.tag}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-grey-400 p-4">
                    <Label className="text-xs text-grey uppercase tracking-wide mb-2 block">Created</Label>
                    <span className="font-medium text-grey">
                      {selectedAction.createdAt ? new Date(selectedAction.createdAt).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleOpenExecuteActionModal(selectedAction)}
                    className="gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Execute Action
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowQueryBuilder(true);
                      setSelectedAction(null);
                    }}
                    className="gap-2"
                  >
                    <Settings2 className="h-4 w-4" />
                    Edit in Query Builder
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      handleDeleteAction(selectedAction);
                    }}
                    className="gap-2 text-red hover:text-red hover:bg-red/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>

                {/* Parameters */}
                {selectedAction.parameters && selectedAction.parameters.length > 0 && (
                  <div className="bg-white rounded-lg border border-grey-400 p-4">
                    <Label className="text-sm font-semibold text-grey mb-3 block">
                      Parameters ({selectedAction.parameters.length})
                    </Label>
                    <div className="space-y-2">
                      {selectedAction.parameters.map((param, idx) => (
                        <div key={idx} className="flex items-center gap-4 p-3 bg-grey-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-mono text-primary">{`{{${param.name}}}`}</code>
                              <span className="text-xs px-1.5 py-0.5 bg-grey-100 rounded text-grey">{param.type}</span>
                            </div>
                            <p className="text-xs text-grey mt-1">Path: {param.path}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-grey">Default value:</p>
                            <code className="text-sm font-mono text-grey">
                              {JSON.stringify(param.defaultValue)}
                            </code>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Query Template */}
                <div className="bg-white rounded-lg border border-grey-400 p-4">
                  <Label className="text-sm font-semibold text-grey mb-3 block">Query Template</Label>
                  <pre className="bg-grey-50 rounded-lg p-4 overflow-x-auto text-sm font-mono text-grey max-h-64 overflow-y-auto">
                    {JSON.stringify(selectedAction.query, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Query Builder Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-grey">Query Builder</h2>
                    <p className="text-sm text-grey">Build database queries and save them as reusable actions</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestQuery}
                      disabled={!generatedQuery || isTestingQuery}
                      className="gap-2"
                    >
                      {isTestingQuery ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      Test Query
                    </Button>
                    {/* Save as Action button hidden for now */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowQueryBuilder(false)}
                      className="gap-2 text-grey"
                    >
                      <X className="h-4 w-4" />
                      Close
                    </Button>
                  </div>
                </div>

                {/* Operation Selection */}
                <div className="bg-white rounded-lg border border-grey-400 p-4">
                  <Label className="text-sm font-semibold text-grey mb-3 block">Operation Type</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(DATABASE_OPERATIONS).map(([op, config]) => (
                      <button
                        key={op}
                        onClick={() => setQueryBuilderOperation(op as DatabaseOperation)}
                        className={cn(
                          'p-3 rounded-lg border text-left transition-colors',
                          queryBuilderOperation === op
                            ? 'border-primary bg-primary/5'
                            : 'border-grey-400 hover:border-grey-400 hover:bg-grey-50'
                        )}
                      >
                        <div className={cn('text-xs font-semibold uppercase mb-1', config.color.split(' ')[1])}>
                          {config.label}
                        </div>
                        <div className="text-xs text-grey">{config.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Query Configuration */}
                <div className="bg-white rounded-lg border border-grey-400 p-4">
                  <Label className="text-sm font-semibold text-grey mb-3 block">Query Configuration</Label>

                  <div className="space-y-4">
                    {/* Table Selection */}
                    {queryBuilderOperation !== 'raw' && (
                      <div>
                        <Label className="text-xs text-grey mb-2 block">Table *</Label>
                        <Select value={queryBuilderTable} onValueChange={setQueryBuilderTable}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a table..." />
                          </SelectTrigger>
                          <SelectContent>
                            {tables && tables.length > 0 ? (
                              tables.filter(table => table?.name).map((table) => (
                                <SelectItem key={table.name} value={table.name}>
                                  {table.name}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__no_tables__" disabled>No tables available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Query-specific fields */}
                    {queryBuilderOperation === 'query' && (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-grey mb-2 block">Limit</Label>
                            <Input
                              type="number"
                              value={queryBuilderLimit}
                              onChange={(e) => setQueryBuilderLimit(e.target.value)}
                              placeholder="25"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-grey mb-2 block">Offset</Label>
                            <Input
                              type="number"
                              value={queryBuilderOffset}
                              onChange={(e) => setQueryBuilderOffset(e.target.value)}
                              placeholder="0"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs text-grey mb-2 block">Where Conditions</Label>
                          {queryBuilderWhere.map((condition, idx) => {
                            const selectedColumn = queryBuilderTableColumns.find((c: any) => c.name === condition.column);
                            const columnType: ColumnType = selectedColumn?.type || 'string';
                            const operators = OPERATORS_BY_TYPE[columnType];
                            const needsValue = !['IS NULL', 'IS NOT NULL'].includes(condition.operator);

                            return (
                              <div key={idx} className="flex gap-2 mb-2">
                                {/* Column Dropdown */}
                                <Select
                                  value={condition.column}
                                  onValueChange={(v) => {
                                    const newWhere = [...queryBuilderWhere];
                                    newWhere[idx].column = v;
                                    // Reset operator and value when column changes
                                    const newColumn = queryBuilderTableColumns.find((c: any) => c.name === v);
                                    const newType = newColumn?.type || 'string';
                                    const newOperators = OPERATORS_BY_TYPE[newType];
                                    if (!newOperators.find(op => op.value === newWhere[idx].operator)) {
                                      newWhere[idx].operator = '=';
                                    }
                                    newWhere[idx].value = '';
                                    setQueryBuilderWhere(newWhere);
                                  }}
                                >
                                  <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Select column..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {queryBuilderTableColumns.length > 0 ? (
                                      queryBuilderTableColumns.filter((col: any) => col?.name).map((col: any) => (
                                        <SelectItem key={col.name} value={col.name}>
                                          <span className="flex items-center gap-2">
                                            {col.name}
                                            <span className="text-xs text-grey-400">({col.type})</span>
                                          </span>
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <SelectItem value="__select_table__" disabled>Select a table first</SelectItem>
                                    )}
                                  </SelectContent>
                                </Select>

                                {/* Operator Dropdown - Dynamic based on column type */}
                                <Select
                                  value={condition.operator}
                                  onValueChange={(v) => {
                                    const newWhere = [...queryBuilderWhere];
                                    newWhere[idx].operator = v;
                                    // Clear value if operator doesn't need one
                                    if (['IS NULL', 'IS NOT NULL'].includes(v)) {
                                      newWhere[idx].value = '';
                                    }
                                    setQueryBuilderWhere(newWhere);
                                  }}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {operators.map((op) => (
                                      <SelectItem key={op.value} value={op.value}>
                                        {op.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                {/* Value Input - Dynamic based on column type */}
                                {needsValue && (
                                  columnType === 'boolean' ? (
                                    <Select
                                      value={condition.value}
                                      onValueChange={(v) => {
                                        const newWhere = [...queryBuilderWhere];
                                        newWhere[idx].value = v;
                                        setQueryBuilderWhere(newWhere);
                                      }}
                                    >
                                      <SelectTrigger className="flex-1">
                                        <SelectValue placeholder="Select value..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="true">true</SelectItem>
                                        <SelectItem value="false">false</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : columnType === 'number' ? (
                                    <Input
                                      type="number"
                                      value={condition.value}
                                      onChange={(e) => {
                                        const newWhere = [...queryBuilderWhere];
                                        newWhere[idx].value = e.target.value;
                                        setQueryBuilderWhere(newWhere);
                                      }}
                                      placeholder="Enter number..."
                                      className="flex-1"
                                    />
                                  ) : (columnType === 'date' || columnType === 'datetime') ? (
                                    <Input
                                      type={columnType === 'date' ? 'date' : 'datetime-local'}
                                      value={condition.value}
                                      onChange={(e) => {
                                        const newWhere = [...queryBuilderWhere];
                                        newWhere[idx].value = e.target.value;
                                        setQueryBuilderWhere(newWhere);
                                      }}
                                      className="flex-1"
                                    />
                                  ) : (
                                    <Input
                                      value={condition.value}
                                      onChange={(e) => {
                                        const newWhere = [...queryBuilderWhere];
                                        newWhere[idx].value = e.target.value;
                                        setQueryBuilderWhere(newWhere);
                                      }}
                                      placeholder="Enter value..."
                                      className="flex-1"
                                    />
                                  )
                                )}

                                {/* Placeholder for alignment when no value needed */}
                                {!needsValue && <div className="flex-1" />}

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setQueryBuilderWhere(queryBuilderWhere.filter((_, i) => i !== idx))}
                                >
                                  ×
                                </Button>
                              </div>
                            );
                          })}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setQueryBuilderWhere([...queryBuilderWhere, { column: '', operator: '=', value: '' }])}
                            disabled={!queryBuilderTable}
                          >
                            + Add Condition
                          </Button>
                          {!queryBuilderTable && queryBuilderWhere.length === 0 && (
                            <p className="text-xs text-grey-400 mt-1">Select a table first to add conditions</p>
                          )}
                        </div>
                      </>
                    )}

                    {/* Insert/Update Data fields */}
                    {(queryBuilderOperation === 'insert' || queryBuilderOperation === 'update' || queryBuilderOperation === 'upsert') && (
                      <div>
                        <Label className="text-xs text-grey mb-2 block">Data</Label>
                        {queryBuilderData.map((data, idx) => {
                          const selectedColumn = queryBuilderTableColumns.find((c: any) => c.name === data.column);
                          const columnType: ColumnType = selectedColumn?.type || 'string';

                          return (
                            <div key={idx} className="flex gap-2 mb-2">
                              {/* Column Dropdown */}
                              <Select
                                value={data.column}
                                onValueChange={(v) => {
                                  const newData = [...queryBuilderData];
                                  newData[idx].column = v;
                                  newData[idx].value = '';
                                  setQueryBuilderData(newData);
                                }}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Select column..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {queryBuilderTableColumns.length > 0 ? (
                                    queryBuilderTableColumns.filter((col: any) => col?.name).map((col: any) => (
                                      <SelectItem key={col.name} value={col.name}>
                                        <span className="flex items-center gap-2">
                                          {col.name}
                                          <span className="text-xs text-grey-400">({col.type})</span>
                                        </span>
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="px-2 py-1.5 text-sm text-grey-400">Select a table first</div>
                                  )}
                                </SelectContent>
                              </Select>

                              {/* Value Input - Dynamic based on column type */}
                              {columnType === 'boolean' ? (
                                <Select
                                  value={data.value}
                                  onValueChange={(v) => {
                                    const newData = [...queryBuilderData];
                                    newData[idx].value = v;
                                    setQueryBuilderData(newData);
                                  }}
                                >
                                  <SelectTrigger className="flex-1">
                                    <SelectValue placeholder="Select value..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="true">true</SelectItem>
                                    <SelectItem value="false">false</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : columnType === 'number' ? (
                                <Input
                                  type="number"
                                  value={data.value}
                                  onChange={(e) => {
                                    const newData = [...queryBuilderData];
                                    newData[idx].value = e.target.value;
                                    setQueryBuilderData(newData);
                                  }}
                                  placeholder="Enter number..."
                                  className="flex-1"
                                />
                              ) : (columnType === 'date' || columnType === 'datetime') ? (
                                <Input
                                  type={columnType === 'date' ? 'date' : 'datetime-local'}
                                  value={data.value}
                                  onChange={(e) => {
                                    const newData = [...queryBuilderData];
                                    newData[idx].value = e.target.value;
                                    setQueryBuilderData(newData);
                                  }}
                                  className="flex-1"
                                />
                              ) : (
                                <Input
                                  value={data.value}
                                  onChange={(e) => {
                                    const newData = [...queryBuilderData];
                                    newData[idx].value = e.target.value;
                                    setQueryBuilderData(newData);
                                  }}
                                  placeholder="Enter value..."
                                  className="flex-1"
                                />
                              )}

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setQueryBuilderData(queryBuilderData.filter((_, i) => i !== idx))}
                              >
                                ×
                              </Button>
                            </div>
                          );
                        })}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQueryBuilderData([...queryBuilderData, { column: '', value: '' }])}
                          disabled={!queryBuilderTable}
                        >
                          + Add Field
                        </Button>
                        {!queryBuilderTable && queryBuilderData.length === 0 && (
                          <p className="text-xs text-grey-400 mt-1">Select a table first to add fields</p>
                        )}
                      </div>
                    )}

                    {/* Where conditions for update/delete/upsert */}
                    {(queryBuilderOperation === 'update' || queryBuilderOperation === 'delete' || queryBuilderOperation === 'upsert') && (
                      <div>
                        <Label className="text-xs text-grey mb-2 block">Where Conditions</Label>
                        {queryBuilderWhere.map((condition, idx) => {
                          const selectedColumn = queryBuilderTableColumns.find((c: any) => c.name === condition.column);
                          const columnType: ColumnType = selectedColumn?.type || 'string';
                          const operators = OPERATORS_BY_TYPE[columnType];
                          const needsValue = !['IS NULL', 'IS NOT NULL'].includes(condition.operator);

                          return (
                            <div key={idx} className="flex gap-2 mb-2">
                              <Select
                                value={condition.column}
                                onValueChange={(v) => {
                                  const newWhere = [...queryBuilderWhere];
                                  newWhere[idx].column = v;
                                  const newColumn = queryBuilderTableColumns.find((c: any) => c.name === v);
                                  const newType = newColumn?.type || 'string';
                                  const newOperators = OPERATORS_BY_TYPE[newType];
                                  if (!newOperators.find(op => op.value === newWhere[idx].operator)) {
                                    newWhere[idx].operator = '=';
                                  }
                                  newWhere[idx].value = '';
                                  setQueryBuilderWhere(newWhere);
                                }}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Select column..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {queryBuilderTableColumns.length > 0 ? (
                                    queryBuilderTableColumns.filter((col: any) => col?.name).map((col: any) => (
                                      <SelectItem key={col.name} value={col.name}>
                                        <span className="flex items-center gap-2">
                                          {col.name}
                                          <span className="text-xs text-grey-400">({col.type})</span>
                                        </span>
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="px-2 py-1.5 text-sm text-grey-400">Select a table first</div>
                                  )}
                                </SelectContent>
                              </Select>

                              <Select
                                value={condition.operator}
                                onValueChange={(v) => {
                                  const newWhere = [...queryBuilderWhere];
                                  newWhere[idx].operator = v;
                                  if (['IS NULL', 'IS NOT NULL'].includes(v)) {
                                    newWhere[idx].value = '';
                                  }
                                  setQueryBuilderWhere(newWhere);
                                }}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {operators.map((op) => (
                                    <SelectItem key={op.value} value={op.value}>
                                      {op.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {needsValue && (
                                columnType === 'boolean' ? (
                                  <Select
                                    value={condition.value}
                                    onValueChange={(v) => {
                                      const newWhere = [...queryBuilderWhere];
                                      newWhere[idx].value = v;
                                      setQueryBuilderWhere(newWhere);
                                    }}
                                  >
                                    <SelectTrigger className="flex-1">
                                      <SelectValue placeholder="Select value..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="true">true</SelectItem>
                                      <SelectItem value="false">false</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : columnType === 'number' ? (
                                  <Input
                                    type="number"
                                    value={condition.value}
                                    onChange={(e) => {
                                      const newWhere = [...queryBuilderWhere];
                                      newWhere[idx].value = e.target.value;
                                      setQueryBuilderWhere(newWhere);
                                    }}
                                    placeholder="Enter number..."
                                    className="flex-1"
                                  />
                                ) : (columnType === 'date' || columnType === 'datetime') ? (
                                  <Input
                                    type={columnType === 'date' ? 'date' : 'datetime-local'}
                                    value={condition.value}
                                    onChange={(e) => {
                                      const newWhere = [...queryBuilderWhere];
                                      newWhere[idx].value = e.target.value;
                                      setQueryBuilderWhere(newWhere);
                                    }}
                                    className="flex-1"
                                  />
                                ) : (
                                  <Input
                                    value={condition.value}
                                    onChange={(e) => {
                                      const newWhere = [...queryBuilderWhere];
                                      newWhere[idx].value = e.target.value;
                                      setQueryBuilderWhere(newWhere);
                                    }}
                                    placeholder="Enter value..."
                                    className="flex-1"
                                  />
                                )
                              )}

                              {!needsValue && <div className="flex-1" />}

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setQueryBuilderWhere(queryBuilderWhere.filter((_, i) => i !== idx))}
                              >
                                ×
                              </Button>
                            </div>
                          );
                        })}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQueryBuilderWhere([...queryBuilderWhere, { column: '', operator: '=', value: '' }])}
                          disabled={!queryBuilderTable}
                        >
                          + Add Condition
                        </Button>
                        {!queryBuilderTable && queryBuilderWhere.length === 0 && (
                          <p className="text-xs text-grey-400 mt-1">Select a table first to add conditions</p>
                        )}
                      </div>
                    )}

                    {/* Aggregation column for sum/avg/min/max */}
                    {['sum', 'avg', 'min', 'max'].includes(queryBuilderOperation) && (
                      <div>
                        <Label className="text-xs text-grey mb-2 block">Column to Aggregate *</Label>
                        <Select
                          value={queryBuilderAggColumn}
                          onValueChange={setQueryBuilderAggColumn}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select column to aggregate..." />
                          </SelectTrigger>
                          <SelectContent>
                            {queryBuilderTableColumns.length > 0 ? (
                              queryBuilderTableColumns
                                .filter((col: any) => col.type === 'number' && col?.name)
                                .map((col: any) => (
                                  <SelectItem key={col.name} value={col.name}>
                                    {col.name}
                                  </SelectItem>
                                ))
                            ) : (
                              <SelectItem value="__select_table__" disabled>Select a table first</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Where conditions for count and aggregation operations */}
                    {['count', 'sum', 'avg', 'min', 'max'].includes(queryBuilderOperation) && (
                      <div>
                        <Label className="text-xs text-grey mb-2 block">Where Conditions (Optional)</Label>
                        {queryBuilderWhere.map((condition, idx) => {
                          const selectedColumn = queryBuilderTableColumns.find((c: any) => c.name === condition.column);
                          const columnType: ColumnType = selectedColumn?.type || 'string';
                          const operators = OPERATORS_BY_TYPE[columnType];
                          const needsValue = !['IS NULL', 'IS NOT NULL'].includes(condition.operator);

                          return (
                            <div key={idx} className="flex gap-2 mb-2">
                              <Select
                                value={condition.column}
                                onValueChange={(v) => {
                                  const newWhere = [...queryBuilderWhere];
                                  newWhere[idx].column = v;
                                  const newColumn = queryBuilderTableColumns.find((c: any) => c.name === v);
                                  const newType = newColumn?.type || 'string';
                                  const newOperators = OPERATORS_BY_TYPE[newType];
                                  if (!newOperators.find(op => op.value === newWhere[idx].operator)) {
                                    newWhere[idx].operator = '=';
                                  }
                                  newWhere[idx].value = '';
                                  setQueryBuilderWhere(newWhere);
                                }}
                              >
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="Select column..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {queryBuilderTableColumns.length > 0 ? (
                                    queryBuilderTableColumns.filter((col: any) => col?.name).map((col: any) => (
                                      <SelectItem key={col.name} value={col.name}>
                                        <span className="flex items-center gap-2">
                                          {col.name}
                                          <span className="text-xs text-grey-400">({col.type})</span>
                                        </span>
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="px-2 py-1.5 text-sm text-grey-400">Select a table first</div>
                                  )}
                                </SelectContent>
                              </Select>

                              <Select
                                value={condition.operator}
                                onValueChange={(v) => {
                                  const newWhere = [...queryBuilderWhere];
                                  newWhere[idx].operator = v;
                                  if (['IS NULL', 'IS NOT NULL'].includes(v)) {
                                    newWhere[idx].value = '';
                                  }
                                  setQueryBuilderWhere(newWhere);
                                }}
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {operators.map((op) => (
                                    <SelectItem key={op.value} value={op.value}>
                                      {op.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {needsValue && (
                                columnType === 'boolean' ? (
                                  <Select
                                    value={condition.value}
                                    onValueChange={(v) => {
                                      const newWhere = [...queryBuilderWhere];
                                      newWhere[idx].value = v;
                                      setQueryBuilderWhere(newWhere);
                                    }}
                                  >
                                    <SelectTrigger className="flex-1">
                                      <SelectValue placeholder="Select value..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="true">true</SelectItem>
                                      <SelectItem value="false">false</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : columnType === 'number' ? (
                                  <Input
                                    type="number"
                                    value={condition.value}
                                    onChange={(e) => {
                                      const newWhere = [...queryBuilderWhere];
                                      newWhere[idx].value = e.target.value;
                                      setQueryBuilderWhere(newWhere);
                                    }}
                                    placeholder="Enter number..."
                                    className="flex-1"
                                  />
                                ) : (columnType === 'date' || columnType === 'datetime') ? (
                                  <Input
                                    type={columnType === 'date' ? 'date' : 'datetime-local'}
                                    value={condition.value}
                                    onChange={(e) => {
                                      const newWhere = [...queryBuilderWhere];
                                      newWhere[idx].value = e.target.value;
                                      setQueryBuilderWhere(newWhere);
                                    }}
                                    className="flex-1"
                                  />
                                ) : (
                                  <Input
                                    value={condition.value}
                                    onChange={(e) => {
                                      const newWhere = [...queryBuilderWhere];
                                      newWhere[idx].value = e.target.value;
                                      setQueryBuilderWhere(newWhere);
                                    }}
                                    placeholder="Enter value..."
                                    className="flex-1"
                                  />
                                )
                              )}

                              {!needsValue && <div className="flex-1" />}

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setQueryBuilderWhere(queryBuilderWhere.filter((_, i) => i !== idx))}
                              >
                                ×
                              </Button>
                            </div>
                          );
                        })}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setQueryBuilderWhere([...queryBuilderWhere, { column: '', operator: '=', value: '' }])}
                          disabled={!queryBuilderTable}
                        >
                          + Add Condition
                        </Button>
                        {!queryBuilderTable && queryBuilderWhere.length === 0 && (
                          <p className="text-xs text-grey-400 mt-1">Select a table first to add conditions</p>
                        )}
                      </div>
                    )}

                    {/* Raw SQL */}
                    {queryBuilderOperation === 'raw' && (
                      <div>
                        <Label className="text-xs text-grey mb-2 block">SQL Query *</Label>
                        <Textarea
                          value={queryBuilderRawSql}
                          onChange={(e) => setQueryBuilderRawSql(e.target.value)}
                          placeholder="SELECT * FROM users WHERE id = $1"
                          rows={4}
                          className="font-mono text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Generated Query Preview */}
                {generatedQuery && (
                  <div className="bg-white rounded-lg border border-grey-400 p-4">
                    <Label className="text-sm font-semibold text-grey mb-3 block">Generated Query</Label>
                    <pre className="bg-grey-50 rounded-lg p-4 overflow-x-auto text-sm font-mono text-grey">
                      {JSON.stringify(generatedQuery, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Test Results */}
                {queryTestResult && (
                  <div className={cn(
                    'rounded-lg border p-4',
                    queryTestResult.success
                      ? 'bg-green/5 border-green/20'
                      : 'bg-red/5 border-red/20'
                  )}>
                    <div className="flex items-center gap-2 mb-2">
                      {queryTestResult.success ? (
                        <Check className="h-4 w-4 text-green" />
                      ) : (
                        <X className="h-4 w-4 text-red" />
                      )}
                      <span className={cn('text-sm font-medium', queryTestResult.success ? 'text-green' : 'text-red')}>
                        {queryTestResult.success ? 'Query executed successfully' : 'Query failed'}
                      </span>
                    </div>
                    {queryTestResult.success && (
                      <div className="text-xs text-grey">
                        {queryTestResult.rowCount} rows returned in {queryTestResult.executionTime}ms
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Action Details */}
                {selectedAction && (
                  <div className="bg-white rounded-lg border border-grey-400 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-semibold text-grey">Selected Action: {selectedAction.name}</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenExecuteActionModal(selectedAction)}
                        className="gap-2"
                      >
                        <Play className="h-3 w-3" />
                        Execute
                      </Button>
                    </div>
                    {selectedAction.description && (
                      <p className="text-sm text-grey mb-3">{selectedAction.description}</p>
                    )}
                    {selectedAction.parameters.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedAction.parameters.map((param) => (
                          <span key={param.name} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                            <Settings2 className="h-3 w-3" />
                            {`{{${param.name}}}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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

      {/* Save Action Modal */}
      <Dialog open={showSaveActionModal} onOpenChange={setShowSaveActionModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-grey">Save Query as Action</DialogTitle>
            <DialogDescription>
              Select which values to parameterize. These can be changed when executing the action.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-grey mb-2 block">Action Name *</Label>
                <Input
                  value={actionName}
                  onChange={(e) => setActionName(e.target.value)}
                  placeholder="e.g., Get Users Paginated"
                />
              </div>
              <div>
                <Label className="text-xs text-grey mb-2 block">Description</Label>
                <Input
                  value={actionDescription}
                  onChange={(e) => setActionDescription(e.target.value)}
                  placeholder="What does this action do?"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-grey mb-2 block">Select Values to Parameterize</Label>
              <p className="text-xs text-grey mb-3">
                Check the values you want to make configurable. Each will become a parameter with a placeholder like {"{{name}}"}.
              </p>

              <div className="border border-grey-400 rounded-lg divide-y divide-grey-400 max-h-64 overflow-y-auto">
                {extractedValues.length === 0 ? (
                  <div className="p-4 text-center text-sm text-grey">
                    No parameterizable values found in the query
                  </div>
                ) : (
                  extractedValues.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 hover:bg-grey-50">
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={(checked) => {
                          const newValues = [...extractedValues];
                          newValues[idx].selected = !!checked;
                          setExtractedValues(newValues);
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-grey-100 px-2 py-0.5 rounded font-mono text-grey">
                            {item.path}
                          </code>
                          <span className="text-xs text-grey px-1.5 py-0.5 bg-grey-100 rounded">
                            {item.type}
                          </span>
                        </div>
                        <div className="text-xs text-grey mt-1 truncate">
                          Current value: <span className="font-mono">{JSON.stringify(item.value)}</span>
                        </div>
                      </div>
                      {item.selected && (
                        <Input
                          value={item.paramName}
                          onChange={(e) => {
                            const newValues = [...extractedValues];
                            newValues[idx].paramName = e.target.value;
                            setExtractedValues(newValues);
                          }}
                          className="w-32 h-8 text-xs"
                          placeholder="Param name"
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Preview of selected parameters */}
            {extractedValues.some(v => v.selected) && (
              <div className="bg-grey-50 border border-grey-400 rounded-lg p-3">
                <Label className="text-xs text-grey mb-2 block">Parameters Preview</Label>
                <div className="flex flex-wrap gap-2">
                  {extractedValues.filter(v => v.selected).map((param, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs">
                      <Settings2 className="h-3 w-3" />
                      {`{{${param.paramName}}}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveActionModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAction} className="gap-2">
              <Check className="h-4 w-4" />
              Save Action
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Execute Action Modal */}
      <Dialog open={showExecuteActionModal} onOpenChange={setShowExecuteActionModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-grey">Execute Action: {selectedAction?.name}</DialogTitle>
            <DialogDescription>
              {selectedAction?.description || 'Fill in the parameter values to execute this action.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedAction?.parameters.map((param) => (
              <div key={param.name}>
                <Label className="text-xs text-grey mb-2 block">
                  {param.name}
                  <span className="text-grey-400 font-normal ml-2">({param.type})</span>
                </Label>
                {param.type === 'boolean' ? (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={!!actionParamValues[param.name]}
                      onCheckedChange={(checked) => {
                        setActionParamValues({ ...actionParamValues, [param.name]: !!checked });
                      }}
                    />
                    <span className="text-sm text-grey">
                      {actionParamValues[param.name] ? 'True' : 'False'}
                    </span>
                  </div>
                ) : param.type === 'number' ? (
                  <Input
                    type="number"
                    value={actionParamValues[param.name] ?? param.defaultValue}
                    onChange={(e) => {
                      setActionParamValues({
                        ...actionParamValues,
                        [param.name]: parseFloat(e.target.value) || 0,
                      });
                    }}
                  />
                ) : (
                  <Input
                    value={actionParamValues[param.name] ?? param.defaultValue}
                    onChange={(e) => {
                      setActionParamValues({ ...actionParamValues, [param.name]: e.target.value });
                    }}
                  />
                )}
                <p className="text-xs text-grey mt-1">
                  Default: <code className="bg-grey-100 px-1 rounded">{JSON.stringify(param.defaultValue)}</code>
                </p>
              </div>
            ))}

            {selectedAction?.parameters.length === 0 && (
              <div className="text-center py-4">
                <p className="text-sm text-grey">This action has no parameters.</p>
                <p className="text-xs text-grey mt-1">It will execute with default values.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExecuteActionModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleExecuteAction} className="gap-2">
              <Play className="h-4 w-4" />
              Execute
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
            {/* Debug: Show column count */}
            {columns.length === 0 && (
              <div className="text-center py-8 text-grey-600">
                <p className="text-sm">No columns found for this table.</p>
                <p className="text-xs mt-2">
                  {!tableSchema ? 'Loading schema...' : 'Schema loaded but no columns detected.'}
                </p>
                {tableSchema && (
                  <p className="text-xs mt-1 text-grey-400">
                    Schema keys: {Object.keys(tableSchema).join(', ')}
                  </p>
                )}
              </div>
            )}
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
              // Disable immutable fields like _id, id, and sensitive fields
              const isImmutableField = IMMUTABLE_FIELDS.includes(col.toLowerCase()) || col === '_id' || col === 'id';

              return (
                <div key={col} className="space-y-2">
                  <Label htmlFor={`edit-${col}`} className="text-sm font-medium">
                    {col}
                    {isJsonType && <span className="text-xs text-grey-500 ml-1">(JSON)</span>}
                    {isImmutableField && <span className="text-xs text-grey-500 ml-1">(read-only)</span>}
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
                        disabled={isImmutableField}
                        placeholder={`Enter JSON object or array`}
                        rows={6}
                        className={`${jsonValidationErrors[col] ? 'border-red' : ''} ${isImmutableField ? 'bg-grey-100 cursor-not-allowed' : ''}`}
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
                      disabled={isImmutableField}
                      rows={3}
                      className={isImmutableField ? 'bg-grey-100 cursor-not-allowed' : ''}
                    />
                  ) : (
                    <Input
                      id={`edit-${col}`}
                      type={col.includes('date') || col.includes('time') ? 'datetime-local' :
                        col.includes('price') || col.includes('amount') ? 'number' :
                          col.includes('email') ? 'email' : 'text'}
                      value={formData[col] || ''}
                      onChange={(e) => setFormData({ ...formData, [col]: e.target.value })}
                      disabled={isImmutableField}
                      className={isImmutableField ? 'bg-grey-100 cursor-not-allowed' : ''}
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
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${columnsToDelete.includes(col)
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
              // Use indexes from SDK
              const indexes = tableIndexes || [];

              if (isLoadingIndexes) {
                return (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                    <span className="ml-2 text-sm text-grey-600">Loading indexes...</span>
                  </div>
                );
              }

              return indexes.length > 0 ? (
                <div className="space-y-3">
                  {indexes.map((index: any, idx: number) => (
                    <div key={idx} className="border border-grey-300 rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-semibold text-grey">{index.name}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${index.type === 'PRIMARY' ? 'bg-blue-100 text-blue-700' :
                                index.type === 'UNIQUE' || index.unique ? 'bg-purple-100 text-purple-700' :
                                  'bg-grey-100 text-grey-700'
                              }`}>
                              {index.type || (index.unique ? 'UNIQUE' : 'INDEX')}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-grey-600">
                              <span className="font-medium">Columns:</span>
                              <span className="font-mono">{Array.isArray(index.columns) ? index.columns.map((c: any) => typeof c === 'string' ? c : c.name).join(', ') : index.columns}</span>
                            </div>
                            {index.method && (
                              <div className="flex items-center gap-2 text-xs text-grey-600">
                                <span className="font-medium">Method:</span>
                                <span>{index.method}</span>
                              </div>
                            )}
                            {index.unique && (
                              <div className="flex items-center gap-1 text-xs text-grey-600">
                                <Check className="h-3 w-3 text-green-600" />
                                <span>Unique Constraint</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {index.type !== 'PRIMARY' && !index.name?.includes('pkey') && (
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
                              onClick={() => {
                                if (databaseService && database.productTag) {
                                  dropIndexMutation.mutate(index.name);
                                } else {
                                  toast.success(`Index "${index.name}" dropped successfully`);
                                }
                              }}
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
          showRuntimeSelector
          environments={[{ slug: 'prd', env_name: 'Production' }, { slug: 'dev', env_name: 'Development' }]}
          additionalControls={
            <div>
              <Label className="text-sm font-semibold text-grey-700 mb-2 block">
                Operation Type
              </Label>
              <Select value={selectedOperation} onValueChange={(value: any) => setSelectedOperation(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select operation" />
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

      {/* Code Sidebar for Actions (Runtime: Vanilla / React / Node, same as App action examples) */}
      {showActionCodeSidebar && selectedAction && (
        <CodeSidebar
          title={selectedAction.name}
          subtitle={selectedAction.description}
          tag={`${database.tag}:${selectedAction.tag}`}
          onClose={() => setShowActionCodeSidebar(false)}
          generateCodeSections={generateActionCodeSections}
          showRuntimeSelector
          environments={[{ slug: database.env.slug, env_name: database.env.slug.toUpperCase() }]}
        />
      )}
    </div>
  );
}
