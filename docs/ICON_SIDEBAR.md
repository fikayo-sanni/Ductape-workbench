# Icon Sidebar - Implementation Guide

## Overview

Added a thin icon sidebar on the far left of the workbench, similar to Postman's design. This provides quick navigation between different views: Products, Apps, and Environments.

## Visual Layout

```
┌────┬─────────────┬──────────────────────────────────┐
│    │             │                                  │
│    │             │                                  │
│ I  │   Main      │      Request/Response Panels     │
│ C  │  Sidebar    │                                  │
│ O  │  (w-80)     │                                  │
│ N  │             │                                  │
│ S  │             │                                  │
│    │             │                                  │
└────┴─────────────┴──────────────────────────────────┘
 64px    320px              Flexible width
```

## Features

### 1. Design
- **Width**: 64px (w-16)
- **Background**: Dark grey matching Ductape theme
- **Border**: Right border to separate from main sidebar
- **Icons**: Vertical stack with labels

### 2. Navigation Items

**Products** (Package icon)
- View and manage integration products
- Active by default

**Apps** (Grid3x3 icon)
- View and manage applications
- Switch between app views

**Environments** (Settings2 icon)
- Manage environment configurations
- Switch between environments

### 3. Interaction States

**Default State:**
- Grey icon color (text-grey-200)
- Transparent background
- Hover: Light grey background overlay

**Active State:**
- Primary blue background (bg-primary)
- White icon color (text-white)
- Indicates current view

**Hover State:**
- Background: Grey overlay (bg-grey-400/20)
- Text color: White (text-white)
- Tooltip appears on hover

### 4. Tooltips

Each icon has a tooltip that appears on hover:
- Positioned to the right of the icon
- Dark grey background
- White text
- Smooth opacity transition

## Implementation Details

### Component: `IconSidebar.tsx`

**Location:** `src/components/IconSidebar.tsx`

**Props:**
```typescript
interface IconSidebarProps {
  activeView: SidebarView;
  onViewChange: (view: SidebarView) => void;
}

type SidebarView = 'products' | 'apps' | 'environments';
```

**Structure:**
```tsx
<div className="w-16 bg-grey border-r">
  {menuItems.map(item => (
    <button onClick={() => onViewChange(item.id)}>
      <Icon />
      <span>{label}</span>
      <Tooltip>{label}</Tooltip>
    </button>
  ))}
</div>
```

### Integration in WorkbenchLayout

**Added imports:**
```typescript
import IconSidebar, { SidebarView } from './IconSidebar';
```

**Added state:**
```typescript
const [activeView, setActiveView] = useState<SidebarView>('products');
```

**Added to layout:**
```tsx
<IconSidebar activeView={activeView} onViewChange={setActiveView} />
```

## Styling Details

### Colors (matching Ductape theme)

**Background:**
- Inactive: `bg-grey` (dark grey)
- Active: `bg-primary` (Ductape blue)
- Hover: `bg-grey-400/20` (20% opacity overlay)

**Text/Icons:**
- Inactive: `text-grey-200` (light grey)
- Active: `text-white`
- Hover: `text-white`

**Border:**
- Right border: `border-grey-400`

### Spacing
- Container width: 64px (w-16)
- Button size: 48px x 48px (w-12 h-12)
- Icon size: 20px (h-5 w-5)
- Font size: 10px (text-[10px])
- Padding: 16px vertical (py-4)
- Gap: 8px (gap-2)

### Typography
- Font weight: Medium (font-medium)
- Text size: 10px for labels
- Centered alignment

## Usage

### Switching Views

Click any icon to switch views:

```typescript
// User clicks "Apps"
onViewChange('apps')
// activeView state updates
// UI reflects new active state
```

### Current Behavior

Currently, the icon sidebar manages its own active state. This can later be connected to:
- Router navigation
- Content filtering
- Sidebar content switching
- Global app state

## Next Steps (Future Enhancements)

### 1. Connect to Actual Views
```typescript
// In WorkbenchLayout
useEffect(() => {
  switch(activeView) {
    case 'products':
      // Show products in sidebar
      break;
    case 'apps':
      // Show apps in sidebar
      break;
    case 'environments':
      // Show environments in sidebar
      break;
  }
}, [activeView]);
```

### 2. Add More Icons
- Settings
- History
- Collections
- API Documentation

### 3. Add Badges
```tsx
<div className="absolute -top-1 -right-1 bg-red rounded-full w-4 h-4 text-white text-xs">
  3
</div>
```

### 4. Keyboard Shortcuts
- Cmd/Ctrl + 1: Products
- Cmd/Ctrl + 2: Apps
- Cmd/Ctrl + 3: Environments

### 5. Collapsible Mode
- Hide labels
- Show only icons
- Tooltip always visible

## Accessibility

**Keyboard Navigation:**
- Icons are focusable buttons
- Tab to navigate
- Enter/Space to activate

**Screen Readers:**
- `title` attribute on buttons
- Semantic button elements
- Clear labeling

**Visual Feedback:**
- High contrast for active state
- Hover states clearly visible
- Focus states (can be added)

## Mobile Responsiveness

Current implementation is desktop-focused. For mobile:

**Recommendations:**
- Convert to bottom tab bar
- Horizontal layout
- Larger touch targets
- Hide labels except active

```tsx
// Mobile view
<div className="md:w-16 md:flex-col flex-row w-full h-16">
  {/* Icons in row for mobile */}
</div>
```

## Files Modified

1. **Created:** `src/components/IconSidebar.tsx`
   - New component for icon navigation
   - Fully styled and interactive

2. **Modified:** `src/components/WorkbenchLayout.tsx`
   - Added IconSidebar import
   - Added activeView state
   - Integrated IconSidebar into layout

## Testing Checklist

- [x] Icons render correctly
- [x] Active state shows blue background
- [x] Hover states work
- [x] Tooltips appear on hover
- [x] Click changes active view
- [x] Responsive to state changes
- [x] Matches Postman's visual style
- [x] Integrates with existing layout

## Screenshots Reference

**Postman-like Design:**
- Thin vertical sidebar
- Icon + label stacked vertically
- Active state highlighted
- Minimal width (64px)
- Dark background
- Tooltips on hover

---

**Status:** ✅ Complete
**Date:** 2025-10-23
**Version:** 1.0.0
