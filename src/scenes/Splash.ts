// Splash screen — 'Havi's Wicked Adventure' with Emerald City backdrop
import { Scene, GameEngine } from '../engine/types';
import { drawSky, drawEmeraldCity, drawElphaba, drawGlinda, drawText, COLORS } from '../engine/renderer';
import { particlePresets } from '../engine/particles';

export class SplashScene implements Scene {
  private timer = 0;
  private sparkleTimer = 0;
  private tapReady = false;

  enter(game: GameEngine) {
    this.timer = 0;
    this.sparkleTimer = 0;
    this.tapReady = false;
  }

  exit(_game: GameEngine) {}

  update(game: GameEngine, dt: number) {
    this.timer += dt;
    this.sparkleTimer += dt;

    if (this.timer > 1) this.tapReady = true;

    // Ambient sparkles
    if (this.sparkleTimer > 0.15) {
      this.sparkleTimer = 0;
      game.spawnParticles(particlePresets.ambientSparkle(0, 0, game.width, game.height));
    }

    // Rising sparkle animation at bottom
    if (Math.random() < 0.3) {
      game.spawnParticles({
        x: Math.random() * game.width,
        y: game.height + 10,
        count: 1, spread: 20,
        speed: 60, speedVariance: 30,
        life: 2, lifeVariance: 1,
        size: 4, sizeEnd: 0, sizeVariance: 2,
        color: Math.random() > 0.5
          ? { r: 50, g: 255, b: 100 }
          : { r: 255, g: 150, b: 200 },
        shape: 'sparkle', gravity: -40,
        angle: -Math.PI / 2, angleVariance: 0.5,
        alpha: 0.8, alphaEnd: 0,
      });
    }

    // Tap to start
    if (this.tapReady && (game.input.tap || game.input.jumpPressed || game.input.actionPressed)) {
      game.playSound('menuSelect');
      game.transitionTo('characterSelect');
    }
  }

  render(game: GameEngine, ctx: CanvasRenderingContext2D) {
    const w = game.width;
    const h = game.height;
    const t = this.timer;
    const scale = game.getScale();

    // Sky with shifting colors
    drawSky(ctx, w, h, '#1a0033', '#003322', game.time);

    // Emerald City in the background
    const cityScale = scale * 1.5;
    drawEmeraldCity(ctx, w / 2, h * 0.62, cityScale, game.time);

    // Ground
    const groundGrad = ctx.createLinearGradient(0, h * 0.7, 0, h);
    groundGrad.addColorStop(0, '#0d3320');
    groundGrad.addColorStop(1, '#061a10');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, h * 0.7, w, h * 0.3);

    // Characters flanking the title
    const charY = h * 0.55;
    const charScale = scale * 1.8;
    const fadeIn = Math.min(1, t * 0.8);
    ctx.globalAlpha = fadeIn;

    // Elphaba on the left
    drawElphaba(ctx, w * 0.18, charY, charScale, game.time, { flying: false });

    // Glinda on the right
    drawGlinda(ctx, w * 0.82, charY, charScale, game.time, { wand: true });

    ctx.globalAlpha = 1;

    // Title
    const titleFade = Math.min(1, Math.max(0, t - 0.3) * 1.5);
    ctx.globalAlpha = titleFade;

    // Title glow
    const glowSize = 80 * scale + Math.sin(game.time * 2) * 10 * scale;
    const titleGlow = ctx.createRadialGradient(w / 2, h * 0.25, 0, w / 2, h * 0.25, glowSize);
    titleGlow.addColorStop(0, 'rgba(0, 255, 100, 0.2)');
    titleGlow.addColorStop(1, 'rgba(0, 255, 100, 0)');
    ctx.fillStyle = titleGlow;
    ctx.fillRect(0, 0, w, h * 0.5);

    // "HAVI'S" subtitle
    drawText(ctx, "HAVI'S", w / 2, h * 0.15, 22 * scale, COLORS.gold);

    // "WICKED" main title
    const wickedSize = 48 * scale;
    drawText(ctx, 'WICKED', w / 2, h * 0.25, wickedSize, COLORS.emeraldGlow);

    // "ADVENTURE" subtitle
    drawText(ctx, 'ADVENTURE', w / 2, h * 0.33, 24 * scale, COLORS.pinkGlow);

    ctx.globalAlpha = 1;

    // Tap to start (pulsing)
    if (this.tapReady) {
      const pulse = Math.sin(game.time * 3) * 0.3 + 0.7;
      ctx.globalAlpha = pulse;
      drawText(ctx, 'Tap to Start', w / 2, h * 0.82, 18 * scale, '#fff');
      ctx.globalAlpha = 1;
    }

    // Bottom quote
    const quoteAlpha = Math.min(1, Math.max(0, t - 1.5));
    ctx.globalAlpha = quoteAlpha * 0.6;
    drawText(ctx, '"Everyone deserves the chance to fly"', w / 2, h * 0.93, 11 * scale, COLORS.pinkLight);
    ctx.globalAlpha = 1;
  }
}
