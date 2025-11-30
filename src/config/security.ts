/**
 * Central security directives shared across renderer surfaces.
 */

// Relaxed CSP for web build - allows all sites to load
// This is permissive to avoid blocking legitimate sites like Zerodha and YouTube
export const CSP_DIRECTIVE = [
  "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;",
  'base-uri *;',
  'img-src * data: blob:;',
  'font-src * data:;',
  "style-src * 'unsafe-inline';",
  "script-src * 'unsafe-inline' 'unsafe-eval';",
  'connect-src * wss: ws:;',
  'frame-src *;',
  'frame-ancestors *;',
  'media-src * data: blob:;',
  'object-src *;',
  'form-action *;',
  'worker-src * blob:;',
  'manifest-src *;',
].join(' ');

// More permissive sandbox for web builds - allows sites to load properly
export const SAFE_IFRAME_SANDBOX =
  'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-pointer-lock allow-top-navigation allow-top-navigation-by-user-activation allow-downloads allow-modals allow-presentation allow-orientation-lock allow-pointer-lock';

export const TRUSTED_EXTENSION_URLS = [
  'regen://extensions',
  'https://extensions.regen.dev',
  'https://cdn.regen.dev/extensions',
];
