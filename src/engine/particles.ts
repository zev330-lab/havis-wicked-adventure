// Particle system — sparkles, magic trails, floating musical notes
import { Particle, ParticleEmitterConfig, Color } from './types';

export class ParticleSystem {
  particles: Particle[] = [];
  private pool: Particle[] = [];
  private maxActive = 300;
  private maxPool = 200;

  private getParticle(): Particle {
    // Cap pool size
    if (this.pool.length > this.maxPool) this.pool.length = this.maxPool;
    return this.pool.pop() || {
      x: 0, y: 0, vx: 0, vy: 0,
      life: 0, maxLife: 1, size: 4, sizeEnd: 0,
      color: { r: 255, g: 255, b: 255, a: 1 },
      rotation: 0, rotationSpeed: 0,
      shape: 'circle', gravity: 0, alpha: 1, alphaEnd: 0,
    };
  }

  emit(config: ParticleEmitterConfig) {
    const count = config.count;
    for (let i = 0; i < count; i++) {
      // Cap active particles to prevent memory issues
      if (this.particles.length >= this.maxActive) return;
      const p = this.getParticle();
      const angle = (config.angle ?? Math.random() * Math.PI * 2) +
        (Math.random() - 0.5) * (config.angleVariance ?? Math.PI * 2);
      const speed = config.speed + (Math.random() - 0.5) * config.speedVariance;
      const life = config.life + (Math.random() - 0.5) * config.lifeVariance;

      p.x = config.x + (Math.random() - 0.5) * config.spread;
      p.y = config.y + (Math.random() - 0.5) * config.spread;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = life;
      p.maxLife = life;
      p.size = config.size + (Math.random() - 0.5) * config.sizeVariance;
      p.sizeEnd = config.sizeEnd;
      p.color = { ...config.color };
      p.colorEnd = config.colorEnd ? { ...config.colorEnd } : undefined;
      p.rotation = Math.random() * Math.PI * 2;
      p.rotationSpeed = (config.rotationSpeed ?? 0) + (Math.random() - 0.5) * 2;
      p.shape = config.shape;
      p.gravity = config.gravity;
      p.alpha = config.alpha ?? 1;
      p.alphaEnd = config.alphaEnd ?? 0;

      this.particles.push(p);
    }
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.pool.push(this.particles.splice(i, 1)[0]);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += p.rotationSpeed * dt;
    }
  }

  render(ctx: CanvasRenderingContext2D, cameraX = 0, cameraY = 0) {
    for (const p of this.particles) {
      const t = 1 - p.life / p.maxLife;
      const size = p.size + (p.sizeEnd - p.size) * t;
      const alpha = p.alpha + (p.alphaEnd - p.alpha) * t;
      if (alpha <= 0 || size <= 0) continue;

      const c = p.color;
      const ce = p.colorEnd;
      let r: number, g: number, b: number;
      if (ce) {
        r = Math.floor(c.r + (ce.r - c.r) * t);
        g = Math.floor(c.g + (ce.g - c.g) * t);
        b = Math.floor(c.b + (ce.b - c.b) * t);
      } else {
        r = c.r; g = c.g; b = c.b;
      }

      const px = p.x - cameraX;
      const py = p.y - cameraY;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(px, py);
      ctx.rotate(p.rotation);

      const color = `rgb(${r},${g},${b})`;
      ctx.fillStyle = color;

      switch (p.shape) {
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, size, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'star':
          drawStar(ctx, 0, 0, 5, size, size * 0.4);
          ctx.fill();
          break;

        case 'note':
          drawNote(ctx, 0, 0, size);
          break;

        case 'sparkle':
          drawSparkle(ctx, 0, 0, size);
          break;

        case 'diamond':
          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.lineTo(size * 0.6, 0);
          ctx.lineTo(0, size);
          ctx.lineTo(-size * 0.6, 0);
          ctx.closePath();
          ctx.fill();
          break;

        case 'square':
          ctx.fillRect(-size / 2, -size / 2, size, size);
          break;
      }

      ctx.restore();
    }
  }

  clear() {
    this.pool.push(...this.particles);
    this.particles.length = 0;
  }
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerR: number, innerR: number) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawNote(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  ctx.ellipse(x, y + size * 0.3, size * 0.5, size * 0.35, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = ctx.fillStyle;
  ctx.lineWidth = size * 0.15;
  ctx.beginPath();
  ctx.moveTo(x + size * 0.45, y + size * 0.2);
  ctx.lineTo(x + size * 0.45, y - size * 0.8);
  ctx.stroke();
  // Flag
  ctx.beginPath();
  ctx.moveTo(x + size * 0.45, y - size * 0.8);
  ctx.quadraticCurveTo(x + size, y - size * 0.5, x + size * 0.45, y - size * 0.3);
  ctx.fill();
}

function drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * size, y + Math.sin(angle) * size);
    ctx.lineTo(x + Math.cos(angle + 0.3) * size * 0.3, y + Math.sin(angle + 0.3) * size * 0.3);
    ctx.lineTo(x, y);
  }
  ctx.fill();
}

// Pre-built emitter presets
export const particlePresets = {
  greenMagic(x: number, y: number): ParticleEmitterConfig {
    return {
      x, y, count: 8, spread: 10,
      speed: 80, speedVariance: 40,
      life: 0.6, lifeVariance: 0.3,
      size: 6, sizeEnd: 0, sizeVariance: 3,
      color: { r: 50, g: 255, b: 100 },
      colorEnd: { r: 0, g: 150, b: 50 },
      shape: 'sparkle', gravity: -30,
      alpha: 0.9, alphaEnd: 0,
    };
  },

  pinkMagic(x: number, y: number): ParticleEmitterConfig {
    return {
      x, y, count: 8, spread: 10,
      speed: 80, speedVariance: 40,
      life: 0.6, lifeVariance: 0.3,
      size: 6, sizeEnd: 0, sizeVariance: 3,
      color: { r: 255, g: 150, b: 200 },
      colorEnd: { r: 255, g: 100, b: 180 },
      shape: 'sparkle', gravity: -30,
      alpha: 0.9, alphaEnd: 0,
    };
  },

  gemCollect(x: number, y: number, green: boolean): ParticleEmitterConfig {
    return {
      x, y, count: 12, spread: 5,
      speed: 120, speedVariance: 60,
      life: 0.5, lifeVariance: 0.2,
      size: 5, sizeEnd: 0, sizeVariance: 2,
      color: green ? { r: 80, g: 255, b: 130 } : { r: 255, g: 180, b: 220 },
      shape: 'star', gravity: 50,
      alpha: 1, alphaEnd: 0,
    };
  },

  trail(x: number, y: number, green: boolean): ParticleEmitterConfig {
    return {
      x, y, count: 2, spread: 5,
      speed: 20, speedVariance: 15,
      life: 0.4, lifeVariance: 0.2,
      size: 4, sizeEnd: 0, sizeVariance: 2,
      color: green ? { r: 50, g: 200, b: 100, a: 0.7 } : { r: 255, g: 180, b: 220, a: 0.7 },
      shape: 'circle', gravity: -20,
      alpha: 0.6, alphaEnd: 0,
    };
  },

  musicalNote(x: number, y: number): ParticleEmitterConfig {
    return {
      x, y, count: 1, spread: 30,
      speed: 30, speedVariance: 15,
      life: 2, lifeVariance: 0.5,
      size: 10, sizeEnd: 6, sizeVariance: 3,
      color: { r: 255, g: 215, b: 0 },
      shape: 'note', gravity: -15,
      alpha: 0.7, alphaEnd: 0,
      rotationSpeed: 0.5,
    };
  },

  explosion(x: number, y: number): ParticleEmitterConfig {
    return {
      x, y, count: 25, spread: 5,
      speed: 200, speedVariance: 100,
      life: 0.8, lifeVariance: 0.3,
      size: 8, sizeEnd: 0, sizeVariance: 4,
      color: { r: 255, g: 200, b: 50 },
      colorEnd: { r: 255, g: 80, b: 20 },
      shape: 'circle', gravity: 100,
      alpha: 1, alphaEnd: 0,
    };
  },

  confetti(x: number, y: number): ParticleEmitterConfig {
    const colors = [
      { r: 50, g: 255, b: 100 },
      { r: 255, g: 150, b: 200 },
      { r: 255, g: 215, b: 0 },
      { r: 100, g: 200, b: 255 },
    ];
    return {
      x, y, count: 5, spread: 20,
      speed: 150, speedVariance: 80,
      life: 2, lifeVariance: 0.5,
      size: 6, sizeEnd: 3, sizeVariance: 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      shape: 'square', gravity: 120,
      alpha: 1, alphaEnd: 0.3,
      angle: -Math.PI / 2,
      angleVariance: Math.PI * 0.8,
      rotationSpeed: 5,
    };
  },

  ambientSparkle(x: number, y: number, w: number, h: number): ParticleEmitterConfig {
    return {
      x: x + Math.random() * w, y: y + Math.random() * h,
      count: 1, spread: 0,
      speed: 5, speedVariance: 5,
      life: 1.5, lifeVariance: 0.5,
      size: 3, sizeEnd: 0, sizeVariance: 2,
      color: { r: 255, g: 255, b: 220 },
      shape: 'sparkle', gravity: -5,
      alpha: 0.6, alphaEnd: 0,
    };
  },
};
