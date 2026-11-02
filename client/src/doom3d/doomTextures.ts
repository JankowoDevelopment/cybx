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
  // Helper to create pixel-art canvas texture
  function makeTex(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    draw(ctx);
    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // 1. Doom Brick Wall (64x64)
  const wallBrick = makeTex(64, 64, (ctx) => {
    ctx.fillStyle = '#272f3d';
    ctx.fillRect(0, 0, 64, 64);

    ctx.strokeStyle = '#121721';
    ctx.lineWidth = 2;
    // Mortar lines
    ctx.beginPath();
    ctx.moveTo(0, 32); ctx.lineTo(64, 32);
    ctx.moveTo(32, 0); ctx.lineTo(32, 32);
    ctx.moveTo(16, 32); ctx.lineTo(16, 64);
    ctx.moveTo(48, 32); ctx.lineTo(48, 64);
    ctx.stroke();

    // Rivets & grunge
    ctx.fillStyle = '#404c60';
    ctx.fillRect(4, 4, 24, 4);
    ctx.fillRect(36, 4, 24, 4);
    ctx.fillRect(20, 36, 24, 4);

    ctx.fillStyle = '#0f141c';
    ctx.fillRect(2, 2, 3, 3);
    ctx.fillRect(34, 2, 3, 3);
  });

  // 2. Perimeter Hazard Wall (Yellow & Black stripes with red warning borders)
  const wallPerimeter = makeTex(64, 64, (ctx) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 64, 64);

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(24, 0); ctx.lineTo(0, 24); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(32, 0); ctx.lineTo(64, 0); ctx.lineTo(0, 64); ctx.lineTo(0, 32); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(64, 16); ctx.lineTo(64, 48); ctx.lineTo(16, 64); ctx.lineTo(0, 64); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(64, 48); ctx.lineTo(64, 64); ctx.lineTo(48, 64); ctx.fill();

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 60, 60);

    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 10px monospace';
    ctx.fillText('DANGER', 12, 36);
  });

  // 3. Blast Door Texture
  const door = makeTex(64, 64, (ctx) => {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, 0, 64, 64);

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, 58, 58);

    // Hazard stripes at top and bottom
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(6, 6, 52, 10);
    ctx.fillRect(6, 48, 52, 10);

    // Control lock light
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(32, 32, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  // 4. Bunker Wood Floor
  const floorBunker = makeTex(64, 64, (ctx) => {
    ctx.fillStyle = '#2b211a';
    ctx.fillRect(0, 0, 64, 64);

    ctx.strokeStyle = '#18120e';
    ctx.lineWidth = 2;
    for (let y = 16; y < 64; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y); ctx.lineTo(64, y); ctx.stroke();
    }

    ctx.fillStyle = '#3a2d24';
    for (let i = 0; i < 25; i++) {
      ctx.fillRect(Math.random() * 58, Math.random() * 58, 6, 1);
    }
  });

  // 5. Metal Armory Floor
  const floorArmory = makeTex(64, 64, (ctx) => {
    ctx.fillStyle = '#1e2430';
    ctx.fillRect(0, 0, 64, 64);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(64, 64);
    ctx.moveTo(64, 0); ctx.lineTo(0, 64);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.fillRect(16, 16, 4, 4);
    ctx.fillRect(48, 48, 4, 4);
  });

  // 6. Lab Tiles
  const floorLab = makeTex(64, 64, (ctx) => {
    ctx.fillStyle = '#0f2228';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillRect(32, 32, 32, 32);
    ctx.fillStyle = '#163139';
    ctx.fillRect(32, 0, 32, 32);
    ctx.fillRect(0, 32, 32, 32);

    ctx.strokeStyle = '#081216';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 64, 64);
  });

  // 7. Courtyard Stone
  const floorCourtyard = makeTex(64, 64, (ctx) => {
    ctx.fillStyle = '#181b22';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#121419';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 64, 64);
    ctx.strokeStyle = '#272d3b';
    ctx.beginPath();
    ctx.moveTo(10, 15); ctx.lineTo(35, 30); ctx.lineTo(52, 22);
    ctx.stroke();
  });

  // 8. Generator Grid Floor
  const floorGenerator = makeTex(64, 64, (ctx) => {
    ctx.fillStyle = '#141224';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#9333ea';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(6, 6, 52, 52);
    ctx.fillStyle = '#581c87';
    ctx.fillRect(24, 24, 16, 16);
  });

  // 9. Ceiling Tile (Industrial Bunker panels with fluorescent tubes)
  const ceiling = makeTex(64, 64, (ctx) => {
    ctx.fillStyle = '#11141d';
    ctx.fillRect(0, 0, 64, 64);
    ctx.strokeStyle = '#1e2430';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 64, 64);

    // Glowing fluorescent tube
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(28, 8, 8, 48);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(30, 10, 4, 44);
  });

  // 10. Mystery Box
  const mysteryBox = makeTex(64, 40, (ctx) => {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, 0, 64, 40);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 60, 36);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('???', 32, 26);
  });

  // 11. Zombie Doom Billboard Sprites (Walker, Runner, Brute)
  const zombieColors: Record<string, { body: string; head: string; eye: string }> = {
    walker: { body: '#14532d', head: '#22c55e', eye: '#ef4444' },
    runner: { body: '#7c2d12', head: '#ea580c', eye: '#fef08a' },
    brute: { body: '#450a0a', head: '#dc2626', eye: '#ffffff' }
  };

  const zombies: Record<string, THREE.CanvasTexture[]> = {};

  for (const [type, cols] of Object.entries(zombieColors)) {
    // 2 walk animation frames + 1 hurt frame
    zombies[type] = [0, 1, 2].map((frame) => {
      return makeTex(64, 80, (ctx) => {
        const isHurt = frame === 2;
        const bob = frame === 1 ? 4 : 0;

        // Torso / clothes
        ctx.fillStyle = isHurt ? '#ffffff' : cols.body;
        ctx.fillRect(20, 28 + bob, 24, 30);

        // Head
        ctx.fillStyle = isHurt ? '#ffffff' : cols.head;
        ctx.beginPath();
        ctx.arc(32, 18 + bob, 14, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = isHurt ? '#ef4444' : cols.eye;
        ctx.fillRect(26, 14 + bob, 4, 4);
        ctx.fillRect(34, 14 + bob, 4, 4);

        // Bloody mouth
        ctx.fillStyle = '#7f1d1d';
        ctx.fillRect(28, 22 + bob, 8, 4);

        // Outstretched claws (Doom style forward arms)
        ctx.fillStyle = isHurt ? '#ffffff' : cols.head;
        const armOffset = frame === 1 ? -4 : 4;
        ctx.fillRect(10, 32 + bob + armOffset, 10, 8);
        ctx.fillRect(44, 32 + bob - armOffset, 10, 8);

        // Legs
        ctx.fillStyle = isHurt ? '#ffffff' : '#0f172a';
        ctx.fillRect(22, 58 + bob, 8, 18);
        ctx.fillRect(34, 58 + bob, 8, 18);
      });
    });
  }

  // 12. Blood Particle
  const bloodParticle = makeTex(16, 16, (ctx) => {
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(8, 8, 6, 0, Math.PI * 2);
    ctx.fill();
  });

  // 13. Spark Particle
  const sparkParticle = makeTex(16, 16, (ctx) => {
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(8, 8, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(8, 8, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  // 11. Explosive Hazard Barrel (64x64)
  const explosiveBarrel = makeTex(64, 64, (ctx) => {
    // Red industrial barrel body
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(0, 0, 64, 64);

    // Dark iron ridges / bands
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 64, 6);
    ctx.fillRect(0, 18, 64, 5);
    ctx.fillRect(0, 41, 64, 5);
    ctx.fillRect(0, 58, 64, 6);

    // Yellow hazard caution stripes in middle
    ctx.fillStyle = '#eab308';
    ctx.fillRect(4, 25, 56, 14);

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(8, 39); ctx.lineTo(16, 25); ctx.lineTo(24, 25); ctx.lineTo(16, 39); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(26, 39); ctx.lineTo(34, 25); ctx.lineTo(42, 25); ctx.lineTo(34, 39); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(44, 39); ctx.lineTo(52, 25); ctx.lineTo(60, 25); ctx.lineTo(52, 39); ctx.fill();

    // Highlights & metal sheen
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(8, 6, 8, 52);
  });

  // 12. Fiery Explosion Shockwave (128x128)
  const explosionFlame = makeTex(128, 128, (ctx) => {
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.2, '#fef08a');
    grad.addColorStop(0.5, '#f97316');
    grad.addColorStop(0.8, '#dc2626');
    grad.addColorStop(1, 'rgba(153, 27, 27, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
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
