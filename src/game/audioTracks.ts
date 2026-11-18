import type { MusicTrackPreference } from './types';

export const MUSIC_TRACK_URLS = {
  jump_rope: '/assets/aistudio/Jump-Rope-Song-SnapYT.App_d84c7cbd.mp3',
  mingle: '/assets/aistudio/Mingle-Game-Song-SnapYT.App_f83c084d.mp3',
} as const;

export type ResolvedMusicTrack = 'jump_rope' | 'mingle' | 'synth';

// Tension, timing, jump, obstacle & major boss levels paired with Jump Rope Song
const JUMP_ROPE_LEVELS = new Set<number>([
  1, 5, 8, 9, 10,
  11, 12, 14, 17,
  24, 28, 30,
  31, 32, 33, 34, 36,
  42, 43, 46, 49, 50,
]);

export function selectMusicTrackForScreen(
  mode: 'title' | 'playing' | 'spectating',
  levelId: number,
  preference: MusicTrackPreference = 'auto'
): ResolvedMusicTrack {
  if (preference !== 'auto') {
    return preference;
  }
  if (mode === 'title' || mode === 'spectating') {
    return 'mingle';
  }
  return JUMP_ROPE_LEVELS.has(levelId) ? 'jump_rope' : 'mingle';
}

export function getMusicTrackLabel(track: ResolvedMusicTrack): string {
  if (track === 'jump_rope') return 'Jump Rope Song';
  if (track === 'mingle') return 'Mingle Game Song';
  return 'Retro Arena Synth';
}
