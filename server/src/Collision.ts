import { WallRect } from '../../shared/map.js';
export {
  circleOverlapsRect,
  resolveMovement,
  getFloorHeightAt,
  findTouchingWallNormal,
  lineLineIntersection,
  lineRectIntersection,
  lineSegmentCylinderIntersection,
  hasLineOfSight
} from '../../shared/collision.js';
import { resolveMovement } from '../../shared/collision.js';

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
  return resolveMovement(x, y, 0, 0, radius, walls, 0);
}
