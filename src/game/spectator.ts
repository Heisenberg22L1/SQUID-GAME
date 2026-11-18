import { drawStageBackdrop } from './assets';
import { drawContender } from './levelContext';
import type { StageId } from './types';

export interface SpectatorCompetitor {
  id: string;
  name: string;
  numberLabel: string;
  personality: 'Rusher' | 'Tactician' | 'Cautious' | 'Ace';
  suitColor: string;
  stripeColor: string;
  accentColor: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  alive: boolean;
  walkPhase: number;
}

export interface SpectatorState {
  competitors: SpectatorCompetitor[];
  followIndex: number;
  hazardAngle: number;
  pulseTimer: number;
  events: string[];
  elapsed: number;
}

export function createSpectatorState(): SpectatorState {
  return {
    competitors: [
      {
        id: 'spec-1',
        name: 'Sae-byeok',
        numberLabel: '067',
        personality: 'Ace',
        suitColor: '#881337',
        stripeColor: '#fbcfe8',
        accentColor: '#ff2e63',
        x: 0.28,
        y: 0.36,
        vx: 0.14,
        vy: 0.11,
        hp: 3,
        alive: true,
        walkPhase: 0,
      },
      {
        id: 'spec-2',
        name: 'Sang-woo',
        numberLabel: '218',
        personality: 'Tactician',
        suitColor: '#1e3a8a',
        stripeColor: '#bfdbfe',
        accentColor: '#38bdf8',
        x: 0.72,
        y: 0.34,
        vx: -0.11,
        vy: 0.13,
        hp: 3,
        alive: true,
        walkPhase: 1.2,
      },
      {
        id: 'spec-3',
        name: 'Ali',
        numberLabel: '199',
        personality: 'Cautious',
        suitColor: '#0f766e',
        stripeColor: '#e2e8f0',
        accentColor: '#10b981',
        x: 0.34,
        y: 0.70,
        vx: 0.10,
        vy: -0.10,
        hp: 3,
        alive: true,
        walkPhase: 2.1,
      },
      {
        id: 'spec-4',
        name: 'Deok-su',
        numberLabel: '101',
        personality: 'Rusher',
        suitColor: '#7f1d1d',
        stripeColor: '#fecaca',
        accentColor: '#f59e0b',
        x: 0.68,
        y: 0.68,
        vx: -0.18,
        vy: -0.14,
        hp: 2,
        alive: true,
        walkPhase: 0.6,
      },
    ],
    followIndex: 0,
    hazardAngle: 0,
    pulseTimer: 2.6,
    events: ['Spectator camera locked onto surviving contenders...'],
    elapsed: 0,
  };
}

export function stepSpectatorState(state: SpectatorState, dt: number): void {
  state.elapsed += dt;
  state.hazardAngle += dt * 1.15;
  state.pulseTimer -= dt;

  const speedMult: Record<SpectatorCompetitor['personality'], number> = {
    Rusher: 1.35,
    Ace: 1.15,
    Tactician: 0.95,
    Cautious: 0.78,
  };

  for (const c of state.competitors) {
    if (!c.alive) continue;
    const m = speedMult[c.personality];
    c.x += c.vx * m * dt;
    c.y += c.vy * m * dt;
    c.walkPhase += dt * 12 * m;

    if (c.x < 0.14 || c.x > 0.86) {
      c.vx *= -1;
      c.x = Math.max(0.14, Math.min(0.86, c.x));
    }
    if (c.y < 0.18 || c.y > 0.82) {
      c.vy *= -1;
      c.y = Math.max(0.18, Math.min(0.82, c.y));
    }
  }

  if (state.pulseTimer <= 0) {
    state.pulseTimer = 2.4 + Math.random() * 1.4;
    const aliveList = state.competitors.filter((c) => c.alive);
    if (aliveList.length > 1) {
      // Rusher has higher risk of taking damage
      const weighted = [...aliveList].sort((a, b) =>
        a.personality === 'Rusher' ? -1 : b.personality === 'Ace' ? -1 : 0
      );
      const target = weighted[Math.floor(Math.random() * Math.min(2, weighted.length))];
      target.hp -= 1;
      if (target.hp <= 0) {
        target.alive = false;
        state.events.unshift(`Player ${target.numberLabel} (${target.name}) was eliminated!`);
      } else {
        state.events.unshift(`Player ${target.numberLabel} dodged sweep (${target.hp} HP left)`);
      }
      if (state.events.length > 4) state.events.length = 4;

      if (!state.competitors[state.followIndex]?.alive) {
        const nextAlive = state.competitors.findIndex((c) => c.alive);
        if (nextAlive >= 0) state.followIndex = nextAlive;
      }
    }
  }
}

export function renderSpectatorCanvas(
  c: CanvasRenderingContext2D,
  state: SpectatorState,
  width: number,
  height: number,
  stageId: StageId = 1
): void {
  drawStageBackdrop(c, stageId, width, height, 0.56);

  const follow = state.competitors[state.followIndex] ?? state.competitors[0];
  const padX = Math.max(20, width * 0.06);
  const padTop = Math.max(70, height * 0.14);
  const padBot = Math.max(40, height * 0.12);
  const aw = width - padX * 2;
  const ah = height - padTop - padBot;

  // Arena floor
  c.fillStyle = 'rgba(13, 16, 23, 0.68)';
  c.strokeStyle = 'rgba(255, 46, 99, 0.38)';
  c.lineWidth = 2;
  c.fillRect(padX, padTop, aw, ah);
  c.strokeRect(padX, padTop, aw, ah);

  // Sweeping arena laser
  const cx = padX + aw * 0.5;
  const cy = padTop + ah * 0.5;
  const beamLen = Math.max(aw, ah) * 0.55;
  c.strokeStyle = 'rgba(255, 46, 99, 0.65)';
  c.lineWidth = 3.5;
  for (let i = 0; i < 2; i++) {
    const a = state.hazardAngle + i * Math.PI;
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(cx + Math.cos(a) * beamLen, cy + Math.sin(a) * beamLen);
    c.stroke();
  }

  for (const comp of state.competitors) {
    const sx = padX + comp.x * aw;
    const sy = padTop + comp.y * ah;
    const isFollowed = comp.id === follow?.id;
    if (isFollowed) {
      c.strokeStyle = '#38bdf8';
      c.lineWidth = 2.5;
      c.beginPath();
      c.arc(sx, sy, 24, 0, Math.PI * 2);
      c.stroke();
    }
    drawContender(
      c,
      sx,
      sy,
      16,
      {
        characterId: `char_${comp.numberLabel}`,
        numberLabel: comp.numberLabel,
        suitColor: comp.suitColor,
        stripeColor: comp.stripeColor,
        accentColor: comp.accentColor,
      },
      {
        walkPhase: comp.walkPhase,
        eliminated: !comp.alive,
        label: comp.numberLabel,
      }
    );
  }
}
