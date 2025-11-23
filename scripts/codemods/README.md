# Codemods

Automated code transformation scripts for migrating to design system tokens.

## Usage

### Replace Hardcoded Spacing

```bash
# Install jscodeshift if not already installed
npm install -g jscodeshift

# Run the codemod on a specific directory
npx jscodeshift -t scripts/codemods/replace-hardcoded-spacing.js src/modes/research

# Dry run (see what would change without modifying files)
npx jscodeshift -t scripts/codemods/replace-hardcoded-spacing.js --dry src
```

## Important Notes

1. **Review All Changes** - Codemods are helpers, not replacements for code review
2. **Run in Small Batches** - Test after each batch of changes
3. **Update Tests** - Run Storybook and tests after applying codemods
4. **Manual Cleanup** - Some patterns may need manual adjustment

## Current Codemods

- `replace-hardcoded-spacing.js` - Replaces `padding: '16px'` with `tokens.spacing(4)`

## Future Codemods

- Replace hardcoded colors
- Replace hardcoded font sizes
- Replace hardcoded border radius
