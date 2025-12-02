/**
 * Central security directives shared across renderer surfaces.
 */

// Completely open CSP - no restrictions, allows all websites to load
// User requested: "don't restrict any website, explore every website"
// Note: frame-ancestors is only valid in HTTP headers, not meta tags
// Note: navigate-to is not a valid CSP directive
export const CSP_DIRECTIVE = [
  "default-src * 'unsafe-inline' 'unsafe-eval' 'unsafe-hashes' data: blob: javascript:;",
  'base-uri *;',
  'img-src * data: blob:;',
  'font-src * data:;',
  "style-src * 'unsafe-inline' 'unsafe-hashes';",
  "script-src * 'unsafe-inline' 'unsafe-eval' 'unsafe-hashes' javascript:;",
  'connect-src * wss: ws:;',
  'frame-src *;',
  'media-src * data: blob:;',
  'object-src *;',
  'form-action * javascript:;',
  'worker-src * blob:;',
  'manifest-src *;',
].join(' ');

// Completely open iframe sandbox - no restrictions, allows all websites to work
// User requested: "explore every website"
// Note: allow-storage-access is not a valid sandbox flag (use allow-storage-access-by-user-activation only)
export const SAFE_IFRAME_SANDBOX =
  'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-pointer-lock allow-top-navigation allow-top-navigation-by-user-activation allow-downloads allow-modals allow-presentation allow-orientation-lock allow-pointer-lock allow-storage-access-by-user-activation';

export const TRUSTED_EXTENSION_URLS = [
  'regen://extensions',
  'https://extensions.regen.dev',
  'https://cdn.regen.dev/extensions',
];
