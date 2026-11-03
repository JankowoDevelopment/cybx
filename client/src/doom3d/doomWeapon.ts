import * as THREE from 'three';
import { WeaponType } from '@shared/types.js';
import { getWeaponSkin, getNeonSkin, PlayerCosmetics } from '@shared/skins.js';
import { profileManager } from '../settings/profileManager.js';

export function create3DWeaponMesh(weaponId: WeaponType, weaponSkinId?: string, neonSkinId?: string): THREE.Group {
  const wepSkin = getWeaponSkin(weaponSkinId);
  const neonSkin = getNeonSkin(neonSkinId);
  const hasCustomWepSkin = Boolean(weaponSkinId && weaponSkinId !== 'wep_default');
  const group = new THREE.Group();

  const darkMetal = new THREE.MeshStandardMaterial({
    color: hasCustomWepSkin ? new THREE.Color(wepSkin.bodyHex) : 0x1e293b,
    roughness: hasCustomWepSkin ? Math.max(0.18, wepSkin.roughness) : 0.26,
    metalness: hasCustomWepSkin ? Math.min(0.48, wepSkin.metalness) : 0.45,
    envMapIntensity: 2.2
  });
  const gunMetal = new THREE.MeshStandardMaterial({
    color: hasCustomWepSkin ? new THREE.Color(wepSkin.barrelHex) : 0x334155,
    roughness: hasCustomWepSkin ? Math.max(0.16, wepSkin.roughness) : 0.24,
    metalness: hasCustomWepSkin ? Math.min(0.50, wepSkin.metalness) : 0.48,
    envMapIntensity: 2.5
  });
  const gripMat = new THREE.MeshStandardMaterial({
    color: hasCustomWepSkin ? new THREE.Color(wepSkin.gripHex) : 0x0f172a,
    roughness: 0.50,
    metalness: 0.40,
    envMapIntensity: 1.2
  });

  // Equipped Neon Skin color for glowing energy rails, cores & optics!
  const chosenNeonHex = neonSkin?.colorHex || (hasCustomWepSkin ? wepSkin.accentHex : '#38bdf8');
  const hdrNeon = new THREE.Color(chosenNeonHex).multiplyScalar(2.4);
  const neonMat = new THREE.MeshBasicMaterial({ color: hdrNeon });

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

    // Glowing Neon Top Rail (Prominently visible in First-Person View!)
    const topNeonRail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.35, 13.5), neonMat);
    topNeonRail.position.set(0, 1.6, 0);
    group.add(topNeonRail);

    // Holographic Optic Sight with Neon Reticle
    const scopeFrame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 3.2), darkMetal);
    scopeFrame.position.set(0, 2.1, -1);
    const holoGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.9),
      new THREE.MeshBasicMaterial({ color: hdrNeon, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
    );
    holoGlass.position.set(0, 2.2, -2.5);
    const holoReticle = new THREE.Mesh(
      new THREE.RingGeometry(0.12, 0.24, 12),
      new THREE.MeshBasicMaterial({ color: hdrNeon, side: THREE.DoubleSide })
    );
    holoReticle.position.set(0, 2.2, -2.48);
    group.add(scopeFrame, holoGlass, holoReticle);

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
  } else if (weaponId === 'sniper') {
    // Heavy Railgun Sniper with Long Dual-Rail Barrel & High-Power Scope
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.8, 15), darkMetal);
    group.add(body);

    const railTop = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 19), gunMetal);
    railTop.position.set(0, 0.8, -12);
    const railBot = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 19), gunMetal);
    railBot.position.set(0, -0.3, -12);
    const plasmaCore = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 18.5), neonMat);
    plasmaCore.position.set(0, 0.25, -12);

    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.7, 6.5, 14), darkMetal);
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, 2.6, -2);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.75, 12), neonMat);
    lens.position.set(0, 2.6, 1.26);

    group.add(railTop, railBot, plasmaCore, scopeTube, lens);
  } else if (weaponId === 'minigun') {
    // 6-Barrel Rotary Vulcan Minigun
    const housing = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 8, 16), darkMetal);
    housing.rotation.x = Math.PI / 2;
    housing.position.set(0, -0.4, -1);
    group.add(housing);

    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 14, 10), gunMetal);
      b.rotation.x = Math.PI / 2;
      b.position.set(Math.cos(ang) * 1.3, -0.4 + Math.sin(ang) * 1.3, -9);
      group.add(b);
    }

    const clampRing = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.25, 8, 18), neonMat);
    clampRing.position.set(0, -0.4, -13);
    const clampRing2 = clampRing.clone();
    clampRing2.position.z = -7;
    group.add(clampRing, clampRing2);
  } else if (weaponId === 'rpg') {
    // Apex Shoulder-Fired Rocket Launcher with Warhead
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 18, 16), darkMetal);
    tube.rotation.x = Math.PI / 2;
    tube.position.set(0, 0.4, -5);

    const warhead = new THREE.Mesh(new THREE.ConeGeometry(1.8, 4.8, 14), neonMat);
    warhead.rotation.x = -Math.PI / 2;
    warhead.position.set(0, 0.4, -15.5);

    const sight = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.0, 1.5), gunMetal);
    sight.position.set(-1.6, 1.5, -4);

    group.add(tube, warhead, sight);
  } else if (weaponId === 'flamethrower') {
    // Solar Plasma Incinerator with Fuel Tanks
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.0, 12), darkMetal);
    const tankL = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 9, 12), neonMat);
    tankL.rotation.x = Math.PI / 2;
    tankL.position.set(-1.8, -0.8, -2);
    const tankR = tankL.clone();
    tankR.position.x = 1.8;

    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.7, 7, 12), gunMetal);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(0, 0.3, -10);

    const pilotFlame = new THREE.Mesh(new THREE.SphereGeometry(0.85, 10, 10), neonMat);
    pilotFlame.position.set(0, 0.3, -14.2);

    group.add(body, tankL, tankR, nozzle, pilotFlame);
  } else if (weaponId === 'crossbow') {
    // Cyber Ricochet Crossbow with Glowing Bow Limbs
    const stock = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 14), darkMetal);
    const bowArc = new THREE.Mesh(new THREE.BoxGeometry(11, 0.6, 1.4), gunMetal);
    bowArc.position.set(0, 0.6, -9);

    const stringL = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.25, 0.25), neonMat);
    stringL.position.set(-2.6, 0.7, -6.5);
    stringL.rotation.y = 0.45;
    const stringR = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.25, 0.25), neonMat);
    stringR.position.set(2.6, 0.7, -6.5);
    stringR.rotation.y = -0.45;

    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 10, 8), neonMat);
    bolt.rotation.x = Math.PI / 2;
    bolt.position.set(0, 1.2, -7);

    group.add(stock, bowArc, stringL, stringR, bolt);
  } else if (weaponId === 'gauss') {
    // Gauss Burst Rifle with Magnetic Coils
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.0, 13), gunMetal);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 13, 12), darkMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.5, -10);
    group.add(body, barrel);

    for (let i = 0; i < 4; i++) {
      const coil = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.22, 8, 16), neonMat);
      coil.position.set(0, 0.5, -6 - i * 2.5);
      group.add(coil);
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
    const topSlideStripe = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.25, 7.5), neonMat); topSlideStripe.position.set(0, 1.62, -2); group.add(slide, grip, laser, topSlideStripe);
  }

  return group;
}

export class DoomWeaponRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  public weaponGroup: THREE.Group;
  private currentModel: THREE.Group | null = null;
  private currentWeaponId: WeaponType | null = null;
  private currentSkinKey: string = '';
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

    // Dedicated First-Person Weapon Lighting (Reveals full PBR skin colors in all map areas)
    const wepDirLight = new THREE.DirectionalLight(0xffffff, 2.5);
    wepDirLight.position.set(-2, 5, 8);
    this.weaponGroup.add(wepDirLight);

    const wepAmbLight = new THREE.AmbientLight(0xffffff, 1.4);
    this.weaponGroup.add(wepAmbLight);

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
    const neonDef = getNeonSkin(profileManager.get().cosmetics.neonSkinId);
    const neonCol = new THREE.Color(neonDef.colorHex || '#38bdf8');
    (this.muzzleMesh.material as THREE.MeshBasicMaterial).color.copy(neonCol);
    this.muzzleLight.color.copy(neonCol);
  }

  public triggerReload(): void {
    // Handled smoothly via reloadProgress
  }

  public triggerHitmarker(isKill: boolean): void {
    this.hitmarkerTimer = 140;
    this.isHitmarkerKill = isKill;
  }

  public update(dtMs: number, isMoving: boolean, weaponId: WeaponType, reloadProgress: number, cosmeticsOverride?: PlayerCosmetics): void {
    const cos = cosmeticsOverride || profileManager.get().cosmetics;
    const wepSkinId = cos.weaponSkinId || 'wep_default';
    const neonSkinId = cos.neonSkinId || 'neon_cyan';
    const skinKey = `${wepSkinId}|${neonSkinId}`;

    // Rebuild 3D weapon model if weapon or skin changed
    if (this.currentWeaponId !== weaponId || this.currentSkinKey !== skinKey) {
      this.currentSkinKey = skinKey;
      if (this.currentModel) {
        this.weaponGroup.remove(this.currentModel);
      }
      this.currentModel = create3DWeaponMesh(weaponId, wepSkinId, neonSkinId);
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
    const neonCol = getNeonSkin(profileManager.get().cosmetics.neonSkinId).colorHex || '#38bdf8'; ctx.strokeStyle = neonCol;
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
