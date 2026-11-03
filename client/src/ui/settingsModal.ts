import { settingsManager, GraphicsQuality } from '../settings/settingsManager.js';
import { soundSystem } from '../audio/soundSystem.js';

export class SettingsModal {
  private overlay!: HTMLElement;
  public isOpen: boolean = false;
  public onOpen?: () => void;
  public onClose?: () => void;

  constructor() {
    this.createDOM();
  }

  private createDOM(): void {
    this.overlay = document.createElement('div');
    this.overlay.id = 'settings-modal-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(3, 6, 14, 0.82);
      backdrop-filter: blur(12px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 220;
      font-family: 'Chakra Petch', sans-serif;
      color: #f8fafc;
      user-select: none;
    `;

    this.renderContent();
    document.body.appendChild(this.overlay);
  }

  private renderContent(): void {
    const s = settingsManager.get();

    this.overlay.innerHTML = `
      <div style="
        background: linear-gradient(165deg, rgba(15, 23, 42, 0.97) 0%, rgba(7, 11, 22, 0.99) 100%);
        border: 2px solid #38bdf8;
        border-radius: 16px;
        width: 580px;
        max-width: 94vw;
        max-height: 90vh;
        overflow-y: auto;
        padding: 28px 32px;
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.85), 0 0 35px rgba(56, 189, 248, 0.25);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(56, 189, 248, 0.25); padding-bottom: 14px; margin-bottom: 20px;">
          <div>
            <div style="font-size: 24px; font-weight: 900; letter-spacing: 2px; color: #38bdf8; text-shadow: 0 0 14px rgba(56,189,248,0.4);">
              ⚙️ USTAWIENIA GRY & AUDIO 3D
            </div>
            <div style="font-size: 11px; color: #94a3b8; letter-spacing: 1px;">
              SKRÓTY: [P] / [ESC] USTAWIENIA &bull; [M] SZYBKIE WYCISZENIE
            </div>
          </div>
          <button id="btn-close-settings" style="
            background: rgba(239, 68, 68, 0.18);
            border: 1px solid #ef4444;
            color: #fca5a5;
            font-family: inherit;
            font-weight: 800;
            font-size: 13px;
            padding: 8px 16px;
            border-radius: 8px;
            cursor: pointer;
          ">ZAMKNIJ [ESC]</button>
        </div>

        <!-- AUDIO SECTION -->
        <div style="margin-bottom: 20px; background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(148, 163, 184, 0.16); border-radius: 12px; padding: 16px;">
          <div style="font-size: 13px; font-weight: 800; color: #fbbf24; letter-spacing: 1.5px; margin-bottom: 12px;">
            🔊 DŹWIĘK I KIERUNKOWE AUDIO 3D
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <span style="font-size: 14px; font-weight: 700;">Wycisz całkowicie grę (Mute [M])</span>
            <input type="checkbox" id="chk-muted" ${s.muted ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: #ef4444; cursor: pointer;" />
          </div>

          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
              <span>Głośność Główna (Master)</span>
              <b id="val-master-vol" style="color: #38bdf8;">${s.masterVolume}%</b>
            </div>
            <input type="range" id="rng-master-vol" min="0" max="100" step="1" value="${s.masterVolume}" style="width: 100%; accent-color: #38bdf8; cursor: pointer;" />
          </div>

          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
              <span>Głośność Strzałów i Wybuchów (SFX)</span>
              <b id="val-sfx-vol" style="color: #38bdf8;">${s.sfxVolume}%</b>
            </div>
            <input type="range" id="rng-sfx-vol" min="0" max="100" step="1" value="${s.sfxVolume}" style="width: 100%; accent-color: #38bdf8; cursor: pointer;" />
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div>
              <div style="font-size: 14px; font-weight: 700;">Dźwięk Przestrzenny 3D (Kierunek L/P + Ściany)</div>
              <div style="font-size: 11px; color: #94a3b8;">Słychać z której strony strzelają oraz tłumienie zza ścian</div>
            </div>
            <input type="checkbox" id="chk-spatial" ${s.spatialAudio ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: #22c55e; cursor: pointer;" />
          </div>
        </div>

        <!-- CONTROLS & CAMERA SECTION -->
        <div style="margin-bottom: 20px; background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(148, 163, 184, 0.16); border-radius: 12px; padding: 16px;">
          <div style="font-size: 13px; font-weight: 800; color: #a855f7; letter-spacing: 1.5px; margin-bottom: 12px;">
            🎯 MYSZKA I KAMERA 3D
          </div>

          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
              <span>Czułość Myszki (Sensitivity)</span>
              <b id="val-sens" style="color: #a855f7;">${s.mouseSensitivity.toFixed(2)}x</b>
            </div>
            <input type="range" id="rng-sens" min="0.2" max="3.0" step="0.05" value="${s.mouseSensitivity}" style="width: 100%; accent-color: #a855f7; cursor: pointer;" />
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
              <span>Pole Widzenia (FOV)</span>
              <b id="val-fov" style="color: #a855f7;">${s.fov}°</b>
            </div>
            <input type="range" id="rng-fov" min="60" max="110" step="1" value="${s.fov}" style="width: 100%; accent-color: #a855f7; cursor: pointer;" />
          </div>
        </div>

        <!-- PERFORMANCE & GRAPHICS SECTION -->
        <div style="margin-bottom: 20px; background: rgba(15, 23, 42, 0.65); border: 1px solid rgba(148, 163, 184, 0.16); border-radius: 12px; padding: 16px;">
          <div style="font-size: 13px; font-weight: 800; color: #22c55e; letter-spacing: 1.5px; margin-bottom: 12px;">
            ⚡ OPTYMALIZACJA I GRAFIKA
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
            <span style="font-size: 14px; font-weight: 700;">Preset Jakości (Rozdzielczość Renderowania)</span>
            <select id="sel-quality" style="background: #090d16; color: #38bdf8; border: 1px solid #38bdf8; border-radius: 6px; padding: 6px 12px; font-family: inherit; font-weight: 800; cursor: pointer;">
              <option value="low" ${s.graphicsQuality === 'low' ? 'selected' : ''}>NISKA (Maks. FPS)</option>
              <option value="medium" ${s.graphicsQuality === 'medium' ? 'selected' : ''}>ŚREDNIA (Zbalansowana)</option>
              <option value="high" ${s.graphicsQuality === 'high' ? 'selected' : ''}>WYSOKA (Ultra Jakość)</option>
            </select>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <div>
              <div style="font-size: 14px; font-weight: 700;">Culling Obiektów za Plecami i za Ścianami</div>
              <div style="font-size: 11px; color: #94a3b8;">Nie renderuje pocisków/beczek za ścianą lub za plecami (gracze zawsze widoczni!)</div>
            </div>
            <input type="checkbox" id="chk-culling" ${s.occlusionCulling ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: #22c55e; cursor: pointer;" />
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
            <span style="font-size: 14px; font-weight: 700;">Cienie 3D (Shadow Mapping)</span>
            <input type="checkbox" id="chk-shadows" ${s.shadowsEnabled ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: #22c55e; cursor: pointer;" />
          </div>

          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
              <span>Poświata / Bloom (0% = Wyłączony)</span>
              <b id="val-bloom" style="color: #38bdf8;">${s.bloomIntensity ?? 12}%</b>
            </div>
            <input type="range" id="rng-bloom" min="0" max="100" step="1" value="${s.bloomIntensity ?? 12}" style="width: 100%; accent-color: #38bdf8; cursor: pointer;" />
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 14px; font-weight: 700;">Pokazuj Licznik FPS w rogu ekranu</span>
            <input type="checkbox" id="chk-fps" ${s.showFps ? 'checked' : ''} style="width: 20px; height: 20px; accent-color: #22c55e; cursor: pointer;" />
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <button id="btn-test-sound" style="
            background: rgba(56, 189, 248, 0.16);
            border: 1px solid #38bdf8;
            color: #38bdf8;
            font-family: inherit;
            font-weight: 800;
            font-size: 13px;
            padding: 10px 18px;
            border-radius: 8px;
            cursor: pointer;
          ">🔊 TEST DŹWIĘKU</button>

          <button id="btn-reset-settings" style="
            background: rgba(148, 163, 184, 0.14);
            border: 1px solid #64748b;
            color: #cbd5e1;
            font-family: inherit;
            font-weight: 700;
            font-size: 12px;
            padding: 10px 16px;
            border-radius: 8px;
            cursor: pointer;
          ">PRZYWRÓĆ DOMYŚLNE</button>
        </div>
      </div>
    `;

    this.bindInputs();
  }

  private bindInputs(): void {
    const closeBtn = this.overlay.querySelector('#btn-close-settings') as HTMLButtonElement;
    closeBtn?.addEventListener('click', () => this.close());

    const chkMuted = this.overlay.querySelector('#chk-muted') as HTMLInputElement;
    chkMuted?.addEventListener('change', () => {
      settingsManager.update({ muted: chkMuted.checked });
    });

    const rngMaster = this.overlay.querySelector('#rng-master-vol') as HTMLInputElement;
    const valMaster = this.overlay.querySelector('#val-master-vol') as HTMLElement;
    rngMaster?.addEventListener('input', () => {
      const v = Number(rngMaster.value);
      if (valMaster) valMaster.textContent = `${v}%`;
      settingsManager.update({ masterVolume: v, muted: v === 0 ? true : false });
      if (chkMuted) chkMuted.checked = v === 0;
    });

    const rngSfx = this.overlay.querySelector('#rng-sfx-vol') as HTMLInputElement;
    const valSfx = this.overlay.querySelector('#val-sfx-vol') as HTMLElement;
    rngSfx?.addEventListener('input', () => {
      const v = Number(rngSfx.value);
      if (valSfx) valSfx.textContent = `${v}%`;
      settingsManager.update({ sfxVolume: v });
    });

    const chkSpatial = this.overlay.querySelector('#chk-spatial') as HTMLInputElement;
    chkSpatial?.addEventListener('change', () => {
      settingsManager.update({ spatialAudio: chkSpatial.checked });
    });

    const rngSens = this.overlay.querySelector('#rng-sens') as HTMLInputElement;
    const valSens = this.overlay.querySelector('#val-sens') as HTMLElement;
    rngSens?.addEventListener('input', () => {
      const v = Number(rngSens.value);
      if (valSens) valSens.textContent = `${v.toFixed(2)}x`;
      settingsManager.update({ mouseSensitivity: v });
    });

    const rngFov = this.overlay.querySelector('#rng-fov') as HTMLInputElement;
    const valFov = this.overlay.querySelector('#val-fov') as HTMLElement;
    rngFov?.addEventListener('input', () => {
      const v = Number(rngFov.value);
      if (valFov) valFov.textContent = `${v}°`;
      settingsManager.update({ fov: v });
    });

    const selQuality = this.overlay.querySelector('#sel-quality') as HTMLSelectElement;
    selQuality?.addEventListener('change', () => {
      const q = selQuality.value as GraphicsQuality;
      settingsManager.update({
        graphicsQuality: q,
        shadowsEnabled: q !== 'low'
      });
      const chkShadows = this.overlay.querySelector('#chk-shadows') as HTMLInputElement;
      if (chkShadows) chkShadows.checked = q !== 'low';
    });

    const chkCulling = this.overlay.querySelector('#chk-culling') as HTMLInputElement;
    chkCulling?.addEventListener('change', () => {
      settingsManager.update({ occlusionCulling: chkCulling.checked });
    });

    const chkShadows = this.overlay.querySelector('#chk-shadows') as HTMLInputElement;
    chkShadows?.addEventListener('change', () => {
      settingsManager.update({ shadowsEnabled: chkShadows.checked });
    });

    const rngBloom = this.overlay.querySelector('#rng-bloom') as HTMLInputElement;
    const valBloom = this.overlay.querySelector('#val-bloom') as HTMLElement;
    rngBloom?.addEventListener('input', () => {
      const v = Number(rngBloom.value);
      if (valBloom) valBloom.textContent = `${v}%`;
      settingsManager.update({ bloomIntensity: v });
    });

    const chkFps = this.overlay.querySelector('#chk-fps') as HTMLInputElement;
    chkFps?.addEventListener('change', () => {
      settingsManager.update({ showFps: chkFps.checked });
    });

    const testBtn = this.overlay.querySelector('#btn-test-sound') as HTMLButtonElement;
    testBtn?.addEventListener('click', () => {
      soundSystem.playSound('buy');
    });

    const resetBtn = this.overlay.querySelector('#btn-reset-settings') as HTMLButtonElement;
    resetBtn?.addEventListener('click', () => {
      settingsManager.reset();
      this.renderContent();
      soundSystem.playSound('buy');
    });
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
    this.renderContent();
    this.overlay.style.display = 'flex';
    if (document.pointerLockElement) {
      document.exitPointerLock();
    }
    this.onOpen?.();
  }

  public close(): void {
    this.isOpen = false;
    this.overlay.style.display = 'none';
    this.onClose?.();
  }

  public destroy(): void {
    this.overlay.remove();
  }
}
