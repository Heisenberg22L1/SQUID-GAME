import { BOSS_SPRITES, drawSprite, drawStageBackdrop, getCachedImage } from '../assets';
import { drawContender, type LevelContext } from '../levelContext';
import { getDifficultyConfig, getStageForLevel } from '../rules';
import type { InputState, LevelEngine } from '../types';

interface NpcRunner {
  xFrac: number;
  progress: number; // 0 (start) .. 1 (finish)
  speed: number;
  recklessness: number;
  eliminated: boolean;
  finished: boolean;
  label: string;
  walkPhase: number;
  suitColor: string;
}

export function createLevel1(ctx: LevelContext): LevelEngine {
  const cfg = getDifficultyConfig(ctx.difficulty);
  const isSuddenDeath = ctx.levelId === 42;
  const maxHp = isSuddenDeath ? 1 : 2 + cfg.maxHpBonus;
  let hp = maxHp;
  let timeLeft = Math.round((isSuddenDeath ? 35 : 45) * cfg.timeMult);

  let playerProgress = 0; // 0..1
  let playerXOffset = 0;  // -0.3..0.3
  let walkPhase = 0;
  let velocity = 0;
  let hitFlash = 0;
  let invulnTimer = 0;
  let ended = false;

  type LightPhase = 'green' | 'warning' | 'red';
  let phase: LightPhase = 'green';
  let phaseTimer = isSuddenDeath ? 2.1 : 3.1; // Generous opening Green Light
  let dollHeadAngle = 0;
  let laserSweep = 0;
  let stepSoundTimer = 0;

  // NPC competitors
  const npcs: NpcRunner[] = [
    { xFrac: 0.14, progress: 0, speed: 0.14, recklessness: 0.08, eliminated: false, finished: false, label: '067', walkPhase: 0.4, suitColor: '#0f766e' },
    { xFrac: 0.25, progress: 0, speed: 0.16, recklessness: 0.25, eliminated: false, finished: false, label: '199', walkPhase: 1.1, suitColor: '#0f766e' },
    { xFrac: 0.37, progress: 0, speed: 0.13, recklessness: 0.05, eliminated: false, finished: false, label: '218', walkPhase: 2.2, suitColor: '#0f766e' },
    { xFrac: 0.63, progress: 0, speed: 0.17, recklessness: 0.34, eliminated: false, finished: false, label: '101', walkPhase: 0.7, suitColor: '#0f766e' },
    { xFrac: 0.75, progress: 0, speed: 0.15, recklessness: 0.16, eliminated: false, finished: false, label: '240', walkPhase: 1.9, suitColor: '#0f766e' },
    { xFrac: 0.86, progress: 0, speed: 0.12, recklessness: 0.06, eliminated: false, finished: false, label: '001', walkPhase: 2.8, suitColor: '#0f766e' },
  ];

  const pushHud = () => {
    const statusBanner =
      phase === 'green'
        ? 'GREEN LIGHT · SPRINT'
        : phase === 'warning'
        ? 'DOLL TURNING · STOP!'
        : 'RED LIGHT · FREEZE!';
    const statusTone =
      phase === 'green' ? 'safe' : phase === 'warning' ? 'gold' : 'danger';

    ctx.updateHud({
      hp,
      maxHp,
      timeLeft: Math.ceil(timeLeft),
      score: Math.round(playerProgress * 1000),
      progressLabel: `${Math.round(playerProgress * 100)}%`,
      progressValue: playerProgress,
      statusBanner,
      statusTone,
    });
  };

  pushHud();

  return {
    update(dt: number, simDt: number, input: InputState, width: number, height: number) {
      if (ended) return;

      timeLeft = Math.max(0, timeLeft - simDt);
      if (hitFlash > 0) hitFlash = Math.max(0, hitFlash - dt);
      if (invulnTimer > 0) invulnTimer = Math.max(0, invulnTimer - simDt);

      // Phase cycling
      phaseTimer -= simDt;
      if (phaseTimer <= 0) {
        if (phase === 'green') {
          phase = 'warning';
          phaseTimer = Math.max(0.32, 0.55 / cfg.speedMult);
          ctx.audio.warning();
        } else if (phase === 'warning') {
          phase = 'red';
          phaseTimer = 1.6 + Math.random() * 1.4;
          laserSweep = 0;
          ctx.audio.redLight();
        } else {
          phase = 'green';
          phaseTimer = (2.1 + Math.random() * 1.8) / Math.min(1.15, cfg.speedMult);
          ctx.audio.greenLight();
        }
        pushHud();
      }

      // Smooth doll head rotation
      const targetAngle = phase === 'red' ? Math.PI : phase === 'warning' ? Math.PI * 0.45 : 0;
      dollHeadAngle += (targetAngle - dollHeadAngle) * Math.min(1, simDt * 14);
      if (phase === 'red') {
        laserSweep += simDt * 3.5;
      }

      // Player movement input (Up / W / Space / Hold Primary / Joystick up)
      const moveForward =
        input.holdPrimary || input.moveY < -0.25;
      const moveBack = input.moveY > 0.35;
      const steerX = Math.abs(input.moveX) > 0.15 ? input.moveX : 0;

      const maxSpeed = 0.24; // full track in ~4.2s of sprinting
      if (moveForward) {
        velocity = Math.min(maxSpeed, velocity + simDt * 1.6);
      } else if (moveBack) {
        velocity = Math.max(-maxSpeed * 0.5, velocity - simDt * 1.4);
      } else {
        velocity *= Math.pow(0.0005, simDt);
        if (Math.abs(velocity) < 0.015) velocity = 0;
      }

      const movingSpeed = Math.abs(velocity) + Math.abs(steerX) * 0.15;
      if (movingSpeed > 0.02) {
        playerProgress = Math.max(0, Math.min(1, playerProgress + velocity * simDt));
        playerXOffset = Math.max(-0.22, Math.min(0.22, playerXOffset + steerX * 0.35 * simDt));
        walkPhase += simDt * 16;
        stepSoundTimer -= simDt;
        if (stepSoundTimer <= 0) {
          ctx.audio.step();
          stepSoundTimer = 0.19;
        }
      }

      // Red light detection (grace during first 0.14s of turning)
      if (phase === 'red' && invulnTimer <= 0 && movingSpeed > 0.045) {
        hp -= 1;
        hitFlash = 0.18;
        invulnTimer = 1.25;
        velocity = 0;
        ctx.hitstop(0.06);
        ctx.shake(0.85);
        ctx.audio.eliminate();

        const px = width * (0.5 + playerXOffset);
        const startY = height * 0.84;
        const finishY = Math.max(216, height * 0.30);
        const py = startY - playerProgress * (startY - finishY);
        ctx.particles.emitBurst(px, py, 20, '#ff2e63', 80, 280, 5, 220, 0.55);
        ctx.particles.emitRing(px, py, '#ff2e63', 22, 0.4);

        if (hp <= 0) {
          ended = true;
          pushHud();
          ctx.finishLose({
            reason: 'Detected moving during Red Light!',
            detailLabel: `Distance: ${Math.round(playerProgress * 100)}%`,
            scoreSoFar: Math.round(playerProgress * 800),
            timeRemaining: timeLeft,
            hpRemaining: 0,
            maxHp,
          });
          return;
        }
        pushHud();
      }

      // Update NPCs
      for (const npc of npcs) {
        if (npc.eliminated || npc.finished) continue;
        const wantsRun =
          phase === 'green' ||
          (phase === 'warning' && Math.random() < npc.recklessness * 4) ||
          (phase === 'red' && Math.random() < npc.recklessness * 0.05);

        if (wantsRun) {
          npc.progress += npc.speed * simDt;
          npc.walkPhase += simDt * 14;
          if (phase === 'red') {
            npc.eliminated = true;
            const nx = width * npc.xFrac;
            const finishY = Math.max(216, height * 0.30);
            const ny = height * 0.84 - npc.progress * (height * 0.84 - finishY);
            ctx.particles.emitBurst(nx, ny, 14, '#ff2e63', 50, 200, 4, 180, 0.45);
          }
          if (npc.progress >= 1) {
            npc.progress = 1;
            npc.finished = true;
          }
        }
      }

      // Win condition
      if (playerProgress >= 1) {
        ended = true;
        ctx.audio.levelClear();
        ctx.particles.emitBurst(width * 0.5, Math.max(216, height * 0.30), 26, '#10b981', 70, 260, 5, 160, 0.65);
        pushHud();
        ctx.finishWin({
          detailLabel: `Crossed with ${Math.ceil(timeLeft)}s remaining`,
          timeRemaining: timeLeft,
          hpRemaining: hp,
          maxHp,
        });
        return;
      }

      // Timeout
      if (timeLeft <= 0) {
        ended = true;
        ctx.audio.eliminate();
        ctx.shake(0.75);
        pushHud();
        ctx.finishLose({
          reason: 'Time expired before crossing the finish line.',
          detailLabel: `Distance: ${Math.round(playerProgress * 100)}%`,
          scoreSoFar: Math.round(playerProgress * 700),
          timeRemaining: 0,
          hpRemaining: hp,
          maxHp,
        });
        return;
      }

      pushHud();
    },

    render(c: CanvasRenderingContext2D, width: number, height: number) {
      // Stage backdrop
      drawStageBackdrop(c, getStageForLevel(ctx.levelId).id, width, height, 0.34);

      // Arena concrete back wall band (positioned cleanly below HUD on mobile & desktop)
      const wallY = Math.max(176, height * 0.25);
      c.fillStyle = 'rgba(20, 22, 29, 0.62)';
      c.fillRect(0, 0, width, wallY);
      c.fillStyle = phase === 'red' ? 'rgba(255, 46, 99, 0.32)' : 'rgba(16, 185, 129, 0.22)';
      c.fillRect(0, wallY - 6, width, 6);

      // Courtyard sand/asphalt floor perspective lines
      const startY = height * 0.84;
      const finishY = Math.max(216, height * 0.30);
      c.strokeStyle = 'rgba(255,255,255,0.12)';
      c.lineWidth = 1;
      for (let i = 1; i <= 5; i++) {
        const x = (width * i) / 6;
        c.beginPath();
        c.moveTo(width * 0.5 + (x - width * 0.5) * 0.6, finishY);
        c.lineTo(x, startY + 50);
        c.stroke();
      }

      // Finish line
      c.strokeStyle = phase === 'red' ? '#ff2e63' : '#10b981';
      c.lineWidth = 4;
      c.setLineDash([14, 10]);
      c.beginPath();
      c.moveTo(width * 0.08, finishY);
      c.lineTo(width * 0.92, finishY);
      c.stroke();
      c.setLineDash([]);

      c.fillStyle = 'rgba(16, 185, 129, 0.92)';
      c.font = '700 11px "Barlow Condensed", sans-serif';
      c.textAlign = 'left';
      c.fillText('FINISH SAFE ZONE', width * 0.09, finishY - 8);

      // Giant Doll on pedestal
      const dollX = width * 0.5;
      const dollY = Math.max(132, height * 0.185);
      const facingFront = dollHeadAngle > Math.PI * 0.5;

      // Pedestal shadow & glow ring
      const dollGlow = phase === 'red' ? 'rgba(255, 46, 99, 0.34)' : phase === 'warning' ? 'rgba(245, 158, 11, 0.28)' : 'rgba(16, 185, 129, 0.24)';
      c.fillStyle = '#18181f';
      c.strokeStyle = phase === 'red' ? '#ff2e63' : phase === 'warning' ? '#f59e0b' : 'rgba(255,255,255,0.22)';
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(dollX, dollY + 34, 42, 11, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      c.fillStyle = dollGlow;
      c.beginPath();
      c.ellipse(dollX, dollY + 34, 52, 14, 0, 0, Math.PI * 2);
      c.fill();

      const dollImg = getCachedImage(BOSS_SPRITES.doll);
      if (dollImg) {
        c.save();
        if (!facingFront) {
          c.globalAlpha = 0.84;
        }
        drawSprite(c, BOSS_SPRITES.doll, dollX, dollY - 4, 74, 88);
        c.restore();

        if (!facingFront) {
          // Dark hair bun / back-turned indicator over face during Green Light
          c.fillStyle = 'rgba(18, 18, 22, 0.9)';
          c.strokeStyle = 'rgba(16, 185, 129, 0.45)';
          c.lineWidth = 1.5;
          c.beginPath();
          c.arc(dollX, dollY - 28, 12.5, 0, Math.PI * 2);
          c.fill();
          c.stroke();
        } else {
          // Glowing crimson scanner eyes & laser cone
          c.fillStyle = '#ff2e63';
          c.beginPath();
          c.arc(dollX - 5, dollY - 26, 3, 0, Math.PI * 2);
          c.arc(dollX + 5, dollY - 26, 3, 0, Math.PI * 2);
          c.fill();

          const coneGrad = c.createLinearGradient(dollX, dollY - 20, dollX, height);
          coneGrad.addColorStop(0, 'rgba(255, 46, 99, 0.35)');
          coneGrad.addColorStop(1, 'rgba(255, 46, 99, 0.02)');
          c.fillStyle = coneGrad;
          c.beginPath();
          c.moveTo(dollX, dollY - 20);
          const sweepOffset = Math.sin(laserSweep) * width * 0.14;
          c.lineTo(width * 0.06 + sweepOffset, height);
          c.lineTo(width * 0.94 + sweepOffset, height);
          c.closePath();
          c.fill();
        }
      } else {
        // Fallback procedural doll
        c.fillStyle = '#ea580c';
        c.beginPath();
        c.moveTo(dollX - 18, dollY + 2);
        c.lineTo(dollX + 18, dollY + 2);
        c.lineTo(dollX + 26, dollY + 32);
        c.lineTo(dollX - 26, dollY + 32);
        c.closePath();
        c.fill();

        c.fillStyle = '#f5d0a9';
        c.beginPath();
        c.arc(dollX, dollY - 12, 20, 0, Math.PI * 2);
        c.fill();

        if (!facingFront) {
          c.fillStyle = '#18181b';
          c.beginPath();
          c.arc(dollX, dollY - 12, 20.5, 0, Math.PI * 2);
          c.fill();
          c.beginPath();
          c.arc(dollX - 21, dollY - 8, 8, 0, Math.PI * 2);
          c.arc(dollX + 21, dollY - 8, 8, 0, Math.PI * 2);
          c.fill();
        } else {
          c.fillStyle = '#18181b';
          c.beginPath();
          c.arc(dollX, dollY - 15, 20, Math.PI, Math.PI * 2);
          c.fill();
          c.fillStyle = '#ff2e63';
          c.beginPath();
          c.arc(dollX - 7, dollY - 11, 3.5, 0, Math.PI * 2);
          c.arc(dollX + 7, dollY - 11, 3.5, 0, Math.PI * 2);
          c.fill();

          const coneGrad = c.createLinearGradient(dollX, dollY - 10, dollX, height);
          coneGrad.addColorStop(0, 'rgba(255, 46, 99, 0.35)');
          coneGrad.addColorStop(1, 'rgba(255, 46, 99, 0.02)');
          c.fillStyle = coneGrad;
          c.beginPath();
          c.moveTo(dollX, dollY - 10);
          const sweepOffset = Math.sin(laserSweep) * width * 0.14;
          c.lineTo(width * 0.06 + sweepOffset, height);
          c.lineTo(width * 0.94 + sweepOffset, height);
          c.closePath();
          c.fill();
        }
      }

      // Draw NPCs sorted by y
      const entities: Array<{ y: number; draw: () => void }> = npcs.map((npc) => {
        const ny = startY - npc.progress * (startY - finishY);
        const nx = width * npc.xFrac;
        const scale = 0.72 + (1 - npc.progress) * 0.28;
        return {
          y: ny,
          draw: () =>
            drawContender(
              c,
              nx,
              ny,
              15 * scale,
              {
                characterId: `char_${npc.label}`,
                numberLabel: npc.label,
                suitColor: '#115e59',
                stripeColor: '#cbd5e1',
                accentColor: '#10b981',
              },
              {
                walkPhase: npc.walkPhase,
                eliminated: npc.eliminated,
                label: npc.label,
              }
            ),
        };
      });

      const py = startY - playerProgress * (startY - finishY);
      const px = width * (0.5 + playerXOffset);
      const pScale = 0.78 + (1 - playerProgress) * 0.3;

      entities.push({
        y: py,
        draw: () => {
          // Highlight ring beneath player
          c.strokeStyle = invulnTimer > 0 && Math.floor(invulnTimer * 12) % 2 === 0
            ? '#ff2e63'
            : ctx.appearance.accentColor;
          c.lineWidth = 2.5;
          c.beginPath();
          c.ellipse(px, py + 16 * pScale, 16 * pScale, 6 * pScale, 0, 0, Math.PI * 2);
          c.stroke();

          drawContender(c, px, py, 17 * pScale, ctx.appearance, {
            walkPhase,
            hitFlash,
            label: ctx.appearance.numberLabel,
          });
        },
      });

      entities.sort((a, b) => a.y - b.y);
      for (const e of entities) e.draw();

      // Signal light indicator banner on wall
      const lightColor =
        phase === 'green' ? '#10b981' : phase === 'warning' ? '#f59e0b' : '#ff2e63';
      c.fillStyle = lightColor;
      c.beginPath();
      c.arc(width * 0.14, dollY, 12, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.arc(width * 0.86, dollY, 12, 0, Math.PI * 2);
      c.fill();
    },
  };
}
