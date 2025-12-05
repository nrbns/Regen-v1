/**
 * AnswerWithCitations - Displays research summary with inline citations
 */
import type { ResearchInlineEvidence, ResearchCitation, ResearchSource } from '../../types/research';
interface AnswerWithCitationsProps {
    summary: string;
    citations: ResearchCitation[];
    inlineEvidence?: ResearchInlineEvidence[];
    sources: ResearchSource[];
    activeSourceId: string | null;
    onActivate: (sourceKey: string) => void;
    onOpenSource: (url: string) => void;
    onExport?: (format: 'markdown' | 'pdf') => void;
}
export declare function AnswerWithCitations({ summary, citations, inlineEvidence, sources, activeSourceId, onActivate, onOpenSource, onExport, }: AnswerWithCitationsProps): import("react/jsx-runtime").JSX.Element;
export {};
