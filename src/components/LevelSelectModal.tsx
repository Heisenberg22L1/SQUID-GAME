import React, { useState } from 'react';
import { CheckCircle2, Crown, Lock, Play, X } from 'lucide-react';
import { BOSS_CARD_URLS, STAGE_BG_URLS, UI_SPRITES } from '../game/assets';
import {
  canUnlockLevel,
  getStageCompletion,
  getTournamentCompletionPercent,
  LEVEL_METADATA,
  STAGES,
} from '../game/rules';
import type { LevelId, SaveData, StageId } from '../game/types';

interface LevelSelectModalProps {
  save: SaveData;
  practiceMode: boolean;
  onTogglePracticeMode: () => void;
  onSelectLevel: (levelId: LevelId) => void;
  onClose: () => void;
}

export const LevelSelectModal: React.FC<LevelSelectModalProps> = ({
  save,
  practiceMode,
  onTogglePracticeMode,
  onSelectLevel,
  onClose,
}) => {
  const initialStage = (Math.ceil(save.unlockedLevel / 10) as StageId) || 1;
  const [selectedStage, setSelectedStage] = useState<StageId | 'all'>(initialStage);

  const tournamentPct = getTournamentCompletionPercent(save.completedLevels);
  const visibleLevels =
    selectedStage === 'all'
      ? LEVEL_METADATA
      : LEVEL_METADATA.filter((l) => l.stage === selectedStage);

  const activeStageMeta =
    selectedStage === 'all' ? null : STAGES.find((s) => s.id === selectedStage) ?? STAGES[0];
  const activeStageComp =
    selectedStage === 'all' ? null : getStageCompletion(save.completedLevels, selectedStage);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="level-select-title"
        className="w-full max-w-5xl max-h-[92dvh] flex flex-col rounded-xl bg-[#0e1015] border border-white/15 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-white/10">
          <div>
            <h2 id="level-select-title" className="font-display text-2xl sm:text-3xl font-bold tracking-wide text-white">
              50-Level Survival Tournament
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-36 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-[#10b981] transition-all"
                  style={{ width: `${tournamentPct}%` }}
                />
              </div>
              <span className="text-xs font-mono-num text-zinc-300 tabular-nums">
                {save.completedLevels.length}/50 Cleared ({tournamentPct}%)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onTogglePracticeMode}
              aria-pressed={practiceMode}
              className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                practiceMode
                  ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                  : 'bg-[#161922] border-white/15 text-zinc-300 hover:text-white'
              }`}
            >
              Practice Mode: {practiceMode ? 'ON' : 'OFF'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close level selection"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stage Tabs */}
        <div className="shrink-0 px-5 pt-2 flex items-center gap-1 border-b border-white/10 overflow-x-auto">
          {STAGES.map((st) => {
            const comp = getStageCompletion(save.completedLevels, st.id);
            const active = selectedStage === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStage(st.id)}
                className={`min-h-[44px] px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  active
                    ? 'border-[#ff2e63] text-white'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>Stage {st.id}</span>
                <span className="font-mono-num text-[11px] px-1.5 py-0.5 rounded bg-white/8 text-zinc-300">
                  {comp.completedCount}/10
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setSelectedStage('all')}
            className={`min-h-[44px] px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              selectedStage === 'all'
                ? 'border-[#10b981] text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All 50
          </button>
        </div>

        {/* Stage Summary Bar */}
        {activeStageMeta && activeStageComp && (
          <div className="shrink-0 relative px-5 py-3 bg-[#12151d] border-b border-white/8 flex flex-wrap items-center justify-between gap-3 overflow-hidden">
            <img
              src={STAGE_BG_URLS[activeStageMeta.id]}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
            />
            <div className="relative z-10 flex items-center gap-3">
              <img
                src={STAGE_BG_URLS[activeStageMeta.id]}
                alt={`Stage ${activeStageMeta.id} backdrop`}
                className="hidden sm:block w-20 h-11 rounded-md object-cover border border-white/15 shrink-0"
              />
              <div>
                <div className="text-xs font-bold text-white">
                  Stage {activeStageMeta.id}: {activeStageMeta.name} · {activeStageMeta.subtitle}
                </div>
                <div className="text-[11px] text-amber-300 mt-0.5">
                  Stage Completion Reward: +{activeStageMeta.completionCoins} Coins · +{activeStageMeta.completionXp} XP
                  {save.claimedStageRewards.includes(activeStageMeta.id) ? ' (Claimed)' : ''}
                </div>
              </div>
            </div>
            <div className="relative z-10 flex items-center gap-2.5">
              <div className="w-28 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-[#ff2e63] transition-all"
                  style={{ width: `${activeStageComp.percent}%` }}
                />
              </div>
              <span className="text-xs font-mono-num text-zinc-200">
                {activeStageComp.percent}%
              </span>
            </div>
          </div>
        )}

        {/* Levels Grid */}
        <div className="p-4 sm:p-5 overflow-y-auto custom-scroll grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visibleLevels.map((lvl) => {
            const unlocked = canUnlockLevel(lvl.id, save.unlockedLevel, practiceMode);
            const completed = save.completedLevels.includes(lvl.id);
            const best = save.bestScores[lvl.id] ?? 0;
            const bossCardUrl = lvl.isBoss ? BOSS_CARD_URLS[lvl.id] : undefined;

            return (
              <button
                key={lvl.id}
                type="button"
                disabled={!unlocked}
                onClick={() => onSelectLevel(lvl.id)}
                className={`text-left p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5 ${
                  lvl.isBoss && unlocked
                    ? 'bg-gradient-to-br from-[#1d1118] to-[#141720] border-amber-400/45 hover:border-amber-300 cursor-pointer'
                    : unlocked
                    ? 'bg-[#141720] border-white/12 hover:border-[#ff2e63] cursor-pointer active:scale-[0.99]'
                    : 'bg-[#0b0c10] border-white/5 opacity-55 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {bossCardUrl && (
                      <img
                        src={bossCardUrl}
                        alt={lvl.bossName ?? lvl.title}
                        className={`w-11 h-14 rounded-md object-cover border shrink-0 ${
                          unlocked ? 'border-amber-400/60' : 'border-white/10 grayscale opacity-60'
                        }`}
                        loading="lazy"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono-num text-zinc-400">
                        <span>LVL {String(lvl.id).padStart(2, '0')}</span>
                        <span>·</span>
                        <span className={lvl.isBoss ? 'text-amber-400 font-bold' : 'text-sky-300'}>
                          {lvl.mechanicTag}
                        </span>
                      </div>
                      <h3 className="font-display text-lg font-bold text-white mt-0.5 flex items-center gap-1.5">
                        {lvl.isBoss && <Crown className="w-4 h-4 text-amber-400 shrink-0" />}
                        <span className="truncate">{lvl.title}</span>
                      </h3>
                    </div>
                  </div>
                  <div className="shrink-0 mt-0.5">
                    {!unlocked ? (
                      <Lock className="w-4 h-4 text-zinc-500" />
                    ) : completed ? (
                      <img src={UI_SPRITES.check} alt="Completed" className="w-5 h-5 object-contain" />
                    ) : (
                      <Play className="w-4 h-4 text-[#ff2e63]" />
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                  {lvl.description}
                </p>

                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-white/8 tabular-nums">
                  <span className="text-zinc-400">
                    Best: <strong className="text-zinc-200 font-mono-num">{best}</strong>
                  </span>
                  <span className="text-amber-400 font-mono-num inline-flex items-center gap-1">
                    <img src={UI_SPRITES.coin} alt="" aria-hidden="true" className="w-3.5 h-3.5 object-contain" />
                    +{lvl.baseCoins}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
