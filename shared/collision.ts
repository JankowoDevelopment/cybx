import { WallRect } from './map.js';

export function circleOverlapsRect(
  cx: number,
  cy: number,
  radius: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < radius * radius;
}

/**
 * Returns the highest walkable floor height directly below or supporting the player.
 * Checks that the surface is at or below the player's feet (with a step allowance)
 * so that high walls or blocks do not suddenly snatch the player from the ground.
 * Every interior wall, pillar, crate, and barrier on the map has a walkable top.
 */
export function getFloorHeightAt(
  x: number,
  y: number,
  radius: number,
  walls: WallRect[],
  currentZ: number = 0
): number {
  let highest = 0;
  const footRadius = Math.min(14, radius);
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    if (w.isPerimeter) continue;
    const wallMaxZ = w.maxZ !== undefined ? w.maxZ : 140;
    if (currentZ < wallMaxZ - 12) continue;
    if (circleOverlapsRect(x, y, footRadius, w.x, w.y, w.w, w.h)) {
      if (wallMaxZ > highest) highest = wallMaxZ;
    }
  }
  return highest;
}

// Axis-separated movement resolution (enables smooth sliding along walls & full W+A diagonal movement, stepping onto platforms)
export function resolveMovement(
  currentX: number,
  currentY: number,
  deltaX: number,
  deltaY: number,
  radius: number,
  walls: WallRect[],
  currentZ: number = 0
): { x: number; y: number } {
  let posX = currentX + deltaX;
  let posY = currentY;

  // Resolve X axis
  if (deltaX !== 0) {
    for (let i = 0; i < walls.length; i++) {
      const wall = walls[i];
      const wallMaxZ = wall.maxZ !== undefined ? wall.maxZ : 140;
      // If player is on or above the top surface of this wall, horizontal collision is ignored
      if (!wall.isPerimeter && currentZ >= wallMaxZ - 6) continue;

      if (circleOverlapsRect(posX, posY, radius, wall.x, wall.y, wall.w, wall.h)) {
        if (deltaX > 0) {
          posX = wall.x - radius;
        } else {
          posX = wall.x + wall.w + radius;
        }
      }
    }
  }

  // Now resolve Y axis with the updated posX
  posY = currentY + deltaY;
  if (deltaY !== 0) {
    for (let i = 0; i < walls.length; i++) {
      const wall = walls[i];
      const wallMaxZ = wall.maxZ !== undefined ? wall.maxZ : 140;
      if (!wall.isPerimeter && currentZ >= wallMaxZ - 6) continue;

      if (circleOverlapsRect(posX, posY, radius, wall.x, wall.y, wall.w, wall.h)) {
        if (deltaY > 0) {
          posY = wall.y - radius;
        } else {
          posY = wall.y + wall.h + radius;
        }
      }
    }
  }

  return { x: posX, y: posY };
}

/**
 * Checks if an airborne player is touching or brushing against a vertical wall face,
 * and returns the outward normal pointing away from the wall for wall-jumping.
 */
export function findTouchingWallNormal(
  x: number,
  y: number,
  currentZ: number,
  radius: number,
  walls: WallRect[]
): { touching: boolean; nx: number; ny: number } {
  const checkRadius = radius + 8;
  for (let i = 0; i < walls.length; i++) {
    const wall = walls[i];
    const wallMaxZ = wall.maxZ !== undefined ? wall.maxZ : 140;
    // Player must be alongside the vertical face of the wall (not already standing on top)
    if (currentZ < wallMaxZ - 6) {
      if (circleOverlapsRect(x, y, checkRadius, wall.x, wall.y, wall.w, wall.h)) {
        const closestX = Math.max(wall.x, Math.min(x, wall.x + wall.w));
        const closestY = Math.max(wall.y, Math.min(y, wall.y + wall.h));
        const dx = x - closestX;
        const dy = y - closestY;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.001) {
          return { touching: true, nx: dx / dist, ny: dy / dist };
        } else {
          return { touching: true, nx: 0, ny: 1 };
        }
      }
    }
  }
  return { touching: false, nx: 0, ny: 0 };
}

export function lineLineIntersection(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
): boolean {
  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom === 0) return false;
  const uA = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  if (uA < 0 || uA > 1) return false;
  const uB = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
  return uB >= 0 && uB <= 1;
}

export function lineRectIntersection(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  const minX = x1 < x2 ? x1 : x2;
  const maxX = x1 > x2 ? x1 : x2;
  if (maxX < rx || minX > rx + rw) return false;

  const minY = y1 < y2 ? y1 : y2;
  const maxY = y1 > y2 ? y1 : y2;
  if (maxY < ry || minY > ry + rh) return false;

  if (x1 >= rx && x1 <= rx + rw && y1 >= ry && y1 <= ry + rh) return true;
  if (x2 >= rx && x2 <= rx + rw && y2 >= ry && y2 <= ry + rh) return true;

  return (
    lineLineIntersection(x1, y1, x2, y2, rx, ry, rx + rw, ry) ||
    lineLineIntersection(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh) ||
    lineLineIntersection(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh) ||
    lineLineIntersection(x1, y1, x2, y2, rx, ry, rx, ry + rh)
  );
}

/**
 * 3D Line segment vs Vertical Cylinder intersection.
 * Returns true if the 3D ray segment hits the player's cylinder and determines headshot accuracy!
 */
export function lineSegmentCylinderIntersection(
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number,
  cx: number, cy: number, baseZ: number,
  radius: number, height: number
): { hit: boolean; hitX: number; hitY: number; hitZ: number; isHeadshot: boolean } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  const lenSq = dx * dx + dy * dy;

  let t = 0;
  if (lenSq > 0.0001) {
    t = Math.max(0, Math.min(1, ((cx - x1) * dx + (cy - y1) * dy) / lenSq));
  }

  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  const distSq = (closestX - cx) ** 2 + (closestY - cy) ** 2;

  if (distSq > radius * radius) {
    return { hit: false, hitX: 0, hitY: 0, hitZ: 0, isHeadshot: false };
  }

  const bulletZ = z1 + t * dz;
  if (bulletZ < baseZ - 4 || bulletZ > baseZ + height + 4) {
    return { hit: false, hitX: 0, hitY: 0, hitZ: 0, isHeadshot: false };
  }

  const isHeadshot = bulletZ >= baseZ + height * 0.72;
  return { hit: true, hitX: closestX, hitY: closestY, hitZ: bulletZ, isHeadshot };
}

/**
 * Accurate 3D Line Segment vs Axis-Aligned 3D Box (AABB) intersection.
 * Checks whether a 3D ray segment actually hits the solid volume of a wall or block,
 * correctly allowing bullets to pass cleanly over the top or under elevated structures.
 */
export function lineSegmentAABBIntersection(
  x1: number, y1: number, z1: number,
  x2: number, y2: number, z2: number,
  minX: number, minY: number, minZ: number,
  maxX: number, maxY: number, maxZ: number
): { hit: boolean; hitX: number; hitY: number; hitZ: number; normalX: number; normalY: number } {
  // 1. Trivial rejection: if both ends are on the same side outside the box
  if (Math.min(x1, x2) > maxX || Math.max(x1, x2) < minX) return { hit: false, hitX: 0, hitY: 0, hitZ: 0, normalX: 0, normalY: 0 };
  if (Math.min(y1, y2) > maxY || Math.max(y1, y2) < minY) return { hit: false, hitX: 0, hitY: 0, hitZ: 0, normalX: 0, normalY: 0 };
  if (Math.min(z1, z2) > maxZ || Math.max(z1, z2) < minZ) return { hit: false, hitX: 0, hitY: 0, hitZ: 0, normalX: 0, normalY: 0 };

  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;

  let tMin = 0;
  let tMax = 1;
  let normX = 0;
  let normY = 0;

  // X slab
  if (Math.abs(dx) > 1e-6) {
    let t1 = (minX - x1) / dx;
    let t2 = (maxX - x1) / dx;
    let n1 = -1;
    let n2 = 1;
    if (t1 > t2) {
      const tempT = t1; t1 = t2; t2 = tempT;
      const tempN = n1; n1 = n2; n2 = tempN;
    }
    if (t1 > tMin) {
      tMin = t1;
      normX = n1;
      normY = 0;
    }
    if (t2 < tMax) tMax = t2;
    if (tMin > tMax) return { hit: false, hitX: 0, hitY: 0, hitZ: 0, normalX: 0, normalY: 0 };
  } else {
    if (x1 < minX || x1 > maxX) return { hit: false, hitX: 0, hitY: 0, hitZ: 0, normalX: 0, normalY: 0 };
  }

  // Y slab
  if (Math.abs(dy) > 1e-6) {
    let t1 = (minY - y1) / dy;
    let t2 = (maxY - y1) / dy;
    let n1 = -1;
    let n2 = 1;
    if (t1 > t2) {
      const tempT = t1; t1 = t2; t2 = tempT;
      const tempN = n1; n1 = n2; n2 = tempN;
    }
    if (t1 > tMin) {
      tMin = t1;
      normX = 0;
      normY = n1;
    }
    if (t2 < tMax) tMax = t2;
    if (tMin > tMax) return { hit: false, hitX: 0, hitY: 0, hitZ: 0, normalX: 0, normalY: 0 };
  } else {
    if (y1 < minY || y1 > maxY) return { hit: false, hitX: 0, hitY: 0, hitZ: 0, normalX: 0, normalY: 0 };
  }

  // Z slab
  if (Math.abs(dz) > 1e-6) {
    let t1 = (minZ - z1) / dz;
    let t2 = (maxZ - z1) / dz;
    if (t1 > t2) {
      const temp = t1; t1 = t2; t2 = temp;
    }
    if (t1 > tMin) {
      tMin = t1;
      normX = 0;
      normY = 0;
    }
    if (t2 < tMax) tMax = t2;
    if (tMin > tMax) return { hit: false, hitX: 0, hitY: 0, hitZ: 0, normalX: 0, normalY: 0 };
  } else {
    if (z1 < minZ || z1 > maxZ) return { hit: false, hitX: 0, hitY: 0, hitZ: 0, normalX: 0, normalY: 0 };
  }

  // If start point is strictly inside the box volume
  if (x1 >= minX && x1 <= maxX && y1 >= minY && y1 <= maxY && z1 >= minZ && z1 <= maxZ) {
    return { hit: true, hitX: x1, hitY: y1, hitZ: z1, normalX: normX, normalY: normY };
  }

  if (tMin >= 0 && tMin <= 1) {
    return {
      hit: true,
      hitX: x1 + tMin * dx,
      hitY: y1 + tMin * dy,
      hitZ: z1 + tMin * dz,
      normalX: normX,
      normalY: normY
    };
  }

  return { hit: false, hitX: 0, hitY: 0, hitZ: 0, normalX: 0, normalY: 0 };
}

export function hasLineOfSight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  walls: WallRect[],
  z1: number = 34,
  z2: number = 34
): boolean {
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    if (w.isPerimeter) continue;
    const wallMaxZ = w.maxZ !== undefined ? w.maxZ : 140;
    const wallMinZ = w.minZ !== undefined ? w.minZ : 0;

    // If both ends are higher than the wall, line of sight is clear
    if (Math.min(z1, z2) >= wallMaxZ) continue;
    // If both ends are below an elevated structure, line of sight is clear
    if (Math.max(z1, z2) <= wallMinZ) continue;

    // The target object cannot be occluded by its own volume or the block it rests on
    if (x2 >= w.x - 2 && x2 <= w.x + w.w + 2 && y2 >= w.y - 2 && y2 <= w.y + w.h + 2) {
      continue;
    }

    // The player's camera cannot be occluded by the block/crate they are standing on
    if (x1 >= w.x - 2 && x1 <= w.x + w.w + 2 && y1 >= w.y - 2 && y1 <= w.y + w.h + 2) {
      continue;
    }

    const aabb = lineSegmentAABBIntersection(
      x1, y1, z1,
      x2, y2, z2,
      w.x, w.y, wallMinZ,
      w.x + w.w, w.y + w.h, wallMaxZ
    );

    if (aabb.hit) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq > 0.01) {
        const hitT = ((aabb.hitX - x1) * dx + (aabb.hitY - y1) * dy) / lenSq;
        // Occlusion only occurs if the wall is an actual intermediate obstacle
        if (hitT > 0.03 && hitT < 0.97) {
          return false;
        }
      } else {
        return false;
      }
    }
  }
  return true;
}
