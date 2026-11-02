import { DEADLOCK_ITEMS } from '@shared/items.js';
import { DeadlockItemDef } from '@shared/types.js';
import { networkManager } from '../network/networkManager.js';

export class ShopModal {
  private overlay: HTMLElement;
  private pointsDisplay: HTMLElement;
  private weaponContainer: HTMLElement;
  private vitalityContainer: HTMLElement;
  private spiritContainer: HTMLElement;
  private closeBtn: HTMLElement;
  public isOpen: boolean = false;
  public onOpen?: () => void;
  public onClose?: () => void;

  private currentPoints: number = 0;
  private ownedItems: string[] = [];

  constructor() {
    this.overlay = document.getElementById('shop-overlay')!;
    this.pointsDisplay = document.getElementById('shop-points-display')!;
    this.weaponContainer = document.getElementById('weapon-items-container')!;
    this.vitalityContainer = document.getElementById('vitality-items-container')!;
    this.spiritContainer = document.getElementById('spirit-items-container')!;
    this.closeBtn = document.getElementById('shop-close-btn')!;

    this.closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    this.renderCatalog();
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public open(): void {
    this.isOpen = true;
    this.overlay.classList.add('open');
    this.updateButtons();
    this.onOpen?.();
  }

  public close(): void {
    this.isOpen = false;
    this.overlay.classList.remove('open');
    this.onClose?.();
  }

  public updatePlayerData(points: number, items: string[]): void {
    this.currentPoints = points;
    this.ownedItems = items;
    this.pointsDisplay.textContent = `💰 ${points} PKT`;
    if (this.isOpen) {
      this.updateButtons();
    }
  }

  private renderCatalog(): void {
    this.weaponContainer.innerHTML = '';
    this.vitalityContainer.innerHTML = '';
    this.spiritContainer.innerHTML = '';

    DEADLOCK_ITEMS.forEach((item) => {
      const card = this.createCardElement(item);
      if (item.category === 'weapon') {
        this.weaponContainer.appendChild(card);
      } else if (item.category === 'vitality') {
        this.vitalityContainer.appendChild(card);
      } else if (item.category === 'spirit') {
        this.spiritContainer.appendChild(card);
      }
    });
  }

  private createCardElement(item: DeadlockItemDef): HTMLElement {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.id = `item-card-${item.id}`;

    card.innerHTML = `
      <div class="item-top">
        <span class="item-name">${item.name}</span>
        <span class="item-cost">${item.cost} PKT</span>
      </div>
      <div class="item-desc">${item.description}</div>
      <button class="item-buy-btn" id="btn-buy-${item.id}">KUP (${item.cost})</button>
    `;

    const btn = card.querySelector(`#btn-buy-${item.id}`) as HTMLButtonElement;
    btn.addEventListener('click', () => {
      if (!this.ownedItems.includes(item.id) && this.currentPoints >= item.cost) {
        networkManager.send({
          type: 'buy_item',
          itemId: item.id
        });
      }
    });

    return card;
  }

  private updateButtons(): void {
    DEADLOCK_ITEMS.forEach((item) => {
      const card = document.getElementById(`item-card-${item.id}`);
      const btn = document.getElementById(`btn-buy-${item.id}`) as HTMLButtonElement;
      if (!card || !btn) return;

      const isOwned = this.ownedItems.includes(item.id);
      const canAfford = this.currentPoints >= item.cost;

      if (isOwned) {
        card.classList.add('owned');
        btn.textContent = '✓ POSIADANE';
        btn.disabled = true;
      } else {
        card.classList.remove('owned');
        btn.textContent = `KUP (${item.cost})`;
        btn.disabled = !canAfford;
      }
    });
  }
}
