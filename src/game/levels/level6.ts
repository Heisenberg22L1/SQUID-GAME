import { COLLECTIBLE_SPRITES, drawSprite, drawStageBackdrop, getCachedImage, VFX_SPRITES } from '../assets';
import { drawContender, drawMaskedGuard, type LevelContext } from '../levelContext';
import { getDifficultyConfig, getStageForLevel } from '../rules';
import type { InputState, LevelEngine } from '../types';

interface WallRect {
  x: number; // normalized 0..1 of arena
  y: number;
  w: number;
  h: number;
}

interface MirrorDoor {
  x: number;
  y: number;
  w: number;
  h: number;
  isDecoy: boolean;
  revealed: boolean;
}

interface GuardEntity {
  id: string;
  policy: 'patrol' | 'chaser' | 'turret';
  shape: 'circle' | 'triangle' | 'square';
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  patrolX: number;
  patrolY: number;
  patrolForward: boolean;
  angle: number;
  sightRange: number;
  sightHalfAngle: number;
  alertTimer: number;
  chasing: boolean;
  walkPhase: number;
  laserPhase: number;
}

interface KeyPickup {
  x: number;
  y: number;
  collected: boolean;
}

export function createLevel6(ctx: LevelContext): LevelEngine {
  const cfg = getDifficultyConfig(ctx.difficulty);
  const lid = ctx.levelId;
  const isMirror = lid === 19;
  const isBlackout = lid === 25;
  const isDarkness = lid === 35;
  const isFinalMaze = lid === 47;

  const maxHp = (isFinalMaze ? 3 : 3) + cfg.maxHpBonus;
  let hp = maxHp;
  const baseTime = isFinalMaze ? 70 : isMirror ? 60 : 65;
  let timeLeft = Math.round(baseTime * cfg.timeMult);

  let px = 0.09;
  let py = 0.86;
  let walkPhase = 0;
  let hitFlash = 0;
  let invulnTimer = 0;
  let dashTimer = 0;
  let dashCooldown = 0;
  let dashDirX = 0;
  let dashDirY = -1;
  let ended = false;
  let animTime = 0;

  // Interior walls tailored per maze variant
  const walls: WallRect[] = isMirror
    ? [
        { x: 0.28, y: 0.02, w: 0.035, h: 0.24 },
        { x: 0.28, y: 0.42, w: 0.035, h: 0.20 },
        { x: 0.28, y: 0.78, w: 0.035, h: 0.20 },
        { x: 0.62, y: 0.02, w: 0.035, h: 0.24 },
        { x: 0.62, y: 0.42, w: 0.035, h: 0.20 },
        { x: 0.62, y: 0.78, w: 0.035, h: 0.20 },
      ]
    : isFinalMaze
    ? [
        { x: 0.20, y: 0.56, w: 0.035, h: 0.30 },
        { x: 0.20, y: 0.12, w: 0.035, h: 0.28 },
        { x: 0.42, y: 0.26, w: 0.035, h: 0.48 },
        { x: 0.62, y: 0.10, w: 0.035, h: 0.34 },
        { x: 0.62, y: 0.58, w: 0.035, h: 0.30 },
        { x: 0.80, y: 0.30, w: 0.035, h: 0.38 },
      ]
    : [
        { x: 0.22, y: 0.62, w: 0.04, h: 0.26 },
        { x: 0.22, y: 0.14, w: 0.04, h: 0.30 },
        { x: 0.48, y: 0.34, w: 0.04, h: 0.42 },
        { x: 0.72, y: 0.14, w: 0.04, h: 0.32 },
        { x: 0.72, y: 0.62, w: 0.04, h: 0.24 },
      ];

  // Mirror Hall decoy vs real glowing portals in wall gaps
  const mirrorDoors: MirrorDoor[] = isMirror
    ? (() => {
        const topDecoy = Math.random() < 0.5;
        const rightDecoy = Math.random() < 0.5;
        return [
          { x: 0.28, y: 0.26, w: 0.035, h: 0.16, isDecoy: topDecoy, revealed: false },
          { x: 0.28, y: 0.62, w: 0.035, h: 0.16, isDecoy: !topDecoy, revealed: false },
          { x: 0.62, y: 0.26, w: 0.035, h: 0.16, isDecoy: rightDecoy, revealed: false },
          { x: 0.62, y: 0.62, w: 0.035, h: 0.16, isDecoy: !rightDecoy, revealed: false },
        ];
      })()
    : [];

  const keys: KeyPickup[] = isFinalMaze
    ? [
        { x: 0.11, y: 0.16, collected: false },
        { x: 0.52, y: 0.84, collected: false },
        { x: 0.71, y: 0.20, collected: false },
      ]
    : isMirror
    ? [
        { x: 0.46, y: 0.16, collected: false },
        { x: 0.46, y: 0.84, collected: false },
      ]
    : [
        { x: 0.12, y: 0.18, collected: false },
        { x: 0.60, y: 0.82, collected: false },
      ];

  const totalKeys = keys.length;
  const exitZone = { x: 0.90, y: 0.16, r: 0.065 };

  const guards: GuardEntity[] = [
    {
      id: 'g-patrol',
      policy: 'patrol',
      shape: 'circle',
      x: 0.35,
      y: 0.78,
      homeX: 0.35,
      homeY: 0.20,
      patrolX: 0.35,
      patrolY: 0.82,
      patrolForward: false,
      angle: -Math.PI / 2,
      sightRange: isBlackout ? 0.25 : 0.20,
      sightHalfAngle: isBlackout ? 0.52 : 0.42,
      alertTimer: 0,
      chasing: false,
      walkPhase: 0,
      laserPhase: 0,
    },
    {
      id: 'g-chaser',
      policy: 'chaser',
      shape: 'triangle',
      x: 0.54,
      y: 0.38,
      homeX: 0.54,
      homeY: 0.20,
      patrolX: 0.54,
      patrolY: 0.68,
      patrolForward: true,
      angle: Math.PI / 2,
      sightRange: isFinalMaze ? 0.27 : 0.23,
      sightHalfAngle: 0.5,
      alertTimer: 0,
      chasing: false,
      walkPhase: 1.2,
      laserPhase: 0,
    },
    {
      id: 'g-turret',
      policy: 'turret',
      shape: 'square',
      x: 0.84,
      y: 0.52,
      homeX: 0.84,
      homeY: 0.52,
      patrolX: 0.84,
      patrolY: 0.52,
      patrolForward: true,
      angle: Math.PI,
      sightRange: isFinalMaze ? 0.27 : 0.24,
      sightHalfAngle: 0.24,
      alertTimer: 0,
      chasing: false,
      walkPhase: 0,
      laserPhase: 0,
    },
  ];

  if (isBlackout || isDarkness || isFinalMaze) {
    guards.push({
      id: 'g-patrol-2',
      policy: isFinalMaze ? 'chaser' : 'patrol',
      shape: 'triangle',
      x: 0.72,
      y: 0.78,
      homeX: 0.72,
      homeY: 0.28,
      patrolX: 0.72,
      patrolY: 0.82,
      patrolForward: false,
      angle: -Math.PI / 2,
      sightRange: 0.23,
      sightHalfAngle: 0.46,
      alertTimer: 0,
      chasing: false,
      walkPhase: 0.6,
      laserPhase: 0,
    });
  }

  const getArenaBounds = (width: number, height: number) => {
    const padX = Math.max(18, width * 0.05);
    const padTop = Math.max(66, height * 0.13);
    const padBot = Math.max(24, height * 0.08);
    return {
      ax: padX,
      ay: padTop,
      aw: width - padX * 2,
      ah: height - padTop - padBot,
    };
  };

  const collidesWithWall = (nx: number, ny: number, rNorm: number, checkMirrors = false) => {
    if (nx < rNorm || nx > 1 - rNorm || ny < rNorm || ny > 1 - rNorm) return true;
    for (const w of walls) {
      const cx = Math.max(w.x, Math.min(nx, w.x + w.w));
      const cy = Math.max(w.y, Math.min(ny, w.y + w.h));
      if (Math.hypot(nx - cx, ny - cy) < rNorm) return true;
    }
    if (checkMirrors) {
      for (const md of mirrorDoors) {
        if (!md.isDecoy) continue;
        const cx = Math.max(md.x, Math.min(nx, md.x + md.w));
        const cy = Math.max(md.y, Math.min(ny, md.y + md.h));
        if (Math.hypot(nx - cx, ny - cy) < rNorm) {
          md.revealed = true;
          return true;
        }
      }
    }
    return false;
  };

  const itemNoun = isBlackout ? 'DRIVES' : isDarkness ? 'CELLS' : 'KEYS';

  const pushHud = () => {
    const collectedCount = keys.filter((k) => k.collected).length;
    ctx.updateHud({
      hp,
      maxHp,
      timeLeft: Math.ceil(timeLeft),
      score: collectedCount * 350 + Math.ceil(timeLeft) * 15,
      progressLabel: `${itemNoun} ${collectedCount}/${totalKeys}`,
      progressValue: collectedCount / totalKeys,
      statusBanner:
        collectedCount < totalKeys
          ? isMirror
            ? `SPOT EMERALD SHIMMER · ${collectedCount}/${totalKeys}`
            : `COLLECT ${itemNoun} (${collectedCount}/${totalKeys})`
          : 'EXIT UNLOCKED · REACH GREEN PORTAL',
      statusTone: collectedCount === totalKeys ? 'safe' : 'gold',
    });
  };

  pushHud();

  return {
    update(dt: number, simDt: number, input: InputState, width: number, height: number) {
      if (ended) return;
      animTime += simDt;
      timeLeft = Math.max(0, timeLeft - simDt);
      if (hitFlash > 0) hitFlash = Math.max(0, hitFlash - dt);
      if (invulnTimer > 0) invulnTimer = Math.max(0, invulnTimer - simDt);
      if (dashCooldown > 0) dashCooldown = Math.max(0, dashCooldown - simDt);

      if ((input.justPrimary || input.justSecondary) && dashCooldown <= 0 && dashTimer <= 0) {
        dashTimer = 0.18;
        dashCooldown = 1.05;
        if (Math.hypot(input.moveX, input.moveY) > 0.15) {
          const len = Math.hypot(input.moveX, input.moveY);
          dashDirX = input.moveX / len;
          dashDirY = input.moveY / len;
        }
        ctx.audio.step();
      }

      let vx = input.moveX * 0.255;
      let vy = input.moveY * 0.305;
      if (Math.hypot(input.moveX, input.moveY) > 0.15) {
        const len = Math.hypot(input.moveX, input.moveY);
        dashDirX = input.moveX / len;
        dashDirY = input.moveY / len;
      }

      if (dashTimer > 0) {
        dashTimer -= simDt;
        vx = dashDirX * 0.62;
        vy = dashDirY * 0.68;
      }

      const { ax, ay, aw, ah } = getArenaBounds(width, height);
      const rNorm = 0.023;
      let hitMirrorDecoy = false;

      if (vx !== 0 || vy !== 0) {
        const nextX = px + vx * simDt;
        if (!collidesWithWall(nextX, py, rNorm, isMirror)) {
          px = nextX;
        } else if (isMirror) {
          for (const md of mirrorDoors) {
            if (md.isDecoy && md.revealed) {
              const cx = Math.max(md.x, Math.min(nextX, md.x + md.w));
              const cy = Math.max(md.y, Math.min(py, md.y + md.h));
              if (Math.hypot(nextX - cx, py - cy) < rNorm) hitMirrorDecoy = true;
            }
          }
        }
        const nextY = py + vy * simDt;
        if (!collidesWithWall(px, nextY, rNorm, isMirror)) {
          py = nextY;
        }
        walkPhase += simDt * 16;
      }

      if (hitMirrorDecoy && invulnTimer <= 0) {
        hp -= 1;
        hitFlash = 0.18;
        invulnTimer = 1.1;
        ctx.shake(0.6);
        ctx.audio.laserZap();
        ctx.particles.emitBurst(ax + px * aw, ay + py * ah, 14, '#e879f9', 60, 200, 4, 150, 0.4);
        if (hp <= 0) {
          ended = true;
          ctx.audio.eliminate();
          pushHud();
          ctx.finishLose({
            reason: 'Shocked by a decoy illusion barrier in the Mirror Hall.',
            detailLabel: `${itemNoun}: ${keys.filter((k) => k.collected).length}/${totalKeys}`,
            scoreSoFar: keys.filter((k) => k.collected).length * 250,
            timeRemaining: timeLeft,
            hpRemaining: 0,
            maxHp,
          });
          return;
        }
      }

      for (const k of keys) {
        if (!k.collected && Math.hypot(px - k.x, py - k.y) < 0.05) {
          k.collected = true;
          ctx.audio.pickup();
          ctx.particles.emitBurst(ax + k.x * aw, ay + k.y * ah, 16, '#fbbf24', 50, 180, 4, 100, 0.5);
        }
      }

      for (const g of guards) {
        const distToPlayer = Math.hypot(px - g.x, py - g.y);
        const angleToPlayer = Math.atan2(py - g.y, px - g.x);
        const angleDiff = Math.abs(
          Math.atan2(Math.sin(angleToPlayer - g.angle), Math.cos(angleToPlayer - g.angle))
        );
        const playerSpotted = distToPlayer < g.sightRange && angleDiff < g.sightHalfAngle;

        if (g.policy === 'patrol') {
          const tx = g.patrolForward ? g.patrolX : g.homeX;
          const ty = g.patrolForward ? g.patrolY : g.homeY;
          const dx = tx - g.x;
          const dy = ty - g.y;
          const d = Math.hypot(dx, dy);
          if (d < 0.02) {
            g.patrolForward = !g.patrolForward;
          } else {
            const spd = (isFinalMaze ? 0.165 : 0.14) * cfg.aiStrength;
            g.x += (dx / d) * spd * simDt;
            g.y += (dy / d) * spd * simDt;
            g.angle = Math.atan2(dy, dx);
            g.walkPhase += simDt * 10;
          }
        } else if (g.policy === 'chaser') {
          if (playerSpotted && !g.chasing && g.alertTimer <= 0) {
            g.alertTimer = isFinalMaze ? 0.25 : 0.35;
            ctx.audio.warning();
          }
          if (g.alertTimer > 0) {
            g.alertTimer -= simDt;
            if (g.alertTimer <= 0) g.chasing = true;
          } else if (g.chasing) {
            const spd = (isFinalMaze ? 0.20 : 0.175) * cfg.aiStrength;
            const dx = px - g.x;
            const dy = py - g.y;
            const d = Math.max(0.001, Math.hypot(dx, dy));
            const nx = g.x + (dx / d) * spd * simDt;
            const ny = g.y + (dy / d) * spd * simDt;
            if (!collidesWithWall(nx, g.y, 0.024)) g.x = nx;
            if (!collidesWithWall(g.x, ny, 0.024)) g.y = ny;
            g.angle = Math.atan2(dy, dx);
            g.walkPhase += simDt * 15;
            if (distToPlayer > 0.38) g.chasing = false;
          } else {
            const tx = g.patrolForward ? g.patrolX : g.homeX;
            const ty = g.patrolForward ? g.patrolY : g.homeY;
            const dx = tx - g.x;
            const dy = ty - g.y;
            const d = Math.hypot(dx, dy);
            if (d < 0.02) g.patrolForward = !g.patrolForward;
            else {
              g.x += (dx / d) * 0.115 * simDt;
              g.y += (dy / d) * 0.115 * simDt;
              g.angle = Math.atan2(dy, dx);
              g.walkPhase += simDt * 9;
            }
          }
        } else if (g.policy === 'turret') {
          g.angle += simDt * (isFinalMaze ? 1.2 : 0.9) * cfg.aiStrength;
          g.laserPhase = (g.laserPhase + simDt) % (isFinalMaze ? 2.2 : 2.8);
        }

        const hotThreshold = isFinalMaze ? 1.5 : 2.0;
        const turretBeamHot = g.policy === 'turret' && g.laserPhase > hotThreshold && playerSpotted;
        const contactHit = distToPlayer < 0.044;
        if ((contactHit || turretBeamHot) && invulnTimer <= 0 && dashTimer <= 0) {
          hp -= 1;
          hitFlash = 0.18;
          invulnTimer = 1.35;
          ctx.hitstop(0.05);
          ctx.shake(0.8);
          ctx.audio.hit();
          ctx.particles.emitBurst(ax + px * aw, ay + py * ah, 18, '#ff2e63', 60, 220, 4, 180, 0.45);

          if (hp <= 0) {
            ended = true;
            ctx.audio.eliminate();
            pushHud();
            ctx.finishLose({
              reason: 'Intercepted by facility guards in the labyrinth.',
              detailLabel: `${itemNoun}: ${keys.filter((k) => k.collected).length}/${totalKeys}`,
              scoreSoFar: keys.filter((k) => k.collected).length * 250,
              timeRemaining: timeLeft,
              hpRemaining: 0,
              maxHp,
            });
            return;
          }
        }
      }

      const allKeys = keys.every((k) => k.collected);
      if (allKeys && Math.hypot(px - exitZone.x, py - exitZone.y) < exitZone.r) {
        ended = true;
        ctx.audio.levelClear();
        ctx.particles.emitBurst(
          ax + exitZone.x * aw,
          ay + exitZone.y * ah,
          28,
          '#10b981',
          70,
          260,
          5,
          140,
          0.7
        );
        pushHud();
        ctx.finishWin({
          detailLabel: `Escaped with ${Math.ceil(timeLeft)}s remaining`,
          timeRemaining: timeLeft,
          hpRemaining: hp,
          maxHp,
        });
        return;
      }

      if (timeLeft <= 0) {
        ended = true;
        ctx.audio.eliminate();
        pushHud();
        ctx.finishLose({
          reason: 'Facility lockdown sealed the extraction gate.',
          detailLabel: `${itemNoun}: ${keys.filter((k) => k.collected).length}/${totalKeys}`,
          scoreSoFar: keys.filter((k) => k.collected).length * 200,
          timeRemaining: 0,
          hpRemaining: hp,
          maxHp,
        });
        return;
      }

      pushHud();
    },

    render(c: CanvasRenderingContext2D, width: number, height: number) {
      drawStageBackdrop(c, getStageForLevel(ctx.levelId).id, width, height, 0.56);

      const { ax, ay, aw, ah } = getArenaBounds(width, height);

      c.fillStyle = isBlackout
        ? 'rgba(7, 9, 14, 0.78)'
        : isMirror
        ? 'rgba(17, 11, 24, 0.72)'
        : 'rgba(13, 15, 20, 0.72)';
      c.strokeStyle = isMirror ? 'rgba(217, 70, 239, 0.42)' : 'rgba(255, 46, 99, 0.32)';
      c.lineWidth = 2;
      c.fillRect(ax, ay, aw, ah);
      c.strokeRect(ax, ay, aw, ah);

      // Walls
      c.fillStyle = '#27272a';
      c.strokeStyle = 'rgba(255,255,255,0.16)';
      c.lineWidth = 1.5;
      for (const w of walls) {
        c.fillRect(ax + w.x * aw, ay + w.y * ah, w.w * aw, w.h * ah);
        c.strokeRect(ax + w.x * aw, ay + w.y * ah, w.w * aw, w.h * ah);
      }

      // Mirror Hall forcefield barriers
      if (isMirror) {
        for (const md of mirrorDoors) {
          const rx = ax + md.x * aw;
          const ry = ay + md.y * ah;
          const rw = md.w * aw;
          const rh = md.h * ah;
          const shimmer = 0.25 + 0.15 * Math.sin(animTime * 5);
          if (md.revealed) {
            c.fillStyle = 'rgba(255, 46, 99, 0.55)';
            c.strokeStyle = '#ff2e63';
          } else if (!md.isDecoy) {
            // Subtle emerald shimmer clue on authentic portal
            c.fillStyle = `rgba(16, 185, 129, ${shimmer + 0.08})`;
            c.strokeStyle = '#34d399';
          } else {
            c.fillStyle = `rgba(217, 70, 239, ${shimmer})`;
            c.strokeStyle = '#e879f9';
          }
          c.lineWidth = 2;
          c.fillRect(rx, ry, rw, rh);
          c.strokeRect(rx, ry, rw, rh);
          drawSprite(
            c,
            !md.isDecoy && !md.revealed ? VFX_SPRITES.auraCyan : VFX_SPRITES.auraViolet,
            rx + rw * 0.5,
            ry + rh * 0.5,
            Math.max(24, rw * 1.6),
            rh * 0.9,
            { alpha: 0.65 }
          );
        }
      }

      // Exit portal
      const allKeys = keys.every((k) => k.collected);
      const ex = ax + exitZone.x * aw;
      const ey = ay + exitZone.y * ah;
      const exitR = Math.min(aw, ah) * exitZone.r;
      c.fillStyle = allKeys ? 'rgba(16, 185, 129, 0.26)' : 'rgba(113, 113, 122, 0.16)';
      c.strokeStyle = allKeys ? '#10b981' : '#52525b';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(ex, ey, exitR, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      drawSprite(
        c,
        allKeys ? VFX_SPRITES.portalGold : VFX_SPRITES.portalBlue,
        ex,
        ey,
        exitR * 2.1,
        exitR * 2.1,
        { alpha: allKeys ? 0.85 : 0.4 }
      );
      c.fillStyle = allKeys ? '#10b981' : '#a1a1aa';
      c.font = '700 11px "Barlow Condensed", sans-serif';
      c.textAlign = 'center';
      c.fillText(allKeys ? 'EXIT OPEN' : 'LOCKED', ex, ey + 4);

      // Keys / Drives / Cells
      const pickupUrl = isBlackout
        ? COLLECTIBLE_SPRITES.crystal
        : isDarkness
        ? COLLECTIBLE_SPRITES.gemPink
        : COLLECTIBLE_SPRITES.keyGold;
      const hasPickupImg = Boolean(getCachedImage(pickupUrl));
      for (const k of keys) {
        if (k.collected) continue;
        const kx = ax + k.x * aw;
        const ky = ay + k.y * ah;
        if (hasPickupImg) {
          drawSprite(c, pickupUrl, kx, ky + Math.sin(animTime * 4) * 2.5, 26, 26);
        } else {
          c.fillStyle = isBlackout ? '#38bdf8' : '#fbbf24';
          c.beginPath();
          c.arc(kx, ky, 10, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = '#07080a';
          c.font = '700 10px "JetBrains Mono", monospace';
          c.fillText(isBlackout ? 'D' : isDarkness ? 'C' : 'K', kx, ky + 3.5);
        }
      }

      // Guards & vision cones
      for (const g of guards) {
        const gx = ax + g.x * aw;
        const gy = ay + g.y * ah;
        const rangePx = g.sightRange * Math.min(aw, ah);

        const hotThreshold = isFinalMaze ? 1.5 : 2.0;
        const warnThreshold = isFinalMaze ? 1.0 : 1.3;
        const isTurretHot = g.policy === 'turret' && g.laserPhase > hotThreshold;
        const isTurretWarn =
          g.policy === 'turret' && g.laserPhase > warnThreshold && g.laserPhase <= hotThreshold;
        c.fillStyle = isTurretHot
          ? 'rgba(255, 46, 99, 0.45)'
          : isTurretWarn
          ? 'rgba(245, 158, 11, 0.25)'
          : isBlackout
          ? 'rgba(255, 46, 99, 0.24)'
          : 'rgba(255, 46, 99, 0.14)';
        c.beginPath();
        c.moveTo(gx, gy);
        c.arc(gx, gy, rangePx, g.angle - g.sightHalfAngle, g.angle + g.sightHalfAngle);
        c.closePath();
        c.fill();

        drawMaskedGuard(c, gx, gy, 14, g.shape, {
          walkPhase: g.walkPhase,
          alerted: g.alertTimer > 0 || g.chasing,
        });
      }

      // Player
      const playerPx = ax + px * aw;
      const playerPy = ay + py * ah;
      if (invulnTimer <= 0 || Math.floor(invulnTimer * 12) % 2 === 0) {
        drawContender(c, playerPx, playerPy, 14, ctx.appearance, {
          walkPhase,
          hitFlash,
          label: ctx.appearance.numberLabel,
          shielded: dashTimer > 0,
          animTime,
        });
      }

      // Lantern darkness overlay for Level 35 (or subtle blackout radar tint for Level 25)
      if (isDarkness) {
        const radius = Math.min(aw, ah) * 0.26;
        const darkGrad = c.createRadialGradient(
          playerPx,
          playerPy,
          radius * 0.35,
          playerPx,
          playerPy,
          radius
        );
        darkGrad.addColorStop(0, 'rgba(5, 6, 8, 0)');
        darkGrad.addColorStop(0.75, 'rgba(5, 6, 8, 0.82)');
        darkGrad.addColorStop(1, 'rgba(5, 6, 8, 0.96)');
        c.fillStyle = darkGrad;
        c.fillRect(ax, ay, aw, ah);
      } else if (isBlackout) {
        const radarR = (animTime * 110) % (Math.min(aw, ah) * 0.45);
        c.strokeStyle = 'rgba(56, 189, 248, 0.28)';
        c.lineWidth = 1.5;
        c.beginPath();
        c.arc(playerPx, playerPy, radarR, 0, Math.PI * 2);
        c.stroke();
      }
    },
  };
}
