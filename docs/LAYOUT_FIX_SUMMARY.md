# Layout Overlap Fix Summary

**Date:** December 1, 2025  
**Issue:** Sidebar and bottom bar overlapping/covering web content area

---

## ✅ Root Causes Fixed

1. **Webview container not reserving space for bottom bar**
   - Fixed: AppShell now uses `calc(100vh - var(--bottom-bar-height))` instead of `h-screen`
   - Bottom bar is now `position: fixed` outside the flex flow

2. **Sidebar using absolute positioning**
   - Fixed: Sidebar is now part of flex flow with `flex: 0 0 var(--sidebar-width)`
   - Added `data-sidebar` attributes for tracking

3. **Webview height using 100vh**
   - Fixed: Webview container uses `height: 100%` within flex container
   - Container accounts for all fixed elements

4. **Z-index and pointer-events**
   - Fixed: Bottom bar has `z-index: 50` and proper pointer-events
   - Content areas have `pointer-events: auto`

---

## 🔧 Changes Made

### 1. CSS Variables (`src/styles/globals.css`)

```css
:root {
  --sidebar-width: 320px;
  --topbar-height: 56px;
  --bottom-bar-height: 80px;
  --tabstrip-height: 40px;
}
```

### 2. Layout CSS Classes

- `.app-root` - Main container with `calc(100vh - var(--bottom-bar-height))`
- `.content-wrapper` - Flex container with `min-width: 0` and `min-height: 0`
- `.webview-container` - Flex child with `min-height: 0` for proper scrolling
- `[data-sidebar]` - Sidebar styling with fixed width

### 3. AppShell Component (`src/components/layout/AppShell.tsx`)

- Changed main container from `h-screen` to `calc(100vh - var(--bottom-bar-height))`
- Bottom bar is now `position: fixed` with proper z-index
- Added `data-top-chrome` and `data-sidebar` attributes
- Added layout sync initialization

### 4. Layout Sync Utility (`src/utils/layoutSync.ts`)

- `updateBottomBarHeight()` - Keeps CSS variable in sync
- `updateTopbarHeight()` - Tracks topbar height
- `updateSidebarWidth()` - Tracks sidebar width
- `initLayoutSync()` - Initializes ResizeObserver and event listeners

---

## 📊 Layout Structure

```
<body>
  <div class="app-root" style="height: calc(100vh - var(--bottom-bar-height))">
    <!-- Top Chrome -->
    <div data-top-chrome>...</div>

    <!-- Main Layout (Flex) -->
    <div class="flex flex-1">
      <!-- Content Wrapper -->
      <div class="content-wrapper">
        <!-- Webview Container -->
        <div class="webview-container">
          <iframe /> <!-- Fills container, scrolls internally -->
        </div>
      </div>

      <!-- Sidebar (part of flex flow) -->
      <div data-sidebar>...</div>
    </div>
  </div>

  <!-- Bottom Bar (fixed, outside flex) -->
  <div id="bottomBar" class="fixed bottom-0">...</div>
</body>
```

---

## 🎯 Key Fixes

1. **Flexbox Layout**
   - Sidebar is part of flex flow, not absolute positioned
   - Content wrapper uses `min-width: 0` to allow shrinking
   - Webview container uses `min-height: 0` for proper scrolling

2. **Height Calculations**
   - App root: `calc(100vh - var(--bottom-bar-height))`
   - Webview: `100%` of container (not `100vh`)
   - Bottom bar: Fixed at bottom, doesn't affect flex calculations

3. **Dynamic Updates**
   - ResizeObserver tracks bottom bar height changes
   - CSS variables update automatically
   - Layout recalculates on resize

---

## 🧪 Testing Checklist

- [x] Web content no longer squished to left
- [x] Bottom bar doesn't cover page content
- [x] Sidebar doesn't overlay content
- [x] Scrollbar appears in correct position
- [x] Page content fills available space
- [x] Layout adjusts when bottom bar height changes
- [x] Sidebar can be collapsed/expanded
- [x] No wasted dark space on right

---

## 📝 Notes

- CSS variables are updated dynamically via `layoutSync.ts`
- Bottom bar height is measured and synced on mount and resize
- Sidebar width can be adjusted via CSS variable
- All changes are backward compatible

**Status:** ✅ Complete - Layout overlap issues resolved
