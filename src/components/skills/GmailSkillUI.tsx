/**
 * Gmail Skill UI Component
 * UI for composing emails and creating drafts with Gmail skill
 */

import { useState, useEffect } from 'react';
import { Mail, Send, FileText, X, Loader2 } from 'lucide-react';
import { getGmailSkill } from '../../services/skills/gmail/skill';
import { getAllTemplates, fillTemplate, type EmailTemplate } from '../../services/skills/gmail/templates';
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
      <div className={`${isMobile ? 'p-4' : 'p-6'} bg-gray-900 rounded-lg border border-gray-700`}>
        <div className="flex items-center gap-3 mb-4">
          <Mail className="w-6 h-6 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Gmail Integration</h3>
        </div>
        <p className="text-gray-400 mb-6">
          Authorize Gmail to compose emails and create drafts from page content.
        </p>
        <button
          onClick={handleAuthorize}
          disabled={isAuthorizing}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {isAuthorizing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Authorizing...
            </>
          ) : (
            <>
              <Mail className="w-5 h-5" />
              Authorize Gmail
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'p-4' : 'p-6'} bg-gray-900 rounded-lg border border-gray-700 max-w-2xl w-full`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Mail className="w-6 h-6 text-indigo-400" />
          <h3 className="text-lg font-semibold text-white">Compose Email</h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800 min-w-[32px] min-h-[32px] flex items-center justify-center"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Template selector */}
      <div className="mb-4">
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          {selectedTemplate ? `Template: ${selectedTemplate.name}` : 'Use Template'}
        </button>
        
        {showTemplates && (
          <div className="mt-2 p-3 bg-gray-800 rounded-lg border border-gray-700 max-h-48 overflow-y-auto">
            {templates.map(template => (
              <button
                key={template.id}
                onClick={() => handleUseTemplate(template)}
                className="w-full text-left p-2 hover:bg-gray-700 rounded text-sm mb-1"
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
          <label className="block text-sm font-medium text-gray-300 mb-1">To</label>
          <input
            type="text"
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-base"
            autoComplete="email"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Cc (optional)</label>
          <input
            type="text"
            value={cc}
            onChange={e => setCc(e.target.value)}
            placeholder="cc@example.com"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Bcc (optional)</label>
          <input
            type="text"
            value={bcc}
            onChange={e => setBcc(e.target.value)}
            placeholder="bcc@example.com"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Email subject"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-base"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Body</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Email body"
            rows={8}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-y text-base"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={handleCompose}
          disabled={isComposing}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {isComposing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Opening...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Compose in Gmail
            </>
          )}
        </button>
        <button
          onClick={handleCreateDraft}
          disabled={isComposing}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {isComposing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <FileText className="w-5 h-5" />
              Create Draft
            </>
          )}
        </button>
      </div>
    </div>
  );
}

