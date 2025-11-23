# Migration PR — Replace Hardcoded Tokens

## Summary

- **Which files were changed / why**
  <!-- List files and reason for migration -->

- **Old hardcoded values replaced (list examples)**
  <!-- Example: padding: '16px' → tokens.spacing(4) -->
  <!-- Example: color: '#ffffff' → tokens.color.text -->

- **Visual checks performed**
  - [ ] Storybook stories updated/verified
  - [ ] Playwright snapshots updated if intentionally changed
  - [ ] Visual regression tests pass

- **Accessibility checks**
  - [ ] axe-core tests pass locally
  - [ ] Keyboard navigation verified
  - [ ] Screen reader tested (if applicable)

- **Token usage**
  - [ ] Uses `useTokens()` hook OR CSS variables
  - [ ] No hardcoded colors/spacing left in changed files

## Checklist

- [ ] Uses `useTokens()` or CSS variables, no hardcoded colors/spacing left
- [ ] Storybook updated (new stories if UI changed)
- [ ] Playwright snapshots updated if intentionally changed
- [ ] Accessibility tests pass locally (`npm test src/ui/__tests__`)
- [ ] Unit tests pass
- [ ] Visual regression tests pass
- [ ] Lint passes (`npm run lint`)
- [ ] TypeScript check passes (`npm run build:types`)

## Before/After Examples

### Before

```tsx
<div style={{ padding: '16px', color: '#ffffff' }}>Content</div>
```

### After

```tsx
import { useTokens } from '../ui';

const tokens = useTokens();
<div style={{ padding: tokens.spacing(4), color: tokens.color.text }}>Content</div>;
```

## Testing Notes

<!-- Any specific testing scenarios or edge cases to verify -->

## Related Issues

<!-- Link related issues or design system tickets -->
