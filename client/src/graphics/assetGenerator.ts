import Phaser from 'phaser';

export function generateGameTextures(scene: Phaser.Scene): void {
  // 1. Bunker Wood Floor Tile (64x64)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Wood planks
    ctx.fillStyle = '#292019';
    ctx.fillRect(0, 0, 64, 64);

    // Plank gaps
    ctx.strokeStyle = '#18120e';
    ctx.lineWidth = 2;
    for (let y = 16; y < 64; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(64, y);
      ctx.stroke();
    }

    // Wood grain lines
    ctx.fillStyle = '#362b22';
    for (let i = 0; i < 20; i++) {
      const rx = Math.floor(Math.random() * 60);
      const ry = Math.floor(Math.random() * 60);
      ctx.fillRect(rx, ry, 6, 1);
    }

    scene.textures.addCanvas('floor_bunker_wood', canvas);
  }

  // 2. Metal Armory Floor Tile (64x64)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1e2430';
    ctx.fillRect(0, 0, 64, 64);

    // Diamond plate metal pattern
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(64, 64);
    ctx.moveTo(64, 0); ctx.lineTo(0, 64);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.fillRect(16, 16, 4, 4);
    ctx.fillRect(48, 48, 4, 4);

    scene.textures.addCanvas('floor_metal_armory', canvas);
  }

  // 3. Lab Tiles (64x64 checkered clean tiles)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#0f2228';
    ctx.fillRect(0, 0, 32, 32);
    ctx.fillRect(32, 32, 32, 32);

    ctx.fillStyle = '#163139';
    ctx.fillRect(32, 0, 32, 32);
    ctx.fillRect(0, 32, 32, 32);

    ctx.strokeStyle = '#0a171b';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, 64, 64);

    scene.textures.addCanvas('floor_lab_tiles', canvas);
  }

  // 4. Courtyard Stone (64x64)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#181b22';
    ctx.fillRect(0, 0, 64, 64);

    ctx.strokeStyle = '#121419';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 64, 64);

    // Cracks
    ctx.strokeStyle = '#222733';
    ctx.beginPath();
    ctx.moveTo(12, 10); ctx.lineTo(34, 28); ctx.lineTo(50, 20);
    ctx.stroke();

    scene.textures.addCanvas('floor_courtyard_stone', canvas);
  }

  // 5. Generator Grid Floor (64x64)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#151324';
    ctx.fillRect(0, 0, 64, 64);

    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 1;
    ctx.strokeRect(4, 4, 56, 56);

    ctx.fillStyle = '#3b0764';
    ctx.fillRect(24, 24, 16, 16);

    scene.textures.addCanvas('floor_generator_grid', canvas);
  }

  // 6. Perimeter Boundary Hazard Wall Texture (64x64)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Concrete base
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 64, 64);

    // High contrast yellow & black diagonal hazard stripes
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(24, 0); ctx.lineTo(0, 24); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(32, 0); ctx.lineTo(64, 0); ctx.lineTo(0, 64); ctx.lineTo(0, 32); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(64, 16); ctx.lineTo(64, 48); ctx.lineTo(16, 64); ctx.lineTo(0, 64); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(64, 48); ctx.lineTo(64, 64); ctx.lineTo(48, 64); ctx.fill();

    // Red warning line
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.strokeRect(1, 1, 62, 62);

    scene.textures.addCanvas('wall_perimeter_hazard', canvas);
  }

  // 7. Player Sprite (Top-down soldier with hands and gun)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d')!;

    const cx = 24;
    const cy = 24;

    // Body (circular armor vest)
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();

    // Shoulders
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(cx, cy - 8, 6, 0, Math.PI * 2);
    ctx.arc(cx, cy + 8, 6, 0, Math.PI * 2);
    ctx.fill();

    // Helmet / Head
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fill();

    // Gun barrel pointing right (angle 0)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(cx + 4, cy + 2, 18, 5);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(cx + 8, cy + 3, 12, 3);

    scene.textures.addCanvas('player_sprite', canvas);
  }

  // 8. Downed Player Sprite (crawling, bloody marker)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(24, 24, 12, 0, Math.PI * 2);
    ctx.fill();

    // Red cross marker
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(22, 16, 4, 16);
    ctx.fillRect(16, 22, 16, 4);

    scene.textures.addCanvas('player_downed', canvas);
  }

  // 9. Zombie Sprites (Walker, Runner, Brute)
  const zombieColors = {
    walker: '#22c55e',
    runner: '#f97316',
    brute: '#dc2626'
  };

  for (const [type, color] of Object.entries(zombieColors)) {
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d')!;

    const cx = 24;
    const cy = 24;

    // Body
    ctx.fillStyle = '#14532d';
    ctx.beginPath();
    ctx.arc(cx, cy, type === 'brute' ? 17 : 13, 0, Math.PI * 2);
    ctx.fill();

    // Rotting head
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, type === 'brute' ? 10 : 7, 0, Math.PI * 2);
    ctx.fill();

    // Outstretched grabbing hands
    ctx.fillStyle = color;
    ctx.fillRect(cx + 8, cy - 10, 10, 4);
    ctx.fillRect(cx + 8, cy + 6, 10, 4);

    scene.textures.addCanvas(`zombie_${type}`, canvas);
  }

  // 10. Mystery Box (Glowy wooden/metal chest with question marks)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 40;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, 0, 64, 40);

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, 60, 36);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px "Chakra Petch", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('???', 32, 20);

    scene.textures.addCanvas('mystery_box_tex', canvas);
  }

  // 11. Hitmarker Reticle Texture ('X')
  {
    const canvas = document.createElement('canvas');
    canvas.width = 24;
    canvas.height = 24;
    const ctx = canvas.getContext('2d')!;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(4, 4); ctx.lineTo(10, 10);
    ctx.moveTo(20, 4); ctx.lineTo(14, 10);
    ctx.moveTo(4, 20); ctx.lineTo(10, 14);
    ctx.moveTo(20, 20); ctx.lineTo(14, 14);
    ctx.stroke();

    scene.textures.addCanvas('hitmarker_cross', canvas);
  }

  // 12. Spark Particle (Yellow/white hit spark)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 12;
    canvas.height = 12;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(6, 6, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(6, 6, 6, 0, Math.PI * 2);
    ctx.fill();

    scene.textures.addCanvas('particle_spark', canvas);
  }

  // 13. Blood Particle (Deep crimson drop)
  {
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(5, 5, 4, 0, Math.PI * 2);
    ctx.fill();

    scene.textures.addCanvas('particle_blood', canvas);
  }

  // 14. Power-ups (Icons)
  const powerupLabels: Record<string, { label: string; bg: string }> = {
    nuke: { label: '☢', bg: '#ef4444' },
    instaKill: { label: '☠', bg: '#dc2626' },
    maxAmmo: { label: '⚡', bg: '#0284c7' },
    doublePoints: { label: '2X', bg: '#eab308' }
  };

  for (const [key, conf] of Object.entries(powerupLabels)) {
    const canvas = document.createElement('canvas');
    canvas.width = 36;
    canvas.height = 36;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = conf.bg;
    ctx.beginPath();
    ctx.arc(18, 18, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(conf.label, 18, 18);

    scene.textures.addCanvas(`powerup_${key}`, canvas);
  }
}
