import { networkManager } from '../network/networkManager.js';
import { soundSystem } from '../audio/soundSystem.js';

export interface ChatMessage {
  senderId: string;
  senderName: string;
  text: string;
  senderColor?: string;
  timestamp: number;
}

export class InGameChat {
  private container: HTMLElement;
  private messageListEl: HTMLElement;
  private inputContainerEl: HTMLElement;
  private inputEl: HTMLInputElement;
  public isOpen: boolean = false;
  private messages: ChatMessage[] = [];
  private hideTimeout: any = null;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'cyber-chat-box';
    this.container.style.cssText = `
      position: absolute;
      bottom: 125px;
      left: 32px;
      width: 380px;
      max-width: calc(100vw - 64px);
      z-index: 100;
      pointer-events: none;
      font-family: 'Rajdhani', 'Orbitron', sans-serif;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: opacity 0.3s ease;
    `;

    this.container.innerHTML = `
      <div id="chat-messages" style="
        max-height: 190px;
        overflow-y: hidden;
        display: flex;
        flex-direction: column;
        gap: 4px;
        pointer-events: none;
        text-shadow: 0 1px 4px rgba(0,0,0,0.9);
      "></div>
      <div id="chat-input-bar" style="
        display: none;
        background: rgba(5, 9, 18, 0.94);
        border: 1px solid #00f0ff;
        border-left: 4px solid #00f0ff;
        border-radius: 4px;
        padding: 6px 10px;
        box-shadow: 0 0 20px rgba(0, 240, 255, 0.35);
        pointer-events: auto;
      ">
        <input id="chat-input-field" type="text" maxlength="120" placeholder="Napisz do ziomków [ENTER]..." style="
          width: 100%;
          background: transparent;
          border: none;
          outline: none;
          color: #f8fafc;
          font-family: 'Rajdhani', sans-serif;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 1px;
        " />
      </div>
    `;

    document.body.appendChild(this.container);

    this.messageListEl = this.container.querySelector('#chat-messages')!;
    this.inputContainerEl = this.container.querySelector('#chat-input-bar')!;
    this.inputEl = this.container.querySelector('#chat-input-field') as HTMLInputElement;

    networkManager.onChatMessage = (msg) => {
      this.addMessage(msg);
    };

    this.inputEl.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const text = this.inputEl.value.trim();
        if (text.length > 0) {
          networkManager.send({
            type: 'chat_msg',
            text
          });
          this.inputEl.value = '';
        }
        this.close();
      } else if (e.key === 'Escape') {
        this.close();
      }
    });
  }

  public open(): void {
    this.isOpen = true;
    this.inputContainerEl.style.display = 'block';
    this.messageListEl.style.overflowY = 'auto';
    this.showMessages();
    setTimeout(() => {
      this.inputEl.focus();
    }, 10);
  }

  public close(): void {
    this.isOpen = false;
    this.inputContainerEl.style.display = 'none';
    this.inputEl.blur();
    this.messageListEl.style.overflowY = 'hidden';
    this.scheduleFadeOut();
  }

  public addMessage(msg: { senderId: string; senderName: string; text: string; senderColor?: string }): void {
    const item: ChatMessage = {
      ...msg,
      timestamp: Date.now()
    };
    this.messages.push(item);
    if (this.messages.length > 30) {
      this.messages.shift();
    }

    const row = document.createElement('div');
    const color = msg.senderColor || '#00f0ff';
    row.style.cssText = `
      background: rgba(3, 6, 12, 0.72);
      border-left: 2px solid ${color};
      padding: 3px 8px;
      border-radius: 2px;
      font-size: 14px;
      font-weight: 700;
      color: #f1f5f9;
      word-break: break-word;
      animation: chatSlideIn 0.15s ease-out;
    `;
    row.innerHTML = `<span style="color: ${color}; font-family: 'Orbitron', sans-serif; font-size: 12px; margin-right: 6px;">[${this.escapeHtml(msg.senderName)}]:</span><span>${this.escapeHtml(msg.text)}</span>`;

    this.messageListEl.appendChild(row);
    this.messageListEl.scrollTop = this.messageListEl.scrollHeight;

    soundSystem.playSound('hit');
    this.showMessages();
    if (!this.isOpen) {
      this.scheduleFadeOut();
    }
  }

  private showMessages(): void {
    if (this.hideTimeout) clearTimeout(this.hideTimeout);
    this.container.style.opacity = '1';
  }

  private scheduleFadeOut(): void {
    if (this.hideTimeout) clearTimeout(this.hideTimeout);
    this.hideTimeout = setTimeout(() => {
      if (!this.isOpen) {
        this.container.style.opacity = '0.35';
      }
    }, 6000);
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  public destroy(): void {
    if (this.container.parentNode) {
      this.container.remove();
    }
  }
}
