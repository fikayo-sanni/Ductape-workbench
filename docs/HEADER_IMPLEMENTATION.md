# Workbench Header - Implementation Guide

## Overview

Added a comprehensive header to the Ductape Workbench that spans the full width at the top of the application, providing workspace management, user profile access, and branding.

## Visual Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Ductape | Workbench    [Workspace: ▼]  [+]    User Menu ▼  │  ← Header (56px)
├────┬──────────────┬──────────────────────────────────────────┤
│    │              │                                          │
│ I  │   Sidebar    │      Request/Response Panels             │
│ C  │              │                                          │
│ O  │              │                                          │
│ N  │              │                                          │
│ S  │              │                                          │
└────┴──────────────┴──────────────────────────────────────────┘
```

## Features

### 1. Branding Section (Left)
- **Logo**: "Ductape" in primary blue color
- **App Name**: "Workbench" in grey
- **Purpose**: Brand identity and app identification

### 2. Workspace Selector (Center-Left)
- **Label**: "Workspace:" text
- **Dropdown**: Select component showing current workspace
- **Width**: 200px
- **Create Button**: Plus icon to create new workspace
- **Function**: Switch between different workspaces

### 3. User Menu (Right)
- **Avatar**: Circular initials (e.g., "JD" for John Doe)
- **Name**: User's full name
- **Email**: User's email address (hidden on mobile)
- **Dropdown Arrow**: Indicates clickable menu
- **Dropdown Menu**: Profile, Settings, Logout options

### 4. Guest State
- Shows "Login" button if user is not authenticated

## Component Details

### WorkbenchHeader Component

**Location:** `src/components/WorkbenchHeader.tsx`

**Features:**
1. **Workspace Management**
   - Dropdown to select workspace
   - Create new workspace button
   - Synced with Zustand store

2. **User Profile**
   - Avatar with initials
   - User info display
   - Dropdown menu with options

3. **Dropdown Menu Items**
   - Profile (with User icon)
   - Settings (with Settings icon)
   - Logout (with LogOut icon, red text)

4. **Responsive Design**
   - User email hidden on mobile (`hidden md:block`)
   - Adapts to smaller screens

### Integration in Layout

**Layout Structure:**
```tsx
<div className="flex flex-col h-screen">
  {/* Header - Full width at top */}
  <WorkbenchHeader />

  {/* Content Area */}
  <div className="flex flex-1">
    <IconSidebar />
    <MainSidebar />
    <ContentPanels />
  </div>
</div>
```

**Changed from:**
- Horizontal layout with header inside content area

**Changed to:**
- Vertical layout with header spanning full width

## Styling Details

### Header
- **Height**: 56px (h-14)
- **Background**: White (bg-white)
- **Border**: Bottom border (border-grey-400)
- **Padding**: Horizontal 16px (px-4)
- **Gap**: 16px between items (gap-4)

### Workspace Selector
- **Height**: 36px (h-9)
- **Width**: 200px (w-[200px])
- **Style**: Standard select with border

### User Avatar
- **Size**: 32px (w-8 h-8)
- **Background**: Primary blue (bg-primary)
- **Text**: White, 14px, semibold
- **Shape**: Circular (rounded-full)

### User Info
- **Name**: 14px, medium weight, grey
- **Email**: 12px, grey-600

### Dropdown Menu
- **Width**: 224px (w-56)
- **Background**: White
- **Border**: Grey border + shadow
- **Position**: Absolute, below user button
- **z-index**: 20

### Menu Items
- **Padding**: 12px horizontal, 8px vertical
- **Hover**: Light grey background
- **Logout**: Red text color

## User Interactions

### 1. Workspace Selection
```typescript
// User clicks workspace dropdown
<Select onValueChange={setCurrentWorkspace}>
  // Changes active workspace
  // Updates Zustand store
  // Sidebar content updates
</Select>
```

### 2. Create Workspace
```typescript
// User clicks "+" button
// Opens create workspace dialog
// (Future implementation)
```

### 3. User Menu Toggle
```typescript
const [showUserMenu, setShowUserMenu] = useState(false);

// Click avatar/name
onClick={() => setShowUserMenu(!showUserMenu)}

// Click backdrop to close
<div onClick={() => setShowUserMenu(false)} />
```

### 4. Logout
```typescript
const handleLogout = () => {
  logout(); // Clear auth state
  window.location.reload(); // Show login modal
};
```

## State Management

### User State
```typescript
const { user, logout } = useAuth();
// From Zustand auth store
// Contains user profile data
```

### Workspace State
```typescript
const {
  workspaces,
  currentWorkspaceId,
  setCurrentWorkspace
} = useWorkbenchStore();
// From Zustand workbench store
// Manages workspace selection
```

### Local UI State
```typescript
const [showUserMenu, setShowUserMenu] = useState(false);
// Controls dropdown visibility
```

## Accessibility

### Keyboard Navigation
- Tab through interactive elements
- Enter/Space to activate buttons
- Escape to close dropdown (can be added)

### Screen Readers
- `aria-label` on buttons
- Semantic HTML structure
- Proper heading hierarchy

### Focus Management
- Visible focus states (can be enhanced)
- Logical tab order

## Responsive Behavior

### Desktop (≥768px)
- Full user info displayed
- Email visible
- All features accessible

### Mobile (<768px)
- Email hidden (`hidden md:block`)
- Name and avatar still visible
- Dropdown menu still functional

## Future Enhancements

### 1. Create Workspace Dialog
```tsx
<Dialog open={showCreateDialog}>
  <DialogContent>
    <WorkspaceForm />
  </DialogContent>
</Dialog>
```

### 2. Notifications
```tsx
<Button variant="ghost" size="icon">
  <Bell className="h-5 w-5" />
  <Badge>3</Badge>
</Button>
```

### 3. Search
```tsx
<Input
  placeholder="Search..."
  className="w-64"
  icon={<Search />}
/>
```

### 4. Environment Indicator
```tsx
<Badge variant="success">Production</Badge>
```

### 5. Quick Actions
```tsx
<DropdownMenu>
  <DropdownMenuTrigger>
    Quick Actions
  </DropdownMenuTrigger>
</DropdownMenu>
```

## Files Modified

1. **Created:** `src/components/WorkbenchHeader.tsx`
   - New header component
   - Workspace selector
   - User menu with dropdown

2. **Modified:** `src/components/WorkbenchLayout.tsx`
   - Changed layout from horizontal to vertical
   - Added WorkbenchHeader at top
   - Removed old inline header
   - Fixed div structure

## Testing Checklist

- [x] Header renders at top
- [x] Workspace selector works
- [x] User info displays correctly
- [x] Dropdown menu toggles
- [x] Logout function works
- [x] Responsive on mobile
- [x] No layout overflow
- [x] Proper z-index layering

## Known Issues

None currently.

## Breaking Changes

- Layout structure changed from horizontal to vertical
- Old header removed and replaced
- User logout now reloads page instead of just showing modal

---

**Status:** ✅ Complete
**Date:** 2025-10-23
**Version:** 1.0.0
