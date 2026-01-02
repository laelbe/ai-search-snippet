/**
 * Chat Page Snippet
 * A full-page chat interface with history support
 */

import type { Client } from '../api/index.ts';
import { chatStyles } from '../styles/chat.ts';
import { baseStyles } from '../styles/theme.ts';
import type { SearchSnippetProps } from '../types/index.ts';
import {
  createClient,
  createCustomEvent,
  parseAttribute,
} from '../utils/index.ts';
import type { Message } from './chat-view.ts';
import { ChatView } from './chat-view.ts';

const COMPONENT_NAME = 'chat-page-snippet';

export class ChatPageSnippet extends HTMLElement {
  private shadow: ShadowRoot;
  private client: Client | null = null;
  private chatView: ChatView | null = null;
  private container: HTMLElement | null = null;
  private history: Message[] = [];

  static get observedAttributes(): string[] {
    return ['api-url', 'placeholder', 'theme'];
  }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.loadHistory();
  }

  connectedCallback(): void {
    this.render();
    this.initializeClient();
    this.setupView();
    this.dispatchEvent(createCustomEvent('ready', undefined));
  }

  disconnectedCallback(): void {
    this.saveHistory();
    this.cleanup();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (oldValue === newValue) return;

    if (name === 'api-url') {
      this.initializeClient();
      this.setupView();
    } else if (name === 'theme') {
      // Theme changes are handled automatically by CSS :host([theme]) selectors
      this.updateTheme(newValue);
    }
  }

  private getProps(): SearchSnippetProps {
    return {
      apiUrl: parseAttribute(this.getAttribute('api-url'), 'http://localhost:3000'),
      placeholder: parseAttribute(this.getAttribute('placeholder'), 'Type a message...'),
      theme: parseAttribute(this.getAttribute('theme'), 'auto') as 'light' | 'dark' | 'auto',
    };
  }

  private initializeClient(): void {
    const props = this.getProps();

    if (!props.apiUrl) {
      console.error('ChatPageSnippet: api-url attribute is required');
      return;
    }

    try {
      this.client = createClient(props.apiUrl);
    } catch (error) {
      console.error('ChatPageSnippet:', error);
    }
  }

  private render(): void {
    const style = document.createElement('style');
    style.textContent = `${baseStyles}\n${chatStyles}\n${this.getPageStyles()}`;

    this.container = document.createElement('div');
    this.container.className = 'chat-page-container';
    this.container.innerHTML = this.getBaseHTML();

    this.shadow.innerHTML = '';
    this.shadow.appendChild(style);
    this.shadow.appendChild(this.container);

    this.attachEventListeners();
  }

  private getPageStyles(): string {
    return `
      :host {
        display: block;
        width: 100%;
        height: 100vh;
      }

      .chat-page-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--search-snippet-background);
      }

      .chat-page-header {
        background: var(--search-snippet-surface);
        padding: var(--search-snippet-spacing-lg);
        border-bottom: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      }

      .chat-page-header-title {
        font-size: var(--search-snippet-font-size-xl);
        font-weight: var(--search-snippet-font-weight-bold);
        color: var(--search-snippet-text-color);
        display: flex;
        align-items: center;
        gap: var(--search-snippet-spacing-md);
      }

      .chat-page-header-title svg {
        width: 28px;
        height: 28px;
      }

      .chat-page-header-actions {
        display: flex;
        gap: var(--search-snippet-spacing-sm);
      }

      .header-button {
        height: var(--search-snippet-button-height);
        padding: 0 var(--search-snippet-spacing-lg);
        font-family: var(--search-snippet-font-family);
        font-size: var(--search-snippet-font-size-base);
        font-weight: var(--search-snippet-font-weight-medium);
        color: var(--search-snippet-text-color);
        background: var(--search-snippet-background);
        border: var(--search-snippet-border-width) solid var(--search-snippet-border-color);
        border-radius: var(--search-snippet-border-radius);
        cursor: pointer;
        outline: none;
        transition: var(--search-snippet-transition);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--search-snippet-spacing-sm);
      }

      .header-button:hover {
        background: var(--search-snippet-hover-background);
      }

      .header-button svg {
        width: 16px;
        height: 16px;
      }

      .chat-page-content {
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        width: 100%;
      }

      .container {
        border: none;
        box-shadow: none;
        height: 100%;
        width: 100%;
        background: var(--search-snippet-background);
        border-radius: 0;
      }
    `;
  }

  private getBaseHTML(): string {
    return `
      <div class="chat-page-header">
        <div class="chat-page-header-title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
          <span>Chat</span>
        </div>
        <div class="chat-page-header-actions">
          <button class="header-button clear-button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Clear History
          </button>
        </div>
      </div>
      <div class="chat-page-content">
        <div class="container"></div>
      </div>
    `;
  }

  private attachEventListeners(): void {
    const clearButton = this.shadow.querySelector('.clear-button');
    clearButton?.addEventListener('click', () => this.clearHistory());
  }

  private setupView(): void {
    if (!this.client) return;

    const chatContent = this.shadow.querySelector('.container') as HTMLElement;
    if (!chatContent) return;

    const props = this.getProps();
    this.chatView = new ChatView(chatContent, this.client, props);

    // Restore history if available
    if (this.history.length > 0) {
      this.restoreHistory();
    }

    // Listen for new messages to save history
    chatContent.addEventListener('message', () => {
      this.saveHistory();
    });
  }

  private loadHistory(): void {
    try {
      const stored = localStorage.getItem('chat-page-history');
      if (stored) {
        this.history = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
  }

  private saveHistory(): void {
    try {
      if (this.chatView) {
        this.history = this.chatView.getMessages();
        localStorage.setItem('chat-page-history', JSON.stringify(this.history));
      }
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  }

  private restoreHistory(): void {
    // Note: This is a simplified approach. In a production app,
    // you'd need to properly restore the messages to the ChatView
    // For now, we just store them for reference
  }

  private clearHistory(): void {
    this.history = [];
    localStorage.removeItem('chat-page-history');
    this.chatView?.clearMessages();
  }

  private updateTheme(theme: string | null): void {
    // CSS :host([theme]) selectors handle theming automatically
    // For 'auto' mode, remove the attribute to let @media (prefers-color-scheme) work
    const validTheme = theme === 'light' || theme === 'dark' ? theme : null;

    if (
      validTheme === null &&
      this.hasAttribute('theme') &&
      this.getAttribute('theme') !== 'auto'
    ) {
      this.removeAttribute('theme');
    }
  }

  private cleanup(): void {
    if (this.client) {
      this.client.cancelAllRequests();
    }

    if (this.chatView) {
      this.chatView.destroy();
    }
  }

  // Public API
  public clearChat(): void {
    this.clearHistory();
  }

  public async sendMessage(content: string): Promise<void> {
    if (this.chatView) {
      await this.chatView.sendMessage(content);
      this.saveHistory();
    }
  }

  public getMessages(): Message[] {
    return this.chatView?.getMessages() || [];
  }

  public getHistory(): Message[] {
    return [...this.history];
  }
}

// Register the custom element
if (!customElements.get(COMPONENT_NAME)) {
  customElements.define(COMPONENT_NAME, ChatPageSnippet);
}
