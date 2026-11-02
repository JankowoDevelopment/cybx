import * as THREE from 'three';
import { WeaponType } from '@shared/types.js';

export function create3DWeaponMesh(weaponId: WeaponType): THREE.Group {
  const group = new THREE.Group();

  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.85 });
  const gunMetal = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.25, metalness: 0.9 });
  const gripMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8, metalness: 0.2 });

  let neonColor = 0x38bdf8;
  if (weaponId === 'shotgun') neonColor = 0xf59e0b;
  if (weaponId === 'thompson') neonColor = 0xa855f7;
  if (weaponId === 'raygun') neonColor = 0x22c55e;
  if (weaponId === 'm1911') neonColor = 0xfbbf24;

  const neonMat = new THREE.MeshBasicMaterial({ color: neonColor });

  if (weaponId === 'm16') {
    // Main Receiver
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.0, 14), darkMetal);
    group.add(body);

    // Barrel & Handguard
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 12, 12), gunMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.4, -10);
    group.add(barrel);

    const shroud = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.0, 8), gunMetal);
    shroud.position.set(0, 0.2, -8);
    group.add(shroud);

    // Glowing Cyber Energy Rails
    const railL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 12), neonMat);
    railL.position.set(-1.12, 0.8, -3);
    const railR = railL.clone();
    railR.position.x = 1.12;
    group.add(railL, railR);

    // Holographic Optic Sight
    const scopeFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 3.2), darkMetal);
    scopeFrame.position.set(0, 2.1, -1);
    const holoGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.9),
      new THREE.MeshBasicMaterial({ color: neonColor, transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    holoGlass.position.set(0, 2.2, -2.5);
    group.add(scopeFrame, holoGlass);

    // Magazine
    const mag = new THREE.Mesh(new THREE.BoxGeometry(1.4, 4.5, 2.4), gripMat);
    mag.position.set(0, -3.0, -2.5);
    mag.rotation.x = 0.2;
    group.add(mag);
  } else if (weaponId === 'shotgun') {
    // Heavy Double-Tube Cyber Shotgun
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.2, 13), darkMetal);
    group.add(body);

    const barrelTop = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 13, 12), gunMetal);
    barrelTop.rotation.x = Math.PI / 2;
    barrelTop.position.set(0, 0.7, -10);

    const barrelBot = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 11, 12), darkMetal);
    barrelBot.rotation.x = Math.PI / 2;
    barrelBot.position.set(0, -0.5, -9);

    const pump = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 5.5), gripMat);
    pump.position.set(0, -0.6, -8.5);

    const heatStrip = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.4, 10), neonMat);
    heatStrip.position.set(0, 1.1, -4);

    group.add(barrelTop, barrelBot, pump, heatStrip);
  } else if (weaponId === 'thompson') {
    // Cyber Submachine Gun with Drum Magazine
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.8, 11), gunMetal);
    group.add(body);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 9, 12), darkMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.4, -8.5);

    const drum = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 1.8, 16), darkMetal);
    drum.rotation.x = Math.PI / 2;
    drum.position.set(0, -2.2, -3.0);

    const drumRing = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 1.9, 16), neonMat);
    drumRing.rotation.x = Math.PI / 2;
    drumRing.position.set(0, -2.2, -3.0);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 10), neonMat);
    topRail.position.set(0, 1.5, -1);

    group.add(barrel, drum, drumRing, topRail);
  } else if (weaponId === 'raygun') {
    // Alien Plasma Cannon
    const body = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 16), darkMetal);
    body.scale.set(0.85, 0.9, 2.2);
    group.add(body);

    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.4, 11, 16), neonMat);
    core.rotation.x = Math.PI / 2;
    core.position.set(0, 0.3, -8);
    group.add(core);

    // Floating energy rings around barrel
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4 - i * 0.2, 0.18, 8, 20), neonMat);
      ring.position.set(0, 0.3, -5 - i * 3);
      group.add(ring);
    }
  } else {
    // Tactical Cyber Pistol (m1911)
    const slide = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 8.5), gunMetal);
    slide.position.set(0, 0.5, -2);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.6, 2.2), gripMat);
    grip.position.set(0, -1.8, 1.2);
    grip.rotation.x = 0.25;
    const laser = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 7), neonMat);
    laser.position.set(0, -0.6, -2.5);
    group.add(slide, grip, laser);
  }

  return group;
}

export class DoomWeaponRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  public weaponGroup: THREE.Group;
  private currentModel: THREE.Group | null = null;
  private currentWeaponId: WeaponType | null = null;
  private muzzleMesh: THREE.Mesh;
  private muzzleLight: THREE.PointLight;

  private bobTimer: number = 0;
  private recoilOffset: number = 0;
  private muzzleFlashTimer: number = 0;
  private hitmarkerTimer: number = 0;
  private isHitmarkerKill: boolean = false;

  constructor(camera?: THREE.PerspectiveCamera) {
    // 1. 3D Viewmodel Group attached to Player Camera
    this.weaponGroup = new THREE.Group();
    this.weaponGroup.position.set(4.2, -3.8, -7.5);

    // 3D Muzzle Flash Starburst + Dynamic Light
    const flashGeo = new THREE.OctahedronGeometry(1.8, 0);
    flashGeo.scale(1.2, 1.2, 2.5);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    this.muzzleMesh = new THREE.Mesh(flashGeo, flashMat);
    this.muzzleMesh.position.set(0, 0.5, -16.5);
    this.muzzleMesh.visible = false;
    this.weaponGroup.add(this.muzzleMesh);

    this.muzzleLight = new THREE.PointLight(0xf59e0b, 0, 120);
    this.muzzleLight.position.set(0, 1, -16);
    this.weaponGroup.add(this.muzzleLight);

    if (camera) {
      camera.add(this.weaponGroup);
    }

    // 2. Crisp 2D Overlay for Dynamic Crosshair & Hitmarkers
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

  public mountToCamera(camera: THREE.PerspectiveCamera): void {
    camera.add(this.weaponGroup);
  }

  private resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  public triggerShoot(): void {
    this.recoilOffset = 1.0;
    this.muzzleFlashTimer = 55;
  }

  public triggerReload(): void {
    // Handled smoothly via reloadProgress
  }

  public triggerHitmarker(isKill: boolean): void {
    this.hitmarkerTimer = 140;
    this.isHitmarkerKill = isKill;
  }

  public update(dtMs: number, isMoving: boolean, weaponId: WeaponType, reloadProgress: number): void {
    // Rebuild 3D weapon model if weapon changed
    if (this.currentWeaponId !== weaponId) {
      if (this.currentModel) {
        this.weaponGroup.remove(this.currentModel);
      }
      this.currentModel = create3DWeaponMesh(weaponId);
      this.weaponGroup.add(this.currentModel);
      this.currentWeaponId = weaponId;
    }

    // Update timers
    if (isMoving) {
      this.bobTimer += dtMs * 0.009;
    } else {
      this.bobTimer += dtMs * 0.002; // Subtle idle breathing
    }

    if (this.recoilOffset > 0) {
      this.recoilOffset = Math.max(0, this.recoilOffset - dtMs * 0.007);
    }

    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dtMs;
      this.muzzleMesh.visible = true;
      this.muzzleMesh.rotation.z += 0.6;
      const scale = 0.8 + Math.random() * 0.6;
      this.muzzleMesh.scale.set(scale, scale, scale * 1.6);
      this.muzzleLight.intensity = 3.5;
    } else {
      this.muzzleMesh.visible = false;
      this.muzzleLight.intensity = 0;
    }

    if (this.hitmarkerTimer > 0) {
      this.hitmarkerTimer -= dtMs;
    }

    // 3D Weapon Transform (Sway + Recoil Kick + Reload Tilt)
    const swayX = isMoving ? Math.sin(this.bobTimer) * 0.35 : Math.sin(this.bobTimer) * 0.06;
    const swayY = isMoving ? Math.abs(Math.cos(this.bobTimer * 2)) * 0.28 : Math.cos(this.bobTimer * 2) * 0.04;

    let reloadDipY = 0;
    let reloadTiltX = 0;
    let reloadRollZ = 0;
    if (reloadProgress > 0 && reloadProgress < 1) {
      const s = Math.sin(reloadProgress * Math.PI);
      reloadDipY = -s * 2.2;
      reloadTiltX = s * 0.65;
      reloadRollZ = s * 0.45;
    }

    this.weaponGroup.position.set(
      4.0 + swayX,
      -3.6 - swayY + reloadDipY,
      -7.5 + this.recoilOffset * 2.4
    );

    this.weaponGroup.rotation.set(
      this.recoilOffset * 0.28 + reloadTiltX,
      -0.04 + swayX * 0.05,
      reloadRollZ
    );

    // Draw 2D Cyber Crosshair & Hitmarkers
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawCrosshair(ctx);
  }

  private drawCrosshair(ctx: CanvasRenderingContext2D): void {
    const cx = this.canvas.width / 2;
    const cy = this.canvas.height / 2;
    const spreadGap = 6 + this.recoilOffset * 14;
    const len = 8;

    ctx.save();
    // Outer shadow for contrast
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.lineWidth = 4;
    this.strokeCrosshairLines(ctx, cx, cy, spreadGap, len);

    // Inner glowing cyan crosshair
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    this.strokeCrosshairLines(ctx, cx, cy, spreadGap, len);

    // Center precision dot
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(cx, cy, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Hitmarker X
    if (this.hitmarkerTimer > 0) {
      ctx.strokeStyle = this.isHitmarkerKill ? '#ef4444' : '#f8fafc';
      ctx.lineWidth = this.isHitmarkerKill ? 3.5 : 2.2;
      const hmGap = 5;
      const hmLen = this.isHitmarkerKill ? 14 : 10;

      ctx.beginPath();
      ctx.moveTo(cx - hmGap, cy - hmGap); ctx.lineTo(cx - hmLen, cy - hmLen);
      ctx.moveTo(cx + hmGap, cy - hmGap); ctx.lineTo(cx + hmLen, cy - hmLen);
      ctx.moveTo(cx - hmGap, cy + hmGap); ctx.lineTo(cx - hmLen, cy + hmLen);
      ctx.moveTo(cx + hmGap, cy + hmGap); ctx.lineTo(cx + hmLen, cy + hmLen);
      ctx.stroke();
    }
    ctx.restore();
  }

  private strokeCrosshairLines(ctx: CanvasRenderingContext2D, cx: number, cy: number, gap: number, len: number): void {
    ctx.beginPath();
    ctx.moveTo(cx - gap - len, cy); ctx.lineTo(cx - gap, cy);
    ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + gap + len, cy);
    ctx.moveTo(cx, cy - gap - len); ctx.lineTo(cx, cy - gap);
    ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + gap + len);
    ctx.stroke();
  }

  public destroy(): void {
    if (this.canvas.parentNode) {
      this.canvas.remove();
    }
  }
}
