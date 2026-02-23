// Act 12 — 'No Good Deed' — Spell Chain
// Chain magic runes to blast approaching shadow creatures
import { Scene, GameEngine, actIndex } from '../engine/types';
import { drawText, drawElphaba, drawGlinda, drawHUD, drawHealth, COLORS } from '../engine/renderer';
import { particlePresets } from '../engine/particles';
import { startBgMusic, stopBgMusic } from '../engine/audio';

type RuneSymbol = 'triangle' | 'square' | 'circle' | 'star';

interface Rune {
  x: number;
  y: number;
  symbol: RuneSymbol;
  color: 'green' | 'pink';
  active: boolean;
  glow: number; // animation timer
  usedInChain: boolean;
  spawnTimer: number; // delay before becoming active after spawn
}

interface ShadowCreature {
  x: number;
  y: number;
  speed: number;
  targetX: number;
  targetY: number;
  active: boolean;
  size: number;
  wobble: number;
}

export class Act12Scene implements Scene {
  // Runes
  private runes: Rune[] = [];
  private runeRespawnTimers: number[] = []; // timers for batches of runes to spawn

  // Chain state
  private chain: number[] = []; // indices into runes
  private isChaining = false;
  private chainStarted = false;

  // Creatures
  private creatures: ShadowCreature[] = [];
  private creatureSpawnTimer = 0;
  private creatureSpawnInterval = 3;

  // Player
  private centerX = 0;
  private centerY = 0;
  private health = 5;
  private invincibleTimer = 0;
  private hitFlash = 0;

  // Tracking
  private survivalTime = 0;
  private madeBigChain = false;
  private creaturesReachedCenter = 0;

  // Visual
  private lightningTimer = 0;
  private lightningFlash = 0;
  private screenShakeTimer = 0;
  private screenShakeIntensity = 0;
  private flashText = '';
  private flashTextTimer = 0;

  enter(game: GameEngine) {
    this.centerX = game.width * 0.5;
    this.centerY = game.height * 0.5;

    this.runes = [];
    this.runeRespawnTimers = [];
    this.chain = [];
    this.isChaining = false;
    this.chainStarted = false;
    this.creatures = [];
    this.creatureSpawnTimer = 0;
    this.creatureSpawnInterval = 3;
    this.health = 5;
    this.invincibleTimer = 0;
    this.hitFlash = 0;
    this.survivalTime = 0;
    this.madeBigChain = false;
    this.creaturesReachedCenter = 0;
    this.lightningTimer = 0;
    this.lightningFlash = 0;
    this.screenShakeTimer = 0;
    this.screenShakeIntensity = 0;
    this.flashText = '';
    this.flashTextTimer = 0;

    game.state.gems = 0;
    game.state.health = 5;
    game.state.maxHealth = 5;
    game.state.noHitBonus = true;
    game.state.levelTime = 0;
    game.state.actComplete = false;

    // Spawn initial runes
    this.spawnRuneBatch(game, 10);

    startBgMusic('noGoodDeed');
  }

  exit(_game: GameEngine) {
    stopBgMusic();
  }

  private spawnRuneBatch(game: GameEngine, count: number) {
    const w = game.width;
    const h = game.height;
    const margin = 50;
    const symbols: RuneSymbol[] = ['triangle', 'square', 'circle', 'star'];

    for (let i = 0; i < count; i++) {
      let x: number;
      let y: number;
      let attempts = 0;

      // Find a position that doesn't overlap other runes and isn't too close to center
      do {
        x = margin + Math.random() * (w - margin * 2);
        y = margin + 60 + Math.random() * (h - margin * 2 - 80);
        attempts++;
      } while (attempts < 30 && this.isTooCloseToExistingRune(x, y, 60));

      this.runes.push({
        x,
        y,
        symbol: symbols[Math.floor(Math.random() * symbols.length)],
        color: i % 2 === 0 ? 'green' : 'pink',
        active: true,
        glow: Math.random() * Math.PI * 2,
        usedInChain: false,
        spawnTimer: 0,
      });
    }
  }

  private isTooCloseToExistingRune(x: number, y: number, minDist: number): boolean {
    for (const r of this.runes) {
      if (!r.active) continue;
      const dx = r.x - x;
      const dy = r.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < minDist) return true;
    }
    return false;
  }

  update(game: GameEngine, dt: number) {
    if (game.state.actComplete) return;

    this.survivalTime += dt;
    game.state.levelTime += dt;

    // Update invincibility
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    // Lightning flashes
    this.lightningTimer += dt;
    if (this.lightningTimer > 4 + Math.random() * 3) {
      this.lightningTimer = 0;
      this.lightningFlash = 0.3;
    }
    if (this.lightningFlash > 0) this.lightningFlash -= dt * 2;

    // Screen shake
    if (this.screenShakeTimer > 0) this.screenShakeTimer -= dt;

    // Flash text
    if (this.flashTextTimer > 0) this.flashTextTimer -= dt;

    // Rune glow animation
    for (const rune of this.runes) {
      if (rune.active) {
        rune.glow += dt * 2;
        if (rune.spawnTimer > 0) rune.spawnTimer -= dt;
      }
    }

    // Rune respawn timers
    for (let i = this.runeRespawnTimers.length - 1; i >= 0; i--) {
      this.runeRespawnTimers[i] -= dt;
      if (this.runeRespawnTimers[i] <= 0) {
        this.runeRespawnTimers.splice(i, 1);
        // Count current active runes
        const activeCount = this.runes.filter(r => r.active).length;
        const toSpawn = Math.max(0, 10 - activeCount);
        if (toSpawn > 0) this.spawnRuneBatch(game, toSpawn);
      }
    }

    // Creature spawn ramp
    this.creatureSpawnInterval = Math.max(1.5, 3 - this.survivalTime * 0.03);
    this.creatureSpawnTimer += dt;
    if (this.creatureSpawnTimer >= this.creatureSpawnInterval) {
      this.creatureSpawnTimer = 0;
      this.spawnCreature(game);
    }

    // Update creatures
    const cx = this.centerX;
    const cy = this.centerY;
    for (const c of this.creatures) {
      if (!c.active) continue;
      c.wobble += dt * 3;
      const dx = c.targetX - c.x;
      const dy = c.targetY - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1) {
        c.x += (dx / dist) * c.speed * dt;
        c.y += (dy / dist) * c.speed * dt;
      }

      // Check if creature reached center
      const dcx = c.x - cx;
      const dcy = c.y - cy;
      if (Math.sqrt(dcx * dcx + dcy * dcy) < 30) {
        c.active = false;
        this.creaturesReachedCenter++;
        game.state.noHitBonus = false;

        if (this.invincibleTimer <= 0) {
          this.health--;
          game.state.health = this.health;
          this.invincibleTimer = 1.5;
          this.hitFlash = 0.3;
          game.playSound('hit');
          game.shakeCamera(8, 0.3);

          if (this.health <= 0) {
            // Restart act
            this.enter(game);
            return;
          }
        }
      }
    }

    // Clean dead creatures
    this.creatures = this.creatures.filter(c => c.active);

    // Touch input for chaining
    this.handleChainInput(game);

    // Win condition: survive 50 seconds
    if (this.survivalTime >= 50) {
      game.state.actComplete = true;
      this.completeAct(game);
    }
  }

  private spawnCreature(game: GameEngine) {
    const w = game.width;
    const h = game.height;
    const edge = Math.floor(Math.random() * 4);
    let x: number;
    let y: number;

    switch (edge) {
      case 0: x = Math.random() * w; y = -20; break;     // top
      case 1: x = w + 20; y = Math.random() * h; break;  // right
      case 2: x = Math.random() * w; y = h + 20; break;  // bottom
      default: x = -20; y = Math.random() * h; break;     // left
    }

    this.creatures.push({
      x,
      y,
      speed: 20 + Math.random() * 15,
      targetX: this.centerX,
      targetY: this.centerY,
      active: true,
      size: 18 + Math.random() * 10,
      wobble: Math.random() * Math.PI * 2,
    });
  }

  private handleChainInput(game: GameEngine) {
    if (game.input.isTouching) {
      const tx = game.input.touchX;
      const ty = game.input.touchY;

      if (!this.isChaining) {
        // Check if touching a rune to start chain
        const idx = this.findRuneAt(tx, ty, 40);
        if (idx >= 0 && this.runes[idx].spawnTimer <= 0) {
          this.isChaining = true;
          this.chainStarted = true;
          this.chain = [idx];
          this.runes[idx].usedInChain = true;
          game.playSound('catchItem');
        }
      } else {
        // Extend chain — find nearby unused rune
        const lastIdx = this.chain[this.chain.length - 1];
        const lastRune = this.runes[lastIdx];
        const idx = this.findRuneNear(tx, ty, lastRune.x, lastRune.y, 120, 40);
        if (idx >= 0 && !this.runes[idx].usedInChain && this.runes[idx].spawnTimer <= 0) {
          this.chain.push(idx);
          this.runes[idx].usedInChain = true;
          game.playSound('catchItem');
        }
      }
    } else if (this.chainStarted && !game.input.isTouching) {
      // Finger lifted — cast spell
      if (this.chain.length >= 2) {
        this.castSpell(game);
      }
      // Reset chain
      for (const idx of this.chain) {
        if (idx < this.runes.length) {
          this.runes[idx].usedInChain = false;
        }
      }
      this.chain = [];
      this.isChaining = false;
      this.chainStarted = false;
    }
  }

  private findRuneAt(x: number, y: number, radius: number): number {
    for (let i = 0; i < this.runes.length; i++) {
      const r = this.runes[i];
      if (!r.active) continue;
      const dx = r.x - x;
      const dy = r.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < radius) return i;
    }
    return -1;
  }

  private findRuneNear(touchX: number, touchY: number, fromX: number, fromY: number, maxChainDist: number, touchRadius: number): number {
    for (let i = 0; i < this.runes.length; i++) {
      const r = this.runes[i];
      if (!r.active || r.usedInChain) continue;
      // Must be close to touch point
      const dtx = r.x - touchX;
      const dty = r.y - touchY;
      if (Math.sqrt(dtx * dtx + dty * dty) > touchRadius) continue;
      // Must be within chain distance of last rune
      const dfx = r.x - fromX;
      const dfy = r.y - fromY;
      if (Math.sqrt(dfx * dfx + dfy * dfy) > maxChainDist) continue;
      return i;
    }
    return -1;
  }

  private castSpell(game: GameEngine) {
    const chainLen = this.chain.length;
    const isElphaba = game.state.character === 'elphaba';

    // Calculate center of chain
    let avgX = 0;
    let avgY = 0;
    for (const idx of this.chain) {
      avgX += this.runes[idx].x;
      avgY += this.runes[idx].y;
    }
    avgX /= chainLen;
    avgY /= chainLen;

    // Determine blast radius
    let blastRadius: number;
    if (chainLen >= 6) {
      blastRadius = Math.max(game.width, game.height); // full screen clear
      this.madeBigChain = true;
      this.flashText = 'NO GOOD DEED!';
      this.flashTextTimer = 1.5;
      this.screenShakeTimer = 0.5;
      this.screenShakeIntensity = 12;
      game.shakeCamera(12, 0.5);
      game.playSound('powerUp');
      // Big explosion particles
      for (let i = 0; i < 8; i++) {
        const px = Math.random() * game.width;
        const py = Math.random() * game.height * 0.7;
        game.spawnParticles(particlePresets.explosion(px, py));
      }
      game.spawnParticles(particlePresets.confetti(game.width * 0.5, game.height * 0.3));
    } else if (chainLen >= 4) {
      blastRadius = 200;
      this.screenShakeTimer = 0.2;
      this.screenShakeIntensity = 6;
      game.shakeCamera(6, 0.2);
      game.playSound('powerUp');
      game.spawnParticles(particlePresets.explosion(avgX, avgY));
    } else {
      blastRadius = 100;
      game.spawnParticles(isElphaba
        ? particlePresets.greenMagic(avgX, avgY)
        : particlePresets.pinkMagic(avgX, avgY));
    }

    // Destroy creatures in blast radius
    for (const c of this.creatures) {
      if (!c.active) continue;
      const dx = c.x - avgX;
      const dy = c.y - avgY;
      if (Math.sqrt(dx * dx + dy * dy) < blastRadius) {
        c.active = false;
        game.state.score += 100;
        game.state.gems++;
        game.spawnParticles(particlePresets.explosion(c.x, c.y));
      }
    }

    // Score bonus for chain length
    game.state.score += chainLen * 50;

    // Remove used runes and schedule respawn
    for (const idx of this.chain) {
      if (idx < this.runes.length) {
        this.runes[idx].active = false;
      }
    }

    // Spawn line particles along chain
    for (let i = 0; i < this.chain.length - 1; i++) {
      const r1 = this.runes[this.chain[i]];
      const r2 = this.runes[this.chain[i + 1]];
      const mx = (r1.x + r2.x) / 2;
      const my = (r1.y + r2.y) / 2;
      game.spawnParticles(isElphaba
        ? particlePresets.greenMagic(mx, my)
        : particlePresets.pinkMagic(mx, my));
    }

    // Schedule rune respawn
    this.runeRespawnTimers.push(2);
  }

  private completeAct(game: GameEngine) {
    let stars = 1;
    if (this.madeBigChain) stars++;
    if (this.creaturesReachedCenter === 0) stars++;
    game.state.stars.act12 = Math.max(game.state.stars.act12, stars);

    if (!game.state.lastCompletedAct || actIndex(game.state.lastCompletedAct) < actIndex('act12')) {
      game.state.lastCompletedAct = 'act12';
    }
    game.saveGame();
    game.playSound('actComplete');

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        game.spawnParticles(particlePresets.confetti(Math.random() * game.width, game.height * 0.3));
      }, i * 200);
    }

    setTimeout(() => {
      game.state.currentAct = 'act13';
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

    // Save context for screen shake
    ctx.save();
    if (this.screenShakeTimer > 0) {
      const shk = this.screenShakeIntensity * (this.screenShakeTimer / 0.5);
      ctx.translate(
        (Math.random() - 0.5) * shk,
        (Math.random() - 0.5) * shk
      );
    }

    // Dark stormy background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#120020');
    bgGrad.addColorStop(0.4, '#1a0035');
    bgGrad.addColorStop(0.7, '#0f0028');
    bgGrad.addColorStop(1, '#080015');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Storm clouds at top
    ctx.fillStyle = 'rgba(40, 0, 60, 0.6)';
    for (let i = 0; i < 10; i++) {
      const cx = ((i * 137 + t * 8) % (w + 160)) - 80;
      const cy = 20 + (i * 31) % 60;
      const cw = 100 + (i * 17) % 80;
      ctx.beginPath();
      ctx.ellipse(cx, cy, cw, 25, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lightning flash overlay
    if (this.lightningFlash > 0) {
      ctx.fillStyle = `rgba(180, 150, 255, ${this.lightningFlash})`;
      ctx.fillRect(0, 0, w, h);

      // Lightning bolt
      ctx.strokeStyle = `rgba(200, 180, 255, ${this.lightningFlash * 2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const lx = w * 0.3 + Math.random() * w * 0.4;
      ctx.moveTo(lx, 0);
      let ly = 0;
      for (let i = 0; i < 6; i++) {
        ly += h * 0.12;
        const lxOff = (Math.random() - 0.5) * 40;
        ctx.lineTo(lx + lxOff, ly);
      }
      ctx.stroke();
    }

    // Draw shadow creatures
    for (const c of this.creatures) {
      if (!c.active) continue;
      this.drawCreature(ctx, c, t, scale);
    }

    // Draw runes
    for (let i = 0; i < this.runes.length; i++) {
      const rune = this.runes[i];
      if (!rune.active || rune.spawnTimer > 0) continue;
      this.drawRune(ctx, rune, i, t, scale);
    }

    // Draw chain lines
    if (this.chain.length >= 2) {
      ctx.strokeStyle = isElphaba ? COLORS.emeraldGlow : COLORS.pinkGlow;
      ctx.lineWidth = 3 * scale;
      ctx.shadowColor = isElphaba ? COLORS.emeraldGlow : COLORS.pinkGlow;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      const first = this.runes[this.chain[0]];
      ctx.moveTo(first.x, first.y);
      for (let i = 1; i < this.chain.length; i++) {
        const r = this.runes[this.chain[i]];
        ctx.lineTo(r.x, r.y);
      }
      ctx.stroke();

      // Crackling sparks along chain
      for (let i = 0; i < this.chain.length - 1; i++) {
        const r1 = this.runes[this.chain[i]];
        const r2 = this.runes[this.chain[i + 1]];
        const prog = (Math.sin(t * 10 + i) + 1) / 2;
        const sx = r1.x + (r2.x - r1.x) * prog;
        const sy = r1.y + (r2.y - r1.y) * prog;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(sx + (Math.random() - 0.5) * 8, sy + (Math.random() - 0.5) * 8, 2 * scale, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
    }

    // Draw chain line from last rune to finger position
    if (this.isChaining && this.chain.length >= 1 && game.input.isTouching) {
      const last = this.runes[this.chain[this.chain.length - 1]];
      ctx.strokeStyle = isElphaba
        ? 'rgba(50, 255, 100, 0.5)'
        : 'rgba(255, 150, 200, 0.5)';
      ctx.lineWidth = 2 * scale;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(game.input.touchX, game.input.touchY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw player character at center
    const charScale = scale * 1.4;
    if (this.invincibleTimer > 0 && Math.sin(t * 20) > 0) {
      ctx.globalAlpha = 0.5;
    }
    if (isElphaba) {
      drawElphaba(ctx, this.centerX, this.centerY, charScale, t);
    } else {
      drawGlinda(ctx, this.centerX, this.centerY, charScale, t);
    }
    ctx.globalAlpha = 1;

    // Protective aura around character
    const auraAlpha = 0.15 + Math.sin(t * 3) * 0.05;
    const auraGrad = ctx.createRadialGradient(
      this.centerX, this.centerY, 10,
      this.centerX, this.centerY, 50
    );
    auraGrad.addColorStop(0, isElphaba
      ? `rgba(50, 255, 100, ${auraAlpha})`
      : `rgba(255, 150, 200, ${auraAlpha})`);
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(this.centerX, this.centerY, 50, 0, Math.PI * 2);
    ctx.fill();

    // Hit flash overlay
    if (this.hitFlash > 0) {
      ctx.fillStyle = `rgba(255, 0, 0, ${this.hitFlash})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Flash text (e.g. "NO GOOD DEED!")
    if (this.flashTextTimer > 0) {
      const flashAlpha = Math.min(1, this.flashTextTimer / 0.5);
      const flashScale = 1 + (1.5 - this.flashTextTimer) * 0.3;
      ctx.save();
      ctx.globalAlpha = flashAlpha;
      ctx.translate(w / 2, h * 0.25);
      ctx.scale(flashScale, flashScale);
      drawText(ctx, this.flashText, 0, 0, 28 * scale, isElphaba ? COLORS.emeraldGlow : COLORS.pinkGlow);
      ctx.restore();
    }

    // Health display
    drawHealth(ctx, w - 150, 30, this.health, 5, isElphaba);

    // HUD
    drawHUD(ctx, game);

    // Timer
    const remaining = Math.max(0, Math.ceil(50 - this.survivalTime));
    drawText(ctx, `${remaining}s`, w / 2, h - 30, 16 * scale, '#ddd');

    // Chain length indicator
    if (this.chain.length > 0) {
      drawText(ctx, `Chain: ${this.chain.length}`, w / 2, 70, 14 * scale, COLORS.gold);
    }

    // Controls hint
    if (game.state.levelTime < 5) {
      const alpha = Math.max(0, 1 - game.state.levelTime / 5);
      ctx.globalAlpha = alpha;
      drawText(ctx, 'Drag between runes to chain spells!', w / 2, h * 0.82, 13 * scale, '#fff');
      drawText(ctx, 'Blast the shadow creatures!', w / 2, h * 0.87, 11 * scale, '#ccc');
      ctx.globalAlpha = 1;
    }

    // Act complete overlay
    if (game.state.actComplete) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, w, h);
      drawText(ctx, 'Act XII Complete!', w / 2, h * 0.3, 28 * scale, COLORS.gold);
      drawText(ctx, `Creatures Stopped: ${this.creatures.length === 0 ? 'All' : 'Most'}`, w / 2, h * 0.42, 16 * scale, COLORS.pinkGlow);
      drawText(ctx, `Score: ${game.state.score}`, w / 2, h * 0.49, 18 * scale, '#fff');

      const stars = game.state.stars.act12;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < stars ? COLORS.gold : 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        for (let si = 0; si < 10; si++) {
          const r = si % 2 === 0 ? 15 * scale : 7 * scale;
          const angle = (si * Math.PI) / 5 - Math.PI / 2;
          const sx = w / 2 - 40 * scale + i * 40 * scale + Math.cos(angle) * r;
          const sy = h * 0.6 + Math.sin(angle) * r;
          if (si === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore(); // end screen shake
  }

  private drawRune(ctx: CanvasRenderingContext2D, rune: Rune, _index: number, time: number, scale: number) {
    const { x, y, symbol, color, glow, usedInChain } = rune;
    const radius = 22 * scale;

    // Outer glow
    const glowAlpha = 0.3 + Math.sin(glow) * 0.15;
    const glowColor = color === 'green'
      ? `rgba(50, 255, 100, ${glowAlpha})`
      : `rgba(255, 150, 200, ${glowAlpha})`;
    const glowGrad = ctx.createRadialGradient(x, y, radius * 0.5, x, y, radius * 1.8);
    glowGrad.addColorStop(0, glowColor);
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Rune circle
    ctx.fillStyle = usedInChain
      ? (color === 'green' ? 'rgba(50, 255, 100, 0.6)' : 'rgba(255, 150, 200, 0.6)')
      : 'rgba(20, 10, 40, 0.8)';
    ctx.strokeStyle = color === 'green' ? COLORS.emeraldGlow : COLORS.pinkGlow;
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner symbol
    ctx.fillStyle = color === 'green' ? COLORS.emeraldGlow : COLORS.pinkGlow;
    ctx.strokeStyle = color === 'green' ? COLORS.emeraldGlow : COLORS.pinkGlow;
    ctx.lineWidth = 1.5 * scale;

    const ss = radius * 0.5; // symbol scale
    switch (symbol) {
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(x, y - ss);
        ctx.lineTo(x - ss * 0.87, y + ss * 0.5);
        ctx.lineTo(x + ss * 0.87, y + ss * 0.5);
        ctx.closePath();
        ctx.stroke();
        break;
      case 'square':
        ctx.strokeRect(x - ss * 0.7, y - ss * 0.7, ss * 1.4, ss * 1.4);
        break;
      case 'circle':
        ctx.beginPath();
        ctx.arc(x, y, ss * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        break;
      case 'star':
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? ss : ss * 0.4;
          const angle = (i * Math.PI) / 5 - Math.PI / 2 + time * 0.5;
          const px = x + Math.cos(angle) * r;
          const py = y + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
        break;
    }

    // Highlight if in chain
    if (usedInChain) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, radius + 4 * scale, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawCreature(ctx: CanvasRenderingContext2D, creature: ShadowCreature, time: number, scale: number) {
    const { x, y, size, wobble } = creature;
    const wobbleX = Math.sin(wobble) * 3;
    const wobbleY = Math.cos(wobble * 1.3) * 2;

    // Shadow body (dark purple blob)
    ctx.fillStyle = 'rgba(40, 0, 60, 0.9)';
    ctx.beginPath();
    ctx.ellipse(
      x + wobbleX, y + wobbleY,
      size * scale, size * 0.8 * scale,
      0, 0, Math.PI * 2
    );
    ctx.fill();

    // Darker inner
    ctx.fillStyle = 'rgba(20, 0, 30, 0.8)';
    ctx.beginPath();
    ctx.ellipse(
      x + wobbleX, y + wobbleY + 2,
      size * 0.7 * scale, size * 0.5 * scale,
      0, 0, Math.PI * 2
    );
    ctx.fill();

    // Red dot eyes
    ctx.fillStyle = '#ff2222';
    const eyeSpread = size * 0.25 * scale;
    ctx.beginPath();
    ctx.arc(x + wobbleX - eyeSpread, y + wobbleY - size * 0.15 * scale, 2.5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + wobbleX + eyeSpread, y + wobbleY - size * 0.15 * scale, 2.5 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Smoky trail
    ctx.fillStyle = `rgba(40, 0, 60, ${0.2 + Math.sin(time * 3 + wobble) * 0.1})`;
    ctx.beginPath();
    ctx.ellipse(
      x + wobbleX - wobbleX * 2, y + wobbleY - wobbleY * 2,
      size * 0.5 * scale, size * 0.3 * scale,
      0, 0, Math.PI * 2
    );
    ctx.fill();
  }
}
