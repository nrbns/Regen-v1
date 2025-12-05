/**
 * Document Editing Commands for Command Palette
 * Integrates with GlobalSearch or standalone command system
 */
import { FileText, Sparkles, Languages, FileCheck, Table } from 'lucide-react';
export function getDocumentCommands(navigate) {
    return [
        {
            id: 'doc-edit-open',
            title: 'Open Document Editor',
            description: 'Open the document auto-edit interface',
            icon: FileText,
            action: () => navigate('/doc-editor'),
            keywords: ['document', 'edit', 'doc', 'file', 'word', 'pdf', 'excel'],
            category: 'document',
        },
        {
            id: 'doc-rewrite',
            title: 'Rewrite Document',
            description: 'AI-powered document rewriting',
            icon: Sparkles,
            action: () => {
                navigate('/doc-editor');
                // Trigger rewrite task after navigation
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('doc-command', {
                        detail: { task: 'rewrite' },
                    }));
                }, 500);
            },
            keywords: ['rewrite', 'rephrase', 'edit', 'improve'],
            category: 'document',
        },
        {
            id: 'doc-grammar',
            title: 'Fix Grammar',
            description: 'Fix grammar and spelling errors',
            icon: FileCheck,
            action: () => {
                navigate('/doc-editor');
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('doc-command', {
                        detail: { task: 'grammar' },
                    }));
                }, 500);
            },
            keywords: ['grammar', 'spell', 'check', 'fix', 'correct'],
            category: 'document',
        },
        {
            id: 'doc-translate',
            title: 'Translate Document',
            description: 'Translate document to another language',
            icon: Languages,
            action: () => {
                navigate('/doc-editor');
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('doc-command', {
                        detail: { task: 'translate' },
                    }));
                }, 500);
            },
            keywords: ['translate', 'language', 'convert', 'hindi', 'english'],
            category: 'document',
        },
        {
            id: 'doc-excel-normalize',
            title: 'Normalize Excel Data',
            description: 'Clean and normalize spreadsheet data',
            icon: Table,
            action: () => {
                navigate('/doc-editor');
                setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('doc-command', {
                        detail: { task: 'normalize' },
                    }));
                }, 500);
            },
            keywords: ['excel', 'normalize', 'clean', 'spreadsheet', 'data'],
            category: 'document',
        },
    ];
}
