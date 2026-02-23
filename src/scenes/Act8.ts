// Act 8 — 'What Is This Feeling?' — Tap to Zap
// Enemies approach from both sides. Tap them to zap! Elphaba zaps left, Glinda zaps right.
import { Scene, GameEngine, actIndex } from '../engine/types';
import { drawText, drawElphaba, drawGlinda, drawHealth, COLORS } from '../engine/renderer';
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
  size: number;
  wobble: number;
}

interface MagicBolt {
  x: number;
  y: number;
  tx: number;
  ty: number;
  progress: number;
  side: 'left' | 'right';
  active: boolean;
}

interface FriendshipGem {
  x: number;
  y: number;
  collected: boolean;
  timer: number;
}

export class Act8Scene implements Scene {
  private enemies: Enemy[] = [];
  private bolts: MagicBolt[] = [];
  private friendshipGems: FriendshipGem[] = [];
  private spawnTimer = 0;
  private gemSpawnTimer = 0;
  private enemiesDefeated = 0;
  private friendshipGemsCollected = 0;
  private invincibleTimer = 0;
  private noteTimer = 0;
  private elphabaX = 0;
  private elphabaY = 0;
  private glindaX = 0;
  private glindaY = 0;
  private centerX = 0;
  private zapCooldown = 0;

  enter(game: GameEngine) {
    const w = game.width;
    const h = game.height;
    this.centerX = w / 2;
    this.elphabaX = w * 0.12;
    this.elphabaY = h * 0.55;
    this.glindaX = w * 0.88;
    this.glindaY = h * 0.55;
    this.enemies = [];
    this.bolts = [];
    this.friendshipGems = [];
    this.spawnTimer = 0;
    this.gemSpawnTimer = 0;
    this.enemiesDefeated = 0;
    this.friendshipGemsCollected = 0;
    this.invincibleTimer = 0;
    this.noteTimer = 0;
    this.zapCooldown = 0;

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
    this.noteTimer += dt;
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
    if (this.zapCooldown > 0) this.zapCooldown -= dt;

    const w = game.width;
    const h = game.height;

    // --- Spawn enemies ---
    // Start slow, ramp gently
    const spawnRate = Math.max(1.4, 3.0 - game.state.levelTime * 0.025);
    if (this.spawnTimer >= spawnRate) {
      this.spawnTimer = 0;
      const side: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right';
      // Speed: slow and visible
      const speed = 30 + Math.min(25, game.state.levelTime * 0.3);
      const size = 18 + Math.random() * 8;
      this.enemies.push({
        x: side === 'left' ? -size : w + size,
        y: h * 0.25 + Math.random() * h * 0.45,
        vx: side === 'left' ? speed : -speed,
        side,
        health: 1,
        active: true,
        flashTimer: 0,
        size,
        wobble: Math.random() * Math.PI * 2,
      });
    }

    // --- Move enemies ---
    for (const e of this.enemies) {
      if (!e.active) continue;
      e.x += e.vx * dt;
      e.wobble += dt * 2;
      if (e.flashTimer > 0) e.flashTimer -= dt;

      // Enemy reached the center — damage player
      const reachDist = 30;
      if ((e.side === 'left' && e.x > this.centerX - reachDist) ||
          (e.side === 'right' && e.x < this.centerX + reachDist)) {
        e.active = false;
        if (this.invincibleTimer <= 0) {
          game.state.health--;
          game.state.noHitBonus = false;
          this.invincibleTimer = 1.5;
          game.playSound('hit');
          game.shakeCamera(4, 0.25);
          if (game.state.health <= 0) {
            this.enter(game);
            return;
          }
        }
      }
    }

    // --- Tap to zap enemies ---
    if (game.input.tap && this.zapCooldown <= 0) {
      const tapX = game.input.tapX;
      const tapY = game.input.tapY;

      // First check: did they tap a friendship gem?
      let tappedGem = false;
      for (const gem of this.friendshipGems) {
        if (gem.collected) continue;
        const dx = tapX - gem.x;
        const dy = tapY - gem.y;
        if (dx * dx + dy * dy < 45 * 45) {
          gem.collected = true;
          this.friendshipGemsCollected++;
          game.state.gems++;
          game.state.score += 300;
          game.playSound('gemCollect');
          game.spawnParticles(particlePresets.gemCollect(gem.x, gem.y, true));
          game.spawnParticles(particlePresets.gemCollect(gem.x, gem.y, false));
          tappedGem = true;
          break;
        }
      }

      if (!tappedGem) {
        // Find nearest enemy to tap position
        let nearest: Enemy | null = null;
        let nearestDist = Infinity;
        for (const e of this.enemies) {
          if (!e.active) continue;
          const dx = tapX - e.x;
          const dy = tapY - e.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          // Generous tap radius — scales with enemy size
          if (dist < e.size + 35 && dist < nearestDist) {
            nearest = e;
            nearestDist = dist;
          }
        }

        if (nearest) {
          this.zapCooldown = 0.15;
          const side = nearest.side;
          const fromX = side === 'left' ? this.elphabaX : this.glindaX;
          const fromY = side === 'left' ? this.elphabaY : this.glindaY;

          // Fire magic bolt
          this.bolts.push({
            x: fromX,
            y: fromY,
            tx: nearest.x,
            ty: nearest.y,
            progress: 0,
            side,
            active: true,
          });

          // Destroy the enemy
          nearest.health--;
          nearest.flashTimer = 0.2;
          game.playSound(side === 'left' ? 'elphabaMagic' : 'glindaMagic');

          if (nearest.health <= 0) {
            nearest.active = false;
            this.enemiesDefeated++;
            game.state.score += 150;
            game.spawnParticles(particlePresets.explosion(nearest.x, nearest.y));
          }
        }
      }
    }

    // --- Update magic bolts ---
    for (const bolt of this.bolts) {
      if (!bolt.active) continue;
      bolt.progress += dt * 5;
      if (bolt.progress >= 1) bolt.active = false;
    }
    this.bolts = this.bolts.filter(b => b.active);

    // --- Spawn friendship gems ---
    if (this.gemSpawnTimer >= 6) {
      this.gemSpawnTimer = 0;
      this.friendshipGems.push({
        x: w * 0.35 + Math.random() * w * 0.3,
        y: h * 0.3 + Math.random() * h * 0.35,
        collected: false,
        timer: 8,
      });
    }

    // --- Update friendship gems ---
    for (const gem of this.friendshipGems) {
      if (gem.collected) continue;
      gem.timer -= dt;
      if (gem.timer <= 0) gem.collected = true;
    }

    // --- Clean up ---
    this.enemies = this.enemies.filter(e => e.active);
    this.friendshipGems = this.friendshipGems.filter(g => !g.collected);

    // --- Musical notes ---
    if (this.noteTimer > 3) {
      this.noteTimer = 0;
      game.spawnParticles(particlePresets.musicalNote(Math.random() * w, h * 0.1));
    }

    // --- Win conditions ---
    if (game.state.levelTime >= 60 || this.enemiesDefeated >= 30) {
      game.state.actComplete = true;
      this.completeAct(game);
    }
  }

  private completeAct(game: GameEngine) {
    let stars = 1;
    if (this.friendshipGemsCollected >= 8) stars++;
    if (game.state.noHitBonus) stars++;
    game.state.stars.act8 = Math.max(game.state.stars.act8 || 0, stars);

    const totalStars = Object.values(game.state.stars).reduce((a, b) => a + b, 0);
    if (totalStars >= 5 && !game.state.unlockedCostumes.includes(game.state.character === 'elphaba' ? 'elphaba_sparkly' : 'glinda_wings')) {
      game.state.unlockedCostumes.push(game.state.character === 'elphaba' ? 'elphaba_sparkly' : 'glinda_wings');
    }

    if (!game.state.lastCompletedAct || actIndex(game.state.lastCompletedAct) < actIndex('act8')) {
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

    // --- Background: split stage ---
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0a0020');
    bgGrad.addColorStop(0.5, '#0d0018');
    bgGrad.addColorStop(1, '#081510');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Left side tint (green)
    ctx.fillStyle = 'rgba(0, 80, 40, 0.12)';
    ctx.fillRect(0, 0, w / 2, h);
    // Right side tint (pink)
    ctx.fillStyle = 'rgba(80, 20, 60, 0.12)';
    ctx.fillRect(w / 2, 0, w / 2, h);

    // Center danger zone — enemies try to reach here
    const zonePulse = Math.sin(t * 2) * 0.03 + 0.08;
    ctx.fillStyle = `rgba(255, 50, 50, ${zonePulse})`;
    ctx.fillRect(this.centerX - 20, h * 0.15, 40, h * 0.7);
    // Center line
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.2)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(this.centerX, h * 0.1);
    ctx.lineTo(this.centerX, h * 0.9);
    ctx.stroke();
    ctx.setLineDash([]);

    // Approach arrows showing enemies come from sides
    if (game.state.levelTime < 8) {
      const arrowAlpha = Math.max(0, 1 - game.state.levelTime / 8) * 0.3;
      ctx.globalAlpha = arrowAlpha;
      ctx.fillStyle = '#ff6666';
      // Left arrow
      for (let i = 0; i < 3; i++) {
        const ax = 30 + i * 25;
        const ay = h * 0.5;
        ctx.beginPath();
        ctx.moveTo(ax + 10, ay - 6);
        ctx.lineTo(ax + 18, ay);
        ctx.lineTo(ax + 10, ay + 6);
        ctx.fill();
      }
      // Right arrow
      for (let i = 0; i < 3; i++) {
        const ax = w - 30 - i * 25;
        const ay = h * 0.5;
        ctx.beginPath();
        ctx.moveTo(ax - 10, ay - 6);
        ctx.lineTo(ax - 18, ay);
        ctx.lineTo(ax - 10, ay + 6);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // --- Enemies: big, clear, tappable ---
    for (const e of this.enemies) {
      if (!e.active) continue;
      const flash = e.flashTimer > 0;
      const sz = e.size;
      const bob = Math.sin(e.wobble) * 3;

      // Shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + sz + 2, sz * 0.6, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body — dark robed figure
      ctx.fillStyle = flash ? '#fff' : '#2a1535';
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + bob, sz * 0.7, sz, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hood / head
      ctx.fillStyle = flash ? '#fff' : '#3a2545';
      ctx.beginPath();
      ctx.arc(e.x, e.y - sz * 0.7 + bob, sz * 0.45, 0, Math.PI * 2);
      ctx.fill();

      // Glowing red eyes
      ctx.fillStyle = '#ff3333';
      const eyeGlow = Math.sin(t * 4 + e.wobble) * 0.3 + 0.7;
      ctx.globalAlpha = eyeGlow;
      ctx.beginPath();
      ctx.arc(e.x - sz * 0.15, e.y - sz * 0.7 + bob, 3, 0, Math.PI * 2);
      ctx.arc(e.x + sz * 0.15, e.y - sz * 0.7 + bob, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Red outline showing it's tappable
      ctx.strokeStyle = `rgba(255, 80, 80, ${0.3 + Math.sin(t * 3 + e.wobble) * 0.15})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y + bob, sz + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // --- Magic bolts ---
    for (const bolt of this.bolts) {
      if (!bolt.active) continue;
      const p = bolt.progress;
      const bx = bolt.x + (bolt.tx - bolt.x) * p;
      const by = bolt.y + (bolt.ty - bolt.y) * p;
      const color = bolt.side === 'left' ? COLORS.emeraldGlow : COLORS.pinkGlow;

      // Bolt trail
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 1 - p * 0.5;
      ctx.beginPath();
      ctx.moveTo(bolt.x, bolt.y);
      ctx.lineTo(bx, by);
      ctx.stroke();

      // Bolt head
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(bx, by, 5 + (1 - p) * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(bx, by, 3 + (1 - p) * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // --- Friendship gems ---
    for (const gem of this.friendshipGems) {
      if (gem.collected) continue;
      const bob = Math.sin(t * 2 + gem.x) * 5;
      const fadeAlpha = gem.timer < 2 ? gem.timer / 2 : 1;
      ctx.globalAlpha = fadeAlpha;

      // Glow (both green and pink)
      ctx.fillStyle = `rgba(0, 255, 100, ${0.12 + Math.sin(t * 3) * 0.04})`;
      ctx.beginPath();
      ctx.arc(gem.x - 5, gem.y + bob, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 100, 200, ${0.12 + Math.sin(t * 3 + 1) * 0.04})`;
      ctx.beginPath();
      ctx.arc(gem.x + 5, gem.y + bob, 18, 0, Math.PI * 2);
      ctx.fill();

      // Heart shape
      ctx.fillStyle = COLORS.gold;
      const hx = gem.x, hy = gem.y + bob;
      const hs = 10;
      ctx.beginPath();
      ctx.moveTo(hx, hy + hs * 0.3);
      ctx.bezierCurveTo(hx, hy - hs * 0.3, hx - hs, hy - hs * 0.3, hx - hs, hy + hs * 0.1);
      ctx.bezierCurveTo(hx - hs, hy + hs * 0.6, hx, hy + hs, hx, hy + hs * 1.2);
      ctx.bezierCurveTo(hx, hy + hs, hx + hs, hy + hs * 0.6, hx + hs, hy + hs * 0.1);
      ctx.bezierCurveTo(hx + hs, hy - hs * 0.3, hx, hy - hs * 0.3, hx, hy + hs * 0.3);
      ctx.fill();

      // "Tap me!" pulse ring
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = fadeAlpha * (0.3 + Math.sin(t * 4) * 0.2);
      ctx.beginPath();
      ctx.arc(gem.x, gem.y + bob, 22, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 1;
    }

    // --- Characters on sides ---
    // Elphaba on left
    drawElphaba(ctx, this.elphabaX, this.elphabaY, scale * 1.6, t, {
      sparkly: game.state.unlockedCostumes.includes('elphaba_sparkly'),
    });
    // Small label
    ctx.globalAlpha = 0.5;
    drawText(ctx, 'Elphaba', this.elphabaX, this.elphabaY + 35 * scale, 8 * scale, COLORS.emeraldGlow);
    ctx.globalAlpha = 1;

    // Glinda on right
    drawGlinda(ctx, this.glindaX, this.glindaY, scale * 1.6, t, {
      goldenWings: game.state.unlockedCostumes.includes('glinda_wings'),
      wand: true,
    });
    ctx.globalAlpha = 0.5;
    drawText(ctx, 'Glinda', this.glindaX, this.glindaY + 35 * scale, 8 * scale, COLORS.pinkGlow);
    ctx.globalAlpha = 1;

    // --- HUD ---
    drawHealth(ctx, 10, 10, game.state.health, game.state.maxHealth, true);
    drawText(ctx, `Defeated: ${this.enemiesDefeated}`, w / 2, 20, 13 * scale, COLORS.gold);
    const timeLeft = Math.max(0, 60 - Math.floor(game.state.levelTime));
    drawText(ctx, `${timeLeft}s`, w - 30 * scale, 20, 11 * scale, '#aaa');
    drawText(ctx, `Score: ${game.state.score}`, w / 2, h - 15, 10 * scale, '#aaa');

    // Gem count if any collected
    if (this.friendshipGemsCollected > 0) {
      drawText(ctx, `Hearts: ${this.friendshipGemsCollected}`, w / 2, 38, 10 * scale, COLORS.pinkGlow);
    }

    // --- Controls hint ---
    if (game.state.levelTime < 7 && !game.state.actComplete) {
      const alpha = Math.max(0, 1 - game.state.levelTime / 7);
      ctx.globalAlpha = alpha;
      drawText(ctx, 'Tap the enemies to zap them!', w / 2, h * 0.16, 16 * scale, '#fff');
      drawText(ctx, 'Don\'t let them reach the center!', w / 2, h * 0.22, 12 * scale, '#ffa');
      ctx.globalAlpha = 1;
    }

    // --- Act complete overlay ---
    if (game.state.actComplete) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, w, h);
      drawText(ctx, 'Act VIII Complete!', w / 2, h * 0.3, 28 * scale, COLORS.gold);
      drawText(ctx, `Enemies Zapped: ${this.enemiesDefeated}`, w / 2, h * 0.4, 16 * scale, COLORS.emeraldGlow);
      drawText(ctx, `Hearts Collected: ${this.friendshipGemsCollected}`, w / 2, h * 0.47, 16 * scale, COLORS.pinkGlow);
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
