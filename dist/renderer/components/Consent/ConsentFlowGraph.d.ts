import 'reactflow/dist/style.css';
import type { ConsentRecord } from '../../types/consent';
interface ConsentFlowGraphProps {
    records: ConsentRecord[];
    onApprove: (consentId: string) => Promise<void> | void;
    onRevoke: (consentId: string) => Promise<void> | void;
    loading?: boolean;
}
export declare function ConsentFlowGraph({ records, onApprove, onRevoke, loading }: ConsentFlowGraphProps): import("react/jsx-runtime").JSX.Element;
export {};
