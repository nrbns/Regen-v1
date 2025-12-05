/**
 * Agent Mode Selector Component
 * Integrates multi-agent system into UI
 */
import { type AgentMode } from '../../core/agents/multiAgentSystem';
interface AgentModeSelectorProps {
    onAgentSelect?: (mode: AgentMode, capabilities: string[]) => void;
    defaultMode?: AgentMode;
}
export declare function AgentModeSelector({ onAgentSelect, defaultMode, }: AgentModeSelectorProps): import("react/jsx-runtime").JSX.Element;
export {};
