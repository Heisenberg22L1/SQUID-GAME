import React, { useEffect, useRef, useState } from 'react';
import { Check, Lock, Sparkles, X } from 'lucide-react';
import {
  ACCESSORY_SPRITES,
  CHARACTER_SPRITES,
  MASK_SPRITES,
  OUTFIT_SPRITES,
  UI_SPRITES,
} from '../game/assets';
import {
  ACCESSORIES,
  CHARACTERS,
  MASKS,
  OUTFITS,
  resolveAppearance,
} from '../game/customization';
import { drawContender } from '../game/levelContext';
import { isStageItemUnlocked } from '../game/rules';
import type { EquippedLoadout, Rarity, SaveData } from '../game/types';

interface CharacterShopModalProps {
  save: SaveData;
  onBuyOrEquip: (
    category: 'character' | 'outfit' | 'mask' | 'accessory',
    itemId: string
  ) => void;
  onClose: () => void;
}

const RARITY_BADGE: Record<Rarity, string> = {
  common: 'bg-zinc-700/60 text-zinc-200 border-zinc-500/40',
  rare: 'bg-sky-500/20 text-sky-300 border-sky-400/40',
  epic: 'bg-purple-500/20 text-purple-300 border-purple-400/40',
  legendary: 'bg-amber-500/20 text-amber-300 border-amber-400/50',
};

export const CharacterShopModal: React.FC<CharacterShopModalProps> = ({
  save,
  onBuyOrEquip,
  onClose,
}) => {
  const [tab, setTab] = useState<'character' | 'outfit' | 'mask' | 'accessory'>('character');
  const [previewLoadout, setPreviewLoadout] = useState<EquippedLoadout>(save.equipped);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setPreviewLoadout(save.equipped);
  }, [save.equipped]);

  // Live animated contender preview canvas
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const start = performance.now();
    const renderPreview = (ts: number) => {
      const t = (ts - start) / 1000;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createRadialGradient(w * 0.5, h * 0.45, 10, w * 0.5, h * 0.5, w * 0.6);
      bg.addColorStop(0, '#1e1624');
      bg.addColorStop(1, '#090a0e');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Floor spotlight
      ctx.fillStyle = 'rgba(255, 46, 99, 0.16)';
      ctx.beginPath();
      ctx.ellipse(w * 0.5, h * 0.78, 52, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      const resolved = resolveAppearance(previewLoadout);
      drawContender(ctx, w * 0.5, h * 0.56, 38, resolved, {
        walkPhase: t * 3.5,
        animTime: t,
      });

      raf = window.requestAnimationFrame(renderPreview);
    };
    raf = window.requestAnimationFrame(renderPreview);
    return () => window.cancelAnimationFrame(raf);
  }, [previewLoadout]);

  const items =
    tab === 'character'
      ? CHARACTERS
      : tab === 'outfit'
      ? OUTFITS
      : tab === 'mask'
      ? MASKS
      : ACCESSORIES;

  const isOwned = (id: string) => {
    if (tab === 'character') return save.ownedCharacters.includes(id);
    if (tab === 'outfit') return save.ownedOutfits.includes(id);
    if (tab === 'mask') return save.ownedMasks.includes(id);
    return save.ownedAccessories.includes(id);
  };

  const isEquipped = (id: string) => {
    if (tab === 'character') return save.equipped.characterId === id;
    if (tab === 'outfit') return save.equipped.outfitId === id;
    if (tab === 'mask') return save.equipped.maskId === id;
    return save.equipped.accessoryId === id;
  };

  const setPreviewItem = (id: string) => {
    setPreviewLoadout((prev) => ({
      ...prev,
      characterId: tab === 'character' ? id : prev.characterId,
      outfitId: tab === 'outfit' ? id : prev.outfitId,
      maskId: tab === 'mask' ? id : prev.maskId,
      accessoryId: tab === 'accessory' ? id : prev.accessoryId,
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shop-title"
        className="w-full max-w-4xl max-h-[92dvh] flex flex-col rounded-xl bg-[#0e1015] border border-white/15 shadow-2xl overflow-hidden"
      >
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div>
            <h2 id="shop-title" className="font-display text-2xl sm:text-3xl font-bold tracking-wide text-white">
              Contender Armory & Shop
            </h2>
            <p className="text-xs text-zinc-400">
              Customize your contender—all equipped gear renders live in every trial.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-300 font-mono-num text-sm font-bold inline-flex items-center gap-1.5 tabular-nums">
              <img src={UI_SPRITES.coin} alt="" aria-hidden="true" className="w-4 h-4 object-contain" />
              <span>{save.coins}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close character shop"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="shrink-0 px-5 pt-2 flex items-center gap-1 border-b border-white/10 overflow-x-auto">
          {(
            [
              { id: 'character', label: `Characters (${CHARACTERS.length})` },
              { id: 'outfit', label: `Outfits (${OUTFITS.length})` },
              { id: 'mask', label: `Masks (${MASKS.length})` },
              { id: 'accessory', label: `Accessories (${ACCESSORIES.length})` },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`min-h-[42px] px-4 py-2 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                tab === t.id
                  ? 'border-[#ff2e63] text-white'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Main Split: Preview + Grid */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          {/* Live Character Preview */}
          <div className="md:w-64 shrink-0 p-4 border-b md:border-b-0 md:border-r border-white/10 bg-[#0b0d12] flex flex-row md:flex-col items-center gap-4">
            <canvas
              ref={previewCanvasRef}
              width={180}
              height={180}
              className="w-28 h-28 md:w-44 md:h-44 rounded-xl border border-white/10 shrink-0"
            />
            <div className="flex-1 md:w-full text-left md:text-center space-y-1.5">
              <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-mono-num">
                Live Preview
              </div>
              <div className="text-sm font-bold text-white">
                #{resolveAppearance(previewLoadout).numberLabel}
              </div>
              <div className="text-xs text-zinc-400">
                Mask: {resolveAppearance(previewLoadout).mask.name}
              </div>
              <div className="text-xs text-zinc-400">
                Gear: {resolveAppearance(previewLoadout).accessory.name}
              </div>
            </div>
          </div>

          {/* Item Catalog Grid */}
          <div className="flex-1 p-4 overflow-y-auto custom-scroll grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
            {items.map((item) => {
              const owned = isOwned(item.id);
              const equipped = isEquipped(item.id);
              const stageUnlocked = isStageItemUnlocked(item.unlockStage, save.completedLevels);
              const canAfford = save.coins >= item.price;

              const thumbUrl =
                tab === 'character'
                  ? CHARACTER_SPRITES[item.id]
                  : tab === 'outfit'
                  ? OUTFIT_SPRITES[item.id]
                  : tab === 'mask'
                  ? MASK_SPRITES[item.id]
                  : ACCESSORY_SPRITES[item.id];

              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setPreviewItem(item.id)}
                  className={`p-3.5 rounded-xl border flex flex-col justify-between gap-3 transition-colors ${
                    equipped
                      ? 'bg-[#171d26] border-[#10b981]'
                      : 'bg-[#141720] border-white/10 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-[#0b0d12] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={item.name}
                            className="w-10 h-10 object-contain"
                            loading="lazy"
                          />
                        ) : 'suitColor' in item ? (
                          <span
                            className="w-6 h-6 rounded-md border border-white/25"
                            style={{ backgroundColor: item.suitColor }}
                          />
                        ) : (
                          <span className="text-[10px] font-mono-num text-zinc-500">NONE</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${RARITY_BADGE[item.rarity]}`}
                          >
                            {item.rarity}
                          </span>
                          {item.unlockStage && !stageUnlocked && (
                            <span className="text-[10px] font-semibold text-rose-300 inline-flex items-center gap-0.5">
                              <Lock className="w-3 h-3" /> Stage {item.unlockStage} Boss
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-white mt-1 leading-snug">{item.name}</h3>
                      </div>
                    </div>

                    {'numberLabel' in item && (
                      <span className="px-1.5 py-0.5 rounded bg-white/10 font-mono-num text-[11px] font-bold text-white shrink-0">
                        #{item.numberLabel}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/8">
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item.id)}
                      className="text-[11px] text-zinc-400 hover:text-white inline-flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" /> Preview
                    </button>

                    <button
                      type="button"
                      disabled={equipped || (!owned && (!stageUnlocked || !canAfford))}
                      onClick={() => {
                        setPreviewItem(item.id);
                        onBuyOrEquip(tab, item.id);
                      }}
                      className={`min-h-[36px] px-3 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
                        equipped
                          ? 'bg-[#10b981]/20 text-[#10b981] cursor-default'
                          : owned
                          ? 'bg-white/10 hover:bg-white/20 text-white'
                          : !stageUnlocked
                          ? 'bg-white/5 text-zinc-500 cursor-not-allowed'
                          : canAfford
                          ? 'bg-amber-400 hover:bg-amber-300 text-[#07080a]'
                          : 'bg-white/5 text-zinc-500 cursor-not-allowed'
                      }`}
                    >
                      {equipped ? (
                        <span className="inline-flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Equipped
                        </span>
                      ) : owned ? (
                        'Equip'
                      ) : !stageUnlocked ? (
                        'Stage Locked'
                      ) : (
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <img src={UI_SPRITES.coin} alt="" aria-hidden="true" className="w-3.5 h-3.5 object-contain" />
                          {item.price}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
