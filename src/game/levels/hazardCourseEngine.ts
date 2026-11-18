import { drawSprite, drawStageBackdrop, getCachedImage, TRAP_SPRITES, VFX_SPRITES } from '../assets';
import { drawContender, type LevelContext } from '../levelContext';
import { getDifficultyConfig, getStageForLevel } from '../rules';
import type { InputState, LevelEngine } from '../types';

interface ObstacleRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface MovingHazard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
  lane: number;
}

interface SpikeTile {
  x: number;
  y: number;
  w: number;
  h: number;
  period: number;
  phase: number;
}

interface LaserGate {
  x: number;
  y1: number;
  y2: number;
  period: number;
  phase: number;
  duty: number;
  horizontal?: boolean;
  x2?: number;
}

export function createHazardCourseLevel(ctx: LevelContext): LevelEngine {
  const cfg = getDifficultyConfig(ctx.difficulty);
  const lid = ctx.levelId;

  const baseTimes: Record<number, number> = {
    9: 38,
    11: 40,
    12: 42,
    14: 38,
    17: 44,
    28: 42,
    32: 38,
    36: 32,
    46: 36,
  };

  const maxHp = (lid >= 32 ? 3 : 3) + cfg.maxHpBonus;
  let hp = maxHp;
  let timeLeft = Math.round((baseTimes[lid] ?? 40) * cfg.timeMult);

  // Normalized arena [0..1] x [0..1], player starts bottom/left and reaches finish gate
  const isVerticalClimb = lid === 14 || lid === 28 || lid === 32;
  let px = isVerticalClimb ? 0.5 : 0.08;
  let py = isVerticalClimb ? 0.88 : 0.5;
  let walkPhase = 0;
  let hitFlash = 0;
  let invulnTimer = 0;
  let dashTimer = 0;
  let dashCooldown = 0;
  let dashDirX = isVerticalClimb ? 0 : 1;
  let dashDirY = isVerticalClimb ? -1 : 0;
  let turboTimer = 0;
  let animTime = 0;
  let ended = false;

  const goal = isVerticalClimb
    ? { x: 0.5, y: 0.09, r: 0.075 }
    : { x: 0.92, y: 0.5, r: 0.075 };

  // Level-specific static obstacles / bridges / covers
  const covers: ObstacleRect[] =
    lid === 17
      ? [
          { x: 0.22, y: 0.24, w: 0.045, h: 0.22 },
          { x: 0.22, y: 0.56, w: 0.045, h: 0.22 },
          { x: 0.45, y: 0.36, w: 0.045, h: 0.28 },
          { x: 0.66, y: 0.18, w: 0.045, h: 0.22 },
          { x: 0.66, y: 0.60, w: 0.045, h: 0.22 },
        ]
      : lid === 9
      ? [
          { x: 0.26, y: 0.10, w: 0.04, h: 0.22 },
          { x: 0.50, y: 0.68, w: 0.04, h: 0.22 },
          { x: 0.72, y: 0.10, w: 0.04, h: 0.22 },
        ]
      : [];

  // Level 9 & 46 Laser Gates
  const lasers: LaserGate[] =
    lid === 9
      ? [
          { x: 0.22, y1: 0.05, y2: 0.95, period: 2.6, phase: 0.0, duty: 0.45 },
          { x: 0.39, y1: 0.05, y2: 0.95, period: 2.4, phase: 1.1, duty: 0.48 },
          { x: 0.57, y1: 0.05, y2: 0.95, period: 2.2, phase: 0.5, duty: 0.48 },
          { x: 0.77, y1: 0.05, y2: 0.95, period: 2.0, phase: 1.4, duty: 0.50 },
        ]
      : lid === 46
      ? [
          { x: 0.20, y1: 0.05, y2: 0.95, period: 1.9, phase: 0.0, duty: 0.52 },
          { x: 0.34, y1: 0.05, y2: 0.95, period: 1.8, phase: 0.9, duty: 0.52 },
          { x: 0.50, y1: 0.05, y2: 0.95, period: 1.7, phase: 0.3, duty: 0.52 },
          { x: 0.66, y1: 0.05, y2: 0.95, period: 1.8, phase: 1.1, duty: 0.52 },
          { x: 0.80, y1: 0.05, y2: 0.95, period: 1.6, phase: 0.6, duty: 0.54 },
          { x: 0.05, y1: 0.32, y2: 0.32, period: 2.4, phase: 0.4, duty: 0.42, horizontal: true, x2: 0.95 },
          { x: 0.05, y1: 0.68, y2: 0.68, period: 2.4, phase: 1.6, duty: 0.42, horizontal: true, x2: 0.95 },
        ]
      : [];

  // Level 11 Spike tiles
  const spikes: SpikeTile[] =
    lid === 11
      ? [
          { x: 0.20, y: 0.15, w: 0.10, h: 0.32, period: 2.4, phase: 0.0 },
          { x: 0.20, y: 0.53, w: 0.10, h: 0.32, period: 2.4, phase: 1.2 },
          { x: 0.38, y: 0.12, w: 0.11, h: 0.76, period: 2.6, phase: 0.7 },
          { x: 0.56, y: 0.15, w: 0.10, h: 0.34, period: 2.2, phase: 1.5 },
          { x: 0.56, y: 0.53, w: 0.10, h: 0.34, period: 2.2, phase: 0.4 },
          { x: 0.72, y: 0.14, w: 0.10, h: 0.72, period: 2.1, phase: 1.0 },
        ]
      : [];

  // Level 12 Pendulums & Level 36 Saws & Level 14 Boulders
  const movers: MovingHazard[] =
    lid === 12
      ? [
          { x: 0.24, y: 0.5, vx: 0, vy: 0, r: 0.055, phase: 0.0, lane: 1 },
          { x: 0.42, y: 0.5, vx: 0, vy: 0, r: 0.058, phase: 1.8, lane: 2 },
          { x: 0.60, y: 0.5, vx: 0, vy: 0, r: 0.06, phase: 3.1, lane: 3 },
          { x: 0.77, y: 0.5, vx: 0, vy: 0, r: 0.058, phase: 0.9, lane: 4 },
        ]
      : lid === 14
      ? [
          { x: 0.22, y: 0.08, vx: 0, vy: 0.42 * cfg.speedMult, r: 0.055, phase: 0.0, lane: 0 },
          { x: 0.40, y: 0.45, vx: 0, vy: 0.48 * cfg.speedMult, r: 0.055, phase: 0.4, lane: 1 },
          { x: 0.60, y: 0.22, vx: 0, vy: 0.46 * cfg.speedMult, r: 0.055, phase: 0.9, lane: 2 },
          { x: 0.78, y: 0.65, vx: 0, vy: 0.50 * cfg.speedMult, r: 0.055, phase: 1.4, lane: 3 },
        ]
      : lid === 36
      ? [
          { x: 0.24, y: 0.3, vx: 0, vy: 0, r: 0.048, phase: 0.0, lane: 1 },
          { x: 0.41, y: 0.7, vx: 0, vy: 0, r: 0.05, phase: 1.4, lane: 2 },
          { x: 0.58, y: 0.4, vx: 0, vy: 0, r: 0.052, phase: 2.6, lane: 3 },
          { x: 0.75, y: 0.6, vx: 0, vy: 0, r: 0.052, phase: 0.7, lane: 4 },
        ]
      : [];

  // Level 36 Turbo Pads
  const turboPads =
    lid === 36
      ? [
          { x: 0.16, y: 0.5, r: 0.055 },
          { x: 0.49, y: 0.5, r: 0.055 },
          { x: 0.68, y: 0.32, r: 0.055 },
        ]
      : [];

  // Level 17 Sniper State
  let sniperCycle = 0; // 0..3.4s (aim -> lock -> fire)
  let sniperTargetX = px;
  let sniperTargetY = py;

  // Level 28 Balance Beam Wind
  let windForce = 0.08;
  let windTimer = 2.6;

  // Level 32 Crushing Walls
  let crushWallRows = [
    { y: 0.68, gapX: 0.32, gapW: 0.19, closeFrac: 0 },
    { y: 0.46, gapX: 0.65, gapW: 0.18, closeFrac: 0 },
    { y: 0.25, gapX: 0.42, gapW: 0.18, closeFrac: 0 },
  ];

  const getArenaBounds = (width: number, height: number) => {
    const padX = Math.max(16, width * 0.045);
    const padTop = Math.max(68, height * 0.13);
    const padBot = Math.max(26, height * 0.085);
    return {
      ax: padX,
      ay: padTop,
      aw: width - padX * 2,
      ah: height - padTop - padBot,
    };
  };

  const isInsideCover = (nx: number, ny: number, rNorm: number) => {
    for (const o of covers) {
      const cx = Math.max(o.x, Math.min(nx, o.x + o.w));
      const cy = Math.max(o.y, Math.min(ny, o.y + o.h));
      if (Math.hypot(nx - cx, ny - cy) < rNorm) return true;
    }
    return false;
  };

  const getProgress = () => {
    if (isVerticalClimb) return Math.max(0, Math.min(1, (0.88 - py) / 0.79));
    return Math.max(0, Math.min(1, (px - 0.08) / 0.84));
  };

  const getBanner = (): { text: string; tone: 'safe' | 'danger' | 'neutral' | 'gold' } => {
    if (lid === 17) {
      if (sniperCycle > 2.4) return { text: 'SNIPER FIRING · TAKE COVER!', tone: 'danger' };
      if (sniperCycle > 1.7) return { text: 'SNIPER LOCKING · HIDE BEHIND WALL!', tone: 'gold' };
      return { text: 'ADVANCE TO COVER', tone: 'safe' };
    }
    if (lid === 28) {
      return {
        text: windForce > 0 ? 'GUST PUSHING RIGHT -> COUNTER LEFT' : 'GUST PUSHING LEFT <- COUNTER RIGHT',
        tone: 'gold',
      };
    }
    if (lid === 36 && turboTimer > 0) return { text: 'TURBO BOOST ACTIVE!', tone: 'safe' };
    return { text: 'REACH THE EXTRACTION PORTAL', tone: 'neutral' };
  };

  const pushHud = () => {
    const prog = getProgress();
    const banner = getBanner();
    ctx.updateHud({
      hp,
      maxHp,
      timeLeft: Math.ceil(timeLeft),
      score: Math.round(prog * 1100) + Math.ceil(timeLeft) * 15,
      progressLabel: `${Math.round(prog * 100)}%`,
      progressValue: prog,
      statusBanner: banner.text,
      statusTone: banner.tone,
    });
  };

  const dealDamage = (reasonText: string, ax: number, ay: number, aw: number, ah: number) => {
    if (invulnTimer > 0 || ended) return;
    hp -= 1;
    hitFlash = 0.2;
    invulnTimer = 1.15;
    ctx.hitstop(0.05);
    ctx.shake(0.8);
    ctx.audio.hit();
    ctx.particles.emitBurst(ax + px * aw, ay + py * ah, 18, '#ff2e63', 70, 240, 4, 160, 0.45);
    if (hp <= 0) {
      ended = true;
      ctx.audio.eliminate();
      pushHud();
      ctx.finishLose({
        reason: reasonText,
        detailLabel: `Distance: ${Math.round(getProgress() * 100)}%`,
        scoreSoFar: Math.round(getProgress() * 750),
        timeRemaining: timeLeft,
        hpRemaining: 0,
        maxHp,
      });
    }
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
      if (turboTimer > 0) turboTimer = Math.max(0, turboTimer - simDt);

      if ((input.justPrimary || input.justSecondary) && dashCooldown <= 0 && dashTimer <= 0) {
        dashTimer = 0.17;
        dashCooldown = 0.95;
        if (Math.hypot(input.moveX, input.moveY) > 0.15) {
          const len = Math.hypot(input.moveX, input.moveY);
          dashDirX = input.moveX / len;
          dashDirY = input.moveY / len;
        }
        ctx.audio.step();
      }

      const baseSpd = (lid === 36 ? 0.30 : 0.26) * (turboTimer > 0 ? 1.48 : 1);
      let vx = input.moveX * baseSpd;
      let vy = input.moveY * baseSpd;
      if (Math.hypot(input.moveX, input.moveY) > 0.15) {
        const len = Math.hypot(input.moveX, input.moveY);
        dashDirX = input.moveX / len;
        dashDirY = input.moveY / len;
      }

      if (dashTimer > 0) {
        dashTimer -= simDt;
        vx = dashDirX * 0.64;
        vy = dashDirY * 0.64;
      }

      // Crosswind on Level 28 Balance Beam
      if (lid === 28) {
        windTimer -= simDt;
        if (windTimer <= 0) {
          windTimer = 2.1 + Math.random() * 1.4;
          windForce = (Math.random() < 0.5 ? -1 : 1) * (0.11 + Math.random() * 0.06) * cfg.speedMult;
          ctx.audio.warning();
        }
        vx += windForce;
      }

      const { ax, ay, aw, ah } = getArenaBounds(width, height);
      const rNorm = 0.022;

      if (vx !== 0 || vy !== 0) {
        const nx = Math.max(rNorm, Math.min(1 - rNorm, px + vx * simDt));
        if (!isInsideCover(nx, py, rNorm)) px = nx;
        const ny = Math.max(rNorm, Math.min(1 - rNorm, py + vy * simDt));
        if (!isInsideCover(px, ny, rNorm)) py = ny;
        walkPhase += simDt * 15;
      }

      // Level 12 Pendulum Bridges: falling off narrow walkways
      if (lid === 12) {
        const onBridge =
          px < 0.16 ||
          px > 0.84 ||
          Math.abs(py - 0.5) < 0.18 ||
          Math.abs(py - 0.24) < 0.11 ||
          Math.abs(py - 0.76) < 0.11;
        if (!onBridge && dashTimer <= 0) {
          dealDamage('Slipped off the pendulum bridge!', ax, ay, aw, ah);
          px = Math.max(0.08, px - 0.06);
          py = 0.5;
          return;
        }
      }

      // Level 28 Balance Beam: falling off narrow catwalk
      if (lid === 28) {
        const beamHalf = py > 0.62 ? 0.14 : py > 0.35 ? 0.10 : 0.085;
        if (Math.abs(px - 0.5) > beamHalf && py < 0.82 && py > 0.14) {
          dealDamage('Swept off the balance beam by crosswinds!', ax, ay, aw, ah);
          px = 0.5;
          return;
        }
      }

      // Level 9 & 46 Laser Gates
      for (const l of lasers) {
        const t = (animTime + l.phase) % l.period;
        const hot = t > l.period * (1 - l.duty);
        if (!hot || dashTimer > 0) continue;
        if (l.horizontal) {
          if (Math.abs(py - l.y1) < 0.025 && px >= l.x && px <= (l.x2 ?? 0.95)) {
            dealDamage('Sliced by security laser barrier!', ax, ay, aw, ah);
            if (ended) return;
          }
        } else if (Math.abs(px - l.x) < 0.024 && py >= l.y1 && py <= l.y2) {
          dealDamage('Sliced by laser corridor gate!', ax, ay, aw, ah);
          if (ended) return;
        }
      }

      // Level 11 Spike Gauntlet
      for (const s of spikes) {
        const t = (animTime + s.phase) % s.period;
        const active = t > s.period * 0.58;
        if (
          active &&
          dashTimer <= 0 &&
          px > s.x - 0.015 &&
          px < s.x + s.w + 0.015 &&
          py > s.y - 0.015 &&
          py < s.y + s.h + 0.015
        ) {
          dealDamage('Impaled by floor spikes!', ax, ay, aw, ah);
          if (ended) return;
        }
      }

      // Movers: Pendulums (12), Boulders (14), Saws (36)
      for (const m of movers) {
        if (lid === 12) {
          m.y = 0.5 + Math.sin(animTime * 2.6 * cfg.speedMult + m.phase) * 0.38;
        } else if (lid === 14) {
          m.y += m.vy * simDt;
          if (m.y > 0.96) {
            m.y = 0.04;
            m.x = 0.14 + ((m.lane * 0.22 + Math.random() * 0.12) % 0.74);
          }
        } else if (lid === 36) {
          m.y = 0.5 + Math.sin(animTime * 3.1 * cfg.speedMult + m.phase) * 0.36;
        }

        if (dashTimer <= 0 && Math.hypot(px - m.x, py - m.y) < m.r + 0.02) {
          dealDamage(
            lid === 14
              ? 'Crushed by a falling boulder!'
              : lid === 12
              ? 'Struck by a swinging pendulum blade!'
              : 'Hit by a circular saw!',
            ax,
            ay,
            aw,
            ah
          );
          if (ended) return;
        }
      }

      // Level 36 Turbo Pads
      for (const tp of turboPads) {
        if (Math.hypot(px - tp.x, py - tp.y) < tp.r + 0.02) {
          if (turboTimer <= 0.1) ctx.audio.pickup();
          turboTimer = 1.6;
        }
      }

      // Level 17 Sniper Alley
      if (lid === 17) {
        const prevCycle = sniperCycle;
        sniperCycle = (sniperCycle + simDt * cfg.speedMult) % 3.1;
        if (sniperCycle < 1.8) {
          sniperTargetX += (px - sniperTargetX) * Math.min(1, simDt * 4.5);
          sniperTargetY += (py - sniperTargetY) * Math.min(1, simDt * 4.5);
        } else if (prevCycle <= 2.4 && sniperCycle > 2.4) {
          ctx.audio.laserZap();
          // Check if player has concrete cover to their left/between sniper or is standing behind cover
          const shieldedByCover = covers.some(
            (c) => Math.abs(px - (c.x + c.w)) < 0.09 && py >= c.y - 0.02 && py <= c.y + c.h + 0.02
          );
          if (!shieldedByCover && dashTimer <= 0 && Math.hypot(px - sniperTargetX, py - sniperTargetY) < 0.09) {
            dealDamage('Picked off by sniper lock in open ground!', ax, ay, aw, ah);
            if (ended) return;
          }
        }
      }

      // Level 32 Crushing Walls
      if (lid === 32) {
        for (let i = 0; i < crushWallRows.length; i++) {
          const row = crushWallRows[i];
          const wave = 0.5 + 0.5 * Math.sin(animTime * 2.1 * cfg.speedMult + i * 1.6);
          row.closeFrac = wave;
          const openMin = row.gapX - (row.gapW * (1 - wave * 0.55)) / 2;
          const openMax = row.gapX + (row.gapW * (1 - wave * 0.55)) / 2;
          if (Math.abs(py - row.y) < 0.032) {
            if (px < openMin || px > openMax) {
              dealDamage('Crushed between hydraulic walls!', ax, ay, aw, ah);
              py = Math.min(0.9, py + 0.06);
              if (ended) return;
            }
          }
        }
      }

      // Goal extraction
      if (Math.hypot(px - goal.x, py - goal.y) < goal.r) {
        ended = true;
        ctx.audio.levelClear();
        ctx.particles.emitBurst(ax + goal.x * aw, ay + goal.y * ah, 28, '#10b981', 70, 260, 5, 140, 0.7);
        pushHud();
        ctx.finishWin({
          detailLabel: `Cleared gauntlet with ${Math.ceil(timeLeft)}s remaining`,
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
          reason: 'Time expired before reaching the extraction portal.',
          detailLabel: `Distance: ${Math.round(getProgress() * 100)}%`,
          scoreSoFar: Math.round(getProgress() * 700),
          timeRemaining: 0,
          hpRemaining: hp,
          maxHp,
        });
        return;
      }

      pushHud();
    },

    render(c: CanvasRenderingContext2D, width: number, height: number) {
      drawStageBackdrop(c, getStageForLevel(lid).id, width, height, 0.52);

      const { ax, ay, aw, ah } = getArenaBounds(width, height);
      c.fillStyle = lid === 14 ? 'rgba(21, 18, 16, 0.74)' : lid === 28 ? 'rgba(9, 13, 22, 0.72)' : 'rgba(13, 15, 20, 0.72)';
      c.strokeStyle = 'rgba(255, 46, 99, 0.32)';
      c.lineWidth = 2;
      c.fillRect(ax, ay, aw, ah);
      c.strokeRect(ax, ay, aw, ah);

      // Walkways for Level 12 & 28
      if (lid === 12) {
        c.fillStyle = 'rgba(24, 24, 31, 0.85)';
        c.fillRect(ax, ay, aw * 0.16, ah);
        c.fillRect(ax + aw * 0.84, ay, aw * 0.16, ah);
        c.fillRect(ax + aw * 0.15, ay + ah * 0.34, aw * 0.7, ah * 0.32);
        c.fillRect(ax + aw * 0.15, ay + ah * 0.14, aw * 0.7, ah * 0.18);
        c.fillRect(ax + aw * 0.15, ay + ah * 0.68, aw * 0.7, ah * 0.18);
      } else if (lid === 28) {
        c.fillStyle = 'rgba(4, 5, 8, 0.75)';
        c.fillRect(ax, ay, aw, ah);
        c.fillStyle = '#1f2937';
        c.fillRect(ax + aw * 0.36, ay + ah * 0.62, aw * 0.28, ah * 0.36);
        c.fillRect(ax + aw * 0.40, ay + ah * 0.35, aw * 0.20, ah * 0.28);
        c.fillRect(ax + aw * 0.415, ay + ah * 0.04, aw * 0.17, ah * 0.32);
        c.strokeStyle = '#38bdf8';
        c.lineWidth = 2;
        c.strokeRect(ax + aw * 0.415, ay + ah * 0.04, aw * 0.17, ah * 0.32);
      }

      // Turbo pads (Level 36)
      for (const tp of turboPads) {
        const tx = ax + tp.x * aw;
        const ty = ay + tp.y * ah;
        const radPx = tp.r * Math.min(aw, ah);
        if (!drawSprite(c, TRAP_SPRITES.boostPad, tx, ty, radPx * 2.2, radPx * 2.2)) {
          c.fillStyle = 'rgba(16, 185, 129, 0.28)';
          c.strokeStyle = '#10b981';
          c.lineWidth = 2.5;
          c.beginPath();
          c.arc(tx, ty, radPx, 0, Math.PI * 2);
          c.fill();
          c.stroke();
          c.fillStyle = '#34d399';
          c.font = '700 11px "Barlow Condensed", sans-serif';
          c.textAlign = 'center';
          c.fillText('>>', tx, ty + 4);
        }
      }

      // Spike tiles (Level 11)
      for (const s of spikes) {
        const t = (animTime + s.phase) % s.period;
        const warn = t > s.period * 0.32 && t <= s.period * 0.58;
        const active = t > s.period * 0.58;
        const sx = ax + s.x * aw;
        const sy = ay + s.y * ah;
        const sw = s.w * aw;
        const sh = s.h * ah;
        c.fillStyle = active
          ? 'rgba(255, 46, 99, 0.34)'
          : warn
          ? 'rgba(245, 158, 11, 0.24)'
          : 'rgba(255,255,255,0.05)';
        c.strokeStyle = active ? '#ff2e63' : warn ? '#f59e0b' : 'rgba(255,255,255,0.12)';
        c.lineWidth = 1.5;
        c.fillRect(sx, sy, sw, sh);
        c.strokeRect(sx, sy, sw, sh);
        if (active) {
          if (!drawSprite(c, TRAP_SPRITES.spikesTall, sx + sw * 0.5, sy + sh * 0.5, sw * 0.92, sh * 0.92)) {
            c.fillStyle = '#fda4af';
            c.font = '700 12px "JetBrains Mono", monospace';
            c.textAlign = 'center';
            c.fillText('▲▲▲', sx + sw * 0.5, sy + sh * 0.52);
          }
        } else if (warn) {
          drawSprite(c, TRAP_SPRITES.spikesLow, sx + sw * 0.5, sy + sh * 0.55, sw * 0.85, sh * 0.72, { alpha: 0.75 });
        }
      }

      // Concrete covers (Levels 9, 17)
      c.fillStyle = '#334155';
      c.strokeStyle = 'rgba(255,255,255,0.22)';
      c.lineWidth = 2;
      for (const o of covers) {
        c.fillRect(ax + o.x * aw, ay + o.y * ah, o.w * aw, o.h * ah);
        c.strokeRect(ax + o.x * aw, ay + o.y * ah, o.w * aw, o.h * ah);
      }

      // Crushing Walls (Level 32)
      if (lid === 32) {
        for (const row of crushWallRows) {
          const openW = row.gapW * (1 - row.closeFrac * 0.55);
          const openMin = row.gapX - openW / 2;
          const openMax = row.gapX + openW / 2;
          const ry = ay + (row.y - 0.022) * ah;
          const rh = 0.044 * ah;
          c.fillStyle = '#9f1239';
          c.strokeStyle = '#fb7185';
          c.lineWidth = 2;
          c.fillRect(ax, ry, openMin * aw, rh);
          c.strokeRect(ax, ry, openMin * aw, rh);
          c.fillRect(ax + openMax * aw, ry, (1 - openMax) * aw, rh);
          c.strokeRect(ax + openMax * aw, ry, (1 - openMax) * aw, rh);
        }
      }

      // Laser Gates (Levels 9, 46)
      for (const l of lasers) {
        const t = (animTime + l.phase) % l.period;
        const warn = t > l.period * (1 - l.duty - 0.18) && t <= l.period * (1 - l.duty);
        const hot = t > l.period * (1 - l.duty);
        const lx1 = ax + l.x * aw;
        const ly1 = ay + l.y1 * ah;
        const lx2 = l.horizontal ? ax + (l.x2 ?? 0.95) * aw : ax + l.x * aw;
        const ly2 = l.horizontal ? ly1 : ay + l.y2 * ah;
        c.strokeStyle = hot ? '#ff2e63' : warn ? '#f59e0b' : 'rgba(255,255,255,0.12)';
        c.lineWidth = hot ? 6 : warn ? 3 : 1.5;
        c.beginPath();
        c.moveTo(lx1, ly1);
        c.lineTo(lx2, ly2);
        c.stroke();
        if (hot || warn) {
          drawSprite(c, TRAP_SPRITES.laserGate, lx1, ly1, 20, 20, { alpha: hot ? 0.95 : 0.5 });
          drawSprite(c, TRAP_SPRITES.laserGate, lx2, ly2, 20, 20, { alpha: hot ? 0.95 : 0.5 });
        }
      }

      // Movers (Pendulums / Boulders / Saws)
      for (let i = 0; i < movers.length; i++) {
        const m = movers[i];
        const mx = ax + m.x * aw;
        const my = ay + m.y * ah;
        const mr = m.r * Math.min(aw, ah);
        if (lid === 12) {
          c.strokeStyle = '#94a3b8';
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(mx, ay);
          c.lineTo(mx, my);
          c.stroke();
          const pendUrl = i % 2 === 0 ? TRAP_SPRITES.pendulumRed : TRAP_SPRITES.pendulumGold;
          if (drawSprite(c, pendUrl, mx, my, mr * 2.5, mr * 2.5)) {
            continue;
          }
        } else if (lid === 36 || lid === 46 || lid === 32) {
          if (
            drawSprite(c, TRAP_SPRITES.sawblade, mx, my, mr * 2.4, mr * 2.4, {
              rotation: animTime * 8 * (i % 2 === 0 ? 1 : -1),
            })
          ) {
            continue;
          }
        }
        c.fillStyle = lid === 14 ? '#78350f' : '#be123c';
        c.strokeStyle = lid === 14 ? '#d97706' : '#fda4af';
        c.lineWidth = 2.5;
        c.beginPath();
        c.arc(mx, my, mr, 0, Math.PI * 2);
        c.fill();
        c.stroke();
      }

      // Sniper Crosshair (Level 17)
      if (lid === 17) {
        const tx = ax + sniperTargetX * aw;
        const ty = ay + sniperTargetY * ah;
        const lockFrac = Math.min(1, sniperCycle / 2.4);
        drawSprite(c, VFX_SPRITES.reticlePurple, tx, ty, 52 - lockFrac * 18, 52 - lockFrac * 18, {
          alpha: 0.72,
          rotation: animTime * 2,
        });
        c.strokeStyle = sniperCycle > 2.4 ? '#ff2e63' : sniperCycle > 1.7 ? '#f59e0b' : '#38bdf8';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(tx, ty, 38 - lockFrac * 22, 0, Math.PI * 2);
        c.stroke();
        c.beginPath();
        c.moveTo(tx - 16, ty);
        c.lineTo(tx + 16, ty);
        c.moveTo(tx, ty - 16);
        c.lineTo(tx, ty + 16);
        c.stroke();
      }

      // Goal Portal
      const gx = ax + goal.x * aw;
      const gy = ay + goal.y * ah;
      const gr = Math.min(aw, ah) * goal.r;
      c.fillStyle = 'rgba(16, 185, 129, 0.25)';
      c.strokeStyle = '#10b981';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(gx, gy, gr, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      drawSprite(c, VFX_SPRITES.portalGold, gx, gy, gr * 2.2, gr * 2.2, { alpha: 0.85 });
      c.fillStyle = '#10b981';
      c.font = '700 12px "Barlow Condensed", sans-serif';
      c.textAlign = 'center';
      c.fillText('EXIT', gx, gy + 4);

      // Player
      const playerPx = ax + px * aw;
      const playerPy = ay + py * ah;
      if (invulnTimer <= 0 || Math.floor(invulnTimer * 12) % 2 === 0) {
        drawContender(c, playerPx, playerPy, 15, ctx.appearance, {
          walkPhase,
          hitFlash,
          label: ctx.appearance.numberLabel,
          shielded: dashTimer > 0,
          animTime,
        });
      }
    },
  };
}
