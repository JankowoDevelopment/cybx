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
      <!-- Red screen flash on damage -->
      <div id="hud-damage-flash" style="position: absolute; inset: 0; background: radial-gradient(circle, transparent 60%, rgba(239,68,68,0.5) 100%); opacity: 0; transition: opacity 0.15s ease-out; pointer-events: none;"></div>

      <!-- Top Center: ROUNDS Scoreboard (Zliczanie punktów u góry) -->
      <div id="hud-top-scoreboard" style="position: absolute; top: 16px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 16px; background: rgba(15, 23, 42, 0.92); border: 2px solid #ef4444; border-radius: 12px; padding: 8px 26px; box-shadow: 0 0 30px rgba(239,68,68,0.45); font-size: 18px; font-weight: 900; letter-spacing: 2px; text-shadow: 0 0 10px rgba(0,0,0,0.8);">
        <span style="color: #ef4444;">RUNDA 1</span>
      </div>

      <!-- Top Left: Player's Active Cards List -->
      <div style="position: absolute; top: 20px; left: 24px; max-width: 320px; display: flex; flex-direction: column; gap: 6px;">
        <div style="background: rgba(15,23,42,0.85); border: 1px solid #38bdf8; padding: 6px 14px; border-radius: 6px; color: #38bdf8; font-size: 13px; font-weight: 800; letter-spacing: 1px;">
          🃏 TWOJE ULEPSZENIA (ROUNDS)
        </div>
        <div id="hud-my-cards" style="display: flex; flex-wrap: wrap; gap: 4px; font-size: 11px; font-weight: 700; color: #cbd5e1;">
          <span style="color: #64748b;">(brak kart - zdobądź po przegranej rundzie)</span>
        </div>
      </div>

      <!-- Center: Interaction Prompt -->
      <div id="hud-prompt" style="position: absolute; top: 62%; left: 50%; transform: translate(-50%, -50%); display: none; background: rgba(15,23,42,0.92); border: 2px solid #fbbf24; padding: 8px 20px; border-radius: 8px; color: #f8fafc; font-size: 16px; font-weight: 800; text-align: center; box-shadow: 0 0 25px rgba(0,0,0,0.8);">
        [E] INTERAKCJA
      </div>

      <!-- Center Pointer Lock Notice -->
      <div id="hud-pointerlock-notice" style="position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.88); border: 2px solid #ef4444; padding: 18px 32px; border-radius: 12px; color: #fff; font-size: 18px; font-weight: 900; text-align: center; letter-spacing: 1px; pointer-events: auto; cursor: pointer; box-shadow: 0 0 35px rgba(0,0,0,0.9);">
        🖱️ KLIKNIJ TUTAJ, ABY WŁĄCZYĆ STEROWANIE MYSZKĄ<br>
        <span style="font-size: 13px; color: #94a3b8; font-family: 'Inter', sans-serif;">[WASD] Ruch &bull; [Mysz] Celowanie & Strzał &bull; [ESC] Zwolnij kursor</span>
      </div>

      <!-- Center Elimination / Respawn Alert -->
      <div id="hud-dead-alert" style="display: none; position: absolute; top: 35%; left: 50%; transform: translate(-50%, -50%); background: rgba(185,28,28,0.95); border: 3px solid #ef4444; padding: 22px 45px; border-radius: 12px; color: #fff; font-size: 30px; font-weight: 900; text-align: center; letter-spacing: 2px; text-shadow: 0 0 25px #000; box-shadow: 0 0 60px rgba(239,68,68,0.85);">
        💀 ZOSTAŁEŚ POKONANY!<br>
        <div id="hud-respawn-countdown" style="font-size: 20px; color: #fef08a; margin-top: 8px;">WYBIERANIE KARTY ULEPSZENIA...</div>
      </div>

      <!-- Bottom Left: Game Mode -->
      <div id="hud-mode" style="position: absolute; bottom: 24px; left: 28px; font-size: 36px; font-weight: 900; color: #ef4444; text-shadow: 0 0 25px rgba(239,68,68,0.7); letter-spacing: 2px;">
        ROUNDS 3D
      </div>

      <!-- Bottom Center: Health & Dash Bar -->
      <div style="position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); width: 340px; display: flex; flex-direction: column; gap: 6px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 14px; font-weight: 900; color: #f8fafc;">
          <span>❤️ ZDROWIE: <span id="hud-hp-val" style="color: #4ade80; font-size: 16px;">100 / 100</span></span>
          <span style="font-size: 11px; color: #64748b;">💣 GRANATY: [WYŁĄCZONE]</span>
        </div>
        <div style="width: 100%; height: 20px; background: #0f172a; border: 2px solid #334155; border-radius: 6px; overflow: hidden; box-shadow: 0 0 15px rgba(0,0,0,0.7);">
          <div id="hud-hp-fill" style="width: 100%; height: 100%; background: #22c55e; transition: width 0.08s ease-out;"></div>
        </div>
        <div style="width: 100%; height: 6px; background: #0f172a; border-radius: 3px; overflow: hidden;">
          <div id="hud-dash-fill" style="width: 100%; height: 100%; background: #38bdf8;"></div>
        </div>
      </div>

      <!-- Bottom Right: Weapon & Ammo -->
      <div style="position: absolute; bottom: 24px; right: 28px; text-align: right;">
        <div id="hud-weapon-name" style="font-size: 20px; font-weight: 900; color: #94a3b8; margin-bottom: 2px;">M16 Rifle</div>
        <div id="hud-ammo" style="font-size: 44px; font-weight: 900; color: #f8fafc; text-shadow: 0 0 20px rgba(255,255,255,0.4);">30 / 300</div>
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
    // 1. Zliczaj punkty u góry (ROUNDS Scoreboard)
    const scoreItems = snapshot.players.map((p) => {
      const wins = p.roundWins || 0;
      const isMe = p.id === player.id;
      return `<span style="color: ${p.color || '#fff'}; font-weight: 900;">${p.name}${isMe ? ' (TY)' : ''}: <span style="color: #fbbf24; font-size: 22px;">${wins} ⭐</span></span>`;
    });

    this.topScoreboardEl.innerHTML = `
      <span style="color: #ef4444; font-size: 14px; background: rgba(239,68,68,0.2); padding: 4px 8px; border-radius: 4px;">RUNDA ${snapshot.round}</span>
      <div style="display: flex; gap: 16px; align-items: center;">${scoreItems.join('<span style="color: #475569;">•</span>')}</div>
    `;

    // 2. Active ROUNDS cards list
    if (player.cards && player.cards.length > 0) {
      const cardBadges = player.cards.map((cId) => {
        const cDef = ROUNDS_CARDS.find((c) => c.id === cId);
        const name = cDef ? cDef.name : cId;
        return `<span style="background: rgba(30,41,59,0.9); border: 1px solid #38bdf8; padding: 2px 6px; border-radius: 4px;">${name}</span>`;
      });
      this.myCardsEl.innerHTML = cardBadges.join('');
    } else {
      this.myCardsEl.innerHTML = `<span style="color: #64748b;">(brak kart - zdobądź po przegranej rundzie)</span>`;
    }

    // 3. Weapon & Ammo
    const wep = WEAPONS[player.weaponId];
    this.weaponEl.textContent = wep.name;
    if (player.isReloading) {
      const pct = Math.floor(player.reloadProgress * 100);
      this.ammoEl.textContent = `PRZEŁADOWANIE (${pct}%)`;
    } else {
      this.ammoEl.textContent = `${player.ammoClip} / ${player.ammoReserve}`;
    }

    // 4. Local Player HP
    const currentHp = Math.max(0, Math.ceil(player.hp));
    this.hpValEl.textContent = `${currentHp} / ${player.maxHp}`;
    const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
    this.hpFillEl.style.width = `${hpPct}%`;

    if (hpPct > 50) {
      this.hpFillEl.style.background = '#22c55e';
      this.hpValEl.style.color = '#4ade80';
    } else if (hpPct > 25) {
      this.hpFillEl.style.background = '#f59e0b';
      this.hpValEl.style.color = '#fbbf24';
    } else {
      this.hpFillEl.style.background = '#ef4444';
      this.hpValEl.style.color = '#f87171';
    }

    // Damage flash
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
          this.respawnCountdown.textContent = `OCZEKIWANIE NA WYBÓR KARTY PRZEZ: ${snapshot.cardPickerName || 'GRACZA'}...`;
        }
      } else {
        const secLeft = Math.max(0, player.respawnTimer / 1000).toFixed(1);
        this.respawnCountdown.textContent = `NOWA RUNDA ZA ${secLeft}s`;
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
