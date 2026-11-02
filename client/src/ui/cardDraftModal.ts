import { ROUNDS_CARDS, RoundsCardDef } from '@shared/cards.js';
import { networkManager } from '../network/networkManager.js';

export class CardDraftModal {
  private container: HTMLElement;
  private winnerBannerEl: HTMLElement;
  private titleEl: HTMLElement;
  private subtitleEl: HTMLElement;
  private cardsContainer: HTMLElement;
  public isOpen: boolean = false;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'rounds-card-modal';
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: radial-gradient(circle at center, rgba(15, 23, 42, 0.88) 0%, rgba(5, 7, 10, 0.96) 100%);
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 200;
      font-family: 'Chakra Petch', sans-serif;
      backdrop-filter: blur(12px);
      user-select: none;
    `;

    this.container.innerHTML = `
      <div style="text-align: center; margin-bottom: 26px;">
        <div id="draft-winner-banner" style="display: inline-block; background: rgba(34, 197, 94, 0.18); border: 2px solid #22c55e; color: #4ade80; font-size: 20px; font-weight: 900; padding: 8px 26px; border-radius: 999px; letter-spacing: 2px; margin-bottom: 14px; box-shadow: 0 0 25px rgba(34, 197, 94, 0.35);">
          🏆 RUNDĘ WYGRYWA: ---
        </div>
        <h1 id="draft-title" style="font-size: 42px; font-weight: 900; color: #ef4444; letter-spacing: 4px; text-shadow: 0 0 30px rgba(239,68,68,0.7); margin-bottom: 6px;">
          PRZEGRAŁEŚ RUNDĘ!
        </h1>
        <p id="draft-subtitle" style="font-size: 17px; color: #fbbf24; letter-spacing: 2px; text-transform: uppercase;">
          WYBIERZ 1 ULEPSZENIE Z 3 ABY ZYSKAĆ PRZEWAGĘ
        </p>
      </div>

      <div id="draft-cards-row" style="display: flex; gap: 24px; justify-content: center; align-items: stretch; max-width: 1100px; width: 90vw;">
      </div>
    `;

    document.body.appendChild(this.container);

    this.winnerBannerEl = this.container.querySelector('#draft-winner-banner')!;
    this.titleEl = this.container.querySelector('#draft-title')!;
    this.subtitleEl = this.container.querySelector('#draft-subtitle')!;
    this.cardsContainer = this.container.querySelector('#draft-cards-row')!;
  }

  public showDraft(
    offeredCardIds: string[],
    isPicker: boolean,
    pickerName: string,
    winnerName?: string | null,
    killedBy?: string | null
  ): void {
    this.isOpen = true;
    this.container.style.display = 'flex';
    this.cardsContainer.innerHTML = '';

    if (winnerName) {
      this.winnerBannerEl.style.display = 'inline-block';
      this.winnerBannerEl.textContent = `🏆 ZWYCIĘZCA RUNDY: ${winnerName}`;
    } else {
      this.winnerBannerEl.style.display = 'none';
    }

    if (isPicker) {
      this.titleEl.textContent = killedBy ? `💀 ZABITY PRZEZ: ${killedBy}` : 'PRZEGRAŁEŚ RUNDĘ!';
      this.titleEl.style.color = '#ef4444';
      this.subtitleEl.textContent = 'TWOJA KOLEJ — WYBIERZ 1 KARTĘ ULEPSZENIA Z 3:';

      if (document.pointerLockElement) {
        document.exitPointerLock();
      }

      offeredCardIds.forEach((cardId) => {
        const cardDef = ROUNDS_CARDS.find((c) => c.id === cardId);
        if (!cardDef) return;

        const cardEl = this.createCardElement(cardDef, true);
        this.cardsContainer.appendChild(cardEl);
      });
    } else {
      this.titleEl.textContent = killedBy ? `💀 ZABITY PRZEZ: ${killedBy}` : '👑 WYGRAŁEŚ RUNDĘ!';
      this.titleEl.style.color = killedBy ? '#f97316' : '#22c55e';
      this.subtitleEl.textContent = `TERAZ KARTĘ WYBIERA: [${pickerName}]...`;

      offeredCardIds.forEach((cardId) => {
        const cardDef = ROUNDS_CARDS.find((c) => c.id === cardId);
        if (!cardDef) return;

        const cardEl = this.createCardElement(cardDef, false);
        this.cardsContainer.appendChild(cardEl);
      });
    }
  }

  public hide(): void {
    this.isOpen = false;
    this.container.style.display = 'none';
  }

  private createCardElement(card: RoundsCardDef, isClickable: boolean): HTMLElement {
    const cardEl = document.createElement('div');

    const rarityColors = {
      common: '#38bdf8',
      rare: '#f59e0b',
      epic: '#a855f7',
      legendary: '#ef4444'
    };

    const rarityLabels = {
      common: 'ZWYKŁA',
      rare: 'RZADKA',
      epic: 'EPICKA',
      legendary: 'LEGENDARNA'
    };

    const color = rarityColors[card.rarity] || '#38bdf8';
    const rarityLabel = rarityLabels[card.rarity] || 'KARTA';

    cardEl.style.cssText = `
      flex: 1;
      min-width: 260px;
      max-width: 340px;
      background: linear-gradient(145deg, #161b26 0%, #0c0f17 100%);
      border: 3px solid ${color};
      border-radius: 16px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-shadow: 0 0 35px ${color}33, inset 0 0 20px rgba(0,0,0,0.5);
      transition: all 0.22s ease-out;
      cursor: ${isClickable ? 'pointer' : 'default'};
      position: relative;
      overflow: hidden;
    `;

    cardEl.innerHTML = `
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <span style="font-size: 11px; font-weight: 900; color: ${color}; background: ${color}22; border: 1px solid ${color}; padding: 3px 8px; border-radius: 4px; letter-spacing: 1px;">
            ${rarityLabel}
          </span>
          <span style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px;">
            ${card.category}
          </span>
        </div>

        <h3 style="font-size: 26px; font-weight: 900; color: #fff; margin-bottom: 14px; letter-spacing: 1px; text-shadow: 0 0 10px rgba(255,255,255,0.3);">
          ${card.name}
        </h3>

        <div style="font-size: 15px; color: #cbd5e1; line-height: 1.5; font-family: 'Inter', sans-serif; font-weight: 500; min-height: 60px;">
          ${card.description}
        </div>
      </div>

      <div style="margin-top: 24px;">
        ${
          isClickable
            ? `<button class="pick-card-btn" style="width: 100%; padding: 14px; background: ${color}; color: #fff; border: none; border-radius: 8px; font-weight: 900; font-size: 16px; letter-spacing: 2px; cursor: pointer; text-transform: uppercase; box-shadow: 0 0 20px ${color}66; transition: all 0.15s;">
                WYBIERZ KARTĘ
               </button>`
            : `<div style="text-align: center; font-size: 12px; color: #64748b; font-weight: 700; letter-spacing: 1px;">DO WYBORU PRZEZ PRZEGRANEGO</div>`
        }
      </div>
    `;

    if (isClickable) {
      cardEl.addEventListener('mouseenter', () => {
        cardEl.style.transform = 'translateY(-10px) scale(1.02)';
        cardEl.style.boxShadow = `0 0 45px ${color}88, inset 0 0 25px ${color}22`;
      });
      cardEl.addEventListener('mouseleave', () => {
        cardEl.style.transform = 'none';
        cardEl.style.boxShadow = `0 0 35px ${color}33, inset 0 0 20px rgba(0,0,0,0.5)`;
      });

      cardEl.addEventListener('click', () => {
        networkManager.send({
          type: 'pick_card',
          cardId: card.id
        });
        this.hide();
      });
    }

    return cardEl;
  }

  public destroy(): void {
    if (this.container.parentNode) {
      this.container.remove();
    }
  }
}
