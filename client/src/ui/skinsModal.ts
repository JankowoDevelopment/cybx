import {
  SkinCategory,
  SkinRarity,
  CRATE_COSTS,
  RARITY_COLORS,
  RARITY_LABELS,
  NEON_SKINS,
  WEAPON_SKINS,
  CHARACTER_SKINS,
  rollSkinFromCrate
} from '@shared/skins.js';
import { profileManager } from '../settings/profileManager.js';
import { soundSystem } from '../audio/soundSystem.js';

export class SkinsModal {
  private overlay: HTMLElement;
  private isOpen: boolean = false;
  private isSpinning: boolean = false;
  private activeTab: SkinCategory = 'neon';
  private unsubProfile?: () => void;

  public onEquipChanged?: () => void;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'cyber-skins-modal';
    this.overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(3, 6, 14, 0.88);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 520;
      font-family: 'Chakra Petch', sans-serif;
      user-select: none;
    `;

    document.body.appendChild(this.overlay);
    this.render();

    this.unsubProfile = profileManager.onChange(() => {
      if (this.isOpen && !this.isSpinning) {
        this.render();
      }
    });
  }

  public open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.overlay.style.display = 'flex';
    this.render();
  }

  public close(): void {
    if (!this.isOpen || this.isSpinning) return;
    this.isOpen = false;
    this.overlay.style.display = 'none';
  }

  private render(): void {
    const prof = profileManager.get();

    this.overlay.innerHTML = `
      <div style="width: 920px; max-width: 95vw; max-height: 90vh; overflow-y: auto; background: linear-gradient(165deg, rgba(15, 23, 42, 0.98) 0%, rgba(9, 13, 22, 0.99) 100%); border: 2px solid #f59e0b; border-radius: 18px; padding: 26px 32px; color: #f8fafc; box-shadow: 0 25px 70px rgba(0,0,0,0.9), 0 0 40px rgba(245, 158, 11, 0.22);">
        <!-- Top Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 14px; margin-bottom: 18px;">
          <div>
            <div style="font-size: 25px; font-weight: 900; color: #fbbf24; letter-spacing: 2px;">
              📦 SKRZYNKI & SKINY ARENY 3D
            </div>
            <div style="font-size: 12px; color: #94a3b8; font-family: 'Inter', sans-serif; margin-top: 2px;">
              Za każdą wygraną rundę otrzymujesz <b style="color: #4ade80;">+100 PKT</b> &bull; Duplikat ze skrzynki zwraca <b style="color: #38bdf8;">40% PKT</b>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="background: rgba(245, 158, 11, 0.16); border: 1px solid #f59e0b; padding: 8px 18px; border-radius: 10px; text-align: right;">
              <div style="font-size: 10px; color: #cbd5e1; font-weight: 800; letter-spacing: 1px;">TWOJE PUNKTY</div>
              <div id="skins-points-val" style="font-size: 22px; font-weight: 900; color: #fbbf24; letter-spacing: 1px;">💎 ${prof.points} PKT</div>
            </div>
            <button id="btn-close-skins" style="background: rgba(239, 68, 68, 0.16); border: 1px solid #ef4444; color: #f87171; font-family: inherit; font-weight: 900; font-size: 13px; padding: 10px 16px; border-radius: 10px; cursor: pointer;">
              ✕ ZAMKNIJ
            </button>
          </div>
        </div>

        <!-- 3 Crates Row -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px;">
          <!-- Crate 1: 500 PKT Neons -->
          <div style="background: rgba(15, 23, 42, 0.85); border: 2px solid #38bdf8; border-radius: 14px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 0 25px rgba(56, 189, 248, 0.15);">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 11px; font-weight: 900; color: #38bdf8; background: rgba(56,189,248,0.15); padding: 2px 8px; border-radius: 4px;">TIER 1 • NEONY</span>
                <span style="font-size: 15px; font-weight: 900; color: #fbbf24;">💎 500 PKT</span>
              </div>
              <div style="font-size: 18px; font-weight: 900; color: #fff; margin-bottom: 6px;">💡 Skrzynka Neonów</div>
              <div style="font-size: 12px; color: #94a3b8; font-family: 'Inter', sans-serif; line-height: 1.4; margin-bottom: 12px;">
                Zmienia kolor świecenia Twoich neonów na pancerzu, wizjerze i broni (widoczne dla wszystkich graczy!).
              </div>
            </div>
            <button class="btn-open-crate" data-crate="neon" style="width: 100%; padding: 11px; background: ${prof.points >= 500 ? '#0284c7' : '#1e293b'}; color: ${prof.points >= 500 ? '#fff' : '#64748b'}; border: 1px solid ${prof.points >= 500 ? '#38bdf8' : '#334155'}; border-radius: 8px; font-family: inherit; font-weight: 900; font-size: 13px; cursor: ${prof.points >= 500 ? 'pointer' : 'not-allowed'}; letter-spacing: 1px;">
              🎰 LOSUJ NEON (500 PKT)
            </button>
          </div>

          <!-- Crate 2: 2000 PKT Weapon Skins -->
          <div style="background: rgba(15, 23, 42, 0.85); border: 2px solid #a855f7; border-radius: 14px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 0 25px rgba(168, 85, 247, 0.15);">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 11px; font-weight: 900; color: #c084fc; background: rgba(168,85,247,0.15); padding: 2px 8px; border-radius: 4px;">TIER 2 • BRONIE</span>
                <span style="font-size: 15px; font-weight: 900; color: #fbbf24;">💎 2000 PKT</span>
              </div>
              <div style="font-size: 18px; font-weight: 900; color: #fff; margin-bottom: 6px;">🔫 Skrzynka Broni</div>
              <div style="font-size: 12px; color: #94a3b8; font-family: 'Inter', sans-serif; line-height: 1.4; margin-bottom: 12px;">
                Zaawansowane skiny zmieniające całą kolorystykę, metaliczność i wykończenie każdej broni 3D.
              </div>
            </div>
            <button class="btn-open-crate" data-crate="weapon" style="width: 100%; padding: 11px; background: ${prof.points >= 2000 ? '#7e22ce' : '#1e293b'}; color: ${prof.points >= 2000 ? '#fff' : '#64748b'}; border: 1px solid ${prof.points >= 2000 ? '#c084fc' : '#334155'}; border-radius: 8px; font-family: inherit; font-weight: 900; font-size: 13px; cursor: ${prof.points >= 2000 ? 'pointer' : 'not-allowed'}; letter-spacing: 1px;">
              🎰 LOSUJ BROŃ (2000 PKT)
            </button>
          </div>

          <!-- Crate 3: 10000 PKT Character Skins -->
          <div style="background: rgba(15, 23, 42, 0.85); border: 2px solid #fbbf24; border-radius: 14px; padding: 16px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 0 28px rgba(251, 191, 36, 0.2);">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span style="font-size: 11px; font-weight: 900; color: #fbbf24; background: rgba(251,191,36,0.15); padding: 2px 8px; border-radius: 4px;">TIER 3 • POSTACIE 3D</span>
                <span style="font-size: 15px; font-weight: 900; color: #fbbf24;">💎 10000 PKT</span>
              </div>
              <div style="font-size: 18px; font-weight: 900; color: #fff; margin-bottom: 6px;">👑 Skrzynka Postaci</div>
              <div style="font-size: 12px; color: #94a3b8; font-family: 'Inter', sans-serif; line-height: 1.4; margin-bottom: 12px;">
                Unikalne pancerze i modele 3D (Cyber-Samuraj z kataną, Złoty Imperator z koroną, Mecha-Tytan ze skrzydłami!).
              </div>
            </div>
            <button class="btn-open-crate" data-crate="character" style="width: 100%; padding: 11px; background: ${prof.points >= 10000 ? '#d97706' : '#1e293b'}; color: ${prof.points >= 10000 ? '#fff' : '#64748b'}; border: 1px solid ${prof.points >= 10000 ? '#fbbf24' : '#334155'}; border-radius: 8px; font-family: inherit; font-weight: 900; font-size: 13px; cursor: ${prof.points >= 10000 ? 'pointer' : 'not-allowed'}; letter-spacing: 1px;">
              🎰 LOSUJ POSTAĆ (10000 PKT)
            </button>
          </div>
        </div>

        <!-- Rarity Odds Info Bar -->
        <div style="display: flex; justify-content: center; gap: 18px; background: rgba(9, 13, 22, 0.9); border: 1px solid rgba(255,255,255,0.08); padding: 8px 16px; border-radius: 10px; margin-bottom: 18px; font-size: 11px; font-weight: 800; letter-spacing: 1px;">
          <span style="color: #94a3b8;">SZANSE DROPU ZE SKRZYNEK:</span>
          <span style="color: ${RARITY_COLORS.common};">● ${RARITY_LABELS.common}</span>
          <span style="color: ${RARITY_COLORS.rare};">● ${RARITY_LABELS.rare}</span>
          <span style="color: ${RARITY_COLORS.epic};">● ${RARITY_LABELS.epic}</span>
          <span style="color: ${RARITY_COLORS.legendary};">★ ${RARITY_LABELS.legendary}</span>
        </div>

        <!-- Roulette Container (Hidden until spinning) -->
        <div id="crate-roulette-box" style="display: none; margin-bottom: 22px; background: #050811; border: 2px solid #fbbf24; border-radius: 14px; padding: 18px; position: relative; overflow: hidden; box-shadow: 0 0 40px rgba(251, 191, 36, 0.35);">
          <div id="roulette-title" style="text-align: center; font-size: 14px; font-weight: 900; color: #fbbf24; letter-spacing: 2px; margin-bottom: 12px;">
            LOSOWANIE SKINA...
          </div>
          <div style="position: relative; width: 100%; height: 112px; overflow: hidden; background: #090d16; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12);">
            <!-- Center Gold Pointer Line -->
            <div style="position: absolute; top: 0; bottom: 0; left: 50%; width: 4px; transform: translateX(-50%); background: #fbbf24; z-index: 20; box-shadow: 0 0 15px #fbbf24;"></div>
            <div style="position: absolute; top: 0; left: 50%; transform: translateX(-50%); color: #fbbf24; font-size: 16px; font-weight: 900; z-index: 21;">▼</div>
            <div id="roulette-strip" style="display: flex; align-items: center; height: 100%; gap: 10px; padding-left: 0px; will-change: transform;"></div>
          </div>
          <div id="roulette-result-msg" style="text-align: center; font-size: 17px; font-weight: 900; margin-top: 12px; min-height: 24px;"></div>
        </div>

        <!-- Inventory Category Tabs -->
        <div style="display: flex; gap: 10px; margin-bottom: 14px;">
          <button class="skin-tab-btn" data-tab="neon" style="flex: 1; padding: 10px; border-radius: 8px; font-family: inherit; font-weight: 900; font-size: 13px; cursor: pointer; border: 1px solid ${this.activeTab === 'neon' ? '#38bdf8' : '#334155'}; background: ${this.activeTab === 'neon' ? 'rgba(56,189,248,0.2)' : 'rgba(15,23,42,0.7)'}; color: ${this.activeTab === 'neon' ? '#38bdf8' : '#94a3b8'};">
            💡 TWOJE NEONY (${prof.unlockedNeons.length}/${NEON_SKINS.length})
          </button>
          <button class="skin-tab-btn" data-tab="weapon" style="flex: 1; padding: 10px; border-radius: 8px; font-family: inherit; font-weight: 900; font-size: 13px; cursor: pointer; border: 1px solid ${this.activeTab === 'weapon' ? '#c084fc' : '#334155'}; background: ${this.activeTab === 'weapon' ? 'rgba(168,85,247,0.2)' : 'rgba(15,23,42,0.7)'}; color: ${this.activeTab === 'weapon' ? '#c084fc' : '#94a3b8'};">
            🔫 SKINY BRONI (${prof.unlockedWeapons.length}/${WEAPON_SKINS.length})
          </button>
          <button class="skin-tab-btn" data-tab="character" style="flex: 1; padding: 10px; border-radius: 8px; font-family: inherit; font-weight: 900; font-size: 13px; cursor: pointer; border: 1px solid ${this.activeTab === 'character' ? '#fbbf24' : '#334155'}; background: ${this.activeTab === 'character' ? 'rgba(251,191,36,0.2)' : 'rgba(15,23,42,0.7)'}; color: ${this.activeTab === 'character' ? '#fbbf24' : '#94a3b8'};">
            👑 SKINY POSTACI (${prof.unlockedCharacters.length}/${CHARACTER_SKINS.length})
          </button>
        </div>

        <!-- Inventory Grid -->
        <div id="skins-inventory-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px;">
          ${this.renderInventoryGrid()}
        </div>
      </div>
    `;

    this.overlay.querySelector('#btn-close-skins')?.addEventListener('click', () => this.close());

    this.overlay.querySelectorAll('.skin-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.isSpinning) return;
        this.activeTab = (btn as HTMLElement).dataset.tab as SkinCategory;
        this.render();
      });
    });

    this.overlay.querySelectorAll('.btn-open-crate').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.isSpinning) return;
        const cat = (btn as HTMLElement).dataset.crate as SkinCategory;
        this.startCrateSpin(cat);
      });
    });

    this.bindEquipButtons();
  }

  private bindEquipButtons(): void {
    this.overlay.querySelectorAll('.btn-equip-skin').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this.isSpinning) return;
        const el = btn as HTMLElement;
        const cat = el.dataset.cat as SkinCategory;
        const id = el.dataset.id!;
        profileManager.equipSkin(cat, id);
        soundSystem.playSound('buy');
        this.onEquipChanged?.();
        this.render();
      });
    });
  }

  private renderInventoryGrid(): string {
    const prof = profileManager.get();

    if (this.activeTab === 'neon') {
      return NEON_SKINS.map((s) => {
        const unlocked = prof.unlockedNeons.includes(s.id);
        const equipped = prof.cosmetics.neonSkinId === s.id;
        const rCol = RARITY_COLORS[s.rarity];
        return `
          <div style="background: rgba(9, 13, 22, 0.9); border: 2px solid ${equipped ? '#4ade80' : unlocked ? rCol : '#1e293b'}; border-radius: 10px; padding: 12px; opacity: ${unlocked ? '1' : '0.5'}; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 10px; font-weight: 900; color: ${rCol}; text-transform: uppercase;">${s.rarity}</span>
                <span style="width: 18px; height: 18px; border-radius: 50%; background: ${s.colorHex}; box-shadow: 0 0 12px ${s.colorHex}; display: inline-block;"></span>
              </div>
              <div style="font-size: 14px; font-weight: 900; color: #fff; margin-bottom: 8px;">${s.name}</div>
            </div>
            ${
              equipped
                ? `<div style="padding: 7px; text-align: center; background: rgba(34,197,94,0.2); border: 1px solid #22c55e; color: #4ade80; font-size: 11px; font-weight: 900; border-radius: 6px;">✓ ZAŁOŻONO</div>`
                : unlocked
                ? `<button class="btn-equip-skin" data-cat="neon" data-id="${s.id}" style="padding: 7px; width: 100%; background: #0284c7; color: #fff; border: none; border-radius: 6px; font-family: inherit; font-size: 11px; font-weight: 900; cursor: pointer;">ZAŁÓŻ</button>`
                : `<div style="padding: 7px; text-align: center; background: #0f172a; color: #64748b; font-size: 11px; font-weight: 800; border-radius: 6px;">🔒 ZABLOKOWANY</div>`
            }
          </div>
        `;
      }).join('');
    }

    if (this.activeTab === 'weapon') {
      return WEAPON_SKINS.map((s) => {
        const unlocked = prof.unlockedWeapons.includes(s.id);
        const equipped = prof.cosmetics.weaponSkinId === s.id;
        const rCol = RARITY_COLORS[s.rarity];
        return `
          <div style="background: rgba(9, 13, 22, 0.9); border: 2px solid ${equipped ? '#4ade80' : unlocked ? rCol : '#1e293b'}; border-radius: 10px; padding: 12px; opacity: ${unlocked ? '1' : '0.5'}; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-size: 10px; font-weight: 900; color: ${rCol}; text-transform: uppercase;">${s.rarity}</span>
                <div style="display: flex; gap: 4px;">
                  <span style="width: 14px; height: 14px; border-radius: 4px; background: ${s.bodyHex}; border: 1px solid #fff;"></span>
                  <span style="width: 14px; height: 14px; border-radius: 4px; background: ${s.barrelHex}; border: 1px solid #fff;"></span>
                  <span style="width: 14px; height: 14px; border-radius: 4px; background: ${s.accentHex};"></span>
                </div>
              </div>
              <div style="font-size: 14px; font-weight: 900; color: #fff; margin-bottom: 8px;">${s.name}</div>
            </div>
            ${
              equipped
                ? `<div style="padding: 7px; text-align: center; background: rgba(34,197,94,0.2); border: 1px solid #22c55e; color: #4ade80; font-size: 11px; font-weight: 900; border-radius: 6px;">✓ ZAŁOŻONO</div>`
                : unlocked
                ? `<button class="btn-equip-skin" data-cat="weapon" data-id="${s.id}" style="padding: 7px; width: 100%; background: #7e22ce; color: #fff; border: none; border-radius: 6px; font-family: inherit; font-size: 11px; font-weight: 900; cursor: pointer;">ZAŁÓŻ</button>`
                : `<div style="padding: 7px; text-align: center; background: #0f172a; color: #64748b; font-size: 11px; font-weight: 800; border-radius: 6px;">🔒 ZABLOKOWANY</div>`
            }
          </div>
        `;
      }).join('');
    }

    return CHARACTER_SKINS.map((s) => {
      const unlocked = prof.unlockedCharacters.includes(s.id);
      const equipped = prof.cosmetics.charSkinId === s.id;
      const rCol = RARITY_COLORS[s.rarity];
      return `
        <div style="background: rgba(9, 13, 22, 0.9); border: 2px solid ${equipped ? '#4ade80' : unlocked ? rCol : '#1e293b'}; border-radius: 10px; padding: 12px; opacity: ${unlocked ? '1' : '0.5'}; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 10px; font-weight: 900; color: ${rCol}; text-transform: uppercase;">${s.rarity}</span>
              <span style="width: 16px; height: 16px; border-radius: 4px; background: ${s.armorHex}; border: 2px solid ${s.secondaryArmorHex}; display: inline-block;"></span>
            </div>
            <div style="font-size: 14px; font-weight: 900; color: #fff; margin-bottom: 4px;">${s.name}</div>
            <div style="font-size: 11px; color: #94a3b8; font-family: 'Inter', sans-serif; margin-bottom: 8px; line-height: 1.3;">${s.description}</div>
          </div>
          ${
            equipped
              ? `<div style="padding: 7px; text-align: center; background: rgba(34,197,94,0.2); border: 1px solid #22c55e; color: #4ade80; font-size: 11px; font-weight: 900; border-radius: 6px;">✓ ZAŁOŻONO</div>`
              : unlocked
              ? `<button class="btn-equip-skin" data-cat="character" data-id="${s.id}" style="padding: 7px; width: 100%; background: #d97706; color: #fff; border: none; border-radius: 6px; font-family: inherit; font-size: 11px; font-weight: 900; cursor: pointer;">ZAŁÓŻ</button>`
              : `<div style="padding: 7px; text-align: center; background: #0f172a; color: #64748b; font-size: 11px; font-weight: 800; border-radius: 6px;">🔒 ZABLOKOWANY</div>`
          }
        </div>
      `;
    }).join('');
  }

  private startCrateSpin(category: SkinCategory): void {
    const cost = CRATE_COSTS[category];
    if (!profileManager.spendPoints(cost)) {
      return;
    }

    this.isSpinning = true;
    this.activeTab = category;

    // Update displayed points immediately
    const ptsEl = this.overlay.querySelector('#skins-points-val') as HTMLElement | null;
    if (ptsEl) ptsEl.textContent = `💎 ${profileManager.get().points} PKT`;

    const rouletteBox = this.overlay.querySelector('#crate-roulette-box') as HTMLElement;
    const strip = this.overlay.querySelector('#roulette-strip') as HTMLElement;
    const resultMsg = this.overlay.querySelector('#roulette-result-msg') as HTMLElement;
    const titleEl = this.overlay.querySelector('#roulette-title') as HTMLElement;

    rouletteBox.style.display = 'block';
    resultMsg.textContent = '';
    titleEl.textContent =
      category === 'neon'
        ? '🎰 OTWIERANIE SKRZYNKI NEONÓW (500 PKT)...'
        : category === 'weapon'
        ? '🎰 OTWIERANIE SKRZYNKI BRONI (2000 PKT)...'
        : '🎰 OTWIERANIE SKRZYNKI POSTACI 3D (10000 PKT)...';

    const totalItems = 46;
    const winIndex = 38;
    const items: { id: string; name: string; rarity: SkinRarity; previewHex: string }[] = [];
    for (let i = 0; i < totalItems; i++) {
      items.push(rollSkinFromCrate(category));
    }
    const winner = items[winIndex];

    const cardWidth = 132;
    const gap = 10;
    const step = cardWidth + gap;

    strip.style.transition = 'none';
    strip.style.transform = 'translateX(0px)';
    strip.innerHTML = items
      .map((item) => {
        const rCol = RARITY_COLORS[item.rarity];
        return `
          <div style="min-width: ${cardWidth}px; width: ${cardWidth}px; height: 92px; background: #111827; border: 2px solid ${rCol}; border-bottom: 5px solid ${rCol}; border-radius: 8px; padding: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; box-shadow: inset 0 0 15px ${rCol}33;">
            <div style="width: 24px; height: 24px; border-radius: 50%; background: ${item.previewHex}; box-shadow: 0 0 12px ${item.previewHex}; margin-bottom: 6px; border: 1px solid #fff;"></div>
            <div style="font-size: 11px; font-weight: 900; color: #f8fafc; line-height: 1.2;">${item.name}</div>
            <div style="font-size: 9px; font-weight: 800; color: ${rCol}; text-transform: uppercase; margin-top: 3px;">${item.rarity}</div>
          </div>
        `;
      })
      .join('');

    // Force layout reflow
    void strip.offsetWidth;

    const containerWidth = strip.parentElement?.clientWidth || 800;
    const jitter = (Math.random() - 0.5) * (cardWidth * 0.45);
    const targetOffset = winIndex * step + cardWidth / 2 - containerWidth / 2 + jitter;

    const spinDurationMs = 4200;
    strip.style.transition = `transform ${spinDurationMs}ms cubic-bezier(0.12, 0.82, 0.18, 1)`;
    strip.style.transform = `translateX(-${Math.round(targetOffset)}px)`;

    // Play ticking sounds slowing down like CS:GO case opening
    let tickDelay = 55;
    let elapsed = 0;
    const playTick = () => {
      if (!this.isSpinning) return;
      soundSystem.playSound('hit');
      elapsed += tickDelay;
      tickDelay = Math.min(360, tickDelay * 1.075);
      if (elapsed < spinDurationMs - 180) {
        setTimeout(playTick, tickDelay);
      }
    };
    setTimeout(playTick, 60);

    setTimeout(() => {
      const { isDuplicate } = profileManager.unlockSkin(category, winner.id);
      const rCol = RARITY_COLORS[winner.rarity];

      if (isDuplicate) {
        const refund = Math.round(cost * 0.4);
        profileManager.addPoints(refund);
        soundSystem.playSound('buy');
        resultMsg.innerHTML = `<span style="color: ${rCol};">★ WYLOSOWANO: ${winner.name} (${winner.rarity.toUpperCase()})</span> &bull; <span style="color: #38bdf8;">DUPLIKAT: ZWROT +${refund} PKT!</span>`;
      } else {
        profileManager.equipSkin(category, winner.id);
        this.onEquipChanged?.();
        soundSystem.playSound('mystery_box');
        resultMsg.innerHTML = `<span style="color: ${rCol};">🎉 NOWY SKIN ODBLOKOWANY I ZAŁOŻONY: ${winner.name} (${winner.rarity.toUpperCase()})!</span>`;
      }

      setTimeout(() => {
        this.isSpinning = false;
        this.render();
      }, 1800);
    }, spinDurationMs + 80);
  }

  public destroy(): void {
    this.unsubProfile?.();
    if (this.overlay.parentNode) {
      this.overlay.remove();
    }
  }
}
