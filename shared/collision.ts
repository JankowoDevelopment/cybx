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

// Axis-separated movement resolution (enables smooth sliding along walls & full W+A diagonal movement)
export function resolveMovement(
  currentX: number,
  currentY: number,
  deltaX: number,
  deltaY: number,
  radius: number,
  walls: WallRect[]
): { x: number; y: number } {
  let posX = currentX + deltaX;
  let posY = currentY;

  // Resolve X axis
  if (deltaX !== 0) {
    for (const wall of walls) {
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
    for (const wall of walls) {
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
  // Fast AABB rejection before line-segment math
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
 * Fast 2D Line-of-Sight check against interior walls (skips outer perimeter walls).
 * Returns true if there is a clear line of sight between (x1, y1) and (x2, y2).
 */
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

