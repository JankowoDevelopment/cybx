import * as THREE from 'three';

export interface DoomTextureSet {
  wallBrick: THREE.CanvasTexture;
  wallPerimeter: THREE.CanvasTexture;
  door: THREE.CanvasTexture;
  floorBunker: THREE.CanvasTexture;
  floorArmory: THREE.CanvasTexture;
  floorLab: THREE.CanvasTexture;
  floorCourtyard: THREE.CanvasTexture;
  floorGenerator: THREE.CanvasTexture;
  ceiling: THREE.CanvasTexture;
  mysteryBox: THREE.CanvasTexture;
  zombies: Record<string, THREE.CanvasTexture[]>;
  bloodParticle: THREE.CanvasTexture;
  sparkParticle: THREE.CanvasTexture;
  explosiveBarrel: THREE.CanvasTexture;
  explosionFlame: THREE.CanvasTexture;
}

export function createDoomTextures(): DoomTextureSet {
  function makeTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, pixelated = false): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    draw(ctx);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = pixelated ? THREE.NearestFilter : THREE.LinearFilter;
    tex.minFilter = pixelated ? THREE.NearestFilter : THREE.LinearMipmapLinearFilter;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  }

  // 1. Cyber-Titanium Tactical Wall Panel (256x256)
  const wallBrick = makeTex(256, 256, (ctx) => {
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#1e293b');
    grad.addColorStop(0.5, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Metallic bevel panels
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 112, 112);
    ctx.strokeRect(136, 8, 112, 112);
    ctx.strokeRect(8, 136, 240, 112);

    // Inner dark recesses
    ctx.fillStyle = '#090d16';
    ctx.fillRect(16, 16, 96, 96);
    ctx.fillRect(144, 16, 96, 96);
    ctx.fillRect(16, 144, 224, 96);

    // Tech vents
    ctx.fillStyle = '#1e293b';
    for (let y = 160; y <= 220; y += 12) {
      ctx.fillRect(32, y, 192, 6);
    }

    // Glowing cyan accent strip
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, 124, 256, 4);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.fillRect(0, 118, 256, 16);
  });

  // 2. Perimeter Cyber-Barrier Wall (256x256)
  const wallPerimeter = makeTex(256, 256, (ctx) => {
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, 256, 256);

    // Hex / carbon grid pattern
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    for (let i = 0; i < 256; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, 256);
      ctx.moveTo(0, i); ctx.lineTo(256, i);
      ctx.stroke();
    }

    // Glowing Red/Orange Arena Border Neon Strip
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(0, 20, 256, 8);
    ctx.fillRect(0, 228, 256, 8);

    // Hazard diagonal chevrons
    ctx.fillStyle = '#f59e0b';
    for (let x = -256; x < 256; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 220);
      ctx.lineTo(x + 32, 220);
      ctx.lineTo(x + 64, 248);
      ctx.lineTo(x + 32, 248);
      ctx.closePath();
      ctx.fill();
    }

    // Center armor plate
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 48, 224, 160);
  });

  // 3. Blast Door (256x256)
  const door = makeTex(256, 256, (ctx) => {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#f59e0b';
    for (let i = -256; i < 256; i += 48) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 24, 0);
      ctx.lineTo(i + 280, 256);
      ctx.lineTo(i + 256, 256);
      ctx.fill();
    }
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(16, 16, 224, 224);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, 224, 224);
  });

  // 4. Cyber-Arena Grid Floor (256x256)
  const floorCourtyard = makeTex(256, 256, (ctx) => {
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, 256, 256);

    // Subtle metallic tiles
    ctx.fillStyle = '#111827';
    ctx.fillRect(6, 6, 116, 116);
    ctx.fillRect(134, 6, 116, 116);
    ctx.fillRect(6, 134, 116, 116);
    ctx.fillRect(134, 134, 116, 116);

    // Glowing cyan/blue cyber grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.28)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 256, 256);
    ctx.beginPath();
    ctx.moveTo(128, 0); ctx.lineTo(128, 256);
    ctx.moveTo(0, 128); ctx.lineTo(256, 128);
    ctx.stroke();

    // Corner node dots
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(128, 128, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  const floorBunker = floorCourtyard;
  const floorArmory = floorCourtyard;
  const floorLab = floorCourtyard;
  const floorGenerator = floorCourtyard;

  // 5. Ceiling
  const ceiling = makeTex(128, 128, (ctx) => {
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, 128, 128);
  });

  // 6. Mystery Box placeholder
  const mysteryBox = makeTex(64, 40, (ctx) => {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 64, 40);
  });

  // 7. Fallback Zombie Sprites
  const zombies: Record<string, THREE.CanvasTexture[]> = {
    walker: [],
    runner: [],
    brute: []
  };
  const dummyTex = makeTex(64, 64, (ctx) => {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(16, 8, 32, 48);
  });
  zombies.walker = [dummyTex, dummyTex, dummyTex];
  zombies.runner = [dummyTex, dummyTex, dummyTex];
  zombies.brute = [dummyTex, dummyTex, dummyTex];

  // 8. Particles
  const bloodParticle = makeTex(32, 32, (ctx) => {
    const g = ctx.createRadialGradient(16, 16, 2, 16, 16, 16);
    g.addColorStop(0, '#ef4444');
    g.addColorStop(1, 'rgba(239,68,68,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  });

  const sparkParticle = makeTex(32, 32, (ctx) => {
    const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 16);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, '#38bdf8');
    g.addColorStop(1, 'rgba(56,189,248,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  });

  // 9. Explosive Sci-Fi Plasma Barrel Texture (128x128)
  const explosiveBarrel = makeTex(128, 128, (ctx) => {
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(0, 0, 128, 128);

    // Metallic dark ribs
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 128, 14);
    ctx.fillRect(0, 38, 128, 10);
    ctx.fillRect(0, 80, 128, 10);
    ctx.fillRect(0, 114, 128, 14);

    // Glowing plasma core band
    const g = ctx.createLinearGradient(0, 48, 0, 80);
    g.addColorStop(0, '#f59e0b');
    g.addColorStop(0.5, '#fef08a');
    g.addColorStop(1, '#ef4444');
    ctx.fillStyle = g;
    ctx.fillRect(0, 48, 128, 32);

    // Diagonal hazard stripes over plasma band
    ctx.fillStyle = '#0f172a';
    for (let x = -64; x < 128; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 80);
      ctx.lineTo(x + 14, 48);
      ctx.lineTo(x + 26, 48);
      ctx.lineTo(x + 12, 80);
      ctx.fill();
    }
  });

  // 10. Fiery Explosion Texture (128x128)
  const explosionFlame = makeTex(128, 128, (ctx) => {
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.25, '#fef08a');
    grad.addColorStop(0.55, '#f97316');
    grad.addColorStop(0.85, '#dc2626');
    grad.addColorStop(1, 'rgba(153, 27, 27, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 62, 0, Math.PI * 2);
    ctx.fill();
  });

  return {
    wallBrick,
    wallPerimeter,
    door,
    floorBunker,
    floorArmory,
    floorLab,
    floorCourtyard,
    floorGenerator,
    ceiling,
    mysteryBox,
    zombies,
    bloodParticle,
    sparkParticle,
    explosiveBarrel,
    explosionFlame
  };
}
