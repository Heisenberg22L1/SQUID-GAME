import { drawSprite, drawStageBackdrop, VFX_SPRITES } from '../assets';
import { drawContender, drawMaskedGuard, type LevelContext } from '../levelContext';
import { getDifficultyConfig, getStageForLevel } from '../rules';
import type { InputState, LevelEngine } from '../types';

export function createLevel3(ctx: LevelContext): LevelEngine {
  const cfg = getDifficultyConfig(ctx.difficulty);
  const isHyper = ctx.levelId === 44;
  let timeLeft = Math.round((isHyper ? 28 : 32) * cfg.timeMult);

  // Rope balance: -1 (AI wins, left) to +1 (Player wins, right)
  let ropePos = 0;
  let playerPullForce = 0;
  let aiPullForce = 0;
  let tapCount = 0;
  let comboBurst = 0;

  // Surge boost windows
  let surgeTimer = 2.8;
  let surgeActive = false;

  // AI heave telegraph
  let aiHeaveTimer = 3.5;
  let aiWarning = false;
  let aiHeaving = false;
  let ended = false;

  const pushHud = () => {
    const progress = Math.max(0, Math.min(1, (ropePos + 1) / 2));
    const statusBanner = surgeActive
      ? 'SURGE WINDOW · TAP FAST (2X)!'
      : aiWarning
      ? 'RIVAL HEAVE INCOMING · HOLD LINE!'
      : 'RAPID TAP TO PULL!';
    const statusTone = surgeActive ? 'gold' : aiWarning ? 'danger' : 'neutral';

    ctx.updateHud({
      hp: Math.max(1, Math.round(progress * 3)),
      maxHp: 3,
      timeLeft: Math.ceil(timeLeft),
      score: Math.round(tapCount * 22 + Math.max(0, ropePos) * 600),
      progressLabel: `${Math.round(progress * 100)}%`,
      progressValue: progress,
      statusBanner,
      statusTone,
    });
  };

  pushHud();

  return {
    update(dt: number, simDt: number, input: InputState, width: number, height: number) {
      if (ended) return;
      timeLeft = Math.max(0, timeLeft - simDt);

      // Surge timing
      surgeTimer -= simDt;
      if (surgeTimer <= 0) {
        if (!surgeActive) {
          surgeActive = true;
          surgeTimer = 1.4;
          ctx.audio.pickup();
        } else {
          surgeActive = false;
          surgeTimer = 3.2;
        }
      }

      // AI heave cycle
      aiHeaveTimer -= simDt;
      if (aiHeaveTimer <= 0) {
        if (!aiWarning && !aiHeaving) {
          aiWarning = true;
          aiHeaveTimer = 0.6;
          ctx.audio.warning();
        } else if (aiWarning) {
          aiWarning = false;
          aiHeaving = true;
          aiHeaveTimer = 1.1;
        } else {
          aiHeaving = false;
          aiHeaveTimer = 3.2 / cfg.aiStrength;
        }
      }

      // Player pull taps
      const tapped =
        input.justPrimary || input.pointerJustPressed || input.justRight || input.justUp;
      if (tapped) {
        tapCount += 1;
        const boost = surgeActive ? 0.32 : 0.165;
        playerPullForce = Math.min(1.4, playerPullForce + boost);
        comboBurst = 0.15;
        ctx.audio.step();
        ctx.particles.emitBurst(
          width * 0.5 + ropePos * width * 0.18,
          height * 0.54,
          surgeActive ? 8 : 4,
          surgeActive ? '#fbbf24' : '#10b981',
          40,
          150,
          3.5,
          120,
          0.32
        );
      }
      if (comboBurst > 0) comboBurst -= dt;

      // AI pull baseline + heave bursts
      const hyperMult = isHyper ? 1.24 : 1.0;
      const baseAi = 0.52 * cfg.aiStrength * hyperMult;
      const heaveBonus = aiHeaving ? 0.34 * cfg.aiStrength * hyperMult : 0;
      aiPullForce += (baseAi + heaveBonus - aiPullForce) * Math.min(1, simDt * 6);
      playerPullForce *= Math.pow(0.14, simDt);

      const netDelta = (playerPullForce - aiPullForce) * 0.42 * simDt;
      ropePos = Math.max(-1.02, Math.min(1.02, ropePos + netDelta));

      if (ropePos >= 1) {
        ended = true;
        ctx.audio.levelClear();
        ctx.shake(0.65);
        ctx.particles.emitBurst(width * 0.5, height * 0.52, 28, '#10b981', 80, 280, 5, 160, 0.7);
        pushHud();
        ctx.finishWin({
          detailLabel: `Won with ${tapCount} pulls`,
          timeRemaining: timeLeft,
          hpRemaining: 3,
          maxHp: 3,
          bonusScore: tapCount * 10,
        });
        return;
      }

      if (ropePos <= -1 || timeLeft <= 0) {
        ended = true;
        ctx.audio.eliminate();
        ctx.hitstop(0.06);
        ctx.shake(0.9);
        ctx.particles.emitBurst(width * 0.5, height * 0.55, 24, '#ff2e63', 70, 260, 5, 220, 0.6);
        pushHud();
        ctx.finishLose({
          reason:
            ropePos <= -1
              ? 'Your squad was dragged into the chasm!'
              : 'Time expired before pulling the rival team over!',
          detailLabel: `${tapCount} pulls`,
          scoreSoFar: tapCount * 15,
          timeRemaining: timeLeft,
          hpRemaining: 0,
          maxHp: 3,
        });
        return;
      }

      pushHud();
    },

    render(c: CanvasRenderingContext2D, width: number, height: number) {
      drawStageBackdrop(c, getStageForLevel(ctx.levelId).id, width, height, 0.46);

      const midY = height * 0.58;
      const chasmW = width * 0.22;

      // Left platform (Rival AI side)
      c.fillStyle = 'rgba(31, 41, 55, 0.9)';
      c.fillRect(0, midY, width * 0.5 - chasmW * 0.5, height - midY);
      // Right platform (Player side)
      c.fillRect(width * 0.5 + chasmW * 0.5, midY, width * 0.5, height - midY);

      // Chasm glow
      const chasmGrad = c.createLinearGradient(0, midY, 0, height);
      chasmGrad.addColorStop(0, 'rgba(255, 46, 99, 0.30)');
      chasmGrad.addColorStop(1, 'rgba(0, 0, 0, 0.95)');
      c.fillStyle = chasmGrad;
      c.fillRect(width * 0.5 - chasmW * 0.5, midY, chasmW, height - midY);

      // Rope shift in pixels
      const ropeShift = ropePos * (width * 0.16);
      const ropeY = midY - 22;

      // Rope line
      c.strokeStyle = surgeActive ? '#fbbf24' : '#d6d3d1';
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(width * 0.08 + ropeShift, ropeY);
      c.lineTo(width * 0.92 + ropeShift, ropeY);
      c.stroke();

      // Center crimson flag marker + Surge VFX
      const flagX = width * 0.5 + ropeShift;
      if (surgeActive) {
        drawSprite(c, VFX_SPRITES.beamGold, flagX, ropeY - 12, 86, 86, { alpha: 0.72 });
      }
      c.fillStyle = '#ff2e63';
      c.beginPath();
      c.moveTo(flagX, ropeY);
      c.lineTo(flagX - 10, ropeY + 26);
      c.lineTo(flagX + 10, ropeY + 26);
      c.closePath();
      c.fill();

      // Rival AI team (left)
      for (let i = 0; i < 3; i++) {
        const rx = width * (0.14 + i * 0.07) + ropeShift * 0.6;
        drawMaskedGuard(c, rx, midY - 18, 15, i === 0 ? 'square' : 'triangle', {
          walkPhase: comboBurst * 10 + i,
          alerted: aiWarning,
          accent: '#e11d48',
        });
      }

      // Player team (right)
      for (let i = 0; i < 3; i++) {
        const px = width * (0.72 + i * 0.07) + ropeShift * 0.6;
        if (i === 0) {
          drawContender(c, px, midY - 18, 17, ctx.appearance, {
            walkPhase: tapCount * 0.8,
            label: ctx.appearance.numberLabel,
            scaleX: comboBurst > 0 ? 1.1 : 1,
            scaleY: comboBurst > 0 ? 0.92 : 1,
          });
        } else {
          const teammateLabel = i === 1 ? '199' : '067';
          drawContender(
            c,
            px,
            midY - 18,
            15,
            {
              characterId: `char_${teammateLabel}`,
              numberLabel: teammateLabel,
              suitColor: '#0f766e',
              stripeColor: '#e2e8f0',
              accentColor: '#10b981',
            },
            { walkPhase: tapCount * 0.8 + i }
          );
        }
      }

      // Power Balance Meter (top-center inside canvas)
      const barW = Math.min(340, width * 0.72);
      const barH = 16;
      const barX = (width - barW) / 2;
      const barY = height * 0.24;

      c.fillStyle = '#18181b';
      c.strokeStyle = 'rgba(255,255,255,0.2)';
      c.lineWidth = 2;
      c.beginPath();
      c.roundRect(barX, barY, barW, barH, 8);
      c.fill();
      c.stroke();

      const fillFrac = (ropePos + 1) / 2;
      c.fillStyle = fillFrac > 0.5 ? '#10b981' : '#ff2e63';
      c.beginPath();
      c.roundRect(barX + 2, barY + 2, Math.max(8, (barW - 4) * fillFrac), barH - 4, 6);
      c.fill();

      // Center notch
      c.fillStyle = '#f4f4f6';
      c.fillRect(width * 0.5 - 1.5, barY - 4, 3, barH + 8);
    },
  };
}
