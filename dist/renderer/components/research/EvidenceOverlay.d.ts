/**
 * EvidenceOverlay - Highlights evidence on source pages when citations are clicked
 */
import type { ResearchEvidence, ResearchSource } from '../../types/research';
interface EvidenceOverlayProps {
    evidence: ResearchEvidence[];
    sources: ResearchSource[];
    activeEvidenceId: string | null;
    onEvidenceClick?: (evidenceId: string) => void;
}
export declare function EvidenceOverlay({ evidence, sources, activeEvidenceId, onEvidenceClick: _onEvidenceClick, }: EvidenceOverlayProps): null;
export {};
