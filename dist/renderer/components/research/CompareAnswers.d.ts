import type { ComparedAnswer } from '../../state/researchCompareStore';
type CompareAnswersProps = {
    open: boolean;
    answers: ComparedAnswer[];
    selectedIds: string[];
    onToggleSelect: (id: string) => void;
    onClose: () => void;
    onRemove: (id: string) => void;
};
export declare function CompareAnswersPanel({ open, answers, selectedIds, onToggleSelect, onClose, onRemove, }: CompareAnswersProps): import("react/jsx-runtime").JSX.Element;
export {};
