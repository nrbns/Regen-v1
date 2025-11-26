# Visual Regression Tests Setup

## ✅ Configuration Complete

### Files Created

1. **`.storybook/main.ts`** - Storybook main configuration
   - Configured to find stories in both `tauri-migration/src` and `src` directories
   - Set up Vite builder with path aliases
   - Added essential addons (essentials, interactions, a11y)

2. **`.storybook/preview.ts`** - Storybook preview configuration
   - Loaded global CSS styles
   - Set dark theme as default
   - Configured fullscreen layout

3. **`tests/visual/skeleton-visual.spec.ts`** - Skeleton component visual tests
   - Tests Skeleton default variant
   - Tests SkeletonCard
   - Tests SkeletonText

4. **`tests/visual/layout-visual.spec.ts`** - Layout component visual tests
   - Tests LayoutEngine default
   - Tests LayoutEngine with sidebar

5. **`tests/visual/topbar-visual.spec.ts`** - TopBar component visual tests
   - Tests TopBar default

### Playwright Visual Config

Updated `playwright.visual.config.ts`:

- Configured to use Storybook at `http://localhost:6006`
- In CI, uses static Storybook build with http-server
- In local dev, starts Storybook dev server automatically

### Running Tests

```bash
# Build Storybook first
npm run storybook:build

# Run visual regression tests
npm run test:visual

# Update snapshots (if UI changes intentionally)
npm run test:visual:update
```

### CI Integration

Visual regression tests are configured in `.github/workflows/ci.yml`:

- Runs after Storybook build
- Uses static Storybook build in CI
- Uploads visual diffs as artifacts

### Status

✅ **Visual regression tests configured and ready**
