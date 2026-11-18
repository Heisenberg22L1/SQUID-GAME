import {
  ACHIEVEMENTS,
  getLevelMeta,
  getStageForLevel,
  LEVEL_METADATA,
  RANK_TIERS,
  STAGES,
  type RankTier,
} from './catalog';
import {
  ACCESSORIES,
  CHARACTERS,
  MASKS,
  OUTFITS,
  resolveAppearance,
} from './customization';
import type {
  AchievementDef,
  Difficulty,
  LeaderboardEntry,
  SaveData,
  StageId,
} from './types';

export {
  ACHIEVEMENTS,
  ACCESSORIES,
  CHARACTERS,
  getLevelMeta,
  getStageForLevel,
  LEVEL_METADATA,
  MASKS,
  OUTFITS,
  RANK_TIERS,
  resolveAppearance,
  STAGES,
};

export interface DifficultyConfig {
  label: string;
  speedMult: number;
  timeMult: number;
  aiStrength: number;
  rewardMult: number;
  maxHpBonus: number;
}

export function getDifficultyConfig(difficulty: Difficulty): DifficultyConfig {
  switch (difficulty) {
    case 'easy':
      return {
        label: 'Easy',
        speedMult: 0.84,
        timeMult: 1.28,
        aiStrength: 0.78,
        rewardMult: 0.85,
        maxHpBonus: 1,
      };
    case 'hard':
      return {
        label: 'Hard',
        speedMult: 1.2,
        timeMult: 0.86,
        aiStrength: 1.24,
        rewardMult: 1.45,
        maxHpBonus: 0,
      };
    case 'normal':
    default:
      return {
        label: 'Normal',
        speedMult: 1.0,
        timeMult: 1.0,
        aiStrength: 1.0,
        rewardMult: 1.0,
        maxHpBonus: 0,
      };
  }
}

export function generateLocalPlayerId(): string {
  const chars = '0123456789ABCDEF';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  const num = String(Math.floor(100 + Math.random() * 899));
  return `SQ-${num}-${suffix}`;
}

export function createDefaultSaveData(): SaveData {
  return {
    playerId: generateLocalPlayerId(),
    playerName: 'Contender 456',
    coins: 120,
    xp: 0,
    unlockedLevel: 1,
    completedLevels: [],
    claimedStageRewards: [],
    bestScores: {},
    bestTimes: {},
    totalSurvivalTimeSec: 0,
    totalCoinsEarned: 120,
    totalWins: 0,
    totalGames: 0,
    winStreak: 0,
    bestWinStreak: 0,
    equipped: {
      characterId: 'char_456',
      outfitId: 'out_emerald',
      maskId: 'mask_none',
      accessoryId: 'acc_none',
    },
    ownedCharacters: ['char_456'],
    ownedOutfits: ['out_emerald'],
    ownedMasks: ['mask_none'],
    ownedAccessories: ['acc_none'],
    unlockedAchievements: [],
    lastDailyClaimDate: null,
    dailyStreak: 0,
    difficulty: 'normal',
    settings: {
      musicVolume: 0.45,
      sfxVolume: 0.7,
      muted: false,
      musicTrack: 'auto',
    },
    leaderboard: [
      {
        id: 'seed-1',
        playerName: 'Kang Sae-byeok',
        playerId: 'SQ-067-A4F1',
        avatarLabel: '067',
        avatarColor: '#881337',
        score: 28400,
        bestTimeSec: 21,
        levelReached: 34,
        levelsCompleted: 34,
        difficulty: 'normal',
        date: '2026-11-16',
      },
      {
        id: 'seed-2',
        playerName: 'Cho Sang-woo',
        playerId: 'SQ-218-9C02',
        avatarLabel: '218',
        avatarColor: '#1e3a8a',
        score: 19600,
        bestTimeSec: 26,
        levelReached: 24,
        levelsCompleted: 24,
        difficulty: 'normal',
        date: '2026-11-17',
      },
      {
        id: 'seed-3',
        playerName: 'Ali Abdul',
        playerId: 'SQ-199-5B18',
        avatarLabel: '199',
        avatarColor: '#0f766e',
        score: 11250,
        bestTimeSec: 29,
        levelReached: 14,
        levelsCompleted: 14,
        difficulty: 'easy',
        date: '2026-11-18',
      },
    ],
    championUnlocked: false,
    championDate: null,
  };
}

export function canUnlockLevel(
  levelId: number,
  unlockedLevel: number,
  practiceMode: boolean
): boolean {
  if (levelId < 1 || levelId > 50) return false;
  if (practiceMode) return true;
  return levelId <= unlockedLevel;
}

export function getPlayerRank(xp: number): {
  current: RankTier;
  next: RankTier | null;
  progress: number;
} {
  let current = RANK_TIERS[0];
  let next: RankTier | null = RANK_TIERS[1] ?? null;
  for (let i = 0; i < RANK_TIERS.length; i++) {
    if (xp >= RANK_TIERS[i].minXp) {
      current = RANK_TIERS[i];
      next = RANK_TIERS[i + 1] ?? null;
    }
  }
  if (!next) return { current, next: null, progress: 1 };
  const span = Math.max(1, next.minXp - current.minXp);
  const progress = Math.max(0, Math.min(1, (xp - current.minXp) / span));
  return { current, next, progress };
}

export function getStageCompletion(completedLevels: number[], stageId: StageId): {
  completedCount: number;
  total: number;
  percent: number;
  isComplete: boolean;
} {
  const stage = STAGES.find((s) => s.id === stageId) ?? STAGES[0];
  const [start, end] = stage.levelRange;
  const total = end - start + 1;
  let completedCount = 0;
  for (let id = start; id <= end; id++) {
    if (completedLevels.includes(id)) completedCount++;
  }
  return {
    completedCount,
    total,
    percent: Math.round((completedCount / total) * 100),
    isComplete: completedCount >= total,
  };
}

export function getTournamentCompletionPercent(completedLevels: number[]): number {
  const uniqueValid = new Set(completedLevels.filter((id) => id >= 1 && id <= 50));
  return Math.round((uniqueValid.size / 50) * 100);
}

export function isStageItemUnlocked(
  unlockStage: StageId | undefined,
  completedLevels: number[]
): boolean {
  if (!unlockStage) return true;
  const bossLevel = unlockStage * 10;
  return completedLevels.includes(bossLevel);
}

export function calculateLevelReward(
  levelId: number,
  difficulty: Difficulty,
  timeRemaining: number,
  hpRemaining: number,
  maxHp: number,
  practiceMode: boolean,
  winStreak = 0
): {
  score: number;
  coins: number;
  xp: number;
  perfectBonus: boolean;
  streakBonusCoins: number;
} {
  const meta = getLevelMeta(levelId);
  const cfg = getDifficultyConfig(difficulty);
  const safeTime = Math.max(0, Math.round(timeRemaining));
  const hpRatio = maxHp > 0 ? Math.max(0, hpRemaining) / maxHp : 1;
  const perfectBonus = maxHp > 0 && hpRemaining >= maxHp;

  const rawScore = Math.round(
    (levelId * 240 + safeTime * 28 + hpRatio * 380 + (meta.isBoss ? 800 : 0)) *
      cfg.rewardMult *
      (perfectBonus ? 1.15 : 1)
  );

  if (practiceMode) {
    return {
      score: Math.round(rawScore * 0.4),
      coins: Math.round(meta.baseCoins * 0.25),
      xp: Math.round(meta.baseXp * 0.25),
      perfectBonus: false,
      streakBonusCoins: 0,
    };
  }

  const perfectCoins = perfectBonus ? Math.round(meta.baseCoins * 0.25) : 0;
  const streakBonusCoins = Math.min(200, winStreak * 20);
  const coins = Math.round((meta.baseCoins + safeTime * 2 + perfectCoins) * cfg.rewardMult) + streakBonusCoins;
  const xp = Math.round((meta.baseXp + safeTime * 3 + (perfectBonus ? 60 : 0)) * cfg.rewardMult);

  return { score: rawScore, coins, xp, perfectBonus, streakBonusCoins };
}

export function applyLevelVictory(
  save: SaveData,
  params: {
    levelId: number;
    score: number;
    coinsEarned: number;
    xpEarned: number;
    timeUsed: number;
    hpRemaining: number;
    maxHp: number;
    practiceMode: boolean;
    dateStr: string;
  }
): {
  nextSave: SaveData;
  newlyUnlockedAchievements: AchievementDef[];
  stageBonusAwarded: { stageId: StageId; coins: number; xp: number } | null;
} {
  const {
    levelId,
    score,
    coinsEarned,
    xpEarned,
    timeUsed,
    hpRemaining,
    maxHp,
    practiceMode,
    dateStr,
  } = params;

  const newlyUnlocked: AchievementDef[] = [];
  const nextAchievements = [...save.unlockedAchievements];
  let bonusCoins = 0;
  let bonusXp = 0;

  const grantAchievement = (achId: string) => {
    if (!nextAchievements.includes(achId)) {
      const def = ACHIEVEMENTS.find((a) => a.id === achId);
      if (def) {
        nextAchievements.push(achId);
        newlyUnlocked.push(def);
        bonusCoins += def.rewardCoins;
        bonusXp += def.rewardXp;
      }
    }
  };

  const nextCompleted = save.completedLevels.includes(levelId)
    ? save.completedLevels
    : [...save.completedLevels, levelId].sort((a, b) => a - b);

  const nextWinStreak = practiceMode ? save.winStreak : save.winStreak + 1;
  const nextBestStreak = Math.max(save.bestWinStreak, nextWinStreak);

  if (!practiceMode) {
    if (levelId === 1) grantAchievement('survive_1');
    if (levelId === 10) grantAchievement('boss_10');
    if (levelId === 20) grantAchievement('boss_20');
    if (levelId === 30) grantAchievement('boss_30');
    if (levelId === 40) grantAchievement('boss_40');
    if (levelId === 50) grantAchievement('boss_50');
    if (hpRemaining >= maxHp) grantAchievement('flawless_trial');
    if (nextWinStreak >= 5) grantAchievement('streak_5');
    if (nextCompleted.length >= 25) grantAchievement('halfway_25');
  }

  // Stage completion reward check
  let stageBonusAwarded: { stageId: StageId; coins: number; xp: number } | null = null;
  const nextClaimedStages = [...save.claimedStageRewards];
  const stageMeta = getStageForLevel(levelId);
  if (!practiceMode && !nextClaimedStages.includes(stageMeta.id)) {
    const comp = getStageCompletion(nextCompleted, stageMeta.id);
    if (comp.isComplete) {
      nextClaimedStages.push(stageMeta.id);
      bonusCoins += stageMeta.completionCoins;
      bonusXp += stageMeta.completionXp;
      stageBonusAwarded = {
        stageId: stageMeta.id,
        coins: stageMeta.completionCoins,
        xp: stageMeta.completionXp,
      };
    }
  }

  const nextUnlockedLevel =
    !practiceMode && levelId >= save.unlockedLevel && levelId < 50
      ? levelId + 1
      : save.unlockedLevel;

  const prevBest = save.bestScores[levelId] ?? 0;
  const nextBestScores = {
    ...save.bestScores,
    [levelId]: Math.max(prevBest, score),
  };

  const safeTimeUsed = Math.max(1, Math.round(timeUsed));
  const prevBestTime = save.bestTimes[levelId];
  const nextBestTimes = {
    ...save.bestTimes,
    [levelId]: prevBestTime ? Math.min(prevBestTime, safeTimeUsed) : safeTimeUsed,
  };

  const totalScoreSum = Object.values(nextBestScores).reduce((sum, v) => sum + v, 0);
  const appearance = resolveAppearance(save.equipped);

  // Update player's entry on Local Leaderboard (keeps top 100)
  const existingIdx = save.leaderboard.findIndex((e) => e.playerId === save.playerId);
  const fastestClear = Object.values(nextBestTimes).reduce(
    (min, t) => Math.min(min, t),
    safeTimeUsed
  );
  const newEntry: LeaderboardEntry = {
    id: `local-${save.playerId}`,
    playerName: save.playerName.trim() || 'Contender 456',
    playerId: save.playerId,
    avatarLabel: appearance.numberLabel,
    avatarColor: appearance.suitColor,
    score: Math.max(score, totalScoreSum),
    bestTimeSec: fastestClear,
    levelReached: Math.max(...nextCompleted, nextUnlockedLevel),
    levelsCompleted: nextCompleted.length,
    difficulty: save.difficulty,
    date: dateStr,
  };

  const filteredBoard =
    existingIdx >= 0
      ? save.leaderboard.map((e, i) =>
          i === existingIdx
            ? {
                ...newEntry,
                score: Math.max(e.score, newEntry.score),
                bestTimeSec: Math.min(e.bestTimeSec, newEntry.bestTimeSec),
              }
            : e
        )
      : [...save.leaderboard, newEntry];

  const nextLeaderboard = filteredBoard
    .sort((a, b) => b.score - a.score)
    .slice(0, 100);

  const totalCoinsGain = coinsEarned + bonusCoins;
  const championUnlocked = save.championUnlocked || (levelId === 50 && !practiceMode);

  return {
    nextSave: {
      ...save,
      coins: save.coins + totalCoinsGain,
      xp: save.xp + xpEarned + bonusXp,
      unlockedLevel: nextUnlockedLevel,
      completedLevels: nextCompleted,
      claimedStageRewards: nextClaimedStages,
      bestScores: nextBestScores,
      bestTimes: nextBestTimes,
      totalSurvivalTimeSec: save.totalSurvivalTimeSec + safeTimeUsed,
      totalCoinsEarned: save.totalCoinsEarned + totalCoinsGain,
      totalWins: save.totalWins + (practiceMode ? 0 : 1),
      totalGames: save.totalGames + (practiceMode ? 0 : 1),
      winStreak: nextWinStreak,
      bestWinStreak: nextBestStreak,
      unlockedAchievements: nextAchievements,
      leaderboard: nextLeaderboard,
      championUnlocked,
      championDate: championUnlocked ? (save.championDate ?? dateStr) : null,
    },
    newlyUnlockedAchievements: newlyUnlocked,
    stageBonusAwarded,
  };
}

export function applyLevelDefeat(
  save: SaveData,
  levelId: number,
  score: number,
  timeUsed: number,
  practiceMode: boolean
): SaveData {
  if (practiceMode) return save;
  const prevBest = save.bestScores[levelId] ?? 0;
  return {
    ...save,
    bestScores: {
      ...save.bestScores,
      [levelId]: Math.max(prevBest, score),
    },
    totalSurvivalTimeSec: save.totalSurvivalTimeSec + Math.max(1, Math.round(timeUsed)),
    totalGames: save.totalGames + 1,
    winStreak: 0,
  };
}

export function canClaimDailyReward(save: SaveData, todayStr: string): boolean {
  return save.lastDailyClaimDate !== todayStr;
}

export function claimDailyReward(
  save: SaveData,
  todayStr: string
): { nextSave: SaveData; rewardCoins: number } {
  if (!canClaimDailyReward(save, todayStr)) {
    return { nextSave: save, rewardCoins: 0 };
  }
  const nextStreak = Math.min(7, save.dailyStreak + 1);
  const rewardCoins = 100 + nextStreak * 50;
  return {
    nextSave: {
      ...save,
      coins: save.coins + rewardCoins,
      totalCoinsEarned: save.totalCoinsEarned + rewardCoins,
      dailyStreak: nextStreak,
      lastDailyClaimDate: todayStr,
    },
    rewardCoins,
  };
}

export function computeWinPercentage(wins: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((wins / total) * 100)));
}

export function generateGlassBridgePath(
  steps: number,
  rng: () => number = Math.random
): Array<'left' | 'right'> {
  const path: Array<'left' | 'right'> = [];
  for (let i = 0; i < steps; i++) {
    path.push(rng() < 0.5 ? 'left' : 'right');
  }
  return path;
}

export interface MarbleRoundInput {
  playerMarbles: number;
  aiMarbles: number;
  playerWager: number;
  aiWager: number;
  isPlayerGuessing: boolean;
  playerGuess: 'odd' | 'even';
  aiGuess: 'odd' | 'even';
  playerConcealed: number;
  aiConcealed: number;
}

export interface MarbleRoundResult {
  guesserWon: boolean;
  playerDelta: number;
  nextPlayerMarbles: number;
  nextAiMarbles: number;
  revealedCount: number;
  revealedParity: 'odd' | 'even';
}

export function evaluateMarbleRound(input: MarbleRoundInput): MarbleRoundResult {
  const total = input.playerMarbles + input.aiMarbles;
  const targetCount = input.isPlayerGuessing ? input.aiConcealed : input.playerConcealed;
  const actualParity: 'odd' | 'even' = targetCount % 2 === 0 ? 'even' : 'odd';
  const guess = input.isPlayerGuessing ? input.playerGuess : input.aiGuess;
  const guesserWon = guess === actualParity;

  const stake = input.isPlayerGuessing
    ? Math.min(input.playerWager, input.aiMarbles, input.playerMarbles)
    : Math.min(input.aiWager, input.playerMarbles, input.aiMarbles);

  let playerDelta = 0;
  if (input.isPlayerGuessing) {
    playerDelta = guesserWon ? stake : -stake;
  } else {
    playerDelta = guesserWon ? -stake : stake;
  }

  const nextPlayer = Math.max(0, Math.min(total, input.playerMarbles + playerDelta));
  const nextAi = total - nextPlayer;

  return {
    guesserWon,
    playerDelta: nextPlayer - input.playerMarbles,
    nextPlayerMarbles: nextPlayer,
    nextAiMarbles: nextAi,
    revealedCount: targetCount,
    revealedParity: actualParity,
  };
}
