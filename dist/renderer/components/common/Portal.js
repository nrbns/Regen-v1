import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
export function Portal({ children, containerId = 'portal-root' }) {
    const [element, setElement] = useState(null);
    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }
        let container = document.getElementById(containerId);
        let created = false;
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            document.body.appendChild(container);
            created = true;
        }
        setElement(container);
        return () => {
            if (created && container?.parentNode) {
                container.parentNode.removeChild(container);
            }
        };
    }, [containerId]);
    if (!element) {
        return null;
    }
    return createPortal(children, element);
}
