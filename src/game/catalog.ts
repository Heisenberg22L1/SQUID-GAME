import type { AchievementDef, LevelMeta, StageMeta } from './types';

export const STAGES: StageMeta[] = [
  {
    id: 1,
    name: 'The Beginning',
    subtitle: 'Trials 01–10 · Opening Elimination',
    levelRange: [1, 10],
    completionCoins: 350,
    completionXp: 500,
  },
  {
    id: 2,
    name: 'The Danger Zone',
    subtitle: 'Trials 11–20 · Mechanical Gauntlet',
    levelRange: [11, 20],
    completionCoins: 550,
    completionXp: 850,
  },
  {
    id: 3,
    name: 'Mind Games',
    subtitle: 'Trials 21–30 · Deception & Reflex',
    levelRange: [21, 30],
    completionCoins: 800,
    completionXp: 1200,
  },
  {
    id: 4,
    name: 'Extreme Survival',
    subtitle: 'Trials 31–40 · Cataclysm Arena',
    levelRange: [31, 40],
    completionCoins: 1100,
    completionXp: 1650,
  },
  {
    id: 5,
    name: 'The Final Tournament',
    subtitle: 'Trials 41–50 · Crown of One',
    levelRange: [41, 50],
    completionCoins: 2000,
    completionXp: 3000,
  },
];

export const LEVEL_METADATA: LevelMeta[] = [
  // STAGE 1: THE BEGINNING (1-10)
  {
    id: 1, stage: 1, title: 'Red Light, Green Light', subtitle: 'Courtyard Sprint', mechanicTag: 'Stop & Go',
    description: 'Cross the courtyard before the clock expires. Sprint on Green Light and freeze instantly when the giant doll turns on Red Light.',
    desktopHint: 'Hold W / Up / Space to Sprint · Release to Freeze · Esc Pause',
    mobileHint: 'Hold SPRINT button or drag Joystick up · Release immediately on Red Light',
    baseCoins: 100, baseXp: 120, timeLimitSec: 45,
  },
  {
    id: 2, stage: 1, title: 'Dalgona Challenge', subtitle: 'Honeycomb Precision', mechanicTag: 'Needle Trace',
    description: 'Carve out the pressed sugar shape along the dashed groove without building 100% crack stress.',
    desktopHint: 'Click & Drag along the dashed groove · Esc Pause',
    mobileHint: 'Drag finger steadily along the shape outline',
    baseCoins: 120, baseXp: 140, timeLimitSec: 50,
  },
  {
    id: 3, stage: 1, title: 'Tug of War', subtitle: 'High-Altitude Pull', mechanicTag: 'Rhythm Tap',
    description: 'Out-pull the rival squad across the steel chasm. Tap rapidly and exploit golden Surge windows.',
    desktopHint: 'Tap Space / Click PULL rapidly · Esc Pause',
    mobileHint: 'Tap PULL rapidly · Time Surge boosts',
    baseCoins: 130, baseXp: 150, timeLimitSec: 32,
  },
  {
    id: 4, stage: 1, title: 'Marbles', subtitle: 'Odd or Even Wager', mechanicTag: 'Strategy Duel',
    description: 'Start with 10 marbles each. Wager wisely and deduce whether your rival conceals an Odd or Even handful.',
    desktopHint: 'Select Wager (1-5) & Call ODD / EVEN · Esc Pause',
    mobileHint: 'Tap Wager amount then ODD or EVEN',
    baseCoins: 140, baseXp: 160, timeLimitSec: 90,
  },
  {
    id: 5, stage: 1, title: 'Glass Bridge', subtitle: 'Tempered Crossing', mechanicTag: 'Memory Leap',
    description: 'Leap across paired suspended glass panels. Tempered steel glass holds; fragile panes shatter into the abyss.',
    desktopHint: 'A / Left or D / Right to Leap · Esc Pause',
    mobileHint: 'Tap JUMP LEFT or JUMP RIGHT',
    baseCoins: 150, baseXp: 170, timeLimitSec: 45,
  },
  {
    id: 6, stage: 1, title: 'Hide and Survive', subtitle: 'Neon Labyrinth', mechanicTag: 'Stealth Maze',
    description: 'Collect 2 golden passkeys across concrete corridors while evading patrolling, chasing, and turret guards.',
    desktopHint: 'WASD / Arrows Move · Shift Dash · Esc Pause',
    mobileHint: 'Virtual Joystick Move · Tap DASH',
    baseCoins: 165, baseXp: 190, timeLimitSec: 65,
  },
  {
    id: 7, stage: 1, title: 'Squid Court Skirmish', subtitle: 'Chalk Arena Duel', mechanicTag: 'Melee Combat',
    description: 'Fight an Elite Enforcer inside the chalk court. Strike openings, dodge slams, and parry lunges.',
    desktopHint: 'WASD Move · J / Space Attack · K / Shift Dodge · L Guard',
    mobileHint: 'Joystick Move · Attack, Dodge & Guard buttons',
    baseCoins: 180, baseXp: 210, timeLimitSec: 70,
  },
  {
    id: 8, stage: 1, title: 'Falling Floor', subtitle: 'Collapsing Tile Grid', mechanicTag: 'Tile Survival',
    description: 'Floor tiles crack and drop away seconds after being stepped on. Keep moving across intact platforms until time runs out.',
    desktopHint: 'WASD / Arrows Move · Space Dash · Esc Pause',
    mobileHint: 'Joystick Move · Tap DASH to cross gaps',
    baseCoins: 190, baseXp: 220, timeLimitSec: 28,
  },
  {
    id: 9, stage: 1, title: 'Laser Corridor', subtitle: 'Timed Beam Gates', mechanicTag: 'Timing Sprint',
    description: 'Sprint through alternating crimson laser barriers and duck into safe alcoves before beams sweep back.',
    desktopHint: 'WASD / Arrows Move · Space Dash · Esc Pause',
    mobileHint: 'Joystick Move · Tap DASH between laser cycles',
    baseCoins: 205, baseXp: 240, timeLimitSec: 38,
  },
  {
    id: 10, stage: 1, title: 'The Arena Guardian', subtitle: 'Stage 1 Boss Encounter', mechanicTag: 'Boss Battle',
    description: 'Confront the towering Arena Guardian. Evade his sweeping laser arc and shockwave stomp, then strike when his core opens.',
    desktopHint: 'WASD Move · J/Space Attack · K/Shift Dodge · L Guard',
    mobileHint: 'Joystick Move · Attack, Dodge & Guard',
    baseCoins: 350, baseXp: 420, timeLimitSec: 95,
    isBoss: true, bossName: 'The Arena Guardian', bossTitle: 'Stage 1 Enforcer Colossus',
  },

  // STAGE 2: THE DANGER ZONE (11-20)
  {
    id: 11, stage: 2, title: 'Spike Gauntlet', subtitle: 'Retracting Floor Spears', mechanicTag: 'Hazard Sprint',
    description: 'Read the metallic floor grates—when vents glow amber, floor spikes erupt moments later. Reach the far bunker.',
    desktopHint: 'WASD / Arrows Move · Space Dash · Esc Pause',
    mobileHint: 'Joystick Move · Tap DASH across spike rows',
    baseCoins: 220, baseXp: 260, timeLimitSec: 40,
  },
  {
    id: 12, stage: 2, title: 'Pendulum Bridges', subtitle: 'Swinging Razor Blades', mechanicTag: 'Blade Timing',
    description: 'Cross three suspended steel bridges swept by swinging razor pendulums. Time your dashes cleanly.',
    desktopHint: 'WASD / Arrows Move · Space Dash · Esc Pause',
    mobileHint: 'Joystick Move · Tap DASH past blades',
    baseCoins: 230, baseXp: 270, timeLimitSec: 42,
  },
  {
    id: 13, stage: 2, title: 'Bomb Tag', subtitle: 'Explosive Hot Potato', mechanicTag: 'Tag Survival',
    description: 'A live charge is strapped to a runner! If you hold the bomb, sprint into an AI rival to transfer it before detonation.',
    desktopHint: 'WASD / Arrows Move · Space Dash to tag AI · Esc Pause',
    mobileHint: 'Joystick Move · Tap DASH to tag or flee',
    baseCoins: 240, baseXp: 280, timeLimitSec: 32,
  },
  {
    id: 14, stage: 2, title: 'Rolling Boulders', subtitle: 'Crushing Ramp Ascent', mechanicTag: 'Lane Dodge',
    description: 'Climb the steep concrete ramp while dodging massive boulders thundering down the lanes.',
    desktopHint: 'WASD / Arrows Move · Space Dash · Esc Pause',
    mobileHint: 'Joystick Move · Tap DASH between lanes',
    baseCoins: 250, baseXp: 290, timeLimitSec: 38,
  },
  {
    id: 15, stage: 2, title: 'Poison Gas Chamber', subtitle: 'Shrinking Oxygen Dome', mechanicTag: 'Zone Hold',
    description: 'Toxic purple mist floods the chamber. Stay inside the moving green purifier dome and collect oxygen cells.',
    desktopHint: 'WASD / Arrows Move · Space Dash · Esc Pause',
    mobileHint: 'Joystick Move · Stay inside green dome',
    baseCoins: 260, baseXp: 300, timeLimitSec: 30,
  },
  {
    id: 16, stage: 2, title: 'Conveyor Furnace', subtitle: 'Molten Belt Drift', mechanicTag: 'Belt Control',
    description: 'High-speed conveyor belts drag you toward molten edges. Fight the current and activate 2 shutdown switches.',
    desktopHint: 'WASD / Arrows Move · Space Dash · Esc Pause',
    mobileHint: 'Joystick Move · Tap DASH against belt pull',
    baseCoins: 270, baseXp: 315, timeLimitSec: 46,
  },
  {
    id: 17, stage: 2, title: 'Sniper Alley', subtitle: 'Cover-to-Cover Dash', mechanicTag: 'Cover Stealth',
    description: 'Laser sniper sights sweep the lane. Take cover behind concrete barriers whenever the red targeting lock tightens.',
    desktopHint: 'WASD / Arrows Move · Space Dash · Esc Pause',
    mobileHint: 'Joystick Move · Hide behind barriers on lock',
    baseCoins: 280, baseXp: 330, timeLimitSec: 44,
  },
  {
    id: 18, stage: 2, title: 'Electric Grid', subtitle: 'High-Voltage Floor', mechanicTag: 'Pattern Dodge',
    description: 'Arena sectors charge amber before unleashing lethal voltage arcs. Move into safe uncharged zones continuously.',
    desktopHint: 'WASD / Arrows Move · Space Dash · Esc Pause',
    mobileHint: 'Joystick Move · Step off amber cells',
    baseCoins: 290, baseXp: 340, timeLimitSec: 32,
  },
  {
    id: 19, stage: 2, title: 'Mirror Hall', subtitle: 'Illusion Barrier Vault', mechanicTag: 'Illusion Maze',
    description: 'Half the glowing doors are decoy forcefields that shock on contact. Spot the faint emerald shimmer on real paths.',
    desktopHint: 'WASD / Arrows Move · Shift Dash · Esc Pause',
    mobileHint: 'Joystick Move · Tap DASH',
    baseCoins: 300, baseXp: 360, timeLimitSec: 60,
  },
  {
    id: 20, stage: 2, title: 'The Shadow Master', subtitle: 'Stage 2 Boss Encounter', mechanicTag: 'Boss Battle',
    description: 'Face the blinking Shadow Master. Spot his real silhouette among shadow clones, dodge void slashes, and counter-attack.',
    desktopHint: 'WASD Move · J/Space Attack · K/Shift Dodge · L Guard',
    mobileHint: 'Joystick Move · Attack, Dodge & Guard',
    baseCoins: 500, baseXp: 600, timeLimitSec: 100,
    isBoss: true, bossName: 'The Shadow Master', bossTitle: 'Stage 2 Phantom Assassin',
  },

  // STAGE 3: MIND GAMES (21-30)
  {
    id: 21, stage: 3, title: 'Sequence Memory', subtitle: 'Neon Pad Recall', mechanicTag: 'Memory Puzzle',
    description: 'Watch the four geometric floor pads illuminate in sequence, then step or tap them in the exact order to advance.',
    desktopHint: 'Click / Tap glowing pads in exact sequence · Esc Pause',
    mobileHint: 'Tap the 4 illuminated pads in exact sequence',
    baseCoins: 310, baseXp: 380, timeLimitSec: 55,
  },
  {
    id: 22, stage: 3, title: 'Fake Safe Zones', subtitle: 'Deceptive Broadcast', mechanicTag: 'Deduction Zone',
    description: 'Two colored sectors appear each wave, but one signal is a decoy trap! Match the true geometric symbol displayed overhead.',
    desktopHint: 'WASD / Arrows Move to true symbol zone · Esc Pause',
    mobileHint: 'Joystick Move to the matching true symbol zone',
    baseCoins: 320, baseXp: 390, timeLimitSec: 36,
  },
  {
    id: 23, stage: 3, title: 'Number Lock', subtitle: 'Vault Sum Cipher', mechanicTag: 'Rapid Math',
    description: 'Combine numbered vault pads that sum to the displayed target code before the vault pressure seals.',
    desktopHint: 'Tap / Click number tiles summing to Target · Esc Pause',
    mobileHint: 'Tap numbered vault pads that equal the Target sum',
    baseCoins: 330, baseXp: 400, timeLimitSec: 55,
  },
  {
    id: 24, stage: 3, title: 'Trap Door Roulette', subtitle: 'Darkened Grid Path', mechanicTag: 'Path Recall',
    description: 'Memorize the glowing emerald path across the grid for 2.5 seconds before the lights cut out, then step safely across.',
    desktopHint: 'WASD / Arrows or Tap adjacent tiles to cross · Esc Pause',
    mobileHint: 'Tap adjacent tiles or Joystick along remembered path',
    baseCoins: 340, baseXp: 420, timeLimitSec: 50,
  },
  {
    id: 25, stage: 3, title: 'Guard Patrol Stealth', subtitle: 'Blackout Radar Wing', mechanicTag: 'Blackout Stealth',
    description: 'Navigate a darkened guard wing with limited flashlight range. Collect 2 data drives and slip out undetected.',
    desktopHint: 'WASD / Arrows Move · Shift Dash · Esc Pause',
    mobileHint: 'Joystick Move · Tap DASH past cones',
    baseCoins: 350, baseXp: 430, timeLimitSec: 65,
  },
  {
    id: 26, stage: 3, title: 'Reverse Controls', subtitle: 'Polarity Inversion Lab', mechanicTag: 'Inverted Reflex',
    description: 'Every few seconds, neural emitters invert your directional controls! Stay calm, adapt, and collect 3 stabilizers.',
    desktopHint: 'WASD / Arrows Move (adapts on Invert!) · Space Dash',
    mobileHint: 'Joystick Move (mind INVERTED alert!) · Tap DASH',
    baseCoins: 360, baseXp: 450, timeLimitSec: 45,
  },
  {
    id: 27, stage: 3, title: 'Odd One Out', subtitle: 'Symbol Anomaly Scan', mechanicTag: 'Visual Scan',
    description: 'Spot the single mismatched geometric glyph among the decoy tiles and select it rapidly across 5 rounds.',
    desktopHint: 'Click / Tap the single mismatched glyph · Esc Pause',
    mobileHint: 'Tap the one symbol that differs from the rest',
    baseCoins: 370, baseXp: 460, timeLimitSec: 45,
  },
  {
    id: 28, stage: 3, title: 'Balance Beam', subtitle: 'Crosswind Catwalk', mechanicTag: 'Wind Balance',
    description: 'Cross narrow elevated beams while fierce side winds push you toward the edge. Counteract gusts and keep moving.',
    desktopHint: 'WASD / Arrows Counter wind & advance · Esc Pause',
    mobileHint: 'Joystick steer against wind arrows to cross',
    baseCoins: 380, baseXp: 480, timeLimitSec: 42,
  },
  {
    id: 29, stage: 3, title: 'Time Bomb Defusal', subtitle: 'Conduit Order Cut', mechanicTag: 'Sequence Cut',
    description: 'Defuse 4 high-yield charges by cutting the color-coded conduits in the exact priority sequence shown.',
    desktopHint: 'Click / Tap wires in Priority Order (1-4) · Esc Pause',
    mobileHint: 'Tap the wire terminals in priority order',
    baseCoins: 390, baseXp: 500, timeLimitSec: 45,
  },
  {
    id: 30, stage: 3, title: 'The Mind Controller', subtitle: 'Stage 3 Boss Encounter', mechanicTag: 'Boss Battle',
    description: 'Battle the psychic Mind Controller. Resist periodic control distortions, shatter floating psychic orbs, and strike the core.',
    desktopHint: 'WASD Move · J/Space Attack · K/Shift Dodge · L Guard',
    mobileHint: 'Joystick Move · Attack, Dodge & Guard',
    baseCoins: 680, baseXp: 820, timeLimitSec: 105,
    isBoss: true, bossName: 'The Mind Controller', bossTitle: 'Stage 3 Psychic Architect',
  },

  // STAGE 4: EXTREME SURVIVAL (31-40)
  {
    id: 31, stage: 4, title: 'Meteor Shower', subtitle: 'Rooftop Bombardment', mechanicTag: 'Impact Dodge',
    description: 'Artillery flares rain onto the rooftop. Read expanding red impact rings and snatch emergency beacons to survive.',
    desktopHint: 'WASD / Arrows Move · Space Dash · Esc Pause',
    mobileHint: 'Joystick Move · Tap DASH out of red rings',
    baseCoins: 410, baseXp: 520, timeLimitSec: 34,
  },
  {
    id: 32, stage: 4, title: 'Crushing Walls', subtitle: 'Hydraulic Compression', mechanicTag: 'Gap Escape',
    description: 'Massive hydraulic walls slam shut from both sides. Thread through shifting narrow openings to reach the override gate.',
    desktopHint: 'WASD / Arrows Move · Space Dash · Esc Pause',
    mobileHint: 'Joystick Move · Tap DASH through wall gaps',
    baseCoins: 425, baseXp: 540, timeLimitSec: 38,
  },
  {
    id: 33, stage: 4, title: 'Acid Floor', subtitle: 'Corrosive Surge Pool', mechanicTag: 'Crate Hop',
    description: 'Corrosive acid covers the floor while safe steel crates slowly sink under weight. Hop between fresh crates to survive.',
    desktopHint: 'WASD / Arrows Move · Space Dash · Esc Pause',
    mobileHint: 'Joystick Move · Hop onto glowing intact crates',
    baseCoins: 440, baseXp: 560, timeLimitSec: 32,
  },
  {
    id: 34, stage: 4, title: 'Laser Web', subtitle: 'Rotating Beam Lattice', mechanicTag: 'Web Weave',
    description: 'Sweeping multi-spoke lasers rotate around the central hub at shifting speeds. Weave and dash cleanly until power drops.',
    desktopHint: 'WASD / Arrows Move · Space Dash · Esc Pause',
    mobileHint: 'Joystick Move · Tap DASH through laser spokes',
    baseCoins: 455, baseXp: 580, timeLimitSec: 34,
  },
  {
    id: 35, stage: 4, title: 'Darkness Maze', subtitle: 'Lantern Radius Escape', mechanicTag: 'Lantern Maze',
    description: 'Pitch-black vault sectors lit only by your narrow lantern glow. Grab 2 power cells and escape roaming stalkers.',
    desktopHint: 'WASD / Arrows Move · Shift Dash · Esc Pause',
    mobileHint: 'Joystick Move · Tap DASH',
    baseCoins: 470, baseXp: 600, timeLimitSec: 65,
  },
  {
    id: 36, stage: 4, title: 'Speed Run Gauntlet', subtitle: 'Turbo Saw Sprint', mechanicTag: 'Turbo Sprint',
    description: 'Hit emerald turbo pads and rocket past oscillating saw gates before the aggressive countdown hits zero.',
    desktopHint: 'WASD / Arrows Move · Space Dash · Esc Pause',
    mobileHint: 'Joystick Move · Hit turbo pads & DASH',
    baseCoins: 485, baseXp: 620, timeLimitSec: 32,
  },
  {
    id: 37, stage: 4, title: 'Twin Traps', subtitle: 'Dual Hazard Crossfire', mechanicTag: 'Crossfire',
    description: 'Survive sweeping perimeter lasers AND erupting electric tiles simultaneously inside the tightening arena.',
    desktopHint: 'WASD / Arrows Move · Space Dash · Esc Pause',
    mobileHint: 'Joystick Move · Tap DASH',
    baseCoins: 500, baseXp: 640, timeLimitSec: 34,
  },
  {
    id: 38, stage: 4, title: 'Moving Safe Zone', subtitle: 'Escort Shield Drone', mechanicTag: 'Drone Escort',
    description: 'Turret fire hammers the open yard. Stay locked inside the moving energy shield drone as it sweeps toward extraction.',
    desktopHint: 'WASD / Arrows Move · Stay inside Shield Bubble · Esc Pause',
    mobileHint: 'Joystick Move · Follow the moving blue shield',
    baseCoins: 515, baseXp: 660, timeLimitSec: 35,
  },
  {
    id: 39, stage: 4, title: 'Guard Ambush', subtitle: '3-Wave Squad Siege', mechanicTag: 'Wave Combat',
    description: 'Eliminate three escalating squads of Triangle and Square enforcers using melee combos, dodges, and parries.',
    desktopHint: 'WASD Move · J/Space Attack · K/Shift Dodge · L Guard',
    mobileHint: 'Joystick Move · Attack, Dodge & Guard',
    baseCoins: 530, baseXp: 690, timeLimitSec: 75,
  },
  {
    id: 40, stage: 4, title: 'The Ultimate Hunter', subtitle: 'Stage 4 Boss Encounter', mechanicTag: 'Boss Battle',
    description: 'Outlast the relentless Ultimate Hunter. Dodge tracking rockets, evade triple-dashes, and punish after his trap net misses.',
    desktopHint: 'WASD Move · J/Space Attack · K/Shift Dodge · L Guard',
    mobileHint: 'Joystick Move · Attack, Dodge & Guard',
    baseCoins: 900, baseXp: 1100, timeLimitSec: 110,
    isBoss: true, bossName: 'The Ultimate Hunter', bossTitle: 'Stage 4 Apex Predator',
  },

  // STAGE 5: THE FINAL TOURNAMENT (41-50)
  {
    id: 41, stage: 5, title: 'Chaos Arena', subtitle: 'Tri-Hazard Crucible', mechanicTag: 'Chaos Survival',
    description: 'Rotating beams, seeker drones, and shock tiles combine in one relentless championship crucible.',
    desktopHint: 'WASD / Arrows Move · Space Dash · Esc Pause',
    mobileHint: 'Joystick Move · Tap DASH',
    baseCoins: 560, baseXp: 740, timeLimitSec: 36,
  },
  {
    id: 42, stage: 5, title: 'Sudden Death', subtitle: 'Zero-Error Courtyard', mechanicTag: '1-HP Sprint',
    description: 'Red Light, Green Light with zero room for error—single life, rapid doll turns, and faster sniper lock.',
    desktopHint: 'Hold W / Up / Space to Sprint · Release on Red · Esc Pause',
    mobileHint: 'Hold SPRINT · Freeze instantly on Red Light',
    baseCoins: 580, baseXp: 780, timeLimitSec: 35,
  },
  {
    id: 43, stage: 5, title: 'Precision Bridge', subtitle: 'Shifting Tempered Glass', mechanicTag: 'High Bridge',
    description: '10 fragile glass pairs over the abyss under harsh crosswinds and tight clock pressure.',
    desktopHint: 'A / Left or D / Right to Leap · Esc Pause',
    mobileHint: 'Tap JUMP LEFT or JUMP RIGHT',
    baseCoins: 600, baseXp: 820, timeLimitSec: 40,
  },
  {
    id: 44, stage: 5, title: 'Hyper Tug', subtitle: 'Championship Rope War', mechanicTag: 'Hyper Tap',
    description: 'Face the elite Square squad in an intense high-speed Tug of War with fierce AI heave bursts.',
    desktopHint: 'Tap Space / Click PULL rapidly · Esc Pause',
    mobileHint: 'Tap PULL as fast as possible · Hit Surge boosts',
    baseCoins: 620, baseXp: 860, timeLimitSec: 28,
  },
  {
    id: 45, stage: 5, title: 'Triple Threat', subtitle: 'Key, Bomb & Laser Trial', mechanicTag: 'Multi-Task',
    description: 'Collect 2 armory keys, dodge falling bombs, and weave past sweeping beams inside a compact high-stakes chamber.',
    desktopHint: 'WASD / Arrows Move · Space Dash · Esc Pause',
    mobileHint: 'Joystick Move · Tap DASH',
    baseCoins: 650, baseXp: 900, timeLimitSec: 42,
  },
  {
    id: 46, stage: 5, title: 'Laser Hell', subtitle: 'Synchronized Grid Sweep', mechanicTag: 'Beam Mastery',
    description: 'Dense multi-directional laser waves sweep across the vault floor. Dash cleanly between phase resets.',
    desktopHint: 'WASD / Arrows Move · Space Dash · Esc Pause',
    mobileHint: 'Joystick Move · Tap DASH through gaps',
    baseCoins: 680, baseXp: 940, timeLimitSec: 36,
  },
  {
    id: 47, stage: 5, title: 'Final Maze', subtitle: '3-Key Maximum Security', mechanicTag: 'Elite Stealth',
    description: 'Infiltrate the final inner sanctum, claim all 3 security keys past elite guards and turrets, and reach extraction.',
    desktopHint: 'WASD / Arrows Move · Shift Dash · Esc Pause',
    mobileHint: 'Joystick Move · Tap DASH',
    baseCoins: 720, baseXp: 980, timeLimitSec: 70,
  },
  {
    id: 48, stage: 5, title: 'Endurance Trial', subtitle: '60-Second Siege Ring', mechanicTag: 'Endurance',
    description: 'Hold out inside the shrinking championship ring as hazards escalate every 10 seconds.',
    desktopHint: 'WASD / Arrows Move · Space Dash · Esc Pause',
    mobileHint: 'Joystick Move · Tap DASH',
    baseCoins: 760, baseXp: 1050, timeLimitSec: 45,
  },
  {
    id: 49, stage: 5, title: 'Semi-Final Duel', subtitle: 'Twin Lieutenants', mechanicTag: '2v1 Duel',
    description: 'Defeat both coordinated Masked Lieutenants inside the championship court to earn your shot at Level 50.',
    desktopHint: 'WASD Move · J/Space Attack · K/Shift Dodge · L Guard',
    mobileHint: 'Joystick Move · Attack, Dodge & Guard',
    baseCoins: 820, baseXp: 1150, timeLimitSec: 90,
  },
  {
    id: 50, stage: 5, title: 'The Final Champion', subtitle: 'Grand Finale Boss Battle', mechanicTag: 'Grand Boss',
    description: 'The ultimate 3-phase showdown inside the Golden Squid Colosseum. Defeat The Final Champion to claim the tournament crown!',
    desktopHint: 'WASD Move · J/Space Attack · K/Shift Dodge · L Guard',
    mobileHint: 'Joystick Move · Attack, Dodge & Guard',
    baseCoins: 2500, baseXp: 3500, timeLimitSec: 135,
    isBoss: true, bossName: 'The Final Champion', bossTitle: 'Undefeated Tournament Sovereign',
  },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'survive_1', title: 'First Light', description: 'Survive Level 1: Red Light, Green Light.', rewardCoins: 80, rewardXp: 100 },
  { id: 'boss_10', title: 'Guardian Breaker', description: 'Defeat Stage 1 Boss: The Arena Guardian.', rewardCoins: 200, rewardXp: 250 },
  { id: 'boss_20', title: 'Shadow Slayer', description: 'Defeat Stage 2 Boss: The Shadow Master.', rewardCoins: 300, rewardXp: 400 },
  { id: 'boss_30', title: 'Unbroken Mind', description: 'Defeat Stage 3 Boss: The Mind Controller.', rewardCoins: 450, rewardXp: 600 },
  { id: 'boss_40', title: 'Apex Survivor', description: 'Defeat Stage 4 Boss: The Ultimate Hunter.', rewardCoins: 650, rewardXp: 850 },
  { id: 'boss_50', title: 'Squid Survival Champion', description: 'Conquer Level 50 and defeat The Final Champion.', rewardCoins: 1500, rewardXp: 2000 },
  { id: 'flawless_trial', title: 'Untouchable', description: 'Clear any trial without taking damage.', rewardCoins: 120, rewardXp: 150 },
  { id: 'streak_5', title: 'Unstoppable Streak', description: 'Win 5 trials in a row without elimination.', rewardCoins: 250, rewardXp: 300 },
  { id: 'collector_10', title: 'Armory Collector', description: 'Own at least 5 customization items across outfits, masks, or accessories.', rewardCoins: 200, rewardXp: 200 },
  { id: 'halfway_25', title: 'Halfway Sovereign', description: 'Complete 25 unique levels across the tournament.', rewardCoins: 500, rewardXp: 700 },
];

export interface RankTier {
  name: string;
  minXp: number;
  color: string;
}

export const RANK_TIERS: RankTier[] = [
  { name: 'Rookie', minXp: 0, color: '#a1a1aa' },
  { name: 'Survivor', minXp: 500, color: '#10b981' },
  { name: 'Challenger', minXp: 1800, color: '#38bdf8' },
  { name: 'Tactician', minXp: 4200, color: '#a855f7' },
  { name: 'Veteran', minXp: 8000, color: '#f59e0b' },
  { name: 'Master', minXp: 14000, color: '#ff2e63' },
  { name: 'Grand Champion', minXp: 22000, color: '#fde047' },
];

export function getLevelMeta(levelId: number): LevelMeta {
  return LEVEL_METADATA.find((l) => l.id === levelId) ?? LEVEL_METADATA[0];
}

export function getStageForLevel(levelId: number): StageMeta {
  const lvl = getLevelMeta(levelId);
  return STAGES.find((s) => s.id === lvl.stage) ?? STAGES[0];
}
