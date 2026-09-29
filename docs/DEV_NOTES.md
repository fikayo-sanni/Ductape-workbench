# Development Notes

## Temporary Features (To Be Removed)

### Login Modal Close Button

**Location:** `src/components/LoginModal.tsx` and `src/components/WorkbenchLayout.tsx`

**What:** Added a close button (X) in the top-right corner of the login modal to allow dismissing it without authenticating.

**Why:** Allows working on UI/UX without needing to login during development.

**To Remove Later:**
1. In `src/components/LoginModal.tsx`:
   - Remove the `onClose` prop from `LoginModalProps` interface
   - Remove the close button JSX (lines with comment "TEMPORARY: Remove this later")

2. In `src/components/WorkbenchLayout.tsx`:
   - Remove the `onClose` prop from `<LoginModal>` component

**Search for:** `// TEMPORARY: Remove this later` to find all temporary code.

---

## How to Use During Development

1. **Start the app:**
   ```bash
   npm run dev
   ```

2. **Close the login modal:**
   - Click the X button in the top-right corner of the modal
   - The background will no longer be blurred
   - You can now work on the UI/UX

3. **Test authentication later:**
   - Refresh the page
   - The login modal will appear again
   - Test the full authentication flow

---

## When to Remove

Remove the close button when:
- UI/UX is finalized
- Ready to enforce authentication
- Before production deployment
- When switching from dummy data to real API data

---

## Search & Replace Guide

To remove all temporary code at once:

```bash
# Search for this comment:
// TEMPORARY: Remove this later

# Files to update:
- src/components/LoginModal.tsx
- src/components/WorkbenchLayout.tsx
```
