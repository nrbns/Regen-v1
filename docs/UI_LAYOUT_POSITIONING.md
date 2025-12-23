# UI Layout Positioning Guide

## Fixed Position Elements - Z-Index & Positioning

All fixed-positioned UI elements are now properly spaced to prevent overlapping.

### Bottom-Left Area

| Element                 | Position           | Z-Index   | Notes                                            |
| ----------------------- | ------------------ | --------- | ------------------------------------------------ |
| **ResourceMonitor**     | `bottom-4 left-4`  | `z-[110]` | Main resource dashboard (bottom-left corner)     |
| **SuspensionIndicator** | `bottom-24 left-6` | `z-[120]` | Suspended tabs indicator (above ResourceMonitor) |

### Bottom-Center Area

| Element           | Position                        | Z-Index   | Notes                                                        |
| ----------------- | ------------------------------- | --------- | ------------------------------------------------------------ |
| **MemoryMonitor** | `bottom-28 left-1/2` (centered) | `z-[105]` | Memory usage monitor (centered, above other bottom elements) |

### Bottom-Right Area (Stacked Vertically)

| Element              | Position            | Z-Index   | Notes                                        |
| -------------------- | ------------------- | --------- | -------------------------------------------- |
| **RestoreToast**     | `bottom-52 right-6` | `z-[250]` | Session restore notifications (top of stack) |
| **JobTimelinePanel** | `bottom-40 right-6` | `z-[300]` | Job timeline (middle)                        |
| **BatteryIndicator** | `bottom-32 right-6` | `z-[104]` | Battery status (bottom of right stack)       |

### Top-Right Area

| Element             | Position         | Z-Index  | Notes                                   |
| ------------------- | ---------------- | -------- | --------------------------------------- |
| **RamSavedCounter** | `right-4 top-3`  | `z-[60]` | RAM saved counter (top-right corner)    |
| **RedixModeToggle** | `top-20 right-4` | `z-50`   | Dev mode toggle (below RamSavedCounter) |

### Top Area

| Element                 | Position       | Z-Index   | Notes          |
| ----------------------- | -------------- | --------- | -------------- |
| **MeaningfulStatusBar** | `sticky top-0` | `z-[200]` | Top status bar |
| **GlobalAIStatusBar**   | `sticky top-0` | `z-[200]` | AI status bar  |

---

## Layout Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│ Top Bar (sticky, z-200)                                  │
│ ├── MeaningfulStatusBar                                  │
│ └── GlobalAIStatusBar                                    │
├─────────────────────────────────────────────────────────┤
│                                                           │
│                    Main Content Area                      │
│                                                           │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Bottom Elements (fixed):                                │
│                                                           │
│  Left Side:                    Center:      Right Side:   │
│  ┌─────────────┐            ┌──────────┐   ┌──────────┐  │
│  │ Suspension  │            │ Memory   │   │ Restore  │  │
│  │ Indicator   │            │ Monitor  │   │ Toast   │  │
│  │ (bottom-24) │            │(bottom-28)│  │(bottom-52)│ │
│  └─────────────┘            └──────────┘   └──────────┘  │
│  ┌─────────────┐                          ┌──────────┐  │
│  │ Resource    │                          │ Job      │  │
│  │ Monitor     │                          │ Timeline │  │
│  │ (bottom-4)  │                          │(bottom-40)│ │
│  └─────────────┘                          └──────────┘  │
│                                               ┌──────────┐│
│                                               │ Battery  ││
│                                               │(bottom-32)││
│                                               └──────────┘│
└─────────────────────────────────────────────────────────┘
```

---

## Spacing Strategy

### Vertical Spacing (Bottom Elements)

- **ResourceMonitor**: `bottom-4` (16px from bottom)
- **SuspensionIndicator**: `bottom-24` (96px from bottom) - 80px above ResourceMonitor
- **MemoryMonitor**: `bottom-28` (112px from bottom) - Above SuspensionIndicator
- **BatteryIndicator**: `bottom-32` (128px from bottom)
- **JobTimelinePanel**: `bottom-40` (160px from bottom) - 32px above BatteryIndicator
- **RestoreToast**: `bottom-52` (208px from bottom) - 48px above JobTimelinePanel

### Horizontal Spacing

- **Left side**: `left-4` (16px) and `left-6` (24px) - Proper spacing
- **Right side**: `right-4` (16px) and `right-6` (24px) - Proper spacing
- **Center**: `left-1/2 -translate-x-1/2` - Perfectly centered

### Z-Index Hierarchy

1. **z-[300]**: JobTimelinePanel (highest - always accessible)
2. **z-[250]**: RestoreToast (notifications)
3. **z-[120]**: SuspensionIndicator (important status)
4. **z-[110]**: ResourceMonitor (resource dashboard)
5. **z-[105]**: MemoryMonitor (memory stats)
6. **z-[104]**: BatteryIndicator (battery status)
7. **z-[60]**: RamSavedCounter (top-right)
8. **z-50**: RedixModeToggle (dev tools)

---

## Overlap Prevention

### ✅ Fixed Issues

1. **ResourceMonitor vs SuspensionIndicator**
   - **Before**: Both at `bottom-6 left-6` - Overlapped
   - **After**: ResourceMonitor `bottom-4`, SuspensionIndicator `bottom-24` - 80px separation

2. **BatteryIndicator vs JobTimelinePanel**
   - **Before**: Both at `bottom-6 right-6` - Overlapped
   - **After**: BatteryIndicator `bottom-32`, JobTimelinePanel `bottom-40` - 32px separation

3. **RestoreToast vs JobTimelinePanel**
   - **Before**: Both at `bottom-6 right-6` - Overlapped
   - **After**: RestoreToast `bottom-52`, JobTimelinePanel `bottom-40` - 48px separation

4. **RedixModeToggle vs JobTimelinePanel**
   - **Before**: RedixModeToggle `bottom-4 right-4`, JobTimelinePanel `bottom-6 right-6` - Close overlap
   - **After**: RedixModeToggle moved to `top-20 right-4` - No overlap

5. **MemoryMonitor vs ResourceMonitor**
   - **Before**: Potential overlap when both expanded
   - **After**: MemoryMonitor `bottom-28` (centered), ResourceMonitor `bottom-4 left-4` - No overlap

---

## Responsive Considerations

### Desktop Layout (`isDesktopLayout`)

- All fixed elements visible
- Proper spacing maintained
- No overlapping

### Mobile Layout

- Some elements may be hidden (`hidden md:flex` on BatteryIndicator)
- ResourceMonitor remains visible
- Spacing adjusted for smaller screens

### Fullscreen Mode

- ResourceMonitor hidden (`!isFullscreen` condition)
- Other overlays may be hidden based on mode
- Clean, distraction-free view

---

## Testing Checklist

- [x] ResourceMonitor doesn't overlap SuspensionIndicator
- [x] BatteryIndicator doesn't overlap JobTimelinePanel
- [x] RestoreToast doesn't overlap JobTimelinePanel
- [x] MemoryMonitor doesn't overlap ResourceMonitor
- [x] RedixModeToggle doesn't overlap any bottom elements
- [x] All elements have proper z-index hierarchy
- [x] Spacing is consistent and readable
- [x] Elements don't block important UI
- [x] Mobile layout works correctly
- [x] Fullscreen mode hides appropriate elements

---

## Future Improvements

1. **Collapsible Stack**: Right-side elements could stack/collapse when not in use
2. **Smart Positioning**: Auto-adjust positions based on screen size
3. **Overlay Manager**: Centralized system to manage all fixed overlays
4. **User Preferences**: Allow users to customize positions

---

**Last Updated**: Current
**Status**: ✅ All overlapping issues fixed
**Layout**: Properly spaced and non-overlapping
