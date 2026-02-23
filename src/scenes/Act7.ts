// Act 7 — 'The Wizard and I' — Gravity Flip
// Tap anywhere to flip gravity, collect gems, avoid stalactites/stalagmites
import { Scene, GameEngine } from '../engine/types';
import { drawText, drawGem, drawHealth, COLORS, drawElphaba, drawGlinda } from '../engine/renderer';
import { particlePresets } from '../engine/particles';
import { startBgMusic, stopBgMusic } from '../engine/audio';

interface ShaftGem {
  worldY: number;
  x: number;
  collected: boolean;
}

interface Obstacle {
  worldY: number;
  x: number;
  w: number;
  h: number;
  fromTop: boolean;
  active: boolean;
}

export class Act7Scene implements Scene {
  private playerX = 0;
  private playerY = 0;
  private gravityDir: 1 | -1 = 1;
  private playerVY = 0;
  private scrollY = 0;
  private scrollSpeed = 60;
  private gems: ShaftGem[] = [];
  private obstacles: Obstacle[] = [];
  private invincibleTimer = 0;
  private trailTimer = 0;
  private spawnTimer = 0;
  private spawnInterval = 1.8;
  private shaftLeft = 0;
  private shaftRight = 0;
  private shaftWidth = 0;

  enter(game: GameEngine) {
    this.shaftWidth = game.width * 0.75;
    this.shaftLeft = (game.width - this.shaftWidth) / 2;
    this.shaftRight = this.shaftLeft + this.shaftWidth;
    this.playerX = game.width / 2;
    this.playerY = game.height / 2;
    this.gravityDir = 1;
    this.playerVY = 0;
    this.scrollY = 0;
    this.scrollSpeed = 60;
    this.gems = [];
    this.obstacles = [];
    this.invincibleTimer = 0;
    this.trailTimer = 0;
    this.spawnTimer = 0;
    this.spawnInterval = 1.8;

    game.state.gems = 0;
    game.state.score = 0;
    game.state.health = 3;
    game.state.maxHealth = 3;
    game.state.noHitBonus = true;
    game.state.levelTime = 0;
    game.state.actComplete = false;

    // Pre-spawn some obstacles and gems
    for (let i = 0; i < 6; i++) {
      this.spawnRow(game, this.scrollY + game.height + i * 200);
    }

    startBgMusic('wizard');
  }

  exit(_game: GameEngine) {
    stopBgMusic();
  }

  private spawnRow(game: GameEngine, worldY: number) {
    const w = game.width;
    const margin = this.shaftLeft + 20;
    const innerW = this.shaftWidth - 40;

    // Obstacle from top or bottom (or both)
    const side = Math.random();
    if (side < 0.4) {
      // Stalactite from top
      this.obstacles.push({
        worldY,
        x: margin + Math.random() * (innerW * 0.4),
        w: 25 + Math.random() * 20,
        h: 40 + Math.random() * 30,
        fromTop: true,
        active: true,
      });
    } else if (side < 0.8) {
      // Stalagmite from bottom
      this.obstacles.push({
        worldY,
        x: margin + innerW * 0.5 + Math.random() * (innerW * 0.4),
        w: 25 + Math.random() * 20,
        h: 40 + Math.random() * 30,
        fromTop: false,
        active: true,
      });
    } else {
      // Both sides — narrow passage
      this.obstacles.push({
        worldY,
        x: margin + Math.random() * 20,
        w: 30,
        h: 50,
        fromTop: true,
        active: true,
      });
      this.obstacles.push({
        worldY: worldY + 10,
        x: margin + innerW - 30 - Math.random() * 20,
        w: 30,
        h: 50,
        fromTop: false,
        active: true,
      });
    }

    // Gem in center area
    if (Math.random() < 0.7) {
      this.gems.push({
        worldY: worldY + 30 + Math.random() * 80,
        x: this.shaftLeft + this.shaftWidth * 0.3 + Math.random() * this.shaftWidth * 0.4,
        collected: false,
      });
    }
  }

  update(game: GameEngine, dt: number) {
    if (game.state.actComplete) return;

    game.state.levelTime += dt;
    this.trailTimer += dt;
    this.spawnTimer += dt;
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;

    const isElphaba = game.state.character === 'elphaba';

    // Scroll speed increases
    this.scrollSpeed = Math.min(160, 60 + game.state.levelTime * 1.5);
    this.scrollY += this.scrollSpeed * dt;

    // Tap to flip gravity
    if (game.input.tap || game.input.actionPressed) {
      this.gravityDir = this.gravityDir === 1 ? -1 : 1;
      this.playerVY = 0;
      game.playSound('gravityFlip');
      game.spawnParticles(particlePresets.trail(this.playerX, this.playerY, isElphaba));
    }

    // Gravity physics
    this.playerVY += this.gravityDir * 800 * dt;
    this.playerVY = Math.max(-350, Math.min(350, this.playerVY));
    this.playerY += this.playerVY * dt;

    // Wall bounds (top and bottom of screen)
    const margin = 25;
    if (this.playerY < margin) {
      this.playerY = margin;
      this.playerVY = Math.abs(this.playerVY) * 0.3;
      if (this.invincibleTimer <= 0) {
        this.takeDamage(game);
      }
    }
    if (this.playerY > game.height - margin) {
      this.playerY = game.height - margin;
      this.playerVY = -Math.abs(this.playerVY) * 0.3;
      if (this.invincibleTimer <= 0) {
        this.takeDamage(game);
      }
    }

    // Horizontal drift — slight touch following
    if (game.input.isTouching) {
      const tx = Math.max(this.shaftLeft + 15, Math.min(this.shaftRight - 15, game.input.touchX));
      this.playerX += (tx - this.playerX) * 3 * dt;
    }

    // Spawn new obstacles
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;
      this.spawnInterval = Math.max(1.0, 1.8 - game.state.levelTime * 0.012);
      this.spawnRow(game, this.scrollY + game.height + 100);
    }

    // Gem collection
    for (const gem of this.gems) {
      if (gem.collected) continue;
      const screenY = gem.worldY - this.scrollY;
      const dx = gem.x - this.playerX;
      const dy = screenY - this.playerY;
      if (dx * dx + dy * dy < 22 * 22) {
        gem.collected = true;
        game.state.gems++;
        game.state.score += 150;
        game.playSound('gemCollect');
        game.spawnParticles(particlePresets.gemCollect(this.playerX, this.playerY, isElphaba));
      }
    }

    // Obstacle collision
    if (this.invincibleTimer <= 0) {
      for (const obs of this.obstacles) {
        if (!obs.active) continue;
        const screenY = obs.worldY - this.scrollY;
        const obsTop = obs.fromTop ? screenY : screenY + 200 - obs.h;
        const obsBot = obsTop + obs.h;
        const obsLeft = obs.x;
        const obsRight = obs.x + obs.w;

        // AABB vs circle
        const closestX = Math.max(obsLeft, Math.min(this.playerX, obsRight));
        const closestY = Math.max(obsTop, Math.min(this.playerY, obsBot));
        const ddx = this.playerX - closestX;
        const ddy = this.playerY - closestY;
        if (ddx * ddx + ddy * ddy < 12 * 12) {
          this.takeDamage(game);
          break;
        }
      }
    }

    // Clean up off-screen entities
    this.gems = this.gems.filter(g => g.worldY - this.scrollY > -100);
    this.obstacles = this.obstacles.filter(o => o.worldY - this.scrollY > -200);

    // Trail
    if (this.trailTimer > 0.08) {
      this.trailTimer = 0;
      game.spawnParticles(particlePresets.trail(this.playerX, this.playerY, isElphaba));
    }

    // Win conditions
    if (game.state.levelTime >= 60 || game.state.gems >= 25) {
      game.state.actComplete = true;
      this.completeAct(game);
    }
  }

  private takeDamage(game: GameEngine) {
    game.state.health--;
    game.state.noHitBonus = false;
    this.invincibleTimer = 2;
    game.playSound('hit');
    game.shakeCamera(5, 0.3);
    if (game.state.health <= 0) {
      this.enter(game);
    }
  }

  private completeAct(game: GameEngine) {
    let stars = 1;
    if (game.state.gems >= 30) stars++;
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

    // Background — deep purple shaft
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0a0020');
    bgGrad.addColorStop(0.5, '#150030');
    bgGrad.addColorStop(1, '#0a0015');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Shaft walls
    const wallColor = '#2a1a0a';
    const wallHighlight = 'rgba(255, 215, 0, 0.1)';

    // Left wall
    ctx.fillStyle = wallColor;
    ctx.fillRect(0, 0, this.shaftLeft, h);
    // Right wall
    ctx.fillRect(this.shaftRight, 0, w - this.shaftRight, h);

    // Wall texture — bricks scrolling
    ctx.strokeStyle = wallHighlight;
    ctx.lineWidth = 0.5;
    const brickH = 20;
    const offset = this.scrollY % (brickH * 2);
    for (let y = -brickH * 2; y < h + brickH; y += brickH) {
      const sy = y + offset;
      // Left wall bricks
      ctx.beginPath();
      ctx.moveTo(0, sy);
      ctx.lineTo(this.shaftLeft, sy);
      ctx.stroke();
      // Right wall bricks
      ctx.beginPath();
      ctx.moveTo(this.shaftRight, sy);
      ctx.lineTo(w, sy);
      ctx.stroke();
      // Stagger every other row
      const stagger = Math.floor((y + offset) / brickH) % 2 === 0 ? this.shaftLeft * 0.5 : 0;
      ctx.beginPath();
      ctx.moveTo(stagger, sy);
      ctx.lineTo(stagger, sy + brickH);
      ctx.stroke();
    }

    // Wall inner edges — gold trim
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.shaftLeft, 0);
    ctx.lineTo(this.shaftLeft, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.shaftRight, 0);
    ctx.lineTo(this.shaftRight, h);
    ctx.stroke();

    // Obstacles
    for (const obs of this.obstacles) {
      const screenY = obs.worldY - this.scrollY;
      if (screenY < -100 || screenY > h + 100) continue;

      const obsTop = obs.fromTop ? screenY : screenY + 200 - obs.h;

      // Stalactite/stalagmite shape
      ctx.fillStyle = '#4a3020';
      ctx.beginPath();
      if (obs.fromTop) {
        // Triangle pointing down
        ctx.moveTo(obs.x, obsTop);
        ctx.lineTo(obs.x + obs.w, obsTop);
        ctx.lineTo(obs.x + obs.w / 2, obsTop + obs.h);
      } else {
        // Triangle pointing up
        ctx.moveTo(obs.x + obs.w / 2, obsTop);
        ctx.lineTo(obs.x + obs.w, obsTop + obs.h);
        ctx.lineTo(obs.x, obsTop + obs.h);
      }
      ctx.closePath();
      ctx.fill();

      // Highlight
      ctx.strokeStyle = 'rgba(255, 200, 100, 0.2)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Gems
    for (const gem of this.gems) {
      if (gem.collected) continue;
      const screenY = gem.worldY - this.scrollY;
      if (screenY < -30 || screenY > h + 30) continue;
      drawGem(ctx, gem.x, screenY, 9, isElphaba, t);
    }

    // Player
    const blink = this.invincibleTimer > 0 && Math.floor(t * 10) % 2 === 0;
    if (!blink) {
      ctx.save();
      ctx.translate(this.playerX, this.playerY);
      if (this.gravityDir === -1) {
        ctx.scale(1, -1);
      }
      ctx.translate(-this.playerX, -this.playerY);
      if (isElphaba) {
        drawElphaba(ctx, this.playerX, this.playerY, scale * 1.2, t, {});
      } else {
        drawGlinda(ctx, this.playerX, this.playerY, scale * 1.2, t, { wand: true });
      }
      ctx.restore();
    }

    // Gravity direction indicator
    const arrowY = this.gravityDir === 1 ? h - 30 : 30;
    const arrowDir = this.gravityDir === 1 ? 1 : -1;
    ctx.fillStyle = isElphaba ? COLORS.emeraldGlow : COLORS.pinkGlow;
    ctx.globalAlpha = 0.5 + Math.sin(t * 3) * 0.2;
    ctx.beginPath();
    ctx.moveTo(w / 2, arrowY + arrowDir * 10);
    ctx.lineTo(w / 2 - 8, arrowY - arrowDir * 5);
    ctx.lineTo(w / 2 + 8, arrowY - arrowDir * 5);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    // HUD
    drawHealth(ctx, 10, 10, game.state.health, game.state.maxHealth, isElphaba);
    drawText(ctx, `Gems: ${game.state.gems}`, w / 2, 20, 12 * scale, COLORS.gold);
    const timeLeft = Math.max(0, 60 - Math.floor(game.state.levelTime));
    drawText(ctx, `${timeLeft}s`, w - 30 * scale, 20, 11 * scale, '#aaa');
    drawText(ctx, `Score: ${game.state.score}`, w / 2, h - 15, 10 * scale, '#aaa');

    // Controls hint
    if (game.state.levelTime < 5 && !game.state.actComplete) {
      const alpha = Math.max(0, 1 - game.state.levelTime / 5);
      ctx.globalAlpha = alpha;
      drawText(ctx, 'Tap to flip gravity!', w / 2, h * 0.25, 16 * scale, '#fff');
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
}
