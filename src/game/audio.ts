import { MUSIC_TRACK_URLS, selectMusicTrackForScreen, type ResolvedMusicTrack } from './audioTracks';
import type { AudioSettings } from './types';

type BgmMode = 'title' | 'playing' | 'spectating';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private settings: AudioSettings = {
    musicVolume: 0.45,
    sfxVolume: 0.7,
    muted: false,
    musicTrack: 'auto',
  };
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private bgmPlaying = false;
  private bossMode = false;

  // HTML5 Audio BGM tracks (Jump Rope & Mingle)
  private tracks: Partial<Record<'jump_rope' | 'mingle', HTMLAudioElement>> = {};
  private activeMp3Key: 'jump_rope' | 'mingle' | null = null;
  private currentMode: BgmMode = 'title';
  private currentLevelId = 1;
  private desiredBgmActive = false;
  private gestureListenerAttached = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);
      this.applyVolumes();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private attachGestureUnlock(): void {
    if (typeof window === 'undefined' || this.gestureListenerAttached) return;
    this.gestureListenerAttached = true;
    const onFirstGesture = () => {
      this.unlock();
    };
    window.addEventListener('pointerdown', onFirstGesture, { passive: true });
    window.addEventListener('keydown', onFirstGesture, { passive: true });
  }

  private getTrackElement(key: 'jump_rope' | 'mingle'): HTMLAudioElement | null {
    if (typeof Audio === 'undefined') return null;
    let audio = this.tracks[key];
    if (!audio) {
      audio = new Audio(MUSIC_TRACK_URLS[key]);
      audio.loop = true;
      audio.preload = 'auto';
      this.tracks[key] = audio;
    }
    return audio;
  }

  private getEffectiveTrackVolume(): number {
    if (this.settings.muted || this.settings.musicVolume <= 0.005) return 0;
    const modeScale =
      this.currentMode === 'title'
        ? 0.55
        : this.currentMode === 'spectating'
        ? 0.48
        : 0.72;
    return Math.max(0, Math.min(1, this.settings.musicVolume * modeScale));
  }

  private syncActiveMp3Volume(): void {
    const vol = this.getEffectiveTrackVolume();
    for (const key of ['jump_rope', 'mingle'] as const) {
      const el = this.tracks[key];
      if (el) {
        el.volume = vol;
      }
    }
  }

  private tryPlayMp3(key: 'jump_rope' | 'mingle', resetPosition: boolean): void {
    const otherKey = key === 'jump_rope' ? 'mingle' : 'jump_rope';
    const otherEl = this.tracks[otherKey];
    if (otherEl && !otherEl.paused) {
      otherEl.pause();
      otherEl.currentTime = 0;
    }

    const el = this.getTrackElement(key);
    if (!el) return;

    if (resetPosition || this.activeMp3Key !== key) {
      try {
        el.currentTime = 0;
      } catch {
        // Ignore if metadata not yet loaded
      }
    }
    this.activeMp3Key = key;
    el.volume = this.getEffectiveTrackVolume();

    if (this.settings.muted || this.settings.musicVolume <= 0.005) {
      if (!el.paused) el.pause();
      return;
    }

    if (el.paused) {
      const p = el.play();
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // Autoplay blocked prior to user gesture; unlock() retries cleanly
        });
      }
    }
  }

  unlock(): void {
    this.attachGestureUnlock();
    const ctx = this.ensureContext();
    if (this.desiredBgmActive) {
      const resolved = this.getResolvedTrack();
      if (resolved === 'synth') {
        if (ctx && !this.bgmPlaying) {
          this.startSynthLoop();
        }
      } else {
        this.tryPlayMp3(resolved, false);
      }
    }
  }

  getResolvedTrack(): ResolvedMusicTrack {
    return selectMusicTrackForScreen(
      this.currentMode,
      this.currentLevelId,
      this.settings.musicTrack ?? 'auto'
    );
  }

  updateSettings(next: AudioSettings): void {
    const prevTrack = this.settings.musicTrack ?? 'auto';
    const prevMuted = this.settings.muted;
    const prevVol = this.settings.musicVolume;
    this.settings = { ...next };
    this.applyVolumes();
    this.syncActiveMp3Volume();

    const nextTrack = next.musicTrack ?? 'auto';
    if (this.desiredBgmActive) {
      if (prevTrack !== nextTrack) {
        this.startBgm(this.bossMode, this.currentLevelId, this.currentMode, true);
      } else if ((prevMuted && !next.muted) || (prevVol <= 0.005 && next.musicVolume > 0.005)) {
        const resolved = this.getResolvedTrack();
        if (resolved !== 'synth') {
          this.tryPlayMp3(resolved, false);
        } else if (!this.bgmPlaying) {
          this.startSynthLoop();
        }
      } else if (next.muted || next.musicVolume <= 0.005) {
        if (this.activeMp3Key && this.tracks[this.activeMp3Key]) {
          this.tracks[this.activeMp3Key]?.pause();
        }
      }
    }
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.musicGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const mVol = this.settings.muted ? 0 : this.settings.musicVolume * 0.25;
    const sVol = this.settings.muted ? 0 : this.settings.sfxVolume * 0.45;
    this.musicGain.gain.setTargetAtTime(mVol, now, 0.03);
    this.sfxGain.gain.setTargetAtTime(sVol, now, 0.02);
  }

  private stopSynthLoop(): void {
    this.bgmPlaying = false;
    if (this.bgmTimer !== null) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private startSynthLoop(): void {
    if (this.bgmPlaying) return;
    if (!this.ctx || this.ctx.state === 'suspended') return;
    this.bgmPlaying = true;
    const standardNotes = [110, 110, 130.81, 146.83, 110, 164.81, 146.83, 130.81];
    const bossNotes = [98, 98, 116.54, 130.81, 146.83, 130.81, 116.54, 155.56];

    const tick = () => {
      if (!this.bgmPlaying) return;
      if (this.ctx && this.musicGain && !this.settings.muted && this.settings.musicVolume > 0.01) {
        const now = this.ctx.currentTime;
        const notes = this.bossMode ? bossNotes : standardNotes;
        const osc = this.ctx.createOscillator();
        const env = this.ctx.createGain();
        const freq = notes[this.bgmStep % notes.length];
        osc.type = this.bossMode ? 'sawtooth' : this.bgmStep % 4 === 0 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now);
        env.gain.setValueAtTime(0.001, now);
        env.gain.exponentialRampToValueAtTime(this.bossMode ? 0.24 : 0.34, now + 0.03);
        env.gain.exponentialRampToValueAtTime(0.001, now + (this.bossMode ? 0.28 : 0.42));
        osc.connect(env);
        env.connect(this.musicGain);
        osc.start(now);
        osc.stop(now + 0.44);

        if (this.bgmStep % (this.bossMode ? 2 : 4) === (this.bossMode ? 1 : 2)) {
          const ping = this.ctx.createOscillator();
          const pEnv = this.ctx.createGain();
          ping.type = this.bossMode ? 'square' : 'sine';
          ping.frequency.setValueAtTime(this.bossMode ? 330 : 440, now);
          pEnv.gain.setValueAtTime(0.001, now);
          pEnv.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
          pEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
          ping.connect(pEnv);
          pEnv.connect(this.musicGain);
          ping.start(now);
          ping.stop(now + 0.18);
        }
      }
      this.bgmStep += 1;
      this.bgmTimer = window.setTimeout(tick, this.bossMode ? 320 : 480);
    };
    tick();
  }

  startBgm(
    isBoss = false,
    levelId = 1,
    mode: BgmMode = 'playing',
    restart = false
  ): void {
    this.attachGestureUnlock();
    this.bossMode = isBoss;
    this.currentLevelId = levelId;
    this.currentMode = mode;
    this.desiredBgmActive = true;

    const resolved = this.getResolvedTrack();
    if (resolved === 'synth') {
      for (const key of ['jump_rope', 'mingle'] as const) {
        const el = this.tracks[key];
        if (el && !el.paused) el.pause();
      }
      this.activeMp3Key = null;
      this.startSynthLoop();
      return;
    }

    this.stopSynthLoop();
    this.tryPlayMp3(resolved, restart);
  }

  pauseBgm(): void {
    this.desiredBgmActive = false;
    this.stopSynthLoop();
    for (const key of ['jump_rope', 'mingle'] as const) {
      const el = this.tracks[key];
      if (el && !el.paused) {
        el.pause();
      }
    }
  }

  stopBgm(resetPosition = true): void {
    this.desiredBgmActive = false;
    this.stopSynthLoop();
    for (const key of ['jump_rope', 'mingle'] as const) {
      const el = this.tracks[key];
      if (el) {
        if (!el.paused) el.pause();
        if (resetPosition) {
          try {
            el.currentTime = 0;
          } catch {
            // Ignore unready media
          }
        }
      }
    }
    if (resetPosition) {
      this.activeMp3Key = null;
    }
  }

  private playTone(
    freq: number,
    endFreq: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainPeak = 0.5,
    pitchJitter = 0
  ): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.sfxGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const jitter = pitchJitter ? 1 + (Math.random() * 2 - 1) * pitchJitter : 1;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq * jitter, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq * jitter), now + duration);
    }
    env.gain.setValueAtTime(0.001, now);
    env.gain.exponentialRampToValueAtTime(gainPeak, now + 0.015);
    env.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(env);
    env.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  click(): void {
    this.playTone(540, 680, 0.07, 'triangle', 0.35, 0.05);
  }

  step(): void {
    this.playTone(150, 90, 0.06, 'triangle', 0.25, 0.12);
  }

  countdown(): void {
    this.playTone(720, 720, 0.08, 'sine', 0.3);
  }

  greenLight(): void {
    this.playTone(523.25, 659.25, 0.16, 'triangle', 0.45);
  }

  warning(): void {
    this.playTone(480, 340, 0.18, 'sawtooth', 0.32);
  }

  redLight(): void {
    this.playTone(260, 140, 0.25, 'sawtooth', 0.55);
  }

  hit(): void {
    this.playTone(180, 55, 0.16, 'square', 0.6, 0.08);
  }

  block(): void {
    this.playTone(900, 1200, 0.09, 'triangle', 0.45, 0.06);
  }

  laserZap(): void {
    this.playTone(1100, 240, 0.18, 'sawtooth', 0.45);
  }

  explosion(): void {
    this.playTone(140, 36, 0.42, 'sawtooth', 0.65);
  }

  bossRoar(): void {
    this.playTone(120, 62, 0.55, 'sawtooth', 0.6);
    window.setTimeout(() => this.playTone(92, 48, 0.45, 'square', 0.4), 90);
  }

  glassBreak(): void {
    this.playTone(1400, 380, 0.28, 'sawtooth', 0.55);
    window.setTimeout(() => this.playTone(980, 260, 0.22, 'triangle', 0.4), 45);
  }

  pickup(): void {
    this.playTone(660, 990, 0.14, 'sine', 0.45);
  }

  eliminate(): void {
    this.playTone(220, 58, 0.48, 'sawtooth', 0.7);
    window.setTimeout(() => this.playTone(140, 48, 0.42, 'square', 0.45), 90);
  }

  levelClear(): void {
    const chord = [523.25, 659.25, 783.99, 1046.5];
    chord.forEach((f, idx) => {
      window.setTimeout(() => this.playTone(f, f, 0.24, 'triangle', 0.45), idx * 75);
    });
  }

  victoryAnthem(): void {
    const melody = [523.25, 659.25, 783.99, 1046.5, 987.77, 1046.5, 1318.5, 1567.98];
    melody.forEach((f, idx) => {
      window.setTimeout(() => this.playTone(f, f, 0.34, 'triangle', 0.5), idx * 105);
    });
  }
}

export const audioEngine = new SoundEngine();
