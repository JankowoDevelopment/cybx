import * as THREE from 'three';
import { WeaponType } from '@shared/types.js';
import { PlayerCosmetics, DEFAULT_COSMETICS, getNeonSkin, getCharacterSkin } from '@shared/skins.js';
import { create3DWeaponMesh } from './doomWeapon.js';

export interface CyberCharacter3D {
  group: THREE.Group;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  armR: THREE.Group;
  armL: THREE.Group;
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

  const group = new THREE.Group();

  const neonColor = new THREE.Color(neonSkin.colorHex || fallbackColorHex || '#38bdf8');
  const armorColor = new THREE.Color(charSkin.armorHex || '#1e293b');
  const secondaryColor = new THREE.Color(charSkin.secondaryArmorHex || '#334155');
  const visorColor = new THREE.Color(charSkin.visorHex || neonSkin.colorHex || '#38bdf8');

  // Balanced PBR materials: metalness 0.35-0.45 preserves 65% diffuse color so skins are 100% visible!
  const armorMat = new THREE.MeshStandardMaterial({
    color: armorColor,
    roughness: 0.32,
    metalness: 0.38,
    envMapIntensity: 1.4
  });

  const secondaryMat = new THREE.MeshStandardMaterial({
    color: secondaryColor,
    roughness: 0.28,
    metalness: 0.45,
    envMapIntensity: 1.5
  });

  const neonMat = new THREE.MeshStandardMaterial({
    color: neonColor,
    emissive: neonColor,
    emissiveIntensity: 0.55,
    roughness: 0.22,
    metalness: 0.35,
    envMapIntensity: 1.8
  });

  const visorMat = new THREE.MeshBasicMaterial({
    color: visorColor.clone().multiplyScalar(1.6)
  });

  // 1. Torso & Heavy Armor Chestplate
  const torso = new THREE.Mesh(new THREE.BoxGeometry(16, 18, 10), armorMat);
  torso.position.y = 25;
  torso.castShadow = true;
  group.add(torso);

  // Secondary Color Chest Armor Plate
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(13.5, 14, 2), secondaryMat);
  chestPlate.position.set(0, 26, 5.2);
  group.add(chestPlate);

  // Glowing Neon Reactor Core
  const chestCore = new THREE.Mesh(new THREE.BoxGeometry(6.5, 6.5, 1.8), neonMat);
  chestCore.position.set(0, 26, 6);
  group.add(chestCore);

  // 2. Helmet + Glowing Visor + Crest
  const head = new THREE.Mesh(new THREE.BoxGeometry(10, 10, 10), armorMat);
  head.position.y = 40;
  head.castShadow = true;

  const visor = new THREE.Mesh(new THREE.BoxGeometry(9.4, 3.4, 10.5), visorMat);
  visor.position.set(0, 40.5, 0.3);

  const crest = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.8, 11), secondaryMat);
  crest.position.set(0, 45.6, 0);
  const crestTrim = new THREE.Mesh(new THREE.BoxGeometry(1.4, 3.2, 11.2), neonMat);
  crestTrim.position.set(0, 45.8, 0);
  group.add(head, visor, crest, crestTrim);

  // Optional X-Ray Wallhack Overlay for Arena PvP
  if (enableXRay) {
    const xrayMat = new THREE.MeshBasicMaterial({
      color: neonColor,
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

  // 3. Heavy Shoulder Pauldrons (Secondary armor color with neon glow accents)
  const padGeo = new THREE.BoxGeometry(6.5, 7.5, 11.5);
  const padL = new THREE.Mesh(padGeo, secondaryMat);
  padL.position.set(-11.5, 31, 0);
  const padR = new THREE.Mesh(padGeo, secondaryMat);
  padR.position.set(11.5, 31, 0);

  const padTrimL = new THREE.Mesh(new THREE.BoxGeometry(6.7, 1.8, 11.7), neonMat);
  padTrimL.position.set(-11.5, 33.8, 0);
  const padTrimR = new THREE.Mesh(new THREE.BoxGeometry(6.7, 1.8, 11.7), neonMat);
  padTrimR.position.set(11.5, 33.8, 0);
  group.add(padL, padR, padTrimL, padTrimR);

  // 4. Legs (Main armor color with secondary kneepads and neon boot trim)
  const legGeo = new THREE.BoxGeometry(5.6, 16, 6.2);
  const legL = new THREE.Mesh(legGeo, armorMat);
  legL.position.set(-4.5, 8, 0);
  legL.castShadow = true;
  const legR = new THREE.Mesh(legGeo, armorMat);
  legR.position.set(4.5, 8, 0);
  legR.castShadow = true;

  const kneeL = new THREE.Mesh(new THREE.BoxGeometry(5.8, 4.2, 2.5), secondaryMat);
  kneeL.position.set(-4.5, 8.5, 3.2);
  const kneeR = new THREE.Mesh(new THREE.BoxGeometry(5.8, 4.2, 2.5), secondaryMat);
  kneeR.position.set(4.5, 8.5, 3.2);

  const bootStripeL = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.8, 6.4), neonMat);
  bootStripeL.position.set(-4.5, 2.5, 0);
  const bootStripeR = new THREE.Mesh(new THREE.BoxGeometry(5.8, 1.8, 6.4), neonMat);
  bootStripeR.position.set(4.5, 2.5, 0);
  group.add(legL, legR, kneeL, kneeR, bootStripeL, bootStripeR);

  // 5. Heroic Two-Handed Weapon Showcase Stance
  const armGeo = new THREE.BoxGeometry(4.6, 14, 4.6);

  // Group for the 3D Weapon (Scaled 1.65x and held in front of chest)
  const gunGroup = new THREE.Group();
  gunGroup.position.set(1.2, 23.5, 11.5);
  gunGroup.rotation.set(-0.06, Math.PI - 0.42, 0.14);

  const gun = create3DWeaponMesh(initialWeapon, cos.weaponSkinId, cos.neonSkinId);
  gun.scale.set(1.65, 1.65, 1.65);
  gunGroup.add(gun);
  group.add(gunGroup);

  // Right Arm (Holding Grip)
  const armR = new THREE.Group();
  armR.position.set(11, 28, 0);
  const armRMesh = new THREE.Mesh(armGeo, armorMat);
  armRMesh.rotation.set(Math.PI * 0.40, 0.16, -0.42);
  armRMesh.position.set(-2.5, -4.2, 5.2);
  armR.add(armRMesh);
  group.add(armR);

  // Left Arm (Supporting Barrel / Handguard)
  const armL = new THREE.Group();
  armL.position.set(-11, 28, 0);
  const armLMesh = new THREE.Mesh(armGeo, armorMat);
  armLMesh.rotation.set(Math.PI * 0.46, -0.22, 0.48);
  armLMesh.position.set(3.2, -4.2, 5.5);
  armL.add(armLMesh);
  group.add(armL);

  // 6. Unique 3D Character Skin Addons
  const addon = charSkin.addon;
  if (addon === 'antenna') {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 12, 8), secondaryMat);
    rod.position.set(-4.5, 50, -2);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(1.6, 8, 8), visorMat);
    tip.position.set(-4.5, 56.5, -2);
    group.add(rod, tip);
  } else if (addon === 'visor_tac') {
    for (const ox of [-2.4, 2.4]) {
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 4.2, 10), visorMat);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(ox, 41, 6.4);
      group.add(lens);
    }
  } else if (addon === 'shoulder_shield') {
    const shGeo = new THREE.BoxGeometry(2.6, 13, 15);
    const shL = new THREE.Mesh(shGeo, secondaryMat);
    shL.position.set(-15.5, 32, 0);
    shL.rotation.z = 0.25;
    const shR = new THREE.Mesh(shGeo, secondaryMat);
    shR.position.set(15.5, 32, 0);
    shR.rotation.z = -0.25;
    group.add(shL, shR);
  } else if (addon === 'oni_horns') {
    const hornGeo = new THREE.ConeGeometry(2.5, 13, 8);
    const hornL = new THREE.Mesh(hornGeo, visorMat);
    hornL.position.set(-4.2, 49.5, 2.5);
    hornL.rotation.set(0.35, 0, 0.35);
    const hornR = new THREE.Mesh(hornGeo, visorMat);
    hornR.position.set(4.2, 49.5, 2.5);
    hornR.rotation.set(0.35, 0, -0.35);
    group.add(hornL, hornR);
  } else if (addon === 'valkyrie_wings') {
    const wingHeadGeo = new THREE.BoxGeometry(1.4, 9, 14);
    const whL = new THREE.Mesh(wingHeadGeo, visorMat);
    whL.position.set(-6.5, 44, -2);
    whL.rotation.set(0.4, -0.2, 0.35);
    const whR = new THREE.Mesh(wingHeadGeo, visorMat);
    whR.position.set(6.5, 44, -2);
    whR.rotation.set(0.4, 0.2, -0.35);
    group.add(whL, whR);
  } else if (addon === 'samurai_katana') {
    // Kabuto V-Crest on Helmet
    const vGeo = new THREE.BoxGeometry(1.6, 11, 2.4);
    const vL = new THREE.Mesh(vGeo, secondaryMat);
    vL.position.set(-3.5, 49.5, 4.5);
    vL.rotation.z = 0.45;
    const vR = new THREE.Mesh(vGeo, secondaryMat);
    vR.position.set(3.5, 49.5, 4.5);
    vR.rotation.z = -0.45;
    group.add(vL, vR);

    // Glowing Cyber-Katana mounted diagonally across the back
    const katanaGroup = new THREE.Group();
    katanaGroup.position.set(0, 27, -6.8);
    katanaGroup.rotation.z = 0.65;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.4, 34, 0.6), visorMat);
    blade.position.y = 5;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.4, 2.6), secondaryMat);
    guard.position.y = -8;
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 9, 8), neonMat);
    hilt.position.y = -13.5;
    katanaGroup.add(blade, guard, hilt);
    group.add(katanaGroup);
  } else if (addon === 'void_rings') {
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(18, 1.2, 8, 32), visorMat);
    ring1.position.y = 26;
    ring1.rotation.x = Math.PI / 3;
    ring1.rotation.y = 0.4;
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(21, 1.0, 8, 32), secondaryMat);
    ring2.position.y = 26;
    ring2.rotation.x = -Math.PI / 3;
    ring2.rotation.y = -0.4;
    group.add(ring1, ring2);
  } else if (addon === 'emperor_crown') {
    // Floating Golden Crown above head + Solar Halo behind back
    const crownRing = new THREE.Mesh(new THREE.TorusGeometry(5.6, 1.1, 8, 24), secondaryMat);
    crownRing.rotation.x = Math.PI / 2;
    crownRing.position.y = 50;
    group.add(crownRing);

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spike = new THREE.Mesh(new THREE.ConeGeometry(1.3, 5, 6), visorMat);
      spike.position.set(Math.cos(a) * 5.6, 53, Math.sin(a) * 5.6);
      group.add(spike);
    }

    const halo = new THREE.Mesh(new THREE.TorusGeometry(16, 1.4, 8, 32), secondaryMat);
    halo.position.set(0, 32, -7.5);
    group.add(halo);
  } else if (addon === 'mecha_wings') {
    // 6-Blade Spread Mecha Energy Wings on Back
    for (let side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(20, 3.4 - i * 0.5, 1.3), visorMat);
        wingBlade.position.set(side * (14 + i * 2.2), 35 - i * 5.8, -7);
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
    armL,
    gunMesh: gun,
    weaponId: initialWeapon,
    skinKey,
    walkPhase: Math.random() * Math.PI * 2,
    lastX: 0,
    lastZ: 0
  };
}
