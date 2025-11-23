/**
 * Codemod: Replace Hardcoded Spacing with Tokens
 *
 * Usage:
 *   npx jscodeshift -t scripts/codemods/replace-hardcoded-spacing.js src
 *
 * NOTE: This is intentionally conservative — only replaces numeric literal px values inside style objects.
 * Review each change before committing.
 */

export default function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  // Mapping of pixel values to spacing token indices
  const spacingMap = {
    4: 1, // xs
    8: 2, // sm
    12: 3, // md
    16: 4, // lg
    24: 6, // xl
    32: 8, // 2xl
  };

  let hasChanges = false;

  // Find style={{ padding: '16px' }} or style={{ padding: 16 }}
  root
    .find(j.JSXAttribute, {
      name: { type: 'JSXIdentifier', name: 'style' },
    })
    .forEach(path => {
      const val = path.node.value;
      if (!val || val.type !== 'JSXExpressionContainer') return;

      const obj = val.expression;
      if (obj && obj.type === 'ObjectExpression') {
        obj.properties.forEach(prop => {
          if (prop.key && prop.key.name && ['padding', 'margin', 'gap'].includes(prop.key.name)) {
            if (prop.value.type === 'Literal') {
              const raw = String(prop.value.value);
              const px = parseInt(raw.replace('px', ''), 10) || parseInt(raw, 10);

              if (spacingMap[px]) {
                // Replace with tokens.spacing(n)
                prop.value = j.memberExpression(
                  j.identifier('tokens'),
                  j.callExpression(j.identifier('spacing'), [j.literal(spacingMap[px])])
                );
                hasChanges = true;
              }
            } else if (prop.value.type === 'TemplateLiteral') {
              // Handle template literals like `16px`
              const quasis = prop.value.quasis;
              if (quasis && quasis.length === 1) {
                const templateValue = quasis[0].value.cooked || quasis[0].value.raw;
                const px = parseInt(templateValue.replace('px', ''), 10);

                if (spacingMap[px]) {
                  prop.value = j.memberExpression(
                    j.identifier('tokens'),
                    j.callExpression(j.identifier('spacing'), [j.literal(spacingMap[px])])
                  );
                  hasChanges = true;
                }
              }
            }
          }
        });
      }
    });

  // Also find className with hardcoded spacing (Tailwind classes)
  // This is more complex and would need Tailwind config, so we skip for now

  if (hasChanges) {
    // Ensure useTokens is imported if not already present
    const imports = root.find(j.ImportDeclaration);
    const hasTokensImport = imports.some(path => {
      const source = path.node.source.value;
      return source.includes('ui') || source.includes('tokens');
    });

    if (!hasTokensImport) {
      // Add import - this is a simple heuristic, may need adjustment
      const firstImport = imports.at(0);
      if (firstImport.length > 0) {
        firstImport.insertAfter(
          j.importDeclaration([j.importSpecifier(j.identifier('useTokens'))], j.literal('../ui'))
        );
      }
    }
  }

  return root.toSource();
}
