import { PlayerState, GameSnapshot } from '@shared/types.js';
import { WEAPONS } from '@shared/weapons.js';
import { ROUNDS_CARDS } from '@shared/cards.js';

export class DoomHud {
  private container: HTMLElement;

  private topScoreboardEl: HTMLElement;
  private myCardsEl: HTMLElement;
  private weaponEl: HTMLElement;
  private ammoEl: HTMLElement;
  private hpFillEl: HTMLElement;
  private hpValEl: HTMLElement;
  private dashFillEl: HTMLElement;
  private promptEl: HTMLElement;
  private pointerLockPrompt: HTMLElement;
  private deadAlert: HTMLElement;
  private respawnCountdown: HTMLElement;
  private damageFlash: HTMLElement;

  private lastHp: number = 100;

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'doom-hud';
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 15;
      font-family: 'Chakra Petch', sans-serif;
    `;

    this.container.innerHTML = `
      <!-- Red screen vignette flash on damage -->
      <div id="hud-damage-flash" style="position: absolute; inset: 0; background: radial-gradient(circle, transparent 55%, rgba(239,68,68,0.55) 100%); opacity: 0; transition: opacity 0.15s ease-out; pointer-events: none;"></div>

      <!-- Top Center: Glassmorphism ROUNDS Scoreboard -->
      <div id="hud-top-scoreboard" style="position: absolute; top: 18px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 18px; background: rgba(15, 23, 42, 0.72); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(56, 189, 248, 0.45); border-bottom: 3px solid #38bdf8; border-radius: 14px; padding: 10px 28px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(56, 189, 248, 0.2); font-size: 18px; font-weight: 900; letter-spacing: 2px;">
        <span style="color: #38bdf8;">RUNDA 1</span>
      </div>

      <!-- Top Left: Active ROUNDS Cards Glass Panel -->
      <div style="position: absolute; top: 18px; left: 22px; max-width: 340px; display: flex; flex-direction: column; gap: 8px;">
        <div style="background: rgba(15, 23, 42, 0.72); backdrop-filter: blur(10px); border-left: 4px solid #38bdf8; border-top: 1px solid rgba(255,255,255,0.1); padding: 7px 14px; border-radius: 6px; color: #f8fafc; font-size: 12px; font-weight: 800; letter-spacing: 1.5px; box-shadow: 0 4px 16px rgba(0,0,0,0.4);">
          ⚡ AKTYWNE MODUŁY (ROUNDS)
        </div>
        <div id="hud-my-cards" style="display: flex; flex-wrap: wrap; gap: 6px; font-size: 11px; font-weight: 700; color: #e2e8f0;">
          <span style="color: #64748b; background: rgba(15,23,42,0.5); padding: 4px 8px; border-radius: 4px;">Brak modułów — wybierz po przegranej rundzie</span>
        </div>
      </div>

      <!-- Center: Interaction Prompt -->
      <div id="hud-prompt" style="position: absolute; top: 62%; left: 50%; transform: translate(-50%, -50%); display: none; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px); border: 1px solid #38bdf8; border-bottom: 3px solid #38bdf8; padding: 10px 24px; border-radius: 10px; color: #f8fafc; font-size: 15px; font-weight: 800; letter-spacing: 1px; text-align: center; box-shadow: 0 0 25px rgba(56,189,248,0.35);">
        [E] INTERAKCJA
      </div>

      <!-- Center Pointer Lock Notice -->
      <div id="hud-pointerlock-notice" style="position: absolute; top: 42%; left: 50%; transform: translate(-50%, -50%); background: rgba(9, 13, 22, 0.88); backdrop-filter: blur(16px); border: 1px solid rgba(56,189,248,0.5); border-top: 3px solid #38bdf8; padding: 22px 38px; border-radius: 16px; color: #fff; font-size: 18px; font-weight: 900; text-align: center; letter-spacing: 1.5px; pointer-events: auto; cursor: pointer; box-shadow: 0 20px 50px rgba(0,0,0,0.85), 0 0 30px rgba(56,189,248,0.2);">
        🎯 KLIKNIJ, ABY AKTYWOWAĆ CELOWANIE 3D<br>
        <span style="font-size: 12px; color: #94a3b8; font-family: 'Inter', sans-serif; font-weight: 500; margin-top: 6px; display: inline-block;">[WASD] Ruch &bull; [SPACJA] Cyber-Dash &bull; [R] Przeładowanie &bull; [E] Broń ze stojaka</span>
      </div>

      <!-- Center Elimination Alert -->
      <div id="hud-dead-alert" style="display: none; position: absolute; top: 34%; left: 50%; transform: translate(-50%, -50%); background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(14px); border: 2px solid #ef4444; padding: 24px 48px; border-radius: 16px; color: #fff; font-size: 28px; font-weight: 900; text-align: center; letter-spacing: 2px; box-shadow: 0 0 50px rgba(239,68,68,0.5);">
        💀 WYELIMINOWANY<br>
        <div id="hud-respawn-countdown" style="font-size: 16px; color: #38bdf8; margin-top: 8px; letter-spacing: 1px;">TRWA WALKA POZOSTAŁYCH GRACZY...</div>
      </div>

      <!-- Bottom Left: Cyber Mode Badge -->
      <div id="hud-mode" style="position: absolute; bottom: 24px; left: 26px; background: rgba(15,23,42,0.65); backdrop-filter: blur(8px); border-left: 4px solid #ef4444; padding: 8px 16px; border-radius: 6px;">
        <div style="font-size: 10px; color: #94a3b8; font-weight: 700; letter-spacing: 2px;">CYBER ARENA</div>
        <div style="font-size: 24px; font-weight: 900; color: #f8fafc; letter-spacing: 2px;">ROUNDS 3D</div>
      </div>

      <!-- Bottom Center: Sleek Glassmorphism Health & Dash Bar -->
      <div style="position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); width: 380px; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.12); border-radius: 14px; padding: 12px 18px; display: flex; flex-direction: column; gap: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
        <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; font-weight: 800; color: #e2e8f0; letter-spacing: 1px;">
          <span>🛡️ PANCERZ / HP</span>
          <span id="hud-hp-val" style="color: #4ade80; font-size: 16px; font-weight: 900;">100 / 100</span>
        </div>
        <div style="width: 100%; height: 14px; background: rgba(9, 13, 22, 0.9); border-radius: 7px; overflow: hidden; padding: 2px; border: 1px solid rgba(255,255,255,0.08);">
          <div id="hud-hp-fill" style="width: 100%; height: 100%; background: linear-gradient(90deg, #10b981, #4ade80); border-radius: 5px; transition: width 0.1s ease-out; box-shadow: 0 0 12px rgba(74,222,128,0.5);"></div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 10px; font-weight: 800; color: #38bdf8; letter-spacing: 1px;">DASH</span>
          <div style="flex: 1; height: 5px; background: rgba(9, 13, 22, 0.9); border-radius: 3px; overflow: hidden;">
            <div id="hud-dash-fill" style="width: 100%; height: 100%; background: linear-gradient(90deg, #0284c7, #38bdf8); box-shadow: 0 0 8px #38bdf8;"></div>
          </div>
        </div>
      </div>

      <!-- Bottom Right: Weapon & Ammo Glass Panel -->
      <div style="position: absolute; bottom: 24px; right: 26px; background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.12); border-right: 4px solid #38bdf8; border-radius: 12px; padding: 10px 22px; text-align: right; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
        <div id="hud-weapon-name" style="font-size: 13px; font-weight: 800; color: #38bdf8; letter-spacing: 1.5px; text-transform: uppercase;">M16 Rifle</div>
        <div id="hud-ammo" style="font-size: 38px; font-weight: 900; color: #f8fafc; line-height: 1.1; text-shadow: 0 0 16px rgba(56,189,248,0.35);">30 / 300</div>
      </div>
    `;

    document.body.appendChild(this.container);

    this.topScoreboardEl = this.container.querySelector('#hud-top-scoreboard')!;
    this.myCardsEl = this.container.querySelector('#hud-my-cards')!;
    this.weaponEl = this.container.querySelector('#hud-weapon-name')!;
    this.ammoEl = this.container.querySelector('#hud-ammo')!;
    this.hpFillEl = this.container.querySelector('#hud-hp-fill')!;
    this.hpValEl = this.container.querySelector('#hud-hp-val')!;
    this.dashFillEl = this.container.querySelector('#hud-dash-fill')!;
    this.promptEl = this.container.querySelector('#hud-prompt')!;
    this.pointerLockPrompt = this.container.querySelector('#hud-pointerlock-notice')!;
    this.deadAlert = this.container.querySelector('#hud-dead-alert')!;
    this.respawnCountdown = this.container.querySelector('#hud-respawn-countdown')!;
    this.damageFlash = this.container.querySelector('#hud-damage-flash')!;
  }

  private isLocked: boolean = false;
  private isDraftOpen: boolean = false;

  public setPointerLocked(isLocked: boolean): void {
    this.isLocked = isLocked;
    this.updateNoticeVisibility();
  }

  public setShopOpen(isOpen: boolean): void {
    this.isDraftOpen = isOpen;
    this.updateNoticeVisibility();
  }

  private updateNoticeVisibility(): void {
    if (this.isLocked || this.isDraftOpen) {
      this.pointerLockPrompt.style.display = 'none';
    } else {
      this.pointerLockPrompt.style.display = 'block';
    }
  }

  public setPrompt(text: string | null): void {
    if (text) {
      this.promptEl.style.display = 'block';
      this.promptEl.textContent = text;
    } else {
      this.promptEl.style.display = 'none';
    }
  }

  public update(player: PlayerState, snapshot: GameSnapshot): void {
    // 1. Top ROUNDS Scoreboard
    const scoreItems = snapshot.players.map((p) => {
      const wins = p.roundWins || 0;
      const isMe = p.id === player.id;
      return `<span style="color: ${p.color || '#fff'}; font-weight: 900;">${p.name}${isMe ? ' (TY)' : ''}: <span style="color: #fbbf24; font-size: 21px;">${wins} ⭐</span></span>`;
    });

    this.topScoreboardEl.innerHTML = `
      <span style="color: #38bdf8; font-size: 13px; background: rgba(56,189,248,0.16); border: 1px solid rgba(56,189,248,0.4); padding: 4px 10px; border-radius: 6px;">RUNDA ${snapshot.round}</span>
      <div style="display: flex; gap: 18px; align-items: center;">${scoreItems.join('<span style="color: #334155;">|</span>')}</div>
    `;

    // 2. Active ROUNDS cards list
    if (player.cards && player.cards.length > 0) {
      const cardBadges = player.cards.map((cId) => {
        const cDef = ROUNDS_CARDS.find((c) => c.id === cId);
        const name = cDef ? cDef.name : cId;
        return `<span style="background: rgba(15, 23, 42, 0.82); backdrop-filter: blur(6px); border: 1px solid rgba(56, 189, 248, 0.5); padding: 3px 8px; border-radius: 5px; color: #f8fafc; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">${name}</span>`;
      });
      this.myCardsEl.innerHTML = cardBadges.join('');
    } else {
      this.myCardsEl.innerHTML = `<span style="color: #64748b; background: rgba(15,23,42,0.5); padding: 4px 8px; border-radius: 4px;">Brak modułów — wybierz po przegranej rundzie</span>`;
    }

    // 3. Weapon & Ammo
    const wep = WEAPONS[player.weaponId];
    this.weaponEl.textContent = wep.name;
    if (player.isReloading) {
      const pct = Math.floor(player.reloadProgress * 100);
      this.ammoEl.innerHTML = `<span style="font-size: 22px; color: #fbbf24;">PRZEŁADOWANIE ${pct}%</span>`;
    } else {
      this.ammoEl.textContent = `${player.ammoClip} / ${player.ammoReserve}`;
    }

    // 4. Local Player HP
    const currentHp = Math.max(0, Math.ceil(player.hp));
    this.hpValEl.textContent = `${currentHp} / ${player.maxHp}`;
    const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
    this.hpFillEl.style.width = `${hpPct}%`;

    if (hpPct > 50) {
      this.hpFillEl.style.background = 'linear-gradient(90deg, #10b981, #4ade80)';
      this.hpValEl.style.color = '#4ade80';
    } else if (hpPct > 25) {
      this.hpFillEl.style.background = 'linear-gradient(90deg, #d97706, #fbbf24)';
      this.hpValEl.style.color = '#fbbf24';
    } else {
      this.hpFillEl.style.background = 'linear-gradient(90deg, #b91c1c, #ef4444)';
      this.hpValEl.style.color = '#f87171';
    }

    if (player.hp < this.lastHp) {
      this.damageFlash.style.opacity = '1';
      setTimeout(() => {
        if (this.damageFlash) this.damageFlash.style.opacity = '0';
      }, 140);
    }
    this.lastHp = player.hp;

    // 5. Dash cooldown
    const dashPct = player.dashCooldownRemaining > 0 ? (1 - player.dashCooldownRemaining / 4000) * 100 : 100;
    this.dashFillEl.style.width = `${Math.max(0, Math.min(100, dashPct))}%`;

    // 6. Elimination Alert
    if (player.isDead) {
      this.deadAlert.style.display = 'block';
      if (snapshot.roundState === 'card_pick') {
        if (snapshot.cardPickerId === player.id) {
          this.respawnCountdown.textContent = 'WYBIERZ 1 Z 3 KART ULEPSZEŃ!';
        } else {
          this.respawnCountdown.textContent = `WYBIERA TERAZ: ${snapshot.cardPickerName || 'GRACZ'}...`;
        }
      } else {
        const aliveCount = snapshot.players.filter((p) => !p.isDead).length;
        this.respawnCountdown.textContent = `POZOSTAŁO W WALCE: ${aliveCount} GRACZY`;
      }
    } else {
      this.deadAlert.style.display = 'none';
    }
  }

  public destroy(): void {
    if (this.container.parentNode) {
      this.container.remove();
    }
  }
}
