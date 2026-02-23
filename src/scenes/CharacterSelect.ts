// Character select — choose Elphaba or Glinda
import { Scene, GameEngine, Character } from '../engine/types';
import { drawSky, drawElphaba, drawGlinda, drawText, COLORS } from '../engine/renderer';
import { particlePresets } from '../engine/particles';

export class CharacterSelectScene implements Scene {
  private timer = 0;
  private selected: Character | null = null;
  private spinTimer = 0;
  private sparkleTimer = 0;

  enter(game: GameEngine) {
    this.timer = 0;
    this.selected = null;
    this.spinTimer = 0;
    this.sparkleTimer = 0;
  }

  exit(_game: GameEngine) {}

  update(game: GameEngine, dt: number) {
    this.timer += dt;
    this.sparkleTimer += dt;

    if (this.sparkleTimer > 0.2) {
      this.sparkleTimer = 0;
      game.spawnParticles(particlePresets.ambientSparkle(0, 0, game.width, game.height));
    }

    if (this.selected) {
      this.spinTimer += dt;
      if (this.spinTimer > 1.2) {
        game.state.character = this.selected;
        game.state.currentAct = 'act1';
        game.state.storyCardIndex = 0;
        game.saveGame();
        game.transitionTo('storyCard');
      }
      return;
    }

    // Check for character selection via tap
    if (game.input.tap) {
      const w = game.width;
      const tapX = game.input.tapX;

      if (tapX < w / 2) {
        this.selected = 'elphaba';
        game.playSound('elphabaMagic');
        game.spawnParticles(particlePresets.greenMagic(w * 0.28, game.height * 0.45));
      } else {
        this.selected = 'glinda';
        game.playSound('glindaMagic');
        game.spawnParticles(particlePresets.pinkMagic(w * 0.72, game.height * 0.45));
      }
    }

    // Keyboard selection
    if (game.input.left || (game.input.actionPressed && !game.input.right)) {
      if (!this.selected) {
        this.selected = 'elphaba';
        game.playSound('elphabaMagic');
        game.spawnParticles(particlePresets.greenMagic(game.width * 0.28, game.height * 0.45));
      }
    }
    if (game.input.right) {
      if (!this.selected) {
        this.selected = 'glinda';
        game.playSound('glindaMagic');
        game.spawnParticles(particlePresets.pinkMagic(game.width * 0.72, game.height * 0.45));
      }
    }
  }

  render(game: GameEngine, ctx: CanvasRenderingContext2D) {
    const w = game.width;
    const h = game.height;
    const scale = game.getScale();
    const t = this.timer;

    // Background
    drawSky(ctx, w, h, '#1a0030', '#002215', game.time);

    // Spotlight effects
    const spotGrad1 = ctx.createRadialGradient(w * 0.28, h * 0.45, 0, w * 0.28, h * 0.45, 120 * scale);
    spotGrad1.addColorStop(0, 'rgba(0, 180, 80, 0.15)');
    spotGrad1.addColorStop(1, 'rgba(0, 180, 80, 0)');
    ctx.fillStyle = spotGrad1;
    ctx.fillRect(0, 0, w / 2, h);

    const spotGrad2 = ctx.createRadialGradient(w * 0.72, h * 0.45, 0, w * 0.72, h * 0.45, 120 * scale);
    spotGrad2.addColorStop(0, 'rgba(255, 105, 180, 0.15)');
    spotGrad2.addColorStop(1, 'rgba(255, 105, 180, 0)');
    ctx.fillStyle = spotGrad2;
    ctx.fillRect(w / 2, 0, w / 2, h);

    // Divider
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.2);
    ctx.lineTo(w / 2, h * 0.75);
    ctx.stroke();
    ctx.setLineDash([]);

    // Title
    drawText(ctx, 'Choose Your Witch', w / 2, h * 0.1, 24 * scale, COLORS.gold);

    // Characters
    const charScale = scale * 2.5;
    const charY = h * 0.48;

    // Selection highlight
    if (this.selected === 'elphaba') {
      ctx.fillStyle = 'rgba(0, 255, 100, 0.1)';
      ctx.fillRect(0, 0, w / 2, h);
    } else if (this.selected === 'glinda') {
      ctx.fillStyle = 'rgba(255, 105, 180, 0.1)';
      ctx.fillRect(w / 2, 0, w / 2, h);
    }

    // Spin animation for selected character
    const spinPhase = this.selected ? Math.min(1, this.spinTimer / 0.6) : 0;
    const scaleMultiplier = this.selected ? 1 + Math.sin(spinPhase * Math.PI) * 0.3 : 1;

    // Elphaba
    const eScale = this.selected === 'elphaba' ? charScale * scaleMultiplier : charScale;
    const hasSparkly = game.state.unlockedCostumes.includes('elphaba_sparkly');
    drawElphaba(ctx, w * 0.28, charY, eScale, game.time, { sparkly: hasSparkly });

    // Glinda
    const gScale = this.selected === 'glinda' ? charScale * scaleMultiplier : charScale;
    const hasWings = game.state.unlockedCostumes.includes('glinda_wings');
    drawGlinda(ctx, w * 0.72, charY, gScale, game.time, { goldenWings: hasWings });

    // Names
    drawText(ctx, 'Elphaba', w * 0.28, h * 0.7, 18 * scale, COLORS.emeraldGlow);
    drawText(ctx, 'Glinda', w * 0.72, h * 0.7, 18 * scale, COLORS.pinkGlow);

    // Description
    ctx.globalAlpha = 0.7;
    drawText(ctx, 'Green Witch', w * 0.28, h * 0.74, 12 * scale, '#aaa');
    drawText(ctx, 'Broomstick Rider', w * 0.28, h * 0.78, 11 * scale, '#888');
    drawText(ctx, 'Good Witch', w * 0.72, h * 0.74, 12 * scale, '#aaa');
    drawText(ctx, 'Bubble Magic', w * 0.72, h * 0.78, 11 * scale, '#888');
    ctx.globalAlpha = 1;

    // Tap instruction
    if (!this.selected) {
      const pulse = Math.sin(game.time * 3) * 0.3 + 0.7;
      ctx.globalAlpha = pulse;
      drawText(ctx, 'Tap a character to choose', w / 2, h * 0.88, 14 * scale, '#ddd');
      ctx.globalAlpha = 1;
    } else {
      drawText(ctx, `${this.selected === 'elphaba' ? 'Elphaba' : 'Glinda'} selected!`, w / 2, h * 0.88, 16 * scale, COLORS.gold);
    }

    // Wicked quote
    ctx.globalAlpha = 0.5;
    drawText(ctx, '"Something has changed within me"', w / 2, h * 0.95, 10 * scale, '#ccc');
    ctx.globalAlpha = 1;
  }
}
