import { COLLECTIBLE_SPRITES, drawSprite, drawStageBackdrop, getCachedImage } from '../assets';
import { drawContender, drawMaskedGuard, type LevelContext } from '../levelContext';
import { evaluateMarbleRound, getDifficultyConfig, getStageForLevel } from '../rules';
import type { InputState, LevelEngine } from '../types';

interface HitBox {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  action: () => void;
}

export function createLevel4(ctx: LevelContext): LevelEngine {
  const cfg = getDifficultyConfig(ctx.difficulty);
  let timeLeft = Math.round(90 * cfg.timeMult);

  let playerMarbles = 10;
  let aiMarbles = 10;
  let round = 1;
  const maxRounds = 8;

  let isPlayerGuessing = true;
  let playerWager = 2;
  let playerConcealed = 2;
  let aiConcealed = Math.floor(Math.random() * 5) + 1;
  let aiWager = Math.min(3, aiMarbles);

  let revealTimer = 0;
  let lastResultText = 'Round 1: Call whether your rival holds ODD or EVEN marbles.';
  let lastRevealCount = 0;
  let lastWonRound: boolean | null = null;
  let ended = false;

  const hitBoxes: HitBox[] = [];

  const clampWagers = () => {
    const maxStake = Math.max(1, Math.min(5, playerMarbles, aiMarbles));
    playerWager = Math.max(1, Math.min(maxStake, playerWager));
    playerConcealed = Math.max(1, Math.min(Math.min(5, playerMarbles), playerConcealed));
  };

  const resolveTurn = (guess: 'odd' | 'even') => {
    if (revealTimer > 0 || ended) return;
    clampWagers();

    // AI picks smartly based on difficulty when AI is guessing
    let aiGuess: 'odd' | 'even' = Math.random() < 0.5 ? 'odd' : 'even';
    if (!isPlayerGuessing && Math.random() < 0.25 * cfg.aiStrength) {
      aiGuess = playerConcealed % 2 === 0 ? 'even' : 'odd';
    }

    const res = evaluateMarbleRound({
      playerMarbles,
      aiMarbles,
      playerWager,
      aiWager: Math.min(Math.max(1, Math.ceil(Math.random() * 4)), aiMarbles, playerMarbles),
      isPlayerGuessing,
      playerGuess: guess,
      aiGuess,
      playerConcealed,
      aiConcealed,
    });

    playerMarbles = res.nextPlayerMarbles;
    aiMarbles = res.nextAiMarbles;
    lastRevealCount = res.revealedCount;
    lastWonRound = res.playerDelta >= 0;

    if (isPlayerGuessing) {
      lastResultText = `Rival opened hand: ${res.revealedCount} (${res.revealedParity.toUpperCase()}). You ${
        res.playerDelta > 0 ? `won +${res.playerDelta}` : `lost ${res.playerDelta}`
      }!`;
    } else {
      lastResultText = `Rival guessed ${aiGuess.toUpperCase()} vs your ${res.revealedCount} (${res.revealedParity.toUpperCase()}). You ${
        res.playerDelta > 0 ? `won +${res.playerDelta}` : `lost ${res.playerDelta}`
      }!`;
    }

    if (res.playerDelta > 0) {
      ctx.audio.pickup();
    } else {
      ctx.audio.hit();
      ctx.shake(0.35);
    }

    revealTimer = 1.45;
  };

  const pushHud = () => {
    ctx.updateHud({
      hp: playerMarbles,
      maxHp: 20,
      timeLeft: Math.ceil(timeLeft),
      score: playerMarbles * 80 + (maxRounds - round) * 40,
      progressLabel: `Round ${Math.min(round, maxRounds)}/${maxRounds}`,
      progressValue: playerMarbles / 20,
      statusBanner: isPlayerGuessing ? 'YOUR TURN TO GUESS' : 'HIDE YOUR MARBLES',
      statusTone: isPlayerGuessing ? 'gold' : 'neutral',
    });
  };

  pushHud();

  return {
    update(_dt: number, simDt: number, input: InputState, width: number, height: number) {
      if (ended) return;
      timeLeft = Math.max(0, timeLeft - simDt);

      if (revealTimer > 0) {
        revealTimer -= simDt;
        if (revealTimer <= 0) {
          // Check win/loss after reveal
          if (playerMarbles >= 20 || aiMarbles <= 0) {
            ended = true;
            ctx.audio.levelClear();
            ctx.particles.emitBurst(width * 0.5, height * 0.45, 26, '#10b981', 70, 260, 5, 160, 0.7);
            pushHud();
            ctx.finishWin({
              detailLabel: `Collected all 20 marbles in ${round} rounds`,
              timeRemaining: timeLeft,
              hpRemaining: 3,
              maxHp: 3,
            });
            return;
          }
          if (playerMarbles <= 0) {
            ended = true;
            ctx.audio.eliminate();
            ctx.shake(0.8);
            pushHud();
            ctx.finishLose({
              reason: 'You lost all your marbles to your rival.',
              detailLabel: `Lasted ${round} rounds`,
              scoreSoFar: round * 90,
              timeRemaining: timeLeft,
              hpRemaining: 0,
              maxHp: 3,
            });
            return;
          }
          if (round >= maxRounds) {
            if (playerMarbles > aiMarbles) {
              ended = true;
              ctx.audio.levelClear();
              pushHud();
              ctx.finishWin({
                detailLabel: `Finished ahead ${playerMarbles} - ${aiMarbles}`,
                timeRemaining: timeLeft,
                hpRemaining: 2,
                maxHp: 3,
              });
            } else {
              ended = true;
              ctx.audio.eliminate();
              pushHud();
              ctx.finishLose({
                reason: `Final round ended with ${playerMarbles} vs ${aiMarbles} marbles.`,
                detailLabel: `Needed > 10 marbles to advance`,
                scoreSoFar: playerMarbles * 60,
                timeRemaining: timeLeft,
                hpRemaining: 0,
                maxHp: 3,
              });
            }
            return;
          }

          round += 1;
          isPlayerGuessing = !isPlayerGuessing;
          aiConcealed = Math.floor(Math.random() * Math.min(5, aiMarbles)) + 1;
          aiWager = Math.floor(Math.random() * Math.min(4, aiMarbles)) + 1;
          clampWagers();
          lastResultText = isPlayerGuessing
            ? `Round ${round}: Choose wager and call ODD or EVEN.`
            : `Round ${round}: Choose how many marbles to conceal, then tap LOCK HAND.`;
          pushHud();
        }
        return;
      }

      // Keyboard shortcuts
      if (input.justLeft) {
        if (isPlayerGuessing) resolveTurn('odd');
      } else if (input.justRight) {
        if (isPlayerGuessing) resolveTurn('even');
      } else if (input.justPrimary && !isPlayerGuessing) {
        resolveTurn('odd');
      }

      // Canvas button clicks
      if (input.pointerJustPressed) {
        for (const hb of hitBoxes) {
          if (
            input.pointerX >= hb.x &&
            input.pointerX <= hb.x + hb.w &&
            input.pointerY >= hb.y &&
            input.pointerY <= hb.y + hb.h
          ) {
            hb.action();
            break;
          }
        }
      }

      if (timeLeft <= 0) {
        ended = true;
        if (playerMarbles > aiMarbles) {
          ctx.audio.levelClear();
          ctx.finishWin({
            detailLabel: `Led ${playerMarbles} - ${aiMarbles} at buzzer`,
            timeRemaining: 0,
            hpRemaining: 2,
            maxHp: 3,
          });
        } else {
          ctx.audio.eliminate();
          ctx.finishLose({
            reason: 'Time ran out without a marble lead.',
            detailLabel: `${playerMarbles} vs ${aiMarbles} marbles`,
            scoreSoFar: playerMarbles * 50,
            timeRemaining: 0,
            hpRemaining: 0,
            maxHp: 3,
          });
        }
        return;
      }

      pushHud();
    },

    render(c: CanvasRenderingContext2D, width: number, height: number) {
      hitBoxes.length = 0;

      // Stage backdrop
      drawStageBackdrop(c, getStageForLevel(ctx.levelId).id, width, height, 0.56);

      // Wooden play mat in center
      const matW = Math.min(460, width * 0.88);
      const matH = Math.min(260, height * 0.44);
      const matX = (width - matW) / 2;
      const matY = height * 0.46 - matH / 2;

      c.fillStyle = 'rgba(31, 25, 22, 0.88)';
      c.strokeStyle = 'rgba(245, 158, 11, 0.42)';
      c.lineWidth = 2;
      c.beginPath();
      c.roundRect(matX, matY, matW, matH, 16);
      c.fill();
      c.stroke();

      // Characters facing off
      drawMaskedGuard(c, width * 0.5, matY - 12, 18, 'circle', { accent: '#e11d48' });
      drawContender(c, width * 0.5, matY + matH + 14, 18, ctx.appearance, { label: ctx.appearance.numberLabel });

      // Marble counts & visual marbles
      c.fillStyle = '#f4f4f6';
      c.font = '700 14px "Barlow Condensed", sans-serif';
      c.textAlign = 'left';
      c.fillText(`RIVAL MARBLES: ${aiMarbles}`, matX + 18, matY + 26);

      c.textAlign = 'right';
      c.fillStyle = '#10b981';
      c.fillText(`YOUR MARBLES: ${playerMarbles}`, matX + matW - 18, matY + 26);

      // Draw marble sprites/dots inside mat
      const drawMarbleRow = (count: number, yPos: number, color: string, spriteUrl: string) => {
        const cols = Math.min(10, count);
        const startM = width * 0.5 - ((cols - 1) * 20) / 2;
        const hasSprite = Boolean(getCachedImage(spriteUrl));
        for (let i = 0; i < count; i++) {
          const row = Math.floor(i / 10);
          const col = i % 10;
          const mx = startM + col * 20;
          const my = yPos + row * 18;
          if (hasSprite) {
            drawSprite(c, spriteUrl, mx, my, 15, 15);
          } else {
            c.fillStyle = color;
            c.beginPath();
            c.arc(mx, my, 6.5, 0, Math.PI * 2);
            c.fill();
            c.fillStyle = 'rgba(255,255,255,0.45)';
            c.beginPath();
            c.arc(mx - 2, my - 2, 2, 0, Math.PI * 2);
            c.fill();
          }
        }
      };
      drawMarbleRow(aiMarbles, matY + 52, '#ff2e63', COLLECTIBLE_SPRITES.gemPink);
      drawMarbleRow(playerMarbles, matY + matH - 46, '#38bdf8', COLLECTIBLE_SPRITES.crystal);

      // Narrative / Reveal feedback
      c.fillStyle =
        revealTimer > 0
          ? lastWonRound
            ? '#10b981'
            : '#ff2e63'
          : '#e4e4e7';
      c.font = '600 14px "Plus Jakarta Sans", sans-serif';
      c.textAlign = 'center';
      c.fillText(
        revealTimer > 0 ? `${lastResultText}` : lastResultText,
        width * 0.5,
        matY + matH * 0.52,
        matW - 32
      );

      if (revealTimer > 0) {
        c.fillStyle = '#fbbf24';
        c.font = '700 22px "JetBrains Mono", monospace';
        c.fillText(`REVEALED: ${lastRevealCount}`, width * 0.5, matY + matH * 0.52 - 28);
      }

      // Interactive control panel below mat
      const ctrlY = Math.min(height - 135, matY + matH + 54);
      const maxStake = Math.max(1, Math.min(5, playerMarbles, aiMarbles));

      // Stake / Conceal selector buttons 1..maxStake
      const numBtnSize = 44;
      const numGap = 8;
      const numTotalW = maxStake * numBtnSize + (maxStake - 1) * numGap;
      const numStartX = width * 0.5 - numTotalW / 2;
      const selectedVal = isPlayerGuessing ? playerWager : playerConcealed;

      c.fillStyle = '#a1a1aa';
      c.font = '600 11px "Barlow Condensed", sans-serif';
      c.textAlign = 'center';
      c.fillText(
        isPlayerGuessing ? 'SELECT WAGER' : 'CONCEAL MARBLES IN HAND',
        width * 0.5,
        ctrlY - 10
      );

      for (let v = 1; v <= maxStake; v++) {
        const bx = numStartX + (v - 1) * (numBtnSize + numGap);
        const active = selectedVal === v;
        c.fillStyle = active ? '#fbbf24' : '#18181b';
        c.strokeStyle = active ? '#fbbf24' : 'rgba(255,255,255,0.2)';
        c.lineWidth = 1.5;
        c.beginPath();
        c.roundRect(bx, ctrlY, numBtnSize, numBtnSize, 8);
        c.fill();
        c.stroke();

        c.fillStyle = active ? '#07080a' : '#f4f4f6';
        c.font = '700 16px "JetBrains Mono", monospace';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(String(v), bx + numBtnSize / 2, ctrlY + numBtnSize / 2);

        hitBoxes.push({
          id: `num-${v}`,
          x: bx,
          y: ctrlY,
          w: numBtnSize,
          h: numBtnSize,
          action: () => {
            ctx.audio.click();
            if (isPlayerGuessing) playerWager = v;
            else playerConcealed = v;
          },
        });
      }

      const actionY = ctrlY + 56;
      if (isPlayerGuessing) {
        const btnW = Math.min(150, width * 0.38);
        const btnH = 48;
        const leftX = width * 0.5 - btnW - 8;
        const rightX = width * 0.5 + 8;

        // ODD button
        c.fillStyle = '#ff2e63';
        c.beginPath();
        c.roundRect(leftX, actionY, btnW, btnH, 10);
        c.fill();
        c.fillStyle = '#ffffff';
        c.font = '700 16px "Barlow Condensed", sans-serif';
        c.fillText('CALL ODD', leftX + btnW / 2, actionY + btnH / 2);
        hitBoxes.push({
          id: 'odd',
          x: leftX,
          y: actionY,
          w: btnW,
          h: btnH,
          action: () => resolveTurn('odd'),
        });

        // EVEN button
        c.fillStyle = '#10b981';
        c.beginPath();
        c.roundRect(rightX, actionY, btnW, btnH, 10);
        c.fill();
        c.fillStyle = '#07080a';
        c.fillText('CALL EVEN', rightX + btnW / 2, actionY + btnH / 2);
        hitBoxes.push({
          id: 'even',
          x: rightX,
          y: actionY,
          w: btnW,
          h: btnH,
          action: () => resolveTurn('even'),
        });
      } else {
        const btnW = Math.min(240, width * 0.65);
        const btnH = 48;
        const bx = width * 0.5 - btnW / 2;
        c.fillStyle = '#38bdf8';
        c.beginPath();
        c.roundRect(bx, actionY, btnW, btnH, 10);
        c.fill();
        c.fillStyle = '#07080a';
        c.font = '700 16px "Barlow Condensed", sans-serif';
        c.fillText(`LOCK ${playerConcealed} MARBLES`, bx + btnW / 2, actionY + btnH / 2);
        hitBoxes.push({
          id: 'lock',
          x: bx,
          y: actionY,
          w: btnW,
          h: btnH,
          action: () => resolveTurn('odd'),
        });
      }
      c.textBaseline = 'alphabetic';
    },
  };
}
