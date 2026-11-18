import React, { useState } from 'react';
import { Maximize2, Minimize2, Music, RotateCcw, Volume2, VolumeX, X } from 'lucide-react';
import { audioEngine } from '../game/audio';
import type { AudioSettings, Difficulty, MusicTrackPreference, SaveData } from '../game/types';

interface SettingsModalProps {
  save: SaveData;
  isFullscreen: boolean;
  onChangeDifficulty: (d: Difficulty) => void;
  onChangeAudio: (next: AudioSettings) => void;
  onToggleFullscreen: () => void;
  onResetProgress: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  save,
  isFullscreen,
  onChangeDifficulty,
  onChangeAudio,
  onToggleFullscreen,
  onResetProgress,
  onClose,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="w-full max-w-md rounded-xl bg-[#0e1015] border border-white/15 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 id="settings-title" className="font-display text-2xl font-bold tracking-wide text-white">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Difficulty */}
          <div>
            <div className="text-xs font-semibold text-zinc-300 mb-2">Difficulty</div>
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'normal', 'hard'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onChangeDifficulty(d)}
                  className={`min-h-[44px] rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${
                    save.difficulty === d
                      ? 'bg-[#ff2e63] border-[#ff2e63] text-white'
                      : 'bg-[#141720] border-white/12 text-zinc-300 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-400 mt-1.5">
              {save.difficulty === 'easy'
                ? 'Extra lives, longer timers, forgiving tolerances.'
                : save.difficulty === 'hard'
                ? 'Faster AI, tighter timers, +45% coin & XP rewards.'
                : 'Balanced survival rules and standard timers.'}
            </p>
          </div>

          {/* Music Volume */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 mb-2">
              <label htmlFor="music-vol">Music Volume</label>
              <span className="font-mono-num text-zinc-400">
                {Math.round(save.settings.musicVolume * 100)}%
              </span>
            </div>
            <input
              id="music-vol"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={save.settings.musicVolume}
              onChange={(e) =>
                onChangeAudio({ ...save.settings, musicVolume: Number(e.target.value) })
              }
              className="w-full accent-[#ff2e63]"
            />
          </div>

          {/* Music Track Selection */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 mb-2">
              <Music className="w-3.5 h-3.5 text-[#ff2e63]" />
              <span>Music Track</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'auto', label: 'Auto (Level Match)' },
                  { id: 'jump_rope', label: 'Jump Rope Song' },
                  { id: 'mingle', label: 'Mingle Game Song' },
                  { id: 'synth', label: 'Retro Arena Synth' },
                ] as { id: MusicTrackPreference; label: string }[]
              ).map((opt) => {
                const active = (save.settings.musicTrack ?? 'auto') === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      audioEngine.unlock();
                      audioEngine.click();
                      onChangeAudio({ ...save.settings, musicTrack: opt.id });
                    }}
                    className={`min-h-[40px] px-2.5 rounded-lg text-xs font-semibold border transition-colors ${
                      active
                        ? 'bg-[#ff2e63]/20 border-[#ff2e63] text-white'
                        : 'bg-[#141720] border-white/12 text-zinc-300 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SFX Volume */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 mb-2">
              <label htmlFor="sfx-vol">Sound Effects Volume</label>
              <span className="font-mono-num text-zinc-400">
                {Math.round(save.settings.sfxVolume * 100)}%
              </span>
            </div>
            <input
              id="sfx-vol"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={save.settings.sfxVolume}
              onChange={(e) =>
                onChangeAudio({ ...save.settings, sfxVolume: Number(e.target.value) })
              }
              className="w-full accent-[#10b981]"
            />
          </div>

          {/* Mute & Fullscreen Toggles */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() =>
                onChangeAudio({ ...save.settings, muted: !save.settings.muted })
              }
              className="min-h-[44px] px-3 rounded-lg bg-[#141720] border border-white/12 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-2 hover:border-white/30"
            >
              {save.settings.muted ? (
                <>
                  <VolumeX className="w-4 h-4 text-[#ff2e63]" />
                  <span>Unmute All</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-[#10b981]" />
                  <span>Mute All</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onToggleFullscreen}
              className="min-h-[44px] px-3 rounded-lg bg-[#141720] border border-white/12 text-xs font-semibold text-zinc-200 flex items-center justify-center gap-2 hover:border-white/30"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span>Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span>Fullscreen</span>
                </>
              )}
            </button>
          </div>

          {/* Reset Save Data */}
          <div className="pt-3 border-t border-white/10">
            {!confirmReset ? (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="w-full min-h-[44px] rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-500/30 text-xs font-semibold text-red-300 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Saved Progress</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetProgress();
                    setConfirmReset(false);
                  }}
                  className="flex-1 min-h-[44px] rounded-lg bg-[#ff2e63] text-xs font-bold text-white"
                >
                  Confirm Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 min-h-[44px] rounded-lg bg-white/10 text-xs font-semibold text-zinc-200"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
