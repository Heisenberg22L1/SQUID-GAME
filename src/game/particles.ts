export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
  gravity: number;
  ring: boolean;
}

const POOL_SIZE = 256;

export class ParticlePool {
  private pool: Particle[];
  private cursor = 0;

  constructor() {
    this.pool = Array.from({ length: POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      size: 4,
      alpha: 1,
      life: 0,
      maxLife: 1,
      color: '#ff2e63',
      gravity: 0,
      ring: false,
    }));
  }

  clear(): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      this.pool[i].active = false;
    }
  }

  emitBurst(
    x: number,
    y: number,
    count: number,
    color: string,
    speedMin = 40,
    speedMax = 220,
    size = 4,
    gravity = 180,
    life = 0.45
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % POOL_SIZE;
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = size * (0.7 + Math.random() * 0.6);
      p.alpha = 1;
      p.life = life * (0.75 + Math.random() * 0.4);
      p.maxLife = p.life;
      p.color = color;
      p.gravity = gravity;
      p.ring = false;
    }
  }

  emitRing(x: number, y: number, color: string, size = 18, life = 0.35): void {
    const p = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % POOL_SIZE;
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = 0;
    p.vy = 0;
    p.size = size;
    p.alpha = 0.9;
    p.life = life;
    p.maxLife = life;
    p.color = color;
    p.gravity = 0;
    p.ring = true;
  }

  update(dt: number): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      if (p.ring) {
        const progress = 1 - p.life / p.maxLife;
        const r = p.size * (0.5 + progress * 2.2);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5 * p.alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * p.alpha), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
}
