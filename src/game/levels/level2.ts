import { drawStageBackdrop } from '../assets';
import type { LevelContext } from '../levelContext';
import { getDifficultyConfig, getStageForLevel } from '../rules';
import type { InputState, LevelEngine } from '../types';

type DalgonaShape = 'circle' | 'triangle' | 'star' | 'umbrella';

interface ShapePoint {
  x: number; // normalized -1..1
  y: number;
}

function buildShapePoints(shape: DalgonaShape): ShapePoint[] {
  const pts: ShapePoint[] = [];
  if (shape === 'circle') {
    const count = 64;
    for (let i = 0; i < count; i++) {
      const a = (Math.PI * 2 * i) / count;
      pts.push({ x: Math.cos(a) * 0.62, y: Math.sin(a) * 0.62 });
    }
  } else if (shape === 'triangle') {
    const verts = [
      { x: 0, y: -0.68 },
      { x: 0.66, y: 0.52 },
      { x: -0.66, y: 0.52 },
    ];
    const perEdge = 24;
    for (let e = 0; e < 3; e++) {
      const a = verts[e];
      const b = verts[(e + 1) % 3];
      for (let i = 0; i < perEdge; i++) {
        const t = i / perEdge;
        pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
  } else if (shape === 'star') {
    const verts: ShapePoint[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (Math.PI * i) / 5;
      const r = i % 2 === 0 ? 0.72 : 0.32;
      verts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
    }
    const perEdge = 9;
    for (let e = 0; e < verts.length; e++) {
      const a = verts[e];
      const b = verts[(e + 1) % verts.length];
      for (let i = 0; i < perEdge; i++) {
        const t = i / perEdge;
        pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      }
    }
  } else {
    // Umbrella: dome arc + scalloped bottom + handle stem
    for (let i = 0; i <= 26; i++) {
      const a = Math.PI + (Math.PI * i) / 26;
      pts.push({ x: Math.cos(a) * 0.66, y: Math.sin(a) * 0.52 + 0.02 });
    }
    // Scallops right -> left
    for (let s = 2; s >= 0; s--) {
      const cx = -0.44 + s * 0.44;
      for (let i = 0; i <= 8; i++) {
        const a = (Math.PI * i) / 8;
        pts.push({ x: cx + Math.cos(a) * 0.22, y: 0.02 - Math.sin(a) * 0.1 });
      }
    }
    // Handle stem down & hook
    for (let i = 1; i <= 12; i++) {
      pts.push({ x: 0, y: 0.02 + (i / 12) * 0.56 });
    }
    for (let i = 1; i <= 10; i++) {
      const a = (Math.PI * i) / 10;
      pts.push({ x: -0.14 + Math.cos(a) * 0.14, y: 0.58 + Math.sin(a) * 0.14 });
    }
  }
  return pts;
}

export function createLevel2(ctx: LevelContext): LevelEngine {
  const cfg = getDifficultyConfig(ctx.difficulty);
  let timeLeft = Math.round(50 * cfg.timeMult);
  const shapes: DalgonaShape[] = ['circle', 'triangle', 'star', 'umbrella'];
  let shapeIndex =
    ctx.difficulty === 'easy' ? 0 : ctx.difficulty === 'normal' ? 1 : 2;
  let currentShape: DalgonaShape = shapes[shapeIndex];
  let points = buildShapePoints(currentShape);
  let carved = new Array<boolean>(points.length).fill(false);
  let hasStartedCutting = false;

  let crackLevel = 0; // 0..100
  const maxHp = 3;
  let ended = false;
  let sparkCooldown = 0;
  let needleX = 0;
  let needleY = 0;
  let needleActive = false;

  const shapeButtons: Array<{ shape: DalgonaShape; x: number; y: number; w: number; h: number }> = [];

  const selectShape = (idx: number) => {
    if (hasStartedCutting) return;
    shapeIndex = idx;
    currentShape = shapes[idx];
    points = buildShapePoints(currentShape);
    carved = new Array<boolean>(points.length).fill(false);
    crackLevel = 0;
    ctx.audio.click();
  };

  const getProgress = () => {
    const count = carved.filter(Boolean).length;
    return count / points.length;
  };

  const pushHud = () => {
    const progress = getProgress();
    const hp = Math.max(0, Math.ceil(((100 - crackLevel) / 100) * maxHp));
    ctx.updateHud({
      hp,
      maxHp,
      timeLeft: Math.ceil(timeLeft),
      score: Math.round(progress * 1000 + (100 - crackLevel) * 4),
      progressLabel: `${Math.round(progress * 100)}%`,
      progressValue: progress,
      statusBanner:
        crackLevel > 65
          ? `DANGER · CRACK ${Math.round(crackLevel)}%`
          : `CARVING: ${currentShape.toUpperCase()}`,
      statusTone: crackLevel > 65 ? 'danger' : 'gold',
    });
  };

  pushHud();

  return {
    update(dt: number, simDt: number, input: InputState, width: number, height: number) {
      if (ended) return;
      timeLeft = Math.max(0, timeLeft - simDt);
      if (sparkCooldown > 0) sparkCooldown -= dt;

      const cx = width * 0.5;
      const cy = height * 0.51;
      const cookieR = Math.min(width * 0.36, height * 0.28, 175);
      const shapeScale = cookieR * 0.78;

      // Check shape switcher clicks before first cut
      if (!hasStartedCutting && input.pointerJustPressed) {
        for (let i = 0; i < shapeButtons.length; i++) {
          const b = shapeButtons[i];
          if (
            input.pointerX >= b.x &&
            input.pointerX <= b.x + b.w &&
            input.pointerY >= b.y &&
            input.pointerY <= b.y + b.h
          ) {
            selectShape(i);
            return;
          }
        }
      }

      // Keyboard fallback cursor
      if (Math.abs(input.moveX) > 0.1 || Math.abs(input.moveY) > 0.1) {
        if (!needleActive) {
          needleX = cx + points[0].x * shapeScale;
          needleY = cy + points[0].y * shapeScale;
          needleActive = true;
        }
        needleX = Math.max(cx - cookieR, Math.min(cx + cookieR, needleX + input.moveX * 210 * dt));
        needleY = Math.max(cy - cookieR, Math.min(cy + cookieR, needleY + input.moveY * 210 * dt));
      }

      const usingPointer = input.pointerDown;
      const activeCutting = usingPointer || (input.holdPrimary && needleActive);
      const px = usingPointer ? input.pointerX : needleX;
      const py = usingPointer ? input.pointerY : needleY;

      if (usingPointer) {
        needleX = px;
        needleY = py;
        needleActive = true;
      }

      if (activeCutting) {
        const distFromCenter = Math.hypot(px - cx, py - cy);
        if (distFromCenter <= cookieR * 1.05) {
          hasStartedCutting = true;
          // Find nearest shape point
          let minDist = Infinity;
          for (let i = 0; i < points.length; i++) {
            const sx = cx + points[i].x * shapeScale;
            const sy = cy + points[i].y * shapeScale;
            const d = Math.hypot(px - sx, py - sy);
            if (d < minDist) minDist = d;
          }

          const tolerance =
            currentShape === 'umbrella' || currentShape === 'star'
              ? 24 / cfg.aiStrength
              : 28 / cfg.aiStrength;

          if (minDist <= tolerance) {
            // Carve all points within brush radius
            let carvedAny = false;
            for (let i = 0; i < points.length; i++) {
              if (carved[i]) continue;
              const sx = cx + points[i].x * shapeScale;
              const sy = cy + points[i].y * shapeScale;
              if (Math.hypot(px - sx, py - sy) <= tolerance * 1.1) {
                carved[i] = true;
                carvedAny = true;
              }
            }
            if (carvedAny && sparkCooldown <= 0) {
              ctx.audio.pickup();
              ctx.particles.emitBurst(px, py, 5, '#fcd34d', 30, 110, 3, 140, 0.3);
              sparkCooldown = 0.08;
            }
          } else {
            // Off groove: accumulate crack stress
            const crackRate = (38 + (minDist - tolerance) * 1.4) * cfg.aiStrength;
            crackLevel = Math.min(100, crackLevel + crackRate * simDt);
            if (sparkCooldown <= 0) {
              ctx.audio.warning();
              ctx.shake(0.28);
              ctx.particles.emitBurst(px, py, 4, '#ff2e63', 40, 120, 3, 180, 0.25);
              sparkCooldown = 0.14;
            }
          }
        }
      }

      const progress = getProgress();
      if (crackLevel >= 100) {
        ended = true;
        ctx.audio.eliminate();
        ctx.hitstop(0.07);
        ctx.shake(0.95);
        ctx.particles.emitBurst(cx, cy, 28, '#f59e0b', 90, 320, 6, 260, 0.65);
        pushHud();
        ctx.finishLose({
          reason: 'The honeycomb snapped under uneven needle pressure!',
          detailLabel: `Shape: ${currentShape.toUpperCase()} · ${Math.round(progress * 100)}% carved`,
          scoreSoFar: Math.round(progress * 700),
          timeRemaining: timeLeft,
          hpRemaining: 0,
          maxHp,
        });
        return;
      }

      if (progress >= 0.94) {
        ended = true;
        ctx.audio.levelClear();
        ctx.particles.emitBurst(cx, cy, 30, '#10b981', 80, 280, 5, 160, 0.7);
        pushHud();
        const hpRemaining = Math.max(1, Math.ceil(((100 - crackLevel) / 100) * maxHp));
        ctx.finishWin({
          detailLabel: `Cleanly carved ${currentShape.toUpperCase()} (${Math.round(crackLevel)}% stress)`,
          timeRemaining: timeLeft,
          hpRemaining,
          maxHp,
        });
        return;
      }

      if (timeLeft <= 0) {
        ended = true;
        ctx.audio.eliminate();
        pushHud();
        ctx.finishLose({
          reason: 'Time expired before the candy shape was freed.',
          detailLabel: `${Math.round(progress * 100)}% carved`,
          scoreSoFar: Math.round(progress * 650),
          timeRemaining: 0,
          hpRemaining: 0,
          maxHp,
        });
        return;
      }

      pushHud();
    },

    render(c: CanvasRenderingContext2D, width: number, height: number) {
      drawStageBackdrop(c, getStageForLevel(ctx.levelId).id, width, height, 0.56);

      const cx = width * 0.5;
      const cy = height * 0.51;
      const cookieR = Math.min(width * 0.36, height * 0.28, 175);
      const shapeScale = cookieR * 0.78;

      // Shape selection chips (above tin before starting cut)
      shapeButtons.length = 0;
      const btnW = 76;
      const btnH = 30;
      const gap = 8;
      const totalW = shapes.length * btnW + (shapes.length - 1) * gap;
      const startX = cx - totalW / 2;
      const btnY = Math.max(66, cy - cookieR - 54);

      for (let i = 0; i < shapes.length; i++) {
        const bx = startX + i * (btnW + gap);
        shapeButtons.push({ shape: shapes[i], x: bx, y: btnY, w: btnW, h: btnH });
        const active = i === shapeIndex;
        c.fillStyle = active ? '#f59e0b' : hasStartedCutting ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.09)';
        c.beginPath();
        c.roundRect(bx, btnY, btnW, btnH, 6);
        c.fill();
        c.fillStyle = active ? '#07080a' : hasStartedCutting ? '#52525b' : '#e4e4e7';
        c.font = '700 11px "Barlow Condensed", sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(shapes[i].toUpperCase(), bx + btnW / 2, btnY + btnH / 2);
      }

      // Metallic tin outer ring
      c.fillStyle = '#27272a';
      c.strokeStyle = '#52525b';
      c.lineWidth = 4;
      c.beginPath();
      c.arc(cx, cy, cookieR + 18, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      // Sugar honeycomb disc
      const sugarGrad = c.createRadialGradient(cx - cookieR * 0.2, cy - cookieR * 0.2, 10, cx, cy, cookieR);
      sugarGrad.addColorStop(0, '#f59e0b');
      sugarGrad.addColorStop(0.65, '#d97706');
      sugarGrad.addColorStop(1, '#92400e');
      c.fillStyle = sugarGrad;
      c.beginPath();
      c.arc(cx, cy, cookieR, 0, Math.PI * 2);
      c.fill();

      // Crack lines proportional to crackLevel
      if (crackLevel > 8) {
        const branches = Math.min(8, Math.floor(crackLevel / 12));
        c.strokeStyle = crackLevel > 65 ? '#ff2e63' : '#451a03';
        c.lineWidth = 2.5;
        for (let b = 0; b < branches; b++) {
          const ang = (Math.PI * 2 * b) / 8 + 0.3;
          const len = cookieR * (0.25 + (crackLevel / 100) * 0.72);
          c.beginPath();
          c.moveTo(cx + Math.cos(ang) * cookieR * 0.96, cy + Math.sin(ang) * cookieR * 0.96);
          c.lineTo(cx + Math.cos(ang + 0.08) * (cookieR - len * 0.5), cy + Math.sin(ang + 0.08) * (cookieR - len * 0.5));
          c.lineTo(cx + Math.cos(ang - 0.06) * (cookieR - len), cy + Math.sin(ang - 0.06) * (cookieR - len));
          c.stroke();
        }
      }

      // Guide groove (dark carved track)
      c.strokeStyle = 'rgba(69, 26, 3, 0.72)';
      c.lineWidth = 9;
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.beginPath();
      for (let i = 0; i < points.length; i++) {
        const sx = cx + points[i].x * shapeScale;
        const sy = cy + points[i].y * shapeScale;
        if (i === 0) c.moveTo(sx, sy);
        else c.lineTo(sx, sy);
      }
      if (currentShape !== 'umbrella') c.closePath();
      c.stroke();

      // Carved bright progress dots
      for (let i = 0; i < points.length; i++) {
        const sx = cx + points[i].x * shapeScale;
        const sy = cy + points[i].y * shapeScale;
        c.fillStyle = carved[i] ? '#10b981' : 'rgba(254, 243, 199, 0.45)';
        c.beginPath();
        c.arc(sx, sy, carved[i] ? 5.5 : 2.5, 0, Math.PI * 2);
        c.fill();
      }

      // Needle visual
      if (needleActive) {
        c.save();
        c.translate(needleX, needleY);
        c.strokeStyle = '#f4f4f6';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(26, -34);
        c.stroke();
        c.fillStyle = '#ff2e63';
        c.beginPath();
        c.arc(0, 0, 5, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    },
  };
}
