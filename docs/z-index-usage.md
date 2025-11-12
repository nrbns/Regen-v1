# Z-Index Usage Guidelines

This document defines the z-index contract for OmniBrowser to prevent UI overlap issues.

## Z-Index Scale

The z-index scale is defined in `tailwind.config.ts` and should be used via Tailwind classes:

```typescript
z-base          // 0   - Base content
z-content       // 1   - Regular content
z-nav           // 10  - Navigation bars
z-header        // 20  - Top navigation
z-status        // 30  - Status bars
z-dropdown      // 30  - Dropdown menus
z-popover       // 40  - Popovers, hover cards
z-tooltip       // 45  - Tooltips
z-overlay       // 50  - Non-modal overlays
z-overlayBackdrop // 60 - Overlay backdrops
z-modal         // 100 - Modal dialogs
z-modalBackdrop // 110 - Modal backdrops
z-modalContent  // 120 - Modal content
z-critical      // 200 - Critical alerts
z-onboarding    // 210 - Onboarding tours
z-tour          // 220 - Interactive tours
z-max           // 9999 - Emergency, always-on-top
```

## Portal Root Stacking Context

All modals, overlays, and popovers **must** be rendered via the `Portal` component, which mounts to `#portal-root`. This ensures:

1. Proper stacking context isolation
2. No z-index conflicts with webview content
3. Consistent layering across the app

## Usage Rules

### ✅ DO

- Use Tailwind z-index tokens: `z-modal`, `z-overlay`, etc.
- Wrap all modals/overlays in `<Portal>` component
- Use semantic tokens (e.g., `z-modal` not `z-[100]`)

### ❌ DON'T

- Use hardcoded z-index values like `z-[1030]` or `z-[1000]`
- Render modals directly in component tree (always use Portal)
- Mix z-index values from different scales

## Component Examples

### Modal Dialog
```tsx
<Portal>
  <div className="fixed inset-0 z-modalBackdrop bg-black/70" />
  <div className="fixed inset-0 z-modalContent flex items-center justify-center">
    <div className="bg-gray-900 rounded-xl p-6">
      {/* Modal content */}
    </div>
  </div>
</Portal>
```

### Dropdown Menu
```tsx
<div className="relative">
  <button>Menu</button>
  <Portal>
    <div className="absolute right-0 top-full mt-2 z-dropdown bg-gray-900 rounded-lg shadow-xl">
      {/* Menu items */}
    </div>
  </Portal>
</div>
```

### Overlay
```tsx
<Portal>
  <div className="fixed inset-0 z-overlay flex items-center justify-center">
    <div className="z-overlayBackdrop fixed inset-0 bg-black/60" />
    <div className="relative z-overlayContent">
      {/* Overlay content */}
    </div>
  </div>
</Portal>
```

## Migration Guide

If you find hardcoded z-index values, migrate them to use Tailwind tokens:

| Old Value | New Token | Use Case |
|-----------|-----------|----------|
| `z-[60]` | `z-overlayBackdrop` | Overlay backdrops |
| `z-[70]` | `z-overlay` | Non-modal overlays |
| `z-[100]` | `z-modal` | Modal dialogs |
| `z-[1000]` | `z-onboarding` | Onboarding tours |
| `z-[9998]` | `z-max` | Emergency overlays |

## Testing

To verify z-index contract:

1. Open multiple overlays simultaneously
2. Verify no UI element appears behind webview
3. Check that modals appear above all other content
4. Test with different screen sizes

## Related Files

- `tailwind.config.ts` - Z-index token definitions
- `src/components/common/Portal.tsx` - Portal component
- `index.html` - Portal root element (`#portal-root`)
- `src/styles/globals.css` - Portal root CSS

