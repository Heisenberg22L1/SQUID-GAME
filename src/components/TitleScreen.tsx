import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Crown,
  Grid,
  Maximize2,
  Minimize2,
  Play,
  Settings,
  Sparkles,
  User,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { getPlayerRank, getTournamentCompletionPercent } from '../game/rules';
import type { SaveData } from '../game/types';
import { PWAInstallButton } from './PWAInstallButton';

interface TitleScreenProps {
  save: SaveData;
  isFullscreen: boolean;
  onStartContinue: () => void;
  onOpenLevels: () => void;
  onOpenShop: () => void;
  onOpenDashboard: () => void;
  onOpenHowToPlay: () => void;
  onOpenSettings: () => void;
  onOpenChampion?: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  save,
  isFullscreen,
  onStartContinue,
  onOpenLevels,
  onOpenShop,
  onOpenDashboard,
  onOpenHowToPlay,
  onOpenSettings,
  onOpenChampion,
  onToggleMute,
  onToggleFullscreen,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
        e.preventDefault();
        onStartContinue();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStartContinue]);

  const hasProgress = save.unlockedLevel > 1;
  const rank = getPlayerRank(save.xp);
  const completionPct = getTournamentCompletionPercent(save.completedLevels);

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden bg-[#07080a] flex flex-col justify-between select-none">
      {/* Illustrated Key-Art Backdrop */}
      <div className="absolute inset-0 z-0">
        {!imgFailed ? (
          <img
            src="/src/assets/images/title_bg_1794989169015.jpg"
            alt="Nocturnal Squid Survival Arena Courtyard"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover object-right opacity-85"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#07080a] via-[#170911] to-[#050608]" />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(95deg, rgba(7,8,10,0.95) 0%, rgba(7,8,10,0.80) 48%, rgba(7,8,10,0.28) 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(7,8,10,0.6) 0%, rgba(7,8,10,0) 28%, rgba(7,8,10,0.9) 100%)',
          }}
        />
      </div>

      {/* Top Utility Row */}
      <div className="relative z-10 flex items-center justify-between gap-2 px-4 sm:px-10 pt-4 sm:pt-5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-zinc-300 font-medium tabular-nums">
          <span className="text-[#f4f4f6] font-semibold">{save.playerName}</span>
          <span aria-hidden="true" className="text-zinc-500">·</span>
          <span className="font-mono-num text-xs" style={{ color: rank.current.color }}>
            {rank.current.name}
          </span>
          <span aria-hidden="true" className="text-zinc-500 hidden sm:inline">·</span>
          <span className="hidden sm:inline font-mono-num text-[#10b981]">{completionPct}% Done</span>
          <span aria-hidden="true" className="text-zinc-500">·</span>
          <span className="text-amber-400 font-mono-num">{save.coins} Coins</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton />
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={save.settings.muted ? 'Unmute audio' : 'Mute audio'}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg bg-[#111318]/90 border border-white/15 text-zinc-200 hover:text-white hover:border-white/35 transition-colors"
          >
            {save.settings.muted ? <VolumeX className="w-5 h-5 text-[#ff2e63]" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="min-w-[44px] min-h-[44px] hidden sm:flex items-center justify-center rounded-lg bg-[#111318]/90 border border-white/15 text-zinc-200 hover:text-white hover:border-white/35 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Centerpiece Left-Third Title Lockup & Menu */}
      <section className="relative z-10 flex-1 flex items-center px-5 sm:px-10 md:px-16">
        <div className="w-full max-w-2xl">
          <svg
            viewBox="0 0 520 148"
            className="w-full max-w-[450px] h-auto mb-2 overflow-visible"
            role="img"
            aria-label="Squid Survival"
          >
            <circle cx="24" cy="24" r="14" fill="none" stroke="#ff2e63" strokeWidth="4.5" />
            <polygon points="68,10 84,38 52,38" fill="none" stroke="#f4f4f6" strokeWidth="4" strokeLinejoin="round" />
            <rect x="98" y="10" width="26" height="26" fill="none" stroke="#10b981" strokeWidth="4.5" />

            <text
              x="0"
              y="102"
              fill="#f4f4f6"
              fontFamily="'Barlow Condensed', sans-serif"
              fontWeight="800"
              fontSize="74"
              letterSpacing="3"
            >
              SQUID
            </text>
            <text
              x="184"
              y="102"
              fill="#ff2e63"
              fontFamily="'Barlow Condensed', sans-serif"
              fontWeight="800"
              fontSize="74"
              letterSpacing="3"
            >
              SURVIVAL
            </text>
            <line x1="0" y1="120" x2="320" y2="120" stroke="#ff2e63" strokeWidth="3" />
            <text
              x="0"
              y="142"
              fill="#d4d4d8"
              fontFamily="'JetBrains Mono', monospace"
              fontWeight="700"
              fontSize="13.5"
              letterSpacing="4"
            >
              50-LEVEL TOURNAMENT · ONLY ONE SURVIVES
            </text>
          </svg>

          <p className="text-sm sm:text-base text-zinc-300 max-w-md leading-relaxed mt-3 mb-6">
            Five lethal stages, 50 unique survival trials, and five cinematic boss battles. Customize your contender and conquer The Final Champion.
          </p>

          {/* Primary Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-md">
            <button
              type="button"
              data-start="true"
              onClick={onStartContinue}
              className="min-h-[52px] px-7 py-3 rounded-lg bg-[#ff2e63] hover:bg-[#e11d48] active:scale-[0.98] text-white font-display text-xl font-bold tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-[#ff2e63]/25 transition-all whitespace-nowrap shrink-0"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{hasProgress ? `Continue · Level ${save.unlockedLevel}` : 'Play Tournament'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenLevels}
              className="min-h-[52px] px-5 py-3 rounded-lg bg-[#14171f] hover:bg-[#1c202b] border border-white/15 text-zinc-100 font-semibold text-sm flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <Grid className="w-4 h-4 text-[#10b981]" />
              <span>Levels (50)</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button
              type="button"
              onClick={onOpenShop}
              className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#101218]/90 hover:bg-[#191d26] border border-white/12 text-xs sm:text-sm font-medium text-zinc-200 flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Character Shop</span>
            </button>
            <button
              type="button"
              onClick={onOpenDashboard}
              className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#101218]/90 hover:bg-[#191d26] border border-white/12 text-xs sm:text-sm font-medium text-zinc-200 flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <User className="w-4 h-4 text-[#10b981]" />
              <span>Profile & Ranks</span>
            </button>
            <button
              type="button"
              onClick={onOpenHowToPlay}
              className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#101218]/90 hover:bg-[#191d26] border border-white/12 text-xs sm:text-sm font-medium text-zinc-200 flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4 text-sky-400" />
              <span>How To Play</span>
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="min-h-[44px] px-3.5 py-2 rounded-lg bg-[#101218]/90 hover:bg-[#191d26] border border-white/12 text-xs sm:text-sm font-medium text-zinc-200 flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <Settings className="w-4 h-4 text-zinc-400" />
              <span>Settings</span>
            </button>
            {save.championUnlocked && onOpenChampion && (
              <button
                type="button"
                onClick={onOpenChampion}
                className="min-h-[44px] px-3.5 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Crown className="w-4 h-4" />
                <span>Champion Hall</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Bottom Footer */}
      <footer className="relative z-10 px-5 sm:px-10 pb-4 sm:pb-5 flex items-center justify-between text-xs text-zinc-400">
        <span className="tracking-wide">
          WASD / Touch Joystick Move · Space / Tap Action · Esc Pause
        </span>
        <span className="hidden sm:inline font-mono-num uppercase text-zinc-500">
          ID: {save.playerId} · {save.difficulty}
        </span>
      </footer>
    </main>
  );
};
