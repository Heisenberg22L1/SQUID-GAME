import { drawSprite, drawStageBackdrop, VFX_SPRITES } from '../assets';
import { drawContender, drawMaskedGuard, type LevelContext } from '../levelContext';
import { getDifficultyConfig, getStageForLevel } from '../rules';
import type { InputState, LevelEngine } from '../types';

interface FighterEnemy {
  id: string;
  shape: 'circle' | 'triangle' | 'square';
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  state: 'stalk' | 'windup_lunge' | 'lunge' | 'windup_slam' | 'slam' | 'guard' | 'stunned';
  timer: number;
  dirX: number;
  dirY: number;
  walkPhase: number;
  hitFlash: number;
  dealtHit: boolean;
  crown?: boolean;
  accent: string;
}

export function createLevel7(ctx: LevelContext): LevelEngine {
  const cfg = getDifficultyConfig(ctx.difficulty);
  const lid = ctx.levelId;
  const isAmbush = lid === 39;
  const isSemiFinal = lid === 49;

  const maxHp = (isSemiFinal ? 130 : isAmbush ? 120 : 100) + cfg.maxHpBonus * 25;
  let hp = maxHp;
  let timeLeft = Math.round((isSemiFinal ? 90 : isAmbush ? 75 : 70) * cfg.timeMult);

  let px = -0.28;
  let py = 0;
  let facingX = 1;
  let facingY = 0;
  let walkPhase = 0;
  let attackTimer = 0;
  let attackCooldown = 0;
  let dodgeTimer = 0;
  let dodgeCooldown = 0;
  let dodgeDirX = 1;
  let dodgeDirY = 0;
  let guardTimer = 0;
  let playerHitFlash = 0;
  let invulnTimer = 0;
  let animTime = 0;

  let wave = 1;
  const totalWaves = isAmbush ? 3 : 1;

  const spawnWave = (w: number): FighterEnemy[] => {
    if (isSemiFinal) {
      return [
        {
          id: 'lt-1',
          shape: 'triangle',
          x: 0.25,
          y: -0.18,
          hp: Math.round(125 * cfg.aiStrength),
          maxHp: Math.round(125 * cfg.aiStrength),
          state: 'stalk',
          timer: 1.1,
          dirX: -1,
          dirY: 0,
          walkPhase: 0,
          hitFlash: 0,
          dealtHit: false,
          crown: true,
          accent: '#b91c1c',
        },
        {
          id: 'lt-2',
          shape: 'square',
          x: 0.25,
          y: 0.18,
          hp: Math.round(135 * cfg.aiStrength),
          maxHp: Math.round(135 * cfg.aiStrength),
          state: 'stalk',
          timer: 1.7,
          dirX: -1,
          dirY: 0,
          walkPhase: 1.4,
          hitFlash: 0,
          dealtHit: false,
          crown: true,
          accent: '#7c2d12',
        },
      ];
    }

    if (isAmbush) {
      const count = w === 1 ? 2 : w === 2 ? 2 : 3;
      const list: FighterEnemy[] = [];
      for (let i = 0; i < count; i++) {
        const yPos = count === 2 ? (i === 0 ? -0.2 : 0.2) : (i - 1) * 0.22;
        const isCmd = w === 3 && i === 1;
        const eHp = Math.round((isCmd ? 95 : 60 + w * 12) * cfg.aiStrength);
        list.push({
          id: `amb-${w}-${i}`,
          shape: isCmd ? 'square' : w === 1 ? 'circle' : 'triangle',
          x: 0.28,
          y: yPos,
          hp: eHp,
          maxHp: eHp,
          state: 'stalk',
          timer: 0.9 + i * 0.45,
          dirX: -1,
          dirY: 0,
          walkPhase: i * 1.1,
          hitFlash: 0,
          dealtHit: false,
          crown: isCmd,
          accent: isCmd ? '#9f1239' : '#be123c',
        });
      }
      return list;
    }

    const eHp = Math.round(130 * cfg.aiStrength);
    return [
      {
        id: 'enforcer',
        shape: 'square',
        x: 0.25,
        y: 0,
        hp: eHp,
        maxHp: eHp,
        state: 'stalk',
        timer: 1.5,
        dirX: -1,
        dirY: 0,
        walkPhase: 0,
        hitFlash: 0,
        dealtHit: false,
        accent: '#9f1239',
      },
    ];
  };

  let enemies: FighterEnemy[] = spawnWave(1);
  let ended = false;
  let statusBanner = isSemiFinal
    ? 'SEMI-FINAL · DEFEAT TWIN LIEUTENANTS'
    : isAmbush
    ? 'WAVE 1/3 · DEFEAT SQUAD'
    : 'DEFEAT THE MASKED ENFORCER';
  let statusTone: 'safe' | 'danger' | 'neutral' | 'gold' = 'neutral';

  const getTotalRemainingHp = () => enemies.reduce((s, e) => s + Math.max(0, e.hp), 0);
  const getTotalMaxHp = () => enemies.reduce((s, e) => s + e.maxHp, 0);

  const pushHud = () => {
    const rem = getTotalRemainingHp();
    const tot = Math.max(1, getTotalMaxHp());
    ctx.updateHud({
      hp: Math.max(0, Math.round(hp)),
      maxHp,
      timeLeft: Math.ceil(timeLeft),
      score: Math.round((tot - rem) * 14 + hp * 5 + (wave - 1) * 400),
      progressLabel: isAmbush
        ? `Wave ${wave}/${totalWaves}`
        : `Foe ${Math.max(0, Math.round((rem / tot) * 100))}%`,
      progressValue: 1 - rem / tot,
      statusBanner,
      statusTone,
    });
  };

  pushHud();

  return {
    update(dt: number, simDt: number, input: InputState, width: number, height: number) {
      if (ended) return;
      animTime += simDt;
      timeLeft = Math.max(0, timeLeft - simDt);

      if (playerHitFlash > 0) playerHitFlash = Math.max(0, playerHitFlash - dt);
      if (invulnTimer > 0) invulnTimer = Math.max(0, invulnTimer - simDt);
      if (attackCooldown > 0) attackCooldown = Math.max(0, attackCooldown - simDt);
      if (dodgeCooldown > 0) dodgeCooldown = Math.max(0, dodgeCooldown - simDt);

      const courtScale = Math.min(width * 0.86, height * 0.68, 520);
      const cx = width * 0.5;
      const cy = height * 0.5;

      const wantsGuard = input.holdGuard && dodgeTimer <= 0 && attackTimer <= 0;
      if (wantsGuard) guardTimer += simDt;
      else guardTimer = 0;

      if (input.justSecondary && dodgeCooldown <= 0 && dodgeTimer <= 0) {
        dodgeTimer = 0.24;
        dodgeCooldown = 0.82;
        if (Math.hypot(input.moveX, input.moveY) > 0.15) {
          const len = Math.hypot(input.moveX, input.moveY);
          dodgeDirX = input.moveX / len;
          dodgeDirY = input.moveY / len;
        } else {
          dodgeDirX = -facingX;
          dodgeDirY = -facingY;
        }
        ctx.audio.step();
      }

      if (input.justPrimary && attackCooldown <= 0 && dodgeTimer <= 0 && !wantsGuard) {
        attackTimer = 0.22;
        attackCooldown = 0.34;
        for (const e of enemies) e.dealtHit = false;
        ctx.audio.click();
      }

      if (dodgeTimer > 0) {
        dodgeTimer -= simDt;
        px += dodgeDirX * 0.70 * simDt;
        py += dodgeDirY * 0.70 * simDt;
      } else if (!wantsGuard) {
        const moveMag = Math.hypot(input.moveX, input.moveY);
        if (moveMag > 0.12) {
          const spd = attackTimer > 0 ? 0.17 : 0.33;
          px += input.moveX * spd * simDt;
          py += input.moveY * spd * simDt;
          facingX = input.moveX / moveMag;
          facingY = input.moveY / moveMag;
          walkPhase += simDt * 14;
        }
      }

      px = Math.max(-0.44, Math.min(0.44, px));
      py = Math.max(-0.42, Math.min(0.42, py));

      // Player attack sweep hits all enemies in range
      if (attackTimer > 0) {
        attackTimer -= simDt;
        for (const e of enemies) {
          if (e.hp <= 0 || e.dealtHit) continue;
          const dx = e.x - px;
          const dy = e.y - py;
          const dist = Math.hypot(dx, dy);
          if (dist < 0.20) {
            e.dealtHit = true;
            if (e.state === 'guard') {
              ctx.audio.block();
              ctx.particles.emitRing(cx + e.x * courtScale, cy + e.y * courtScale, '#fbbf24', 16, 0.28);
              statusBanner = 'ENEMY GUARDED · TIME COUNTER!';
              statusTone = 'gold';
            } else {
              const dmg = e.state === 'stunned' ? 26 : 16;
              e.hp = Math.max(0, e.hp - dmg);
              e.hitFlash = 0.12;
              ctx.hitstop(0.04);
              ctx.shake(0.32);
              ctx.audio.hit();
              ctx.particles.emitBurst(
                cx + e.x * courtScale,
                cy + e.y * courtScale,
                14,
                '#ff2e63',
                60,
                220,
                4,
                140,
                0.4
              );
              const kLen = Math.max(0.001, dist);
              e.x = Math.max(-0.44, Math.min(0.44, e.x + (dx / kLen) * 0.05));
              e.y = Math.max(-0.42, Math.min(0.42, e.y + (dy / kLen) * 0.05));
            }
          }
        }
      }

      // Enemy updates
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - dt);
        e.timer -= simDt;
        const toPx = px - e.x;
        const toPy = py - e.y;
        const distToP = Math.max(0.001, Math.hypot(toPx, toPy));

        if (e.state === 'stalk') {
          const spd = (isSemiFinal ? 0.21 : 0.185) * cfg.aiStrength;
          e.x += (toPx / distToP) * spd * simDt;
          e.y += (toPy / distToP) * spd * simDt;
          e.walkPhase += simDt * 10;

          if (e.timer <= 0 || distToP < 0.17) {
            const roll = Math.random();
            if (roll < 0.52) {
              e.state = 'windup_lunge';
              e.timer = 0.52 / Math.min(1.15, cfg.aiStrength);
              e.dirX = toPx / distToP;
              e.dirY = toPy / distToP;
              e.dealtHit = false;
              ctx.audio.warning();
              statusBanner = 'LUNGE INCOMING · GUARD OR DODGE!';
              statusTone = 'danger';
            } else if (roll < 0.84) {
              e.state = 'windup_slam';
              e.timer = 0.68 / Math.min(1.15, cfg.aiStrength);
              e.dealtHit = false;
              ctx.audio.warning();
              statusBanner = 'SHOCKWAVE SLAM · DODGE CLEAR!';
              statusTone = 'danger';
            } else {
              e.state = 'guard';
              e.timer = 1.1;
            }
          }
        } else if (e.state === 'windup_lunge') {
          if (e.timer <= 0) {
            e.state = 'lunge';
            e.timer = 0.24;
            e.dealtHit = false;
            ctx.audio.step();
          }
        } else if (e.state === 'lunge') {
          e.x = Math.max(-0.44, Math.min(0.44, e.x + e.dirX * 0.72 * simDt));
          e.y = Math.max(-0.42, Math.min(0.42, e.y + e.dirY * 0.72 * simDt));

          if (!e.dealtHit && distToP < 0.13 && dodgeTimer <= 0 && invulnTimer <= 0) {
            e.dealtHit = true;
            if (wantsGuard && guardTimer <= 0.35) {
              e.state = 'stunned';
              e.timer = 1.6;
              ctx.hitstop(0.06);
              ctx.audio.block();
              ctx.particles.emitRing(cx + px * courtScale, cy + py * courtScale, '#38bdf8', 24, 0.4);
              statusBanner = 'PARRIED! STRIKE STUNNED FOE!';
              statusTone = 'safe';
            } else {
              const dmg = wantsGuard ? 6 : isSemiFinal ? 20 : 18;
              hp = Math.max(0, hp - dmg);
              playerHitFlash = 0.16;
              invulnTimer = 0.65;
              ctx.hitstop(0.05);
              ctx.shake(0.75);
              ctx.audio.hit();
              ctx.particles.emitBurst(cx + px * courtScale, cy + py * courtScale, 16, '#ff2e63', 70, 240, 4, 180, 0.45);
            }
          }
          if (e.timer <= 0 && e.state === 'lunge') {
            e.state = 'stalk';
            e.timer = 1.25;
            statusBanner = 'COUNTER WINDOW!';
            statusTone = 'safe';
          }
        } else if (e.state === 'windup_slam') {
          if (e.timer <= 0) {
            e.state = 'slam';
            e.timer = 0.26;
            ctx.shake(0.55);
            ctx.audio.hit();
            ctx.particles.emitRing(cx + e.x * courtScale, cy + e.y * courtScale, '#ff2e63', 40, 0.42);
            if (distToP < 0.22 && dodgeTimer <= 0 && invulnTimer <= 0) {
              const dmg = wantsGuard ? 9 : 22;
              hp = Math.max(0, hp - dmg);
              playerHitFlash = 0.18;
              invulnTimer = 0.7;
              ctx.hitstop(0.05);
              ctx.particles.emitBurst(cx + px * courtScale, cy + py * courtScale, 15, '#ff2e63', 80, 230, 4, 160, 0.42);
            }
          }
        } else {
          if (e.timer <= 0) {
            e.state = 'stalk';
            e.timer = 1.25;
          }
        }
      }

      // Check wave clear / victory
      const aliveCount = enemies.filter((e) => e.hp > 0).length;
      if (aliveCount === 0) {
        if (wave < totalWaves) {
          wave += 1;
          enemies = spawnWave(wave);
          hp = Math.min(maxHp, hp + 20);
          ctx.audio.pickup();
          statusBanner = `WAVE ${wave}/${totalWaves} INCOMING!`;
          statusTone = 'gold';
        } else {
          ended = true;
          ctx.hitstop(0.08);
          ctx.shake(0.9);
          ctx.audio.victoryAnthem();
          ctx.particles.emitBurst(cx, cy, 42, '#fbbf24', 90, 340, 6, 150, 0.9);
          pushHud();
          ctx.finishWin({
            detailLabel: isSemiFinal
              ? `Twin Lieutenants defeated with ${Math.ceil(hp)} HP left`
              : isAmbush
              ? `Cleared all 3 ambush squads with ${Math.ceil(hp)} HP`
              : `Enforcer defeated with ${Math.ceil(hp)} HP remaining`,
            timeRemaining: timeLeft,
            hpRemaining: hp,
            maxHp,
            bonusScore: isSemiFinal ? 750 : 400,
          });
          return;
        }
      }

      if (hp <= 0 || timeLeft <= 0) {
        ended = true;
        ctx.audio.eliminate();
        ctx.hitstop(0.07);
        ctx.shake(0.9);
        pushHud();
        ctx.finishLose({
          reason:
            hp <= 0
              ? 'Eliminated inside the Squid Court combat trial.'
              : 'Time expired before defeating all opponents.',
          detailLabel: isAmbush ? `Reached Wave ${wave}/${totalWaves}` : `Time left: ${Math.ceil(timeLeft)}s`,
          scoreSoFar: (wave - 1) * 400 + Math.round((getTotalMaxHp() - getTotalRemainingHp()) * 12),
          timeRemaining: timeLeft,
          hpRemaining: 0,
          maxHp,
        });
        return;
      }

      pushHud();
    },

    render(c: CanvasRenderingContext2D, width: number, height: number) {
      drawStageBackdrop(c, getStageForLevel(ctx.levelId).id, width, height, 0.52);

      const courtScale = Math.min(width * 0.88, height * 0.72, 660);
      const cx = width * 0.5;
      const cy = height * 0.5;

      c.fillStyle = 'rgba(19, 19, 24, 0.78)';
      c.strokeStyle = isSemiFinal ? 'rgba(251, 191, 36, 0.55)' : 'rgba(255,255,255,0.24)';
      c.lineWidth = 3;
      c.beginPath();
      c.roundRect(cx - courtScale * 0.5, cy - courtScale * 0.48, courtScale, courtScale * 0.96, 16);
      c.fill();
      c.stroke();

      // Chalk Squid Court markings
      c.strokeStyle = 'rgba(244, 244, 246, 0.24)';
      c.lineWidth = 3.5;
      c.beginPath();
      c.arc(cx, cy - courtScale * 0.3, courtScale * 0.1, 0, Math.PI * 2);
      c.stroke();

      c.beginPath();
      c.moveTo(cx, cy - courtScale * 0.3);
      c.lineTo(cx - courtScale * 0.24, cy + courtScale * 0.24);
      c.lineTo(cx + courtScale * 0.24, cy + courtScale * 0.24);
      c.closePath();
      c.stroke();

      c.strokeRect(
        cx - courtScale * 0.24,
        cy - courtScale * 0.16,
        courtScale * 0.48,
        courtScale * 0.48
      );

      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const ex = cx + e.x * courtScale;
        const ey = cy + e.y * courtScale;

        if (e.state === 'windup_slam') {
          const pulse = Math.max(0, 1 - e.timer / 0.68);
          c.strokeStyle = '#ff2e63';
          c.fillStyle = 'rgba(255, 46, 99, 0.15)';
          c.lineWidth = 2.5;
          c.beginPath();
          c.arc(ex, ey, courtScale * 0.22, 0, Math.PI * 2);
          c.fill();
          c.stroke();
          c.beginPath();
          c.arc(ex, ey, courtScale * 0.22 * pulse, 0, Math.PI * 2);
          c.stroke();
        } else if (e.state === 'slam') {
          drawSprite(c, VFX_SPRITES.explosionFire, ex, ey, courtScale * 0.38, courtScale * 0.38, { alpha: 0.72 });
        } else if (e.state === 'windup_lunge') {
          c.strokeStyle = 'rgba(255, 46, 99, 0.75)';
          c.setLineDash([8, 6]);
          c.lineWidth = 3;
          c.beginPath();
          c.moveTo(ex, ey);
          c.lineTo(ex + e.dirX * courtScale * 0.26, ey + e.dirY * courtScale * 0.26);
          c.stroke();
          c.setLineDash([]);
        }

        const hpBarW = 64;
        c.fillStyle = 'rgba(0,0,0,0.75)';
        c.fillRect(ex - hpBarW / 2, ey - 38, hpBarW, 6);
        c.fillStyle = e.state === 'stunned' ? '#38bdf8' : '#ff2e63';
        c.fillRect(ex - hpBarW / 2, ey - 38, hpBarW * (e.hp / e.maxHp), 6);

        drawMaskedGuard(c, ex, ey, 20, e.shape, {
          walkPhase: e.walkPhase,
          hitFlash: e.hitFlash,
          alerted: e.state === 'windup_lunge' || e.state === 'windup_slam',
          accent: e.state === 'stunned' ? '#38bdf8' : e.accent,
          crown: e.crown,
        });

        if (e.state === 'guard') {
          c.strokeStyle = '#fbbf24';
          c.lineWidth = 3;
          c.beginPath();
          c.arc(ex, ey, 30, 0, Math.PI * 2);
          c.stroke();
        }
      }

      const playerPx = cx + px * courtScale;
      const playerPy = cy + py * courtScale;
      if (attackTimer > 0) {
        const ang = Math.atan2(facingY, facingX);
        c.strokeStyle = '#10b981';
        c.lineWidth = 5;
        c.beginPath();
        c.arc(playerPx, playerPy, 44, ang - 0.9, ang + 0.9);
        c.stroke();
      }

      drawContender(c, playerPx, playerPy, 20, ctx.appearance, {
        walkPhase,
        hitFlash: playerHitFlash,
        label: ctx.appearance.numberLabel,
        shielded: guardTimer > 0 || dodgeTimer > 0,
        scaleX: dodgeTimer > 0 ? 1.2 : 1,
        scaleY: dodgeTimer > 0 ? 0.82 : 1,
        animTime,
      });
    },
  };
}
