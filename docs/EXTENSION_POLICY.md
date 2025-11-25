# Extension Security & Whitelist

This document describes the guardrails for enabling third‑party extensions in the Regen Research alpha.

## Guiding Principles

1. **Opt‑in only** – extensions are disabled by default. Users must explicitly install and enable a package.
2. **Signed manifests** – every extension bundle must ship with a signed `manifest.json` that we can verify locally before loading.
3. **Least privilege** – extensions receive only the capabilities declared in the manifest and approved by users. No blanket `tabs` or `clipboard` access.
4. **Isolated execution** – scripts run inside sandboxed iframes/webviews with the `SAFE_IFRAME_SANDBOX` policy from `src/config/security.ts`.

## Allowed Origins & APIs

| Capability        | Allowed domains / APIs                                                     |
| ----------------- | -------------------------------------------------------------------------- |
| Extension updates | `https://extensions.regen.dev` (CDN)                                       |
| Runtime messaging | `regen://extensions/*`                                                     |
| Network requests  | Only `https://api.regen.dev` unless the manifest declares additional hosts |
| Storage           | Namespaced `chrome.storage.local` equivalent (no direct filesystem access) |
| Webviews/iframes  | Must use the sandbox attribute supplied by `SAFE_IFRAME_SANDBOX`           |

Any new domain or API must go through a security review before it is added to `TRUSTED_EXTENSION_URLS` in `src/config/security.ts`.

## Approval Workflow

1. **Submission** – developers provide a signed bundle + manifest + threat model.
2. **Static review** – automated checks verify CSP compliance, sandbox usage, and manifest scope.
3. **Manual QA** – security and product teams test the extension in a hardened profile.
4. **Whitelisting** – once approved, the extension ID is added to the production allow‑list and can be distributed via the official catalog.

## User Controls

- Users can inspect active extensions from Settings → Extensions.
- Each extension must expose a plain‑language explanation of the permissions it requires.
- Extensions can be disabled or removed at any time; removing an extension purges its stored data.

These policies will evolve as we approach the closed beta, but any new extension must comply with the above baseline to be considered for inclusion.
