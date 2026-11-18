import React, { useEffect, useRef, useState } from 'react';
import { Award, Check, Coins, Download, Share2, Trophy } from 'lucide-react';
import { resolveAppearance } from '../game/customization';
import { drawContender } from '../game/levelContext';
import { getPlayerRank, getTournamentCompletionPercent } from '../game/rules';
import type { LevelOutcome, SaveData } from '../game/types';

interface ChampionModalProps {
  save: SaveData;
  lastOutcome: LevelOutcome | null;
  onReplayFinal: () => void;
  onExitToTitle: () => void;
}

export const ChampionModal: React.FC<ChampionModalProps> = ({
  save,
  lastOutcome,
  onReplayFinal,
  onExitToTitle,
}) => {
  const fwCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const charCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [trophyImgFailed, setTrophyImgFailed] = useState(false);

  const rank = getPlayerRank(save.xp);
  const totalScore = Object.values(save.bestScores).reduce((s, v) => s + v, 0);
  const completionPct = getTournamentCompletionPercent(save.completedLevels);

  // Fireworks & Gold Particle Celebration Background
  useEffect(() => {
    const canvas = fwCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    interface Spark {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      maxLife: number;
      color: string;
    }
    const sparks: Spark[] = [];
    const colors = ['#fbbf24', '#ff2e63', '#10b981', '#38bdf8', '#f4f4f6'];
    let burstTimer = 0.1;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let prev = performance.now();
    const loop = (ts: number) => {
      const dt = Math.min(0.05, (ts - prev) / 1000);
      prev = ts;
      burstTimer -= dt;
      if (burstTimer <= 0) {
        burstTimer = 0.55;
        const bx = canvas.width * (0.15 + Math.random() * 0.7);
        const by = canvas.height * (0.15 + Math.random() * 0.45);
        const col = colors[Math.floor(Math.random() * colors.length)];
        for (let i = 0; i < 26; i++) {
          const a = (i * Math.PI * 2) / 26;
          const sp = 80 + Math.random() * 140;
          sparks.push({
            x: bx,
            y: by,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            life: 1.2,
            maxLife: 1.2,
            color: col,
          });
        }
      }

      ctx.fillStyle = 'rgba(7, 8, 10, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        s.vy += 120 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        ctx.globalAlpha = Math.max(0, s.life / s.maxLife);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // Render Player's Equipped Champion Character
  useEffect(() => {
    const canvas = charCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const start = performance.now();
    const loop = (ts: number) => {
      const t = (ts - start) / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const resolved = resolveAppearance(save.equipped);
      drawContender(ctx, canvas.width * 0.5, canvas.height * 0.56, 30, resolved, {
        walkPhase: t * 2.5,
        animTime: t,
      });
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [save.equipped]);

  const generateShareCardDataUrl = (): string | null => {
    const card = document.createElement('canvas');
    card.width = 900;
    card.height = 500;
    const c = card.getContext('2d');
    if (!c) return null;

    const grad = c.createLinearGradient(0, 0, 900, 500);
    grad.addColorStop(0, '#090a0e');
    grad.addColorStop(0.55, '#1d0d17');
    grad.addColorStop(1, '#1a1407');
    c.fillStyle = grad;
    c.fillRect(0, 0, 900, 500);

    c.strokeStyle = '#fbbf24';
    c.lineWidth = 5;
    c.strokeRect(20, 20, 860, 460);

    c.fillStyle = '#fbbf24';
    c.font = '700 18px "JetBrains Mono", monospace';
    c.fillText('SQUID SURVIVAL · 50-LEVEL TOURNAMENT', 56, 74);

    c.fillStyle = '#ffffff';
    c.font = '800 54px "Barlow Condensed", sans-serif';
    c.fillText('ULTIMATE CHAMPION', 56, 140);

    c.fillStyle = '#e4e4e7';
    c.font = '700 28px "Barlow Condensed", sans-serif';
    c.fillText(`${save.playerName} (${save.playerId})`, 56, 200);

    c.fillStyle = '#10b981';
    c.font = '700 22px "JetBrains Mono", monospace';
    c.fillText(`RANK: ${rank.current.name.toUpperCase()} · SCORE: ${totalScore}`, 56, 255);
    c.fillStyle = '#a1a1aa';
    c.fillText(
      `TRIALS CLEARED: ${save.completedLevels.length}/50 · WINS: ${save.totalWins} · STREAK: ${save.bestWinStreak}`,
      56,
      295
    );
    c.fillText(`CROWNED ON: ${save.championDate ?? '2026-11-18'}`, 56, 335);

    drawContender(c, 740, 260, 62, resolveAppearance(save.equipped), { animTime: 1 });
    return card.toDataURL('image/png');
  };

  const handleShareVictory = async () => {
    const summaryText = `I conquered all 50 trials in SQUID SURVIVAL and defeated The Final Champion! Rank: ${rank.current.name} | Score: ${totalScore} | Player ID: ${save.playerId}`;
    const dataUrl = generateShareCardDataUrl();

    if (navigator.share && dataUrl) {
      try {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'squid-survival-champion.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Squid Survival Champion',
            text: summaryText,
            files: [file],
          });
          setShareFeedback('Victory card shared!');
          return;
        }
      } catch {
        // Fall through to download/copy
      }
    }

    if (dataUrl) {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'squid-survival-champion.png';
      a.click();
    }
    try {
      await navigator.clipboard?.writeText(summaryText);
      setShareFeedback('Victory card PNG downloaded & stats copied!');
    } catch {
      setShareFeedback('Victory card PNG downloaded!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-4 overflow-y-auto">
      <canvas ref={fwCanvasRef} className="fixed inset-0 pointer-events-none" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="champion-title"
        className="relative z-10 w-full max-w-xl rounded-2xl bg-[#0e1015]/95 border border-amber-400/60 p-6 sm:p-7 text-center shadow-2xl"
      >
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="w-24 h-24 rounded-xl overflow-hidden border border-amber-400/50 bg-[#141720] flex items-center justify-center">
            {!trophyImgFailed ? (
              <img
                src="/src/assets/images/victory_crest_1794989168715.jpg"
                alt="Squid Survival Champion Trophy"
                referrerPolicy="no-referrer"
                onError={() => setTrophyImgFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <Trophy className="w-12 h-12 text-amber-400" />
            )}
          </div>
          <canvas
            ref={charCanvasRef}
            width={110}
            height={110}
            className="w-24 h-24 rounded-xl border border-[#10b981]/50 bg-[#141720]"
          />
        </div>

        <div className="text-xs font-mono-num uppercase tracking-widest text-amber-400">
          Level 50 Grand Finale Conquered
        </div>
        <h2
          id="champion-title"
          className="font-display text-3xl sm:text-5xl font-extrabold text-white mt-1 tracking-wide"
        >
          YOU ARE THE SQUID SURVIVAL CHAMPION
        </h2>
        <p className="text-xs sm:text-sm text-zinc-300 mt-2">
          {save.playerName} ({save.playerId}) · Rank: <strong className="text-amber-300">{rank.current.name}</strong>
          {lastOutcome ? ` · ${lastOutcome.detailLabel}` : ''}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-5 tabular-nums">
          <div className="p-3 rounded-lg bg-[#141720] border border-white/10">
            <div className="text-[11px] text-zinc-400">Tournament</div>
            <div className="font-mono-num text-lg font-bold text-[#10b981]">{completionPct}%</div>
          </div>
          <div className="p-3 rounded-lg bg-[#141720] border border-white/10">
            <div className="text-[11px] text-zinc-400">Total Score</div>
            <div className="font-mono-num text-lg font-bold text-white">{totalScore}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#141720] border border-white/10">
            <div className="text-[11px] text-zinc-400">Best Streak</div>
            <div className="font-mono-num text-lg font-bold text-amber-400">{save.bestWinStreak}</div>
          </div>
          <div className="p-3 rounded-lg bg-[#141720] border border-white/10">
            <div className="text-[11px] text-zinc-400">Prize Pool</div>
            <div className="font-mono-num text-lg font-bold text-amber-300 inline-flex items-center gap-1">
              <Coins className="w-4 h-4" /> {save.totalCoinsEarned}
            </div>
          </div>
        </div>

        {shareFeedback && (
          <div className="mb-4 py-2 px-3 rounded-lg bg-[#10b981]/15 border border-[#10b981]/40 text-xs text-[#10b981] inline-flex items-center gap-1.5">
            <Check className="w-4 h-4" />
            <span>{shareFeedback}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={handleShareVictory}
            className="flex-1 min-h-[48px] px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-[#07080a] font-bold text-sm inline-flex items-center justify-center gap-2"
          >
            {typeof navigator !== 'undefined' && 'share' in navigator ? (
              <Share2 className="w-4 h-4" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Share Victory Card</span>
          </button>
          <button
            type="button"
            onClick={onReplayFinal}
            className="min-h-[48px] px-4 rounded-lg bg-[#161922] hover:bg-[#1f2330] border border-white/15 text-white font-semibold text-sm inline-flex items-center justify-center gap-2"
          >
            <Award className="w-4 h-4 text-[#ff2e63]" />
            <span>Replay Level 50</span>
          </button>
          <button
            type="button"
            onClick={onExitToTitle}
            className="min-h-[48px] px-4 rounded-lg bg-transparent hover:bg-white/5 border border-white/15 text-zinc-300 font-semibold text-sm"
          >
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
