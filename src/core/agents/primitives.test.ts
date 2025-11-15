/**
 * Agent Primitives Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  readElement,
  clickElement,
  fillInput,
  readText,
  readPageText,
  scrollPage,
  waitForPageReady,
  getPageInfo,
  type DOMSelector,
} from './primitives';

describe('Agent Primitives', () => {
  let mockDocument: Document;
  let mockElement: HTMLElement;

  beforeEach(() => {
    // Create mock document
    mockDocument = document.implementation.createHTMLDocument('Test');
    mockElement = mockDocument.createElement('button');
    mockElement.id = 'test-button';
    mockElement.className = 'test-class';
    mockElement.textContent = 'Test Button';
    mockElement.setAttribute('data-test', 'value');
    mockDocument.body.appendChild(mockElement);
  });

  describe('readElement', () => {
    it('should read element by id', async () => {
      const selector: DOMSelector = { type: 'id', value: 'test-button' };
      const info = await readElement(selector, mockDocument);

      expect(info).not.toBeNull();
      expect(info?.tagName).toBe('button');
      expect(info?.id).toBe('test-button');
      expect(info?.text).toBe('Test Button');
    });

    it('should read element by class', async () => {
      const selector: DOMSelector = { type: 'class', value: 'test-class' };
      const info = await readElement(selector, mockDocument);

      expect(info).not.toBeNull();
      expect(info?.className).toBe('test-class');
    });

    it('should read element by CSS selector', async () => {
      const selector: DOMSelector = { type: 'selector', value: 'button#test-button' };
      const info = await readElement(selector, mockDocument);

      expect(info).not.toBeNull();
      expect(info?.tagName).toBe('button');
    });

    it('should return null for non-existent element', async () => {
      const selector: DOMSelector = { type: 'id', value: 'non-existent' };
      const info = await readElement(selector, mockDocument);

      expect(info).toBeNull();
    });
  });

  describe('readText', () => {
    it('should read text from element', async () => {
      const selector: DOMSelector = { type: 'id', value: 'test-button' };
      const text = await readText(selector, mockDocument);

      expect(text).toBe('Test Button');
    });

    it('should return null for non-existent element', async () => {
      const selector: DOMSelector = { type: 'id', value: 'non-existent' };
      const text = await readText(selector, mockDocument);

      expect(text).toBeNull();
    });
  });

  describe('readPageText', () => {
    it('should read all text from page', () => {
      const text = readPageText(mockDocument);
      expect(text).toContain('Test Button');
    });
  });

  describe('getPageInfo', () => {
    it('should get page information', () => {
      const info = getPageInfo(mockDocument);
      
      expect(info).toHaveProperty('url');
      expect(info).toHaveProperty('title');
      expect(info).toHaveProperty('viewport');
      expect(info).toHaveProperty('readyState');
    });
  });

  describe('fillInput', () => {
    it('should fill input field', async () => {
      const input = mockDocument.createElement('input');
      input.id = 'test-input';
      input.type = 'text';
      mockDocument.body.appendChild(input);

      const selector: DOMSelector = { type: 'id', value: 'test-input' };
      const result = await fillInput(selector, 'test value', {}, mockDocument);

      expect(result).toBe(true);
      expect((input as HTMLInputElement).value).toBe('test value');
    });

    it('should clear input when clear option is set', async () => {
      const input = mockDocument.createElement('input');
      input.id = 'test-input-2';
      input.type = 'text';
      (input as HTMLInputElement).value = 'old value';
      mockDocument.body.appendChild(input);

      const selector: DOMSelector = { type: 'id', value: 'test-input-2' };
      await fillInput(selector, 'new value', { clear: true }, mockDocument);

      expect((input as HTMLInputElement).value).toBe('new value');
    });
  });

  describe('clickElement', () => {
    it('should click element', async () => {
      let clicked = false;
      mockElement.addEventListener('click', () => {
        clicked = true;
      });

      const selector: DOMSelector = { type: 'id', value: 'test-button' };
      const result = await clickElement(selector, {}, mockDocument);

      expect(result).toBe(true);
      expect(clicked).toBe(true);
    });
  });

  describe('scrollPage', () => {
    it('should scroll page down', async () => {
      const scrollBySpy = vi.spyOn(window, 'scrollBy');
      
      await scrollPage('down', 100);

      expect(scrollBySpy).toHaveBeenCalled();
      scrollBySpy.mockRestore();
    });

    it('should scroll to top', async () => {
      const scrollToSpy = vi.spyOn(window, 'scrollTo');
      
      await scrollPage('top');

      expect(scrollToSpy).toHaveBeenCalled();
      scrollToSpy.mockRestore();
    });
  });

  describe('waitForPageReady', () => {
    it('should return true when page is ready', async () => {
      const ready = await waitForPageReady(mockDocument, 1000);
      expect(ready).toBe(true);
    });
  });
});

