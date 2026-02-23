// Victory screen — final celebration for completing the game
import { Scene, GameEngine } from '../engine/types';
import { drawSky, drawElphaba, drawGlinda, drawEmeraldCity, drawText, COLORS } from '../engine/renderer';
import { particlePresets } from '../engine/particles';
import { startBgMusic, stopBgMusic } from '../engine/audio';

export class VictoryScene implements Scene {
  private timer = 0;
  private sparkleTimer = 0;
  private confettiTimer = 0;

  enter(game: GameEngine) {
    this.timer = 0;
    this.sparkleTimer = 0;
    this.confettiTimer = 0;
    startBgMusic('victory');
  }

  exit(_game: GameEngine) {
    stopBgMusic();
  }

  update(game: GameEngine, dt: number) {
    this.timer += dt;
    this.sparkleTimer += dt;
    this.confettiTimer += dt;

    const w = game.width;
    const h = game.height;

    // Sparkles everywhere
    if (this.sparkleTimer > 0.08) {
      this.sparkleTimer = 0;
      game.spawnParticles(particlePresets.ambientSparkle(0, 0, w, h));
    }

    // Confetti burst periodically
    if (this.confettiTimer > 0.5) {
      this.confettiTimer = 0;
      game.spawnParticles(particlePresets.confetti(Math.random() * w, h * 0.2));
    }

    // Musical notes
    if (Math.random() < 0.05) {
      game.spawnParticles(particlePresets.musicalNote(Math.random() * w, h));
    }

    // Tap to go back to level select
    if (this.timer > 5 && (game.input.tap || game.input.jumpPressed || game.input.actionPressed)) {
      game.playSound('menuSelect');
      game.transitionTo('levelSelect');
    }
  }

  render(game: GameEngine, ctx: CanvasRenderingContext2D) {
    const w = game.width;
    const h = game.height;
    const scale = game.getScale();
    const t = this.timer;

    // Beautiful gradient sky — sunset pinks to emerald greens
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#1a0033');
    skyGrad.addColorStop(0.3, '#330044');
    skyGrad.addColorStop(0.5, '#003322');
    skyGrad.addColorStop(1, '#001a0d');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Stars
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 50; i++) {
      const sx = (i * 137.5) % w;
      const sy = (i * 73.1) % (h * 0.5);
      const twinkle = Math.sin(game.time * 2 + i * 1.3) * 0.5 + 0.5;
      ctx.globalAlpha = twinkle * 0.8;
      ctx.beginPath();
      ctx.arc(sx, sy, 1 + (i % 2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Emerald City glowing
    drawEmeraldCity(ctx, w / 2, h * 0.65, scale * 1.8, game.time);

    // Ground
    const groundGrad = ctx.createLinearGradient(0, h * 0.7, 0, h);
    groundGrad.addColorStop(0, '#0d3320');
    groundGrad.addColorStop(1, '#061a10');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, h * 0.72, w, h * 0.28);

    // Characters together in the center
    const charY = h * 0.58;
    const charScale = scale * 2;
    const fadeIn = Math.min(1, t * 0.5);
    ctx.globalAlpha = fadeIn;

    drawElphaba(ctx, w * 0.38, charY, charScale, game.time, {
      sparkly: game.state.unlockedCostumes.includes('elphaba_sparkly'),
    });
    drawGlinda(ctx, w * 0.62, charY, charScale, game.time, {
      goldenWings: game.state.unlockedCostumes.includes('glinda_wings'),
      wand: true,
    });
    ctx.globalAlpha = 1;

    // Decorative frame
    ctx.globalAlpha = Math.min(0.6, t * 0.3);
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2;
    const m = 15 * scale;
    ctx.strokeRect(m, m, w - m * 2, h - m * 2);
    // Corner stars
    for (const [cx, cy] of [[m, m], [w - m, m], [m, h - m], [w - m, h - m]]) {
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 6 * scale : 3 * scale;
        const angle = (i * Math.PI) / 5 - Math.PI / 2 + game.time;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Main message — appears in stages
    if (t > 0.5) {
      const alpha = Math.min(1, (t - 0.5) * 0.8);
      ctx.globalAlpha = alpha;
      drawText(ctx, 'Because I Knew You', w / 2, h * 0.1, 22 * scale, COLORS.gold);
    }

    if (t > 1.5) {
      const alpha = Math.min(1, (t - 1.5) * 0.8);
      ctx.globalAlpha = alpha;
      drawText(ctx, 'Havi...', w / 2, h * 0.18, 28 * scale, '#fff');
    }

    if (t > 3) {
      const alpha = Math.min(1, (t - 3) * 0.6);
      ctx.globalAlpha = alpha;
      drawText(ctx, 'You Have Been Changed', w / 2, h * 0.26, 18 * scale, COLORS.emeraldGlow);
      drawText(ctx, 'For Good', w / 2, h * 0.32, 24 * scale, COLORS.pinkGlow);
    }

    if (t > 4) {
      const alpha = Math.min(1, (t - 4) * 0.5);
      ctx.globalAlpha = alpha;

      // Hearts
      drawText(ctx, '💚🩷', w / 2, h * 0.39, 24 * scale, '#fff');

      // Total score
      const totalStars = Object.values(game.state.stars).reduce((a, b) => a + b, 0);
      drawText(ctx, `Total Score: ${game.state.score}`, w / 2, h * 0.78, 16 * scale, COLORS.gold);
      drawText(ctx, `Stars Earned: ${totalStars} / 9`, w / 2, h * 0.83, 14 * scale, '#ddd');

      // Stars display
      for (let i = 0; i < totalStars; i++) {
        const sx = w / 2 - (totalStars * 14) / 2 + i * 14 + 7;
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath();
        for (let si = 0; si < 10; si++) {
          const r = si % 2 === 0 ? 6 * scale : 3 * scale;
          const angle = (si * Math.PI) / 5 - Math.PI / 2;
          const px = sx + Math.cos(angle) * r;
          const py = h * 0.87 + Math.sin(angle) * r;
          if (si === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;

    // Continue prompt
    if (t > 5) {
      const pulse = Math.sin(game.time * 3) * 0.3 + 0.7;
      ctx.globalAlpha = pulse;
      drawText(ctx, 'Tap to continue', w / 2, h * 0.94, 12 * scale, '#aaa');
      ctx.globalAlpha = 1;
    }
  }
}
