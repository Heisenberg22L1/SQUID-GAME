import { drawSprite, drawStageBackdrop, SYMBOL_SPRITES, TRAP_SPRITES } from '../assets';
import { drawContender, type LevelContext } from '../levelContext';
import { getDifficultyConfig, getStageForLevel } from '../rules';
import type { InputState, LevelEngine } from '../types';

export function createMindGamesLevel(ctx: LevelContext): LevelEngine {
  const cfg = getDifficultyConfig(ctx.difficulty);
  const lid = ctx.levelId;

  const baseTimes: Record<number, number> = {
    21: 55,
    22: 36,
    23: 55,
    24: 50,
    27: 45,
    29: 45,
  };

  const maxHp = 3 + cfg.maxHpBonus;
  let hp = maxHp;
  let timeLeft = Math.round((baseTimes[lid] ?? 50) * cfg.timeMult);
  let ended = false;
  let animTime = 0;

  // Shared player pos for movement-based mind games (22, 24)
  let px = 0.5;
  let py = 0.5;
  let walkPhase = 0;
  let hitFlash = 0;
  let invulnTimer = 0;

  // =============================================
  // LEVEL 21: SEQUENCE MEMORY (4 Pads, 3 Rounds)
  // =============================================
  const padColors = ['#ff2e63', '#10b981', '#38bdf8', '#fbbf24'];
  const padLabels = ['CIRCLE', 'TRIANGLE', 'SQUARE', 'STAR'];
  let seqRound = 1;
  let seqOrder: number[] = [];
  let seqShowing = true;
  let seqShowIdx = 0;
  let seqShowTimer = 0.65;
  let seqInputIdx = 0;
  let seqFlashPad = -1;

  const initSeqRound = (round: number) => {
    const len = 3 + round;
    seqOrder = [];
    for (let i = 0; i < len; i++) {
      seqOrder.push(Math.floor(Math.random() * 4));
    }
    seqShowing = true;
    seqShowIdx = 0;
    seqShowTimer = 0.7;
    seqInputIdx = 0;
    seqFlashPad = seqOrder[0];
  };
  if (lid === 21) initSeqRound(1);

  // =============================================
  // LEVEL 22: FAKE SAFE ZONES (4 Waves)
  // =============================================
  type GlyphType = 'circle' | 'triangle' | 'square';
  const glyphs: GlyphType[] = ['circle', 'triangle', 'square'];
  let zoneWave = 1;
  let zoneTimer = 5.2 / cfg.speedMult;
  let trueGlyph: GlyphType = 'circle';
  let zoneBoxes: Array<{ x: number; y: number; w: number; h: number; glyph: GlyphType; isTrue: boolean }> = [];
  const initZoneWave = () => {
    trueGlyph = glyphs[Math.floor(Math.random() * glyphs.length)];
    const decoys = glyphs.filter((g) => g !== trueGlyph);
    const trueIdx = Math.floor(Math.random() * 2);
    zoneBoxes = [
      {
        x: 0.12,
        y: 0.25,
        w: 0.30,
        h: 0.52,
        glyph: trueIdx === 0 ? trueGlyph : decoys[0],
        isTrue: trueIdx === 0,
      },
      {
        x: 0.58,
        y: 0.25,
        w: 0.30,
        h: 0.52,
        glyph: trueIdx === 1 ? trueGlyph : decoys[1],
        isTrue: trueIdx === 1,
      },
    ];
    zoneTimer = Math.max(3.1, 5.2 - zoneWave * 0.45) / cfg.speedMult;
  };
  if (lid === 22) initZoneWave();

  // =============================================
  // LEVEL 23: NUMBER LOCK (3 Vault Codes)
  // =============================================
  let lockStage = 1;
  let lockTarget = 12;
  let lockTiles: Array<{ val: number; selected: boolean }> = [];
  const initLockStage = () => {
    const basePool = [2, 3, 4, 5, 6, 7, 8, 9, 1];
    const picked = new Set<number>();
    while (picked.size < 3) {
      picked.add(Math.floor(Math.random() * basePool.length));
    }
    let sum = 0;
    picked.forEach((idx) => (sum += basePool[idx]));
    lockTarget = sum;
    lockTiles = basePool.map((val) => ({ val, selected: false }));
  };
  if (lid === 23) initLockStage();

  // =============================================
  // LEVEL 24: TRAP DOOR ROULETTE (5x5 Grid)
  // =============================================
  const gridCols = 5;
  const gridRows = 5;
  let gridCurR = 4;
  let gridCurC = 2;
  let gridRevealTimer = 2.6;
  const gridPath: Array<{ r: number; c: number }> = [];
  const initTrapGrid = () => {
    gridPath.length = 0;
    let c = 2;
    for (let r = gridRows - 1; r >= 0; r--) {
      gridPath.push({ r, c });
      if (r > 0) {
        const step = Math.random();
        if (step < 0.33 && c > 0) {
          c -= 1;
          gridPath.push({ r, c });
        } else if (step > 0.66 && c < gridCols - 1) {
          c += 1;
          gridPath.push({ r, c });
        }
      }
    }
    gridCurR = gridRows - 1;
    gridCurC = 2;
    gridRevealTimer = 2.6;
  };
  if (lid === 24) initTrapGrid();

  // =============================================
  // LEVEL 27: ODD ONE OUT (5 Rounds)
  // =============================================
  let oddRound = 1;
  let oddIdx = 0;
  let oddBaseShape: GlyphType = 'circle';
  let oddDiffShape: GlyphType = 'triangle';
  const initOddRound = () => {
    oddIdx = Math.floor(Math.random() * 12);
    oddBaseShape = glyphs[Math.floor(Math.random() * glyphs.length)];
    const others = glyphs.filter((g) => g !== oddBaseShape);
    oddDiffShape = others[Math.floor(Math.random() * others.length)];
  };
  if (lid === 27) initOddRound();

  // =============================================
  // LEVEL 29: TIME BOMB DEFUSAL (3 Bombs, 4 Wires)
  // =============================================
  let bombStage = 1;
  let wireOrder: number[] = [0, 1, 2, 3];
  let wireCutCount = 0;
  let cutWires: boolean[] = [false, false, false, false];
  const wireNames = ['RED', 'GREEN', 'BLUE', 'GOLD'];
  const wireHex = ['#ff2e63', '#10b981', '#38bdf8', '#fbbf24'];
  const initBombStage = () => {
    wireOrder = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    wireCutCount = 0;
    cutWires = [false, false, false, false];
  };
  if (lid === 29) initBombStage();

  const getArenaBounds = (width: number, height: number) => {
    const padX = Math.max(18, width * 0.06);
    const padTop = Math.max(76, height * 0.14);
    const padBot = Math.max(36, height * 0.10);
    return {
      ax: padX,
      ay: padTop,
      aw: width - padX * 2,
      ah: height - padTop - padBot,
    };
  };

  const loseHp = (reason: string) => {
    hp -= 1;
    hitFlash = 0.2;
    ctx.hitstop(0.05);
    ctx.shake(0.75);
    ctx.audio.hit();
    if (hp <= 0) {
      ended = true;
      ctx.audio.eliminate();
      ctx.finishLose({
        reason,
        detailLabel: `Time remaining: ${Math.ceil(timeLeft)}s`,
        scoreSoFar: 400,
        timeRemaining: timeLeft,
        hpRemaining: 0,
        maxHp,
      });
    }
  };

  const winTrial = (detail: string) => {
    ended = true;
    ctx.audio.levelClear();
    ctx.finishWin({
      detailLabel: detail,
      timeRemaining: timeLeft,
      hpRemaining: hp,
      maxHp,
    });
  };

  const drawGlyph = (
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
    g: GlyphType,
    color: string
  ) => {
    c.strokeStyle = color;
    c.lineWidth = 3.5;
    c.beginPath();
    if (g === 'circle') {
      c.arc(x, y, r, 0, Math.PI * 2);
    } else if (g === 'triangle') {
      c.moveTo(x, y - r);
      c.lineTo(x + r, y + r * 0.85);
      c.lineTo(x - r, y + r * 0.85);
      c.closePath();
    } else {
      c.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
    }
    c.stroke();
  };

  const pushHud = () => {
    let label = '';
    let val = 0;
    let banner = '';
    let tone: 'safe' | 'danger' | 'neutral' | 'gold' = 'neutral';

    if (lid === 21) {
      label = `Round ${seqRound}/3`;
      val = (seqRound - 1) / 3;
      banner = seqShowing ? 'WATCH THE SEQUENCE!' : `REPEAT SEQUENCE (${seqInputIdx}/${seqOrder.length})`;
      tone = seqShowing ? 'gold' : 'safe';
    } else if (lid === 22) {
      label = `Wave ${zoneWave}/4`;
      val = (zoneWave - 1) / 4;
      banner = `ENTER ${trueGlyph.toUpperCase()} ZONE (${zoneTimer.toFixed(1)}s)`;
      tone = zoneTimer < 1.5 ? 'danger' : 'gold';
    } else if (lid === 23) {
      const curSum = lockTiles.reduce((s, t) => s + (t.selected ? t.val : 0), 0);
      label = `Vault ${lockStage}/3`;
      val = (lockStage - 1) / 3;
      banner = `TARGET SUM: ${lockTarget} · CURRENT: ${curSum}`;
      tone = curSum === lockTarget ? 'safe' : curSum > lockTarget ? 'danger' : 'gold';
    } else if (lid === 24) {
      label = `Row ${gridRows - gridCurR}/${gridRows}`;
      val = (gridRows - 1 - gridCurR) / (gridRows - 1);
      banner =
        gridRevealTimer > 0
          ? `MEMORIZE PATH (${gridRevealTimer.toFixed(1)}s)`
          : 'STEP CAREFULLY TO TOP ROW';
      tone = gridRevealTimer > 0 ? 'gold' : 'safe';
    } else if (lid === 27) {
      label = `Scan ${oddRound}/5`;
      val = (oddRound - 1) / 5;
      banner = 'TAP THE SINGLE MISMATCHED GLYPH';
      tone = 'gold';
    } else if (lid === 29) {
      label = `Bomb ${bombStage}/3`;
      val = (bombStage - 1) / 3;
      const nextColor = wireNames[wireOrder[wireCutCount]];
      banner = `CUT WIRE ${wireCutCount + 1}/4: ${nextColor}`;
      tone = 'danger';
    }

    ctx.updateHud({
      hp,
      maxHp,
      timeLeft: Math.ceil(timeLeft),
      score: Math.round(val * 1000) + Math.ceil(timeLeft) * 18,
      progressLabel: label,
      progressValue: val,
      statusBanner: banner,
      statusTone: tone,
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

      const { ax, ay, aw, ah } = getArenaBounds(width, height);

      // LEVEL 21: SEQUENCE MEMORY
      if (lid === 21) {
        if (seqShowing) {
          seqShowTimer -= simDt;
          if (seqShowTimer <= 0) {
            seqShowIdx += 1;
            if (seqShowIdx >= seqOrder.length) {
              seqShowing = false;
              seqFlashPad = -1;
            } else {
              seqShowTimer = 0.65;
              seqFlashPad = seqOrder[seqShowIdx];
              ctx.audio.click();
            }
          }
        } else if (input.pointerJustPressed) {
          const padW = Math.min(aw * 0.42, 160);
          const padH = Math.min(ah * 0.34, 120);
          const cx = ax + aw * 0.5;
          const cy = ay + ah * 0.54;
          const coords = [
            { x: cx - padW - 10, y: cy - padH - 10 },
            { x: cx + 10, y: cy - padH - 10 },
            { x: cx - padW - 10, y: cy + 10 },
            { x: cx + 10, y: cy + 10 },
          ];
          for (let i = 0; i < 4; i++) {
            const p = coords[i];
            if (
              input.pointerX >= p.x &&
              input.pointerX <= p.x + padW &&
              input.pointerY >= p.y &&
              input.pointerY <= p.y + padH
            ) {
              seqFlashPad = i;
              if (i === seqOrder[seqInputIdx]) {
                ctx.audio.pickup();
                seqInputIdx += 1;
                if (seqInputIdx >= seqOrder.length) {
                  if (seqRound >= 3) {
                    winTrial('Completed all 3 neural sequences');
                    return;
                  }
                  seqRound += 1;
                  initSeqRound(seqRound);
                }
              } else {
                loseHp('Wrong sequence pad entered!');
                if (ended) return;
                seqInputIdx = 0;
              }
              break;
            }
          }
        }
      }

      // LEVEL 22: FAKE SAFE ZONES
      if (lid === 22) {
        px = Math.max(0.05, Math.min(0.95, px + input.moveX * 0.32 * simDt));
        py = Math.max(0.08, Math.min(0.92, py + input.moveY * 0.32 * simDt));
        if (Math.hypot(input.moveX, input.moveY) > 0.1) walkPhase += simDt * 14;

        zoneTimer -= simDt;
        if (zoneTimer <= 0) {
          const inTrueZone = zoneBoxes.some(
            (z) => z.isTrue && px >= z.x && px <= z.x + z.w && py >= z.y && py <= z.y + z.h
          );
          if (inTrueZone) {
            ctx.audio.pickup();
            if (zoneWave >= 4) {
              winTrial('Survived all 4 deceptive zone broadcasts');
              return;
            }
            zoneWave += 1;
            initZoneWave();
          } else {
            loseHp('Caught outside the authentic symbol zone!');
            if (ended) return;
            initZoneWave();
          }
        }
      }

      // LEVEL 23: NUMBER LOCK
      if (lid === 23 && input.pointerJustPressed) {
        const colsN = 3;
        const tileS = Math.min(aw * 0.25, ah * 0.2, 86);
        const startX = ax + aw * 0.5 - (colsN * tileS + 20) * 0.5;
        const startY = ay + ah * 0.34;
        for (let i = 0; i < lockTiles.length; i++) {
          const r = Math.floor(i / colsN);
          const col = i % colsN;
          const x = startX + col * (tileS + 10);
          const y = startY + r * (tileS + 10);
          if (
            input.pointerX >= x &&
            input.pointerX <= x + tileS &&
            input.pointerY >= y &&
            input.pointerY <= y + tileS
          ) {
            lockTiles[i].selected = !lockTiles[i].selected;
            ctx.audio.click();
            const sum = lockTiles.reduce((s, t) => s + (t.selected ? t.val : 0), 0);
            if (sum === lockTarget) {
              ctx.audio.pickup();
              if (lockStage >= 3) {
                winTrial('Cracked all 3 Vault Number Locks');
                return;
              }
              lockStage += 1;
              initLockStage();
            } else if (sum > lockTarget) {
              loseHp('Exceeded vault target sum!');
              if (ended) return;
              lockTiles.forEach((t) => (t.selected = false));
            }
            break;
          }
        }
      }

      // LEVEL 24: TRAP DOOR ROULETTE
      if (lid === 24) {
        if (gridRevealTimer > 0) {
          gridRevealTimer = Math.max(0, gridRevealTimer - simDt);
        } else {
          let targetR = gridCurR;
          let targetC = gridCurC;
          if (input.justUp) targetR -= 1;
          else if (input.justDown) targetR += 1;
          else if (input.justLeft) targetC -= 1;
          else if (input.justRight) targetC += 1;
          else if (input.pointerJustPressed) {
            const tileS = Math.min(aw / 6.2, ah / 6.2, 68);
            const gx0 = ax + aw * 0.5 - (gridCols * tileS) / 2;
            const gy0 = ay + ah * 0.52 - (gridRows * tileS) / 2;
            const cc = Math.floor((input.pointerX - gx0) / tileS);
            const rr = Math.floor((input.pointerY - gy0) / tileS);
            if (Math.abs(rr - gridCurR) + Math.abs(cc - gridCurC) === 1) {
              targetR = rr;
              targetC = cc;
            }
          }

          if (targetR !== gridCurR || targetC !== gridCurC) {
            if (targetR >= 0 && targetR < gridRows && targetC >= 0 && targetC < gridCols) {
              const safe = gridPath.some((p) => p.r === targetR && p.c === targetC);
              if (safe) {
                gridCurR = targetR;
                gridCurC = targetC;
                ctx.audio.step();
                if (gridCurR === 0) {
                  winTrial('Crossed the darkened trap-door grid');
                  return;
                }
              } else {
                loseHp('Stepped onto a trap-door chute!');
                if (ended) return;
              }
            }
          }
        }
      }

      // LEVEL 27: ODD ONE OUT
      if (lid === 27 && input.pointerJustPressed) {
        const colsN = 4;
        const rowsN = 3;
        const cellS = Math.min(aw * 0.2, ah * 0.22, 82);
        const startX = ax + aw * 0.5 - (colsN * cellS + 24) * 0.5;
        const startY = ay + ah * 0.30;
        for (let i = 0; i < colsN * rowsN; i++) {
          const r = Math.floor(i / colsN);
          const col = i % colsN;
          const x = startX + col * (cellS + 8);
          const y = startY + r * (cellS + 8);
          if (
            input.pointerX >= x &&
            input.pointerX <= x + cellS &&
            input.pointerY >= y &&
            input.pointerY <= y + cellS
          ) {
            if (i === oddIdx) {
              ctx.audio.pickup();
              if (oddRound >= 5) {
                winTrial('Spotted all 5 symbol anomalies');
                return;
              }
              oddRound += 1;
              initOddRound();
            } else {
              loseHp('Selected a normal glyph instead of the anomaly!');
              if (ended) return;
            }
            break;
          }
        }
      }

      // LEVEL 29: TIME BOMB DEFUSAL
      if (lid === 29 && input.pointerJustPressed) {
        const wireW = Math.min(aw * 0.72, 340);
        const wireH = Math.min(ah * 0.13, 52);
        const wx = ax + aw * 0.5 - wireW * 0.5;
        const wy0 = ay + ah * 0.34;
        for (let i = 0; i < 4; i++) {
          if (cutWires[i]) continue;
          const wy = wy0 + i * (wireH + 14);
          if (
            input.pointerX >= wx &&
            input.pointerX <= wx + wireW &&
            input.pointerY >= wy &&
            input.pointerY <= wy + wireH
          ) {
            if (i === wireOrder[wireCutCount]) {
              cutWires[i] = true;
              wireCutCount += 1;
              ctx.audio.pickup();
              if (wireCutCount >= 4) {
                if (bombStage >= 3) {
                  winTrial('Defused all 3 high-yield time bombs');
                  return;
                }
                bombStage += 1;
                initBombStage();
              }
            } else {
              ctx.audio.explosion();
              loseHp('Cut the wrong conduit wire!');
              if (ended) return;
            }
            break;
          }
        }
      }

      if (timeLeft <= 0) {
        ended = true;
        ctx.audio.eliminate();
        pushHud();
        ctx.finishLose({
          reason: 'Time expired during the Mind Games trial.',
          detailLabel: 'Countdown reached 0:00',
          scoreSoFar: 350,
          timeRemaining: 0,
          hpRemaining: hp,
          maxHp,
        });
        return;
      }

      pushHud();
    },

    render(c: CanvasRenderingContext2D, width: number, height: number) {
      drawStageBackdrop(c, getStageForLevel(lid).id, width, height, 0.54);

      const { ax, ay, aw, ah } = getArenaBounds(width, height);
      c.fillStyle = 'rgba(15, 18, 26, 0.76)';
      c.strokeStyle = 'rgba(56, 189, 248, 0.32)';
      c.lineWidth = 2;
      c.fillRect(ax, ay, aw, ah);
      c.strokeRect(ax, ay, aw, ah);

      // LEVEL 21: SEQUENCE MEMORY
      if (lid === 21) {
        const padW = Math.min(aw * 0.42, 160);
        const padH = Math.min(ah * 0.34, 120);
        const cx = ax + aw * 0.5;
        const cy = ay + ah * 0.54;
        const coords = [
          { x: cx - padW - 10, y: cy - padH - 10 },
          { x: cx + 10, y: cy - padH - 10 },
          { x: cx - padW - 10, y: cy + 10 },
          { x: cx + 10, y: cy + 10 },
        ];
        const padGlyphs: Array<'circle' | 'triangle' | 'square' | 'star'> = ['circle', 'triangle', 'square', 'star'];
        for (let i = 0; i < 4; i++) {
          const p = coords[i];
          const lit = seqFlashPad === i;
          c.fillStyle = lit ? padColors[i] : 'rgba(255,255,255,0.06)';
          c.strokeStyle = padColors[i];
          c.lineWidth = lit ? 4 : 2;
          c.beginPath();
          c.roundRect(p.x, p.y, padW, padH, 14);
          c.fill();
          c.stroke();

          drawSprite(c, SYMBOL_SPRITES[padGlyphs[i]], p.x + padW * 0.5, p.y + padH * 0.38, 30, 30, {
            alpha: lit ? 0.95 : 0.65,
          });
          c.fillStyle = lit ? '#07080a' : '#e4e4e7';
          c.font = '700 13px "Barlow Condensed", sans-serif';
          c.textAlign = 'center';
          c.fillText(padLabels[i], p.x + padW * 0.5, p.y + padH * 0.78);
        }
      }

      // LEVEL 22: FAKE SAFE ZONES
      if (lid === 22) {
        c.fillStyle = '#18181b';
        c.beginPath();
        c.roundRect(ax + aw * 0.38, ay + 14, aw * 0.24, 62, 10);
        c.fill();
        if (!drawSprite(c, SYMBOL_SPRITES[trueGlyph], ax + aw * 0.5, ay + 45, 38, 38)) {
          drawGlyph(c, ax + aw * 0.5, ay + 45, 18, trueGlyph, '#10b981');
        }

        for (const z of zoneBoxes) {
          const zx = ax + z.x * aw;
          const zy = ay + z.y * ah;
          const zw = z.w * aw;
          const zh = z.h * ah;
          c.fillStyle = 'rgba(255,255,255,0.06)';
          c.strokeStyle = '#94a3b8';
          c.lineWidth = 2.5;
          c.fillRect(zx, zy, zw, zh);
          c.strokeRect(zx, zy, zw, zh);
          if (!drawSprite(c, SYMBOL_SPRITES[z.glyph], zx + zw * 0.5, zy + zh * 0.5, 52, 52)) {
            drawGlyph(c, zx + zw * 0.5, zy + zh * 0.5, 28, z.glyph, '#f4f4f6');
          }
        }

        drawContender(c, ax + px * aw, ay + py * ah, 16, ctx.appearance, {
          walkPhase,
          hitFlash,
          label: ctx.appearance.numberLabel,
          animTime,
        });
      }

      // LEVEL 23: NUMBER LOCK
      if (lid === 23) {
        c.fillStyle = '#fbbf24';
        c.font = '800 32px "Barlow Condensed", sans-serif';
        c.textAlign = 'center';
        c.fillText(`TARGET CODE: ${lockTarget}`, ax + aw * 0.5, ay + ah * 0.19);

        const colsN = 3;
        const tileS = Math.min(aw * 0.25, ah * 0.2, 86);
        const startX = ax + aw * 0.5 - (colsN * tileS + 20) * 0.5;
        const startY = ay + ah * 0.34;
        for (let i = 0; i < lockTiles.length; i++) {
          const r = Math.floor(i / colsN);
          const col = i % colsN;
          const x = startX + col * (tileS + 10);
          const y = startY + r * (tileS + 10);
          const t = lockTiles[i];
          c.fillStyle = t.selected ? '#10b981' : '#181c26';
          c.strokeStyle = t.selected ? '#6ee7b7' : 'rgba(255,255,255,0.2)';
          c.lineWidth = 2;
          c.beginPath();
          c.roundRect(x, y, tileS, tileS, 12);
          c.fill();
          c.stroke();

          c.fillStyle = t.selected ? '#07080a' : '#f4f4f6';
          c.font = '700 24px "JetBrains Mono", monospace';
          c.fillText(String(t.val), x + tileS * 0.5, y + tileS * 0.58);
        }
      }

      // LEVEL 24: TRAP DOOR ROULETTE
      if (lid === 24) {
        const tileS = Math.min(aw / 6.2, ah / 6.2, 68);
        const gx0 = ax + aw * 0.5 - (gridCols * tileS) / 2;
        const gy0 = ay + ah * 0.52 - (gridRows * tileS) / 2;

        for (let r = 0; r < gridRows; r++) {
          for (let col = 0; col < gridCols; col++) {
            const x = gx0 + col * tileS + 3;
            const y = gy0 + r * tileS + 3;
            const isSafe = gridPath.some((p) => p.r === r && p.c === col);
            const showSafe = (gridRevealTimer > 0 && isSafe) || (r === 0 && isSafe);
            c.fillStyle = showSafe ? 'rgba(16, 185, 129, 0.35)' : '#171b24';
            c.strokeStyle = showSafe ? '#10b981' : 'rgba(255,255,255,0.12)';
            c.lineWidth = 2;
            c.fillRect(x, y, tileS - 6, tileS - 6);
            c.strokeRect(x, y, tileS - 6, tileS - 6);
          }
        }

        drawContender(
          c,
          gx0 + (gridCurC + 0.5) * tileS,
          gy0 + (gridCurR + 0.5) * tileS,
          tileS * 0.3,
          ctx.appearance,
          { label: ctx.appearance.numberLabel, hitFlash, animTime }
        );
      }

      // LEVEL 27: ODD ONE OUT
      if (lid === 27) {
        const colsN = 4;
        const rowsN = 3;
        const cellS = Math.min(aw * 0.2, ah * 0.22, 82);
        const startX = ax + aw * 0.5 - (colsN * cellS + 24) * 0.5;
        const startY = ay + ah * 0.30;
        for (let i = 0; i < colsN * rowsN; i++) {
          const r = Math.floor(i / colsN);
          const col = i % colsN;
          const x = startX + col * (cellS + 8);
          const y = startY + r * (cellS + 8);
          c.fillStyle = '#181c26';
          c.strokeStyle = 'rgba(255,255,255,0.16)';
          c.lineWidth = 2;
          c.beginPath();
          c.roundRect(x, y, cellS, cellS, 10);
          c.fill();
          c.stroke();

          const g = i === oddIdx ? oddDiffShape : oddBaseShape;
          if (!drawSprite(c, SYMBOL_SPRITES[g], x + cellS * 0.5, y + cellS * 0.5, cellS * 0.56, cellS * 0.56)) {
            drawGlyph(c, x + cellS * 0.5, y + cellS * 0.5, cellS * 0.26, g, '#f4f4f6');
          }
        }
      }

      // LEVEL 29: TIME BOMB DEFUSAL
      if (lid === 29) {
        drawSprite(c, TRAP_SPRITES.bomb, ax + aw * 0.5, ay + ah * 0.10, 44, 44);
        c.fillStyle = '#f4f4f6';
        c.font = '700 18px "JetBrains Mono", monospace';
        c.textAlign = 'center';
        const seqText = wireOrder.map((idx) => wireNames[idx]).join(' → ');
        c.fillText(`ORDER: ${seqText}`, ax + aw * 0.5, ay + ah * 0.23);

        const wireW = Math.min(aw * 0.72, 340);
        const wireH = Math.min(ah * 0.13, 52);
        const wx = ax + aw * 0.5 - wireW * 0.5;
        const wy0 = ay + ah * 0.34;
        for (let i = 0; i < 4; i++) {
          const wy = wy0 + i * (wireH + 14);
          const isCut = cutWires[i];
          c.fillStyle = isCut ? '#18181b' : '#161a24';
          c.strokeStyle = isCut ? '#3f3f46' : wireHex[i];
          c.lineWidth = 3;
          c.beginPath();
          c.roundRect(wx, wy, wireW, wireH, 10);
          c.fill();
          c.stroke();

          c.fillStyle = isCut ? '#52525b' : wireHex[i];
          c.font = '800 16px "Barlow Condensed", sans-serif';
          c.fillText(
            isCut ? `${wireNames[i]} CONDUIT DISARMED` : `CUT ${wireNames[i]} CONDUIT`,
            wx + wireW * 0.5,
            wy + wireH * 0.58
          );
        }
      }
    },
  };
}
