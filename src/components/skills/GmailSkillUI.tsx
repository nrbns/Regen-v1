/**
 * Gmail Skill UI Component
 * UI for composing emails and creating drafts with Gmail skill
 */

import { useState, useEffect } from 'react';
import { Mail, Send, FileText, X, Loader2 } from 'lucide-react';
import { getGmailSkill } from '../../services/skills/gmail/skill';
import {
  getAllTemplates,
  fillTemplate,
  type EmailTemplate,
} from '../../services/skills/gmail/templates';
import { extractPageContext } from '../../services/skills/gmail/contextExtractor';
import type { SkillContext } from '../../services/skills/types';
import { toast } from '../../utils/toast';
import { useMobileDetection } from '../../mobile';

interface GmailSkillUIProps {
  context?: SkillContext;
  onClose?: () => void;
}

export function GmailSkillUI({ context, onClose }: GmailSkillUIProps) {
  const { isMobile } = useMobileDetection();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [templates] = useState<EmailTemplate[]>(getAllTemplates());
  const [showTemplates, setShowTemplates] = useState(false);

  const gmailSkill = getGmailSkill();

  // Check authorization on mount
  useEffect(() => {
    checkAuthorization();
    loadPageContext();
  }, [context]);

  const checkAuthorization = async () => {
    try {
      const authorized = await gmailSkill.isAuthorized();
      setIsAuthorized(authorized);
    } catch {
      setIsAuthorized(false);
    }
  };

  const loadPageContext = async () => {
    if (!context) return;

    try {
      const pageContext = await extractPageContext(context);
      setSubject(pageContext.suggestedSubject);
      setBody(pageContext.suggestedBody);

      if (pageContext.suggestedRecipients && pageContext.suggestedRecipients.length > 0) {
        setTo(pageContext.suggestedRecipients[0]);
      }
    } catch (error) {
      console.error('Failed to extract page context:', error);
    }
  };

  const handleAuthorize = async () => {
    setIsAuthorizing(true);
    try {
      // TODO: Get OAuth config from settings
      const config = {
        clientId: process.env.VITE_GMAIL_CLIENT_ID || '',
        redirectUri: `${window.location.origin}/oauth/gmail/callback`,
      };

      await gmailSkill.initialize(config);
      await gmailSkill.authorize();
      setIsAuthorized(true);
      toast.success('Gmail authorized successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to authorize Gmail');
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleUseTemplate = (template: EmailTemplate) => {
    setSelectedTemplate(template);

    // Fill template with basic context
    const variables: Record<string, string> = {
      title: context?.pageTitle || 'Page',
      url: context?.pageUrl || '',
      name: 'Friend',
      topic: 'this',
      message: context?.selectedText || '',
    };

    const filled = fillTemplate(template, variables);
    setSubject(filled.subject);
    setBody(filled.body);
    setShowTemplates(false);
  };

  const handleCompose = async () => {
    if (!to || !subject) {
      toast.error('Please fill in To and Subject fields');
      return;
    }

    setIsComposing(true);
    try {
      const result = await gmailSkill.composeEmail(context || createDefaultContext(), {
        to: to.split(',').map(email => email.trim()),
        cc: cc ? cc.split(',').map(email => email.trim()) : undefined,
        bcc: bcc ? bcc.split(',').map(email => email.trim()) : undefined,
        subject,
        body,
      });

      if (result.success) {
        toast.success('Gmail compose opened');
        onClose?.();
      } else {
        toast.error(result.error || 'Failed to compose email');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to compose email');
    } finally {
      setIsComposing(false);
    }
  };

  const handleCreateDraft = async () => {
    if (!to || !subject) {
      toast.error('Please fill in To and Subject fields');
      return;
    }

    setIsComposing(true);
    try {
      const result = await gmailSkill.createDraft(context || createDefaultContext(), {
        to: to.split(',').map(email => email.trim()),
        cc: cc ? cc.split(',').map(email => email.trim()) : undefined,
        bcc: bcc ? bcc.split(',').map(email => email.trim()) : undefined,
        subject,
        body,
      });

      if (result.success) {
        toast.success('Draft created successfully');
        onClose?.();
      } else {
        toast.error(result.error || 'Failed to create draft');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create draft');
    } finally {
      setIsComposing(false);
    }
  };

  const createDefaultContext = (): SkillContext => ({
    skillId: 'regen-gmail',
    pageUrl: window.location.href,
    pageTitle: document.title,
    pageContent: document.body.innerText,
    permissions: [],
  });

  if (!isAuthorized) {
    return (
      <div className={`${isMobile ? 'p-4' : 'p-6'} rounded-lg border border-gray-700 bg-gray-900`}>
        <div className="mb-4 flex items-center gap-3">
          <Mail className="h-6 w-6 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Gmail Integration</h3>
        </div>
        <p className="mb-6 text-gray-400">
          Authorize Gmail to compose emails and create drafts from page content.
        </p>
        <button
          onClick={handleAuthorize}
          disabled={isAuthorizing}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isAuthorizing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Authorizing...
            </>
          ) : (
            <>
              <Mail className="h-5 w-5" />
              Authorize Gmail
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`${isMobile ? 'p-4' : 'p-6'} w-full max-w-2xl rounded-lg border border-gray-700 bg-gray-900`}
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="h-6 w-6 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Compose Email</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex min-h-[32px] min-w-[32px] items-center justify-center rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Template selector */}
      <div className="mb-4">
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300"
        >
          <FileText className="h-4 w-4" />
          {selectedTemplate ? `Template: ${selectedTemplate.name}` : 'Use Template'}
        </button>

        {showTemplates && (
          <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-700 bg-gray-800 p-3">
            {templates.map(template => (
              <button
                key={template.id}
                onClick={() => handleUseTemplate(template)}
                className="mb-1 w-full rounded p-2 text-left text-sm hover:bg-gray-700"
              >
                <div className="font-medium text-white">{template.name}</div>
                <div className="text-xs text-gray-400">{template.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">To</label>
          <input
            type="text"
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-base text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Cc (optional)</label>
          <input
            type="text"
            value={cc}
            onChange={e => setCc(e.target.value)}
            placeholder="cc@example.com"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-base text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Bcc (optional)</label>
          <input
            type="text"
            value={bcc}
            onChange={e => setBcc(e.target.value)}
            placeholder="bcc@example.com"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-base text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Email subject"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-base text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Body</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Email body"
            rows={8}
            className="w-full resize-y rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-base text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-3">
        <button
          onClick={handleCompose}
          disabled={isComposing}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isComposing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Opening...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              Compose in Gmail
            </>
          )}
        </button>
        <button
          onClick={handleCreateDraft}
          disabled={isComposing}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-gray-700 px-4 py-3 font-medium text-white transition-colors hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isComposing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <FileText className="h-5 w-5" />
              Create Draft
            </>
          )}
        </button>
      </div>
    </div>
  );
}
