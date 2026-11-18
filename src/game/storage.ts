import { createDefaultSaveData } from './rules';
import type { SaveData } from './types';

const STORAGE_KEY_V2 = 'squid_survival_save_v2';
const STORAGE_KEY_V1 = 'squid_survival_save_v1';

export function loadSaveData(): SaveData {
  const defaults = createDefaultSaveData();
  try {
    const rawV2 = window.localStorage.getItem(STORAGE_KEY_V2);
    const rawV1 = !rawV2 ? window.localStorage.getItem(STORAGE_KEY_V1) : null;
    const raw = rawV2 ?? rawV1;
    if (!raw) return defaults;

    const parsed = JSON.parse(raw) as Partial<SaveData> & {
      activeSkinId?: string;
      ownedSkins?: string[];
    };

    const migratedOutfits = Array.isArray(parsed.ownedOutfits) && parsed.ownedOutfits.length > 0
      ? parsed.ownedOutfits
      : defaults.ownedOutfits;

    return {
      ...defaults,
      ...parsed,
      playerId: parsed.playerId || defaults.playerId,
      unlockedLevel: Math.max(1, Math.min(50, Number(parsed.unlockedLevel ?? 1))),
      settings: {
        ...defaults.settings,
        ...(parsed.settings ?? {}),
      },
      equipped: {
        ...defaults.equipped,
        ...(parsed.equipped ?? {}),
      },
      bestScores: {
        ...defaults.bestScores,
        ...(parsed.bestScores ?? {}),
      },
      bestTimes: {
        ...defaults.bestTimes,
        ...(parsed.bestTimes ?? {}),
      },
      completedLevels: Array.isArray(parsed.completedLevels)
        ? parsed.completedLevels
        : defaults.completedLevels,
      claimedStageRewards: Array.isArray(parsed.claimedStageRewards)
        ? parsed.claimedStageRewards
        : defaults.claimedStageRewards,
      ownedCharacters: Array.isArray(parsed.ownedCharacters) && parsed.ownedCharacters.length > 0
        ? parsed.ownedCharacters
        : defaults.ownedCharacters,
      ownedOutfits: migratedOutfits,
      ownedMasks: Array.isArray(parsed.ownedMasks) && parsed.ownedMasks.length > 0
        ? parsed.ownedMasks
        : defaults.ownedMasks,
      ownedAccessories: Array.isArray(parsed.ownedAccessories) && parsed.ownedAccessories.length > 0
        ? parsed.ownedAccessories
        : defaults.ownedAccessories,
      unlockedAchievements: Array.isArray(parsed.unlockedAchievements)
        ? parsed.unlockedAchievements
        : defaults.unlockedAchievements,
      leaderboard: Array.isArray(parsed.leaderboard) && parsed.leaderboard.length > 0
        ? parsed.leaderboard
        : defaults.leaderboard,
    };
  } catch {
    return defaults;
  }
}

export function persistSaveData(data: SaveData): void {
  try {
    window.localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
}

export function resetSaveData(): SaveData {
  const fresh = createDefaultSaveData();
  persistSaveData(fresh);
  return fresh;
}

export function getTodayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
