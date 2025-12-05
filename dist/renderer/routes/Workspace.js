import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useParams } from 'react-router-dom';
export default function Workspace() {
    const { id } = useParams();
    return (_jsxs("div", { className: "p-4", children: [_jsxs("h2", { className: "text-lg font-semibold", children: ["Workspace ", id] }), _jsx("p", { className: "text-sm text-neutral-300", children: "Tabs and modes will appear here." })] }));
}
