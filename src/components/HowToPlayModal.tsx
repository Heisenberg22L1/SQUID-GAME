import React, { useState } from 'react';
import { Crown, X } from 'lucide-react';
import { LEVEL_METADATA, STAGES } from '../game/rules';
import type { StageId } from '../game/types';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  const [stageFilter, setStageFilter] = useState<StageId>(1);
  const filteredLevels = LEVEL_METADATA.filter((l) => l.stage === stageFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-to-play-title"
        className="w-full max-w-3xl max-h-[90dvh] flex flex-col rounded-xl bg-[#0e1015] border border-white/15 shadow-2xl overflow-hidden"
      >
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 id="how-to-play-title" className="font-display text-2xl sm:text-3xl font-bold tracking-wide text-white">
              50-Trial Survival Manual
            </h2>
            <p className="text-xs text-zinc-400">
              Inspect controls and win conditions across all 5 tournament stages.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close how to play"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="shrink-0 px-5 pt-2 flex items-center gap-1.5 border-b border-white/10 overflow-x-auto">
          {STAGES.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStageFilter(st.id)}
              className={`min-h-[42px] px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                stageFilter === st.id
                  ? 'border-[#ff2e63] text-white'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Stage {st.id}: {st.name}
            </button>
          ))}
        </div>

        <div className="p-5 overflow-y-auto custom-scroll space-y-3.5">
          {filteredLevels.map((lvl) => (
            <div
              key={lvl.id}
              className={`p-4 rounded-xl border ${
                lvl.isBoss
                  ? 'bg-[#191118] border-amber-400/40'
                  : 'bg-[#141720] border-white/10'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-lg font-bold text-white flex items-center gap-1.5">
                  {lvl.isBoss && <Crown className="w-4 h-4 text-amber-400" />}
                  <span>{String(lvl.id).padStart(2, '0')}. {lvl.title}</span>
                  <span className="text-xs font-sans font-normal text-sky-300 ml-1">
                    ({lvl.mechanicTag})
                  </span>
                </h3>
                <span className="text-xs font-mono-num text-amber-400 shrink-0">
                  +{lvl.baseCoins} Coins · +{lvl.baseXp} XP
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 mt-1.5 leading-relaxed">
                {lvl.description}
              </p>
              <div className="mt-2.5 text-xs text-zinc-400 space-y-1">
                <div>
                  <strong className="text-zinc-200">Touch:</strong> {lvl.mobileHint}
                </div>
                <div>
                  <strong className="text-zinc-200">Keyboard:</strong> {lvl.desktopHint}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
