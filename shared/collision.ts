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
 * Returns the highest walkable floor height directly below or intersecting the player's circle.
 */
export function getFloorHeightAt(x: number, y: number, radius: number, walls: WallRect[]): number {
  let highest = 0;
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    if (w.isWalkableTop && w.maxZ !== undefined) {
      if (circleOverlapsRect(x, y, radius, w.x, w.y, w.w, w.h)) {
        if (w.maxZ > highest) highest = w.maxZ;
      }
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
      // If player is on or above the top surface of this block, horizontal collision is ignored
      if (currentZ >= wallMaxZ - 2) continue;

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
      if (currentZ >= wallMaxZ - 2) continue;

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

export function hasLineOfSight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  walls: WallRect[]
): boolean {
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    if (w.isPerimeter) continue;
    if (lineRectIntersection(x1, y1, x2, y2, w.x, w.y, w.w, w.h)) {
      return false;
    }
  }
  return true;
}
