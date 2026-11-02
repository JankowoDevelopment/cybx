import { WeaponType } from '@shared/types.js';

export class DoomWeaponRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private bobTimer: number = 0;
  private recoilOffset: number = 0;
  private muzzleFlashTimer: number = 0;
  private reloadTimer: number = 0;
  private isReloading: boolean = false;

  private hitmarkerTimer: number = 0;
  private isHitmarkerKill: boolean = false;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'doom-weapon-canvas';
    this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 10;
    `;
    this.ctx = this.canvas.getContext('2d')!;
    document.body.appendChild(this.canvas);

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  public triggerShoot(): void {
    this.recoilOffset = 24;
    this.muzzleFlashTimer = 65; // ms
  }

  public triggerReload(): void {
    this.isReloading = true;
    this.reloadTimer = 0;
  }

  public triggerHitmarker(isKill: boolean): void {
    this.hitmarkerTimer = 110;
    this.isHitmarkerKill = isKill;
  }

  public update(dtMs: number, isMoving: boolean, weaponId: WeaponType, reloadProgress: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Update timers
    if (isMoving) {
      this.bobTimer += dtMs * 0.008;
    } else {
      this.bobTimer = 0;
    }

    if (this.recoilOffset > 0) {
      this.recoilOffset = Math.max(0, this.recoilOffset - dtMs * 0.12);
    }

    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dtMs;
    }

    if (this.hitmarkerTimer > 0) {
      this.hitmarkerTimer -= dtMs;
    }

    // Weapon sway
    const bobX = Math.sin(this.bobTimer) * 14;
    const bobY = Math.abs(Math.cos(this.bobTimer * 2)) * 12;

    // Reload drop
    let reloadDropY = 0;
    if (reloadProgress > 0 && reloadProgress < 1) {
      reloadDropY = Math.sin(reloadProgress * Math.PI) * 120;
    }

    const centerX = this.canvas.width / 2 + bobX;
    const baseY = this.canvas.height + this.recoilOffset + bobY + reloadDropY;

    // Render First-Person Weapon
    this.drawWeaponSprite(ctx, centerX, baseY, weaponId);

    // Render Muzzle Flash
    if (this.muzzleFlashTimer > 0) {
      this.drawMuzzleFlash(ctx, centerX, baseY - 120, weaponId);
    }

    // Render Crosshair & Hitmarker
    this.drawCrosshair(ctx);
  }

  private drawWeaponSprite(ctx: CanvasRenderingContext2D, cx: number, cy: number, weaponId: WeaponType): void {
    ctx.save();

    if (weaponId === 'raygun') {
      // Wonder Weapon: Retro Futuristic Alien Raygun (Doom BFG / Raygun style)
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 80, 50, 110, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glowing green coils
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(cx - 16, cy - 140, 32, 16);
      ctx.fillRect(cx - 16, cy - 110, 32, 16);
      ctx.fillRect(cx - 16, cy - 80, 32, 16);

      // Gold barrel tip
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(cx - 12, cy - 175, 24, 35);
      ctx.strokeRect(cx - 12, cy - 175, 24, 35);

      // Cybernetic hands
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(cx - 40, cy - 10, 24, 0, Math.PI * 2);
      ctx.arc(cx + 40, cy - 10, 24, 0, Math.PI * 2);
      ctx.fill();
    } else if (weaponId === 'shotgun') {
      // Double Barrel Trench Shotgun (Classic Doom Super Shotgun style)
      // Twin Heavy Steel Barrels
      ctx.fillStyle = '#334155';
      ctx.fillRect(cx - 24, cy - 160, 20, 140);
      ctx.fillRect(cx + 4, cy - 160, 20, 140);

      // Barrel muzzle openings
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(cx - 14, cy - 160, 8, 0, Math.PI * 2);
      ctx.arc(cx + 14, cy - 160, 8, 0, Math.PI * 2);
      ctx.fill();

      // Wooden foregrip
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx - 28, cy - 70, 56, 45);

      // Doom Marine Gloves
      ctx.fillStyle = '#3f3f46';
      ctx.beginPath();
      ctx.arc(cx - 36, cy - 30, 22, 0, Math.PI * 2);
      ctx.arc(cx + 36, cy - 30, 22, 0, Math.PI * 2);
      ctx.fill();
    } else if (weaponId === 'thompson') {
      // Thompson SMG with Circular Drum Magazine
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 10, cy - 170, 20, 130);

      // Wooden stock & foregrip
      ctx.fillStyle = '#78350f';
      ctx.fillRect(cx - 14, cy - 110, 28, 40);

      // Drum magazine
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.ellipse(cx, cy - 50, 40, 25, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hands
      ctx.fillStyle = '#3f3f46';
      ctx.beginPath();
      ctx.arc(cx - 30, cy - 40, 20, 0, Math.PI * 2);
      ctx.arc(cx + 30, cy - 40, 20, 0, Math.PI * 2);
      ctx.fill();
    } else if (weaponId === 'm16') {
      // M16 Assault Rifle (Carry handle + flash hider)
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 9, cy - 190, 18, 150);

      // Carry handle sight
      ctx.fillStyle = '#334155';
      ctx.fillRect(cx - 6, cy - 140, 12, 30);

      // Curved magazine
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 8, cy - 60, 16, 50);

      // Hands
      ctx.fillStyle = '#3f3f46';
      ctx.beginPath();
      ctx.arc(cx - 32, cy - 50, 22, 0, Math.PI * 2);
      ctx.arc(cx + 32, cy - 50, 22, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // M1911 Pistol (Centered Doom Pistol view)
      ctx.fillStyle = '#475569';
      ctx.fillRect(cx - 12, cy - 130, 24, 100);

      // Top slide highlight
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(cx - 8, cy - 130, 16, 12);

      // Muzzle bore
      ctx.fillStyle = '#020617';
      ctx.beginPath();
      ctx.arc(cx, cy - 130, 5, 0, Math.PI * 2);
      ctx.fill();

      // Two-handed grip
      ctx.fillStyle = '#3f3f46';
      ctx.beginPath();
      ctx.arc(cx - 20, cy - 35, 20, 0, Math.PI * 2);
      ctx.arc(cx + 20, cy - 35, 20, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawMuzzleFlash(ctx: CanvasRenderingContext2D, cx: number, cy: number, weaponId: WeaponType): void {
    ctx.save();
    const flashCol = weaponId === 'raygun' ? '#22c55e' : '#f59e0b';
    const coreCol = weaponId === 'raygun' ? '#86efac' : '#fef08a';

    // Outer plasma burst
    ctx.fillStyle = flashCol;
    ctx.beginPath();
    ctx.arc(cx, cy, 50, 0, Math.PI * 2);
    ctx.fill();

    // Hot inner core
    ctx.fillStyle = coreCol;
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawCrosshair(ctx: CanvasRenderingContext2D): void {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;

    ctx.save();

    // Hitmarker Reticle ('X')
    if (this.hitmarkerTimer > 0) {
      ctx.strokeStyle = this.isHitmarkerKill ? '#ef4444' : '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy - 10); ctx.lineTo(cx - 4, cy - 4);
      ctx.moveTo(cx + 10, cy - 10); ctx.lineTo(cx + 4, cy - 4);
      ctx.moveTo(cx - 10, cy + 10); ctx.lineTo(cx - 4, cy + 4);
      ctx.moveTo(cx + 10, cy + 10); ctx.lineTo(cx + 4, cy + 4);
      ctx.stroke();
    } else {
      // Standard Tactical Dot + Crosshair
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy); ctx.lineTo(cx - 4, cy);
      ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 12, cy);
      ctx.moveTo(cx, cy - 12); ctx.lineTo(cx, cy - 4);
      ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + 12);
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  public destroy(): void {
    if (this.canvas.parentNode) {
      this.canvas.remove();
    }
  }
}
