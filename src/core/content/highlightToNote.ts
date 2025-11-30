/**
 * Highlight to Note Workflow - Real-time text selection → note creation
 */

import { SessionWorkspace } from '../workspace/SessionWorkspace';

export class HighlightToNote {
  private static selectionListener: ((e: MouseEvent) => void) | null = null;
  private static isEnabled = false;

  /**
   * Enable highlight → note workflow
   */
  static enable() {
    if (this.isEnabled) return;

    this.isEnabled = true;
    this.selectionListener = this.handleSelection.bind(this);
    document.addEventListener('mouseup', this.selectionListener);

    // Add context menu option
    this.addContextMenu();
  }

  /**
   * Disable highlight → note workflow
   */
  static disable() {
    if (!this.isEnabled) return;

    this.isEnabled = false;
    if (this.selectionListener) {
      document.removeEventListener('mouseup', this.selectionListener);
      this.selectionListener = null;
    }

    this.removeContextMenu();
  }

  /**
   * Handle text selection
   */
  private static handleSelection(e: MouseEvent) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const text = selection.toString().trim();
    if (text.length < 10) return; // Minimum 10 characters

    // Show floating action button
    this.showFloatingButton(selection, text, e);
  }

  /**
   * Show floating action button for creating note
   */
  private static showFloatingButton(selection: Selection, text: string, _event: MouseEvent) {
    // Remove existing button
    const existing = document.getElementById('regen-highlight-button');
    if (existing) existing.remove();

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const button = document.createElement('div');
    button.id = 'regen-highlight-button';
    button.innerHTML = `
      <div style="
        position: fixed;
        left: ${rect.right + 10}px;
        top: ${rect.top}px;
        background: linear-gradient(135deg, #8b5cf6, #ec4899);
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 999999;
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        animation: slideIn 0.2s ease-out;
      ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        Create Note
      </div>
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateX(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
    `;
    document.head.appendChild(style);

    button.addEventListener('click', () => {
      this.createNoteFromSelection(text, selection);
      button.remove();
      style.remove();
      window.getSelection()?.removeAllRanges();
    });

    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (button.parentNode) {
        button.remove();
        style.remove();
      }
    }, 5000);

    document.body.appendChild(button);
  }

  /**
   * Create note from text selection
   */
  private static async createNoteFromSelection(text: string, selection: Selection) {
    const url = window.location.href;
    const range = selection.getRangeAt(0);

    // Get surrounding context (currently unused but may be used for AI context)
    const _container = range.commonAncestorContainer;

    // Show note creation dialog
    const noteContent = await this.showNoteDialog(text, url);

    if (!noteContent) return; // User cancelled

    // Create highlight
    const highlight = SessionWorkspace.addHighlight({
      url,
      text,
      note: noteContent.note || undefined,
    });

    // Create note
    const note = SessionWorkspace.addNote({
      content: noteContent.note || text,
      url,
      selection: text,
      tags: noteContent.tags,
    });

    // Show success notification
    this.showNotification('Note created!', 'success');

    return { highlight, note };
  }

  /**
   * Show note creation dialog
   */
  private static showNoteDialog(
    selection: string,
    url: string
  ): Promise<{ note: string; tags?: string[] } | null> {
    return new Promise(resolve => {
      // Remove existing dialog
      const existing = document.getElementById('regen-note-dialog');
      if (existing) existing.remove();

      const dialog = document.createElement('div');
      dialog.id = 'regen-note-dialog';
      dialog.innerHTML = `
        <div style="
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: #1a1d28;
          border: 2px solid #8b5cf6;
          border-radius: 16px;
          padding: 24px;
          z-index: 1000000;
          min-width: 400px;
          max-width: 600px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        ">
          <h3 style="color: white; margin: 0 0 16px 0; font-size: 18px; font-weight: 600;">
            Create Note from Selection
          </h3>
          <div style="
            background: #252836;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 16px;
            border-left: 4px solid #8b5cf6;
          ">
            <p style="color: #a0a0a0; margin: 0; font-size: 14px; line-height: 1.5;">
              ${selection.slice(0, 200)}${selection.length > 200 ? '...' : ''}
            </p>
            <a href="${url}" target="_blank" style="
              color: #8b5cf6;
              font-size: 12px;
              text-decoration: none;
              margin-top: 8px;
              display: block;
            ">${url}</a>
          </div>
          <textarea
            id="regen-note-content"
            placeholder="Add your note..."
            style="
              width: 100%;
              min-height: 120px;
              background: #252836;
              color: white;
              border: 1px solid #3a3d4a;
              border-radius: 8px;
              padding: 12px;
              font-size: 14px;
              font-family: inherit;
              resize: vertical;
              margin-bottom: 12px;
            "
          ></textarea>
          <input
            id="regen-note-tags"
            type="text"
            placeholder="Tags (comma-separated)"
            style="
              width: 100%;
              background: #252836;
              color: white;
              border: 1px solid #3a3d4a;
              border-radius: 8px;
              padding: 10px;
              font-size: 14px;
              margin-bottom: 16px;
            "
          />
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button
              id="regen-note-cancel"
              style="
                background: #3a3d4a;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
              "
            >
              Cancel
            </button>
            <button
              id="regen-note-save"
              style="
                background: linear-gradient(135deg, #8b5cf6, #ec4899);
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 600;
              "
            >
              Save Note
            </button>
          </div>
        </div>
      `;

      // Add backdrop
      const backdrop = document.createElement('div');
      backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        z-index: 999999;
      `;

      backdrop.addEventListener('click', () => {
        dialog.remove();
        backdrop.remove();
        resolve(null);
      });

      const cancelBtn = dialog.querySelector('#regen-note-cancel');
      const saveBtn = dialog.querySelector('#regen-note-save');
      const noteContent = dialog.querySelector('#regen-note-content') as HTMLTextAreaElement;
      const tagsInput = dialog.querySelector('#regen-note-tags') as HTMLInputElement;

      cancelBtn?.addEventListener('click', () => {
        dialog.remove();
        backdrop.remove();
        resolve(null);
      });

      saveBtn?.addEventListener('click', () => {
        const content = noteContent.value.trim() || selection;
        const tags = tagsInput.value
          .split(',')
          .map(t => t.trim())
          .filter(t => t.length > 0);

        dialog.remove();
        backdrop.remove();
        resolve({ note: content, tags: tags.length > 0 ? tags : undefined });
      });

      // Close on Escape
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          dialog.remove();
          backdrop.remove();
          document.removeEventListener('keydown', handleEscape);
          resolve(null);
        }
      };
      document.addEventListener('keydown', handleEscape);

      document.body.appendChild(backdrop);
      document.body.appendChild(dialog);

      // Focus textarea
      setTimeout(() => noteContent?.focus(), 100);
    });
  }

  /**
   * Show notification
   */
  private static showNotification(message: string, type: 'success' | 'error' = 'success') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: ${type === 'success' ? '#10b981' : '#ef4444'};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 1000001;
      font-size: 14px;
      font-weight: 500;
      animation: slideUp 0.3s ease-out;
    `;
    notification.textContent = message;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideUp 0.3s ease-out reverse';
      setTimeout(() => {
        notification.remove();
        style.remove();
      }, 300);
    }, 3000);
  }

  /**
   * Add context menu option
   */
  private static addContextMenu() {
    // Context menu is handled by browser, but we can add a custom one
    document.addEventListener('contextmenu', _e => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        // Custom context menu could be added here
      }
    });
  }

  /**
   * Remove context menu
   */
  private static removeContextMenu() {
    // Cleanup if needed
  }
}
