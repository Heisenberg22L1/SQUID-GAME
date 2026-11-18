# Squid Survival — Only One Can Survive

A mobile-first 7-level survival game PWA built with HTML5 Canvas 2D, React, TypeScript, and Tailwind CSS. Playable offline on Android home screens, mobile browsers, tablets, and desktops.

## Features
- **7 Playable Survival Trials**:
  1. **Red Light, Green Light** — Sprint while the giant doll faces away; freeze instantly when she turns.
  2. **Dalgona Challenge** — Carve Circle, Triangle, Star, or Umbrella honeycomb shapes with touch/mouse needle precision.
  3. **Tug of War** — Rapid-tap battle with golden Surge boost windows and rival AI heave telegraphs.
  4. **Marbles** — Strategic 10-marble Odd/Even wagering duel against an adaptive AI.
  5. **Glass Bridge** — Choose Left or Right tempered panels above the chasm with randomized paths.
  6. **Hide and Survive** — Top-down stealth labyrinth with patrolling, chasing, and turret laser guards.
  7. **Squid Game Final** — Boss arena duel with Attack, Dodge, and Parry/Guard mechanics.
- **Player Progression**: LocalStorage save persistence, coins, 5 unlockable uniforms, 8 achievements, daily streak rewards, Easy/Normal/Hard difficulty modes, Practice Mode, and local leaderboard.
- **Procedural Web Audio**: Built-in suspense music and sound effects with separate Music/SFX volume sliders and mute control (zero external audio dependencies).
- **Offline-Ready PWA**: Installable on Android & iOS home screens via `vite-plugin-pwa` service worker caching.

## Run Locally
```bash
npm install
npm run dev
```
Open `http://localhost:3000`.

## Build & Deploy to Netlify
1. Build the production bundle:
   ```bash
   npm run build
   ```
2. Deploy the `dist/` folder directly to Netlify (configuration included in `netlify.toml`), or connect your Git repository with build command `npm run build` and publish directory `dist`.

## Run Unit Tests
```bash
npx --yes tsx --test src/game/rules.test.ts
```
