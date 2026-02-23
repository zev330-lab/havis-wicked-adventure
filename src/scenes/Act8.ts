// Act 8 — 'What Is This Feeling?' — Two-Zone Defend
// Elphaba defends left, Glinda defends right. Touch a side to activate that defender.
import { Scene, GameEngine } from '../engine/types';
import { drawText, drawElphaba, drawGlinda, drawGem, drawHealth, COLORS } from '../engine/renderer';
import { particlePresets } from '../engine/particles';
import { startBgMusic, stopBgMusic } from '../engine/audio';

interface Enemy {
  x: number;
  y: number;
  vx: number;
  side: 'left' | 'right';
  health: number;
  active: boolean;
  flashTimer: number;
  type: 'minion' | 'soldier';
}

interface FriendshipGem {
  x: number;
  y: number;
  collected: boolean;
  timer: number;
}

interface AttackEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  side: 'left' | 'right';
}

export class Act8Scene implements Scene {
  private activeZone: 'left' | 'right' = 'left';
  private lastZone: 'left' | 'right' = 'left';
  private enemies: Enemy[] = [];
  private friendshipGems: FriendshipGem[] = [];
  private attackEffects: AttackEffect[] = [];
  private spawnTimer = 0;
  private gemSpawnTimer = 0;
  private attackTimer = 0;
  private enemiesDefeated = 0;
  private friendshipGemsCollected = 0;
  private invincibleTimer = 0;
  private noteTimer = 0;
  private elphabaX = 0;
  private elphabaY = 0;
  private glindaX = 0;
  private glindaY = 0;

  enter(game: GameEngine) {
    const w = game.width;
    const h = game.height;
    this.elphabaX = w * 0.25;
    this.elphabaY = h * 0.6;
    this.glindaX = w * 0.75;
    this.glindaY = h * 0.6;
    this.activeZone = 'left';
    this.lastZone = 'left';
    this.enemies = [];
    this.friendshipGems = [];
    this.attackEffects = [];
    this.spawnTimer = 0;
    this.gemSpawnTimer = 0;
    this.attackTimer = 0;
    this.enemiesDefeated = 0;
    this.friendshipGemsCollected = 0;
    this.invincibleTimer = 0;
    this.noteTimer = 0;

    game.state.gems = 0;
    game.state.score = 0;
    game.state.health = 5;
    game.state.maxHealth = 5;
    game.state.noHitBonus = true;
    game.state.levelTime = 0;
    game.state.actComplete = false;

    startBgMusic('feeling');
  }

  exit(_game: GameEngine) {
    stopBgMusic();
  }

  update(game: GameEngine, dt: number) {
    if (game.state.actComplete) return;

    game.state.levelTime += dt;
    this.spawnTimer += dt;
    this.gemSpawnTimer += dt;
    this.attackTimer += dt;
    this.noteTimer += dt;
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;

    const w = game.width;
    const h = game.height;

    // Zone detection
    if (game.input.isTouching) {
      this.activeZone = game.input.touchX < w / 2 ? 'left' : 'right';
      if (this.activeZone !== this.lastZone) {
        game.playSound('characterSwitch');
        this.lastZone = this.activeZone;
      }
    }

    // Spawn enemies
    const spawnRate = Math.max(1.2, 2.5 - game.state.levelTime * 0.02);
    if (this.spawnTimer >= spawnRate) {
      this.spawnTimer = 0;
      const side: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right';
      const isSoldier = Math.random() < 0.25 + game.state.levelTime * 0.003;
      const spd = isSoldier ? 40 : 65;
      const speed = spd + game.state.levelTime * 0.3;
      this.enemies.push({
        x: side === 'left' ? -20 : w + 20,
        y: h * 0.3 + Math.random() * h * 0.4,
        vx: side === 'left' ? speed : -speed,
        side,
        health: isSoldier ? 2 : 1,
        active: true,
        flashTimer: 0,
        type: isSoldier ? 'soldier' : 'minion',
      });
    }

    // Move enemies
    for (const e of this.enemies) {
      if (!e.active) continue;
      e.x += e.vx * dt;
      if (e.flashTimer > 0) e.flashTimer -= dt;

      // Enemy reached the defender zone — deal damage
      const centerX = w / 2;
      if ((e.side === 'left' && e.x > centerX - 30) || (e.side === 'right' && e.x < centerX + 30)) {
        e.active = false;
        if (this.invincibleTimer <= 0) {
          game.state.health--;
          game.state.noHitBonus = false;
          this.invincibleTimer = 1;
          game.playSound('hit');
          game.shakeCamera(4, 0.2);
          if (game.state.health <= 0) {
            this.enter(game);
            return;
          }
        }
      }
    }

    // Auto-attack from active character
    if (this.attackTimer >= 0.4) {
      this.attackTimer = 0;
      const attackerX = this.activeZone === 'left' ? this.elphabaX : this.glindaX;
      const attackerY = this.activeZone === 'left' ? this.elphabaY : this.glindaY;
      const attackRange = 130;

      let nearest: Enemy | null = null;
      let nearestDist = Infinity;
      for (const e of this.enemies) {
        if (!e.active || e.side !== this.activeZone) continue;
        const dx = e.x - attackerX;
        const dy = e.y - attackerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < attackRange && dist < nearestDist) {
          nearest = e;
          nearestDist = dist;
        }
      }

      if (nearest) {
        nearest.health--;
        nearest.flashTimer = 0.15;
        game.playSound(this.activeZone === 'left' ? 'elphabaMagic' : 'glindaMagic');

        this.attackEffects.push({
          x: attackerX,
          y: attackerY,
          radius: 0,
          maxRadius: nearestDist,
          alpha: 0.6,
          side: this.activeZone,
        });

        if (nearest.health <= 0) {
          nearest.active = false;
          this.enemiesDefeated++;
          game.state.score += nearest.type === 'soldier' ? 300 : 150;
          game.spawnParticles(particlePresets.explosion(nearest.x, nearest.y));
        }
      }
    }

    // Update attack effects
    this.attackEffects = this.attackEffects.filter(e => {
      e.radius += 300 * dt;
      e.alpha -= 2 * dt;
      return e.alpha > 0;
    });

    // Spawn friendship gems
    if (this.gemSpawnTimer >= 7) {
      this.gemSpawnTimer = 0;
      this.friendshipGems.push({
        x: w / 2,
        y: h * 0.35 + Math.random() * h * 0.3,
        collected: false,
        timer: 6,
      });
    }

    // Update friendship gems
    for (const gem of this.friendshipGems) {
      if (gem.collected) continue;
      gem.timer -= dt;
      if (gem.timer <= 0) {
        gem.collected = true;
        continue;
      }
      // Collect when touching near center
      if (game.input.isTouching) {
        const dx = game.input.touchX - gem.x;
        const dy = game.input.touchY - gem.y;
        if (dx * dx + dy * dy < 50 * 50) {
          gem.collected = true;
          this.friendshipGemsCollected++;
          game.state.gems++;
          game.state.score += 300;
          game.playSound('gemCollect');
          game.spawnParticles(particlePresets.gemCollect(gem.x, gem.y, true));
          game.spawnParticles(particlePresets.gemCollect(gem.x, gem.y, false));
        }
      }
    }

    // Clean up
    this.enemies = this.enemies.filter(e => e.active);
    this.friendshipGems = this.friendshipGems.filter(g => !g.collected);

    // Musical notes
    if (this.noteTimer > 3) {
      this.noteTimer = 0;
      game.spawnParticles(particlePresets.musicalNote(Math.random() * w, h * 0.1));
    }

    // Win conditions
    if (game.state.levelTime >= 60 || this.enemiesDefeated >= 40) {
      game.state.actComplete = true;
      this.completeAct(game);
    }
  }

  private completeAct(game: GameEngine) {
    let stars = 1;
    if (this.friendshipGemsCollected >= 15) stars++;
    if (game.state.noHitBonus) stars++;
    game.state.stars.act8 = Math.max(game.state.stars.act8 || 0, stars);

    const totalStars = Object.values(game.state.stars).reduce((a, b) => a + b, 0);
    if (totalStars >= 5 && !game.state.unlockedCostumes.includes(game.state.character === 'elphaba' ? 'elphaba_sparkly' : 'glinda_wings')) {
      game.state.unlockedCostumes.push(game.state.character === 'elphaba' ? 'elphaba_sparkly' : 'glinda_wings');
    }

    if (!game.state.lastCompletedAct || game.state.lastCompletedAct < 'act8') {
      game.state.lastCompletedAct = 'act8';
    }
    game.saveGame();
    game.playSound('actComplete');

    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        game.spawnParticles(particlePresets.confetti(Math.random() * game.width, game.height * 0.3));
      }, i * 200);
    }

    game.state.currentAct = 'act9';
    game.state.storyCardIndex = 0;
    setTimeout(() => {
      game.transitionTo('storyCard');
    }, 2500);
  }

  render(game: GameEngine, ctx: CanvasRenderingContext2D) {
    const w = game.width;
    const h = game.height;
    const scale = game.getScale();
    const t = game.time;

    // Split background
    // Left half — emerald
    const leftGrad = ctx.createLinearGradient(0, 0, w / 2, h);
    leftGrad.addColorStop(0, '#0a1a10');
    leftGrad.addColorStop(1, '#0d2a18');
    ctx.fillStyle = leftGrad;
    ctx.fillRect(0, 0, w / 2, h);

    // Right half — pink
    const rightGrad = ctx.createLinearGradient(w / 2, 0, w, h);
    rightGrad.addColorStop(0, '#1a0a20');
    rightGrad.addColorStop(1, '#2a0a25');
    ctx.fillStyle = rightGrad;
    ctx.fillRect(w / 2, 0, w / 2, h);

    // Active zone highlight
    ctx.fillStyle = this.activeZone === 'left'
      ? 'rgba(0, 200, 100, 0.06)'
      : 'rgba(200, 100, 200, 0.06)';
    ctx.fillRect(
      this.activeZone === 'left' ? 0 : w / 2,
      0,
      w / 2,
      h
    );

    // Center divider
    const divPulse = Math.sin(t * 2) * 0.15 + 0.5;
    ctx.strokeStyle = COLORS.gold;
    ctx.globalAlpha = divPulse;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Zone labels
    ctx.globalAlpha = 0.4;
    drawText(ctx, 'ELPHABA', w * 0.25, h * 0.08, 10 * scale, COLORS.emeraldGlow);
    drawText(ctx, 'GLINDA', w * 0.75, h * 0.08, 10 * scale, COLORS.pinkGlow);
    ctx.globalAlpha = 1;

    // Enemies
    for (const e of this.enemies) {
      if (!e.active) continue;
      const flash = e.flashTimer > 0;
      const eScale = e.type === 'soldier' ? 1.3 : 1;
      const size = 12 * eScale;

      // Body
      ctx.fillStyle = flash ? '#fff' : (e.side === 'left' ? '#4a2060' : '#205040');
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, size * 0.8, size, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = flash ? '#fff' : (e.side === 'left' ? '#6a3080' : '#306050');
      ctx.beginPath();
      ctx.arc(e.x, e.y - size * 0.9, size * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(e.x - 3, e.y - size * 0.9, 2, 0, Math.PI * 2);
      ctx.arc(e.x + 3, e.y - size * 0.9, 2, 0, Math.PI * 2);
      ctx.fill();

      // Health bar for soldiers
      if (e.type === 'soldier' && e.health > 0) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(e.x - 12, e.y - size * 1.5, 24, 4);
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(e.x - 12, e.y - size * 1.5, 24 * (e.health / 2), 4);
      }
    }

    // Attack effects
    for (const ae of this.attackEffects) {
      ctx.strokeStyle = ae.side === 'left' ? COLORS.emeraldGlow : COLORS.pinkGlow;
      ctx.lineWidth = 2;
      ctx.globalAlpha = ae.alpha;
      ctx.beginPath();
      ctx.arc(ae.x, ae.y, ae.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Friendship gems
    for (const gem of this.friendshipGems) {
      if (gem.collected) continue;
      const bob = Math.sin(t * 2) * 4;
      const fadeAlpha = gem.timer < 2 ? gem.timer / 2 : 1;
      ctx.globalAlpha = fadeAlpha;

      // Double-colored glow (both green and pink)
      ctx.fillStyle = `rgba(0, 255, 100, ${0.15 + Math.sin(t * 3) * 0.05})`;
      ctx.beginPath();
      ctx.arc(gem.x - 4, gem.y + bob, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 100, 200, ${0.15 + Math.sin(t * 3 + 1) * 0.05})`;
      ctx.beginPath();
      ctx.arc(gem.x + 4, gem.y + bob, 14, 0, Math.PI * 2);
      ctx.fill();

      // Heart shape in center
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      const hx = gem.x, hy = gem.y + bob;
      const hs = 7;
      ctx.moveTo(hx, hy + hs * 0.3);
      ctx.bezierCurveTo(hx, hy - hs * 0.3, hx - hs, hy - hs * 0.3, hx - hs, hy + hs * 0.1);
      ctx.bezierCurveTo(hx - hs, hy + hs * 0.6, hx, hy + hs, hx, hy + hs * 1.2);
      ctx.bezierCurveTo(hx, hy + hs, hx + hs, hy + hs * 0.6, hx + hs, hy + hs * 0.1);
      ctx.bezierCurveTo(hx + hs, hy - hs * 0.3, hx, hy - hs * 0.3, hx, hy + hs * 0.3);
      ctx.fill();

      ctx.globalAlpha = 1;
    }

    // Characters — always visible
    const activePulse = Math.sin(t * 4) * 0.15 + 0.85;

    // Elphaba glow when active
    if (this.activeZone === 'left') {
      ctx.fillStyle = `rgba(0, 200, 80, ${0.15 * activePulse})`;
      ctx.beginPath();
      ctx.arc(this.elphabaX, this.elphabaY, 35, 0, Math.PI * 2);
      ctx.fill();
    }
    drawElphaba(ctx, this.elphabaX, this.elphabaY, scale * 1.5, t, {
      sparkly: game.state.unlockedCostumes.includes('elphaba_sparkly'),
    });

    // Glinda glow when active
    if (this.activeZone === 'right') {
      ctx.fillStyle = `rgba(200, 80, 200, ${0.15 * activePulse})`;
      ctx.beginPath();
      ctx.arc(this.glindaX, this.glindaY, 35, 0, Math.PI * 2);
      ctx.fill();
    }
    drawGlinda(ctx, this.glindaX, this.glindaY, scale * 1.5, t, {
      goldenWings: game.state.unlockedCostumes.includes('glinda_wings'),
      wand: true,
    });

    // HUD
    drawHealth(ctx, 10, 10, game.state.health, game.state.maxHealth, true);
    drawText(ctx, `Friendship: ${this.friendshipGemsCollected}`, w / 2, 20, 12 * scale, COLORS.gold);
    drawText(ctx, `Defeated: ${this.enemiesDefeated}`, w / 2, 38, 10 * scale, '#ccc');
    const timeLeft = Math.max(0, 60 - Math.floor(game.state.levelTime));
    drawText(ctx, `${timeLeft}s`, w - 30 * scale, 20, 11 * scale, '#aaa');
    drawText(ctx, `Score: ${game.state.score}`, w / 2, h - 15, 10 * scale, '#aaa');

    // Controls hint
    if (game.state.levelTime < 5 && !game.state.actComplete) {
      const alpha = Math.max(0, 1 - game.state.levelTime / 5);
      ctx.globalAlpha = alpha;
      drawText(ctx, 'Touch left for Elphaba!', w * 0.25, h * 0.2, 12 * scale, COLORS.emeraldGlow);
      drawText(ctx, 'Touch right for Glinda!', w * 0.75, h * 0.2, 12 * scale, COLORS.pinkGlow);
      ctx.globalAlpha = 1;
    }

    // Act complete overlay
    if (game.state.actComplete) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, w, h);
      drawText(ctx, 'Act VIII Complete!', w / 2, h * 0.3, 28 * scale, COLORS.gold);
      drawText(ctx, `Enemies Defeated: ${this.enemiesDefeated}`, w / 2, h * 0.4, 16 * scale, COLORS.emeraldGlow);
      drawText(ctx, `Friendship Gems: ${this.friendshipGemsCollected}`, w / 2, h * 0.47, 16 * scale, COLORS.pinkGlow);
      drawText(ctx, `Score: ${game.state.score}`, w / 2, h * 0.54, 18 * scale, '#fff');

      const stars = game.state.stars.act8;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < stars ? COLORS.gold : 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        for (let si = 0; si < 10; si++) {
          const r = si % 2 === 0 ? 15 * scale : 7 * scale;
          const angle = (si * Math.PI) / 5 - Math.PI / 2;
          const sx = w / 2 - 40 * scale + i * 40 * scale + Math.cos(angle) * r;
          const sy = h * 0.64 + Math.sin(angle) * r;
          if (si === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}
