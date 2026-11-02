import { ZombieState, PlayerState } from '../../shared/types.js';
import { WallRect } from '../../shared/map.js';
import { resolveMovement } from './Collision.js';
import { SERVER_CONFIG } from '../../shared/constants.js';

export function updateZombie(
  zombie: ZombieState,
  players: PlayerState[],
  walls: WallRect[],
  dtSec: number
): void {
  // Find closest living player
  let bestTarget: PlayerState | null = null;
  let bestDistSq = Infinity;

  for (const player of players) {
    if (player.hp <= 0 && player.downed) {
      continue;
    }
    const dx = player.x - zombie.x;
    const dy = player.y - zombie.y;
    const distSq = dx * dx + dy * dy;
    if (distSq < bestDistSq) {
      bestDistSq = distSq;
      bestTarget = player;
    }
  }

  if (!bestTarget) {
    for (const player of players) {
      const dx = player.x - zombie.x;
      const dy = player.y - zombie.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestTarget = player;
      }
    }
  }

  if (!bestTarget) return;

  zombie.targetPlayerId = bestTarget.id;
  const targetDx = bestTarget.x - zombie.x;
  const targetDy = bestTarget.y - zombie.y;
  const targetDist = Math.sqrt(targetDx * targetDx + targetDy * targetDy) || 1;

  const moveX = (targetDx / targetDist) * zombie.speed * dtSec;
  const moveY = (targetDy / targetDist) * zombie.speed * dtSec;

  // Face target
  zombie.angle = Math.atan2(targetDy, targetDx);

  const resolved = resolveMovement(
    zombie.x,
    zombie.y,
    moveX,
    moveY,
    SERVER_CONFIG.ZOMBIE_RADIUS,
    walls
  );

  zombie.x = resolved.x;
  zombie.y = resolved.y;
}
