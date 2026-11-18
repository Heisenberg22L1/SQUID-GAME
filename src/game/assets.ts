import type { StageId } from './types';

export const STAGE_BG_URLS: Record<StageId, string> = {
  1: '/assets/backgrounds/stage_1.jpg',
  2: '/assets/backgrounds/stage_2.jpg',
  3: '/assets/backgrounds/stage_3.jpg',
  4: '/assets/backgrounds/stage_4.jpg',
  5: '/assets/backgrounds/stage_5.jpg',
};

export const CHARACTER_SPRITES: Record<string, string> = {
  char_456: '/assets/sprites/players/char_456.png',
  char_067: '/assets/sprites/players/char_067.png',
  char_218: '/assets/sprites/players/char_218.png',
  char_199: '/assets/sprites/players/char_199.png',
  char_240: '/assets/sprites/players/char_240.png',
  char_001: '/assets/sprites/players/char_001.png',
  char_101: '/assets/sprites/players/char_101.png',
  char_013: '/assets/sprites/players/char_013.png',
  char_088: '/assets/sprites/players/char_088.png',
  char_000: '/assets/sprites/players/char_000.png',
};

export const OUTFIT_SPRITES: Record<string, string> = {
  out_emerald: '/assets/sprites/outfits/outfit_0.png',
  out_crimson: '/assets/sprites/outfits/outfit_1.png',
  out_cobalt: '/assets/sprites/outfits/outfit_5.png',
  out_charcoal: '/assets/sprites/outfits/outfit_3.png',
  out_amber: '/assets/sprites/outfits/outfit_2.png',
  out_plum: '/assets/sprites/outfits/outfit_11.png',
  out_forest: '/assets/sprites/outfits/outfit_6.png',
  out_arctic: '/assets/sprites/outfits/outfit_4.png',
  out_neon_pink: '/assets/sprites/outfits/outfit_7.png',
  out_teal_cyber: '/assets/sprites/outfits/outfit_0.png',
  out_blood_gold: '/assets/sprites/outfits/outfit_1.png',
  out_midnight: '/assets/sprites/outfits/outfit_9.png',
  out_bronze: '/assets/sprites/outfits/outfit_8.png',
  out_indigo: '/assets/sprites/outfits/outfit_11.png',
  out_titanium: '/assets/sprites/outfits/outfit_4.png',
  out_obsidian_gold: '/assets/sprites/outfits/outfit_3.png',
  out_phantom: '/assets/sprites/outfits/outfit_9.png',
  out_mindweave: '/assets/sprites/outfits/outfit_6.png',
  out_hunter_rig: '/assets/sprites/outfits/outfit_10.png',
  out_champion_gold: '/assets/sprites/outfits/outfit_2.png',
};

export const MASK_SPRITES: Record<string, string> = {
  mask_none: '',
  mask_circle: '/assets/sprites/masks/sym_circle.png',
  mask_triangle: '/assets/sprites/masks/sym_triangle.png',
  mask_square: '/assets/sprites/masks/sym_square.png',
  mask_half: '/assets/sprites/masks/hood_front.png',
  mask_visor: '/assets/sprites/masks/sym_octagon.png',
  mask_oni: '/assets/sprites/masks/hood_triangle.png',
  mask_cyber: '/assets/sprites/masks/sym_star.png',
  mask_porcelain: '/assets/sprites/masks/hood_circle.png',
  mask_crown: '/assets/sprites/masks/hood_front.png',
};

export const ACCESSORY_SPRITES: Record<string, string> = {
  acc_none: '',
  acc_headband: '/assets/sprites/accessories/hat_bucket.png',
  acc_chain: '/assets/sprites/accessories/glasses_gold.png',
  acc_scarf: '/assets/sprites/accessories/hat_purple.png',
  acc_pauldron: '/assets/sprites/accessories/headphones.png',
  acc_pack: '/assets/sprites/accessories/hat_white.png',
  acc_halo: '/assets/sprites/accessories/crown.png',
  acc_flame: '/assets/sprites/vfx/beam_ember.png',
  acc_volt: '/assets/sprites/vfx/aura_cyan.png',
  acc_laurel: '/assets/sprites/accessories/crown.png',
};

export const GUARD_SPRITES = {
  circle: '/assets/sprites/guards/guard_0.png',
  triangle: '/assets/sprites/guards/guard_1.png',
  square: '/assets/sprites/guards/guard_3.png',
  elite: '/assets/sprites/guards/guard_5.png',
  commander: '/assets/sprites/guards/guard_9.png',
} as const;

export const BOSS_SPRITES: Record<number | 'doll', string> = {
  doll: '/assets/sprites/bosses/boss_doll.png',
  10: '/assets/sprites/bosses/boss_10.png',
  20: '/assets/sprites/bosses/boss_20.png',
  30: '/assets/sprites/bosses/boss_30.png',
  40: '/assets/sprites/guards/guard_9.png',
  50: '/assets/sprites/bosses/boss_50.png',
};

export const BOSS_CARD_URLS: Record<number, string> = {
  10: '/assets/sprites/boss_cards/boss_card_10.jpg',
  20: '/assets/sprites/boss_cards/boss_card_20.jpg',
  30: '/assets/sprites/boss_cards/boss_card_30.jpg',
  40: '/assets/sprites/boss_cards/boss_card_40.jpg',
  50: '/assets/sprites/boss_cards/boss_card_50.jpg',
};

export const TRAP_SPRITES = {
  spikesTall: '/assets/sprites/traps/spikes_tall.png',
  spikesLow: '/assets/sprites/traps/spikes_low.png',
  sawblade: '/assets/sprites/traps/sawblade.png',
  laserGate: '/assets/sprites/traps/laser_gate.png',
  bomb: '/assets/sprites/traps/bomb.png',
  pendulumRed: '/assets/sprites/traps/pendulum_red.png',
  pendulumGold: '/assets/sprites/traps/pendulum_gold.png',
  boostPad: '/assets/sprites/traps/boost_pad.png',
  boostStrip: '/assets/sprites/traps/boost_strip.png',
  hazardBar: '/assets/sprites/traps/hazard_bar.png',
  springPad: '/assets/sprites/traps/spring_pad.png',
} as const;

export const COLLECTIBLE_SPRITES = {
  coin: '/assets/sprites/collectibles/coin.png',
  gemPink: '/assets/sprites/collectibles/gem_pink.png',
  crystal: '/assets/sprites/collectibles/crystal.png',
  keyGold: '/assets/sprites/collectibles/key_gold.png',
  crownGold: '/assets/sprites/collectibles/crown_gold.png',
  starGold: '/assets/sprites/collectibles/star_gold.png',
  trophyGold: '/assets/sprites/collectibles/trophy_gold.png',
} as const;

export const POWERUP_SPRITES = {
  shield: '/assets/sprites/powerups/shield.png',
  lightning: '/assets/sprites/powerups/lightning.png',
  magnet: '/assets/sprites/powerups/magnet.png',
  hourglass: '/assets/sprites/powerups/hourglass.png',
  x2: '/assets/sprites/powerups/x2.png',
  heart: '/assets/sprites/powerups/heart.png',
} as const;

export const VFX_SPRITES = {
  explosionGold: '/assets/sprites/vfx/explosion_gold.png',
  explosionFire: '/assets/sprites/vfx/explosion_fire.png',
  iceBurst: '/assets/sprites/vfx/ice_burst.png',
  portalBlue: '/assets/sprites/vfx/portal_blue.png',
  portalGold: '/assets/sprites/vfx/portal_gold.png',
  shockBlue: '/assets/sprites/vfx/shock_blue.png',
  sparkCyan: '/assets/sprites/vfx/spark_cyan.png',
  reticlePurple: '/assets/sprites/vfx/reticle_purple.png',
  ringPurple: '/assets/sprites/vfx/ring_purple.png',
  auraViolet: '/assets/sprites/vfx/aura_violet.png',
  auraCyan: '/assets/sprites/vfx/aura_cyan.png',
  beamRed: '/assets/sprites/vfx/beam_red.png',
  beamBlue: '/assets/sprites/vfx/beam_blue.png',
  beamGold: '/assets/sprites/vfx/beam_gold.png',
} as const;

export const ACHIEVEMENT_BADGES = [
  '/assets/sprites/achievements/badge_0.png',
  '/assets/sprites/achievements/badge_1.png',
  '/assets/sprites/achievements/badge_2.png',
  '/assets/sprites/achievements/badge_3.png',
  '/assets/sprites/achievements/badge_4.png',
  '/assets/sprites/achievements/badge_5.png',
  '/assets/sprites/achievements/badge_6.png',
  '/assets/sprites/achievements/badge_7.png',
  '/assets/sprites/achievements/badge_8.png',
];

export const SYMBOL_SPRITES = {
  circle: '/assets/sprites/masks/sym_circle.png',
  triangle: '/assets/sprites/masks/sym_triangle.png',
  square: '/assets/sprites/masks/sym_square.png',
  star: '/assets/sprites/masks/sym_star.png',
} as const;

export const UI_SPRITES = {
  trophyWin: '/assets/sprites/ui/trophy_win.png',
  skullDefeat: '/assets/sprites/ui/skull_defeat.png',
  coin: '/assets/sprites/collectibles/coin.png',
  star: '/assets/sprites/ui/icon_star.png',
  crown: '/assets/sprites/ui/icon_crown.png',
  check: '/assets/sprites/ui/icon_check.png',
} as const;

const imageCache = new Map<string, HTMLImageElement>();

export function getCachedImage(url: string): HTMLImageElement | null {
  if (!url || typeof Image === 'undefined') return null;
  let img = imageCache.get(url);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = url;
    imageCache.set(url, img);
  }
  if (img.complete && img.naturalWidth > 0) return img;
  return null;
}

export function preloadStageAssets(stageId: StageId, levelId: number): void {
  if (typeof Image === 'undefined') return;
  const urls: string[] = [
    STAGE_BG_URLS[stageId],
    CHARACTER_SPRITES.char_456,
    GUARD_SPRITES.circle,
    GUARD_SPRITES.triangle,
    GUARD_SPRITES.square,
    GUARD_SPRITES.commander,
    COLLECTIBLE_SPRITES.keyGold,
    VFX_SPRITES.portalBlue,
    VFX_SPRITES.portalGold,
  ];
  if (levelId === 1 || levelId === 42) urls.push(BOSS_SPRITES.doll);
  if (levelId in BOSS_SPRITES) urls.push(BOSS_SPRITES[levelId]);
  if (levelId in BOSS_CARD_URLS) urls.push(BOSS_CARD_URLS[levelId]);
  if (levelId === 9 || levelId === 46) urls.push(TRAP_SPRITES.laserGate, VFX_SPRITES.beamRed);
  if (levelId === 11) urls.push(TRAP_SPRITES.spikesTall, TRAP_SPRITES.spikesLow);
  if (levelId === 12) urls.push(TRAP_SPRITES.pendulumRed, TRAP_SPRITES.pendulumGold);
  if (levelId === 13 || levelId === 29) urls.push(TRAP_SPRITES.bomb, VFX_SPRITES.explosionFire);
  if (levelId === 36) urls.push(TRAP_SPRITES.sawblade, TRAP_SPRITES.boostPad);
  if (levelId === 31 || levelId === 45) urls.push(VFX_SPRITES.reticlePurple, VFX_SPRITES.explosionFire);

  for (const u of urls) {
    getCachedImage(u);
  }
}

export function drawSprite(
  ctx: CanvasRenderingContext2D,
  url: string,
  cx: number,
  cy: number,
  maxW: number,
  maxH: number,
  options: {
    rotation?: number;
    alpha?: number;
    flipX?: boolean;
  } = {}
): boolean {
  const img = getCachedImage(url);
  if (!img) return false;
  const { rotation = 0, alpha = 1, flipX = false } = options;

  const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;

  ctx.save();
  ctx.translate(cx, cy);
  if (rotation !== 0) ctx.rotate(rotation);
  if (flipX) ctx.scale(-1, 1);
  if (alpha !== 1) ctx.globalAlpha *= alpha;
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
  return true;
}

let cachedBackdropKey = '';
let cachedBackdropCanvas: HTMLCanvasElement | null = null;

export function drawStageBackdrop(
  ctx: CanvasRenderingContext2D,
  stageId: StageId,
  width: number,
  height: number,
  scrimAlpha = 0.48
): void {
  const img = getCachedImage(STAGE_BG_URLS[stageId]);
  if (img) {
    const rw = Math.max(1, Math.round(width));
    const rh = Math.max(1, Math.round(height));
    const key = `${stageId}|${rw}|${rh}|${scrimAlpha.toFixed(2)}`;
    if (typeof document !== 'undefined') {
      if (cachedBackdropKey !== key || !cachedBackdropCanvas) {
        if (!cachedBackdropCanvas) {
          cachedBackdropCanvas = document.createElement('canvas');
        }
        cachedBackdropCanvas.width = rw;
        cachedBackdropCanvas.height = rh;
        const bctx = cachedBackdropCanvas.getContext('2d');
        if (bctx) {
          const scale = Math.max(rw / img.naturalWidth, rh / img.naturalHeight);
          const dw = img.naturalWidth * scale;
          const dh = img.naturalHeight * scale;
          bctx.drawImage(img, (rw - dw) / 2, (rh - dh) / 2, dw, dh);
          if (scrimAlpha > 0) {
            bctx.fillStyle = `rgba(7, 8, 12, ${scrimAlpha})`;
            bctx.fillRect(0, 0, rw, rh);
          }
          cachedBackdropKey = key;
        }
      }
      if (cachedBackdropCanvas && cachedBackdropKey === key) {
        ctx.drawImage(cachedBackdropCanvas, 0, 0);
        return;
      }
    }

    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
    if (scrimAlpha > 0) {
      ctx.fillStyle = `rgba(7, 8, 12, ${scrimAlpha})`;
      ctx.fillRect(0, 0, width, height);
    }
    return;
  }

  // Fallback gradient while stage background decodes on first frame
  const fallbackColors: Record<StageId, [string, string]> = {
    1: ['#141218', '#090a0d'],
    2: ['#1c0910', '#07080a'],
    3: ['#091322', '#060910'],
    4: ['#1b0e09', '#090707'],
    5: ['#120e24', '#08080c'],
  };
  const [c1, c2] = fallbackColors[stageId];
  const g = ctx.createLinearGradient(0, 0, 0, height);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
}
