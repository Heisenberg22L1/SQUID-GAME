import type {
  AccessoryItem,
  CharacterDesign,
  EquippedLoadout,
  MaskItem,
  OutfitItem,
  ResolvedAppearance,
} from './types';

// 10 Distinct Character Designs
export const CHARACTERS: CharacterDesign[] = [
  { id: 'char_456', name: 'Seong 456', numberLabel: '456', skinTone: '#f1c29b', hairColor: '#18181b', rarity: 'common', price: 0 },
  { id: 'char_067', name: 'Sae 067', numberLabel: '067', skinTone: '#f5cfa8', hairColor: '#27272a', rarity: 'common', price: 150 },
  { id: 'char_218', name: 'Sang 218', numberLabel: '218', skinTone: '#ecc096', hairColor: '#09090b', rarity: 'common', price: 200 },
  { id: 'char_199', name: 'Ali 199', numberLabel: '199', skinTone: '#c68b59', hairColor: '#1c1917', rarity: 'rare', price: 320 },
  { id: 'char_240', name: 'Ji 240', numberLabel: '240', skinTone: '#f6d5b8', hairColor: '#3f3f46', rarity: 'rare', price: 380 },
  { id: 'char_001', name: 'Elder 001', numberLabel: '001', skinTone: '#e8be96', hairColor: '#d4d4d8', rarity: 'epic', price: 550, unlockStage: 1 },
  { id: 'char_101', name: 'Deok 101', numberLabel: '101', skinTone: '#dba87d', hairColor: '#18181b', rarity: 'epic', price: 620, unlockStage: 2 },
  { id: 'char_013', name: 'Cipher 013', numberLabel: '013', skinTone: '#f3caa6', hairColor: '#7f1d1d', rarity: 'epic', price: 750, unlockStage: 3 },
  { id: 'char_088', name: 'Valkyrie 088', numberLabel: '088', skinTone: '#d99e73', hairColor: '#f59e0b', rarity: 'legendary', price: 950, unlockStage: 4 },
  { id: 'char_000', name: 'Front 000', numberLabel: '000', skinTone: '#d4a373', hairColor: '#09090b', rarity: 'legendary', price: 1400, unlockStage: 5 },
];

// 20 Outfits & Costumes
export const OUTFITS: OutfitItem[] = [
  { id: 'out_emerald', name: 'Classic Tracksuit', suitColor: '#0f766e', stripeColor: '#f4f4f6', accentColor: '#10b981', rarity: 'common', price: 0 },
  { id: 'out_crimson', name: 'Crimson Runner', suitColor: '#881337', stripeColor: '#fda4af', accentColor: '#ff2e63', rarity: 'common', price: 120 },
  { id: 'out_cobalt', name: 'Cobalt Tactician', suitColor: '#1e3a8a', stripeColor: '#bae6fd', accentColor: '#38bdf8', rarity: 'common', price: 150 },
  { id: 'out_charcoal', name: 'Slate Striker', suitColor: '#27272a', stripeColor: '#e4e4e7', accentColor: '#a1a1aa', rarity: 'common', price: 180 },
  { id: 'out_amber', name: 'Solar Hazard', suitColor: '#92400e', stripeColor: '#fde68a', accentColor: '#f59e0b', rarity: 'common', price: 210 },
  { id: 'out_plum', name: 'Velvet Dusk', suitColor: '#581c87', stripeColor: '#e9d5ff', accentColor: '#c084fc', rarity: 'rare', price: 260 },
  { id: 'out_forest', name: 'Viper Moss', suitColor: '#14532d', stripeColor: '#86efac', accentColor: '#22c55e', rarity: 'rare', price: 290 },
  { id: 'out_arctic', name: 'Arctic Ghost', suitColor: '#334155', stripeColor: '#f8fafc', accentColor: '#94a3b8', rarity: 'rare', price: 320 },
  { id: 'out_neon_pink', name: 'Guard Magenta', suitColor: '#be185d', stripeColor: '#18181b', accentColor: '#f43f5e', rarity: 'rare', price: 360 },
  { id: 'out_teal_cyber', name: 'Circuit Teal', suitColor: '#115e59', stripeColor: '#2dd4bf', accentColor: '#14b8a6', rarity: 'rare', price: 400 },
  { id: 'out_blood_gold', name: 'Scarlet Sovereign', suitColor: '#7f1d1d', stripeColor: '#fbbf24', accentColor: '#ef4444', rarity: 'epic', price: 480 },
  { id: 'out_midnight', name: 'Midnight Stealth', suitColor: '#09090b', stripeColor: '#38bdf8', accentColor: '#0ea5e9', rarity: 'epic', price: 520 },
  { id: 'out_bronze', name: 'Bronze Gladiator', suitColor: '#78350f', stripeColor: '#fed7aa', accentColor: '#fb923c', rarity: 'epic', price: 560 },
  { id: 'out_indigo', name: 'Astral Indigo', suitColor: '#312e81', stripeColor: '#a5b4fc', accentColor: '#818cf8', rarity: 'epic', price: 600 },
  { id: 'out_titanium', name: 'Titanium Shell', suitColor: '#3f3f46', stripeColor: '#22d3ee', accentColor: '#06b6d4', rarity: 'epic', price: 660 },
  { id: 'out_obsidian_gold', name: 'Obsidian Crown', suitColor: '#111115', stripeColor: '#fbbf24', accentColor: '#f59e0b', rarity: 'legendary', price: 780 },
  { id: 'out_phantom', name: 'Shadow Master Suit', suitColor: '#1e1b4b', stripeColor: '#ff2e63', accentColor: '#a855f7', rarity: 'legendary', price: 850, unlockStage: 2 },
  { id: 'out_mindweave', name: 'Mindwave Robe', suitColor: '#064e3b', stripeColor: '#34d399', accentColor: '#10b981', rarity: 'legendary', price: 920, unlockStage: 3 },
  { id: 'out_hunter_rig', name: 'Hunter Tactical', suitColor: '#18181b', stripeColor: '#f43f5e', accentColor: '#ff2e63', rarity: 'legendary', price: 1050, unlockStage: 4 },
  { id: 'out_champion_gold', name: 'Golden Champion', suitColor: '#422006', stripeColor: '#fde047', accentColor: '#fbbf24', rarity: 'legendary', price: 1500, unlockStage: 5 },
];

// 10 Geometric & Tactical Masks
export const MASKS: MaskItem[] = [
  { id: 'mask_none', name: 'Unmasked', style: 'none', primaryColor: 'transparent', accentColor: 'transparent', rarity: 'common', price: 0 },
  { id: 'mask_circle', name: 'Circle Worker', style: 'circle', primaryColor: '#111115', accentColor: '#f4f4f6', rarity: 'common', price: 140 },
  { id: 'mask_triangle', name: 'Triangle Soldier', style: 'triangle', primaryColor: '#111115', accentColor: '#f4f4f6', rarity: 'common', price: 180 },
  { id: 'mask_square', name: 'Square Officer', style: 'square', primaryColor: '#111115', accentColor: '#ff2e63', rarity: 'rare', price: 260 },
  { id: 'mask_half', name: 'Obsidian Half-Mask', style: 'half_obsidian', primaryColor: '#18181b', accentColor: '#fbbf24', rarity: 'rare', price: 320 },
  { id: 'mask_visor', name: 'Amber Tactical Visor', style: 'gold_visor', primaryColor: '#09090b', accentColor: '#f59e0b', rarity: 'epic', price: 450 },
  { id: 'mask_oni', name: 'Crimson Oni', style: 'neon_oni', primaryColor: '#7f1d1d', accentColor: '#ff2e63', rarity: 'epic', price: 540 },
  { id: 'mask_cyber', name: 'Cyber Lattice', style: 'cyber_grid', primaryColor: '#0f172a', accentColor: '#38bdf8', rarity: 'epic', price: 650, unlockStage: 2 },
  { id: 'mask_porcelain', name: 'Cracked Porcelain', style: 'porcelain', primaryColor: '#e4e4e7', accentColor: '#ff2e63', rarity: 'legendary', price: 820, unlockStage: 3 },
  { id: 'mask_crown', name: 'Champion Sovereign', style: 'crown_champion', primaryColor: '#111115', accentColor: '#fbbf24', rarity: 'legendary', price: 1200, unlockStage: 5 },
];

// 10 Accessories & Auras
export const ACCESSORIES: AccessoryItem[] = [
  { id: 'acc_none', name: 'Standard Issue', style: 'none', color: 'transparent', rarity: 'common', price: 0 },
  { id: 'acc_headband', name: 'Crimson Band', style: 'headband', color: '#ff2e63', rarity: 'common', price: 100 },
  { id: 'acc_chain', name: 'Contender Gold Chain', style: 'gold_chain', color: '#fbbf24', rarity: 'common', price: 160 },
  { id: 'acc_scarf', name: 'Neon Runner Scarf', style: 'neon_scarf', color: '#10b981', rarity: 'rare', price: 240 },
  { id: 'acc_pauldron', name: 'Steel Pauldron', style: 'pauldron', color: '#94a3b8', rarity: 'rare', price: 300 },
  { id: 'acc_pack', name: 'Survival Rig', style: 'tac_pack', color: '#38bdf8', rarity: 'epic', price: 420 },
  { id: 'acc_halo', name: 'Geometric Crest', style: 'halo_crest', color: '#fbbf24', rarity: 'epic', price: 540 },
  { id: 'acc_flame', name: 'Crimson Ember Aura', style: 'flame_aura', color: '#ff2e63', rarity: 'legendary', price: 720, unlockStage: 2 },
  { id: 'acc_volt', name: 'Volt Surge Aura', style: 'volt_aura', color: '#38bdf8', rarity: 'legendary', price: 880, unlockStage: 3 },
  { id: 'acc_laurel', name: 'Champion Laurel', style: 'golden_laurel', color: '#fde047', rarity: 'legendary', price: 1150, unlockStage: 4 },
];

export function resolveAppearance(equipped: EquippedLoadout): ResolvedAppearance {
  const char = CHARACTERS.find((c) => c.id === equipped.characterId) ?? CHARACTERS[0];
  const outfit = OUTFITS.find((o) => o.id === equipped.outfitId) ?? OUTFITS[0];
  const mask = MASKS.find((m) => m.id === equipped.maskId) ?? MASKS[0];
  const accessory = ACCESSORIES.find((a) => a.id === equipped.accessoryId) ?? ACCESSORIES[0];

  return {
    characterId: char.id,
    outfitId: outfit.id,
    numberLabel: char.numberLabel,
    skinTone: char.skinTone,
    hairColor: char.hairColor,
    suitColor: outfit.suitColor,
    stripeColor: outfit.stripeColor,
    accentColor: outfit.accentColor,
    mask,
    accessory,
  };
}
