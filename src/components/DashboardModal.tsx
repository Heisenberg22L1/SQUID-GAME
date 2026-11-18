import React, { useState } from 'react';
import { Award, Coins, Gift, ShieldCheck, Trophy, X } from 'lucide-react';
import {
  ACHIEVEMENT_BADGES,
  CHARACTER_SPRITES,
  OUTFIT_SPRITES,
  UI_SPRITES,
} from '../game/assets';
import {
  ACHIEVEMENTS,
  canClaimDailyReward,
  computeWinPercentage,
  getPlayerRank,
  getTournamentCompletionPercent,
} from '../game/rules';
import { getTodayIsoDate } from '../game/storage';
import type { SaveData } from '../game/types';

interface DashboardModalProps {
  save: SaveData;
  onUpdatePlayerName: (name: string) => void;
  onClaimDaily: () => void;
  onOpenShop: () => void;
  onClose: () => void;
}

export const DashboardModal: React.FC<DashboardModalProps> = ({
  save,
  onUpdatePlayerName,
  onClaimDaily,
  onOpenShop,
  onClose,
}) => {
  const [tab, setTab] = useState<'profile' | 'achievements' | 'leaderboard'>('profile');
  const [boardFilter, setBoardFilter] = useState<'all' | 'weekly' | 'daily'>('all');
  const [nameInput, setNameInput] = useState(save.playerName);
  const [dailyNotice, setDailyNotice] = useState<string | null>(null);

  const today = getTodayIsoDate();
  const dailyAvailable = canClaimDailyReward(save, today);
  const winPct = computeWinPercentage(save.totalWins, save.totalGames);
  const bestScoreSum = Object.values(save.bestScores).reduce((sum, v) => sum + v, 0);
  const rankInfo = getPlayerRank(save.xp);
  const tournamentPct = getTournamentCompletionPercent(save.completedLevels);

  const handleNameSave = () => {
    const trimmed = nameInput.trim();
    if (trimmed) onUpdatePlayerName(trimmed);
  };

  const filteredLeaderboard = save.leaderboard.filter((entry) => {
    if (boardFilter === 'all') return true;
    if (boardFilter === 'daily') return entry.date === today;
    // Weekly: within 7 days of today
    const entryMs = Date.parse(entry.date);
    const todayMs = Date.parse(today);
    if (Number.isNaN(entryMs) || Number.isNaN(todayMs)) return true;
    return todayMs - entryMs <= 7 * 86400000;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-title"
        className="w-full max-w-4xl max-h-[90dvh] flex flex-col rounded-xl bg-[#0e1015] border border-white/15 shadow-2xl overflow-hidden"
      >
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 id="dashboard-title" className="font-display text-2xl sm:text-3xl font-bold tracking-wide text-white">
              Contender Profile & Rankings
            </h2>
            <p className="text-xs font-mono-num text-zinc-400">
              ID: {save.playerId} · Rank: <span style={{ color: rankInfo.current.color }}>{rankInfo.current.name}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dashboard"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Segmented Tabs */}
        <div className="shrink-0 px-5 pt-2 flex items-center gap-1 border-b border-white/10 overflow-x-auto">
          <button
            type="button"
            onClick={() => setTab('profile')}
            className={`min-h-[42px] px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              tab === 'profile'
                ? 'border-[#ff2e63] text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Profile & Rank
          </button>
          <button
            type="button"
            onClick={() => setTab('achievements')}
            className={`min-h-[42px] px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              tab === 'achievements'
                ? 'border-[#ff2e63] text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Achievements ({save.unlockedAchievements.length}/{ACHIEVEMENTS.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('leaderboard')}
            className={`min-h-[42px] px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              tab === 'leaderboard'
                ? 'border-[#ff2e63] text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Leaderboard (Local Mode)
          </button>
        </div>

        <div className="p-5 overflow-y-auto custom-scroll space-y-5">
          {tab === 'profile' && (
            <>
              {/* Rank & XP Bar */}
              <div className="p-4 rounded-xl bg-[#141720] border border-white/10">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-[#0b0d12] border border-white/15 flex items-center justify-center shrink-0 overflow-hidden">
                      <img
                        src={
                          save.equipped.outfitId !== 'out_emerald' && OUTFIT_SPRITES[save.equipped.outfitId]
                            ? OUTFIT_SPRITES[save.equipped.outfitId]
                            : CHARACTER_SPRITES[save.equipped.characterId] ?? CHARACTER_SPRITES.char_456
                        }
                        alt={save.playerName}
                        className="w-11 h-11 object-contain"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">Tournament Rank</div>
                      <div className="font-display text-2xl font-bold" style={{ color: rankInfo.current.color }}>
                        {rankInfo.current.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className="text-xs font-mono-num text-zinc-300">
                      {save.xp} XP {rankInfo.next ? `/ ${rankInfo.next.minXp} XP (${rankInfo.next.name})` : '(MAX RANK)'}
                    </div>
                    <div className="text-xs text-[#10b981] font-semibold mt-0.5">
                      Tournament Completion: {tournamentPct}%
                    </div>
                  </div>
                </div>
                <div className="w-full h-2.5 rounded-full bg-black/50 overflow-hidden border border-white/10">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${Math.round(rankInfo.progress * 100)}%`,
                      backgroundColor: rankInfo.current.color,
                    }}
                  />
                </div>
              </div>

              {/* Player Name & Daily Reward */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#141720] border border-white/10">
                  <label htmlFor="player-name-input" className="block text-xs font-medium text-zinc-400 mb-2">
                    Player Name
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      id="player-name-input"
                      type="text"
                      maxLength={20}
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onBlur={handleNameSave}
                      className="flex-1 min-h-[44px] px-3 rounded-lg bg-[#0b0d12] border border-white/15 text-sm text-white focus:outline-none focus:border-[#ff2e63]"
                    />
                    <button
                      type="button"
                      onClick={handleNameSave}
                      className="min-h-[44px] px-4 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#141720] border border-white/10 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium text-zinc-400">Daily Supply Bonus</div>
                    <div className="text-sm font-semibold text-white mt-0.5 tabular-nums">
                      Streak: Day {save.dailyStreak} · +{100 + Math.min(7, save.dailyStreak + 1) * 50} Coins
                    </div>
                    {dailyNotice && (
                      <div className="text-xs text-[#10b981] mt-1">{dailyNotice}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!dailyAvailable}
                    onClick={() => {
                      onClaimDaily();
                      setDailyNotice('Daily reward added to balance.');
                    }}
                    className={`min-h-[44px] px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                      dailyAvailable
                        ? 'bg-amber-400 text-[#07080a] hover:bg-amber-300'
                        : 'bg-white/5 text-zinc-500 cursor-not-allowed'
                    }`}
                  >
                    <Gift className="w-4 h-4" />
                    <span>{dailyAvailable ? 'Claim' : 'Claimed'}</span>
                  </button>
                </div>
              </div>

              {/* Player Stats Row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 tabular-nums">
                <div className="p-3.5 rounded-xl bg-[#141720] border border-white/10">
                  <div className="text-xs text-zinc-400">Current Level</div>
                  <div className="font-mono-num text-xl font-bold text-white mt-1">
                    {save.unlockedLevel}/50
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#141720] border border-white/10">
                  <div className="text-xs text-zinc-400">Coins</div>
                  <div className="font-mono-num text-xl font-bold text-amber-400 mt-1">
                    {save.coins}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#141720] border border-white/10">
                  <div className="text-xs text-zinc-400">Cleared</div>
                  <div className="font-mono-num text-xl font-bold text-[#10b981] mt-1">
                    {save.completedLevels.length}/50
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#141720] border border-white/10">
                  <div className="text-xs text-zinc-400">Win Rate</div>
                  <div className="font-mono-num text-xl font-bold text-white mt-1">
                    {winPct}%
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#141720] border border-white/10">
                  <div className="text-xs text-zinc-400">Best Streak</div>
                  <div className="font-mono-num text-xl font-bold text-sky-400 mt-1">
                    {save.bestWinStreak}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#141720] border border-white/10">
                  <div className="text-xs text-zinc-400">Best Total</div>
                  <div className="font-mono-num text-xl font-bold text-[#ff2e63] mt-1">
                    {bestScoreSum}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#141720] border border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-white">Character Armory & Customization</div>
                  <div className="text-xs text-zinc-400">
                    10 Characters · 20 Outfits · 10 Masks · 10 Accessories
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onOpenShop}
                  className="min-h-[44px] px-4 rounded-lg bg-[#ff2e63] hover:bg-[#e11d48] text-white text-xs font-bold inline-flex items-center gap-2"
                >
                  <Coins className="w-4 h-4" />
                  <span>Open Character Shop</span>
                </button>
              </div>
            </>
          )}

          {tab === 'achievements' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ACHIEVEMENTS.map((ach, idx) => {
                const unlocked = save.unlockedAchievements.includes(ach.id);
                const badgeUrl = ACHIEVEMENT_BADGES[idx % ACHIEVEMENT_BADGES.length];
                return (
                  <div
                    key={ach.id}
                    className={`p-4 rounded-xl border flex items-start gap-3 ${
                      unlocked
                        ? 'bg-[#141720] border-[#10b981]/50'
                        : 'bg-[#0b0d12] border-white/8 opacity-65'
                    }`}
                  >
                    <img
                      src={badgeUrl}
                      alt=""
                      aria-hidden="true"
                      className={`w-10 h-10 object-contain shrink-0 ${
                        unlocked ? 'drop-shadow-[0_0_8px_rgba(251,191,36,0.45)]' : 'grayscale opacity-50'
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-white">{ach.title}</span>
                        <span className="text-xs font-mono-num text-amber-400 inline-flex items-center gap-1">
                          <img src={UI_SPRITES.coin} alt="" aria-hidden="true" className="w-3.5 h-3.5 object-contain" />
                          +{ach.rewardCoins} · +{ach.rewardXp}xp
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">{ach.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'leaderboard' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-1.5 text-xs text-sky-300 bg-sky-500/10 border border-sky-400/30 px-3 py-1.5 rounded-lg">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Local Mode · Offline Browser Rankings (Top 100)</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {(['all', 'weekly', 'daily'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setBoardFilter(f)}
                      className={`min-h-[36px] px-3 rounded-lg text-xs font-semibold capitalize border ${
                        boardFilter === f
                          ? 'bg-[#ff2e63] border-[#ff2e63] text-white'
                          : 'bg-[#141720] border-white/12 text-zinc-300 hover:text-white'
                      }`}
                    >
                      {f === 'all' ? 'All-Time' : f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 overflow-x-auto bg-[#141720]">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-white/5 text-zinc-400 text-xs">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Rank</th>
                      <th className="py-3 px-4 font-semibold">Contender</th>
                      <th className="py-3 px-4 font-semibold">Cleared</th>
                      <th className="py-3 px-4 font-semibold">Fastest</th>
                      <th className="py-3 px-4 font-semibold">Mode</th>
                      <th className="py-3 px-4 font-semibold text-right">Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/8 tabular-nums">
                    {filteredLeaderboard.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-zinc-400 text-xs">
                          No runs recorded for this timeframe yet. Complete a trial to post your score!
                        </td>
                      </tr>
                    ) : (
                      filteredLeaderboard.map((entry, idx) => (
                        <tr key={entry.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-4 font-mono-num text-zinc-300">
                            {idx === 0 ? (
                              <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                                <Trophy className="w-3.5 h-3.5" /> 1
                              </span>
                            ) : (
                              idx + 1
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-white">
                            <div className="flex items-center gap-2.5">
                              <span
                                className="w-7 h-7 rounded-md flex items-center justify-center font-mono-num text-[10px] font-bold text-white border border-white/20 shrink-0"
                                style={{ backgroundColor: entry.avatarColor }}
                              >
                                {entry.avatarLabel}
                              </span>
                              <div>
                                <div>{entry.playerName}</div>
                                <div className="text-[10px] font-mono-num text-zinc-500">
                                  {entry.playerId}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-zinc-300 font-mono-num">
                            {entry.levelsCompleted}/50
                          </td>
                          <td className="py-3 px-4 text-sky-300 font-mono-num">
                            {entry.bestTimeSec}s
                          </td>
                          <td className="py-3 px-4 capitalize text-zinc-400">{entry.difficulty}</td>
                          <td className="py-3 px-4 text-right font-mono-num font-bold text-[#10b981]">
                            {entry.score}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
