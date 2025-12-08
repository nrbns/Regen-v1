import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { safeErrorString } from '../utils/safeErrorSerializer';
function safeStringify(obj) {
    try {
        return JSON.stringify(obj, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                // Skip React elements and DOM nodes
                if (value.$$typeof || value.nodeType) {
                    return '[React/DOM Element]';
                }
            }
            return value;
        }, 2);
    }
    catch (_error) {
        return safeErrorString(obj);
    }
}
export default function Replay() {
    const { id } = useParams();
    const [run, setRun] = useState(null);
    useEffect(() => { (async () => { if (id)
        setRun(await window.agent?.getRun?.(id)); })(); }, [id]);
    if (!run)
        return _jsx("div", { className: "p-4", children: "Loading\u2026" });
    return (_jsxs("div", { className: "p-4 space-y-3", children: [_jsxs("h2", { className: "text-lg font-semibold", children: ["Replay ", id?.slice(0, 8), "\u2026"] }), _jsxs("div", { className: "text-sm text-neutral-300", children: ["Goal: ", (run.dsl?.goal) || '-'] }), _jsx("ol", { className: "space-y-1 text-sm", children: run.steps?.map((s, i) => (_jsxs("li", { className: "border border-neutral-800 rounded p-2", children: [_jsxs("div", { className: "font-medium", children: ["Step ", i + 1, ": ", s.skill || s.type] }), _jsx("pre", { className: "text-xs bg-neutral-900 rounded p-2 overflow-auto", children: safeStringify(s) })] }, i))) })] }));
}
