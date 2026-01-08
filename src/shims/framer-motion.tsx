import React from 'react';

const passthrough = (tag: any) => {
  return (props: any) => {
    const { children, as, ...rest } = props;
    const Element: any = as || tag || 'div';
    return React.createElement(Element, rest, children);
  };
};

const handler: ProxyHandler<any> = {
  get(_, prop) {
    return passthrough(prop);
  },
};

export const motion: any = new Proxy({}, handler);
export const AnimatePresence = ({ children }: any) => <>{children}</>;
export const Reorder = {
  Group: ({ children }: any) => <>{children}</>,
  Item: ({ children }: any) => <>{children}</>,
};
export const useInView = () => false;

export type Variants = any;
export type HTMLMotionProps<T = any> = any;

export default motion;
