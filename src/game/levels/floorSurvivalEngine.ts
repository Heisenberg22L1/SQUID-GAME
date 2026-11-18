import {
  COLLECTIBLE_SPRITES,
  drawSprite,
  drawStageBackdrop,
  getCachedImage,
  POWERUP_SPRITES,
  TRAP_SPRITES,
  VFX_SPRITES,
} from '../assets';
import { drawContender, type LevelContext } from '../levelContext';
import { getDifficultyConfig, getStageForLevel } from '../rules';
import type { InputState, LevelEngine } from '../types';

interface FloorTile {
  r: number;
  c: number;
  state: 'solid' | 'cracked' | 'gone' | 'charging' | 'hot';
  timer: number;
}

interface AiRunner {
  id: string;
  label: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hasBomb: boolean;
  walkPhase: number;
  suitColor: string;
}

interface MeteorStrike {
  x: number;
  y: number;
  r: number;
  timer: number;
  maxTimer: number;
}

export function createFloorSurvivalLevel(ctx: LevelContext): LevelEngine {
  const cfg = getDifficultyConfig(ctx.difficulty);
  const lid = ctx.levelId;

  const baseTimes: Record<number, number> = {
    8: 28,
    13: 32,
    15: 30,
    16: 46,
    18: 32,
    26: 45,
    31: 34,
    33: 32,
    34: 34,
    37: 34,
    38: 35,
    41: 36,
    45: 42,
    48: 45,
  };

  const maxHp = 3 + cfg.maxHpBonus;
  let hp = maxHp;
  const totalTime = Math.round((baseTimes[lid] ?? 34) * cfg.timeMult);
  let timeLeft = totalTime;

  let px = 0.5;
  let py = 0.5;
  let walkPhase = 0;
  let hitFlash = 0;
  let invulnTimer = 0;
  let dashTimer = 0;
  let dashCooldown = 0;
  let dashDirX = 1;
  let dashDirY = 0;
  let animTime = 0;
  let ended = false;

  // Grid state for Falling Floor (8), Electric Grid (18, 37, 41), Acid Crates (33)
  const cols = lid === 33 ? 5 : 7;
  const rows = lid === 33 ? 4 : 5;
  const tiles: FloorTile[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles.push({ r, c, state: 'solid', timer: 0 });
    }
  }
  let tileWaveTimer = 1.6;

  // Bomb Tag (13)
  let playerHasBomb = lid === 13;
  let bombFuse = 8.0;
  let bombPassCooldown = 0;
  const runners: AiRunner[] =
    lid === 13
      ? [
          { id: 'ai1', label: '067', x: 0.2, y: 0.25, vx: 0.16, vy: 0.12, hasBomb: false, walkPhase: 0, suitColor: '#0f766e' },
          { id: 'ai2', label: '218', x: 0.8, y: 0.25, vx: -0.15, vy: 0.14, hasBomb: false, walkPhase: 1, suitColor: '#1e40af' },
          { id: 'ai3', label: '199', x: 0.25, y: 0.78, vx: 0.14, vy: -0.15, hasBomb: false, walkPhase: 2, suitColor: '#6d28d9' },
          { id: 'ai4', label: '101', x: 0.78, y: 0.75, vx: -0.17, vy: -0.13, hasBomb: false, walkPhase: 0.5, suitColor: '#9f1239' },
        ]
      : [];

  // Safe Dome / Escort Drone (15, 38)
  let domeX = 0.5;
  let domeY = 0.5;
  let domeR = lid === 38 ? 0.14 : 0.17;
  let gasTimer = 0;

  // Pickups / Switches (15 O2, 16 Switches, 26 Stabilizers, 31 Flares, 45 Keys)
  const targetItemsCount = lid === 16 || lid === 45 ? 2 : lid === 26 ? 3 : lid === 15 || lid === 31 ? 4 : 0;
  const pickups: Array<{ x: number; y: number; done: boolean }> = [];
  for (let i = 0; i < targetItemsCount; i++) {
    pickups.push({
      x: 0.18 + ((i * 0.28 + 0.1) % 0.68),
      y: 0.2 + ((i * 0.34 + 0.15) % 0.62),
      done: false,
    });
  }

  // Reverse Controls (26)
  let inverted = false;
  let invertTimer = 4.2;

  // Meteors / Bombs (31, 45)
  const meteors: MeteorStrike[] = [];
  let meteorSpawnTimer = 0.9;

  // Laser spokes (34, 37, 41, 45)
  let spokeAngle = 0;

  // Seeker Drones (41, 48)
  const drones =
    lid === 41 || lid === 48
      ? [
          { x: 0.15, y: 0.15, spd: 0.13 * cfg.aiStrength },
          { x: 0.85, y: 0.85, spd: 0.14 * cfg.aiStrength },
        ]
      : [];

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

  const dealDamage = (reason: string, ax: number, ay: number, aw: number, ah: number) => {
    if (invulnTimer > 0 || ended) return;
    hp -= 1;
    hitFlash = 0.2;
    invulnTimer = 1.1;
    ctx.hitstop(0.05);
    ctx.shake(0.8);
    ctx.audio.hit();
    ctx.particles.emitBurst(ax + px * aw, ay + py * ah, 18, '#ff2e63', 70, 240, 4, 160, 0.45);
    if (hp <= 0) {
      ended = true;
      ctx.audio.eliminate();
      ctx.finishLose({
        reason,
        detailLabel: `Survived ${Math.round(totalTime - timeLeft)}s`,
        scoreSoFar: Math.round((totalTime - timeLeft) * 35),
        timeRemaining: timeLeft,
        hpRemaining: 0,
        maxHp,
      });
    }
  };

  const getStatusBanner = (): { text: string; tone: 'safe' | 'danger' | 'neutral' | 'gold' } => {
    if (lid === 13) {
      return playerHasBomb
        ? { text: `YOU HOLD BOMB (${bombFuse.toFixed(1)}s) · TAG A RIVAL!`, tone: 'danger' }
        : { text: `STAY CLEAR OF BOMB (${bombFuse.toFixed(1)}s)`, tone: 'safe' };
    }
    if (lid === 26) {
      return inverted
        ? { text: 'CONTROLS INVERTED! · COLLECT STABILIZERS', tone: 'danger' }
        : { text: `STABILIZERS ${pickups.filter((p) => p.done).length}/3`, tone: 'gold' };
    }
    if (lid === 15 || lid === 38) {
      const inside = Math.hypot(px - domeX, py - domeY) <= domeR;
      return inside
        ? { text: 'INSIDE SAFE ZONE', tone: 'safe' }
        : { text: 'OUTSIDE SAFE ZONE · MOVE INSIDE!', tone: 'danger' };
    }
    if (targetItemsCount > 0) {
      const done = pickups.filter((p) => p.done).length;
      return { text: `OBJECTIVES ${done}/${targetItemsCount}`, tone: done >= targetItemsCount ? 'safe' : 'gold' };
    }
    return { text: `SURVIVE · ${Math.ceil(timeLeft)}s LEFT`, tone: 'neutral' };
  };

  const pushHud = () => {
    const doneItems = pickups.filter((p) => p.done).length;
    const quantizedLeft = Math.ceil(timeLeft);
    const survivalProg = Math.max(0, Math.min(1, 1 - quantizedLeft / Math.max(1, totalTime)));
    const prog = targetItemsCount > 0 ? doneItems / targetItemsCount : survivalProg;
    const banner = getStatusBanner();
    ctx.updateHud({
      hp,
      maxHp,
      timeLeft: quantizedLeft,
      score: Math.round(survivalProg * 900 + doneItems * 320 + hp * 100),
      progressLabel: targetItemsCount > 0 ? `${doneItems}/${targetItemsCount}` : `${Math.round(survivalProg * 100)}%`,
      progressValue: prog,
      statusBanner: banner.text,
      statusTone: banner.tone,
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
      if (bombPassCooldown > 0) bombPassCooldown = Math.max(0, bombPassCooldown - simDt);

      if ((input.justPrimary || input.justSecondary) && dashCooldown <= 0 && dashTimer <= 0) {
        dashTimer = 0.18;
        dashCooldown = 0.92;
        if (Math.hypot(input.moveX, input.moveY) > 0.15) {
          const len = Math.hypot(input.moveX, input.moveY);
          dashDirX = (inverted ? -1 : 1) * (input.moveX / len);
          dashDirY = (inverted ? -1 : 1) * (input.moveY / len);
        }
        ctx.audio.step();
      }

      const sign = inverted ? -1 : 1;
      let vx = input.moveX * sign * 0.28;
      let vy = input.moveY * sign * 0.28;
      if (Math.hypot(input.moveX, input.moveY) > 0.15) {
        const len = Math.hypot(input.moveX, input.moveY);
        dashDirX = sign * (input.moveX / len);
        dashDirY = sign * (input.moveY / len);
      }

      if (dashTimer > 0) {
        dashTimer -= simDt;
        vx = dashDirX * 0.65;
        vy = dashDirY * 0.65;
      }

      // Level 16 Conveyor Furnace belt pull
      if (lid === 16) {
        const beltDir = py < 0.35 ? 0.14 : py < 0.65 ? -0.16 : 0.15;
        vx += beltDir * cfg.speedMult;
      }

      px = Math.max(0.03, Math.min(0.97, px + vx * simDt));
      py = Math.max(0.04, Math.min(0.96, py + vy * simDt));
      if (Math.hypot(vx, vy) > 0.04) walkPhase += simDt * 15;

      const { ax, ay, aw, ah } = getArenaBounds(width, height);

      // Level 16 Molten Edges
      if (lid === 16 && (px < 0.08 || px > 0.92)) {
        dealDamage('Dragged into the molten furnace edge!', ax, ay, aw, ah);
        px = 0.5;
        if (ended) return;
      }

      // Level 8 Falling Floor & Level 33 Acid Crates
      if (lid === 8 || lid === 33) {
        const cIdx = Math.min(cols - 1, Math.max(0, Math.floor(px * cols)));
        const rIdx = Math.min(rows - 1, Math.max(0, Math.floor(py * rows)));
        const curTile = tiles[rIdx * cols + cIdx];
        if (curTile && curTile.state === 'solid') {
          curTile.state = 'cracked';
          curTile.timer = lid === 33 ? 1.4 / cfg.speedMult : 1.0 / cfg.speedMult;
        }
        for (const t of tiles) {
          if (t.state === 'cracked') {
            t.timer -= simDt;
            if (t.timer <= 0) {
              t.state = 'gone';
              t.timer = lid === 33 ? 2.6 : 4.2;
              ctx.audio.glassBreak();
            }
          } else if (t.state === 'gone') {
            t.timer -= simDt;
            if (t.timer <= 0) t.state = 'solid';
          }
        }
        if (curTile && curTile.state === 'gone' && dashTimer <= 0) {
          dealDamage(
            lid === 33 ? 'Sank into corrosive acid!' : 'Fell through collapsed floor tile!',
            ax,
            ay,
            aw,
            ah
          );
          if (ended) return;
        }
      }

      // Level 18, 37, 41 Electric Grid
      if (lid === 18 || lid === 37 || lid === 41) {
        tileWaveTimer -= simDt;
        if (tileWaveTimer <= 0) {
          tileWaveTimer = (lid === 41 ? 1.8 : 2.2) / cfg.speedMult;
          const strikeCount = lid === 41 ? 10 : 8;
          for (let i = 0; i < strikeCount; i++) {
            const t = tiles[Math.floor(Math.random() * tiles.length)];
            if (t.state === 'solid') {
              t.state = 'charging';
              t.timer = 1.05;
            }
          }
        }
        for (const t of tiles) {
          if (t.state === 'charging') {
            t.timer -= simDt;
            if (t.timer <= 0) {
              t.state = 'hot';
              t.timer = 0.65;
              ctx.audio.laserZap();
            }
          } else if (t.state === 'hot') {
            t.timer -= simDt;
            if (t.timer <= 0) t.state = 'solid';
          }
        }
        const cIdx = Math.min(cols - 1, Math.max(0, Math.floor(px * cols)));
        const rIdx = Math.min(rows - 1, Math.max(0, Math.floor(py * rows)));
        const curTile = tiles[rIdx * cols + cIdx];
        if (curTile && curTile.state === 'hot' && dashTimer <= 0) {
          dealDamage('Electrocuted by high-voltage grid!', ax, ay, aw, ah);
          if (ended) return;
        }
      }

      // Level 13 Bomb Tag
      if (lid === 13) {
        bombFuse -= simDt;
        for (const r of runners) {
          if (playerHasBomb) {
            // AI flees from player
            const dx = r.x - px;
            const dy = r.y - py;
            const d = Math.max(0.01, Math.hypot(dx, dy));
            if (d < 0.35) {
              r.vx = (dx / d) * 0.21 * cfg.aiStrength;
              r.vy = (dy / d) * 0.21 * cfg.aiStrength;
            }
          } else if (r.hasBomb) {
            // Bomb AI chases nearest target (player)
            const dx = px - r.x;
            const dy = py - r.y;
            const d = Math.max(0.01, Math.hypot(dx, dy));
            r.vx = (dx / d) * 0.22 * cfg.aiStrength;
            r.vy = (dy / d) * 0.22 * cfg.aiStrength;
          }
          r.x += r.vx * simDt;
          r.y += r.vy * simDt;
          if (r.x < 0.06 || r.x > 0.94) r.vx *= -1;
          if (r.y < 0.06 || r.y > 0.94) r.vy *= -1;
          r.x = Math.max(0.06, Math.min(0.94, r.x));
          r.y = Math.max(0.06, Math.min(0.94, r.y));
          r.walkPhase += simDt * 12;

          if (bombPassCooldown <= 0 && Math.hypot(px - r.x, py - r.y) < 0.065) {
            if (playerHasBomb) {
              playerHasBomb = false;
              r.hasBomb = true;
              bombPassCooldown = 0.85;
              ctx.audio.pickup();
            } else if (r.hasBomb) {
              r.hasBomb = false;
              playerHasBomb = true;
              bombPassCooldown = 0.85;
              ctx.audio.warning();
            }
          }
        }
        if (bombFuse <= 0) {
          ctx.audio.explosion();
          ctx.shake(0.9);
          if (playerHasBomb) {
            dealDamage('Bomb detonated while strapped to you!', ax, ay, aw, ah);
            if (ended) return;
            playerHasBomb = false;
            runners[0].hasBomb = true;
          }
          bombFuse = 7.5;
        }
      }

      // Level 15 & 38 Moving Safe Zone / Drone
      if (lid === 15 || lid === 38) {
        domeX = 0.5 + Math.sin(animTime * (lid === 38 ? 0.85 : 0.65) * cfg.speedMult) * 0.30;
        domeY = 0.5 + Math.cos(animTime * (lid === 38 ? 0.65 : 0.45) * cfg.speedMult) * 0.26;
        const inside = Math.hypot(px - domeX, py - domeY) <= domeR;
        if (!inside) {
          gasTimer += simDt;
          if (gasTimer > (lid === 38 ? 0.9 : 1.25)) {
            gasTimer = 0;
            dealDamage(
              lid === 38 ? 'Cut down by turret fire outside shield drone!' : 'Succumbed to toxic gas outside purifier dome!',
              ax,
              ay,
              aw,
              ah
            );
            if (ended) return;
          }
        } else {
          gasTimer = Math.max(0, gasTimer - simDt * 1.5);
        }
      }

      // Level 26 Reverse Controls
      if (lid === 26) {
        invertTimer -= simDt;
        if (invertTimer <= 0) {
          inverted = !inverted;
          invertTimer = 3.6 + Math.random() * 1.8;
          ctx.audio.warning();
        }
      }

      // Level 31 & 45 Meteors / Bombs
      if (lid === 31 || lid === 45) {
        meteorSpawnTimer -= simDt;
        if (meteorSpawnTimer <= 0) {
          meteorSpawnTimer = (lid === 45 ? 0.95 : 0.72) / cfg.speedMult;
          meteors.push({
            x: 0.12 + Math.random() * 0.76,
            y: 0.14 + Math.random() * 0.72,
            r: 0.085,
            timer: 1.15,
            maxTimer: 1.15,
          });
        }
        for (let i = meteors.length - 1; i >= 0; i--) {
          const m = meteors[i];
          m.timer -= simDt;
          if (m.timer <= 0) {
            ctx.audio.explosion();
            ctx.particles.emitRing(ax + m.x * aw, ay + m.y * ah, '#ff2e63', 32, 0.35);
            if (dashTimer <= 0 && Math.hypot(px - m.x, py - m.y) < m.r) {
              dealDamage('Caught inside artillery blast ring!', ax, ay, aw, ah);
              if (ended) return;
            }
            meteors.splice(i, 1);
          }
        }
      }

      // Level 34, 37, 41, 45 Rotating Laser Web
      if (lid === 34 || lid === 37 || lid === 41 || lid === 45) {
        spokeAngle += simDt * (lid === 34 ? 1.15 : 0.92) * cfg.speedMult;
        const spokeCount = lid === 34 ? 4 : lid === 41 ? 3 : 2;
        const distFromCenter = Math.hypot(px - 0.5, py - 0.5);
        if (distFromCenter > 0.06 && dashTimer <= 0) {
          const pAng = Math.atan2(py - 0.5, px - 0.5);
          for (let s = 0; s < spokeCount; s++) {
            const beamAng = spokeAngle + (s * Math.PI * 2) / spokeCount;
            const diff = Math.abs(Math.atan2(Math.sin(pAng - beamAng), Math.cos(pAng - beamAng)));
            if (diff * distFromCenter < 0.022) {
              dealDamage('Sliced by rotating laser web!', ax, ay, aw, ah);
              if (ended) return;
            }
          }
        }
      }

      // Level 41 & 48 Seeker Drones + Level 48 Shrinking Ring
      for (const d of drones) {
        const dx = px - d.x;
        const dy = py - d.y;
        const len = Math.max(0.01, Math.hypot(dx, dy));
        d.x += (dx / len) * d.spd * simDt;
        d.y += (dy / len) * d.spd * simDt;
        if (dashTimer <= 0 && len < 0.042) {
          dealDamage('Intercepted by hunter drone!', ax, ay, aw, ah);
          if (ended) return;
        }
      }

      if (lid === 48) {
        const ringR = Math.max(0.22, 0.48 - (1 - timeLeft / totalTime) * 0.24);
        if (Math.hypot(px - 0.5, py - 0.5) > ringR) {
          dealDamage('Burned by the shrinking siege ring!', ax, ay, aw, ah);
          px = 0.5 + (px - 0.5) * 0.65;
          py = 0.5 + (py - 0.5) * 0.65;
          if (ended) return;
        }
      }

      // Pickups / Objectives check
      for (const p of pickups) {
        if (!p.done && Math.hypot(px - p.x, py - p.y) < 0.055) {
          p.done = true;
          ctx.audio.pickup();
          ctx.particles.emitBurst(ax + p.x * aw, ay + p.y * ah, 16, '#10b981', 50, 180, 4, 100, 0.45);
        }
      }

      // Objective win (for switch/key/stabilizer levels)
      if (
        (lid === 16 || lid === 26 || lid === 45) &&
        pickups.every((p) => p.done)
      ) {
        ended = true;
        ctx.audio.levelClear();
        ctx.particles.emitBurst(ax + px * aw, ay + py * ah, 26, '#10b981', 70, 260, 5, 140, 0.65);
        pushHud();
        ctx.finishWin({
          detailLabel: `All objectives secured with ${Math.ceil(timeLeft)}s left`,
          timeRemaining: timeLeft,
          hpRemaining: hp,
          maxHp,
        });
        return;
      }

      // Timer finish: Win for pure survival levels, Lose for objective levels
      if (timeLeft <= 0) {
        if (lid === 16 || lid === 26 || lid === 45) {
          ended = true;
          ctx.audio.eliminate();
          pushHud();
          ctx.finishLose({
            reason: 'Failed to secure all objectives before time ran out.',
            detailLabel: `Secured ${pickups.filter((p) => p.done).length}/${targetItemsCount}`,
            scoreSoFar: pickups.filter((p) => p.done).length * 300,
            timeRemaining: 0,
            hpRemaining: hp,
            maxHp,
          });
        } else {
          ended = true;
          ctx.audio.levelClear();
          ctx.particles.emitBurst(ax + px * aw, ay + py * ah, 28, '#10b981', 70, 260, 5, 140, 0.7);
          pushHud();
          ctx.finishWin({
            detailLabel: `Survived trial with ${hp} HP remaining`,
            timeRemaining: 0,
            hpRemaining: hp,
            maxHp,
          });
        }
        return;
      }

      pushHud();
    },

    render(c: CanvasRenderingContext2D, width: number, height: number) {
      drawStageBackdrop(c, getStageForLevel(lid).id, width, height, 0.52);

      const { ax, ay, aw, ah } = getArenaBounds(width, height);
      c.fillStyle =
        lid === 33
          ? 'rgba(7, 42, 28, 0.72)'
          : lid === 15
          ? 'rgba(21, 13, 33, 0.72)'
          : 'rgba(13, 15, 20, 0.72)';
      c.strokeStyle = 'rgba(255, 46, 99, 0.30)';
      c.lineWidth = 2;
      c.fillRect(ax, ay, aw, ah);
      c.strokeRect(ax, ay, aw, ah);

      // Conveyor belts (16)
      if (lid === 16) {
        c.fillStyle = 'rgba(255, 46, 99, 0.28)';
        c.fillRect(ax, ay, aw * 0.08, ah);
        c.fillRect(ax + aw * 0.92, ay, aw * 0.08, ah);
        const offset = (animTime * 80) % 40;
        c.strokeStyle = 'rgba(251, 191, 36, 0.28)';
        c.lineWidth = 2;
        for (let x = offset; x < aw; x += 40) {
          c.beginPath();
          c.moveTo(ax + x, ay + ah * 0.12);
          c.lineTo(ax + x + 12, ay + ah * 0.24);
          c.lineTo(ax + x, ay + ah * 0.35);
          c.stroke();
        }
      }

      // Grid tiles (8, 18, 33, 37, 41)
      if (lid === 8 || lid === 18 || lid === 33 || lid === 37 || lid === 41) {
        const tw = aw / cols;
        const th = ah / rows;
        for (const t of tiles) {
          const tx = ax + t.c * tw + 3;
          const ty = ay + t.r * th + 3;
          const w = tw - 6;
          const h = th - 6;
          if (t.state === 'gone') {
            c.fillStyle = lid === 33 ? '#064e3b' : '#040507';
            c.fillRect(tx, ty, w, h);
            continue;
          }
          c.fillStyle =
            t.state === 'hot'
              ? 'rgba(255, 46, 99, 0.55)'
              : t.state === 'charging' || t.state === 'cracked'
              ? 'rgba(245, 158, 11, 0.35)'
              : lid === 33
              ? '#334155'
              : '#161a24';
          c.strokeStyle =
            t.state === 'hot'
              ? '#ff2e63'
              : t.state === 'charging' || t.state === 'cracked'
              ? '#f59e0b'
              : 'rgba(255,255,255,0.12)';
          c.lineWidth = 1.5;
          c.fillRect(tx, ty, w, h);
          c.strokeRect(tx, ty, w, h);
        }
      }

      // Safe Dome / Shield Drone (15, 38)
      if (lid === 15 || lid === 38) {
        const dx = ax + domeX * aw;
        const dy = ay + domeY * ah;
        const rPx = domeR * Math.min(aw, ah);
        c.fillStyle = lid === 38 ? 'rgba(56, 189, 248, 0.20)' : 'rgba(16, 185, 129, 0.22)';
        c.strokeStyle = lid === 38 ? '#38bdf8' : '#10b981';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(dx, dy, rPx, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        drawSprite(
          c,
          lid === 38 ? POWERUP_SPRITES.shield : VFX_SPRITES.auraCyan,
          dx,
          dy,
          36,
          36,
          { alpha: 0.75 }
        );
      }

      // Shrinking Ring (48)
      if (lid === 48) {
        const ringR = Math.max(0.22, 0.48 - (1 - timeLeft / totalTime) * 0.24) * Math.min(aw, ah);
        c.strokeStyle = '#ff2e63';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(ax + aw * 0.5, ay + ah * 0.5, ringR, 0, Math.PI * 2);
        c.stroke();
      }

      // Rotating Laser Web (34, 37, 41, 45)
      if (lid === 34 || lid === 37 || lid === 41 || lid === 45) {
        const cx = ax + aw * 0.5;
        const cy = ay + ah * 0.5;
        const len = Math.max(aw, ah) * 0.6;
        const spokeCount = lid === 34 ? 4 : lid === 41 ? 3 : 2;
        c.strokeStyle = '#ff2e63';
        c.lineWidth = 4;
        for (let s = 0; s < spokeCount; s++) {
          const ang = spokeAngle + (s * Math.PI * 2) / spokeCount;
          c.beginPath();
          c.moveTo(cx, cy);
          c.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
          c.stroke();
        }
        c.fillStyle = '#27272a';
        c.beginPath();
        c.arc(cx, cy, 18, 0, Math.PI * 2);
        c.fill();
      }

      // Meteors / Bombs (31, 45)
      for (const m of meteors) {
        const mx = ax + m.x * aw;
        const my = ay + m.y * ah;
        const mr = m.r * Math.min(aw, ah);
        const prog = 1 - m.timer / m.maxTimer;
        c.strokeStyle = '#ff2e63';
        c.fillStyle = 'rgba(255, 46, 99, 0.16)';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(mx, my, mr, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        drawSprite(
          c,
          prog > 0.72 ? VFX_SPRITES.explosionFire : VFX_SPRITES.reticlePurple,
          mx,
          my,
          mr * 1.9,
          mr * 1.9,
          { alpha: 0.78 }
        );
        c.beginPath();
        c.arc(mx, my, mr * prog, 0, Math.PI * 2);
        c.stroke();
      }

      // Pickups
      const pickupSpriteUrl =
        lid === 26
          ? POWERUP_SPRITES.shield
          : lid === 16
          ? POWERUP_SPRITES.lightning
          : COLLECTIBLE_SPRITES.keyGold;
      const hasPickupSprite = Boolean(getCachedImage(pickupSpriteUrl));
      for (const p of pickups) {
        if (p.done) continue;
        const ix = ax + p.x * aw;
        const iy = ay + p.y * ah;
        if (hasPickupSprite) {
          drawSprite(c, pickupSpriteUrl, ix, iy + Math.sin(animTime * 4) * 2.5, 28, 28);
        } else {
          c.fillStyle = lid === 26 ? '#38bdf8' : '#fbbf24';
          c.beginPath();
          c.arc(ix, iy, 11, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = '#07080a';
          c.font = '700 10px "JetBrains Mono", monospace';
          c.textAlign = 'center';
          c.fillText(lid === 26 ? 'S' : lid === 16 ? 'SW' : 'K', ix, iy + 3.5);
        }
      }

      // AI Runners (13)
      for (const r of runners) {
        const rx = ax + r.x * aw;
        const ry = ay + r.y * ah;
        drawContender(
          c,
          rx,
          ry,
          14,
          {
            characterId: `char_${r.label}`,
            numberLabel: r.label,
            suitColor: r.suitColor,
            stripeColor: '#e2e8f0',
            accentColor: '#10b981',
          },
          { walkPhase: r.walkPhase, label: r.label }
        );
        if (r.hasBomb) {
          c.strokeStyle = '#ff2e63';
          c.lineWidth = 3;
          c.beginPath();
          c.arc(rx, ry, 22, 0, Math.PI * 2);
          c.stroke();
          drawSprite(c, TRAP_SPRITES.bomb, rx, ry - 26, 22, 22);
        }
      }

      // Seeker Drones (41, 48)
      for (const d of drones) {
        const dx = ax + d.x * aw;
        const dy = ay + d.y * ah;
        if (!drawSprite(c, TRAP_SPRITES.sawblade, dx, dy, 28, 28, { rotation: animTime * 9 })) {
          c.fillStyle = '#ff2e63';
          c.strokeStyle = '#fff';
          c.lineWidth = 2;
          c.beginPath();
          c.arc(dx, dy, 12, 0, Math.PI * 2);
          c.fill();
          c.stroke();
        }
      }

      // Player
      const playerPx = ax + px * aw;
      const playerPy = ay + py * ah;
      if (playerHasBomb) {
        c.strokeStyle = '#ff2e63';
        c.lineWidth = 3.5;
        c.beginPath();
        c.arc(playerPx, playerPy, 24 + Math.sin(animTime * 16) * 3, 0, Math.PI * 2);
        c.stroke();
        drawSprite(c, TRAP_SPRITES.bomb, playerPx, playerPy - 28, 24, 24);
      }
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
