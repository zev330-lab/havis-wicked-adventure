// Act 1 — 'Something Has Changed Within Me' — Flying Level
// Elphaba: broomstick through sky collecting emerald gems, dodging clouds/birds
// Glinda: float in bubble through sparkly sky collecting pink stars
import { Scene, GameEngine } from '../engine/types';
import {
  drawSky, drawClouds, drawEmeraldCity, drawElphaba, drawGlinda,
  drawGem, drawHUD, drawText, COLORS,
} from '../engine/renderer';
import { particlePresets } from '../engine/particles';
import { startBgMusic, stopBgMusic } from '../engine/audio';

interface FlyingObject {
  x: number;
  y: number;
  type: 'gem' | 'obstacle' | 'powerup';
  w: number;
  h: number;
  active: boolean;
  speed: number;
  subtype?: string;
}

export class Act1Scene implements Scene {
  private playerX = 0;
  private playerY = 0;
  private objects: FlyingObject[] = [];
  private spawnTimer = 0;
  private scrollSpeed = 120;
  private scrollOffset = 0;
  private cityDistance = 1;
  private invincibleTimer = 0;
  private magicBlastActive = false;
  private magicBlastX = 0;
  private magicBlastY = 0;
  private magicBlastTimer = 0;
  private trailTimer = 0;
  private totalGems = 0;
  private maxGems = 30;
  private noteTimer = 0;

  enter(game: GameEngine) {
    this.playerX = game.width * 0.3;
    this.playerY = game.height * 0.5;
    this.objects = [];
    this.spawnTimer = 0;
    this.scrollSpeed = 120;
    this.scrollOffset = 0;
    this.cityDistance = 1;
    this.invincibleTimer = 0;
    this.magicBlastActive = false;
    this.magicBlastTimer = 0;
    this.trailTimer = 0;
    this.totalGems = 0;
    this.noteTimer = 0;

    game.state.gems = 0;
    game.state.health = 3;
    game.state.noHitBonus = true;
    game.state.levelTime = 0;
    game.state.actComplete = false;

    const isElphaba = game.state.character === 'elphaba';
    startBgMusic(isElphaba ? 'elphaba_fly' : 'glinda_fly');
  }

  exit(_game: GameEngine) {
    stopBgMusic();
  }

  update(game: GameEngine, dt: number) {
    if (game.state.actComplete) return;

    game.state.levelTime += dt;
    this.scrollOffset += this.scrollSpeed * dt;
    this.spawnTimer += dt;
    this.trailTimer += dt;
    this.noteTimer += dt;

    // Gradually increase speed
    this.scrollSpeed = 120 + game.state.levelTime * 3;
    // City gets closer
    this.cityDistance = Math.max(0.3, 1 - game.state.levelTime / 90);

    const w = game.width;
    const h = game.height;
    const isElphaba = game.state.character === 'elphaba';

    // Player movement — touch directly follows finger position
    const moveSpeed = 250;
    let targetX = this.playerX;
    let targetY = this.playerY;

    if (game.input.isTouching) {
      targetX = game.input.touchX;
      targetY = game.input.touchY;
    }
    if (game.input.left) targetX -= moveSpeed * dt;
    if (game.input.right) targetX += moveSpeed * dt;
    if (game.input.up) targetY -= moveSpeed * dt;
    if (game.input.down) targetY += moveSpeed * dt;

    // Tilt
    if (Math.abs(game.input.tiltX) > 0.1) {
      targetX += game.input.tiltX * moveSpeed * dt;
    }
    if (Math.abs(game.input.tiltY) > 0.1) {
      targetY += game.input.tiltY * moveSpeed * dt * 0.5;
    }

    // Smooth follow — fast lerp so it feels responsive
    const lerpSpeed = game.input.isTouching ? 12 : 8;
    this.playerX += (targetX - this.playerX) * Math.min(1, dt * lerpSpeed);
    this.playerY += (targetY - this.playerY) * Math.min(1, dt * lerpSpeed);

    // Clamp
    this.playerX = Math.max(25, Math.min(w - 25, this.playerX));
    this.playerY = Math.max(50, Math.min(h - 50, this.playerY));

    // Magic blast — only on tap (quick touch+release), not drag
    if ((game.input.tap || game.input.actionPressed) && !this.magicBlastActive) {
      this.magicBlastActive = true;
      this.magicBlastX = this.playerX + 30;
      this.magicBlastY = this.playerY;
      this.magicBlastTimer = 0;
      game.playSound('magicBlast');

      const preset = isElphaba
        ? particlePresets.greenMagic(this.playerX + 20, this.playerY)
        : particlePresets.pinkMagic(this.playerX + 20, this.playerY);
      game.spawnParticles(preset);
    }

    if (this.magicBlastActive) {
      this.magicBlastTimer += dt;
      this.magicBlastX += 500 * dt;
      if (this.magicBlastX > w + 50) {
        this.magicBlastActive = false;
      }
    }

    // Trail particles
    if (this.trailTimer > 0.05) {
      this.trailTimer = 0;
      game.spawnParticles(particlePresets.trail(this.playerX - 15, this.playerY + 10, isElphaba));
    }

    // Musical notes
    if (this.noteTimer > 2) {
      this.noteTimer = 0;
      game.spawnParticles(particlePresets.musicalNote(Math.random() * w, h * 0.2));
    }

    // Spawn objects
    if (this.spawnTimer > 0.6) {
      this.spawnTimer = 0;
      const lane = Math.random() * (h - 120) + 60;

      if (Math.random() < 0.5 && this.totalGems < this.maxGems) {
        // Gem
        this.objects.push({
          x: w + 20, y: lane, type: 'gem',
          w: 20, h: 20, active: true,
          speed: this.scrollSpeed * 0.8,
        });
        this.totalGems++;
      } else if (Math.random() < 0.6) {
        // Cloud obstacle
        this.objects.push({
          x: w + 40, y: lane, type: 'obstacle',
          w: 60, h: 35, active: true,
          speed: this.scrollSpeed * 0.6,
          subtype: Math.random() > 0.5 ? 'cloud' : 'bird',
        });
      } else if (Math.random() < 0.15) {
        // Power-up
        this.objects.push({
          x: w + 20, y: lane, type: 'powerup',
          w: 25, h: 25, active: true,
          speed: this.scrollSpeed * 0.7,
        });
      }
    }

    // Update objects
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;

    for (const obj of this.objects) {
      if (!obj.active) continue;
      obj.x -= obj.speed * dt;

      // Off screen
      if (obj.x < -80) {
        obj.active = false;
        continue;
      }

      // Collision with player
      const dx = obj.x - this.playerX;
      const dy = obj.y - this.playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitDist = obj.type === 'obstacle' ? 25 : 22;

      if (dist < hitDist) {
        if (obj.type === 'gem') {
          obj.active = false;
          game.state.gems++;
          game.state.score += 100;
          game.playSound('gemCollect');
          game.spawnParticles(particlePresets.gemCollect(obj.x, obj.y, isElphaba));
        } else if (obj.type === 'powerup') {
          obj.active = false;
          game.state.health = Math.min(game.state.maxHealth, game.state.health + 1);
          game.playSound('powerUp');
          game.spawnParticles(particlePresets.gemCollect(obj.x, obj.y, !isElphaba));
        } else if (obj.type === 'obstacle' && this.invincibleTimer <= 0) {
          obj.active = false;
          game.state.health--;
          game.state.noHitBonus = false;
          game.playSound('hit');
          game.shakeCamera(8, 0.3);
          this.invincibleTimer = 1.5;

          if (game.state.health <= 0) {
            // Restart act
            game.state.health = 3;
            this.enter(game);
            return;
          }
        }
      }

      // Collision with magic blast
      if (this.magicBlastActive && obj.type === 'obstacle') {
        const bx = obj.x - this.magicBlastX;
        const by = obj.y - this.magicBlastY;
        if (Math.sqrt(bx * bx + by * by) < 40) {
          obj.active = false;
          game.state.score += 50;
          game.spawnParticles(particlePresets.explosion(obj.x, obj.y));
          game.playSound('bossHit');
        }
      }
    }

    // Clean dead objects
    this.objects = this.objects.filter(o => o.active);

    // Level complete check — collected enough gems or enough time passed
    if (game.state.gems >= this.maxGems || game.state.levelTime > 60) {
      game.state.actComplete = true;
      this.completeAct(game);
    }
  }

  private completeAct(game: GameEngine) {
    // Calculate stars
    let stars = 1; // Base star for completing
    if (game.state.gems >= this.maxGems * 0.8) stars++;
    if (game.state.noHitBonus) stars++;
    game.state.stars.act1 = Math.max(game.state.stars.act1, stars);

    // Check costume unlock
    const totalStars = Object.values(game.state.stars).reduce((a, b) => a + b, 0);
    if (totalStars >= 5 && !game.state.unlockedCostumes.includes(game.state.character === 'elphaba' ? 'elphaba_sparkly' : 'glinda_wings')) {
      game.state.unlockedCostumes.push(game.state.character === 'elphaba' ? 'elphaba_sparkly' : 'glinda_wings');
    }

    if (!game.state.lastCompletedAct || game.state.lastCompletedAct < 'act1') {
      game.state.lastCompletedAct = 'act1';
    }
    game.saveGame();
    game.playSound('actComplete');

    // Confetti burst
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        game.spawnParticles(particlePresets.confetti(
          Math.random() * game.width, game.height * 0.3
        ));
      }, i * 200);
    }

    // Transition to act 2 story card or level select
    setTimeout(() => {
      game.state.currentAct = 'act2';
      game.state.storyCardIndex = 0;
      game.transitionTo('storyCard');
    }, 2500);
  }

  render(game: GameEngine, ctx: CanvasRenderingContext2D) {
    const w = game.width;
    const h = game.height;
    const scale = game.getScale();
    const isElphaba = game.state.character === 'elphaba';

    // Sky gradient — shifts from purple/blue to emerald green
    const skyProgress = Math.min(1, game.state.levelTime / 60);
    const topR = Math.floor(26 + (0 - 26) * skyProgress);
    const topG = Math.floor(5 + (20 - 5) * skyProgress);
    const topB = Math.floor(51 + (40 - 51) * skyProgress);
    const botR = Math.floor(40 + (0 - 40) * skyProgress);
    const botG = Math.floor(20 + (60 - 20) * skyProgress);
    const botB = Math.floor(60 + (40 - 60) * skyProgress);

    drawSky(ctx, w, h,
      `rgb(${topR},${topG},${topB})`,
      `rgb(${botR},${botG},${botB})`,
      game.time);

    // Parallax clouds
    drawClouds(ctx, w, h, this.scrollOffset, game.time);

    // Emerald City in the distance (growing closer)
    const cityScale = scale * (0.3 + (1 - this.cityDistance) * 1.2);
    ctx.globalAlpha = 0.3 + (1 - this.cityDistance) * 0.5;
    drawEmeraldCity(ctx, w * 0.7, h * 0.65 - (1 - this.cityDistance) * 50, cityScale, game.time);
    ctx.globalAlpha = 1;

    // Objects
    for (const obj of this.objects) {
      if (!obj.active) continue;

      if (obj.type === 'gem') {
        drawGem(ctx, obj.x, obj.y, 10, isElphaba, game.time);
      } else if (obj.type === 'obstacle') {
        if (obj.subtype === 'bird') {
          this.drawBird(ctx, obj.x, obj.y, scale, game.time);
        } else {
          this.drawObstacleCloud(ctx, obj.x, obj.y, obj.w, obj.h);
        }
      } else if (obj.type === 'powerup') {
        this.drawPowerup(ctx, obj.x, obj.y, scale, game.time);
      }
    }

    // Magic blast
    if (this.magicBlastActive) {
      const blastColor = isElphaba ? COLORS.emeraldGlow : COLORS.pinkGlow;
      ctx.fillStyle = blastColor;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(this.magicBlastX, this.magicBlastY, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(this.magicBlastX, this.magicBlastY, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Player
    const charScale = scale * 1.6;
    const blink = this.invincibleTimer > 0 && Math.sin(this.invincibleTimer * 20) > 0;
    if (!blink) {
      const hasSparkly = game.state.unlockedCostumes.includes('elphaba_sparkly');
      const hasWings = game.state.unlockedCostumes.includes('glinda_wings');

      if (isElphaba) {
        drawElphaba(ctx, this.playerX, this.playerY, charScale, game.time, { flying: true, sparkly: hasSparkly });
      } else {
        drawGlinda(ctx, this.playerX, this.playerY, charScale, game.time, { flying: true, goldenWings: hasWings });
      }
    }

    // HUD
    drawHUD(ctx, game);

    // Act complete overlay
    if (game.state.actComplete) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, w, h);
      drawText(ctx, 'Act I Complete!', w / 2, h * 0.35, 28 * scale, COLORS.gold);
      drawText(ctx, `Gems: ${game.state.gems}`, w / 2, h * 0.45, 18 * scale, COLORS.emeraldGlow);
      drawText(ctx, `Score: ${game.state.score}`, w / 2, h * 0.52, 18 * scale, '#fff');

      // Stars
      const stars = game.state.stars.act1;
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

    // Tap hint at start
    if (game.state.levelTime < 3) {
      const alpha = Math.max(0, 1 - game.state.levelTime / 3);
      ctx.globalAlpha = alpha;
      drawText(ctx, 'Tap or tilt to move!', w / 2, h * 0.85, 14 * scale, '#fff');
      drawText(ctx, 'Tap screen to blast magic!', w / 2, h * 0.9, 12 * scale, '#ccc');
      ctx.globalAlpha = 1;
    }
  }

  private drawObstacleCloud(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, cH: number) {
    ctx.fillStyle = 'rgba(100, 100, 120, 0.7)';
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, cH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x - w * 0.2, y + 3, w * 0.35, cH * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + w * 0.25, y + 2, w * 0.3, cH * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Warning glow
    ctx.fillStyle = 'rgba(255, 50, 50, 0.15)';
    ctx.beginPath();
    ctx.arc(x, y, w * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, time: number) {
    const wingFlap = Math.sin(time * 12) * 12 * scale;
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2 * scale;

    // Body
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.ellipse(x, y, 10 * scale, 5 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wings
    ctx.beginPath();
    ctx.moveTo(x - 4 * scale, y);
    ctx.quadraticCurveTo(x - 12 * scale, y - wingFlap, x - 18 * scale, y - wingFlap * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 4 * scale, y);
    ctx.quadraticCurveTo(x + 12 * scale, y - wingFlap, x + 18 * scale, y - wingFlap * 0.5);
    ctx.stroke();

    // Beak
    ctx.fillStyle = '#f90';
    ctx.beginPath();
    ctx.moveTo(x - 10 * scale, y);
    ctx.lineTo(x - 15 * scale, y - 1);
    ctx.lineTo(x - 10 * scale, y + 2 * scale);
    ctx.fill();
  }

  private drawPowerup(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, time: number) {
    const bob = Math.sin(time * 3) * 3;
    const glow = Math.sin(time * 5) * 0.2 + 0.8;

    // Glow
    ctx.fillStyle = `rgba(255, 215, 0, ${glow * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y + bob, 18 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Star
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 12 * scale : 5 * scale;
      const angle = (i * Math.PI) / 5 - Math.PI / 2 + time;
      const px = x + Math.cos(angle) * r;
      const py = y + bob + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
}
