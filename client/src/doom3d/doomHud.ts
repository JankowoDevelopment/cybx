import { PlayerState, GameSnapshot } from '@shared/types.js';
import { WEAPONS } from '@shared/weapons.js';
import { ROUNDS_CARDS } from '@shared/cards.js';
import { GAME_VERSION } from '@shared/constants.js';
import { soundSystem } from '../audio/soundSystem.js';
import { settingsManager } from '../settings/settingsManager.js';
import { profileManager } from '../settings/profileManager.js';

export class DoomHud {
  private container: HTMLElement;

  private topScoreboardEl: HTMLElement;
  private myCardsEl: HTMLElement;
  private killfeedEl: HTMLElement;
  private fpsBadgeEl: HTMLElement;
  private subtlePointsEl: HTMLElement;
  private winPointsOverlayEl: HTMLElement;
  private winPointsCounterEl: HTMLElement;
  private muteBtnEl: HTMLButtonElement;
  private settingsBtnEl: HTMLButtonElement;
  private weaponEl: HTMLElement;
  private weaponTypeEl: HTMLElement;
  private ammoEl: HTMLElement;
  private hpFillEl: HTMLElement;
  private hpValEl: HTMLElement;
  private dashFillEl: HTMLElement;
  private bhopBadgeEl: HTMLElement;
  private promptEl: HTMLElement;
  private pointerLockPrompt: HTMLElement;
  private deadAlert: HTMLElement;
  private deadTitleEl: HTMLElement;
  private deadWinnerEl: HTMLElement;
  private respawnCountdown: HTMLElement;
  private damageFlash: HTMLElement;
  private cinematicOverlayEl: HTMLElement;
  private cinematicRoundEl: HTMLElement;
  private cinematicNumberEl: HTMLElement;

  private lastHp: number = 100;
  private lastCountdownSecond: number = -1;
  private lastCardsKey: string = '__init__';
  private lastScoreKey: string = '__init__';
  private lastRewardedWinRound: number = -1;
  public onOpenSettings?: () => void;

  constructor() {
    const prof = profileManager.get();

    this.container = document.createElement('div');
    this.container.id = 'doom3d-hud';
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 15;
      font-family: 'Rajdhani', 'Orbitron', sans-serif;
    `;

    this.container.innerHTML = `
      <!-- Red screen vignette flash on damage -->
      <div id="hud-damage-flash" style="position: absolute; inset: 0; background: radial-gradient(circle, transparent 55%, rgba(239,68,68,0.65) 100%); opacity: 0; transition: opacity 0.15s ease-out; pointer-events: none;"></div>

      <!-- Top Center: Cyberpunk Tournament Scoreboard -->
      <div id="hud-top-scoreboard" style="position: absolute; top: 18px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 18px; background: rgba(5, 9, 18, 0.88); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border: 1px solid rgba(0, 240, 255, 0.35); border-bottom: 3px solid #00f0ff; clip-path: polygon(14px 0, calc(100% - 14px) 0, 100% 100%, 0 100%); padding: 10px 30px; box-shadow: 0 10px 35px rgba(0, 0, 0, 0.75), 0 0 25px rgba(0, 240, 255, 0.2); font-size: 16px; font-weight: 900; letter-spacing: 2px;">
        <span style="color: #00f0ff; font-family: 'Orbitron', sans-serif;">RUNDA 1</span>
      </div>

      <!-- Top Left: Active Cyberware Chips (ROUNDS) -->
      <div style="position: absolute; top: 18px; left: 24px; max-width: 360px; display: flex; flex-direction: column; gap: 8px;">
        <div style="background: rgba(5, 9, 18, 0.85); backdrop-filter: blur(10px); border-left: 3px solid #00f0ff; border-top: 1px solid rgba(0, 240, 255, 0.25); padding: 7px 14px; clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%); color: #00f0ff; font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 2px; box-shadow: 0 4px 16px rgba(0,0,0,0.5);">
          ⚡ CYBERWARE CHIPS // ACTIVE
        </div>
        <div id="hud-my-cards" style="display: flex; flex-wrap: wrap; gap: 6px; font-size: 11px; font-weight: 700; color: #e2e8f0;">
          <span style="color: #64748b; background: rgba(5,9,18,0.6); padding: 4px 8px; border-radius: 4px;">Brak modułów — wybierz po przegranej rundzie</span>
        </div>
      </div>

      <!-- Top Right: Telemetry & Actions + Live Killfeed -->
      <div style="position: absolute; top: 18px; right: 24px; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px; pointer-events: auto;">
          <div id="hud-subtle-points" style="opacity: 0.35; color: #fbbf24; font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 800; padding: 5px 9px; border-radius: 4px; letter-spacing: 1px;">
            💎 ${prof.points} PKT
          </div>
          <div id="hud-fps-badge" style="background: rgba(5, 9, 18, 0.88); border: 1px solid rgba(34, 197, 94, 0.45); color: #4ade80; font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 800; padding: 6px 11px; border-radius: 4px; letter-spacing: 1px;">
            60 FPS
          </div>
          <button id="hud-btn-mute" style="background: rgba(5, 9, 18, 0.88); border: 1px solid rgba(0, 240, 255, 0.45); color: #f8fafc; font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 800; padding: 6px 12px; cursor: pointer; transition: all 0.2s ease;">
            🔊 [M]
          </button>
          <button id="hud-btn-settings" style="background: rgba(5, 9, 18, 0.88); border: 1px solid rgba(0, 240, 255, 0.6); color: #00f0ff; font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 800; padding: 6px 12px; cursor: pointer; transition: all 0.2s ease;">
            ⚙️ OPCJE [P]
          </button>
        </div>
        <div id="hud-killfeed" style="width: 340px; display: flex; flex-direction: column; align-items: flex-end; gap: 6px; pointer-events: none;">
        </div>
      </div>

      <!-- Round Win +100 PKT Animated Count-Up Banner -->
      <div id="hud-win-points-overlay" style="display: none; position: absolute; top: 18%; left: 50%; transform: translate(-50%, -50%); background: linear-gradient(145deg, rgba(5, 9, 18, 0.96), rgba(2, 6, 12, 0.98)); border: 2px solid #f59e0b; clip-path: polygon(14px 0, calc(100% - 14px) 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px), 0 14px); padding: 18px 40px; text-align: center; box-shadow: 0 0 50px rgba(245, 158, 11, 0.6); z-index: 260; pointer-events: none;">
        <div style="font-family: 'Orbitron', sans-serif; font-size: 13px; font-weight: 900; color: #4ade80; letter-spacing: 3px; margin-bottom: 6px; text-transform: uppercase;">
          🏆 ZWYCIĘSTWO RUNDY // REWARD +100 PKT
        </div>
        <div id="hud-win-points-counter" style="font-family: 'Orbitron', sans-serif; font-size: 38px; font-weight: 900; color: #fbbf24; letter-spacing: 2px; text-shadow: 0 0 25px rgba(251, 191, 36, 0.9);">
          💎 500 PKT
        </div>
      </div>

      <!-- Center: Interaction Prompt -->
      <div id="hud-prompt" style="position: absolute; top: 62%; left: 50%; transform: translate(-50%, -50%); display: none; background: rgba(5, 9, 18, 0.88); backdrop-filter: blur(10px); border: 1px solid #00f0ff; border-bottom: 3px solid #00f0ff; padding: 10px 26px; border-radius: 4px; color: #f8fafc; font-family: 'Orbitron', sans-serif; font-size: 14px; font-weight: 800; letter-spacing: 1.5px; text-align: center; box-shadow: 0 0 30px rgba(0,240,255,0.4);">
        [E] INTERAKCJA
      </div>

      <!-- Center Pointer Lock Notice -->
      <div id="hud-pointerlock-notice" style="position: absolute; top: 42%; left: 50%; transform: translate(-50%, -50%); background: rgba(5, 9, 18, 0.92); backdrop-filter: blur(16px); border: 1px solid rgba(0, 240, 255, 0.5); border-top: 3px solid #00f0ff; clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); padding: 24px 42px; color: #fff; font-family: 'Orbitron', sans-serif; font-size: 18px; font-weight: 900; text-align: center; letter-spacing: 2px; pointer-events: auto; cursor: pointer; box-shadow: 0 20px 50px rgba(0,0,0,0.85), 0 0 35px rgba(0, 240, 255, 0.25);">
        🎯 KLIKNIJ, ABY AKTYWOWAĆ CELOWANIE 3D<br>
        <span style="font-size: 12px; color: #94a3b8; font-family: 'Rajdhani', sans-serif; font-weight: 600; letter-spacing: 1.5px; margin-top: 8px; display: inline-block;">[WASD] Ruch &bull; [SPACJA] Skok / Bhop &bull; [L-SHIFT] Dash &bull; [R] Przeładowanie</span>
      </div>

      <!-- Center Elimination Alert -->
      <div id="hud-dead-alert" style="display: none; position: absolute; top: 32%; left: 50%; transform: translate(-50%, -50%); background: rgba(5, 9, 18, 0.94); backdrop-filter: blur(16px); border: 2px solid #ef4444; clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px); padding: 24px 48px; color: #fff; text-align: center; letter-spacing: 2px; box-shadow: 0 0 55px rgba(239,68,68,0.65);">
        <div id="hud-dead-title" style="font-family: 'Orbitron', sans-serif; font-size: 28px; font-weight: 900; color: #ef4444; letter-spacing: 2px;">💀 ZOSTAŁEŚ ZABITY!</div>
        <div id="hud-dead-winner" style="display: none; font-family: 'Orbitron', sans-serif; font-size: 18px; font-weight: 900; color: #4ade80; margin-top: 10px; background: rgba(34,197,94,0.15); border: 1px solid #22c55e; padding: 5px 18px; border-radius: 4px;"></div>
        <div id="hud-respawn-countdown" style="font-family: 'Rajdhani', sans-serif; font-size: 16px; font-weight: 700; color: #00f0ff; margin-top: 12px; letter-spacing: 1.5px;">TRWA WALKA POZOSTAŁYCH GRACZY...</div>
      </div>

      <!-- Cinematic Countdown Overlay -->
      <div id="hud-cinematic-overlay" style="display: none; position: absolute; inset: 0; pointer-events: none; z-index: 40;">
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 9vh; background: linear-gradient(180deg, #020408 75%, transparent 100%); border-bottom: 2px solid rgba(0, 240, 255, 0.45);"></div>
        <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 9vh; background: linear-gradient(0deg, #020408 75%, transparent 100%); border-top: 2px solid rgba(0, 240, 255, 0.45);"></div>
        <div style="position: absolute; top: 46%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
          <div id="hud-cinematic-round" style="font-family: 'Orbitron', sans-serif; font-size: 22px; font-weight: 900; color: #00f0ff; letter-spacing: 6px; text-transform: uppercase; text-shadow: 0 0 25px rgba(0, 240, 255, 0.85); margin-bottom: 6px;">
            RUNDA 1 — PRZYGOTUJ SIĘ
          </div>
          <div id="hud-cinematic-number" style="font-family: 'Orbitron', sans-serif; font-size: 120px; font-weight: 900; color: #fbbf24; line-height: 1; letter-spacing: 4px; text-shadow: 0 0 55px rgba(251, 191, 36, 0.95), 0 0 18px #ffffff; transition: transform 0.15s ease-out;">
            3
          </div>
          <div style="font-family: 'Rajdhani', sans-serif; font-size: 13px; font-weight: 800; color: #94a3b8; letter-spacing: 3px; margin-top: 10px; background: rgba(5, 9, 18, 0.85); padding: 6px 20px; border-radius: 999px; border: 1px solid rgba(0, 240, 255, 0.2);">
            🔒 SYSTEMY ZABLOKOWANE DO STARTU RUNDY
          </div>
        </div>
      </div>

      <!-- Bottom Left: Cyberpunk Biometrics & Vitals Module -->
      <div id="hud-biometrics-module" style="position: absolute; bottom: 26px; left: 26px; width: 330px; background: rgba(5, 9, 18, 0.88); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border: 1px solid rgba(0, 240, 255, 0.35); border-left: 4px solid #00f0ff; clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%); padding: 14px 18px 12px 18px; box-shadow: 0 12px 40px rgba(0,0,0,0.8), 0 0 25px rgba(0, 240, 255, 0.15); display: flex; flex-direction: column; gap: 9px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0, 240, 255, 0.2); padding-bottom: 6px;">
          <div style="display: flex; align-items: center; gap: 7px;">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #00f0ff; box-shadow: 0 0 8px #00f0ff;"></span>
            <span style="font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 800; color: #00f0ff; letter-spacing: 2px;">VITALS // BIOMETRICS</span>
          </div>
          <span style="font-family: 'Rajdhani', sans-serif; font-size: 11px; font-weight: 800; color: #64748b; letter-spacing: 1px;">v${GAME_VERSION}</span>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px;">
            <span style="font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 800; color: #94a3b8; letter-spacing: 1.5px;">HEALTH // HP</span>
            <div>
              <span id="hud-hp-val" style="font-family: 'Orbitron', sans-serif; font-size: 26px; font-weight: 900; color: #00f0ff; text-shadow: 0 0 14px rgba(0,240,255,0.7); line-height: 1;">100</span>
              <span style="font-size: 12px; font-weight: 700; color: #64748b; margin-left: 3px;">/ 100</span>
            </div>
          </div>
          <div style="width: 100%; height: 10px; background: rgba(2, 6, 12, 0.95); border: 1px solid rgba(0, 240, 255, 0.25); border-radius: 2px; padding: 1px; overflow: hidden; position: relative;">
            <div id="hud-hp-fill" style="width: 100%; height: 100%; background: linear-gradient(90deg, #0284c7, #00f0ff); transition: width 0.12s ease-out; box-shadow: 0 0 12px rgba(0,240,255,0.6);"></div>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-family: 'Rajdhani', sans-serif; font-size: 10px; font-weight: 800; color: #38bdf8; letter-spacing: 1.5px;">THRUST // DASH [L-SHIFT]</span>
            <span id="hud-bhop-badge" style="display: none; font-family: 'Orbitron', sans-serif; font-size: 9px; font-weight: 900; color: #f59e0b; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.4); padding: 1px 6px; border-radius: 3px;">BHOP x1</span>
          </div>
          <div style="width: 100%; height: 5px; background: rgba(2, 6, 12, 0.95); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 2px; overflow: hidden;">
            <div id="hud-dash-fill" style="width: 100%; height: 100%; background: linear-gradient(90deg, #0369a1, #38bdf8); transition: width 0.08s ease-out; box-shadow: 0 0 8px #38bdf8;"></div>
          </div>
        </div>
      </div>

      <!-- Bottom Right: Cyberpunk Munitions & Weapon Panel -->
      <div id="hud-munitions-module" style="position: absolute; bottom: 26px; right: 26px; width: 310px; background: rgba(5, 9, 18, 0.88); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border: 1px solid rgba(245, 158, 11, 0.35); border-right: 4px solid #f59e0b; clip-path: polygon(16px 0, 100% 0, 100% 100%, 0 100%, 0 16px); padding: 14px 18px 12px 18px; box-shadow: 0 12px 40px rgba(0,0,0,0.8), 0 0 25px rgba(245, 158, 11, 0.15); display: flex; flex-direction: column; gap: 8px; text-align: right;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(245, 158, 11, 0.2); padding-bottom: 6px;">
          <span style="font-family: 'Rajdhani', sans-serif; font-size: 10px; font-weight: 800; color: #64748b; letter-spacing: 1.5px;">FIRE CONTROL // [R] RELOAD</span>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 800; color: #f59e0b; letter-spacing: 2px;">MUNITIONS</span>
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; box-shadow: 0 0 8px #f59e0b;"></span>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span id="hud-weapon-type" style="font-family: 'Rajdhani', sans-serif; font-size: 11px; font-weight: 700; color: #94a3b8; letter-spacing: 1px;">KINETIC FIREARM</span>
          <div id="hud-weapon-name" style="font-family: 'Orbitron', sans-serif; font-size: 15px; font-weight: 900; color: #f8fafc; letter-spacing: 2px; text-transform: uppercase; text-shadow: 0 0 12px rgba(245, 158, 11, 0.4);">M16 RIFLE</div>
        </div>

        <div id="hud-ammo-container" style="display: flex; justify-content: flex-end; align-items: baseline; gap: 6px; line-height: 1;">
          <span id="hud-ammo" style="font-family: 'Orbitron', sans-serif; font-size: 38px; font-weight: 900; color: #00f0ff; letter-spacing: 2px; text-shadow: 0 0 18px rgba(0, 240, 255, 0.65);">30 / 300</span>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);

    this.topScoreboardEl = this.container.querySelector('#hud-top-scoreboard')!;
    this.myCardsEl = this.container.querySelector('#hud-my-cards')!;
    this.killfeedEl = this.container.querySelector('#hud-killfeed')!;
    this.fpsBadgeEl = this.container.querySelector('#hud-fps-badge')!;
    this.subtlePointsEl = this.container.querySelector('#hud-subtle-points')!;
    this.winPointsOverlayEl = this.container.querySelector('#hud-win-points-overlay')!;
    this.winPointsCounterEl = this.container.querySelector('#hud-win-points-counter')!;
    this.muteBtnEl = this.container.querySelector('#hud-btn-mute')!;
    this.settingsBtnEl = this.container.querySelector('#hud-btn-settings')!;
    this.weaponEl = this.container.querySelector('#hud-weapon-name')!;
    this.weaponTypeEl = this.container.querySelector('#hud-weapon-type')!;
    this.ammoEl = this.container.querySelector('#hud-ammo')!;
    this.hpFillEl = this.container.querySelector('#hud-hp-fill')!;
    this.hpValEl = this.container.querySelector('#hud-hp-val')!;
    this.dashFillEl = this.container.querySelector('#hud-dash-fill')!;
    this.bhopBadgeEl = this.container.querySelector('#hud-bhop-badge')!;
    this.promptEl = this.container.querySelector('#hud-prompt')!;
    this.pointerLockPrompt = this.container.querySelector('#hud-pointerlock-notice')!;
    this.deadAlert = this.container.querySelector('#hud-dead-alert')!;
    this.deadTitleEl = this.container.querySelector('#hud-dead-title')!;
    this.deadWinnerEl = this.container.querySelector('#hud-dead-winner')!;
    this.respawnCountdown = this.container.querySelector('#hud-respawn-countdown')!;
    this.damageFlash = this.container.querySelector('#hud-damage-flash')!;
    this.cinematicOverlayEl = this.container.querySelector('#hud-cinematic-overlay')!;
    this.cinematicRoundEl = this.container.querySelector('#hud-cinematic-round')!;
    this.cinematicNumberEl = this.container.querySelector('#hud-cinematic-number')!;

    this.muteBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      const s = settingsManager.get();
      settingsManager.update({ muted: !s.muted });
    });

    this.settingsBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onOpenSettings?.();
    });

    this.syncSettingsUI();
    settingsManager.onChange(() => this.syncSettingsUI());
  }

  private triggerWinPointsAnimation(oldPts: number, newPts: number): void {
    this.winPointsOverlayEl.style.display = 'block';
    this.winPointsCounterEl.textContent = `💎 ${oldPts} PKT`;

    const duration = 1400;
    const startTime = performance.now();
    let lastTickStep = 0;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(1, elapsed / duration);
      const easeOut = 1 - Math.pow(1 - pct, 3);
      const currentVal = Math.round(oldPts + (newPts - oldPts) * easeOut);

      this.winPointsCounterEl.textContent = `💎 ${currentVal} PKT (+100)`;
      this.subtlePointsEl.textContent = `💎 ${currentVal} PKT`;

      const tickStep = Math.floor(pct * 10);
      if (tickStep > lastTickStep) {
        lastTickStep = tickStep;
        soundSystem.playSound('buy');
      }

      if (pct < 1) {
        requestAnimationFrame(step);
      } else {
        setTimeout(() => {
          if (this.winPointsOverlayEl) {
            this.winPointsOverlayEl.style.display = 'none';
          }
        }, 2400);
      }
    };
    requestAnimationFrame(step);
  }

  public syncSettingsUI(): void {
    const s = settingsManager.get();
    this.fpsBadgeEl.style.display = s.showFps ? 'block' : 'none';
    if (s.muted || s.masterVolume === 0) {
      this.muteBtnEl.textContent = '🔇 WYCISZONO [M]';
      this.muteBtnEl.style.borderColor = '#ef4444';
      this.muteBtnEl.style.color = '#fca5a5';
    } else {
      this.muteBtnEl.textContent = `🔊 ${s.masterVolume}% [M]`;
      this.muteBtnEl.style.borderColor = 'rgba(56, 189, 248, 0.45)';
      this.muteBtnEl.style.color = '#f8fafc';
    }
  }

  public updateFps(fps: number, culledCount: number): void {
    const s = settingsManager.get();
    if (!s.showFps) return;
    this.fpsBadgeEl.textContent = s.occlusionCulling ? `${fps} FPS • CULL ${culledCount}` : `${fps} FPS`;
    this.fpsBadgeEl.style.color = fps >= 55 ? '#4ade80' : fps >= 35 ? '#fbbf24' : '#ef4444';
  }

  public addEventFeed(text: string, color: string = '#38bdf8'): void {
    const item = document.createElement('div');
    item.style.cssText = `
      background: rgba(9, 13, 22, 0.85);
      backdrop-filter: blur(8px);
      border-right: 4px solid ${color};
      border-top: 1px solid rgba(255,255,255,0.08);
      padding: 6px 14px;
      border-radius: 6px;
      color: #f8fafc;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.5px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.5);
      transition: opacity 0.3s ease, transform 0.3s ease;
    `;
    item.textContent = text;
    this.killfeedEl.appendChild(item);

    while (this.killfeedEl.children.length > 5) {
      this.killfeedEl.firstElementChild?.remove();
    }

    setTimeout(() => {
      item.style.opacity = '0';
      item.style.transform = 'translateX(20px)';
      setTimeout(() => item.remove(), 300);
    }, 4500);
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
    // Check if local player just won this round -> award +100 PKT & play count-up animation!
    if (
      snapshot.roundWinnerId === player.id &&
      this.lastRewardedWinRound !== snapshot.round &&
      snapshot.roundState !== 'countdown'
    ) {
      this.lastRewardedWinRound = snapshot.round;
      const { oldPoints, newPoints } = profileManager.addPoints(100);
      this.triggerWinPointsAnimation(oldPoints, newPoints);
    }

    // 1. Top ROUNDS Scoreboard (Dirty-checked to avoid unnecessary DOM reflows)
    const scoreKey = `${snapshot.round}|` + snapshot.players.map((p) => `${p.id}:${p.roundWins || 0}`).join(',');
    if (scoreKey !== this.lastScoreKey) {
      this.lastScoreKey = scoreKey;
      const scoreItems = snapshot.players.map((p) => {
        const wins = p.roundWins || 0;
        const isMe = p.id === player.id;
        return `<span style="color: ${p.color || '#fff'}; font-weight: 900;">${p.name}${isMe ? ' (TY)' : ''}: <span style="color: #fbbf24; font-size: 21px;">${wins} ⭐</span></span>`;
      });

      this.topScoreboardEl.innerHTML = `
        <span style="color: #38bdf8; font-size: 13px; background: rgba(56,189,248,0.16); border: 1px solid rgba(56,189,248,0.4); padding: 4px 10px; border-radius: 6px;">RUNDA ${snapshot.round}</span>
        <div style="display: flex; gap: 18px; align-items: center;">${scoreItems.join('<span style="color: #334155;">|</span>')}</div>
      `;
    }

    // 2. Active ROUNDS cards list (Dirty-checked)
    const cardsKey = (player.cards || []).join(',');
    if (cardsKey !== this.lastCardsKey) {
      this.lastCardsKey = cardsKey;
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
    }

    // 3. Weapon & Ammo
    const wep = WEAPONS[player.weaponId];
    this.weaponEl.textContent = wep.name;
    const catLabels: Record<string, string> = {
      m16: 'ASSAULT // 5.56 KINETIC',
      shotgun: 'BUCKSHOT // 12 GAUGE',
      thompson: 'SUBMACHINE // .45 ACP',
      plasma_rifle: 'ENERGY // ION PLASMA',
      laser_minigun: 'HEAVY // BEAM CYCLER',
      crossbow: 'BALLISTIC // BOLT DRIVE',
      revolver: 'HANDGUN // .44 MAGNUM',
      pistol: 'SIDEARM // 9MM PARABELLUM'
    };
    this.weaponTypeEl.textContent = catLabels[player.weaponId] || 'TACTICAL WEAPON';

    if (player.isReloading) {
      const pct = Math.floor(player.reloadProgress * 100);
      this.ammoEl.innerHTML = `<span style="font-size: 18px; color: #f59e0b; text-shadow: 0 0 10px rgba(245,158,11,0.6); letter-spacing: 1.5px;">SYNCHRONIZING MAG ${pct}%</span>`;
    } else {
      const isLowAmmo = player.ammoClip <= 5;
      const clipCol = isLowAmmo ? '#ef4444' : '#00f0ff';
      const clipGlow = isLowAmmo ? 'rgba(239,68,68,0.7)' : 'rgba(0,240,255,0.7)';
      this.ammoEl.innerHTML = `<span style="color: ${clipCol}; text-shadow: 0 0 16px ${clipGlow};">${player.ammoClip}</span> <span style="font-size: 20px; color: #f59e0b;">/ ${player.ammoReserve}</span>`;
    }

    // 4. Local Player HP
    const currentHp = Math.max(0, Math.ceil(player.hp));
    this.hpValEl.textContent = `${currentHp}`;
    const hpPct = Math.max(0, (player.hp / player.maxHp) * 100);
    this.hpFillEl.style.width = `${hpPct}%`;

    if (hpPct > 50) {
      this.hpFillEl.style.background = 'linear-gradient(90deg, #0284c7, #00f0ff)';
      this.hpValEl.style.color = '#00f0ff';
      this.hpValEl.style.textShadow = '0 0 14px rgba(0,240,255,0.7)';
    } else if (hpPct > 25) {
      this.hpFillEl.style.background = 'linear-gradient(90deg, #d97706, #fbbf24)';
      this.hpValEl.style.color = '#fbbf24';
      this.hpValEl.style.textShadow = '0 0 14px rgba(251,191,36,0.7)';
    } else {
      this.hpFillEl.style.background = 'linear-gradient(90deg, #b91c1c, #ef4444)';
      this.hpValEl.style.color = '#ef4444';
      this.hpValEl.style.textShadow = '0 0 16px rgba(239,68,68,0.85)';
    }

    if (player.hp < this.lastHp) {
      this.damageFlash.style.opacity = '1';
      setTimeout(() => {
        if (this.damageFlash) this.damageFlash.style.opacity = '0';
      }, 140);
    }
    this.lastHp = player.hp;

    // 5. Dash cooldown & Bhop Streak
    const dashPct = player.dashCooldownRemaining > 0 ? (1 - player.dashCooldownRemaining / 4000) * 100 : 100;
    this.dashFillEl.style.width = `${Math.max(0, Math.min(100, dashPct))}%`;
    if ((player.bhopStreak || 0) > 1) {
      this.bhopBadgeEl.style.display = 'inline-block';
      this.bhopBadgeEl.textContent = `BHOP x${player.bhopStreak}`;
    } else {
      this.bhopBadgeEl.style.display = 'none';
    }

    // 6. Cinematic Pre-Round Countdown Overlay
    if (snapshot.roundState === 'countdown') {
      this.cinematicOverlayEl.style.display = 'block';
      this.cinematicRoundEl.textContent = `⚔ RUNDA ${snapshot.round} — PRZYGOTUJ SIĘ`;
      const secLeft = Math.ceil(snapshot.roundTimer / 1000);
      if (secLeft !== this.lastCountdownSecond) {
        this.lastCountdownSecond = secLeft;
        soundSystem.playSound('hit');
        this.cinematicNumberEl.style.transform = 'scale(1.28)';
        setTimeout(() => {
          if (this.cinematicNumberEl) this.cinematicNumberEl.style.transform = 'scale(1.0)';
        }, 140);
      }
      if (snapshot.roundTimer <= 450) {
        this.cinematicNumberEl.textContent = 'WALKA!';
        this.cinematicNumberEl.style.color = '#ef4444';
      } else {
        this.cinematicNumberEl.textContent = `${Math.min(3, secLeft)}`;
        this.cinematicNumberEl.style.color = secLeft === 1 ? '#ef4444' : secLeft === 2 ? '#fbbf24' : '#38bdf8';
      }
    } else {
      this.cinematicOverlayEl.style.display = 'none';
      this.lastCountdownSecond = -1;
    }

    // 7. Elimination Alert (shows who killed you & who won the round)
    if (player.isDead) {
      this.deadAlert.style.display = 'block';
      this.deadTitleEl.textContent = player.killedBy
        ? `💀 ZABITY PRZEZ: ${player.killedBy}`
        : '💀 WYELIMINOWANY';

      if (snapshot.roundWinnerName) {
        this.deadWinnerEl.style.display = 'inline-block';
        this.deadWinnerEl.textContent = `🏆 ZWYCIĘZCA RUNDY: ${snapshot.roundWinnerName}`;
      } else {
        this.deadWinnerEl.style.display = 'none';
      }

      if (snapshot.roundState === 'card_pick') {
        if (snapshot.cardPickerId === player.id) {
          this.respawnCountdown.textContent = 'TWOJA KOLEJ — WYBIERZ 1 Z 3 KART ULEPSZEŃ!';
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
