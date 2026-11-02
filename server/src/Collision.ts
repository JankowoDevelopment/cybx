import { WallRect } from '../../shared/map.js';
export { circleOverlapsRect, resolveMovement } from '../../shared/collision.js';
import { circleOverlapsRect, resolveMovement } from '../../shared/collision.js';

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
  if (x1 >= rx && x1 <= rx + rw && y1 >= ry && y1 <= ry + rh) return true;
  if (x2 >= rx && x2 <= rx + rw && y2 >= ry && y2 <= ry + rh) return true;

  return (
    lineLineIntersection(x1, y1, x2, y2, rx, ry, rx + rw, ry) ||
    lineLineIntersection(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh) ||
    lineLineIntersection(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh) ||
    lineLineIntersection(x1, y1, x2, y2, rx, ry, rx, ry + rh)
  );
}

function lineLineIntersection(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
): boolean {
  const uA =
    ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) /
    ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
  const uB =
    ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) /
    ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));

  return uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1;
}

export function lineSegmentCircleIntersection(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cx: number,
  cy: number,
  radius: number
): { hit: boolean; hitX: number; hitY: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    const distSq = (x1 - cx) ** 2 + (y1 - cy) ** 2;
    return { hit: distSq <= radius * radius, hitX: x1, hitY: y1 };
  }

  let t = ((cx - x1) * dx + (cy - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = x1 + t * dx;
  const closestY = y1 + t * dy;
  const distSq = (closestX - cx) ** 2 + (closestY - cy) ** 2;

  if (distSq <= radius * radius) {
    return { hit: true, hitX: closestX, hitY: closestY };
  }

  return { hit: false, hitX: x2, hitY: y2 };
}

// Fallback for zombies or static pushing
export function resolveWallCollisions(
  x: number,
  y: number,
  radius: number,
  walls: WallRect[]
): { x: number; y: number } {
  return resolveMovement(x, y, 0, 0, radius, walls);
}
