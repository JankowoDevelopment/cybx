import * as THREE from 'three';
import { WeaponType } from '@shared/types.js';
import { PlayerCosmetics, DEFAULT_COSMETICS, getNeonSkin, getCharacterSkin } from '@shared/skins.js';
import { create3DWeaponMesh } from './doomWeapon.js';

export interface CyberCharacter3D {
  group: THREE.Group;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  armR: THREE.Group;
  gunMesh: THREE.Group;
  weaponId: WeaponType;
  skinKey: string;
  walkPhase: number;
  lastX: number;
  lastZ: number;
}

export function createCyberCharacterModel(
  fallbackColorHex: string,
  initialWeapon: WeaponType = 'm16',
  cosmetics?: PlayerCosmetics,
  enableXRay: boolean = true
): CyberCharacter3D {
  const cos = cosmetics || DEFAULT_COSMETICS;
  const neonSkin = getNeonSkin(cos.neonSkinId);
  const charSkin = getCharacterSkin(cos.charSkinId);

  const hasCustomNeon = Boolean(cos.neonSkinId && cos.neonSkinId !== 'neon_cyan');
  const hasCustomChar = Boolean(cos.charSkinId && cos.charSkinId !== 'char_default');

  const group = new THREE.Group();
  const primaryNeonHex = hasCustomNeon
    ? neonSkin.colorHex
    : hasCustomChar
    ? charSkin.secondaryArmorHex
    : fallbackColorHex || '#ef4444';

  const primaryColor = new THREE.Color(primaryNeonHex);
  const armorColor = new THREE.Color(charSkin.armorHex || '#1e293b');
  const visorColor = new THREE.Color(hasCustomNeon ? neonSkin.colorHex : charSkin.visorHex || '#38bdf8');

  const armorMat = new THREE.MeshStandardMaterial({
    color: armorColor,
    roughness: charSkin.roughness ?? 0.16,
    metalness: charSkin.metalness ?? 0.92,
    envMapIntensity: 2.5
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: primaryColor,
    emissive: primaryColor,
    emissiveIntensity: 1.45,
    roughness: 0.16,
    metalness: 0.85,
    envMapIntensity: 2.2
  });

  const visorMat = new THREE.MeshBasicMaterial({
    color: visorColor.clone().multiplyScalar(2.1)
  });

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(16, 18, 10), armorMat);
  torso.position.y = 25;
  torso.castShadow = true;
  group.add(torso);

  const chestCore = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 10.6), accentMat);
  chestCore.position.y = 26;
  group.add(chestCore);

  // Head + Visor + Crest
  const head = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), armorMat);
  head.position.y = 40;
  head.castShadow = true;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(9.2, 3.2, 10.4), visorMat);
  visor.position.set(0, 40.5, 0.3);
  const crest = new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 11), accentMat);
  crest.position.set(0, 45.5, 0);
  group.add(head, visor, crest);

  // Optional X-Ray Wallhack Overlay for Arena PvP
  if (enableXRay) {
    const xrayMat = new THREE.MeshBasicMaterial({
      color: primaryColor,
      transparent: true,
      opacity: 0.44,
      depthTest: false,
      depthWrite: false
    });
    const xrayWireMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
      depthTest: false,
      depthWrite: false
    });

    const xrayTorso = new THREE.Mesh(new THREE.BoxGeometry(16.6, 18.6, 10.6), xrayMat);
    xrayTorso.position.y = 25;
    xrayTorso.renderOrder = 998;
    group.add(xrayTorso);

    const xrayHead = new THREE.Mesh(new THREE.BoxGeometry(10.8, 10.8, 10.8), xrayMat);
    xrayHead.position.y = 40;
    xrayHead.renderOrder = 998;
    group.add(xrayHead);

    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(5.5, 0), xrayWireMat);
    beacon.position.y = 53;
    beacon.renderOrder = 998;
    group.add(beacon);
  }

  // Shoulder Pauldrons
  const padGeo = new THREE.BoxGeometry(6, 7, 11);
  const padL = new THREE.Mesh(padGeo, accentMat);
  padL.position.set(-11, 31, 0);
  const padR = new THREE.Mesh(padGeo, accentMat);
  padR.position.set(11, 31, 0);
  group.add(padL, padR);

  // Left Arm
  const armGeo = new THREE.BoxGeometry(4.5, 14, 4.5);
  const armL = new THREE.Mesh(armGeo, armorMat);
  armL.position.set(-11, 22, 0);
  group.add(armL);

  // Right Arm + Skinned 3D Weapon
  const armR = new THREE.Group();
  armR.position.set(11, 28, 0);
  const armRMesh = new THREE.Mesh(armGeo, armorMat);
  armRMesh.rotation.x = Math.PI / 2;
  armRMesh.position.set(0, 0, 5);
  armR.add(armRMesh);

  const gun = create3DWeaponMesh(initialWeapon, cos.weaponSkinId, cos.neonSkinId);
  gun.scale.set(1.1, 1.1, 1.1);
  gun.rotation.y = Math.PI;
  gun.position.set(0, 1, 12);
  armR.add(gun);
  group.add(armR);

  // Legs
  const legGeo = new THREE.BoxGeometry(5.5, 16, 6);
  const legL = new THREE.Mesh(legGeo, accentMat);
  legL.position.set(-4.5, 8, 0);
  legL.castShadow = true;
  const legR = new THREE.Mesh(legGeo, accentMat);
  legR.position.set(4.5, 8, 0);
  legR.castShadow = true;
  group.add(legL, legR);

  // ===================== UNIQUE 3D CHARACTER SKIN ADDONS =====================
  const addon = charSkin.addon;
  if (addon === 'antenna') {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 11, 8), armorMat);
    rod.position.set(-4.5, 49, -2);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), visorMat);
    tip.position.set(-4.5, 55, -2);
    group.add(rod, tip);
  } else if (addon === 'visor_tac') {
    for (const ox of [-2.4, 2.4]) {
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 4, 10), visorMat);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(ox, 41, 6.2);
      group.add(lens);
    }
  } else if (addon === 'shoulder_shield') {
    const shGeo = new THREE.BoxGeometry(2.5, 12, 14);
    const shL = new THREE.Mesh(shGeo, armorMat);
    shL.position.set(-15, 32, 0);
    shL.rotation.z = 0.25;
    const shR = new THREE.Mesh(shGeo, armorMat);
    shR.position.set(15, 32, 0);
    shR.rotation.z = -0.25;
    group.add(shL, shR);
  } else if (addon === 'oni_horns') {
    const hornGeo = new THREE.ConeGeometry(2.2, 11, 8);
    const hornL = new THREE.Mesh(hornGeo, visorMat);
    hornL.position.set(-4.2, 49, 2);
    hornL.rotation.set(0.35, 0, 0.35);
    const hornR = new THREE.Mesh(hornGeo, visorMat);
    hornR.position.set(4.2, 49, 2);
    hornR.rotation.set(0.35, 0, -0.35);
    group.add(hornL, hornR);
  } else if (addon === 'valkyrie_wings') {
    const wingHeadGeo = new THREE.BoxGeometry(1.2, 8, 12);
    const whL = new THREE.Mesh(wingHeadGeo, visorMat);
    whL.position.set(-6, 44, -2);
    whL.rotation.set(0.4, -0.2, 0.35);
    const whR = new THREE.Mesh(wingHeadGeo, visorMat);
    whR.position.set(6, 44, -2);
    whR.rotation.set(0.4, 0.2, -0.35);
    group.add(whL, whR);
  } else if (addon === 'samurai_katana') {
    // Kabuto V-Crest on Helmet
    const vGeo = new THREE.BoxGeometry(1.4, 10, 2.2);
    const vL = new THREE.Mesh(vGeo, visorMat);
    vL.position.set(-3.5, 49, 4.5);
    vL.rotation.z = 0.45;
    const vR = new THREE.Mesh(vGeo, visorMat);
    vR.position.set(3.5, 49, 4.5);
    vR.rotation.z = -0.45;
    group.add(vL, vR);

    // Glowing Cyber-Katana mounted diagonally across the back
    const katanaGroup = new THREE.Group();
    katanaGroup.position.set(0, 27, -6.5);
    katanaGroup.rotation.z = 0.65;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.2, 32, 0.5), visorMat);
    blade.position.y = 4;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.2, 2.5), armorMat);
    guard.position.y = -8;
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 8, 8), accentMat);
    hilt.position.y = -13;
    katanaGroup.add(blade, guard, hilt);
    group.add(katanaGroup);
  } else if (addon === 'void_rings') {
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(16, 1.1, 8, 28), visorMat);
    ring1.position.y = 26;
    ring1.rotation.x = Math.PI / 3;
    ring1.rotation.y = 0.4;
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(19, 0.9, 8, 28), accentMat);
    ring2.position.y = 26;
    ring2.rotation.x = -Math.PI / 3;
    ring2.rotation.y = -0.4;
    group.add(ring1, ring2);
  } else if (addon === 'emperor_crown') {
    // Floating Golden Crown above head + Solar Halo behind back
    const crownRing = new THREE.Mesh(new THREE.TorusGeometry(5.2, 1.0, 8, 20), visorMat);
    crownRing.rotation.x = Math.PI / 2;
    crownRing.position.y = 49.5;
    group.add(crownRing);

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4.5, 6), visorMat);
      spike.position.set(Math.cos(a) * 5.2, 52, Math.sin(a) * 5.2);
      group.add(spike);
    }

    const halo = new THREE.Mesh(new THREE.TorusGeometry(15, 1.2, 8, 32), visorMat);
    halo.position.set(0, 32, -7);
    group.add(halo);
  } else if (addon === 'mecha_wings') {
    // 6-Blade Spread Mecha Energy Wings on Back
    for (let side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(18, 3.2 - i * 0.5, 1.2), visorMat);
        wingBlade.position.set(side * (13 + i * 2), 34 - i * 5.5, -6.5);
        wingBlade.rotation.z = side * (0.35 - i * 0.22);
        wingBlade.rotation.y = -side * 0.25;
        group.add(wingBlade);
      }
    }
  }

  const skinKey = `${initialWeapon}|${cos.neonSkinId}|${cos.weaponSkinId}|${cos.charSkinId}`;

  return {
    group,
    legL,
    legR,
    armR,
    gunMesh: gun,
    weaponId: initialWeapon,
    skinKey,
    walkPhase: Math.random() * Math.PI * 2,
    lastX: 0,
    lastZ: 0
  };
}
