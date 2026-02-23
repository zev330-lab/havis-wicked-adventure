// Act 7 — 'The Wizard and I' — Magic Bubble Float
// Hold to float up, release to drift down. Steer left/right. Collect gems, dodge clouds.
import { Scene, GameEngine } from '../engine/types';
import { drawText, drawGem, drawHealth, COLORS, drawElphaba, drawGlinda } from '../engine/renderer';
import { particlePresets } from '../engine/particles';
import { startBgMusic, stopBgMusic } from '../engine/audio';

interface FloatGem {
  x: number;
  y: number;
  collected: boolean;
}

interface Cloud {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  twinkle: number;
}

export class Act7Scene implements Scene {
  private playerX = 0;
  private playerY = 0;
  private playerVY = 0;
  private gems: FloatGem[] = [];
  private clouds: Cloud[] = [];
  private bgStars: Star[] = [];
  private invincibleTimer = 0;
  private trailTimer = 0;
  private spawnTimer = 0;
  private gemSpawnTimer = 0;
  private bubbleScale = 1;
  private bubblePulse = 0;

  enter(game: GameEngine) {
    const w = game.width;
    const h = game.height;
    this.playerX = w / 2;
    this.playerY = h * 0.6;
    this.playerVY = 0;
    this.gems = [];
    this.clouds = [];
    this.invincibleTimer = 0;
    this.trailTimer = 0;
    this.spawnTimer = 0;
    this.gemSpawnTimer = 0;
    this.bubbleScale = 1;
    this.bubblePulse = 0;

    // Background stars
    this.bgStars = [];
    for (let i = 0; i < 40; i++) {
      this.bgStars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: 1 + Math.random() * 2,
        twinkle: Math.random() * Math.PI * 2,
      });
    }

    game.state.gems = 0;
    game.state.score = 0;
    game.state.health = 5;
    game.state.maxHealth = 5;
    game.state.noHitBonus = true;
    game.state.levelTime = 0;
    game.state.actComplete = false;

    // Pre-spawn some gems and clouds
    for (let i = 0; i < 4; i++) {
      this.spawnGemGroup(game, h * 0.2 - i * h * 0.25);
    }
    for (let i = 0; i < 3; i++) {
      this.spawnCloud(game, Math.random() * h * 0.6);
    }

    startBgMusic('wizard');
  }

  exit(_game: GameEngine) {
    stopBgMusic();
  }

  private spawnGemGroup(game: GameEngine, baseY: number) {
    const w = game.width;
    const pattern = Math.floor(Math.random() * 4);
    const margin = 40;

    if (pattern === 0) {
      // Horizontal line of 3-4 gems
      const count = 3 + Math.floor(Math.random() * 2);
      const startX = margin + Math.random() * (w - margin * 2 - count * 50);
      for (let i = 0; i < count; i++) {
        this.gems.push({ x: startX + i * 50, y: baseY, collected: false });
      }
    } else if (pattern === 1) {
      // Arc of gems
      const cx = margin + Math.random() * (w - margin * 2);
      for (let i = 0; i < 5; i++) {
        const angle = (i / 4) * Math.PI;
        this.gems.push({
          x: cx + Math.cos(angle) * 60 - 30,
          y: baseY + Math.sin(angle) * 30 - 15,
          collected: false,
        });
      }
    } else if (pattern === 2) {
      // Diagonal line
      const startX = margin + Math.random() * (w - margin * 2 - 120);
      const dir = Math.random() < 0.5 ? 1 : -1;
      for (let i = 0; i < 4; i++) {
        this.gems.push({
          x: startX + i * 30 * dir,
          y: baseY - i * 25,
          collected: false,
        });
      }
    } else {
      // Single gems spread out
      for (let i = 0; i < 3; i++) {
        this.gems.push({
          x: margin + Math.random() * (w - margin * 2),
          y: baseY - Math.random() * 40,
          collected: false,
        });
      }
    }
  }

  private spawnCloud(game: GameEngine, y: number) {
    const w = game.width;
    const cloudW = 50 + Math.random() * 40;
    this.clouds.push({
      x: Math.random() * (w - cloudW),
      y,
      w: cloudW,
      h: 25 + Math.random() * 15,
      speed: 15 + Math.random() * 25,
    });
  }

  update(game: GameEngine, dt: number) {
    if (game.state.actComplete) return;

    game.state.levelTime += dt;
    this.trailTimer += dt;
    this.spawnTimer += dt;
    this.gemSpawnTimer += dt;
    this.bubblePulse += dt * 3;
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;

    const w = game.width;
    const h = game.height;
    const isElphaba = game.state.character === 'elphaba';

    // Scrolling speed — everything drifts downward (player floats "up")
    const scrollSpeed = 40 + game.state.levelTime * 0.5;

    // Player vertical movement — hold to rise, release to sink
    if (game.input.isTouching) {
      // Float upward when touching
      this.playerVY -= 350 * dt;
      this.bubbleScale = 1 + Math.sin(this.bubblePulse) * 0.05;
    } else {
      // Sink gently when not touching
      this.playerVY += 120 * dt;
      this.bubbleScale = 1;
    }

    // Cap vertical speed
    this.playerVY = Math.max(-200, Math.min(120, this.playerVY));

    // Apply vertical movement
    this.playerY += this.playerVY * dt;

    // Horizontal — follow finger
    if (game.input.isTouching) {
      const tx = game.input.touchX;
      this.playerX += (tx - this.playerX) * 4 * dt;
    }

    // Keep player on screen with soft bounce
    const topMargin = 35;
    const botMargin = 50;
    if (this.playerY < topMargin) {
      this.playerY = topMargin;
      this.playerVY = Math.abs(this.playerVY) * 0.2;
    }
    if (this.playerY > h - botMargin) {
      this.playerY = h - botMargin;
      this.playerVY = -Math.abs(this.playerVY) * 0.3;
    }
    this.playerX = Math.max(20, Math.min(w - 20, this.playerX));

    // Scroll gems and clouds down
    for (const gem of this.gems) {
      gem.y += scrollSpeed * dt;
    }
    for (const cloud of this.clouds) {
      cloud.y += scrollSpeed * dt;
      // Clouds also drift horizontally
      cloud.x += cloud.speed * dt * (cloud.speed > 30 ? 1 : -1);
      if (cloud.x < -cloud.w) cloud.x = w;
      if (cloud.x > w) cloud.x = -cloud.w;
    }

    // Spawn new gems from above
    if (this.gemSpawnTimer >= 2.0) {
      this.gemSpawnTimer = 0;
      this.spawnGemGroup(game, -30);
    }

    // Spawn new clouds from above
    if (this.spawnTimer >= 3.5 - Math.min(2, game.state.levelTime * 0.02)) {
      this.spawnTimer = 0;
      this.spawnCloud(game, -40);
    }

    // Gem collection — generous radius
    for (const gem of this.gems) {
      if (gem.collected) continue;
      const dx = gem.x - this.playerX;
      const dy = gem.y - this.playerY;
      if (dx * dx + dy * dy < 30 * 30) {
        gem.collected = true;
        game.state.gems++;
        game.state.score += 150;
        game.playSound('gemCollect');
        game.spawnParticles(particlePresets.gemCollect(gem.x, gem.y, isElphaba));
      }
    }

    // Cloud collision — forgiving hitbox
    if (this.invincibleTimer <= 0) {
      for (const cloud of this.clouds) {
        const cx = cloud.x + cloud.w / 2;
        const cy = cloud.y + cloud.h / 2;
        const dx = this.playerX - cx;
        const dy = this.playerY - cy;
        // Elliptical collision — wider than tall
        const hw = cloud.w * 0.35;
        const hh = cloud.h * 0.35;
        if ((dx * dx) / (hw * hw) + (dy * dy) / (hh * hh) < 1) {
          game.state.health--;
          game.state.noHitBonus = false;
          this.invincibleTimer = 2.5;
          this.playerVY = -80; // Knock player up a bit
          game.playSound('hit');
          game.shakeCamera(4, 0.2);
          game.spawnParticles(particlePresets.explosion(this.playerX, this.playerY));
          if (game.state.health <= 0) {
            this.enter(game);
            return;
          }
          break;
        }
      }
    }

    // Clean up off-screen entities
    this.gems = this.gems.filter(g => !g.collected && g.y < h + 50);
    this.clouds = this.clouds.filter(c => c.y < h + 60);

    // Bubble trail
    if (this.trailTimer > 0.12) {
      this.trailTimer = 0;
      game.spawnParticles(particlePresets.trail(this.playerX, this.playerY + 15, isElphaba));
    }

    // Musical notes occasionally
    if (Math.random() < 0.01) {
      game.spawnParticles(particlePresets.musicalNote(Math.random() * w, h));
    }

    // Win conditions
    if (game.state.levelTime >= 60 || game.state.gems >= 20) {
      game.state.actComplete = true;
      this.completeAct(game);
    }
  }

  private completeAct(game: GameEngine) {
    let stars = 1;
    if (game.state.gems >= 25) stars++;
    if (game.state.noHitBonus) stars++;
    game.state.stars.act7 = Math.max(game.state.stars.act7 || 0, stars);

    const totalStars = Object.values(game.state.stars).reduce((a, b) => a + b, 0);
    if (totalStars >= 5 && !game.state.unlockedCostumes.includes(game.state.character === 'elphaba' ? 'elphaba_sparkly' : 'glinda_wings')) {
      game.state.unlockedCostumes.push(game.state.character === 'elphaba' ? 'elphaba_sparkly' : 'glinda_wings');
    }

    if (!game.state.lastCompletedAct || game.state.lastCompletedAct < 'act7') {
      game.state.lastCompletedAct = 'act7';
    }
    game.saveGame();
    game.playSound('actComplete');

    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        game.spawnParticles(particlePresets.confetti(Math.random() * game.width, game.height * 0.3));
      }, i * 200);
    }

    game.state.currentAct = 'act8';
    game.state.storyCardIndex = 0;
    setTimeout(() => {
      game.transitionTo('storyCard');
    }, 2500);
  }

  render(game: GameEngine, ctx: CanvasRenderingContext2D) {
    const w = game.width;
    const h = game.height;
    const scale = game.getScale();
    const isElphaba = game.state.character === 'elphaba';
    const t = game.time;

    // Background — magical night sky gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#000820');
    bgGrad.addColorStop(0.4, '#0a1040');
    bgGrad.addColorStop(0.7, '#1a0845');
    bgGrad.addColorStop(1, '#0d2a20');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Background stars
    for (const star of this.bgStars) {
      const twinkle = Math.sin(t * 1.5 + star.twinkle) * 0.4 + 0.6;
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = twinkle * 0.7;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Emerald City silhouette at the top — destination!
    ctx.globalAlpha = 0.15 + Math.sin(t) * 0.05;
    this.drawCitySilhouette(ctx, w / 2, 25, scale);
    ctx.globalAlpha = 1;

    // Dark clouds (obstacles)
    for (const cloud of this.clouds) {
      this.drawCloud(ctx, cloud, t);
    }

    // Gems
    for (const gem of this.gems) {
      if (gem.collected) continue;
      if (gem.y < -20 || gem.y > h + 20) continue;
      drawGem(ctx, gem.x, gem.y, 10, isElphaba, t);
    }

    // Player in magic bubble
    const blink = this.invincibleTimer > 0 && Math.floor(t * 8) % 2 === 0;
    if (!blink) {
      // Bubble
      const bubbleR = 22 * this.bubbleScale;
      const bubbleGlow = isElphaba
        ? `rgba(0, 200, 100, ${0.12 + Math.sin(this.bubblePulse) * 0.04})`
        : `rgba(200, 100, 255, ${0.12 + Math.sin(this.bubblePulse) * 0.04})`;

      // Outer glow
      ctx.fillStyle = bubbleGlow;
      ctx.beginPath();
      ctx.arc(this.playerX, this.playerY, bubbleR + 8, 0, Math.PI * 2);
      ctx.fill();

      // Bubble sphere
      ctx.strokeStyle = isElphaba
        ? `rgba(0, 255, 130, ${0.5 + Math.sin(this.bubblePulse) * 0.15})`
        : `rgba(255, 150, 255, ${0.5 + Math.sin(this.bubblePulse) * 0.15})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.playerX, this.playerY, bubbleR, 0, Math.PI * 2);
      ctx.stroke();

      // Bubble shine highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(this.playerX - bubbleR * 0.3, this.playerY - bubbleR * 0.3, bubbleR * 0.25, 0, Math.PI * 2);
      ctx.fill();

      // Character inside
      if (isElphaba) {
        drawElphaba(ctx, this.playerX, this.playerY, scale * 1.0, t, {});
      } else {
        drawGlinda(ctx, this.playerX, this.playerY, scale * 1.0, t, { wand: true });
      }
    }

    // HUD
    drawHealth(ctx, 10, 10, game.state.health, game.state.maxHealth, isElphaba);
    drawText(ctx, `Gems: ${game.state.gems}`, w / 2, 20, 13 * scale, COLORS.gold);
    const timeLeft = Math.max(0, 60 - Math.floor(game.state.levelTime));
    drawText(ctx, `${timeLeft}s`, w - 30 * scale, 20, 11 * scale, '#aaa');
    drawText(ctx, `Score: ${game.state.score}`, w / 2, h - 15, 10 * scale, '#aaa');

    // Controls hint
    if (game.state.levelTime < 6 && !game.state.actComplete) {
      const alpha = Math.max(0, 1 - game.state.levelTime / 6);
      ctx.globalAlpha = alpha;
      drawText(ctx, 'Hold to float up!', w / 2, h * 0.3, 18 * scale, '#fff');
      drawText(ctx, 'Release to drift down', w / 2, h * 0.36, 13 * scale, '#ccc');
      drawText(ctx, 'Dodge the dark clouds!', w / 2, h * 0.42, 13 * scale, '#ccc');
      ctx.globalAlpha = 1;
    }

    // Act complete overlay
    if (game.state.actComplete) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, w, h);
      drawText(ctx, 'Act VII Complete!', w / 2, h * 0.35, 28 * scale, COLORS.gold);
      drawText(ctx, `Gems: ${game.state.gems}`, w / 2, h * 0.45, 18 * scale, COLORS.emeraldGlow);
      drawText(ctx, `Score: ${game.state.score}`, w / 2, h * 0.52, 18 * scale, '#fff');

      const stars = game.state.stars.act7;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < stars ? COLORS.gold : 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        for (let si = 0; si < 10; si++) {
          const r = si % 2 === 0 ? 15 * scale : 7 * scale;
          const angle = (si * Math.PI) / 5 - Math.PI / 2;
          const sx = w / 2 - 40 * scale + i * 40 * scale + Math.cos(angle) * r;
          const sy = h * 0.62 + Math.sin(angle) * r;
          if (si === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  private drawCloud(ctx: CanvasRenderingContext2D, cloud: Cloud, t: number) {
    const cx = cloud.x + cloud.w / 2;
    const cy = cloud.y + cloud.h / 2;
    const wobble = Math.sin(t * 1.5 + cloud.x) * 3;

    // Dark ominous cloud — multiple overlapping ellipses
    ctx.fillStyle = 'rgba(30, 20, 40, 0.85)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + wobble, cloud.w * 0.5, cloud.h * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(40, 25, 50, 0.75)';
    ctx.beginPath();
    ctx.ellipse(cx - cloud.w * 0.2, cy - cloud.h * 0.15 + wobble, cloud.w * 0.35, cloud.h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + cloud.w * 0.2, cy - cloud.h * 0.1 + wobble, cloud.w * 0.3, cloud.h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow — slightly purple
    ctx.fillStyle = 'rgba(80, 40, 100, 0.2)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + wobble, cloud.w * 0.3, cloud.h * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Warning sparkles at edges
    ctx.fillStyle = `rgba(150, 80, 200, ${0.3 + Math.sin(t * 4 + cloud.x) * 0.15})`;
    ctx.beginPath();
    ctx.arc(cx - cloud.w * 0.4, cy + wobble, 2, 0, Math.PI * 2);
    ctx.arc(cx + cloud.w * 0.4, cy + wobble, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawCitySilhouette(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
    ctx.fillStyle = '#00cc66';
    // Simple tower shapes
    const towers = [
      { dx: -40, w: 12, h: 35 },
      { dx: -20, w: 16, h: 50 },
      { dx: 0, w: 14, h: 60 },
      { dx: 18, w: 16, h: 45 },
      { dx: 35, w: 12, h: 30 },
    ];
    for (const tower of towers) {
      const tx = x + tower.dx * scale;
      const tw = tower.w * scale;
      const th = tower.h * scale;
      ctx.fillRect(tx - tw / 2, y - th, tw, th);
      // Pointed top
      ctx.beginPath();
      ctx.moveTo(tx - tw / 2 - 2, y - th);
      ctx.lineTo(tx, y - th - 10 * scale);
      ctx.lineTo(tx + tw / 2 + 2, y - th);
      ctx.fill();
    }
    // Base
    ctx.fillRect(x - 55 * scale, y - 8 * scale, 110 * scale, 10 * scale);
  }
}
