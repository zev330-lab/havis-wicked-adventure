// Act 13 — 'As Long As You're Mine' — Pair Flight
// Both Elphaba and Glinda fly upward together following the player's finger
import { Scene, GameEngine, actIndex } from '../engine/types';
import { drawText, drawElphaba, drawGlinda, drawGem, drawHUD, drawHealth, COLORS } from '../engine/renderer';
import { particlePresets } from '../engine/particles';
import { startBgMusic, stopBgMusic } from '../engine/audio';

interface CloudObstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  side: 'left' | 'right' | 'center';
  speed: number;
}

interface HeartPickup {
  leftX: number;
  leftY: number;
  rightX: number;
  rightY: number;
  active: boolean;
  leftCollected: boolean;
  rightCollected: boolean;
  glow: number;
}

interface GemPickup {
  x: number;
  y: number;
  active: boolean;
  side: 'left' | 'right';
  glow: number;
}

interface DuetMoment {
  y: number;
  active: boolean;
  ringRadius: number;
  pulseTimer: number;
  collected: boolean;
}

export class Act13Scene implements Scene {
  // Characters
  private elphabaX = 0;
  private elphabaY = 0;
  private glindaX = 0;
  private glindaY = 0;
  private baseElphabaX = 0;
  private baseGlindaX = 0;
  private charY = 0;

  // Scroll
  private scrollOffset = 0;
  private scrollSpeed = 80;

  // Obstacles & pickups
  private clouds: CloudObstacle[] = [];
  private cloudSpawnTimer = 0;
  private hearts: HeartPickup[] = [];
  private heartSpawnTimer = 0;
  private gems: GemPickup[] = [];
  private gemSpawnTimer = 0;
  private duets: DuetMoment[] = [];
  private duetSpawnTimer = 0;

  // Beam health
  private beamHealth = 3;
  private beamMaxHealth = 3;
  private beamInvincible = 0;
  private hitFlash = 0;

  // Tracking
  private survivalTime = 0;
  private heartPairsCollected = 0;
  private beamNeverBelowTwo = true;
  private trailTimer = 0;
  private sparkleTimer = 0;

  // Aurora
  private auroraOffset = 0;

  enter(game: GameEngine) {
    const w = game.width;
    const h = game.height;

    this.baseElphabaX = w * 0.3;
    this.baseGlindaX = w * 0.7;
    this.elphabaX = this.baseElphabaX;
    this.glindaX = this.baseGlindaX;
    this.charY = h * 0.7;
    this.elphabaY = this.charY;
    this.glindaY = this.charY;

    this.scrollOffset = 0;
    this.scrollSpeed = 80;
    this.clouds = [];
    this.cloudSpawnTimer = 0;
    this.hearts = [];
    this.heartSpawnTimer = 0;
    this.gems = [];
    this.gemSpawnTimer = 0;
    this.duets = [];
    this.duetSpawnTimer = 0;

    this.beamHealth = 3;
    this.beamMaxHealth = 3;
    this.beamInvincible = 0;
    this.hitFlash = 0;

    this.survivalTime = 0;
    this.heartPairsCollected = 0;
    this.beamNeverBelowTwo = true;
    this.trailTimer = 0;
    this.sparkleTimer = 0;
    this.auroraOffset = 0;

    game.state.gems = 0;
    game.state.health = 3;
    game.state.maxHealth = 3;
    game.state.noHitBonus = true;
    game.state.levelTime = 0;
    game.state.actComplete = false;

    startBgMusic('asLongAsYoureMine');
  }

  exit(_game: GameEngine) {
    stopBgMusic();
  }

  update(game: GameEngine, dt: number) {
    if (game.state.actComplete) return;

    this.survivalTime += dt;
    game.state.levelTime += dt;
    this.scrollOffset += this.scrollSpeed * dt;
    this.auroraOffset += dt * 5;

    // Timers
    if (this.beamInvincible > 0) this.beamInvincible -= dt;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    this.trailTimer += dt;
    this.sparkleTimer += dt;
    this.cloudSpawnTimer += dt;
    this.heartSpawnTimer += dt;
    this.gemSpawnTimer += dt;
    this.duetSpawnTimer += dt;

    const w = game.width;
    const h = game.height;
    const centerX = w * 0.5;

    // Player movement — both characters follow finger together with horizontal offset
    const pairOffset = 25 * (w / 390); // scaled horizontal offset between characters

    if (game.input.isTouching) {
      const targetX = game.input.touchX;
      const targetY = game.input.touchY;

      // Smoothly follow touch — compute center point between both characters
      const pairCenterX = (this.elphabaX + this.glindaX) / 2;
      const pairCenterY = (this.elphabaY + this.glindaY) / 2;
      const newCX = pairCenterX + (targetX - pairCenterX) * Math.min(1, dt * 10);
      const newCY = pairCenterY + (targetY - pairCenterY) * Math.min(1, dt * 10);

      // Clamp so neither character goes off-screen
      const clampedCX = Math.max(25 + pairOffset, Math.min(w - 25 - pairOffset, newCX));
      const clampedCY = Math.max(80, Math.min(h - 50, newCY));

      this.elphabaX = clampedCX - pairOffset;
      this.glindaX = clampedCX + pairOffset;
      this.elphabaY = clampedCY;
      this.glindaY = clampedCY;
    }

    // Keyboard fallback — both move together
    if (game.input.left) {
      const shift = 200 * dt;
      const newEX = Math.max(25, this.elphabaX - shift);
      this.elphabaX = newEX;
      this.glindaX = newEX + pairOffset * 2;
    }
    if (game.input.right) {
      const shift = 200 * dt;
      const newGX = Math.min(w - 25, this.glindaX + shift);
      this.glindaX = newGX;
      this.elphabaX = newGX - pairOffset * 2;
    }
    if (game.input.up) {
      const newY = Math.max(80, this.elphabaY - 200 * dt);
      this.elphabaY = newY;
      this.glindaY = newY;
    }
    if (game.input.down) {
      const newY = Math.min(h - 50, this.elphabaY + 200 * dt);
      this.elphabaY = newY;
      this.glindaY = newY;
    }

    // Spawn clouds
    const cloudInterval = Math.max(0.6, 1.2 - this.survivalTime * 0.008);
    if (this.cloudSpawnTimer > cloudInterval) {
      this.cloudSpawnTimer = 0;
      this.spawnCloud(game);
    }

    // Move clouds downward (screen scrolls up, so clouds come from top)
    for (const cloud of this.clouds) {
      cloud.y += cloud.speed * dt;
    }
    this.clouds = this.clouds.filter(c => c.y < h + 60);

    // Cloud collisions
    if (this.beamInvincible <= 0) {
      for (const cloud of this.clouds) {
        if (this.checkCharCloudCollision(this.elphabaX, this.elphabaY, cloud) ||
            this.checkCharCloudCollision(this.glindaX, this.glindaY, cloud)) {
          this.beamHealth--;
          game.state.health = this.beamHealth;
          this.beamInvincible = 1.0;
          this.hitFlash = 0.2;
          game.playSound('hit');
          game.shakeCamera(5, 0.2);
          if (this.beamHealth < 2) this.beamNeverBelowTwo = false;

          if (this.beamHealth <= 0) {
            // Restart
            this.enter(game);
            return;
          }
          break; // Only one hit per frame
        }
      }
    }

    // Spawn heart pairs every 8 seconds
    if (this.heartSpawnTimer >= 8) {
      this.heartSpawnTimer = 0;
      this.spawnHeartPair(game);
    }

    // Update hearts
    for (const heart of this.hearts) {
      if (!heart.active) continue;
      heart.glow += dt * 3;
      heart.leftY += this.scrollSpeed * dt;
      heart.rightY += this.scrollSpeed * dt;

      // Check collection
      if (!heart.leftCollected) {
        const dx = this.elphabaX - heart.leftX;
        const dy = this.elphabaY - heart.leftY;
        if (Math.sqrt(dx * dx + dy * dy) < 30) {
          heart.leftCollected = true;
          game.playSound('catchItem');
          game.spawnParticles(particlePresets.pinkMagic(heart.leftX, heart.leftY));
        }
      }
      if (!heart.rightCollected) {
        const dx = this.glindaX - heart.rightX;
        const dy = this.glindaY - heart.rightY;
        if (Math.sqrt(dx * dx + dy * dy) < 30) {
          heart.rightCollected = true;
          game.playSound('catchItem');
          game.spawnParticles(particlePresets.pinkMagic(heart.rightX, heart.rightY));
        }
      }

      // Both collected = restore beam health
      if (heart.leftCollected && heart.rightCollected) {
        heart.active = false;
        this.heartPairsCollected++;
        this.beamHealth = Math.min(this.beamMaxHealth, this.beamHealth + 1);
        game.state.health = this.beamHealth;
        game.playSound('powerUp');
        game.spawnParticles(particlePresets.confetti(w * 0.5, this.elphabaY));
      }

      // Off screen
      if (heart.leftY > h + 40) heart.active = false;
    }
    this.hearts = this.hearts.filter(h => h.active);

    // Spawn gems
    if (this.gemSpawnTimer >= 3) {
      this.gemSpawnTimer = 0;
      this.spawnGem(game);
    }

    // Update gems
    for (const gem of this.gems) {
      if (!gem.active) continue;
      gem.y += this.scrollSpeed * dt;
      gem.glow += dt * 4;

      // Check collection by either character
      const edx = this.elphabaX - gem.x;
      const edy = this.elphabaY - gem.y;
      const gdx = this.glindaX - gem.x;
      const gdy = this.glindaY - gem.y;
      if (Math.sqrt(edx * edx + edy * edy) < 25 || Math.sqrt(gdx * gdx + gdy * gdy) < 25) {
        gem.active = false;
        game.state.gems++;
        game.state.score += 100;
        game.playSound('catchItem');
        game.spawnParticles(particlePresets.gemCollect(gem.x, gem.y, true));
      }

      if (gem.y > h + 30) gem.active = false;
    }
    this.gems = this.gems.filter(g => g.active);

    // Duet moments every 15 seconds
    if (this.duetSpawnTimer >= 15) {
      this.duetSpawnTimer = 0;
      this.duets.push({
        y: -40,
        active: true,
        ringRadius: 60,
        pulseTimer: 0,
        collected: false,
      });
    }

    // Update duets
    for (const duet of this.duets) {
      if (!duet.active) continue;
      duet.y += this.scrollSpeed * dt;
      duet.pulseTimer += dt;

      const duetX = w * 0.5;
      // Check if both characters are close to center
      const eDist = Math.sqrt(
        (this.elphabaX - duetX) ** 2 + (this.elphabaY - duet.y) ** 2
      );
      const gDist = Math.sqrt(
        (this.glindaX - duetX) ** 2 + (this.glindaY - duet.y) ** 2
      );
      if (eDist < duet.ringRadius && gDist < duet.ringRadius && !duet.collected) {
        duet.collected = true;
        duet.active = false;
        game.state.score += 500;
        game.playSound('powerUp');
        game.spawnParticles(particlePresets.confetti(duetX, duet.y));
        game.spawnParticles(particlePresets.confetti(duetX, duet.y));
      }

      if (duet.y > h + 80) duet.active = false;
    }
    this.duets = this.duets.filter(d => d.active);

    // Trail particles
    if (this.trailTimer > 0.1) {
      this.trailTimer = 0;
      game.spawnParticles(particlePresets.trail(this.elphabaX, this.elphabaY + 20, true));
      game.spawnParticles(particlePresets.trail(this.glindaX, this.glindaY + 20, false));
    }

    // Update game state health for HUD
    game.state.health = this.beamHealth;
    game.state.maxHealth = this.beamMaxHealth;

    // Win condition
    if (this.survivalTime >= 50) {
      game.state.actComplete = true;
      this.completeAct(game);
    }
  }

  private spawnCloud(game: GameEngine) {
    const w = game.width;

    // Spawn 1-2 clouds across full width, leaving a navigable gap near the pair
    const pairCenterX = (this.elphabaX + this.glindaX) / 2;
    const gapSize = 90; // gap wide enough for both characters to pass
    const cloudCount = Math.random() < 0.4 ? 2 : 1;

    for (let i = 0; i < cloudCount; i++) {
      const cloudW = 60 + Math.random() * 80;

      // Pick a random x, but avoid the gap around the pair center
      let x: number;
      if (Math.random() < 0.5) {
        x = cloudW * 0.5 + Math.random() * Math.max(0, pairCenterX - gapSize - cloudW * 0.5);
      } else {
        const rightStart = pairCenterX + gapSize;
        x = rightStart + Math.random() * Math.max(0, w - rightStart - cloudW * 0.5);
      }
      x = Math.max(cloudW * 0.5, Math.min(w - cloudW * 0.5, x));

      // Check overlap with existing clouds near the top (y < 60)
      const overlaps = this.clouds.some(c => {
        if (c.y > 80) return false; // only check clouds still near spawn area
        const minDist = (c.w + cloudW) * 0.45; // minimum horizontal gap between centers
        return Math.abs(c.x - x) < minDist && Math.abs(c.y - (-40)) < 40;
      });
      if (overlaps) continue; // skip this cloud if it would overlap

      const side: 'left' | 'right' = x < w * 0.5 ? 'left' : 'right';

      this.clouds.push({
        x,
        y: -40,
        w: cloudW,
        h: 20 + Math.random() * 15,
        side,
        speed: this.scrollSpeed + (Math.random() - 0.5) * 20,
      });
    }
  }

  private checkCharCloudCollision(charX: number, charY: number, cloud: CloudObstacle): boolean {
    // Simple ellipse-point collision
    const dx = charX - cloud.x;
    const dy = charY - cloud.y;
    const nx = dx / (cloud.w * 0.5 + 12); // character radius ~12
    const ny = dy / (cloud.h * 0.5 + 12);
    return (nx * nx + ny * ny) < 1;
  }

  private spawnHeartPair(game: GameEngine) {
    const w = game.width;
    const centerX = w * 0.5;

    this.hearts.push({
      leftX: 30 + Math.random() * (centerX - 60),
      leftY: -30,
      rightX: centerX + 30 + Math.random() * (centerX - 60),
      rightY: -30,
      active: true,
      leftCollected: false,
      rightCollected: false,
      glow: 0,
    });
  }

  private spawnGem(game: GameEngine) {
    const w = game.width;
    const x = 30 + Math.random() * (w - 60);
    const side: 'left' | 'right' = x < w * 0.5 ? 'left' : 'right';

    this.gems.push({
      x,
      y: -20,
      active: true,
      side,
      glow: 0,
    });
  }

  private completeAct(game: GameEngine) {
    let stars = 1;
    if (this.heartPairsCollected >= 4) stars++;
    if (this.beamNeverBelowTwo) stars++;
    game.state.stars.act13 = Math.max(game.state.stars.act13, stars);

    if (!game.state.lastCompletedAct || actIndex(game.state.lastCompletedAct) < actIndex('act13')) {
      game.state.lastCompletedAct = 'act13';
    }
    game.saveGame();
    game.playSound('actComplete');

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        game.spawnParticles(particlePresets.confetti(Math.random() * game.width, game.height * 0.3));
      }, i * 200);
    }

    setTimeout(() => {
      game.state.currentAct = 'act14';
      game.state.storyCardIndex = 0;
      game.transitionTo('storyCard');
    }, 2500);
  }

  render(game: GameEngine, ctx: CanvasRenderingContext2D) {
    const w = game.width;
    const h = game.height;
    const scale = game.getScale();
    const t = game.time;

    // Night sky background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#040015');
    bgGrad.addColorStop(0.3, '#0a0030');
    bgGrad.addColorStop(0.6, '#0d0040');
    bgGrad.addColorStop(1, '#060025');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Stars in the sky
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 60; i++) {
      const sx = (i * 137.5) % w;
      const sy = ((i * 73.1 + this.scrollOffset * 0.05) % (h * 0.85));
      const twinkle = Math.sin(t * 2 + i * 1.7) * 0.5 + 0.5;
      ctx.globalAlpha = twinkle * 0.8;
      const starSize = 0.8 + (i % 3);
      ctx.beginPath();
      ctx.arc(sx, sy, starSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Aurora borealis — soft horizontal color bands
    this.drawAurora(ctx, w, h, t);

    // Draw duet moment rings
    for (const duet of this.duets) {
      if (!duet.active) continue;
      this.drawDuetRing(ctx, w, duet, t, scale);
    }

    // Draw clouds
    for (const cloud of this.clouds) {
      this.drawCloud(ctx, cloud, scale);
    }

    // Draw heart pickups
    for (const heart of this.hearts) {
      if (!heart.active) continue;
      if (!heart.leftCollected) {
        this.drawHeart(ctx, heart.leftX, heart.leftY, scale, t, heart.glow, true);
      }
      if (!heart.rightCollected) {
        this.drawHeart(ctx, heart.rightX, heart.rightY, scale, t, heart.glow, false);
      }
    }

    // Draw gems
    for (const gem of this.gems) {
      if (!gem.active) continue;
      drawGem(ctx, gem.x, gem.y, 8 * scale, gem.side === 'left', t);
    }

    // Connection beam between characters
    this.drawConnectionBeam(ctx, t, scale);

    // Draw characters in hugging pose
    const charScale = scale * 1.0;
    const invBlink = this.beamInvincible > 0 && Math.sin(t * 20) > 0;

    if (invBlink) ctx.globalAlpha = 0.5;
    this.drawHuggingPair(ctx, this.elphabaX, this.glindaX, this.elphabaY, charScale, t);
    if (invBlink) ctx.globalAlpha = 1;

    // Hit flash
    if (this.hitFlash > 0) {
      ctx.fillStyle = `rgba(255, 100, 100, ${this.hitFlash})`;
      ctx.fillRect(0, 0, w, h);
    }

    // Beam health display (hearts at top center)
    this.drawBeamHealth(ctx, w, scale);

    // HUD
    drawHUD(ctx, game);

    // Timer
    const remaining = Math.max(0, Math.ceil(50 - this.survivalTime));
    drawText(ctx, `${remaining}s`, w / 2, h - 25, 16 * scale, '#ddd');

    // Heart pairs counter
    drawText(ctx, `Heart Pairs: ${this.heartPairsCollected}`, w / 2, 68, 11 * scale, COLORS.pinkGlow);

    // Controls hint
    if (game.state.levelTime < 5) {
      const alpha = Math.max(0, 1 - game.state.levelTime / 5);
      ctx.globalAlpha = alpha;
      drawText(ctx, 'Drag to fly together!', w / 2, h * 0.55, 12 * scale, COLORS.gold);
      drawText(ctx, 'Dodge the clouds!', w / 2, h * 0.6, 11 * scale, '#ccc');
      ctx.globalAlpha = 1;
    }

    // Act complete overlay
    if (game.state.actComplete) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, w, h);
      drawText(ctx, 'Act XIII Complete!', w / 2, h * 0.3, 28 * scale, COLORS.gold);
      drawText(ctx, `Heart Pairs: ${this.heartPairsCollected}`, w / 2, h * 0.42, 16 * scale, COLORS.pinkGlow);
      drawText(ctx, `Score: ${game.state.score}`, w / 2, h * 0.49, 18 * scale, '#fff');

      const stars = game.state.stars.act13;
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
  }

  private drawHuggingPair(ctx: CanvasRenderingContext2D, ex: number, gx: number, y: number, scale: number, time: number) {
    const s = scale;
    const bobble = Math.sin(time * 3) * 2 * s;
    const capeWave = Math.sin(time * 4) * 5 * s;

    // --- Elphaba (left, facing right toward Glinda) ---
    ctx.save();
    ctx.translate(ex, y + bobble);

    // Cape (flows left, away from Glinda)
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.moveTo(-8 * s, -8 * s);
    ctx.quadraticCurveTo(-22 * s + capeWave, 10 * s, -17 * s + capeWave * 1.3, 25 * s);
    ctx.lineTo(-2 * s, 15 * s);
    ctx.closePath();
    ctx.fill();

    // Body
    ctx.fillStyle = '#111122';
    ctx.beginPath();
    ctx.moveTo(-7 * s, -5 * s);
    ctx.lineTo(-10 * s, 18 * s);
    ctx.lineTo(8 * s, 18 * s);
    ctx.lineTo(6 * s, -5 * s);
    ctx.closePath();
    ctx.fill();

    // Arm reaching toward Glinda (right arm extending right)
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.moveTo(6 * s, -2 * s);
    ctx.quadraticCurveTo(16 * s, -6 * s, 20 * s, -4 * s);
    ctx.quadraticCurveTo(16 * s, 0, 6 * s, 2 * s);
    ctx.closePath();
    ctx.fill();

    // Head (green, slight tilt toward Glinda)
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.arc(1 * s, -15 * s, 10 * s, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (looking right at Glinda)
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(-1 * s, -16 * s, 2 * s, 2.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(5 * s, -16 * s, 2 * s, 2.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, -17 * s, 0.8 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(6 * s, -17 * s, 0.8 * s, 0, Math.PI * 2);
    ctx.fill();

    // Happy smile
    ctx.strokeStyle = '#1a8f4e';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.arc(2 * s, -13 * s, 4 * s, 0.1, Math.PI - 0.1);
    ctx.stroke();

    // Hat
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.ellipse(1 * s, -24 * s, 14 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-8 * s, -25 * s);
    ctx.lineTo(1 * s, -50 * s);
    ctx.lineTo(10 * s, -25 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = COLORS.emeraldGlow;
    ctx.fillRect(-3 * s, -30 * s, 8 * s, 3 * s);

    // Hair (flows left)
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.moveTo(-10 * s, -18 * s);
    ctx.quadraticCurveTo(-14 * s, -5 * s, -12 * s + capeWave * 0.5, 5 * s);
    ctx.lineTo(-8 * s, -5 * s);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // --- Glinda (right, facing left toward Elphaba) ---
    ctx.save();
    ctx.translate(gx, y + bobble);

    // Gown
    const grad = ctx.createLinearGradient(0, -5 * s, 0, 22 * s);
    grad.addColorStop(0, '#ff69b4');
    grad.addColorStop(1, '#ff99cc');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(6 * s, -5 * s);
    ctx.quadraticCurveTo(14 * s, 10 * s, 12 * s, 20 * s);
    ctx.lineTo(-12 * s, 20 * s);
    ctx.quadraticCurveTo(-14 * s, 10 * s, -6 * s, -5 * s);
    ctx.closePath();
    ctx.fill();

    // Gown sparkles
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 6; i++) {
      const sparkX = (Math.sin(i * 1.5) * 6) * s;
      const sparkY = (2 + i * 3) * s;
      ctx.globalAlpha = Math.sin(time * 2 + i) * 0.3 + 0.5;
      ctx.beginPath();
      ctx.arc(sparkX, sparkY, 1 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Arm reaching toward Elphaba (left arm extending left)
    ctx.fillStyle = '#fdd5b1';
    ctx.beginPath();
    ctx.moveTo(-6 * s, -2 * s);
    ctx.quadraticCurveTo(-16 * s, -6 * s, -20 * s, -4 * s);
    ctx.quadraticCurveTo(-16 * s, 0, -6 * s, 2 * s);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = '#fdd5b1';
    ctx.beginPath();
    ctx.arc(-1 * s, -14 * s, 10 * s, 0, Math.PI * 2);
    ctx.fill();

    // Hair (blonde curls)
    ctx.fillStyle = '#f4d03f';
    ctx.beginPath();
    ctx.arc(7 * s, -18 * s, 5 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -22 * s, 6 * s, 0, Math.PI * 2);
    ctx.fill();
    // Flowing curl (right side, away from Elphaba)
    const curlWave = Math.sin(time * 3) * 2 * s;
    ctx.beginPath();
    ctx.moveTo(9 * s, -16 * s);
    ctx.quadraticCurveTo(13 * s - curlWave, -5 * s, 11 * s, 2 * s);
    ctx.lineTo(7 * s, -5 * s);
    ctx.closePath();
    ctx.fill();

    // Crown
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    ctx.moveTo(-7 * s, -24 * s);
    ctx.lineTo(-5 * s, -30 * s);
    ctx.lineTo(-3 * s, -26 * s);
    ctx.lineTo(-1 * s, -33 * s);
    ctx.lineTo(1 * s, -26 * s);
    ctx.lineTo(3 * s, -30 * s);
    ctx.lineTo(5 * s, -24 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff69b4';
    ctx.beginPath();
    ctx.arc(-1 * s, -28 * s, 1.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (looking left at Elphaba)
    ctx.fillStyle = '#4a86c8';
    ctx.beginPath();
    ctx.ellipse(-5 * s, -15 * s, 2 * s, 2.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(1 * s, -15 * s, 2 * s, 2.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(-5 * s, -15 * s, 1.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(1 * s, -15 * s, 1.2 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-4 * s, -16 * s, 0.7 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(2 * s, -16 * s, 0.7 * s, 0, Math.PI * 2);
    ctx.fill();

    // Happy smile
    ctx.strokeStyle = '#e8a090';
    ctx.lineWidth = 1.2 * s;
    ctx.beginPath();
    ctx.arc(-2 * s, -12 * s, 4 * s, 0.1, Math.PI - 0.1);
    ctx.stroke();

    // Blush
    ctx.fillStyle = 'rgba(255, 150, 150, 0.3)';
    ctx.beginPath();
    ctx.ellipse(-8 * s, -12 * s, 2.5 * s, 1.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(4 * s, -12 * s, 2.5 * s, 1.5 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // --- Heart glow between them ---
    const midX = (ex + gx) / 2;
    const heartPulse = 1 + Math.sin(time * 4) * 0.15;
    const hs = 6 * s * heartPulse;
    ctx.fillStyle = 'rgba(255, 100, 150, 0.25)';
    ctx.beginPath();
    ctx.arc(midX, y + bobble - 5 * s, hs * 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff4466';
    ctx.beginPath();
    ctx.moveTo(midX, y + bobble - 2 * s + hs * 0.6);
    ctx.bezierCurveTo(midX - hs, y + bobble - 2 * s - hs * 0.2, midX - hs, y + bobble - 2 * s - hs * 0.8, midX, y + bobble - 2 * s - hs * 0.4);
    ctx.bezierCurveTo(midX + hs, y + bobble - 2 * s - hs * 0.8, midX + hs, y + bobble - 2 * s - hs * 0.2, midX, y + bobble - 2 * s + hs * 0.6);
    ctx.fill();
  }

  private drawAurora(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    const bands = [
      { color1: [20, 180, 100], color2: [60, 120, 200], y: 0.1 },
      { color1: [100, 50, 200], color2: [200, 80, 150], y: 0.2 },
      { color1: [50, 200, 180], color2: [100, 100, 220], y: 0.15 },
    ];

    for (const band of bands) {
      const bandY = h * band.y + Math.sin(time * 0.3 + band.y * 10) * 20;
      const bandH = 40 + Math.sin(time * 0.5 + band.y * 5) * 15;
      const alpha = 0.08 + Math.sin(time * 0.4 + band.y * 7) * 0.03;

      const grad = ctx.createLinearGradient(0, bandY, 0, bandY + bandH);
      const c1 = band.color1;
      const c2 = band.color2;
      grad.addColorStop(0, `rgba(${c1[0]}, ${c1[1]}, ${c1[2]}, 0)`);
      grad.addColorStop(0.3, `rgba(${c1[0]}, ${c1[1]}, ${c1[2]}, ${alpha})`);
      grad.addColorStop(0.7, `rgba(${c2[0]}, ${c2[1]}, ${c2[2]}, ${alpha})`);
      grad.addColorStop(1, `rgba(${c2[0]}, ${c2[1]}, ${c2[2]}, 0)`);
      ctx.fillStyle = grad;

      // Wavy shape
      ctx.beginPath();
      ctx.moveTo(0, bandY);
      for (let x = 0; x <= w; x += 20) {
        const waveY = bandY + Math.sin(x * 0.01 + time * 0.5 + band.y * 3) * 15;
        ctx.lineTo(x, waveY);
      }
      for (let x = w; x >= 0; x -= 20) {
        const waveY = bandY + bandH + Math.sin(x * 0.01 + time * 0.3 + band.y * 5) * 10;
        ctx.lineTo(x, waveY);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawCloud(ctx: CanvasRenderingContext2D, cloud: CloudObstacle, _scale: number) {
    const { x, y, w: cw, h: ch } = cloud;

    // Cloud shadow
    ctx.fillStyle = 'rgba(150, 160, 180, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 3, cw * 0.5, ch * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Main cloud body
    ctx.fillStyle = 'rgba(200, 210, 230, 0.7)';
    ctx.beginPath();
    ctx.ellipse(x, y, cw * 0.5, ch * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Highlight
    ctx.fillStyle = 'rgba(230, 235, 245, 0.5)';
    ctx.beginPath();
    ctx.ellipse(x - cw * 0.15, y - ch * 0.1, cw * 0.35, ch * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Secondary lobe
    ctx.fillStyle = 'rgba(200, 210, 230, 0.5)';
    ctx.beginPath();
    ctx.ellipse(x + cw * 0.25, y + ch * 0.1, cw * 0.3, ch * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, time: number, glow: number, isLeft: boolean) {
    const pulse = 1 + Math.sin(glow) * 0.1;
    const s = 10 * scale * pulse;

    // Glow
    const glowAlpha = 0.3 + Math.sin(glow) * 0.1;
    ctx.fillStyle = isLeft
      ? `rgba(50, 255, 100, ${glowAlpha})`
      : `rgba(255, 150, 200, ${glowAlpha})`;
    ctx.beginPath();
    ctx.arc(x, y, s * 2, 0, Math.PI * 2);
    ctx.fill();

    // Heart shape
    ctx.fillStyle = isLeft ? '#ff4466' : '#ff6699';
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.6);
    ctx.bezierCurveTo(x - s, y - s * 0.2, x - s, y - s * 0.8, x, y - s * 0.4);
    ctx.bezierCurveTo(x + s, y - s * 0.8, x + s, y - s * 0.2, x, y + s * 0.6);
    ctx.fill();
  }

  private drawConnectionBeam(ctx: CanvasRenderingContext2D, time: number, scale: number) {
    const ex = this.elphabaX;
    const ey = this.elphabaY;
    const gx = this.glindaX;
    const gy = this.glindaY;

    // Beam color based on health
    let beamColor: string;
    let beamAlpha: number;
    if (this.beamHealth >= 3) {
      beamColor = COLORS.gold;
      beamAlpha = 0.6;
    } else if (this.beamHealth >= 2) {
      beamColor = '#ffaa00';
      beamAlpha = 0.4;
    } else {
      beamColor = '#ff4444';
      beamAlpha = 0.3 + Math.sin(time * 8) * 0.15;
    }

    // Main beam line
    ctx.strokeStyle = beamColor;
    ctx.lineWidth = 3 * scale;
    ctx.globalAlpha = beamAlpha;
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(gx, gy);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Sparkle particles along beam
    const sparkleCount = 8;
    for (let i = 0; i < sparkleCount; i++) {
      const prog = (i + Math.sin(time * 3 + i * 0.5) * 0.1) / sparkleCount;
      const sx = ex + (gx - ex) * prog;
      const sy = ey + (gy - ey) * prog;
      const wobble = Math.sin(time * 5 + i * 1.5) * 4;

      ctx.fillStyle = COLORS.gold;
      ctx.globalAlpha = 0.4 + Math.sin(time * 4 + i * 2) * 0.3;
      ctx.beginPath();
      ctx.arc(sx, sy + wobble, 2 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Glow around beam
    const midX = (ex + gx) / 2;
    const midY = (ey + gy) / 2;
    const beamGrad = ctx.createRadialGradient(midX, midY, 0, midX, midY, 60);
    beamGrad.addColorStop(0, `rgba(255, 215, 0, ${beamAlpha * 0.15})`);
    beamGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.arc(midX, midY, 60, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBeamHealth(ctx: CanvasRenderingContext2D, w: number, scale: number) {
    const centerX = w * 0.5;
    const y = 52;

    for (let i = 0; i < this.beamMaxHealth; i++) {
      const hx = centerX - (this.beamMaxHealth - 1) * 12 * scale / 2 + i * 12 * scale;
      const filled = i < this.beamHealth;
      const s = 6 * scale;

      ctx.fillStyle = filled ? '#ff4466' : 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(hx, y + s * 0.4);
      ctx.bezierCurveTo(hx - s, y - s * 0.2, hx - s, y - s * 0.7, hx, y - s * 0.3);
      ctx.bezierCurveTo(hx + s, y - s * 0.7, hx + s, y - s * 0.2, hx, y + s * 0.4);
      ctx.fill();
    }
  }

  private drawDuetRing(ctx: CanvasRenderingContext2D, w: number, duet: DuetMoment, time: number, scale: number) {
    const x = w * 0.5;
    const { y, ringRadius, pulseTimer } = duet;
    const pulse = 1 + Math.sin(pulseTimer * 3) * 0.1;

    // Outer ring glow
    const glowGrad = ctx.createRadialGradient(x, y, ringRadius * 0.7 * pulse, x, y, ringRadius * 1.3 * pulse);
    glowGrad.addColorStop(0, 'rgba(255, 215, 0, 0.15)');
    glowGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(x, y, ringRadius * 1.3 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Ring
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 3 * scale;
    ctx.globalAlpha = 0.6 + Math.sin(time * 4) * 0.2;
    ctx.beginPath();
    ctx.arc(x, y, ringRadius * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // "DUET" label
    drawText(ctx, 'DUET!', x, y - ringRadius * pulse - 12, 10 * scale, COLORS.gold);

    // Musical note decorations
    const noteAngle = time * 2;
    for (let i = 0; i < 4; i++) {
      const na = noteAngle + (i * Math.PI * 2) / 4;
      const nx = x + Math.cos(na) * ringRadius * pulse;
      const ny = y + Math.sin(na) * ringRadius * pulse;
      ctx.fillStyle = COLORS.gold;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(nx, ny, 3 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
