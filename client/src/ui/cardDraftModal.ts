import { ROUNDS_CARDS, RoundsCardDef } from '@shared/cards.js';
import { networkManager } from '../network/networkManager.js';
import { soundSystem } from '../audio/soundSystem.js';

export class CardDraftModal {
  private container: HTMLElement;
  private winnerBannerEl: HTMLElement;
  private titleEl: HTMLElement;
  private subtitleEl: HTMLElement;
  private keyHintEl: HTMLElement;
  private cardsContainer: HTMLElement;
  public isOpen: boolean = false;

  private canPick: boolean = false;
  private currentOfferedIds: string[] = [];
  private selectedIndex: number = 0;
  private cardElements: { el: HTMLElement; color: string; btnEl: HTMLElement | null }[] = [];
  private keydownHandler: (e: KeyboardEvent) => void;

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
      <div style="text-align: center; margin-bottom: 24px;">
        <div id="draft-winner-banner" style="display: inline-block; background: rgba(34, 197, 94, 0.18); border: 2px solid #22c55e; color: #4ade80; font-size: 20px; font-weight: 900; padding: 8px 26px; border-radius: 999px; letter-spacing: 2px; margin-bottom: 12px; box-shadow: 0 0 25px rgba(34, 197, 94, 0.35);">
          🏆 RUNDĘ WYGRYWA: ---
        </div>
        <h1 id="draft-title" style="font-size: 40px; font-weight: 900; color: #ef4444; letter-spacing: 4px; text-shadow: 0 0 30px rgba(239,68,68,0.7); margin-bottom: 6px;">
          PRZEGRAŁEŚ RUNDĘ!
        </h1>
        <p id="draft-subtitle" style="font-size: 17px; color: #fbbf24; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px;">
          WYBIERZ 1 ULEPSZENIE Z 3 ABY ZYSKAĆ PRZEWAGĘ
        </p>
        <div id="draft-key-hint" style="display: inline-block; background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; color: #f8fafc; font-size: 14px; font-weight: 800; padding: 6px 20px; border-radius: 8px; letter-spacing: 1.5px;">
          ⌨️ STRZAŁKI <span style="color: #38bdf8;">[◄ / ►]</span> WYBÓR KARTY &bull; <span style="color: #fbbf24;">[SPACJA]</span> ZATWIERDŹ
        </div>
      </div>

      <div id="draft-cards-row" style="display: flex; gap: 26px; justify-content: center; align-items: stretch; max-width: 1120px; width: 92vw;">
      </div>
    `;

    document.body.appendChild(this.container);

    this.winnerBannerEl = this.container.querySelector('#draft-winner-banner')!;
    this.titleEl = this.container.querySelector('#draft-title')!;
    this.subtitleEl = this.container.querySelector('#draft-subtitle')!;
    this.keyHintEl = this.container.querySelector('#draft-key-hint')!;
    this.cardsContainer = this.container.querySelector('#draft-cards-row')!;

    this.keydownHandler = (e: KeyboardEvent) => {
      if (!this.isOpen || !this.canPick || this.currentOfferedIds.length === 0) return;

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        e.stopPropagation();
        this.selectedIndex = (this.selectedIndex - 1 + this.currentOfferedIds.length) % this.currentOfferedIds.length;
        soundSystem.playSound('hit');
        this.updateSelectionVisuals();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        e.stopPropagation();
        this.selectedIndex = (this.selectedIndex + 1) % this.currentOfferedIds.length;
        soundSystem.playSound('hit');
        this.updateSelectionVisuals();
      } else if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.confirmSelection();
      }
    };

    window.addEventListener('keydown', this.keydownHandler, { capture: true });
  }

  public showDraft(
    offeredCardIds: string[],
    isPicker: boolean,
    pickerName: string,
    winnerName?: string | null,
    killedBy?: string | null
  ): void {
    this.isOpen = true;
    this.canPick = isPicker;
    this.currentOfferedIds = [...offeredCardIds];
    this.selectedIndex = Math.min(1, Math.max(0, Math.floor(offeredCardIds.length / 2))); // Default middle card
    this.cardElements = [];
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
      this.keyHintEl.style.display = 'inline-block';

      offeredCardIds.forEach((cardId, idx) => {
        const cardDef = ROUNDS_CARDS.find((c) => c.id === cardId);
        if (!cardDef) return;

        const cardEl = this.createCardElement(cardDef, true, idx);
        this.cardsContainer.appendChild(cardEl);
      });

      this.updateSelectionVisuals();
    } else {
      this.titleEl.textContent = killedBy ? `💀 ZABITY PRZEZ: ${killedBy}` : '👑 WYGRAŁEŚ RUNDĘ!';
      this.titleEl.style.color = killedBy ? '#f97316' : '#22c55e';
      this.subtitleEl.textContent = `TERAZ KARTĘ WYBIERA: [${pickerName}]...`;
      this.keyHintEl.style.display = 'none';

      offeredCardIds.forEach((cardId, idx) => {
        const cardDef = ROUNDS_CARDS.find((c) => c.id === cardId);
        if (!cardDef) return;

        const cardEl = this.createCardElement(cardDef, false, idx);
        this.cardsContainer.appendChild(cardEl);
      });
    }
  }

  private updateSelectionVisuals(): void {
    this.cardElements.forEach((item, idx) => {
      const isSelected = idx === this.selectedIndex;
      if (isSelected) {
        item.el.style.transform = 'translateY(-14px) scale(1.05)';
        item.el.style.border = `4px solid #ffffff`;
        item.el.style.boxShadow = `0 0 50px ${item.color}, 0 0 20px #ffffff88, inset 0 0 30px ${item.color}44`;
        if (item.btnEl) {
          item.btnEl.textContent = '► ZATWIERDŹ [SPACJA] ◄';
          item.btnEl.style.background = '#fbbf24';
          item.btnEl.style.color = '#090d16';
          item.btnEl.style.boxShadow = '0 0 25px rgba(251, 191, 36, 0.85)';
        }
      } else {
        item.el.style.transform = 'scale(0.97)';
        item.el.style.border = `3px solid ${item.color}88`;
        item.el.style.boxShadow = `0 0 25px ${item.color}22, inset 0 0 20px rgba(0,0,0,0.5)`;
        if (item.btnEl) {
          item.btnEl.textContent = 'WYBIERZ STRZAŁKAMI [◄/►]';
          item.btnEl.style.background = `${item.color}33`;
          item.btnEl.style.color = '#cbd5e1';
          item.btnEl.style.boxShadow = 'none';
        }
      }
    });
  }

  private confirmSelection(): void {
    if (!this.canPick || this.currentOfferedIds.length === 0) return;
    const chosenId = this.currentOfferedIds[this.selectedIndex];
    if (!chosenId) return;

    this.canPick = false;
    networkManager.send({
      type: 'pick_card',
      cardId: chosenId
    });
    this.hide();
  }

  public hide(): void {
    this.isOpen = false;
    this.canPick = false;
    this.container.style.display = 'none';
  }

  private createCardElement(card: RoundsCardDef, isClickable: boolean, index: number): HTMLElement {
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
      transition: all 0.18s ease-out;
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
            ? `<button class="pick-card-btn" style="width: 100%; padding: 14px; background: ${color}; color: #fff; border: none; border-radius: 8px; font-weight: 900; font-size: 15px; letter-spacing: 1.5px; cursor: pointer; text-transform: uppercase; transition: all 0.15s;">
                WYBIERZ KARTĘ
               </button>`
            : `<div style="text-align: center; font-size: 12px; color: #64748b; font-weight: 700; letter-spacing: 1px;">DO WYBORU PRZEZ PRZEGRANEGO</div>`
        }
      </div>
    `;

    const btnEl = cardEl.querySelector('.pick-card-btn') as HTMLElement | null;
    this.cardElements.push({ el: cardEl, color, btnEl });

    if (isClickable) {
      cardEl.addEventListener('mouseenter', () => {
        this.selectedIndex = index;
        this.updateSelectionVisuals();
      });

      cardEl.addEventListener('click', () => {
        this.selectedIndex = index;
        this.confirmSelection();
      });
    }

    return cardEl;
  }

  public destroy(): void {
    window.removeEventListener('keydown', this.keydownHandler, { capture: true });
    if (this.container.parentNode) {
      this.container.remove();
    }
  }
}
