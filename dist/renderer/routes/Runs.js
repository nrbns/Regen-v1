import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
export default function Runs() {
    const [runs, setRuns] = useState([]);
    useEffect(() => { (async () => { const list = await window.agent?.runs?.(); setRuns((list || [])); })(); }, []);
    return (_jsxs("div", { className: "p-4", children: [_jsx("h2", { className: "text-lg font-semibold mb-3", children: "Agent Runs" }), _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-neutral-400", children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "Goal" }), _jsx("th", { children: "Steps" }), _jsx("th", { children: "Started" }), _jsx("th", { children: "Status" })] }) }), _jsx("tbody", { children: runs.map(r => (_jsxs("tr", { className: "border-t border-neutral-800", children: [_jsx("td", { className: "py-2", children: _jsxs(Link, { className: "text-indigo-400", to: `/replay/${r.id}`, children: [r.id.slice(0, 8), "\u2026"] }) }), _jsx("td", { children: r.goal || '-' }), _jsx("td", { children: r.steps }), _jsx("td", { children: new Date(r.startedAt).toLocaleString() }), _jsx("td", { children: r.finishedAt ? 'done' : 'running' })] }, r.id))) })] })] }));
}
