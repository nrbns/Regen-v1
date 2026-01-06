import React from 'react';

// Minimal icon shim: returns simple span placeholders to avoid large icon library in v1
function IconPlaceholder({ title }: { title?: string }) {
  return <span aria-hidden="true" style={{ display: 'inline-block', width: 16, height: 16 }} />;
}

const handler: ProxyHandler<any> = {
  get: (target, name) => {
    if (name === 'default') return target;
    return (props: any) => React.createElement(IconPlaceholder, props);
  },
};

const proxy = new Proxy({}, handler);
export default proxy;
export const Send = (props: any) => <IconPlaceholder {...props} />;
export const Loader2 = (props: any) => <IconPlaceholder {...props} />;
export const Shield = (props: any) => <IconPlaceholder {...props} />;
export const ShieldCheck = (props: any) => <IconPlaceholder {...props} />;
export const ShieldOff = (props: any) => <IconPlaceholder {...props} />;
export const RefreshCw = (props: any) => <IconPlaceholder {...props} />;
export const Server = (props: any) => <IconPlaceholder {...props} />;
export const Clock = (props: any) => <IconPlaceholder {...props} />;
export const CheckCircle2 = (props: any) => <IconPlaceholder {...props} />;
export const XCircle = (props: any) => <IconPlaceholder {...props} />;
export const Loader = (props: any) => <IconPlaceholder {...props} />;
export const Sparkles = (props: any) => <IconPlaceholder {...props} />;
export const Bot = (props: any) => <IconPlaceholder {...props} />;
export const SendIcon = (props: any) => <IconPlaceholder {...props} />;
