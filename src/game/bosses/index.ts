import {
  BOSS_CARD_URLS,
  BOSS_SPRITES,
  drawSprite,
  drawStageBackdrop,
  getCachedImage,
  VFX_SPRITES,
} from '../assets';
import { drawContender, drawMaskedGuard, type LevelContext } from '../levelContext';
import { getDifficultyConfig, getStageForLevel } from '../rules';
import type { InputState, LevelEngine } from '../types';

interface BossProjectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  homing?: boolean;
  color: string;
  life: number;
}

interface ShadowClone {
  x: number;
  y: number;
  hit: boolean;
}

export function createBossLevel(ctx: LevelContext): LevelEngine {
  const cfg = getDifficultyConfig(ctx.difficulty);
  const lid = ctx.levelId; // 10, 20, 30, 40, or 50

  const bossConfigs: Record<
    number,
    {
      name: string;
      title: string;
      bossHp: number;
      playerHp: number;
      time: number;
      arenaBg: string;
      accent: string;
      shape: 'circle' | 'triangle' | 'square';
    }
  > = {
    10: {
      name: 'The Arena Guardian',
      title: 'STAGE 1 BOSS · ENFORCER COLOSSUS',
      bossHp: 180,
      playerHp: 120,
      time: 95,
      arenaBg: '#160b10',
      accent: '#be123c',
      shape: 'square',
    },
    20: {
      name: 'The Shadow Master',
      title: 'STAGE 2 BOSS · PHANTOM ASSASSIN',
      bossHp: 220,
      playerHp: 130,
      time: 100,
      arenaBg: '#0f0a1a',
      accent: '#7e22ce',
      shape: 'triangle',
    },
    30: {
      name: 'The Mind Controller',
      title: 'STAGE 3 BOSS · PSYCHIC ARCHITECT',
      bossHp: 260,
      playerHp: 140,
      time: 105,
      arenaBg: '#081520',
      accent: '#0284c7',
      shape: 'circle',
    },
    40: {
      name: 'The Ultimate Hunter',
      title: 'STAGE 4 BOSS · APEX PREDATOR',
      bossHp: 310,
      playerHp: 150,
      time: 110,
      arenaBg: '#18100a',
      accent: '#c2410c',
      shape: 'triangle',
    },
    50: {
      name: 'The Final Champion',
      title: 'FINAL BOSS · SOVEREIGN OF ONE',
      bossHp: 420,
      playerHp: 180,
      time: 135,
      arenaBg: '#1c1406',
      accent: '#ca8a04',
      shape: 'square',
    },
  };

  const bcfg = bossConfigs[lid] ?? bossConfigs[10];
  const maxHp = bcfg.playerHp + cfg.maxHpBonus * 30;
  let hp = maxHp;
  const bossMaxHp = Math.round(bcfg.bossHp * cfg.aiStrength);
  let bossHp = bossMaxHp;
  let timeLeft = Math.round(bcfg.time * cfg.timeMult);

  let introTimer = 1.8;
  let roared = false;
  let animTime = 0;
  let ended = false;

  // Player state
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
  let polarityInverted = false;
  let polarityTimer = 0;

  // Boss state
  type BossState =
    | 'stalk'
    | 'windup_dash'
    | 'dash'
    | 'windup_slam'
    | 'slam'
    | 'windup_beam'
    | 'beam'
    | 'guard'
    | 'stunned';
  let bx = 0.28;
  let by = 0;
  let bossState: BossState = 'stalk';
  let bossTimer = 1.2;
  let bossDirX = -1;
  let bossDirY = 0;
  let bossWalkPhase = 0;
  let bossHitFlash = 0;
  let bossDealtHit = false;
  let playerDealtHit = false;
  let dashChainLeft = 0;
  let beamAngle = 0;

  const projectiles: BossProjectile[] = [];
  const clones: ShadowClone[] = [];

  let statusBanner = bcfg.title;
  let statusTone: 'safe' | 'danger' | 'neutral' | 'gold' = 'gold';

  const getBossPhase = (): number => {
    const ratio = bossHp / bossMaxHp;
    if (lid === 50) {
      if (ratio > 0.66) return 1;
      if (ratio > 0.33) return 2;
      return 3;
    }
    return ratio > 0.5 ? 1 : 2;
  };

  const pushHud = () => {
    const phase = getBossPhase();
    ctx.updateHud({
      hp: Math.max(0, Math.round(hp)),
      maxHp,
      timeLeft: Math.ceil(timeLeft),
      score: Math.round((bossMaxHp - bossHp) * 16 + hp * 6),
      progressLabel: `Phase ${phase}`,
      progressValue: 1 - bossHp / bossMaxHp,
      statusBanner,
      statusTone,
      bossHp: Math.max(0, Math.round(bossHp)),
      bossMaxHp,
      bossName: bcfg.name,
    });
  };

  pushHud();

  return {
    update(dt: number, simDt: number, input: InputState, width: number, height: number) {
      if (ended) return;
      animTime += simDt;

      // Cinematic Boss Intro
      if (introTimer > 0) {
        if (!roared) {
          roared = true;
          ctx.audio.bossRoar();
          ctx.shake(0.5);
        }
        introTimer = Math.max(0, introTimer - dt);
        pushHud();
        return;
      }

      timeLeft = Math.max(0, timeLeft - simDt);
      if (playerHitFlash > 0) playerHitFlash = Math.max(0, playerHitFlash - dt);
      if (bossHitFlash > 0) bossHitFlash = Math.max(0, bossHitFlash - dt);
      if (invulnTimer > 0) invulnTimer = Math.max(0, invulnTimer - simDt);
      if (attackCooldown > 0) attackCooldown = Math.max(0, attackCooldown - simDt);
      if (dodgeCooldown > 0) dodgeCooldown = Math.max(0, dodgeCooldown - simDt);
      if (polarityTimer > 0) {
        polarityTimer -= simDt;
        if (polarityTimer <= 0) polarityInverted = false;
      }

      const courtScale = Math.min(width * 0.88, height * 0.70, 560);
      const cx = width * 0.5;
      const cy = height * 0.5;

      const phase = getBossPhase();
      const ctrlSign = polarityInverted ? -1 : 1;

      const wantsGuard = input.holdGuard && dodgeTimer <= 0 && attackTimer <= 0;
      if (wantsGuard) guardTimer += simDt;
      else guardTimer = 0;

      if (input.justSecondary && dodgeCooldown <= 0 && dodgeTimer <= 0) {
        dodgeTimer = 0.24;
        dodgeCooldown = 0.78;
        if (Math.hypot(input.moveX, input.moveY) > 0.15) {
          const len = Math.hypot(input.moveX, input.moveY);
          dodgeDirX = (input.moveX / len) * ctrlSign;
          dodgeDirY = (input.moveY / len) * ctrlSign;
        } else {
          dodgeDirX = -facingX;
          dodgeDirY = -facingY;
        }
        ctx.audio.step();
      }

      if (input.justPrimary && attackCooldown <= 0 && dodgeTimer <= 0 && !wantsGuard) {
        attackTimer = 0.22;
        attackCooldown = 0.32;
        playerDealtHit = false;
        ctx.audio.click();
      }

      if (dodgeTimer > 0) {
        dodgeTimer -= simDt;
        px += dodgeDirX * 0.72 * simDt;
        py += dodgeDirY * 0.72 * simDt;
      } else if (!wantsGuard) {
        const moveMag = Math.hypot(input.moveX, input.moveY);
        if (moveMag > 0.12) {
          const spd = attackTimer > 0 ? 0.18 : 0.34;
          px += input.moveX * ctrlSign * spd * simDt;
          py += input.moveY * ctrlSign * spd * simDt;
          facingX = (input.moveX * ctrlSign) / moveMag;
          facingY = (input.moveY * ctrlSign) / moveMag;
          walkPhase += simDt * 14;
        }
      }

      px = Math.max(-0.44, Math.min(0.44, px));
      py = Math.max(-0.42, Math.min(0.42, py));

      const damagePlayer = (dmg: number) => {
        if (dodgeTimer > 0 || invulnTimer > 0) return;
        const actual = wantsGuard ? Math.max(4, Math.round(dmg * 0.35)) : dmg;
        hp = Math.max(0, hp - actual);
        playerHitFlash = 0.16;
        invulnTimer = 0.65;
        ctx.hitstop(0.05);
        ctx.shake(0.75);
        ctx.audio.hit();
        ctx.particles.emitBurst(cx + px * courtScale, cy + py * courtScale, 16, '#ff2e63', 70, 240, 4, 160, 0.45);
      };

      // Player melee strike
      if (attackTimer > 0) {
        attackTimer -= simDt;
        if (!playerDealtHit) {
          // Check shadow clones first (Level 20)
          for (const cl of clones) {
            if (!cl.hit && Math.hypot(cl.x - px, cl.y - py) < 0.18) {
              cl.hit = true;
              ctx.particles.emitBurst(cx + cl.x * courtScale, cy + cl.y * courtScale, 10, '#a855f7', 40, 140, 3, 100, 0.35);
            }
          }
          const dx = bx - px;
          const dy = by - py;
          const dist = Math.hypot(dx, dy);
          if (dist < 0.21) {
            playerDealtHit = true;
            if (bossState === 'guard') {
              ctx.audio.block();
              ctx.particles.emitRing(cx + bx * courtScale, cy + by * courtScale, '#fbbf24', 18, 0.3);
              statusBanner = 'BOSS GUARDED · WAIT FOR OPENING!';
              statusTone = 'gold';
            } else {
              const dmg = bossState === 'stunned' ? 30 : 18;
              bossHp = Math.max(0, bossHp - dmg);
              bossHitFlash = 0.12;
              ctx.hitstop(0.045);
              ctx.shake(0.35);
              ctx.audio.hit();
              ctx.particles.emitBurst(cx + bx * courtScale, cy + by * courtScale, 14, bcfg.accent, 60, 220, 4, 140, 0.4);
              const kLen = Math.max(0.001, dist);
              bx = Math.max(-0.44, Math.min(0.44, bx + (dx / kLen) * 0.045));
              by = Math.max(-0.42, Math.min(0.42, by + (dy / kLen) * 0.045));
            }
          }
        }
      }

      // Boss AI
      bossTimer -= simDt;
      const toPx = px - bx;
      const toPy = py - by;
      const distToP = Math.max(0.001, Math.hypot(toPx, toPy));

      if (bossState === 'stalk') {
        const spd = (0.17 + phase * 0.03) * cfg.aiStrength;
        bx += (toPx / distToP) * spd * simDt;
        by += (toPy / distToP) * spd * simDt;
        bossWalkPhase += simDt * 10;

        if (bossTimer <= 0 || distToP < 0.18) {
          const roll = Math.random();
          if (roll < 0.40) {
            // Dash or Triple-Dash (Boss 40 / 50)
            bossState = 'windup_dash';
            bossTimer = Math.max(0.32, 0.50 - phase * 0.05) / Math.min(1.15, cfg.aiStrength);
            bossDirX = toPx / distToP;
            bossDirY = toPy / distToP;
            bossDealtHit = false;
            dashChainLeft = lid === 40 || (lid === 50 && phase >= 2) ? 2 : 1;
            ctx.audio.warning();
            statusBanner =
              dashChainLeft > 1 ? 'MULTI-DASH INCOMING · DODGE!' : 'BOSS LUNGE · PARRY OR DODGE!';
            statusTone = 'danger';
          } else if (roll < 0.72) {
            bossState = 'windup_slam';
            bossTimer = 0.62;
            bossDealtHit = false;
            ctx.audio.warning();
            statusBanner = 'SHOCKWAVE STOMP · MOVE CLEAR!';
            statusTone = 'danger';
          } else if (roll < 0.90) {
            // Special Boss Signature Attack!
            if (lid === 10 || lid === 50) {
              bossState = 'windup_beam';
              bossTimer = 0.55;
              beamAngle = Math.atan2(toPy, toPx) - 0.8;
              ctx.audio.laserZap();
              statusBanner = 'LASER SWEEP · STAY BEHIND OR DODGE!';
              statusTone = 'danger';
            } else if (lid === 20) {
              // Blink + Shadow Clones
              clones.length = 0;
              clones.push(
                { x: -bx * 0.7, y: 0.25, hit: false },
                { x: 0.25, y: -by * 0.7, hit: false }
              );
              bx = (Math.random() < 0.5 ? -1 : 1) * 0.32;
              by = (Math.random() * 0.6 - 0.3);
              ctx.audio.step();
              bossTimer = 1.1;
              statusBanner = 'SHADOW BLINK · STRIKE THE REAL ASSASSIN!';
              statusTone = 'gold';
            } else if (lid === 30) {
              // Psychic Orbs + Polarity Pulse
              for (let k = 0; k < 4 + phase; k++) {
                const a = (k * Math.PI * 2) / (4 + phase);
                projectiles.push({
                  x: bx,
                  y: by,
                  vx: Math.cos(a) * 0.26,
                  vy: Math.sin(a) * 0.26,
                  r: 0.025,
                  color: '#38bdf8',
                  life: 3.5,
                });
              }
              if (phase >= 2) {
                polarityInverted = true;
                polarityTimer = 2.5;
                statusBanner = 'PSYCHIC INVERT · CONTROLS FLIPPED!';
                statusTone = 'danger';
              } else {
                statusBanner = 'PSYCHIC ORB VOLLEY!';
                statusTone = 'gold';
              }
              bossTimer = 1.4;
            } else if (lid === 40) {
              // Tracking Homing Missiles
              for (let k = -1; k <= 1; k += 2) {
                projectiles.push({
                  x: bx,
                  y: by,
                  vx: (toPx / distToP) * 0.22 + k * 0.08,
                  vy: (toPy / distToP) * 0.22 - k * 0.08,
                  r: 0.026,
                  homing: true,
                  color: '#fb923c',
                  life: 3.2,
                });
              }
              ctx.audio.warning();
              bossTimer = 1.25;
              statusBanner = 'HOMING MISSILES LAUNCHED · DODGE!';
              statusTone = 'danger';
            }
          } else {
            bossState = 'guard';
            bossTimer = 1.05;
            statusBanner = 'BOSS GUARDING';
            statusTone = 'gold';
          }
        }
      } else if (bossState === 'windup_dash') {
        if (bossTimer <= 0) {
          bossState = 'dash';
          bossTimer = 0.24;
          bossDealtHit = false;
          ctx.audio.step();
        }
      } else if (bossState === 'dash') {
        bx = Math.max(-0.44, Math.min(0.44, bx + bossDirX * 0.74 * simDt));
        by = Math.max(-0.42, Math.min(0.42, by + bossDirY * 0.74 * simDt));

        if (!bossDealtHit && distToP < 0.13 && dodgeTimer <= 0 && invulnTimer <= 0) {
          bossDealtHit = true;
          if (wantsGuard && guardTimer <= 0.35) {
            bossState = 'stunned';
            bossTimer = 1.7;
            ctx.hitstop(0.06);
            ctx.audio.block();
            ctx.particles.emitRing(cx + px * courtScale, cy + py * courtScale, '#38bdf8', 24, 0.4);
            statusBanner = 'PARRIED! BOSS STUNNED — UNLEASH COMBO!';
            statusTone = 'safe';
          } else {
            damagePlayer(22);
          }
        }

        if (bossTimer <= 0 && bossState === 'dash') {
          dashChainLeft -= 1;
          if (dashChainLeft > 0) {
            bossState = 'windup_dash';
            bossTimer = 0.28;
            bossDirX = toPx / distToP;
            bossDirY = toPy / distToP;
          } else {
            bossState = 'stalk';
            bossTimer = 1.25;
            statusBanner = 'COUNTER WINDOW!';
            statusTone = 'safe';
          }
        }
      } else if (bossState === 'windup_slam') {
        if (bossTimer <= 0) {
          bossState = 'slam';
          bossTimer = 0.28;
          ctx.shake(0.65);
          ctx.audio.explosion();
          ctx.particles.emitRing(cx + bx * courtScale, cy + by * courtScale, bcfg.accent, 44, 0.45);
          if (distToP < 0.24) damagePlayer(26);
          if (lid === 50 && phase >= 3) {
            // Phase 3 radial shock orbs
            for (let k = 0; k < 6; k++) {
              const a = (k * Math.PI * 2) / 6;
              projectiles.push({
                x: bx,
                y: by,
                vx: Math.cos(a) * 0.28,
                vy: Math.sin(a) * 0.28,
                r: 0.022,
                color: '#fbbf24',
                life: 2.5,
              });
            }
          }
        }
      } else if (bossState === 'windup_beam') {
        if (bossTimer <= 0) {
          bossState = 'beam';
          bossTimer = 1.15;
          ctx.audio.laserZap();
        }
      } else if (bossState === 'beam') {
        beamAngle += simDt * (lid === 50 ? 2.1 : 1.65);
        const angleToPlayer = Math.atan2(py - by, px - bx);
        const diff = Math.abs(Math.atan2(Math.sin(angleToPlayer - beamAngle), Math.cos(angleToPlayer - beamAngle)));
        if (diff < 0.14 && distToP < 0.55) {
          damagePlayer(20);
        }
        if (bossTimer <= 0) {
          bossState = 'stalk';
          bossTimer = 1.2;
          statusBanner = 'BEAM OVERHEATED · STRIKE NOW!';
          statusTone = 'safe';
        }
      } else {
        if (bossTimer <= 0) {
          bossState = 'stalk';
          bossTimer = 1.25;
          statusBanner = `${bcfg.name.toUpperCase()} · PHASE ${phase}`;
          statusTone = 'neutral';
        }
      }

      // Projectiles update
      for (let i = projectiles.length - 1; i >= 0; i--) {
        const pr = projectiles[i];
        pr.life -= simDt;
        if (pr.homing) {
          const dx = px - pr.x;
          const dy = py - pr.y;
          const d = Math.max(0.01, Math.hypot(dx, dy));
          pr.vx += (dx / d) * 0.35 * simDt;
          pr.vy += (dy / d) * 0.35 * simDt;
          const sp = Math.hypot(pr.vx, pr.vy);
          if (sp > 0.28) {
            pr.vx = (pr.vx / sp) * 0.28;
            pr.vy = (pr.vy / sp) * 0.28;
          }
        }
        pr.x += pr.vx * simDt;
        pr.y += pr.vy * simDt;
        if (Math.hypot(px - pr.x, py - pr.y) < pr.r + 0.03) {
          damagePlayer(16);
          projectiles.splice(i, 1);
          continue;
        }
        if (pr.life <= 0 || Math.abs(pr.x) > 0.52 || Math.abs(pr.y) > 0.52) {
          projectiles.splice(i, 1);
        }
      }

      // Victory check
      if (bossHp <= 0) {
        ended = true;
        ctx.hitstop(0.08);
        ctx.shake(0.95);
        ctx.audio.victoryAnthem();
        ctx.particles.emitBurst(cx + bx * courtScale, cy + by * courtScale, 46, '#fbbf24', 90, 340, 6, 150, 0.95);
        pushHud();
        ctx.finishWin({
          detailLabel: `${bcfg.name} defeated with ${Math.ceil(hp)} HP remaining`,
          timeRemaining: timeLeft,
          hpRemaining: hp,
          maxHp,
          bonusScore: lid * 25,
        });
        return;
      }

      // Defeat check
      if (hp <= 0 || timeLeft <= 0) {
        ended = true;
        ctx.audio.eliminate();
        ctx.hitstop(0.07);
        ctx.shake(0.9);
        pushHud();
        ctx.finishLose({
          reason:
            hp <= 0
              ? `Defeated by ${bcfg.name} in the Boss Arena.`
              : `Time expired against ${bcfg.name}.`,
          detailLabel: `Boss HP left: ${Math.round((bossHp / bossMaxHp) * 100)}%`,
          scoreSoFar: Math.round((bossMaxHp - bossHp) * 15),
          timeRemaining: timeLeft,
          hpRemaining: 0,
          maxHp,
        });
        return;
      }

      pushHud();
    },

    render(c: CanvasRenderingContext2D, width: number, height: number) {
      drawStageBackdrop(c, getStageForLevel(lid).id, width, height, 0.48);

      const courtScale = Math.min(width * 0.88, height * 0.70, 660);
      const cx = width * 0.5;
      const cy = height * 0.5;

      c.fillStyle = lid === 50 ? 'rgba(24, 20, 13, 0.76)' : 'rgba(18, 19, 24, 0.72)';
      c.strokeStyle = lid === 50 ? 'rgba(251, 191, 36, 0.55)' : 'rgba(255,255,255,0.24)';
      c.lineWidth = 3;
      c.beginPath();
      c.roundRect(cx - courtScale * 0.5, cy - courtScale * 0.48, courtScale, courtScale * 0.96, 16);
      c.fill();
      c.stroke();

      // Arena Chalk Emblem
      c.strokeStyle = lid === 50 ? 'rgba(251, 191, 36, 0.25)' : 'rgba(244, 244, 246, 0.20)';
      c.lineWidth = 3;
      c.beginPath();
      c.arc(cx, cy, courtScale * 0.26, 0, Math.PI * 2);
      c.stroke();

      const bossPx = cx + bx * courtScale;
      const bossPy = cy + by * courtScale;

      // Sweeping Boss Laser Beam
      if (bossState === 'beam' || bossState === 'windup_beam') {
        c.strokeStyle = bossState === 'beam' ? '#ff2e63' : 'rgba(251, 191, 36, 0.65)';
        c.lineWidth = bossState === 'beam' ? 10 : 3;
        c.beginPath();
        c.moveTo(bossPx, bossPy);
        c.lineTo(
          bossPx + Math.cos(beamAngle) * courtScale * 0.65,
          bossPy + Math.sin(beamAngle) * courtScale * 0.65
        );
        c.stroke();
      }

      if (bossState === 'windup_slam') {
        const pulse = Math.max(0, 1 - bossTimer / 0.62);
        c.strokeStyle = bcfg.accent;
        c.fillStyle = 'rgba(255, 46, 99, 0.16)';
        c.lineWidth = 2.5;
        c.beginPath();
        c.arc(bossPx, bossPy, courtScale * 0.24, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.beginPath();
        c.arc(bossPx, bossPy, courtScale * 0.24 * pulse, 0, Math.PI * 2);
        c.stroke();
      } else if (bossState === 'slam') {
        drawSprite(c, VFX_SPRITES.explosionGold, bossPx, bossPy, courtScale * 0.42, courtScale * 0.42, {
          alpha: 0.72,
        });
      } else if (bossState === 'windup_dash') {
        c.strokeStyle = 'rgba(255, 46, 99, 0.75)';
        c.setLineDash([8, 6]);
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(bossPx, bossPy);
        c.lineTo(bossPx + bossDirX * courtScale * 0.28, bossPy + bossDirY * courtScale * 0.28);
        c.stroke();
        c.setLineDash([]);
      }

      // Shadow Clones (Boss 20)
      const bossSpriteUrl = BOSS_SPRITES[lid];
      for (const cl of clones) {
        if (cl.hit) continue;
        const clx = cx + cl.x * courtScale;
        const cly = cy + cl.y * courtScale;
        c.save();
        c.globalAlpha = 0.5;
        if (!drawSprite(c, bossSpriteUrl, clx, cly, 56, 68)) {
          drawMaskedGuard(c, clx, cly, 20, 'triangle', {
            accent: '#6b21a8',
          });
        }
        c.restore();
      }

      // Boss Projectiles
      for (const pr of projectiles) {
        const prx = cx + pr.x * courtScale;
        const pry = cy + pr.y * courtScale;
        const prPx = pr.r * courtScale;
        const projSprite = pr.homing ? VFX_SPRITES.explosionFire : VFX_SPRITES.sparkCyan;
        if (!drawSprite(c, projSprite, prx, pry, prPx * 2.8, prPx * 2.8)) {
          c.fillStyle = pr.color;
          c.beginPath();
          c.arc(prx, pry, prPx, 0, Math.PI * 2);
          c.fill();
        }
      }

      // Draw Boss Sprite (hidden while cinematic intro banner is displayed)
      const bossImg = introTimer > 0 ? null : getCachedImage(bossSpriteUrl);
      if (introTimer <= 0 && bossImg) {
        const bob = Math.abs(Math.sin(bossWalkPhase)) * 4;
        const bossSize = lid === 50 ? 94 : 84;
        c.save();
        c.fillStyle = 'rgba(0,0,0,0.5)';
        c.beginPath();
        c.ellipse(bossPx, bossPy + 30, 26, 9, 0, 0, Math.PI * 2);
        c.fill();
        if (bossState === 'stunned') {
          c.strokeStyle = '#38bdf8';
          c.lineWidth = 3;
          c.beginPath();
          c.arc(bossPx, bossPy, 36, 0, Math.PI * 2);
          c.stroke();
        }
        drawSprite(c, bossSpriteUrl, bossPx, bossPy - bob - 6, bossSize * 0.85, bossSize);
        if (bossHitFlash > 0) {
          c.fillStyle = 'rgba(255, 255, 255, 0.65)';
          c.beginPath();
          c.arc(bossPx, bossPy - 4, 28, 0, Math.PI * 2);
          c.fill();
        }
        if (bossState === 'windup_dash' || bossState === 'windup_slam' || bossState === 'windup_beam') {
          c.fillStyle = '#ff2e63';
          c.font = '800 22px "Barlow Condensed", sans-serif';
          c.textAlign = 'center';
          c.fillText('!', bossPx, bossPy - bossSize * 0.56);
        }
        c.restore();
      } else if (introTimer <= 0) {
        drawMaskedGuard(c, bossPx, bossPy, lid === 50 ? 26 : 24, bcfg.shape, {
          walkPhase: bossWalkPhase,
          hitFlash: bossHitFlash,
          alerted: bossState === 'windup_dash' || bossState === 'windup_slam' || bossState === 'windup_beam',
          accent: bossState === 'stunned' ? '#38bdf8' : bcfg.accent,
          crown: lid === 50 || lid === 40,
        });
      }

      if (bossState === 'guard') {
        c.strokeStyle = '#fbbf24';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(bossPx, bossPy, 36, 0, Math.PI * 2);
        c.stroke();
      }

      // Player
      const playerPx = cx + px * courtScale;
      const playerPy = cy + py * courtScale;
      if (attackTimer > 0) {
        const ang = Math.atan2(facingY, facingX);
        c.strokeStyle = '#10b981';
        c.lineWidth = 5;
        c.beginPath();
        c.arc(playerPx, playerPy, 46, ang - 0.9, ang + 0.9);
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

      // Cinematic Boss Intro Overlay with Portrait Card
      if (introTimer > 0) {
        const bandTop = height * 0.28;
        const bandH = height * 0.44;
        c.fillStyle = 'rgba(5, 6, 9, 0.94)';
        c.fillRect(0, bandTop, width, bandH);
        c.strokeStyle = bcfg.accent;
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(0, bandTop);
        c.lineTo(width, bandTop);
        c.moveTo(0, bandTop + bandH);
        c.lineTo(width, bandTop + bandH);
        c.stroke();

        const cardImg = getCachedImage(BOSS_CARD_URLS[lid]);
        const wideLayout = Boolean(cardImg) && width >= 460;
        if (cardImg && wideLayout) {
          const ch = Math.min(bandH - 32, 178);
          const cw = ch * (cardImg.naturalWidth / cardImg.naturalHeight);
          const cardX = Math.max(24, width * 0.5 - 235);
          const cardY = bandTop + (bandH - ch) * 0.5;
          c.save();
          c.strokeStyle = bcfg.accent;
          c.lineWidth = 2.5;
          c.strokeRect(cardX - 2, cardY - 2, cw + 4, ch + 4);
          c.drawImage(cardImg, cardX, cardY, cw, ch);
          c.restore();
        } else if (cardImg) {
          const ch = Math.min(bandH * 0.48, 108);
          const cw = ch * (cardImg.naturalWidth / cardImg.naturalHeight);
          const cardX = width * 0.5 - cw * 0.5;
          const cardY = bandTop + 14;
          c.save();
          c.strokeStyle = bcfg.accent;
          c.lineWidth = 2;
          c.strokeRect(cardX - 2, cardY - 2, cw + 4, ch + 4);
          c.drawImage(cardImg, cardX, cardY, cw, ch);
          c.restore();
        }

        const textX = wideLayout ? width * 0.5 + 56 : width * 0.5;
        const titleY = wideLayout ? bandTop + bandH * 0.42 : bandTop + bandH * 0.72;
        const nameY = wideLayout ? bandTop + bandH * 0.62 : bandTop + bandH * 0.87;
        c.fillStyle = '#fbbf24';
        c.font = '700 13px "JetBrains Mono", monospace';
        c.textAlign = 'center';
        c.fillText(bcfg.title, textX, titleY);

        c.fillStyle = '#ffffff';
        c.font = `800 ${width < 480 ? 28 : 38}px "Barlow Condensed", sans-serif`;
        c.fillText(bcfg.name.toUpperCase(), textX, nameY);
      }
    },
  };
}
