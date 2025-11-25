/**
 * Central security directives shared across renderer surfaces.
 */

// Relaxed CSP for web build - allows all sites to load
export const CSP_DIRECTIVE = [
  "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;",
  'base-uri *;',
  'img-src * data: blob:;',
  'font-src * data:;',
  "style-src * 'unsafe-inline';",
  "script-src * 'unsafe-inline' 'unsafe-eval';",
  'connect-src *;',
  'frame-src *;',
  'media-src * data: blob:;',
  'object-src *;',
  'form-action *;',
].join(' ');

export const SAFE_IFRAME_SANDBOX =
  'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-pointer-lock allow-top-navigation-by-user-activation allow-downloads allow-modals allow-presentation';

export const TRUSTED_EXTENSION_URLS = [
  'regen://extensions',
  'https://extensions.regen.dev',
  'https://cdn.regen.dev/extensions',
];
