# Ductape Frontend App - Comprehensive Analysis

This document contains a deep analysis of the ductape-frontend-app to inform the workbench implementation.

## Key Architectural Insights

### 1. State Management Philosophy
- **Minimal Zustand usage**: Only one global store (`useAuth`) for user authentication
- **React Context for feature-specific state**: Integration setup uses dedicated context
- **React Query for server state**: All API data managed through TanStack Query
- **localStorage persistence**: User, token, and feature state persisted locally

### 2. API Integration Pattern
**Axios Configuration:**
```typescript
// Base URL from environment
baseURL: import.meta.env.VITE_API_BASE_URL

// Request interceptor adds:
Authorization: Bearer ${token}

// All requests include:
- user_id (query param)
- public_key (query param)
- workspace_id (in path or query)
```

**Service Layer Structure:**
```typescript
// Each service exports functions for specific domain
const fetchApps = async (data: {...}): Promise<AppsResponse> => {
  const response = await apiClient.get<AppsResponse>(...);
  return response.data;
};

export default { fetchApps, createApp, updateApp, deleteApp };
```

### 3. Component Organization
```
pages/              # Route-level components
  ├── feature/
  │   └── index.tsx # Main page with data fetching
components/         # Reusable components
  ├── feature/
  │   └── *.tsx     # Feature-specific components
  └── ui/           # Radix UI primitives
```

### 4. Form Handling Standard
**Every form follows this pattern:**
```typescript
// 1. Define Zod schema
const schema = z.object({
  field: z.string().min(1, "Required"),
});

// 2. Initialize react-hook-form
const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
  defaultValues: { field: "" },
});

// 3. Use Form components
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="field"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Label</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

### 5. React Query Patterns
**Query Keys:**
- Simple: `['apps']`
- Hierarchical: `['app', app_id]`
- Filtered: `['apps', workspace_id, status]`
- Time-based: `['logs', timeFilter, version]`

**Mutation Pattern:**
```typescript
const { mutate } = useMutation({
  mutationFn: service.createResource,
  onSuccess: () => {
    toast.success("Success message");
    queryClient.invalidateQueries({ queryKey: ["resources"] });
    setDialogOpen(false);
  },
  onError: (error: ApiError) => {
    toast.error(error?.response?.data?.errors || "Default error");
  }
});
```

### 6. Protected Routes Implementation
```typescript
// Check localStorage for token
const token = localStorage.getItem("token");

// Redirect to login if missing
if (!token) navigate("/auth/login");

// Otherwise render <Outlet />
```

### 7. Type System Architecture
**Core principle:** Separate type files by domain
- `auth.ts` - User, LoginRequest, SignupRequest
- `app.ts` - IApp, IAppVersion, Action, Auth, etc.
- `integration.ts` - IIntegration, resources
- `workspace.ts` - Workspace, defaultEnvs

**Naming conventions:**
- Interfaces prefixed with `I` (IApp, IIntegration)
- Types without prefix (User, Workspace)
- Enums in PascalCase (EnvType, ResponseStatus)

### 8. UI Component Patterns
**Card-based layouts:**
```typescript
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

**Dialog pattern:**
```typescript
const [open, setOpen] = useState(false);

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle className='text-grey'>Title</DialogTitle>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

**Tabs pattern:**
```typescript
<Tabs defaultValue="tab1" value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="tab1">Tab 1</TabsTrigger>
    <TabsTrigger value="tab2">Tab 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">Content 1</TabsContent>
  <TabsContent value="tab2">Content 2</TabsContent>
</Tabs>
```

### 9. Layout Structure
**Three-column layout (used in app/integration detail pages):**
```
┌─────────────────────────────────────────┐
│           Header (workspace selector)    │
├─────────┬───────────────────────────────┤
│ Sidebar │     Main Content Area         │
│  (tabs) │                               │
│         │                               │
│         │                               │
└─────────┴───────────────────────────────┘
```

**Responsive pattern:**
- Desktop: Fixed sidebar (w-64), flex-1 content
- Mobile: Collapsible sidebar, full-width content

### 10. Environment & Configuration
**Environment Variables:**
```
VITE_API_BASE_URL           # Backend API URL
VITE_LOGIN_ENC_KEY          # SSO token encryption key
VITE_PAYSTACK_PUBLIC_KEY    # Payment gateway
```

**Config files:**
- `vite.config.ts` - Build configuration, path aliases
- `tailwind.config.js` - Theme, colors, custom utilities
- `tsconfig.json` - TypeScript compiler options

## Critical Patterns for Workbench

### 1. Copy Ductape SDK Integration Pattern
```typescript
// Initialize SDK with workspace context
const ductape = new Ductape({
  workspace_id,
  user_id,
  env_type,
});
ductape.setPublicKey(public_key);
ductape.setToken(token);

// Use for API calls
const result = await ductape.app.action.execute({...});
```

### 2. Multi-Step Wizard Pattern
**From get-started components:**
- Track current step in state
- Validate before allowing next step
- Show progress indicator
- Save state to localStorage
- Allow navigation between completed steps

### 3. Search & Filter Pattern
```typescript
const [searchQuery, setSearchQuery] = useState("");
const [filter, setFilter] = useState("all");

const filtered = items.filter(item => {
  const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
  const matchesFilter = filter === "all" || item.status === filter;
  return matchesSearch && matchesFilter;
});
```

### 4. Logo Upload Pattern
```typescript
// 1. Get pre-signed URL
const { uploadUrl, key } = await service.getUploadUrl({
  workspace_id,
  public_key,
  user_id,
});

// 2. Upload to S3
await axios.put(uploadUrl, file, {
  headers: { "Content-Type": file.type },
});

// 3. Save key/URL to database
await service.updateLogo({ logo: key });
```

### 5. Time-based Analytics Pattern
```typescript
const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'year'>('week');

const { data } = useQuery({
  queryKey: ['logs', timeFilter],
  queryFn: () => logsServices.fetchLogs({
    workspace_id,
    groupBy: timeFilter,
    ...
  }),
});

// Format for charts
const chartData = formatPeriod(data, timeFilter);
```

### 6. Sidebar Navigation with URL Sync
```typescript
// Read tab from URL
const params = useParams();
const currentTab = params.tab || 'default';

// Navigate to new tab
const navigate = useNavigate();
navigate(`/apps/${appId}/${newTab}`);

// Render content based on tab
{currentTab === 'actions' && <Actions />}
{currentTab === 'logs' && <Logs />}
```

## Key Files to Reference

### For Authentication
- `/src/store/useAuth.tsx` - Auth store pattern
- `/src/services/authServices.ts` - Login/signup API calls
- `/src/router/protected-routes.tsx` - Route protection
- `/src/pages/auth/login.tsx` - Login form implementation

### For API Integration
- `/src/config/axiosinstance.ts` - HTTP client setup
- `/src/services/appsServices.ts` - Service layer example
- `/src/hooks/useQueries.tsx` - React Query custom hooks

### For UI Components
- `/src/components/ui/` - All Radix UI components
- `/src/components/header.tsx` - Navigation header
- `/src/components/layout.tsx` - Page layout wrapper

### For Forms
- `/src/pages/apps/index.tsx` - Create app form
- `/src/pages/auth/login.tsx` - Login form
- Any form uses same pattern

### For Multi-Step Flows
- `/src/components/apps/get-started/` - 6-step wizard
- `/src/components/integrations/quick-setup/` - 6-step setup
- `/src/context/integration-context.tsx` - State management

### For Data Display
- `/src/components/apps/my-app.tsx` - Charts and metrics
- `/src/pages/dashboard.tsx` - Dashboard with stats
- Uses Recharts library

## Design System Reference

### Colors (from tailwind.config.js)
```css
--primary: rgb(8, 70, 166)     /* Primary blue */
--grey: rgb(35, 40, 48)         /* Text color */
--grey200: rgb(143, 146, 161)  /* Muted text */
--grey400: rgb(212, 212, 212)  /* Borders */
--white700: rgb(249, 250, 252) /* Background */

/* Status colors */
--red: #DC3444      /* Error */
--green: #00875A    /* Success */
--yellow: #FBBC05   /* Warning */
```

### Typography
- Font family: Raleway (Google Fonts)
- Font weights: 100-900 (variable font)
- Base size: 14px (text-sm)
- Headings: font-semibold or font-bold

### Spacing
- Consistent padding: p-4, p-6, p-8
- Card padding: p-4 or p-6
- Section spacing: space-y-4, space-y-6
- Grid gaps: gap-4, gap-6

### Border Radius
- Default: rounded-md (0.375rem)
- Large: rounded-lg (0.5rem)
- Custom: rounded-10px (10px)

### Shadows
- Card: shadow-sm
- Editor: shadow-editor (custom)
- Hover: hover:shadow-md

## Common Utilities

### Helpers
```typescript
// Class name merging
cn("base-classes", condition && "conditional-classes", className)

// JSON parsing with fallback
parseJsonSafely(jsonString, fallback)

// Date formatting
formatPeriod(data, 'week') // Returns formatted chart data

// Environment mapping
getEnvironmentType(envSlug) // Maps to EnvType enum
```

### Constants
```typescript
// From helpers/index.ts
periodsEnum = ['day', 'week', 'month', 'year']
responseStatuses = ['success', 'failed']
MAX_UPLOAD_SIZE = 5 * 1024 * 1024 // 5MB
```

## Testing Considerations
- No test files found in codebase
- Consider adding tests for workbench
- Focus on critical user flows
- Test API integration points
- Validate form inputs

## Performance Patterns
- React Query caching reduces API calls
- Lazy loading of tab content
- Debounced search inputs
- Memoized complex computations
- Optimistic updates for mutations

## Error Handling Strategy
- Toast notifications for user feedback
- API errors displayed from response
- Form validation errors inline
- 404 for missing resources
- Logout on 401 (currently commented out)

## Accessibility Notes
- Radix UI components are accessible by default
- Form labels properly associated
- ARIA attributes on interactive elements
- Keyboard navigation supported
- Focus management in dialogs

---

## Next Steps for Workbench Implementation

Based on this analysis, the workbench should:

1. **Adopt the same service layer pattern** for API calls
2. **Use React Query** for all server state management
3. **Match the UI component patterns** exactly
4. **Follow the same form validation approach** (zod + react-hook-form)
5. **Implement similar routing structure** with protected routes
6. **Use the same Zustand store pattern** for minimal global state
7. **Match the color scheme and typography** exactly
8. **Follow the same error handling** and toast notification patterns
9. **Implement workspace-scoped operations** like the main app
10. **Use the same authentication flow** and token management

This will ensure consistency across the Ductape platform and make the workbench feel like a native part of the ecosystem.
