import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Coins,
  Eye,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Swords,
  Volume2,
  VolumeX,
  Wind,
} from 'lucide-react';
import { ACHIEVEMENT_BADGES, preloadStageAssets, UI_SPRITES } from '../game/assets';
import { audioEngine } from '../game/audio';
import { resolveAppearance } from '../game/customization';
import { createLevelEngine } from '../game/levels';
import { ParticlePool } from '../game/particles';
import { ACHIEVEMENTS, calculateLevelReward, getStageForLevel, LEVEL_METADATA } from '../game/rules';
import {
  createSpectatorState,
  renderSpectatorCanvas,
  stepSpectatorState,
  type SpectatorState,
} from '../game/spectator';
import type {
  AchievementDef,
  Difficulty,
  GameScreenState,
  HudSnapshot,
  InputState,
  LevelId,
  LevelOutcome,
  SaveData,
} from '../game/types';
import { ChampionModal } from './ChampionModal';

interface GameCanvasShellProps {
  levelId: LevelId;
  runKey: number;
  save: SaveData;
  practiceMode: boolean;
  isFullscreen: boolean;
  screenState: GameScreenState;
  lastOutcome: LevelOutcome | null;
  newAchievements: AchievementDef[];
  stageBonusAwarded: { stageId: number; coins: number; xp: number } | null;
  onSetScreenState: (s: GameScreenState) => void;
  onOutcome: (outcome: LevelOutcome) => void;
  onRestartLevel: () => void;
  onNextLevel: () => void;
  onOpenLevelSelect: () => void;
  onExitToTitle: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
}

const POINTER_ONLY_LEVELS = new Set([2, 3, 4, 5, 21, 23, 27, 29, 43, 44]);
const COMBAT_LEVELS = new Set([7, 10, 20, 30, 39, 40, 49, 50]);

export const GameCanvasShell: React.FC<GameCanvasShellProps> = ({
  levelId,
  runKey,
  save,
  practiceMode,
  isFullscreen,
  screenState,
  lastOutcome,
  newAchievements,
  stageBonusAwarded,
  onSetScreenState,
  onOutcome,
  onRestartLevel,
  onNextLevel,
  onOpenLevelSelect,
  onExitToTitle,
  onToggleMute,
  onToggleFullscreen,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const joyRef = useRef<HTMLDivElement | null>(null);
  const [joyKnob, setJoyKnob] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const meta = LEVEL_METADATA.find((l) => l.id === levelId) ?? LEVEL_METADATA[0];
  const stageMeta = getStageForLevel(levelId);
  const appearance = useMemo(() => resolveAppearance(save.equipped), [save.equipped]);

  const [hud, setHud] = useState<HudSnapshot>({
    hp: 3,
    maxHp: 3,
    timeLeft: meta.timeLimitSec,
    score: 0,
    progressLabel: '0%',
    progressValue: 0,
    statusBanner: meta.title.toUpperCase(),
    statusTone: 'neutral',
  });

  // Spectator state synced lightly for overlay readout
  const spectatorRef = useRef<SpectatorState>(createSpectatorState());
  const [spectatorHud, setSpectatorHud] = useState<{
    aliveCount: number;
    totalCount: number;
    followedName: string;
    followedNum: string;
    followedPersonality: string;
    latestEvent: string;
  }>({
    aliveCount: 4,
    totalCount: 4,
    followedName: 'Sae-byeok',
    followedNum: '067',
    followedPersonality: 'Ace',
    latestEvent: 'Spectating surviving contenders...',
  });

  const screenStateRef = useRef(screenState);
  screenStateRef.current = screenState;

  const callbacksRef = useRef({ onOutcome, onSetScreenState });
  callbacksRef.current = { onOutcome, onSetScreenState };

  const difficultyRef = useRef<Difficulty>(save.difficulty);
  difficultyRef.current = save.difficulty;

  const winStreakRef = useRef<number>(save.winStreak);
  winStreakRef.current = save.winStreak;

  const inputRef = useRef<{
    keys: Set<string>;
    joyX: number;
    joyY: number;
    joyPointerId: number | null;
    touchPrimaryHeld: boolean;
    touchGuardHeld: boolean;
    justPrimary: boolean;
    justSecondary: boolean;
    justLeft: boolean;
    justRight: boolean;
    justUp: boolean;
    justDown: boolean;
    pointerDown: boolean;
    pointerX: number;
    pointerY: number;
    pointerJustPressed: boolean;
  }>({
    keys: new Set(),
    joyX: 0,
    joyY: 0,
    joyPointerId: null,
    touchPrimaryHeld: false,
    touchGuardHeld: false,
    justPrimary: false,
    justSecondary: false,
    justLeft: false,
    justRight: false,
    justUp: false,
    justDown: false,
    pointerDown: false,
    pointerX: 0,
    pointerY: 0,
    pointerJustPressed: false,
  });

  const clearInputs = useCallback(() => {
    const inp = inputRef.current;
    inp.keys.clear();
    inp.joyX = 0;
    inp.joyY = 0;
    inp.joyPointerId = null;
    inp.touchPrimaryHeld = false;
    inp.touchGuardHeld = false;
    inp.pointerDown = false;
    setJoyKnob({ x: 0, y: 0 });
  }, []);

  // Reset spectator simulation whenever entering spectating
  useEffect(() => {
    if (screenState === 'spectating') {
      spectatorRef.current = createSpectatorState();
      const s = spectatorRef.current;
      const f = s.competitors[s.followIndex];
      setSpectatorHud({
        aliveCount: s.competitors.filter((c) => c.alive).length,
        totalCount: s.competitors.length,
        followedName: f.name,
        followedNum: f.numberLabel,
        followedPersonality: f.personality,
        latestEvent: s.events[0] ?? '',
      });
    }
  }, [screenState]);

  const cycleSpectatorTarget = useCallback((dir: 1 | -1) => {
    const s = spectatorRef.current;
    const len = s.competitors.length;
    for (let step = 1; step <= len; step++) {
      const idx = (s.followIndex + dir * step + len) % len;
      if (s.competitors[idx].alive) {
        s.followIndex = idx;
        const f = s.competitors[idx];
        setSpectatorHud({
          aliveCount: s.competitors.filter((c) => c.alive).length,
          totalCount: s.competitors.length,
          followedName: f.name,
          followedNum: f.numberLabel,
          followedPersonality: f.personality,
          latestEvent: s.events[0] ?? '',
        });
        break;
      }
    }
  }, []);

  // Keyboard listeners
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        if (screenStateRef.current === 'playing') {
          e.preventDefault();
          clearInputs();
          callbacksRef.current.onSetScreenState('paused');
          return;
        } else if (screenStateRef.current === 'paused') {
          e.preventDefault();
          callbacksRef.current.onSetScreenState('playing');
          return;
        }
      }

      if (e.key.toLowerCase() === 'm') {
        onToggleMute();
        return;
      }

      if (e.key.toLowerCase() === 'r' && screenStateRef.current === 'playing') {
        onRestartLevel();
        return;
      }

      if (screenStateRef.current !== 'playing') return;

      const inp = inputRef.current;
      const code = e.code;
      const firstPress = !inp.keys.has(code);
      inp.keys.add(code);

      if (firstPress) {
        if (code === 'Space' || code === 'KeyJ' || code === 'Enter') {
          inp.justPrimary = true;
        }
        if (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyK') {
          inp.justSecondary = true;
        }
        if (code === 'KeyA' || code === 'ArrowLeft') inp.justLeft = true;
        if (code === 'KeyD' || code === 'ArrowRight') inp.justRight = true;
        if (code === 'KeyW' || code === 'ArrowUp') inp.justUp = true;
        if (code === 'KeyS' || code === 'ArrowDown') inp.justDown = true;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(code)) {
        e.preventDefault();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      inputRef.current.keys.delete(e.code);
    };

    const onVisibility = () => {
      if (document.hidden) clearInputs();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [clearInputs, onRestartLevel, onToggleMute]);

  // Isolated 60fps Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;

    clearInputs();
    preloadStageAssets(stageMeta.id, levelId);
    const particles = new ParticlePool();
    let trauma = 0;
    let hitstopTimer = 0;
    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = Math.max(300, container.clientWidth || window.innerWidth);
      height = Math.max(300, container.clientHeight || window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    };
    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(container);

    let lastHudKey = '';
    let lastHudCoreKey = '';
    let lastHudTime = 0;
    const updateHudThrottled = (next: HudSnapshot) => {
      const coreKey = `${next.hp}|${next.maxHp}|${next.timeLeft}|${next.statusBanner ?? ''}|${next.bossHp ?? ''}`;
      const fullKey = `${coreKey}|${next.score}|${next.progressLabel}`;
      if (fullKey === lastHudKey) return;
      const now = performance.now();
      if (coreKey === lastHudCoreKey && now - lastHudTime < 180) return;
      lastHudCoreKey = coreKey;
      lastHudKey = fullKey;
      lastHudTime = now;
      setHud(next);
    };

    const startTimeMs = performance.now();
    let finalized = false;
    const engine = createLevelEngine(levelId, {
      levelId,
      difficulty: difficultyRef.current,
      appearance,
      practiceMode,
      particles,
      audio: audioEngine,
      shake: (t: number) => {
        trauma = Math.min(1, trauma + t);
      },
      hitstop: (sec: number) => {
        hitstopTimer = Math.max(hitstopTimer, sec);
      },
      updateHud: updateHudThrottled,
      finishWin: ({ detailLabel, timeRemaining, hpRemaining, maxHp, bonusScore = 0 }) => {
        if (finalized) return;
        finalized = true;
        const timeUsed = Math.max(1, Math.round((performance.now() - startTimeMs) / 1000));
        const reward = calculateLevelReward(
          levelId,
          difficultyRef.current,
          timeRemaining,
          hpRemaining,
          maxHp,
          practiceMode,
          winStreakRef.current
        );
        callbacksRef.current.onOutcome({
          levelId,
          won: true,
          score: reward.score + bonusScore,
          coinsEarned: reward.coins,
          xpEarned: reward.xp,
          perfectBonus: reward.perfectBonus,
          streakBonusCoins: reward.streakBonusCoins,
          timeUsed,
          timeRemaining,
          hpRemaining,
          maxHp,
          detailLabel,
          reason: 'Survived the trial.',
        });
      },
      finishLose: ({ reason, detailLabel, scoreSoFar, timeRemaining, hpRemaining, maxHp }) => {
        if (finalized) return;
        finalized = true;
        const timeUsed = Math.max(1, Math.round((performance.now() - startTimeMs) / 1000));
        window.setTimeout(() => {
          callbacksRef.current.onOutcome({
            levelId,
            won: false,
            score: scoreSoFar,
            coinsEarned: 0,
            xpEarned: 0,
            perfectBonus: false,
            streakBonusCoins: 0,
            timeUsed,
            timeRemaining,
            hpRemaining,
            maxHp,
            detailLabel,
            reason,
          });
        }, 420);
      },
    });

    const screenToCanvas = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    };

    const onPointerDown = (e: PointerEvent) => {
      audioEngine.unlock();
      if (screenStateRef.current !== 'playing') return;
      const pt = screenToCanvas(e.clientX, e.clientY);
      const inp = inputRef.current;
      inp.pointerDown = true;
      inp.pointerJustPressed = true;
      inp.pointerX = pt.x;
      inp.pointerY = pt.y;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (screenStateRef.current !== 'playing') return;
      const pt = screenToCanvas(e.clientX, e.clientY);
      inputRef.current.pointerX = pt.x;
      inputRef.current.pointerY = pt.y;
    };

    const onPointerUp = () => {
      inputRef.current.pointerDown = false;
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    let rafId = 0;
    let prevTs = performance.now();
    let specSyncTimer = 0;

    const frame = (ts: number) => {
      const rawDt = (ts - prevTs) / 1000;
      prevTs = ts;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      const curState = screenStateRef.current;
      if (curState === 'spectating') {
        stepSpectatorState(spectatorRef.current, dt);
        specSyncTimer -= dt;
        if (specSyncTimer <= 0) {
          specSyncTimer = 0.25;
          const s = spectatorRef.current;
          const f = s.competitors[s.followIndex] ?? s.competitors[0];
          const alive = s.competitors.filter((c) => c.alive).length;
          setSpectatorHud({
            aliveCount: alive,
            totalCount: s.competitors.length,
            followedName: f.name,
            followedNum: f.numberLabel,
            followedPersonality: f.personality,
            latestEvent: s.events[0] ?? '',
          });
        }
        ctx2d.save();
        ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
        renderSpectatorCanvas(ctx2d, spectatorRef.current, width, height, stageMeta.id);
        ctx2d.restore();
        rafId = window.requestAnimationFrame(frame);
        return;
      }

      if (curState === 'playing') {
        if (hitstopTimer > 0) hitstopTimer = Math.max(0, hitstopTimer - dt);
        const simDt = hitstopTimer > 0 ? 0 : dt;

        const inp = inputRef.current;
        let moveX = inp.joyX;
        let moveY = inp.joyY;
        if (inp.keys.has('KeyA') || inp.keys.has('ArrowLeft')) moveX -= 1;
        if (inp.keys.has('KeyD') || inp.keys.has('ArrowRight')) moveX += 1;
        if (inp.keys.has('KeyW') || inp.keys.has('ArrowUp')) moveY -= 1;
        if (inp.keys.has('KeyS') || inp.keys.has('ArrowDown')) moveY += 1;
        const mag = Math.hypot(moveX, moveY);
        if (mag > 1) {
          moveX /= mag;
          moveY /= mag;
        }

        const isSprintLevel = levelId === 1 || levelId === 42;
        const frameInput: InputState = {
          moveX,
          moveY,
          holdPrimary:
            inp.touchPrimaryHeld ||
            inp.keys.has('Space') ||
            inp.keys.has('KeyJ') ||
            (inp.keys.has('KeyW') && isSprintLevel) ||
            (inp.keys.has('ArrowUp') && isSprintLevel),
          holdGuard:
            inp.touchGuardHeld || inp.keys.has('KeyL') || inp.keys.has('KeyE'),
          justPrimary: inp.justPrimary,
          justSecondary: inp.justSecondary,
          justLeft: inp.justLeft,
          justRight: inp.justRight,
          justUp: inp.justUp,
          justDown: inp.justDown,
          pointerDown: inp.pointerDown,
          pointerX: inp.pointerX,
          pointerY: inp.pointerY,
          pointerJustPressed: inp.pointerJustPressed,
        };

        inp.justPrimary = false;
        inp.justSecondary = false;
        inp.justLeft = false;
        inp.justRight = false;
        inp.justUp = false;
        inp.justDown = false;
        inp.pointerJustPressed = false;

        engine.update(dt, simDt, frameInput, width, height);
        particles.update(dt);
      }

      if (trauma > 0) trauma = Math.max(0, trauma - dt * 2.1);
      const shakeAmt = trauma * trauma * 11;
      const sx = (Math.random() * 2 - 1) * shakeAmt;
      const sy = (Math.random() * 2 - 1) * shakeAmt;

      ctx2d.save();
      ctx2d.setTransform(dpr, 0, 0, dpr, sx * dpr, sy * dpr);
      engine.render(ctx2d, width, height);
      particles.render(ctx2d);
      ctx2d.restore();

      rafId = window.requestAnimationFrame(frame);
    };

    rafId = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      engine.dispose?.();
    };
  }, [levelId, runKey, practiceMode, appearance, clearInputs]);

  const updateJoystick = (clientX: number, clientY: number) => {
    const el = joyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.38;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    inputRef.current.joyX = dx / maxR;
    inputRef.current.joyY = dy / maxR;
    setJoyKnob({ x: dx, y: dy });
  };

  const showJoystick = !POINTER_ONLY_LEVELS.has(levelId) || levelId === 1 || levelId === 42;
  const isCombat = COMBAT_LEVELS.has(levelId);
  const isSprint = levelId === 1 || levelId === 42;
  const isTug = levelId === 3 || levelId === 44;
  const isBridge = levelId === 5 || levelId === 43;
  const showDashOnly = showJoystick && !isCombat && !isSprint;

  const statusBg =
    hud.statusTone === 'danger'
      ? 'bg-[#ff2e63]/90 text-white border-[#ff2e63]'
      : hud.statusTone === 'safe'
      ? 'bg-[#10b981]/90 text-[#07080a] border-[#10b981]'
      : hud.statusTone === 'gold'
      ? 'bg-amber-400/95 text-[#07080a] border-amber-300'
      : 'bg-[#141720]/90 text-zinc-100 border-white/15';

  const renderVitality = () => {
    if (hud.maxHp <= 5) {
      return (
        <div className="flex items-center gap-1" aria-label={`Health ${hud.hp} of ${hud.maxHp}`}>
          {Array.from({ length: hud.maxHp }).map((_, i) => {
            const filled = i < hud.hp;
            return (
              <svg key={i} viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5">
                <polygon
                  points="12,3 21,19 3,19"
                  fill={filled ? '#ff2e63' : '#18181b'}
                  stroke={filled ? '#fda4af' : '#52525b'}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            );
          })}
          <span className="ml-0.5 font-mono-num text-[11px] sm:text-xs font-bold text-zinc-200 tabular-nums">
            HP {hud.hp}/{hud.maxHp}
          </span>
        </div>
      );
    }

    const pct = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
    return (
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="w-12 sm:w-28 h-2.5 rounded bg-black/70 border border-white/20 overflow-hidden shrink-0">
          <div
            className="h-full bg-[#ff2e63] transition-transform duration-150 origin-left"
            style={{ transform: `scaleX(${pct / 100})` }}
          />
        </div>
        <span className="font-mono-num text-[11px] sm:text-xs font-bold text-white tabular-nums">
          HP {hud.hp}
        </span>
      </div>
    );
  };

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-[#07080a] select-none">
      {/* Canvas */}
      <div ref={containerRef} className="absolute inset-0">
        <canvas
          ref={canvasRef}
          data-testid="game-canvas"
          className="block w-full h-full touch-none"
        />
      </div>

      {/* Gameplay HUD */}
      {screenState !== 'spectating' && (
        <div className="fixed inset-0 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4 z-20">
          {/* Top Perimeter */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-start justify-between gap-1.5 sm:gap-2">
              {/* Left: Trial & HP */}
              <div className="bg-[#0d0f14]/95 border border-white/15 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 shadow-lg max-w-[138px] sm:max-w-none shrink">
                <div className="text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase text-zinc-400 truncate">
                  Lv {String(levelId).padStart(2, '0')} · {meta.title}
                </div>
                <div className="mt-0.5 sm:mt-1 flex items-center gap-1.5 sm:gap-3 whitespace-nowrap">
                  {renderVitality()}
                  <span className="hidden sm:inline text-xs font-mono-num text-amber-400 font-bold tabular-nums">
                    {hud.score} PTS
                  </span>
                </div>
              </div>

              {/* Center: Timer & Live Status */}
              <div className="flex flex-col items-center gap-1 shrink-0 max-w-[146px] sm:max-w-none">
                <div
                  className={`px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg border font-mono-num text-base sm:text-xl font-bold tabular-nums shadow-lg ${
                    hud.timeLeft <= 10
                      ? 'bg-[#ff2e63] border-rose-300 text-white'
                      : 'bg-[#0d0f14]/95 border-white/15 text-white'
                  }`}
                >
                  {Math.floor(hud.timeLeft / 60)}:
                  {String(hud.timeLeft % 60).padStart(2, '0')}
                </div>
                {hud.statusBanner && (
                  <div
                    className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded border text-[10px] sm:text-xs font-display font-bold tracking-wider uppercase shadow whitespace-nowrap max-w-full truncate ${statusBg}`}
                  >
                    {hud.statusBanner}
                  </div>
                )}
              </div>

              {/* Right: Utility Buttons */}
              <div className="flex items-center gap-1.5 pointer-events-auto shrink-0">
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={save.settings.muted ? 'Unmute audio' : 'Mute audio'}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleMute();
                  }}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#0d0f14]/95 border border-white/15 text-zinc-200 hover:text-white hover:border-white/35"
                >
                  {save.settings.muted ? (
                    <VolumeX className="w-4 h-4 text-[#ff2e63]" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Restart trial"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onRestartLevel();
                  }}
                  className="hidden sm:flex min-w-[44px] min-h-[44px] items-center justify-center rounded-lg bg-[#0d0f14]/95 border border-white/15 text-zinc-200 hover:text-white hover:border-white/35"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleFullscreen();
                  }}
                  className="hidden sm:flex min-w-[44px] min-h-[44px] items-center justify-center rounded-lg bg-[#0d0f14]/95 border border-white/15 text-zinc-200 hover:text-white hover:border-white/35"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Pause game"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    clearInputs();
                    onSetScreenState('paused');
                  }}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#0d0f14]/95 border border-white/15 text-zinc-200 hover:text-white hover:border-[#ff2e63]"
                >
                  <Pause className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Dedicated Boss Health Bar */}
            {hud.bossMaxHp !== undefined && hud.bossHp !== undefined && (
              <div className="mx-auto w-full max-w-md px-3 py-1.5 rounded-lg bg-[#0d0f14]/95 border border-amber-400/40 shadow-lg">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-300 mb-1">
                  <span>{hud.bossName ?? meta.bossName}</span>
                  <span className="font-mono-num tabular-nums">
                    {hud.bossHp} / {hud.bossMaxHp}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-black/70 overflow-hidden border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-[#ff2e63] to-amber-400 transition-transform duration-100 origin-left"
                    style={{
                      transform: `scaleX(${Math.max(0, Math.min(1, hud.bossHp / hud.bossMaxHp))})`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Touch Controls */}
          {screenState === 'playing' && (
            <div className="flex items-end justify-between gap-4 pb-1">
              {showJoystick ? (
                <div
                  ref={joyRef}
                  role="application"
                  aria-label="Virtual movement joystick"
                  onPointerDown={(e) => {
                    audioEngine.unlock();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    inputRef.current.joyPointerId = e.pointerId;
                    updateJoystick(e.clientX, e.clientY);
                  }}
                  onPointerMove={(e) => {
                    if (inputRef.current.joyPointerId === e.pointerId) {
                      updateJoystick(e.clientX, e.clientY);
                    }
                  }}
                  onPointerUp={(e) => {
                    if (inputRef.current.joyPointerId === e.pointerId) {
                      inputRef.current.joyPointerId = null;
                      inputRef.current.joyX = 0;
                      inputRef.current.joyY = 0;
                      setJoyKnob({ x: 0, y: 0 });
                    }
                  }}
                  onPointerCancel={() => {
                    inputRef.current.joyPointerId = null;
                    inputRef.current.joyX = 0;
                    inputRef.current.joyY = 0;
                    setJoyKnob({ x: 0, y: 0 });
                  }}
                  className="pointer-events-auto relative w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/[0.06] border-2 border-white/20 flex items-center justify-center touch-none"
                >
                  <div
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#ff2e63]/85 border-2 border-white/60 shadow-lg transition-transform duration-75"
                    style={{ transform: `translate(${joyKnob.x}px, ${joyKnob.y}px)` }}
                  />
                </div>
              ) : (
                <div />
              )}

              <div className="hidden md:block text-[11px] text-zinc-400 bg-[#0d0f14]/80 px-3 py-1 rounded border border-white/10">
                {meta.desktopHint}
              </div>

              <div className="pointer-events-auto flex items-center gap-2.5">
                {isSprint && (
                  <button
                    type="button"
                    onPointerDown={() => {
                      audioEngine.unlock();
                      inputRef.current.touchPrimaryHeld = true;
                    }}
                    onPointerUp={() => {
                      inputRef.current.touchPrimaryHeld = false;
                    }}
                    onPointerLeave={() => {
                      inputRef.current.touchPrimaryHeld = false;
                    }}
                    onPointerCancel={() => {
                      inputRef.current.touchPrimaryHeld = false;
                    }}
                    className="min-w-[132px] min-h-[60px] px-5 rounded-xl bg-[#10b981] active:bg-[#059669] active:scale-95 text-[#07080a] font-display text-lg font-extrabold tracking-wider uppercase shadow-lg touch-none"
                  >
                    Hold Sprint
                  </button>
                )}

                {isTug && (
                  <button
                    type="button"
                    onPointerDown={() => {
                      audioEngine.unlock();
                      inputRef.current.justPrimary = true;
                    }}
                    className="min-w-[152px] min-h-[64px] px-6 rounded-xl bg-[#ff2e63] active:bg-[#e11d48] active:scale-95 text-white font-display text-xl font-extrabold tracking-wider uppercase shadow-lg touch-none"
                  >
                    Tap Pull!
                  </button>
                )}

                {isBridge && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        audioEngine.unlock();
                        inputRef.current.justLeft = true;
                      }}
                      className="min-w-[104px] min-h-[54px] px-4 rounded-xl bg-[#141720]/95 border border-sky-400/50 active:scale-95 text-white font-display text-base font-bold tracking-wider uppercase shadow-lg"
                    >
                      Jump Left
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        audioEngine.unlock();
                        inputRef.current.justRight = true;
                      }}
                      className="min-w-[104px] min-h-[54px] px-4 rounded-xl bg-[#141720]/95 border border-sky-400/50 active:scale-95 text-white font-display text-base font-bold tracking-wider uppercase shadow-lg"
                    >
                      Jump Right
                    </button>
                  </div>
                )}

                {showDashOnly && (
                  <button
                    type="button"
                    onPointerDown={() => {
                      audioEngine.unlock();
                      inputRef.current.justSecondary = true;
                    }}
                    className="min-w-[92px] min-h-[58px] px-4 rounded-xl bg-sky-500 active:scale-95 text-[#07080a] font-display text-base font-extrabold tracking-wider uppercase flex items-center justify-center gap-1.5 shadow-lg touch-none"
                  >
                    <Wind className="w-4 h-4" />
                    <span>Dash</span>
                  </button>
                )}

                {isCombat && (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onPointerDown={() => {
                        audioEngine.unlock();
                        inputRef.current.touchGuardHeld = true;
                      }}
                      onPointerUp={() => {
                        inputRef.current.touchGuardHeld = false;
                      }}
                      onPointerLeave={() => {
                        inputRef.current.touchGuardHeld = false;
                      }}
                      onPointerCancel={() => {
                        inputRef.current.touchGuardHeld = false;
                      }}
                      className="min-w-[66px] sm:min-w-[74px] min-h-[54px] sm:min-h-[58px] px-2.5 sm:px-3 rounded-xl bg-sky-500/90 active:scale-95 text-[#07080a] font-display text-xs sm:text-sm font-extrabold uppercase flex flex-col items-center justify-center shadow-lg touch-none"
                    >
                      <Shield className="w-4 h-4" />
                      <span>Guard</span>
                    </button>
                    <button
                      type="button"
                      onPointerDown={() => {
                        audioEngine.unlock();
                        inputRef.current.justSecondary = true;
                      }}
                      className="min-w-[66px] sm:min-w-[74px] min-h-[54px] sm:min-h-[58px] px-2.5 sm:px-3 rounded-xl bg-amber-400 active:scale-95 text-[#07080a] font-display text-xs sm:text-sm font-extrabold uppercase flex flex-col items-center justify-center shadow-lg touch-none"
                    >
                      <Wind className="w-4 h-4" />
                      <span>Dodge</span>
                    </button>
                    <button
                      type="button"
                      onPointerDown={() => {
                        audioEngine.unlock();
                        inputRef.current.justPrimary = true;
                      }}
                      className="min-w-[74px] sm:min-w-[84px] min-h-[60px] sm:min-h-[64px] px-3 sm:px-4 rounded-xl bg-[#ff2e63] active:scale-95 text-white font-display text-sm sm:text-base font-extrabold uppercase flex flex-col items-center justify-center shadow-lg touch-none"
                    >
                      <Swords className="w-5 h-5" />
                      <span>Attack</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SPECTATOR MODE OVERLAY */}
      {screenState === 'spectating' && (
        <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="px-3.5 py-2 rounded-lg bg-[#0e1015]/95 border border-[#ff2e63]/60 shadow-lg">
              <div className="flex items-center gap-2 text-xs font-mono-num uppercase text-[#ff2e63]">
                <Eye className="w-4 h-4" />
                <span>Eliminated · Spectating Live Arena</span>
              </div>
              <div className="text-xs text-zinc-200 mt-0.5 tabular-nums">
                Survivors Left: <strong>{spectatorHud.aliveCount}</strong>/{spectatorHud.totalCount}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSetScreenState('gameover')}
              className="pointer-events-auto min-h-[44px] px-4 rounded-lg bg-[#ff2e63] hover:bg-[#e11d48] text-white font-bold text-xs uppercase tracking-wider shadow-lg"
            >
              Skip to Results
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3">
            <div className="px-3.5 py-2.5 rounded-xl bg-[#0e1015]/95 border border-white/15 max-w-md">
              <div className="text-[11px] font-mono-num uppercase text-sky-400">
                Arena Feed
              </div>
              <div className="text-xs text-zinc-200 mt-0.5">{spectatorHud.latestEvent}</div>
            </div>

            <div className="pointer-events-auto flex items-center gap-2 bg-[#0e1015]/95 border border-white/15 rounded-xl p-2">
              <button
                type="button"
                aria-label="Previous contender"
                onClick={() => cycleSpectatorTarget(-1)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-2 text-center min-w-[130px]">
                <div className="text-xs font-bold text-white">
                  #{spectatorHud.followedNum} · {spectatorHud.followedName}
                </div>
                <div className="text-[11px] text-amber-400">{spectatorHud.followedPersonality} AI</div>
              </div>
              <button
                type="button"
                aria-label="Next contender"
                onClick={() => cycleSpectatorTarget(1)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/15 text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAUSED MODAL */}
      {screenState === 'paused' && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pause-title"
            className="w-full max-w-sm rounded-xl bg-[#0e1015] border border-white/15 p-6 text-center shadow-2xl"
          >
            <h2 id="pause-title" className="font-display text-3xl font-bold text-white tracking-wide">
              Trial Paused
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Stage {stageMeta.id} · Level {levelId}: {meta.title}
            </p>
            <div className="mt-6 space-y-2.5">
              <button
                type="button"
                onClick={() => onSetScreenState('playing')}
                className="w-full min-h-[48px] rounded-lg bg-[#10b981] hover:bg-[#059669] text-[#07080a] font-bold text-sm flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Resume</span>
              </button>
              <button
                type="button"
                onClick={onRestartLevel}
                className="w-full min-h-[48px] rounded-lg bg-[#161922] hover:bg-[#1f2330] border border-white/12 text-white font-semibold text-sm"
              >
                Restart Trial
              </button>
              <button
                type="button"
                onClick={onExitToTitle}
                className="w-full min-h-[48px] rounded-lg bg-transparent hover:bg-white/5 border border-white/10 text-zinc-300 font-semibold text-sm"
              >
                Main Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEVEL CLEAR MODAL */}
      {screenState === 'level_clear' && lastOutcome && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-title"
            className="w-full max-w-md rounded-xl bg-[#0e1015] border border-[#10b981]/50 p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3.5">
              <img
                src={UI_SPRITES.trophyWin}
                alt=""
                aria-hidden="true"
                className="w-14 h-14 object-contain shrink-0 drop-shadow-[0_0_12px_rgba(251,191,36,0.45)]"
              />
              <div>
                <div className="text-xs font-mono-num uppercase tracking-widest text-[#10b981]">
                  Level {lastOutcome.levelId}/50 Cleared
                </div>
                <h2 id="clear-title" className="font-display text-4xl font-extrabold text-white mt-0.5 leading-none">
                  You Survived
                </h2>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-zinc-300 mt-2">{lastOutcome.detailLabel}</p>

            <div className="grid grid-cols-3 gap-2.5 my-5 tabular-nums">
              <div className="p-3 rounded-lg bg-[#141720] border border-white/10">
                <div className="text-[11px] text-zinc-400">Score</div>
                <div className="font-mono-num text-lg font-bold text-white">{lastOutcome.score}</div>
              </div>
              <div className="p-3 rounded-lg bg-[#141720] border border-white/10">
                <div className="text-[11px] text-zinc-400">Coins</div>
                <div className="font-mono-num text-lg font-bold text-amber-400 inline-flex items-center gap-1.5">
                  <img src={UI_SPRITES.coin} alt="" aria-hidden="true" className="w-4 h-4 object-contain" />
                  <span>+{lastOutcome.coinsEarned}</span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#141720] border border-white/10">
                <div className="text-[11px] text-zinc-400">XP Earned</div>
                <div className="font-mono-num text-lg font-bold text-sky-300">
                  +{lastOutcome.xpEarned}
                </div>
              </div>
            </div>

            {(lastOutcome.perfectBonus || lastOutcome.streakBonusCoins > 0 || stageBonusAwarded) && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-400/30 text-xs text-emerald-200 space-y-1">
                {lastOutcome.perfectBonus && <div>Perfect Victory Bonus (+25% Coins & +60 XP)</div>}
                {lastOutcome.streakBonusCoins > 0 && (
                  <div>Survival Streak Bonus (+{lastOutcome.streakBonusCoins} Coins)</div>
                )}
                {stageBonusAwarded && (
                  <div className="font-bold text-amber-300">
                    Stage {stageBonusAwarded.stageId} Complete! +{stageBonusAwarded.coins} Coins & +{stageBonusAwarded.xp} XP
                  </div>
                )}
              </div>
            )}

            {newAchievements.length > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-400/30 space-y-1.5">
                {newAchievements.map((ach) => {
                  const achIdx = Math.max(0, ACHIEVEMENTS.findIndex((a) => a.id === ach.id));
                  return (
                    <div key={ach.id} className="flex items-center justify-between text-xs text-amber-200">
                      <span className="inline-flex items-center gap-2 font-semibold">
                        <img
                          src={ACHIEVEMENT_BADGES[achIdx % ACHIEVEMENT_BADGES.length]}
                          alt=""
                          aria-hidden="true"
                          className="w-5 h-5 object-contain shrink-0"
                        />
                        <span>Unlocked: {ach.title}</span>
                      </span>
                      <span className="font-mono-num">+{ach.rewardCoins}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                data-start="true"
                onClick={onNextLevel}
                className="flex-1 min-h-[48px] rounded-lg bg-[#10b981] hover:bg-[#059669] text-[#07080a] font-bold text-sm"
              >
                Next Level ({Math.min(50, lastOutcome.levelId + 1)})
              </button>
              <button
                type="button"
                onClick={onRestartLevel}
                className="min-h-[48px] px-4 rounded-lg bg-[#161922] hover:bg-[#1f2330] border border-white/12 text-white font-semibold text-sm"
              >
                Replay
              </button>
              <button
                type="button"
                onClick={onExitToTitle}
                className="min-h-[48px] px-4 rounded-lg bg-transparent hover:bg-white/5 border border-white/10 text-zinc-300 font-semibold text-sm"
              >
                Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL */}
      {screenState === 'gameover' && lastOutcome && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="gameover-title"
            className="w-full max-w-md rounded-xl bg-[#0e1015] border border-[#ff2e63]/60 p-6 shadow-2xl"
          >
            <div className="flex items-center gap-3.5">
              <img
                src={UI_SPRITES.skullDefeat}
                alt=""
                aria-hidden="true"
                className="w-14 h-14 object-contain shrink-0 drop-shadow-[0_0_12px_rgba(255,46,99,0.5)]"
              />
              <div>
                <div className="text-xs font-mono-num uppercase tracking-widest text-[#ff2e63]">
                  Player Eliminated · Level {lastOutcome.levelId}
                </div>
                <h2 id="gameover-title" className="font-display text-4xl font-extrabold text-white mt-0.5 leading-none">
                  Game Over
                </h2>
              </div>
            </div>
            <p className="text-sm text-zinc-300 mt-2">{lastOutcome.reason}</p>

            <div className="grid grid-cols-2 gap-2.5 my-5 tabular-nums">
              <div className="p-3 rounded-lg bg-[#141720] border border-white/10">
                <div className="text-[11px] text-zinc-400">Progress</div>
                <div className="text-sm font-semibold text-white mt-0.5">
                  {lastOutcome.detailLabel}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[#141720] border border-white/10">
                <div className="text-[11px] text-zinc-400">Run Score</div>
                <div className="font-mono-num text-lg font-bold text-[#ff2e63]">
                  {lastOutcome.score}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                data-start="true"
                onClick={onRestartLevel}
                className="flex-1 min-h-[48px] rounded-lg bg-[#ff2e63] hover:bg-[#e11d48] text-white font-bold text-sm"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={() => onSetScreenState('spectating')}
                className="min-h-[48px] px-3 rounded-lg bg-[#161922] hover:bg-[#1f2330] border border-white/12 text-sky-300 font-semibold text-sm inline-flex items-center justify-center gap-1.5"
              >
                <Eye className="w-4 h-4" />
                <span>Spectate</span>
              </button>
              <button
                type="button"
                onClick={onOpenLevelSelect}
                className="min-h-[48px] px-4 rounded-lg bg-[#161922] hover:bg-[#1f2330] border border-white/12 text-white font-semibold text-sm"
              >
                Levels
              </button>
              <button
                type="button"
                onClick={onExitToTitle}
                className="min-h-[48px] px-4 rounded-lg bg-transparent hover:bg-white/5 border border-white/10 text-zinc-300 font-semibold text-sm"
              >
                Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXCLUSIVE LEVEL 50 ULTIMATE CHAMPION ENDING */}
      {screenState === 'champion' && (
        <ChampionModal
          save={save}
          lastOutcome={lastOutcome}
          onReplayFinal={onRestartLevel}
          onExitToTitle={onExitToTitle}
        />
      )}
    </div>
  );
};
