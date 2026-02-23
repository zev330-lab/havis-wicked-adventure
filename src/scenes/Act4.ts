// Act 4 — 'Popular' — Catch Game
// Catch falling fashion items (tiaras, wands, shoes) while avoiding bad items
import { Scene, GameEngine } from '../engine/types';
import { drawSky, drawElphaba, drawGlinda, drawHUD, drawText, COLORS } from '../engine/renderer';
import { particlePresets } from '../engine/particles';
import { startBgMusic, stopBgMusic } from '../engine/audio';

interface FallingItem {
  x: number;
  y: number;
  lane: number;
  type: 'tiara' | 'wand' | 'shoe' | 'book' | 'bad';
  active: boolean;
  speed: number;
}

export class Act4Scene implements Scene {
  private playerX = 0;
  private playerY = 0;
  private items: FallingItem[] = [];
  private spawnTimer = 0;
  private waveTimer = 0;
  private popularityMeter = 0;
  private meterFills = 0;
  private spotlightTimer = 0;
  private catchCount = 0;
  private badCatchCount = 0;
  private trailTimer = 0;
  private noteTimer = 0;
  private spotlightAngle = 0;
  private lanes: number[] = [];

  enter(game: GameEngine) {
    this.playerX = game.width * 0.5;
    this.playerY = game.height * 0.85;
    this.items = [];
    this.spawnTimer = 0;
    this.waveTimer = 0;
    this.popularityMeter = 0;
    this.meterFills = 0;
    this.spotlightTimer = 0;
    this.catchCount = 0;
    this.badCatchCount = 0;
    this.trailTimer = 0;
    this.noteTimer = 0;
    this.spotlightAngle = 0;

    const w = game.width;
    this.lanes = [w * 0.15, w * 0.38, w * 0.62, w * 0.85];

    game.state.gems = 0;
    game.state.health = 3;
    game.state.maxHealth = 3;
    game.state.noHitBonus = true;
    game.state.levelTime = 0;
    game.state.actComplete = false;

    startBgMusic('popular');
  }

  exit(_game: GameEngine) {
    stopBgMusic();
  }

  update(game: GameEngine, dt: number) {
    if (game.state.actComplete) return;

    game.state.levelTime += dt;
    this.spawnTimer += dt;
    this.waveTimer += dt;
    this.trailTimer += dt;
    this.noteTimer += dt;
    this.spotlightAngle += dt * 0.8;

    if (this.spotlightTimer > 0) this.spotlightTimer -= dt;

    const w = game.width;
    const h = game.height;
    const isElphaba = game.state.character === 'elphaba';

    // Player movement — follow finger horizontally
    if (game.input.isTouching) {
      this.playerX += (game.input.touchX - this.playerX) * Math.min(1, dt * 14);
    }
    if (game.input.left) this.playerX -= 250 * dt;
    if (game.input.right) this.playerX += 250 * dt;
    this.playerX = Math.max(30, Math.min(w - 30, this.playerX));

    // Spawn items
    const spawnInterval = Math.max(0.35, 0.7 - game.state.levelTime * 0.004);
    if (this.spawnTimer > spawnInterval) {
      this.spawnTimer = 0;
      this.spawnItem(game, false);
    }

    // Wave burst every 5 seconds — one item per lane
    if (this.waveTimer > 5) {
      this.waveTimer = 0;
      for (let i = 0; i < 4; i++) {
        this.spawnItemInLane(game, i);
      }
    }

    // Update items
    for (const item of this.items) {
      if (!item.active) continue;
      item.y += item.speed * dt;

      // Off screen
      if (item.y > h + 30) {
        item.active = false;
        continue;
      }

      // Collision with player
      const dx = item.x - this.playerX;
      const dy = item.y - this.playerY;
      if (Math.sqrt(dx * dx + dy * dy) < 35) {
        item.active = false;

        if (item.type === 'bad') {
          this.badCatchCount++;
          game.state.noHitBonus = false;
          game.state.health--;
          game.playSound('hit');
          game.shakeCamera(6, 0.2);
          this.popularityMeter = Math.max(0, this.popularityMeter - 0.05);

          if (game.state.health <= 0) {
            game.state.health = 3;
            this.enter(game);
            return;
          }
        } else {
          this.catchCount++;
          game.state.gems++;
          const points = item.type === 'tiara' ? 300 : item.type === 'wand' ? 200 : item.type === 'book' ? 150 : 100;
          game.state.score += this.spotlightTimer > 0 ? points * 2 : points;
          game.playSound('catchItem');
          game.spawnParticles(particlePresets.gemCollect(item.x, item.y, isElphaba));
          this.popularityMeter += 0.03;
        }
      }
    }

    // Clean dead items
    this.items = this.items.filter(i => i.active);

    // Popularity meter fills
    if (this.popularityMeter >= 1) {
      this.popularityMeter = 0;
      this.meterFills++;
      this.spotlightTimer = 3; // Spotlight moment — invincible + double points
      game.playSound('powerUp');
      game.spawnParticles(particlePresets.confetti(w * 0.5, h * 0.3));
    }

    // Trail
    if (this.trailTimer > 0.08) {
      this.trailTimer = 0;
      game.spawnParticles(particlePresets.trail(this.playerX, this.playerY + 15, isElphaba));
    }

    // Musical notes
    if (this.noteTimer > 2.5) {
      this.noteTimer = 0;
      game.spawnParticles(particlePresets.musicalNote(Math.random() * w, h * 0.15));
    }

    // Level complete — 3 meter fills or 60 seconds
    if (this.meterFills >= 3 || game.state.levelTime > 60) {
      game.state.actComplete = true;
      this.completeAct(game);
    }
  }

  private spawnItem(game: GameEngine, _wave: boolean) {
    const lane = Math.floor(Math.random() * 4);
    this.spawnItemInLane(game, lane);
  }

  private spawnItemInLane(game: GameEngine, lane: number) {
    const fallSpeed = Math.min(250, 140 + game.state.levelTime * 1.5);
    const isBad = Math.random() < 0.2;
    const goodTypes: FallingItem['type'][] = ['tiara', 'wand', 'shoe', 'book'];

    this.items.push({
      x: this.lanes[lane],
      y: -20,
      lane,
      type: isBad ? 'bad' : goodTypes[Math.floor(Math.random() * goodTypes.length)],
      active: true,
      speed: fallSpeed + (Math.random() - 0.5) * 30,
    });
  }

  private completeAct(game: GameEngine) {
    let stars = 1;
    if (this.catchCount >= 50) stars++;
    if (game.state.noHitBonus) stars++;
    game.state.stars.act4 = Math.max(game.state.stars.act4, stars);

    const totalStars = Object.values(game.state.stars).reduce((a, b) => a + b, 0);
    if (totalStars >= 5 && !game.state.unlockedCostumes.includes(game.state.character === 'elphaba' ? 'elphaba_sparkly' : 'glinda_wings')) {
      game.state.unlockedCostumes.push(game.state.character === 'elphaba' ? 'elphaba_sparkly' : 'glinda_wings');
    }

    if (!game.state.lastCompletedAct || game.state.lastCompletedAct < 'act4') {
      game.state.lastCompletedAct = 'act4';
    }
    game.saveGame();
    game.playSound('actComplete');

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        game.spawnParticles(particlePresets.confetti(Math.random() * game.width, game.height * 0.3));
      }, i * 200);
    }

    setTimeout(() => {
      game.state.currentAct = 'act5';
      game.state.storyCardIndex = 0;
      game.transitionTo('storyCard');
    }, 2500);
  }

  render(game: GameEngine, ctx: CanvasRenderingContext2D) {
    const w = game.width;
    const h = game.height;
    const scale = game.getScale();
    const isElphaba = game.state.character === 'elphaba';
    const t = game.time;

    // Stage background — pink/purple curtain
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#2a0030');
    bgGrad.addColorStop(0.5, '#1a0025');
    bgGrad.addColorStop(1, '#0d0015');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Curtain drapes on sides
    ctx.fillStyle = 'rgba(120, 0, 50, 0.4)';
    for (let i = 0; i < 6; i++) {
      const cy = i * h / 5;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.quadraticCurveTo(25 * scale, cy + h / 10, 0, cy + h / 5);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(w, cy);
      ctx.quadraticCurveTo(w - 25 * scale, cy + h / 10, w, cy + h / 5);
      ctx.fill();
    }

    // Spotlights
    const spot1X = w * 0.3 + Math.sin(this.spotlightAngle) * w * 0.2;
    const spot2X = w * 0.7 + Math.cos(this.spotlightAngle * 0.7) * w * 0.2;
    const spotAlpha = this.spotlightTimer > 0 ? 0.15 : 0.06;
    const spotGrad1 = ctx.createRadialGradient(spot1X, 0, 0, spot1X, h * 0.4, w * 0.3);
    spotGrad1.addColorStop(0, `rgba(255, 215, 0, ${spotAlpha})`);
    spotGrad1.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = spotGrad1;
    ctx.fillRect(0, 0, w, h);
    const spotGrad2 = ctx.createRadialGradient(spot2X, 0, 0, spot2X, h * 0.4, w * 0.3);
    spotGrad2.addColorStop(0, `rgba(255, 150, 200, ${spotAlpha})`);
    spotGrad2.addColorStop(1, 'rgba(255, 150, 200, 0)');
    ctx.fillStyle = spotGrad2;
    ctx.fillRect(0, 0, w, h);

    // Spotlight moment golden glow
    if (this.spotlightTimer > 0) {
      ctx.fillStyle = `rgba(255, 215, 0, ${Math.sin(t * 6) * 0.04 + 0.06})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Lane markers (subtle)
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    for (const lx of this.lanes) {
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, h * 0.75);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Stage floor
    const floorGrad = ctx.createLinearGradient(0, h * 0.78, 0, h);
    floorGrad.addColorStop(0, '#3a1a2a');
    floorGrad.addColorStop(1, '#1a0a15');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, h * 0.78, w, h * 0.22);

    // Falling items
    for (const item of this.items) {
      if (!item.active) continue;
      this.drawItem(ctx, item, scale, t);
    }

    // Player
    const charScale = scale * 1.5;
    const hasSparkly = game.state.unlockedCostumes.includes('elphaba_sparkly');
    const hasWings = game.state.unlockedCostumes.includes('glinda_wings');
    if (isElphaba) {
      drawElphaba(ctx, this.playerX, this.playerY, charScale, t, { sparkly: hasSparkly });
    } else {
      drawGlinda(ctx, this.playerX, this.playerY, charScale, t, { goldenWings: hasWings });
    }

    // Shield glow during spotlight
    if (this.spotlightTimer > 0) {
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 2;
      ctx.globalAlpha = Math.sin(t * 5) * 0.2 + 0.4;
      ctx.beginPath();
      ctx.arc(this.playerX, this.playerY, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Popularity Meter
    this.drawPopularityMeter(ctx, w, h, scale);

    // HUD
    drawHUD(ctx, game);

    // Spotlight text
    if (this.spotlightTimer > 0) {
      drawText(ctx, 'SPOTLIGHT! 2x Points!', w / 2, h * 0.15, 16 * scale, COLORS.gold);
    }

    // Act complete overlay
    if (game.state.actComplete) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, w, h);
      drawText(ctx, 'Act IV Complete!', w / 2, h * 0.35, 28 * scale, COLORS.gold);
      drawText(ctx, `Items Caught: ${this.catchCount}`, w / 2, h * 0.45, 18 * scale, COLORS.pinkGlow);
      drawText(ctx, `Score: ${game.state.score}`, w / 2, h * 0.52, 18 * scale, '#fff');

      const stars = game.state.stars.act4;
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

    // Controls hint
    if (game.state.levelTime < 4) {
      const alpha = Math.max(0, 1 - game.state.levelTime / 4);
      ctx.globalAlpha = alpha;
      drawText(ctx, 'Slide to catch the items!', w / 2, h * 0.7, 15 * scale, '#fff');
      drawText(ctx, 'Avoid the gray ones!', w / 2, h * 0.75, 13 * scale, '#ccc');
      ctx.globalAlpha = 1;
    }
  }

  private drawItem(ctx: CanvasRenderingContext2D, item: FallingItem, scale: number, time: number) {
    const x = item.x;
    const y = item.y;
    const bob = Math.sin(time * 4 + item.lane) * 2;
    const s = scale * 1.2;

    switch (item.type) {
      case 'tiara': {
        // Gold crown shape
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath();
        ctx.moveTo(x - 12 * s, y + 5 * s + bob);
        ctx.lineTo(x - 10 * s, y - 5 * s + bob);
        ctx.lineTo(x - 5 * s, y + bob);
        ctx.lineTo(x, y - 10 * s + bob);
        ctx.lineTo(x + 5 * s, y + bob);
        ctx.lineTo(x + 10 * s, y - 5 * s + bob);
        ctx.lineTo(x + 12 * s, y + 5 * s + bob);
        ctx.closePath();
        ctx.fill();
        // Gems on tiara
        ctx.fillStyle = '#ff66aa';
        ctx.beginPath();
        ctx.arc(x, y - 7 * s + bob, 2 * s, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'wand': {
        // Wand with star
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 2 * s;
        ctx.beginPath();
        ctx.moveTo(x, y + 10 * s + bob);
        ctx.lineTo(x, y - 5 * s + bob);
        ctx.stroke();
        // Star on top
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? 7 * s : 3 * s;
          const angle = (i * Math.PI) / 5 - Math.PI / 2 + time;
          const px = x + Math.cos(angle) * r;
          const py = y - 8 * s + bob + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'shoe': {
        // Simple shoe shape
        ctx.fillStyle = '#ff69b4';
        ctx.beginPath();
        ctx.ellipse(x + 3 * s, y + 3 * s + bob, 10 * s, 5 * s, 0, 0, Math.PI);
        ctx.fill();
        // Heel
        ctx.fillRect(x - 7 * s, y + bob - 2 * s, 3 * s, 8 * s);
        // Sparkle
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath();
        ctx.arc(x + 5 * s, y + bob, 2 * s, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'book': {
        // Spell book
        ctx.fillStyle = '#8844cc';
        ctx.fillRect(x - 8 * s, y - 6 * s + bob, 16 * s, 14 * s);
        ctx.fillStyle = '#aa66ee';
        ctx.fillRect(x - 6 * s, y - 4 * s + bob, 12 * s, 10 * s);
        // Star on cover
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? 4 * s : 2 * s;
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const px = x + Math.cos(angle) * r;
          const py = y + 1 * s + bob + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'bad': {
        // Gray cloud with X
        ctx.fillStyle = 'rgba(100, 100, 100, 0.7)';
        ctx.beginPath();
        ctx.arc(x, y + bob, 12 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x - 6 * s, y + 3 * s + bob, 8 * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 6 * s, y + 2 * s + bob, 9 * s, 0, Math.PI * 2);
        ctx.fill();
        // Red X
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2.5 * s;
        ctx.beginPath();
        ctx.moveTo(x - 6 * s, y - 6 * s + bob);
        ctx.lineTo(x + 6 * s, y + 6 * s + bob);
        ctx.moveTo(x + 6 * s, y - 6 * s + bob);
        ctx.lineTo(x - 6 * s, y + 6 * s + bob);
        ctx.stroke();
        break;
      }
    }
  }

  private drawPopularityMeter(ctx: CanvasRenderingContext2D, w: number, h: number, scale: number) {
    const barW = w * 0.6;
    const barX = (w - barW) / 2;
    const barY = h * 0.05;
    const barH = 10;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

    // Fill
    const grad = ctx.createLinearGradient(barX, 0, barX + barW * this.popularityMeter, 0);
    grad.addColorStop(0, '#ff69b4');
    grad.addColorStop(1, COLORS.gold);
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barW * this.popularityMeter, barH);

    // Stars for fills completed
    for (let i = 0; i < 3; i++) {
      const sx = barX + barW + 10 + i * 14;
      ctx.fillStyle = i < this.meterFills ? COLORS.gold : 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(sx, barY + barH / 2, 5 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    drawText(ctx, 'Popularity', w / 2, barY - 4, 8 * scale, '#ddd');
  }
}
