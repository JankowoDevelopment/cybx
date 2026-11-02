import { PlayerState, GameSnapshot, WeaponType } from '@shared/types.js';
import { WEAPONS } from '@shared/weapons.js';

export class DoomHud {
  private container: HTMLElement;

  private roundEl: HTMLElement;
  private pointsEl: HTMLElement;
  private weaponEl: HTMLElement;
  private ammoEl: HTMLElement;
  private hpFillEl: HTMLElement;
  private dashFillEl: HTMLElement;
  private grenadeEl: HTMLElement;
  private powerupsEl: HTMLElement;
  private promptEl: HTMLElement;
  private pointerLockPrompt: HTMLElement;
  private downedAlert: HTMLElement;

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
      <!-- Top Left: Shop Hint -->
      <div style="position: absolute; top: 24px; left: 24px; background: rgba(15,23,42,0.85); border: 1px solid #f59e0b; padding: 6px 14px; border-radius: 6px; color: #fbbf24; font-size: 13px; font-weight: 700; letter-spacing: 1px;">
        ⚡ [B] SKLEP ULEPSZEŃ DEADLOCKA
      </div>

      <!-- Top Right: Points -->
      <div id="hud-points" style="position: absolute; top: 20px; right: 28px; font-size: 32px; font-weight: 900; color: #fbbf24; text-shadow: 0 0 15px rgba(251,191,36,0.5);">
        💰 500 PKT
      </div>

      <!-- Top Center: Active Powerups -->
      <div id="hud-powerups" style="position: absolute; top: 30px; left: 50%; transform: translateX(-50%); font-size: 18px; font-weight: 900; color: #ef4444; letter-spacing: 2px;"></div>

      <!-- Center: Interaction Prompt -->
      <div id="hud-prompt" style="position: absolute; top: 62%; left: 50%; transform: translate(-50%, -50%); display: none; background: rgba(15,23,42,0.92); border: 2px solid #fbbf24; padding: 8px 20px; border-radius: 8px; color: #f8fafc; font-size: 16px; font-weight: 800; text-align: center; box-shadow: 0 0 25px rgba(0,0,0,0.8);">
        [E] INTERAKCJA
      </div>

      <!-- Center Pointer Lock Notice -->
      <div id="hud-pointerlock-notice" style="position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.85); border: 2px solid #ef4444; padding: 14px 28px; border-radius: 10px; color: #fff; font-size: 18px; font-weight: 900; text-align: center; letter-spacing: 1px; pointer-events: auto; cursor: pointer;">
        🖱️ KLIKNIJ TUTAJ, ABY WŁĄCZYĆ STEROWANIE MYSZKĄ (DOOM 3D)<br>
        <span style="font-size: 12px; color: #94a3b8; font-family: 'Inter', sans-serif;">[WASD] Ruch &bull; [Mysz] Rozglądanie & Strzał &bull; [ESC/B] Zwolnienie kursora &bull; [Spacja] Dash</span>
      </div>

      <!-- Center Downed Alert -->
      <div id="hud-downed-alert" style="display: none; position: absolute; top: 30%; left: 50%; transform: translate(-50%, -50%); background: rgba(220,38,38,0.9); padding: 16px 32px; border-radius: 8px; color: #fff; font-size: 26px; font-weight: 900; letter-spacing: 2px; text-shadow: 0 0 20px #000;">
        ⚠️ ZOSTAŁEŚ POWALONY! CZEKAJ NA REANIMACJĘ!
      </div>

      <!-- Bottom Left: Round -->
      <div id="hud-round" style="position: absolute; bottom: 24px; left: 28px; font-size: 52px; font-weight: 900; color: #ef4444; text-shadow: 0 0 25px rgba(239,68,68,0.7); letter-spacing: 2px;">
        RUNDA 1
      </div>

      <!-- Bottom Center: Health & Dash Bar -->
      <div style="position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); width: 280px; display: flex; flex-direction: column; gap: 4px;">
        <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; color: #cbd5e1;">
          <span>❤️ ZDROWIE</span>
          <span id="hud-grenades">💣 GRANATY: 2 [G]</span>
        </div>
        <div style="width: 100%; height: 16px; background: #1e293b; border: 2px solid #475569; border-radius: 4px; overflow: hidden;">
          <div id="hud-hp-fill" style="width: 100%; height: 100%; background: #22c55e; transition: width 0.1s;"></div>
        </div>
        <div style="width: 100%; height: 4px; background: #0f172a; border-radius: 2px; overflow: hidden;">
          <div id="hud-dash-fill" style="width: 100%; height: 100%; background: #38bdf8;"></div>
        </div>
      </div>

      <!-- Bottom Right: Weapon & Ammo -->
      <div style="position: absolute; bottom: 24px; right: 28px; text-align: right;">
        <div id="hud-weapon-name" style="font-size: 18px; font-weight: 800; color: #94a3b8; margin-bottom: 2px;">M1911 Pistol</div>
        <div id="hud-ammo" style="font-size: 44px; font-weight: 900; color: #f8fafc; text-shadow: 0 0 20px rgba(255,255,255,0.4);">8 / 40</div>
      </div>
    `;

    document.body.appendChild(this.container);

    this.roundEl = this.container.querySelector('#hud-round')!;
    this.pointsEl = this.container.querySelector('#hud-points')!;
    this.weaponEl = this.container.querySelector('#hud-weapon-name')!;
    this.ammoEl = this.container.querySelector('#hud-ammo')!;
    this.hpFillEl = this.container.querySelector('#hud-hp-fill')!;
    this.dashFillEl = this.container.querySelector('#hud-dash-fill')!;
    this.grenadeEl = this.container.querySelector('#hud-grenades')!;
    this.powerupsEl = this.container.querySelector('#hud-powerups')!;
    this.promptEl = this.container.querySelector('#hud-prompt')!;
    this.pointerLockPrompt = this.container.querySelector('#hud-pointerlock-notice')!;
    this.downedAlert = this.container.querySelector('#hud-downed-alert')!;
  }

  public setPointerLocked(isLocked: boolean): void {
    this.pointerLockPrompt.style.display = isLocked ? 'none' : 'block';
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
    this.roundEl.textContent = `RUNDA ${snapshot.round}`;
    this.pointsEl.textContent = `💰 ${player.points.toLocaleString()} PKT`;

    const wep = WEAPONS[player.weaponId];
    this.weaponEl.textContent = wep.name;
    if (player.isReloading) {
      const pct = Math.floor(player.reloadProgress * 100);
      this.ammoEl.textContent = `PRZEŁADOWANIE (${pct}%)`;
    } else {
      this.ammoEl.textContent = `${player.ammoClip} / ${player.ammoReserve}`;
    }

    const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
    this.hpFillEl.style.width = `${hpPct}%`;
    this.hpFillEl.style.background = player.downed ? '#ef4444' : hpPct < 30 ? '#dc2626' : '#22c55e';

    const dashPct = player.dashCooldownRemaining > 0 ? (1 - player.dashCooldownRemaining / 4000) * 100 : 100;
    this.dashFillEl.style.width = `${Math.max(0, Math.min(100, dashPct))}%`;

    this.grenadeEl.textContent = `💣 GRANATY: ${player.grenadesRemaining} [G]`;
    this.downedAlert.style.display = player.downed ? 'block' : 'none';

    const puList: string[] = [];
    if (snapshot.activePowerUps.instaKill > 0) {
      puList.push(`☠ INSTA-KILL (${Math.ceil(snapshot.activePowerUps.instaKill / 1000)}s)`);
    }
    if (snapshot.activePowerUps.doublePoints > 0) {
      puList.push(`2X DOUBLE POINTS (${Math.ceil(snapshot.activePowerUps.doublePoints / 1000)}s)`);
    }
    this.powerupsEl.textContent = puList.join('   ');
  }

  public destroy(): void {
    if (this.container.parentNode) {
      this.container.remove();
    }
  }
}
