# Playwright Visual Snapshots Guide

## Overview

Visual regression testing uses Playwright to capture screenshots of Storybook stories and compare them against baseline snapshots. This prevents unintended visual changes from being merged.

## Quick Start

### 1. Generate Baseline Snapshots

```bash
# Start Storybook
npx storybook dev

# In another terminal, generate snapshots
npm run visual:generate
```

This will:

- Run all visual tests
- Create snapshot images in `tests/visual/**/__snapshots__/`
- Save them for future comparisons

### 2. Commit Snapshots

```bash
git add tests/visual/**/__snapshots__/
git commit -m "chore: add visual regression baseline snapshots"
```

### 3. Run Tests

```bash
# Run visual tests (compares against baseline)
npm run test:visual
```

## When to Update Snapshots

Update snapshots when you **intentionally** change UI:

1. **Design system updates** - Changing tokens, spacing, colors
2. **Component refactoring** - Restructuring components
3. **New features** - Adding new UI elements
4. **Bug fixes** - Fixing visual bugs

### Update Process

```bash
# 1. Make your UI changes
# 2. Review the changes in Storybook
npx storybook dev

# 3. Update snapshots
npm run visual:generate

# 4. Review the new snapshots
# Check tests/visual/**/__snapshots__/

# 5. Commit
git add tests/visual/**/__snapshots__/
git commit -m "chore: update visual snapshots for [description]"
```

## Snapshot Locations

Snapshots are stored in:

```
tests/visual/
  └── __snapshots__/
      └── layoutengine.spec.ts-snapshots/
          ├── layoutengine-default.png
          ├── skeletoncard-default.png
          └── ...
```

## CI Integration

The CI workflow automatically:

1. Builds Storybook
2. Serves it locally
3. Runs visual tests
4. Fails PR if snapshots differ

### If CI Fails

1. **Check if change is intentional:**
   - Review the diff in CI artifacts
   - If intentional, update snapshots locally and commit

2. **If unintentional:**
   - Revert your changes
   - Fix the visual regression
   - Re-run tests

## Best Practices

1. **Review Before Committing** - Always review snapshot diffs before updating
2. **Small Changes** - Update snapshots in small, focused PRs
3. **Document Changes** - Include reason for snapshot updates in commit message
4. **Test Locally First** - Run visual tests locally before pushing

## Troubleshooting

### Snapshots Fail in CI

- **Storybook not building:** Check Storybook build logs
- **Flaky tests:** Add `waitForTimeout` for animations
- **Missing test IDs:** Ensure `data-testid` attributes are present

### Snapshots Look Different Locally vs CI

- **Font rendering:** Different OS may render fonts differently
- **Animation timing:** Use `prefers-reduced-motion` in tests
- **Browser version:** Ensure same Chromium version

### Storybook Not Found

```bash
# Make sure Storybook is running
npx storybook dev

# Or build static version
npx storybook build
npx http-server ./storybook-static -p 6006
```

## Maintenance

- **Regular Updates:** Update snapshots when design system evolves
- **Cleanup:** Remove snapshots for deleted stories
- **Review:** Periodically review snapshot quality

## Related Files

- `tests/visual/layoutengine.spec.ts` - Test cases
- `playwright.visual.config.ts` - Playwright config
- `.github/workflows/ci-visual.yml` - CI workflow
- `scripts/generate-visual-snapshots.js` - Snapshot generator
