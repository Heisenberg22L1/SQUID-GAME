import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCESSORIES,
  applyLevelDefeat,
  applyLevelVictory,
  calculateLevelReward,
  canClaimDailyReward,
  canUnlockLevel,
  CHARACTERS,
  claimDailyReward,
  computeWinPercentage,
  createDefaultSaveData,
  evaluateMarbleRound,
  generateGlassBridgePath,
  getPlayerRank,
  getStageCompletion,
  getTournamentCompletionPercent,
  isStageItemUnlocked,
  LEVEL_METADATA,
  MASKS,
  OUTFITS,
  STAGES,
} from './rules';
import { MUSIC_TRACK_URLS, selectMusicTrackForScreen } from './audioTracks';

test('tournament catalog has 50 unique levels, 5 stages of 10, and 5 bosses', () => {
  assert.equal(LEVEL_METADATA.length, 50);
  assert.equal(STAGES.length, 5);
  const ids = new Set(LEVEL_METADATA.map((l) => l.id));
  assert.equal(ids.size, 50);
  const bosses = LEVEL_METADATA.filter((l) => l.isBoss).map((l) => l.id);
  assert.deepEqual(bosses, [10, 20, 30, 40, 50]);
});

test('customization catalog meets 10 characters, 20 outfits, 10 masks, 10 accessories', () => {
  assert.ok(CHARACTERS.length >= 10);
  assert.ok(OUTFITS.length >= 20);
  assert.ok(MASKS.length >= 10);
  assert.ok(ACCESSORIES.length >= 10);
});

test('level unlock progression and practice mode override across 50 levels', () => {
  assert.equal(canUnlockLevel(1, 1, false), true);
  assert.equal(canUnlockLevel(2, 1, false), false);
  assert.equal(canUnlockLevel(50, 1, true), true);
  assert.equal(canUnlockLevel(50, 50, false), true);
  assert.equal(canUnlockLevel(51, 50, true), false);
});

test('reward calculation scales with difficulty, perfect bonus, streak, and practice mode', () => {
  const normal = calculateLevelReward(1, 'normal', 20, 2, 2, false, 0);
  const hard = calculateLevelReward(1, 'hard', 20, 2, 2, false, 0);
  const streak3 = calculateLevelReward(1, 'normal', 20, 2, 2, false, 3);
  const practice = calculateLevelReward(1, 'normal', 20, 2, 2, true, 0);

  assert.ok(hard.coins > normal.coins);
  assert.ok(hard.xp > normal.xp);
  assert.equal(normal.perfectBonus, true);
  assert.equal(streak3.streakBonusCoins, 60);
  assert.ok(practice.coins < normal.coins);
});

test('applyLevelVictory unlocks next level, grants achievements/XP, and updates leaderboard', () => {
  const initial = createDefaultSaveData();
  const { nextSave, newlyUnlockedAchievements } = applyLevelVictory(initial, {
    levelId: 1,
    score: 1200,
    coinsEarned: 150,
    xpEarned: 180,
    timeUsed: 18,
    hpRemaining: 2,
    maxHp: 2,
    practiceMode: false,
    dateStr: '2026-11-18',
  });

  assert.equal(nextSave.unlockedLevel, 2);
  assert.deepEqual(nextSave.completedLevels, [1]);
  assert.equal(nextSave.totalWins, 1);
  assert.equal(nextSave.winStreak, 1);
  assert.ok(nextSave.xp >= 180);
  assert.ok(newlyUnlockedAchievements.some((a) => a.id === 'survive_1'));
  assert.ok(newlyUnlockedAchievements.some((a) => a.id === 'flawless_trial'));
  assert.ok(nextSave.leaderboard.some((e) => e.playerId === initial.playerId));
});

test('stage completion reward triggers when all 10 levels in a stage are cleared', () => {
  let save = createDefaultSaveData();
  for (let lvl = 1; lvl <= 9; lvl++) {
    save = applyLevelVictory(save, {
      levelId: lvl,
      score: 1000,
      coinsEarned: 100,
      xpEarned: 120,
      timeUsed: 20,
      hpRemaining: 2,
      maxHp: 3,
      practiceMode: false,
      dateStr: '2026-11-18',
    }).nextSave;
  }
  const stage10Res = applyLevelVictory(save, {
    levelId: 10,
    score: 2500,
    coinsEarned: 350,
    xpEarned: 420,
    timeUsed: 40,
    hpRemaining: 100,
    maxHp: 120,
    practiceMode: false,
    dateStr: '2026-11-18',
  });

  assert.ok(stage10Res.stageBonusAwarded !== null);
  assert.equal(stage10Res.stageBonusAwarded?.stageId, 1);
  assert.equal(getStageCompletion(stage10Res.nextSave.completedLevels, 1).percent, 100);
  assert.equal(getTournamentCompletionPercent(stage10Res.nextSave.completedLevels), 20);
  assert.equal(isStageItemUnlocked(1, stage10Res.nextSave.completedLevels), true);
  assert.equal(isStageItemUnlocked(2, stage10Res.nextSave.completedLevels), false);
});

test('winning level 50 unlocks ultimate champion status', () => {
  const initial = createDefaultSaveData();
  const res = applyLevelVictory(initial, {
    levelId: 50,
    score: 15000,
    coinsEarned: 2500,
    xpEarned: 3500,
    timeUsed: 75,
    hpRemaining: 120,
    maxHp: 180,
    practiceMode: false,
    dateStr: '2026-11-18',
  });
  assert.equal(res.nextSave.championUnlocked, true);
  assert.equal(res.nextSave.championDate, '2026-11-18');
  assert.ok(getPlayerRank(res.nextSave.xp).current.minXp > 0);
});

test('applyLevelDefeat resets winStreak and increments totalGames', () => {
  const initial = { ...createDefaultSaveData(), winStreak: 4 };
  const after = applyLevelDefeat(initial, 1, 320, 14, false);
  assert.equal(after.unlockedLevel, 1);
  assert.equal(after.winStreak, 0);
  assert.equal(after.totalGames, 1);
  assert.equal(after.bestScores[1], 320);
});

test('daily reward can only be claimed once per calendar day', () => {
  const initial = createDefaultSaveData();
  assert.equal(canClaimDailyReward(initial, '2026-11-18'), true);

  const first = claimDailyReward(initial, '2026-11-18');
  assert.equal(first.rewardCoins, 150);
  assert.equal(canClaimDailyReward(first.nextSave, '2026-11-18'), false);

  const duplicate = claimDailyReward(first.nextSave, '2026-11-18');
  assert.equal(duplicate.rewardCoins, 0);
});

test('win percentage, glass bridge, and marble evaluation work accurately', () => {
  assert.equal(computeWinPercentage(0, 0), 0);
  assert.equal(computeWinPercentage(3, 4), 75);

  const path = generateGlassBridgePath(10, () => 0.25);
  assert.equal(path.length, 10);
  assert.ok(path.every((s) => s === 'left'));

  const winRound = evaluateMarbleRound({
    playerMarbles: 10,
    aiMarbles: 10,
    playerWager: 4,
    aiWager: 3,
    isPlayerGuessing: true,
    playerGuess: 'odd',
    aiGuess: 'even',
    playerConcealed: 2,
    aiConcealed: 3,
  });
  assert.equal(winRound.guesserWon, true);
  assert.equal(winRound.nextPlayerMarbles, 14);
  assert.equal(winRound.nextAiMarbles, 6);
});

test('music track selection routes Jump Rope, Mingle, and user overrides properly', () => {
  assert.ok(MUSIC_TRACK_URLS.jump_rope.endsWith('.mp3'));
  assert.ok(MUSIC_TRACK_URLS.mingle.endsWith('.mp3'));
  assert.equal(selectMusicTrackForScreen('title', 1, 'auto'), 'mingle');
  assert.equal(selectMusicTrackForScreen('spectating', 1, 'auto'), 'mingle');
  assert.equal(selectMusicTrackForScreen('playing', 1, 'auto'), 'jump_rope');
  assert.equal(selectMusicTrackForScreen('playing', 50, 'auto'), 'jump_rope');
  assert.equal(selectMusicTrackForScreen('playing', 21, 'auto'), 'mingle');
  assert.equal(selectMusicTrackForScreen('playing', 1, 'mingle'), 'mingle');
  assert.equal(selectMusicTrackForScreen('playing', 21, 'jump_rope'), 'jump_rope');
  assert.equal(selectMusicTrackForScreen('title', 1, 'synth'), 'synth');
});
