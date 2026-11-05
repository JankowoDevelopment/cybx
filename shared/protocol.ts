import {
  GameSnapshot,
  PlayerState,
  ZombieState,
  BulletState,
  GrenadeState,
  PowerUpState,
  DoorState,
  JumpPad,
  BarrelState,
  MysteryBoxState,
  WeaponType,
  RoundState,
  PowerUpType
} from './types.js';

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export type CompactPlayer = [
  string, // 0: id
  string, // 1: name
  number, // 2: x
  number, // 3: y
  number, // 4: angle
  number, // 5: hp
  number, // 6: maxHp
  number, // 7: points
  number, // 8: downed (0/1)
  number, // 9: isDead (0/1)
  WeaponType, // 10: weaponId
  number, // 11: ammoClip
  number, // 12: ammoReserve
  number, // 13: isReloading (0/1)
  number, // 14: reloadProgress
  number, // 15: isDashing (0/1)
  number, // 16: dashCooldownRemaining
  number, // 17: grenadesRemaining
  number, // 18: z
  number, // 19: isGrounded (0/1)
  number, // 20: bhopStreak
  number, // 21: kills
  number, // 22: deaths
  number, // 23: roundWins
  number, // 24: headshots
  string, // 25: color
  string[], // 26: cards
  string[], // 27: items
  any, // 28: cosmetics
  string, // 29: killedBy
  number, // 30: respawnTimer
  number, // 31: reviveProgress
  string // 32: revivingTargetId
];

export type CompactZombie = [
  string, // 0: id
  number, // 1: x
  number, // 2: y
  number, // 3: angle
  number, // 4: hp
  number, // 5: maxHp
  number, // 6: speed
  'walker' | 'runner' | 'brute', // 7: type
  string, // 8: targetPlayerId
  number // 9: isHit (0/1)
];

export type CompactBullet = [
  string, // 0: id
  number, // 1: x
  number, // 2: y
  number, // 3: vx
  number, // 4: vy
  number, // 5: z
  number, // 6: vz
  number, // 7: pitch
  string, // 8: shooterId
  WeaponType, // 9: weaponId
  number, // 10: damage
  number, // 11: bulletRadius
  number, // 12: pierceLeft
  number, // 13: bouncesLeft
  number, // 14: explosiveRadius
  number, // 15: isZeroG (0/1)
  number, // 16: isTesla (0/1)
  number // 17: isFrost (0/1)
];

export type CompactGrenade = [
  string, // 0: id
  number, // 1: x
  number, // 2: y
  number, // 3: vx
  number, // 4: vy
  number, // 5: timer
  number, // 6: radius
  string // 7: shooterId
];

export type CompactPowerUp = [
  string, // 0: id
  number, // 1: x
  number, // 2: y
  PowerUpType, // 3: type
  number // 4: durationTimer
];

export type CompactDoor = [
  string, // 0: id
  number // 1: isOpen (0/1)
];

export type CompactJumpPad = [
  string, // 0: id
  number, // 1: x
  number, // 2: y
  number, // 3: radius
  number, // 4: boostZ
  string // 5: colorHex
];

export type CompactBarrel = [
  string, // 0: id
  number, // 1: x
  number, // 2: y
  number, // 3: hp
  number // 4: isExploded (0/1)
];

export type CompactMysteryBox = [
  number, // 0: x
  number, // 1: y
  number, // 2: cost
  number, // 3: isSpinning (0/1)
  string, // 4: spinWeaponId
  number // 5: spinTimer
];

export interface CompactSnapshot {
  r: number;
  s: RoundState;
  t: number;
  p: CompactPlayer[];
  z: CompactZombie[];
  b: CompactBullet[];
  g: CompactGrenade[];
  pu: CompactPowerUp[];
  d: CompactDoor[];
  jp: CompactJumpPad[];
  bar: CompactBarrel[];
  mb: CompactMysteryBox | null;
  ap: [number, number]; // instaKill, doublePoints
  cp: string | null;
  cn: string | null;
  oc: string[];
  wn: string | null;
  wi?: string | null;
}

export function packSnapshot(s: GameSnapshot): CompactSnapshot {
  return {
    r: s.round,
    s: s.roundState,
    t: s.roundTimer,
    p: s.players.map((p): CompactPlayer => [
      p.id,
      p.name,
      round1(p.x),
      round1(p.y),
      round2(p.angle),
      p.hp,
      p.maxHp,
      p.points,
      p.downed ? 1 : 0,
      p.isDead ? 1 : 0,
      p.weaponId,
      p.ammoClip,
      p.ammoReserve,
      p.isReloading ? 1 : 0,
      round2(p.reloadProgress),
      p.isDashing ? 1 : 0,
      p.dashCooldownRemaining,
      p.grenadesRemaining,
      round1(p.z || 0),
      p.isGrounded ? 1 : 0,
      p.bhopStreak || 0,
      p.kills,
      p.deaths,
      p.roundWins,
      p.headshots,
      p.color,
      p.cards || [],
      p.items || [],
      p.cosmetics,
      p.killedBy || '',
      p.respawnTimer || 0,
      p.reviveProgress || 0,
      p.revivingTargetId || ''
    ]),
    z: s.zombies.map((z): CompactZombie => [
      z.id,
      round1(z.x),
      round1(z.y),
      round2(z.angle),
      z.hp,
      z.maxHp,
      z.speed,
      z.type,
      z.targetPlayerId || '',
      z.isHit ? 1 : 0
    ]),
    b: s.bullets.map((b): CompactBullet => [
      b.id,
      round1(b.x),
      round1(b.y),
      round1(b.vx),
      round1(b.vy),
      round1(b.z !== undefined ? b.z : 24),
      round1(b.vz || 0),
      round2(b.pitch || 0),
      b.shooterId,
      b.weaponId,
      b.damage,
      b.bulletRadius,
      b.pierceLeft,
      b.bouncesLeft,
      b.explosiveRadius || 0,
      b.isZeroG ? 1 : 0,
      b.isTesla ? 1 : 0,
      b.isFrost ? 1 : 0
    ]),
    g: s.grenades.map((g): CompactGrenade => [
      g.id,
      round1(g.x),
      round1(g.y),
      round1(g.vx),
      round1(g.vy),
      g.timer,
      g.radius,
      g.shooterId
    ]),
    pu: s.powerUps.map((pu): CompactPowerUp => [
      pu.id,
      round1(pu.x),
      round1(pu.y),
      pu.type,
      pu.durationTimer
    ]),
    d: s.doors.map((d): CompactDoor => [
      d.id,
      d.isOpen ? 1 : 0
    ]),
    jp: (s.jumpPads || []).map((jp): CompactJumpPad => [
      jp.id,
      jp.x,
      jp.y,
      jp.radius,
      jp.boostZ,
      jp.colorHex || ''
    ]),
    bar: s.barrels.map((bar): CompactBarrel => [
      bar.id,
      round1(bar.x),
      round1(bar.y),
      bar.hp,
      bar.isExploded ? 1 : 0
    ]),
    mb: s.mysteryBox
      ? [
          round1(s.mysteryBox.x),
          round1(s.mysteryBox.y),
          s.mysteryBox.cost,
          s.mysteryBox.isSpinning ? 1 : 0,
          s.mysteryBox.spinWeaponId || '',
          s.mysteryBox.spinTimer
        ]
      : null,
    ap: [s.activePowerUps.instaKill, s.activePowerUps.doublePoints],
    cp: s.cardPickerId,
    cn: s.cardPickerName,
    oc: s.offeredCards,
    wn: s.roundWinnerName,
    wi: s.roundWinnerId
  };
}

export function unpackSnapshot(c: CompactSnapshot, baseDoors: DoorState[] = []): GameSnapshot {
  const doorMap = new Map<string, boolean>();
  for (const [id, open] of c.d) {
    doorMap.set(id, Boolean(open));
  }

  const restoredDoors: DoorState[] = baseDoors.map((d) => ({
    ...d,
    isOpen: doorMap.has(d.id) ? Boolean(doorMap.get(d.id)) : d.isOpen
  }));

  const players: PlayerState[] = c.p.map((arr) => ({
    id: arr[0],
    name: arr[1],
    x: arr[2],
    y: arr[3],
    angle: arr[4],
    hp: arr[5],
    maxHp: arr[6],
    points: arr[7],
    downed: Boolean(arr[8]),
    isDead: Boolean(arr[9]),
    weaponId: arr[10],
    ammoClip: arr[11],
    ammoReserve: arr[12],
    isReloading: Boolean(arr[13]),
    reloadProgress: arr[14],
    isDashing: Boolean(arr[15]),
    dashCooldownRemaining: arr[16],
    grenadesRemaining: arr[17],
    z: arr[18],
    isGrounded: Boolean(arr[19]),
    bhopStreak: arr[20],
    kills: arr[21],
    deaths: arr[22],
    roundWins: arr[23],
    headshots: arr[24],
    color: arr[25],
    cards: arr[26],
    items: arr[27],
    cosmetics: arr[28],
    killedBy: arr[29] || null,
    respawnTimer: arr[30],
    reviveProgress: arr[31],
    revivingTargetId: arr[32] || null
  }));

  const zombies: ZombieState[] = c.z.map((arr) => ({
    id: arr[0],
    x: arr[1],
    y: arr[2],
    angle: arr[3],
    hp: arr[4],
    maxHp: arr[5],
    speed: arr[6],
    type: arr[7],
    targetPlayerId: arr[8] || null,
    isHit: Boolean(arr[9])
  }));

  const bullets: BulletState[] = c.b.map((arr) => ({
    id: arr[0],
    x: arr[1],
    y: arr[2],
    vx: arr[3],
    vy: arr[4],
    z: arr[5],
    vz: arr[6],
    pitch: arr[7],
    shooterId: arr[8],
    weaponId: arr[9],
    damage: arr[10],
    bulletRadius: arr[11],
    pierceLeft: arr[12],
    bouncesLeft: arr[13],
    explosiveRadius: arr[14] || undefined,
    isZeroG: Boolean(arr[15]),
    isTesla: Boolean(arr[16]),
    isFrost: Boolean(arr[17])
  }));

  const grenades: GrenadeState[] = c.g.map((arr) => ({
    id: arr[0],
    x: arr[1],
    y: arr[2],
    vx: arr[3],
    vy: arr[4],
    timer: arr[5],
    radius: arr[6],
    shooterId: arr[7]
  }));

  const powerUps: PowerUpState[] = c.pu.map((arr) => ({
    id: arr[0],
    x: arr[1],
    y: arr[2],
    type: arr[3],
    durationTimer: arr[4]
  }));

  const jumpPads: JumpPad[] = c.jp.map((arr) => ({
    id: arr[0],
    x: arr[1],
    y: arr[2],
    radius: arr[3],
    boostZ: arr[4],
    colorHex: arr[5] || undefined
  }));

  const barrels: BarrelState[] = c.bar.map((arr) => ({
    id: arr[0],
    x: arr[1],
    y: arr[2],
    hp: arr[3],
    isExploded: Boolean(arr[4])
  }));

  const mysteryBox: MysteryBoxState | undefined = c.mb
    ? {
        x: c.mb[0],
        y: c.mb[1],
        cost: c.mb[2],
        isSpinning: Boolean(c.mb[3]),
        spinWeaponId: (c.mb[4] as WeaponType) || null,
        spinTimer: c.mb[5]
      }
    : undefined;

  return {
    round: c.r,
    roundState: c.s,
    roundTimer: c.t,
    players,
    zombies,
    bullets,
    grenades,
    powerUps,
    doors: restoredDoors,
    jumpPads,
    barrels,
    mysteryBox,
    activePowerUps: {
      instaKill: c.ap[0],
      doublePoints: c.ap[1]
    },
    cardPickerId: c.cp,
    cardPickerName: c.cn,
    offeredCards: c.oc,
    roundWinnerName: c.wn,
    roundWinnerId: c.wi
  };
}
