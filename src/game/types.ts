export type GameScreenState =
  | 'title'
  | 'playing'
  | 'paused'
  | 'spectating'
  | 'level_clear'
  | 'gameover'
  | 'champion';

export type Difficulty = 'easy' | 'normal' | 'hard';

export type StageId = 1 | 2 | 3 | 4 | 5;

export type LevelId = number; // 1..50

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface StageMeta {
  id: StageId;
  name: string;
  subtitle: string;
  levelRange: [number, number];
  completionCoins: number;
  completionXp: number;
}

export interface LevelMeta {
  id: LevelId;
  stage: StageId;
  title: string;
  subtitle: string;
  mechanicTag: string;
  description: string;
  desktopHint: string;
  mobileHint: string;
  baseCoins: number;
  baseXp: number;
  timeLimitSec: number;
  isBoss?: boolean;
  bossName?: string;
  bossTitle?: string;
}

export interface CharacterDesign {
  id: string;
  name: string;
  numberLabel: string;
  skinTone: string;
  hairColor: string;
  rarity: Rarity;
  price: number;
  unlockStage?: StageId;
}

export interface OutfitItem {
  id: string;
  name: string;
  suitColor: string;
  stripeColor: string;
  accentColor: string;
  rarity: Rarity;
  price: number;
  unlockStage?: StageId;
}

export interface MaskItem {
  id: string;
  name: string;
  style:
    | 'none'
    | 'circle'
    | 'triangle'
    | 'square'
    | 'half_obsidian'
    | 'gold_visor'
    | 'neon_oni'
    | 'cyber_grid'
    | 'porcelain'
    | 'crown_champion';
  primaryColor: string;
  accentColor: string;
  rarity: Rarity;
  price: number;
  unlockStage?: StageId;
}

export interface AccessoryItem {
  id: string;
  name: string;
  style:
    | 'none'
    | 'headband'
    | 'gold_chain'
    | 'neon_scarf'
    | 'pauldron'
    | 'tac_pack'
    | 'halo_crest'
    | 'flame_aura'
    | 'volt_aura'
    | 'golden_laurel';
  color: string;
  rarity: Rarity;
  price: number;
  unlockStage?: StageId;
}

export interface EquippedLoadout {
  characterId: string;
  outfitId: string;
  maskId: string;
  accessoryId: string;
}

export interface ResolvedAppearance {
  characterId?: string;
  outfitId?: string;
  numberLabel: string;
  skinTone: string;
  hairColor: string;
  suitColor: string;
  stripeColor: string;
  accentColor: string;
  mask: MaskItem;
  accessory: AccessoryItem;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  rewardXp: number;
}

export interface LeaderboardEntry {
  id: string;
  playerName: string;
  playerId: string;
  avatarLabel: string;
  avatarColor: string;
  score: number;
  bestTimeSec: number;
  levelReached: number;
  levelsCompleted: number;
  difficulty: Difficulty;
  date: string; // YYYY-MM-DD
}

export type MusicTrackPreference = 'auto' | 'jump_rope' | 'mingle' | 'synth';

export interface AudioSettings {
  musicVolume: number; // 0..1
  sfxVolume: number;   // 0..1
  muted: boolean;
  musicTrack?: MusicTrackPreference;
}

export interface SaveData {
  playerId: string;
  playerName: string;
  coins: number;
  xp: number;
  unlockedLevel: number; // 1..50
  completedLevels: number[];
  claimedStageRewards: number[]; // StageId[]
  bestScores: Record<number, number>;
  bestTimes: Record<number, number>;
  totalSurvivalTimeSec: number;
  totalCoinsEarned: number;
  totalWins: number;
  totalGames: number;
  winStreak: number;
  bestWinStreak: number;
  equipped: EquippedLoadout;
  ownedCharacters: string[];
  ownedOutfits: string[];
  ownedMasks: string[];
  ownedAccessories: string[];
  unlockedAchievements: string[];
  lastDailyClaimDate: string | null;
  dailyStreak: number;
  difficulty: Difficulty;
  settings: AudioSettings;
  leaderboard: LeaderboardEntry[];
  championUnlocked: boolean;
  championDate: string | null;
}

export interface HudSnapshot {
  hp: number;
  maxHp: number;
  timeLeft: number;
  score: number;
  progressLabel: string;
  progressValue: number; // 0..1
  statusBanner?: string;
  statusTone?: 'safe' | 'danger' | 'neutral' | 'gold';
  bossHp?: number;
  bossMaxHp?: number;
  bossName?: string;
}

export interface LevelOutcome {
  levelId: LevelId;
  won: boolean;
  score: number;
  coinsEarned: number;
  xpEarned: number;
  perfectBonus: boolean;
  streakBonusCoins: number;
  timeUsed: number;
  timeRemaining: number;
  hpRemaining: number;
  maxHp: number;
  detailLabel: string;
  reason: string;
}

export interface InputState {
  moveX: number;
  moveY: number;
  holdPrimary: boolean;
  holdGuard: boolean;
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
}

export interface LevelEngine {
  update(dt: number, simDt: number, input: InputState, width: number, height: number): void;
  render(ctx: CanvasRenderingContext2D, width: number, height: number): void;
  dispose?(): void;
}
