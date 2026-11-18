import { drawSprite, drawStageBackdrop, VFX_SPRITES } from '../assets';
import { drawContender, type LevelContext } from '../levelContext';
import { generateGlassBridgePath, getDifficultyConfig, getStageForLevel } from '../rules';
import type { InputState, LevelEngine } from '../types';

export function createLevel5(ctx: LevelContext): LevelEngine {
  const cfg = getDifficultyConfig(ctx.difficulty);
  const isPrecision = ctx.levelId === 43;
  const steps = isPrecision
    ? 10
    : ctx.difficulty === 'easy'
    ? 6
    : ctx.difficulty === 'normal'
    ? 8
    : 10;
  const maxHp = (isPrecision ? 1 : 2) + cfg.maxHpBonus;
  let hp = maxHp;
  let timeLeft = Math.round((isPrecision ? 40 : 45) * cfg.timeMult);

  const safePath = generateGlassBridgePath(steps);
  const shattered: Array<{ left: boolean; right: boolean }> = Array.from(
    { length: steps },
    () => ({ left: false, right: false })
  );
  const revealedSafe: boolean[] = new Array<boolean>(steps).fill(false);

  // currentStep = -1 (starting ledge), 0..steps-1 (on step), steps (finished!)
  let currentStep = -1;
  let currentSide: 'left' | 'right' = 'left';
  let leapTimer = 0;
  let fromX = 0.5;
  let fromY = 0.86;
  let toX = 0.5;
  let toY = 0.86;
  let hitFlash = 0;
  let ended = false;
  let statusBanner = 'CHOOSE LEFT OR RIGHT PANEL';
  let statusTone: 'safe' | 'danger' | 'neutral' | 'gold' = 'neutral';

  const panelRects: Array<{ step: number; side: 'left' | 'right'; x: number; y: number; w: number; h: number }> = [];

  const getStepCoords = (step: number, side: 'left' | 'right') => {
    if (step < 0) return { xFrac: 0.5, yFrac: 0.86 };
    if (step >= steps) return { xFrac: 0.5, yFrac: 0.14 };
    const yFrac = 0.77 - (step / (steps - 1)) * 0.54;
    const xFrac = side === 'left' ? 0.36 : 0.64;
    return { xFrac, yFrac };
  };

  const pushHud = () => {
    const progress = Math.max(0, Math.min(1, (currentStep + 1) / (steps + 1)));
    ctx.updateHud({
      hp,
      maxHp,
      timeLeft: Math.ceil(timeLeft),
      score: Math.max(0, currentStep + 1) * 140,
      progressLabel: `Panel ${Math.max(0, currentStep + 1)}/${steps}`,
      progressValue: progress,
      statusBanner,
      statusTone,
    });
  };

  const attemptJump = (side: 'left' | 'right', width: number, height: number) => {
    if (ended || leapTimer > 0) return;
    const nextStep = currentStep + 1;

    if (nextStep >= steps) {
      // Leap onto finish platform!
      const startPos = getStepCoords(currentStep, currentSide);
      fromX = startPos.xFrac;
      fromY = startPos.yFrac;
      toX = 0.5;
      toY = 0.14;
      currentStep = steps;
      leapTimer = 0.28;
      ctx.audio.levelClear();
      ended = true;
      ctx.particles.emitBurst(width * 0.5, height * 0.14, 28, '#10b981', 70, 260, 5, 160, 0.7);
      pushHud();
      ctx.finishWin({
        detailLabel: `Crossed all ${steps} tempered glass pairs`,
        timeRemaining: timeLeft,
        hpRemaining: hp,
        maxHp,
      });
      return;
    }

    if (shattered[nextStep][side]) {
      // Already shattered — disallow jumping into open hole, warn player
      ctx.audio.warning();
      statusBanner = 'PANEL SHATTERED · PICK THE OTHER SIDE!';
      statusTone = 'danger';
      pushHud();
      return;
    }

    const startPos = getStepCoords(currentStep, currentSide);
    const targetPos = getStepCoords(nextStep, side);
    fromX = startPos.xFrac;
    fromY = startPos.yFrac;
    toX = targetPos.xFrac;
    toY = targetPos.yFrac;
    leapTimer = 0.22;

    const isSafe = safePath[nextStep] === side;
    if (isSafe) {
      currentStep = nextStep;
      currentSide = side;
      revealedSafe[nextStep] = true;
      ctx.audio.pickup();
      ctx.particles.emitRing(width * targetPos.xFrac, height * targetPos.yFrac, '#10b981', 16, 0.35);
      statusBanner =
        nextStep === steps - 1
          ? 'FINAL LEAP · JUMP TO FINISH!'
          : 'TEMPERED GLASS HELD!';
      statusTone = 'safe';

      if (nextStep === steps - 1) {
        // Auto-win or let player take one final celebratory hop; let's require 1 final hop OR auto advance?
        // Actually advancing onto the last glass panel and then pressing either side to clear is crisp; or even cleaner: crossing the last panel completes the bridge!
        ended = true;
        ctx.audio.levelClear();
        ctx.particles.emitBurst(width * 0.5, height * 0.14, 28, '#10b981', 70, 260, 5, 160, 0.7);
        pushHud();
        ctx.finishWin({
          detailLabel: `Crossed all ${steps} glass pairs`,
          timeRemaining: timeLeft,
          hpRemaining: hp,
          maxHp,
        });
        return;
      }
    } else {
      // Glass shatters!
      shattered[nextStep][side] = true;
      hp -= 1;
      hitFlash = 0.2;
      ctx.audio.glassBreak();
      ctx.hitstop(0.06);
      ctx.shake(0.85);
      ctx.particles.emitBurst(
        width * targetPos.xFrac,
        height * targetPos.yFrac,
        24,
        '#bae6fd',
        80,
        280,
        5,
        260,
        0.55
      );
      statusBanner = 'GLASS SHATTERED! LOST 1 LIFE';
      statusTone = 'danger';

      if (hp <= 0) {
        ended = true;
        pushHud();
        ctx.finishLose({
          reason: 'Fell through tempered glass into the abyss.',
          detailLabel: `Reached panel ${nextStep + 1} of ${steps}`,
          scoreSoFar: (currentStep + 1) * 120,
          timeRemaining: timeLeft,
          hpRemaining: 0,
          maxHp,
        });
        return;
      }
    }

    pushHud();
  };

  pushHud();

  return {
    update(dt: number, simDt: number, input: InputState, width: number, height: number) {
      if (ended) return;
      timeLeft = Math.max(0, timeLeft - simDt);
      if (hitFlash > 0) hitFlash = Math.max(0, hitFlash - dt);
      if (leapTimer > 0) leapTimer = Math.max(0, leapTimer - dt);

      if (input.justLeft) {
        attemptJump('left', width, height);
      } else if (input.justRight) {
        attemptJump('right', width, height);
      } else if (input.pointerJustPressed) {
        for (const pr of panelRects) {
          if (
            pr.step === currentStep + 1 &&
            input.pointerX >= pr.x &&
            input.pointerX <= pr.x + pr.w &&
            input.pointerY >= pr.y &&
            input.pointerY <= pr.y + pr.h
          ) {
            attemptJump(pr.side, width, height);
            break;
          }
        }
      }

      if (timeLeft <= 0) {
        ended = true;
        ctx.audio.eliminate();
        ctx.shake(0.75);
        pushHud();
        ctx.finishLose({
          reason: 'Bridge lights cut out before you reached the end.',
          detailLabel: `Panel ${Math.max(0, currentStep + 1)}/${steps}`,
          scoreSoFar: Math.max(0, currentStep + 1) * 100,
          timeRemaining: 0,
          hpRemaining: hp,
          maxHp,
        });
        return;
      }

      pushHud();
    },

    render(c: CanvasRenderingContext2D, width: number, height: number) {
      panelRects.length = 0;

      // Stage backdrop
      drawStageBackdrop(c, getStageForLevel(ctx.levelId).id, width, height, 0.5);

      // Steel bridge side rails
      const railOffset = width * 0.24;
      c.strokeStyle = 'rgba(255, 46, 99, 0.42)';
      c.lineWidth = 4;
      c.beginPath();
      c.moveTo(width * 0.5 - railOffset, height * 0.14);
      c.lineTo(width * 0.5 - railOffset, height * 0.88);
      c.moveTo(width * 0.5 + railOffset, height * 0.14);
      c.lineTo(width * 0.5 + railOffset, height * 0.88);
      c.stroke();

      // Finish platform (top) & Start platform (bottom)
      c.fillStyle = 'rgba(20, 83, 45, 0.88)';
      c.strokeStyle = '#10b981';
      c.lineWidth = 2;
      c.beginPath();
      c.roundRect(width * 0.28, height * 0.09, width * 0.44, 42, 10);
      c.fill();
      c.stroke();
      drawSprite(c, VFX_SPRITES.portalGold, width * 0.5, height * 0.09 + 21, 56, 36, { alpha: 0.55 });
      c.fillStyle = '#d1fae5';
      c.font = '700 12px "Barlow Condensed", sans-serif';
      c.textAlign = 'center';
      c.fillText('SAFE EXTRACTION PLATFORM', width * 0.5, height * 0.09 + 25);

      c.fillStyle = '#27272a';
      c.beginPath();
      c.roundRect(width * 0.3, height * 0.83, width * 0.4, 42, 10);
      c.fill();

      // Glass panels
      const panelW = Math.min(115, width * 0.22);
      const panelH = Math.max(26, Math.min(38, (height * 0.54) / steps - 6));

      for (let i = 0; i < steps; i++) {
        const isNext = i === currentStep + 1;
        (['left', 'right'] as const).forEach((side) => {
          const pos = getStepCoords(i, side);
          const px = width * pos.xFrac - panelW / 2;
          const py = height * pos.yFrac - panelH / 2;
          panelRects.push({ step: i, side, x: px, y: py, w: panelW, h: panelH });

          if (shattered[i][side]) {
            // Broken gap outline
            c.strokeStyle = 'rgba(255, 46, 99, 0.35)';
            c.setLineDash([4, 4]);
            c.lineWidth = 1.5;
            c.strokeRect(px, py, panelW, panelH);
            c.setLineDash([]);
            return;
          }

          const isConfirmedSafe = revealedSafe[i] && safePath[i] === side;
          const easyHint =
            ctx.difficulty === 'easy' && isNext && safePath[i] === side;

          c.fillStyle = isConfirmedSafe
            ? 'rgba(16, 185, 129, 0.35)'
            : isNext
            ? 'rgba(186, 230, 253, 0.22)'
            : 'rgba(148, 163, 184, 0.14)';
          c.strokeStyle = isConfirmedSafe
            ? '#10b981'
            : isNext
            ? easyHint
              ? 'rgba(16, 185, 129, 0.75)'
              : '#bae6fd'
            : 'rgba(255,255,255,0.22)';
          c.lineWidth = isNext ? 2.5 : 1.5;

          c.beginPath();
          c.roundRect(px, py, panelW, panelH, 6);
          c.fill();
          c.stroke();

          // Subtle diagonal glass glare
          c.strokeStyle = 'rgba(255,255,255,0.28)';
          c.lineWidth = 1.5;
          c.beginPath();
          c.moveTo(px + 8, py + panelH - 5);
          c.lineTo(px + 22, py + 5);
          c.stroke();

          if (isNext) {
            c.fillStyle = '#f4f4f6';
            c.font = '700 11px "Barlow Condensed", sans-serif';
            c.textAlign = 'center';
            c.fillText(side === 'left' ? 'LEFT' : 'RIGHT', px + panelW / 2, py + panelH / 2 + 4);
          }
        });
      }

      // Draw Player with leap arc
      const curPos = getStepCoords(currentStep, currentSide);
      let drawX = width * curPos.xFrac;
      let drawY = height * curPos.yFrac;
      let scale = 1;
      if (leapTimer > 0) {
        const t = 1 - leapTimer / 0.22;
        drawX = width * (fromX + (toX - fromX) * t);
        drawY = height * (fromY + (toY - fromY) * t) - Math.sin(t * Math.PI) * 26;
        scale = 1 + Math.sin(t * Math.PI) * 0.22;
      }

      drawContender(c, drawX, drawY, 15, ctx.appearance, {
        hitFlash,
        label: ctx.appearance.numberLabel,
        scaleX: scale,
        scaleY: scale,
      });
    },
  };
}
