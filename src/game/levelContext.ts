import {
  ACCESSORY_SPRITES,
  CHARACTER_SPRITES,
  drawSprite,
  getCachedImage,
  GUARD_SPRITES,
  MASK_SPRITES,
  OUTFIT_SPRITES,
} from './assets';
import type { AudioEngineType } from './levelTypesInternal';
import type { ParticlePool } from './particles';
import type { Difficulty, HudSnapshot, LevelId, ResolvedAppearance } from './types';

export interface LevelContext {
  levelId: LevelId;
  difficulty: Difficulty;
  appearance: ResolvedAppearance;
  practiceMode: boolean;
  particles: ParticlePool;
  audio: AudioEngineType;
  shake: (trauma: number) => void;
  hitstop: (seconds: number) => void;
  updateHud: (hud: HudSnapshot) => void;
  finishWin: (params: {
    detailLabel: string;
    timeRemaining: number;
    hpRemaining: number;
    maxHp: number;
    bonusScore?: number;
  }) => void;
  finishLose: (params: {
    reason: string;
    detailLabel: string;
    scoreSoFar: number;
    timeRemaining: number;
    hpRemaining: number;
    maxHp: number;
  }) => void;
}

export function drawContender(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  appearance: Pick<
    ResolvedAppearance,
    'numberLabel' | 'suitColor' | 'stripeColor' | 'accentColor'
  > &
    Partial<
      Pick<
        ResolvedAppearance,
        'characterId' | 'outfitId' | 'skinTone' | 'hairColor' | 'mask' | 'accessory'
      >
    >,
  options: {
    walkPhase?: number;
    hitFlash?: number;
    eliminated?: boolean;
    label?: string;
    shielded?: boolean;
    scaleX?: number;
    scaleY?: number;
    animTime?: number;
  } = {}
): void {
  const {
    walkPhase = 0,
    hitFlash = 0,
    eliminated = false,
    label,
    shielded = false,
    scaleX = 1,
    scaleY = 1,
    animTime = 0,
  } = options;

  const skinTone = appearance.skinTone ?? '#f1c29b';
  const hairColor = appearance.hairColor ?? '#18181b';
  const mask = appearance.mask;
  const accessory = appearance.accessory;
  const numText = label ?? appearance.numberLabel;

  // Resolve transparent PNG sprite URL (outfit overrides character body when non-default)
  const charKey = appearance.characterId ?? `char_${numText}`;
  const useOutfitSprite =
    appearance.outfitId &&
    appearance.outfitId !== 'out_emerald' &&
    Boolean(OUTFIT_SPRITES[appearance.outfitId]);
  const spriteUrl = useOutfitSprite
    ? OUTFIT_SPRITES[appearance.outfitId!]
    : CHARACTER_SPRITES[charKey] ?? CHARACTER_SPRITES.char_456;
  const spriteImg = getCachedImage(spriteUrl);

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scaleX, scaleY);

  if (eliminated) {
    ctx.globalAlpha = 0.42;
    ctx.rotate(Math.PI * 0.45);
  }

  // Ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.46)';
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.96, radius * 0.85, radius * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();

  // Back/Aura Accessories
  if (accessory && accessory.style !== 'none' && !eliminated) {
    if (accessory.style === 'flame_aura' || accessory.style === 'volt_aura') {
      const pulse = 1.32 + Math.sin(animTime * 8) * 0.12;
      ctx.strokeStyle = accessory.color;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  if (spriteImg) {
    const bob = Math.abs(Math.sin(walkPhase)) * radius * 0.14;
    const tilt = walkPhase !== 0 ? Math.sin(walkPhase) * 0.05 : 0;
    const spriteH = radius * 2.95;
    const spriteW = radius * 2.4;

    ctx.save();
    ctx.translate(0, -bob - radius * 0.12);
    ctx.rotate(tilt);

    // Subtle colored underglow matching equipped suit accent
    if (hitFlash <= 0 && !eliminated) {
      ctx.strokeStyle = appearance.accentColor;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, radius * 0.92, radius * 0.65, radius * 0.22, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    drawSprite(ctx, spriteUrl, 0, 0, spriteW, spriteH);

    // Mask overlay badge / visor when equipped
    if (mask && mask.style !== 'none' && hitFlash <= 0) {
      const maskUrl = MASK_SPRITES[mask.id];
      if (maskUrl) {
        drawSprite(ctx, maskUrl, 0, -spriteH * 0.31, radius * 0.92, radius * 0.92);
      }
    }

    // Head/Crown/Glasses accessory sprite overlay
    if (accessory && accessory.style !== 'none' && hitFlash <= 0) {
      const accUrl = ACCESSORY_SPRITES[accessory.id];
      if (accUrl) {
        if (accessory.style === 'halo_crest' || accessory.style === 'golden_laurel' || accessory.style === 'headband' || accessory.style === 'neon_scarf' || accessory.style === 'tac_pack') {
          drawSprite(ctx, accUrl, 0, -spriteH * 0.48, radius * 0.95, radius * 0.72);
        } else if (accessory.style === 'gold_chain' || accessory.style === 'pauldron') {
          drawSprite(ctx, accUrl, 0, -spriteH * 0.32, radius * 0.85, radius * 0.62);
        }
      }
    }

    if (hitFlash > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Compact contender number pill for clear multiplayer/NPC readability
    if (numText && hitFlash <= 0) {
      ctx.fillStyle = 'rgba(7, 8, 12, 0.82)';
      ctx.strokeStyle = appearance.accentColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-radius * 0.46, radius * 0.62, radius * 0.92, radius * 0.42, 3);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#f4f4f6';
      ctx.font = `700 ${Math.max(8, Math.round(radius * 0.34))}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(numText, 0, radius * 0.83);
    }
  } else {
    // Procedural vector fallback before sprite decode completes
    const stride = Math.sin(walkPhase) * radius * 0.35;
    ctx.fillStyle = '#18181b';
    ctx.beginPath();
    ctx.arc(-radius * 0.35, radius * 0.65 + stride * 0.4, radius * 0.24, 0, Math.PI * 2);
    ctx.arc(radius * 0.35, radius * 0.65 - stride * 0.4, radius * 0.24, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hitFlash > 0 ? '#ffffff' : appearance.suitColor;
    ctx.strokeStyle = '#07080a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-radius * 0.68, -radius * 0.25, radius * 1.36, radius * 1.0, radius * 0.42);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = hitFlash > 0 ? '#ffffff' : skinTone;
    ctx.beginPath();
    ctx.arc(0, -radius * 0.52, radius * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (hitFlash <= 0) {
      ctx.fillStyle = hairColor;
      ctx.beginPath();
      ctx.arc(0, -radius * 0.64, radius * 0.44, Math.PI, Math.PI * 2);
      ctx.fill();
    }

    if (numText && hitFlash <= 0) {
      ctx.fillStyle = 'rgba(7, 8, 10, 0.58)';
      ctx.beginPath();
      ctx.roundRect(-radius * 0.42, radius * 0.02, radius * 0.84, radius * 0.46, 3);
      ctx.fill();
      ctx.fillStyle = '#f4f4f6';
      ctx.font = `700 ${Math.max(8, Math.round(radius * 0.4))}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(numText, 0, radius * 0.26);
    }
  }

  // Guard / Shield aura
  if (shielded) {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -radius * 0.1, radius * 1.35, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawMaskedGuard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  shape: 'circle' | 'triangle' | 'square',
  options: {
    walkPhase?: number;
    hitFlash?: number;
    alerted?: boolean;
    accent?: string;
    crown?: boolean;
  } = {}
): void {
  const { walkPhase = 0, hitFlash = 0, alerted = false, accent = '#ff2e63', crown = false } = options;

  const spriteUrl = crown ? GUARD_SPRITES.commander : GUARD_SPRITES[shape];
  const spriteImg = getCachedImage(spriteUrl);

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(0,0,0,0.46)';
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.96, radius * 0.88, radius * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();

  if (spriteImg) {
    const bob = Math.abs(Math.sin(walkPhase)) * radius * 0.12;
    const tilt = walkPhase !== 0 ? Math.sin(walkPhase) * 0.04 : 0;
    ctx.save();
    ctx.translate(0, -bob - radius * 0.14);
    ctx.rotate(tilt);
    drawSprite(ctx, spriteUrl, 0, 0, radius * 2.45, radius * 3.05);
    if (hitFlash > 0) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.beginPath();
      ctx.arc(0, 0, radius * 0.95, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else {
    const stride = Math.sin(walkPhase) * radius * 0.28;
    ctx.fillStyle = '#09090b';
    ctx.beginPath();
    ctx.arc(-radius * 0.34, radius * 0.68 + stride * 0.4, radius * 0.22, 0, Math.PI * 2);
    ctx.arc(radius * 0.34, radius * 0.68 - stride * 0.4, radius * 0.22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = hitFlash > 0 ? '#ffffff' : accent;
    ctx.strokeStyle = '#07080a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-radius * 0.7, -radius * 0.25, radius * 1.4, radius * 1.02, radius * 0.38);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = hitFlash > 0 ? '#ffffff' : '#111115';
    ctx.beginPath();
    ctx.arc(0, -radius * 0.5, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (hitFlash <= 0) {
      ctx.strokeStyle = crown ? '#fbbf24' : '#f4f4f6';
      ctx.lineWidth = Math.max(1.8, radius * 0.12);
      const sy = -radius * 0.5;
      const sr = radius * 0.23;
      ctx.beginPath();
      if (shape === 'circle') {
        ctx.arc(0, sy, sr, 0, Math.PI * 2);
      } else if (shape === 'triangle') {
        ctx.moveTo(0, sy - sr);
        ctx.lineTo(sr, sy + sr * 0.8);
        ctx.lineTo(-sr, sy + sr * 0.8);
        ctx.closePath();
      } else {
        ctx.rect(-sr * 0.85, sy - sr * 0.85, sr * 1.7, sr * 1.7);
      }
      ctx.stroke();
    }
  }

  if (crown && hitFlash <= 0) {
    drawSprite(ctx, '/assets/sprites/accessories/crown.png', 0, -radius * 1.65, radius * 1.0, radius * 0.75);
  }

  if (alerted) {
    ctx.fillStyle = '#ff2e63';
    ctx.font = `800 ${Math.round(radius * 0.9)}px "Barlow Condensed", sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('!', 0, -radius * 1.75);
  }

  ctx.restore();
}
