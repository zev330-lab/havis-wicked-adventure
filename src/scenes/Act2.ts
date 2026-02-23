// Act 2 — 'Defying Gravity' — Platformer Level
// Navigate Emerald City rooftops, collect spell books, interact with NPCs
import { Scene, GameEngine } from '../engine/types';
import {
  drawSky, drawEmeraldCity, drawElphaba, drawGlinda, drawGem,
  drawHUD, drawPlatform, drawNPC, drawText, COLORS,
} from '../engine/renderer';
import { particlePresets } from '../engine/particles';
import { startBgMusic, stopBgMusic } from '../engine/audio';

interface Platform {
  x: number; y: number; w: number; h: number;
  type: string; moving?: boolean;
  moveDir?: number; moveRange?: number; origX?: number; origY?: number;
}

interface Gem {
  x: number; y: number; collected: boolean; type: string;
}

interface NPC {
  x: number; y: number; message: string; talked: boolean;
}

interface Switch {
  x: number; y: number; activated: boolean; gateIndex: number;
}

interface Gate {
  x: number; y: number; w: number; h: number; open: boolean; openAmount: number;
}

interface PowerUp {
  x: number; y: number; type: string; collected: boolean;
}

export class Act2Scene implements Scene {
  private playerX = 0;
  private playerY = 0;
  private playerVX = 0;
  private playerVY = 0;
  private onGround = false;
  private jumpHeld = false;
  private jumpTimer = 0;
  private cameraX = 0;
  private cameraY = 0;
  private facing = 1;
  private invincibleTimer = 0;

  private platforms: Platform[] = [];
  private gems: Gem[] = [];
  private npcs: NPC[] = [];
  private switches: Switch[] = [];
  private gates: Gate[] = [];
  private powerups: PowerUp[] = [];

  private levelWidth = 3500;
  private levelHeight = 800;
  private gravity = 800;
  private moveSpeed = 180;
  private jumpForce = -350;
  private maxJumpTime = 0.25;

  private trailTimer = 0;
  private noteTimer = 0;
  private shieldTimer = 0;
  private speedTimer = 0;
  private totalGems = 0;
  private goalX = 3300;

  enter(game: GameEngine) {
    this.playerVX = 0;
    this.playerVY = 0;
    this.onGround = false;
    this.jumpHeld = false;
    this.jumpTimer = 0;
    this.invincibleTimer = 0;
    this.trailTimer = 0;
    this.noteTimer = 0;
    this.shieldTimer = 0;
    this.speedTimer = 0;

    game.state.gems = 0;
    game.state.health = 3;
    game.state.noHitBonus = true;
    game.state.levelTime = 0;
    game.state.actComplete = false;

    this.buildLevel();
    this.playerX = 60;
    this.playerY = this.levelHeight - 100;
    this.cameraX = 0;
    this.cameraY = 0;

    startBgMusic('platformer');
  }

  exit(_game: GameEngine) {
    stopBgMusic();
  }

  private buildLevel() {
    const lh = this.levelHeight;
    const groundY = lh - 30;

    // Ground platforms
    this.platforms = [
      // Ground sections
      { x: 0, y: groundY, w: 400, h: 30, type: 'emerald' },
      { x: 500, y: groundY, w: 250, h: 30, type: 'default' },
      { x: 850, y: groundY, w: 200, h: 30, type: 'emerald' },
      { x: 1200, y: groundY, w: 300, h: 30, type: 'default' },
      { x: 1650, y: groundY, w: 200, h: 30, type: 'emerald' },
      { x: 2000, y: groundY, w: 250, h: 30, type: 'default' },
      { x: 2400, y: groundY, w: 300, h: 30, type: 'emerald' },
      { x: 2850, y: groundY, w: 500, h: 30, type: 'gold' },

      // Elevated platforms — rooftops & bridges
      { x: 200, y: groundY - 80, w: 100, h: 15, type: 'emerald' },
      { x: 350, y: groundY - 150, w: 80, h: 15, type: 'default' },
      { x: 550, y: groundY - 100, w: 120, h: 15, type: 'emerald' },
      { x: 750, y: groundY - 180, w: 100, h: 15, type: 'gold' },
      { x: 950, y: groundY - 120, w: 150, h: 15, type: 'default' },
      { x: 1100, y: groundY - 200, w: 80, h: 15, type: 'emerald' },
      { x: 1300, y: groundY - 80, w: 120, h: 15, type: 'default' },
      { x: 1450, y: groundY - 160, w: 100, h: 15, type: 'emerald' },
      { x: 1600, y: groundY - 240, w: 80, h: 15, type: 'gold' },

      // High platforms
      { x: 1800, y: groundY - 140, w: 100, h: 15, type: 'emerald' },
      { x: 1950, y: groundY - 200, w: 80, h: 15, type: 'default' },
      { x: 2150, y: groundY - 100, w: 120, h: 15, type: 'emerald' },
      { x: 2350, y: groundY - 180, w: 100, h: 15, type: 'gold' },
      { x: 2550, y: groundY - 130, w: 80, h: 15, type: 'default' },
      { x: 2700, y: groundY - 220, w: 100, h: 15, type: 'emerald' },
      { x: 2900, y: groundY - 100, w: 150, h: 15, type: 'gold' },

      // Moving platforms
      { x: 430, y: groundY - 60, w: 70, h: 15, type: 'gold', moving: true, moveDir: 0, moveRange: 80, origX: 430, origY: groundY - 60 },
      { x: 1550, y: groundY - 100, w: 70, h: 15, type: 'gold', moving: true, moveDir: 0, moveRange: 120, origX: 1550, origY: groundY - 100 },
    ];

    // Gems scattered along the level
    this.gems = [];
    this.totalGems = 0;
    const gemPositions = [
      [150, groundY - 30], [250, groundY - 110], [400, groundY - 180],
      [580, groundY - 130], [700, groundY - 30], [780, groundY - 210],
      [980, groundY - 150], [1130, groundY - 230], [1250, groundY - 30],
      [1350, groundY - 110], [1480, groundY - 190], [1630, groundY - 270],
      [1750, groundY - 30], [1830, groundY - 170], [1980, groundY - 230],
      [2100, groundY - 30], [2200, groundY - 130], [2380, groundY - 210],
      [2500, groundY - 30], [2580, groundY - 160], [2730, groundY - 250],
      [2950, groundY - 130], [3050, groundY - 30], [3150, groundY - 70],
    ];
    for (const [gx, gy] of gemPositions) {
      this.gems.push({ x: gx, y: gy, collected: false, type: 'gem' });
      this.totalGems++;
    }

    // NPCs (Ozians)
    this.npcs = [
      { x: 300, y: groundY - 20, message: 'Go Havi!', talked: false },
      { x: 900, y: groundY - 20, message: "You're wonderful!", talked: false },
      { x: 1400, y: groundY - 20, message: 'You can do it!', talked: false },
      { x: 2100, y: groundY - 20, message: 'Almost there!', talked: false },
      { x: 2800, y: groundY - 20, message: 'Havi is amazing!', talked: false },
    ];

    // Switches and gates
    this.switches = [
      { x: 850, y: groundY - 50, activated: false, gateIndex: 0 },
      { x: 2000, y: groundY - 50, activated: false, gateIndex: 1 },
    ];

    this.gates = [
      { x: 1050, y: groundY - 120, w: 20, h: 120, open: false, openAmount: 0 },
      { x: 2250, y: groundY - 120, w: 20, h: 120, open: false, openAmount: 0 },
    ];

    // Power-ups
    this.powerups = [
      { x: 750, y: groundY - 220, type: 'shield', collected: false },
      { x: 1600, y: groundY - 280, type: 'speed', collected: false },
      { x: 2700, y: groundY - 260, type: 'fly', collected: false },
    ];

    this.goalX = 3300;
  }

  update(game: GameEngine, dt: number) {
    if (game.state.actComplete) return;

    game.state.levelTime += dt;
    this.trailTimer += dt;
    this.noteTimer += dt;
    if (this.shieldTimer > 0) this.shieldTimer -= dt;
    if (this.speedTimer > 0) this.speedTimer -= dt;
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;

    const isElphaba = game.state.character === 'elphaba';
    const speed = this.speedTimer > 0 ? this.moveSpeed * 1.5 : this.moveSpeed;

    // Horizontal movement — touch follows finger X position
    this.playerVX = 0;
    if (game.input.isTouching) {
      // Convert screen touch to world X
      const worldTouchX = game.input.touchX + this.cameraX;
      const dx = worldTouchX - this.playerX;
      if (Math.abs(dx) > 10) {
        this.playerVX = dx > 0 ? speed : -speed;
        this.facing = dx > 0 ? 1 : -1;
      }
      // Jump when touching upper portion of screen
      const touchYRatio = game.input.touchY / game.height;
      if (touchYRatio < 0.4 && this.onGround) {
        this.playerVY = this.jumpForce;
        this.jumpHeld = true;
        this.jumpTimer = 0;
        this.onGround = false;
        game.playSound('jump');
      }
    }
    if (game.input.left) {
      this.playerVX = -speed;
      this.facing = -1;
    }
    if (game.input.right) {
      this.playerVX = speed;
      this.facing = 1;
    }

    // Jump — variable height (keyboard)
    const wantJump = game.input.jump || game.input.up;

    if (game.input.jumpPressed && !game.input.isTouching) {
      if (this.onGround) {
        this.playerVY = this.jumpForce;
        this.jumpHeld = true;
        this.jumpTimer = 0;
        this.onGround = false;
        game.playSound('jump');
      }
    }

    if (this.jumpHeld && wantJump && this.jumpTimer < this.maxJumpTime) {
      this.jumpTimer += dt;
      this.playerVY = this.jumpForce * (1 - this.jumpTimer / this.maxJumpTime * 0.5);
    } else {
      this.jumpHeld = false;
    }

    // Gravity
    this.playerVY += this.gravity * dt;
    if (this.playerVY > 600) this.playerVY = 600;

    // Move player
    this.playerX += this.playerVX * dt;
    this.playerY += this.playerVY * dt;

    // Update moving platforms
    for (const plat of this.platforms) {
      if (plat.moving && plat.origY !== undefined && plat.origX !== undefined) {
        plat.moveDir = (plat.moveDir || 0) + dt;
        plat.y = plat.origY + Math.sin(plat.moveDir * 1.5) * (plat.moveRange || 50);
      }
    }

    // Platform collision
    this.onGround = false;
    for (const plat of this.platforms) {
      if (this.playerX + 12 > plat.x && this.playerX - 12 < plat.x + plat.w) {
        // Land on top
        if (this.playerVY >= 0 && this.playerY + 20 > plat.y && this.playerY + 20 < plat.y + plat.h + 10 && this.playerY < plat.y) {
          this.playerY = plat.y - 20;
          this.playerVY = 0;
          this.onGround = true;
        }
        // Hit bottom
        else if (this.playerVY < 0 && this.playerY - 30 < plat.y + plat.h && this.playerY - 30 > plat.y - 5) {
          this.playerVY = 0;
        }
      }
    }

    // Gate collision
    for (const gate of this.gates) {
      if (gate.open) {
        gate.openAmount = Math.min(1, gate.openAmount + dt * 2);
        continue;
      }
      if (this.playerX + 12 > gate.x && this.playerX - 12 < gate.x + gate.w &&
          this.playerY + 20 > gate.y && this.playerY - 30 < gate.y + gate.h) {
        // Block player
        if (this.playerVX > 0) this.playerX = gate.x - 12;
        else if (this.playerVX < 0) this.playerX = gate.x + gate.w + 12;
      }
    }

    // Fall death
    if (this.playerY > this.levelHeight + 50) {
      game.state.health--;
      game.state.noHitBonus = false;
      game.playSound('hit');
      if (game.state.health <= 0) {
        game.state.health = 3;
        this.enter(game);
        return;
      }
      // Respawn at last safe position
      this.playerX = Math.max(60, this.playerX - 200);
      this.playerY = this.levelHeight - 120;
      this.playerVY = 0;
      this.invincibleTimer = 1.5;
    }

    // Clamp
    this.playerX = Math.max(15, Math.min(this.levelWidth, this.playerX));

    // Collect gems
    for (const gem of this.gems) {
      if (gem.collected) continue;
      const dx = gem.x - this.playerX;
      const dy = gem.y - this.playerY;
      if (Math.sqrt(dx * dx + dy * dy) < 25) {
        gem.collected = true;
        game.state.gems++;
        game.state.score += 100;
        game.playSound('gemCollect');
        game.spawnParticles(particlePresets.gemCollect(gem.x - this.cameraX, gem.y - this.cameraY, isElphaba));
      }
    }

    // Switch interaction
    for (const sw of this.switches) {
      if (sw.activated) continue;
      const dx = sw.x - this.playerX;
      const dy = sw.y - this.playerY;
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        sw.activated = true;
        this.gates[sw.gateIndex].open = true;
        game.playSound('switchActivate');
        game.spawnParticles(particlePresets.gemCollect(sw.x - this.cameraX, sw.y - this.cameraY, true));
      }
    }

    // Power-ups
    for (const pu of this.powerups) {
      if (pu.collected) continue;
      const dx = pu.x - this.playerX;
      const dy = pu.y - this.playerY;
      if (Math.sqrt(dx * dx + dy * dy) < 25) {
        pu.collected = true;
        game.playSound('powerUp');
        if (pu.type === 'shield') {
          this.shieldTimer = 8;
        } else if (pu.type === 'speed') {
          this.speedTimer = 8;
        } else if (pu.type === 'fly') {
          this.playerVY = -500;
          this.jumpHeld = false;
        }
        game.spawnParticles(particlePresets.gemCollect(pu.x - this.cameraX, pu.y - this.cameraY, !isElphaba));
      }
    }

    // Trail
    if (this.trailTimer > 0.06 && (this.playerVX !== 0 || !this.onGround)) {
      this.trailTimer = 0;
      game.spawnParticles(particlePresets.trail(
        this.playerX - this.cameraX - this.facing * 10,
        this.playerY - this.cameraY + 10,
        isElphaba
      ));
    }

    // Musical notes
    if (this.noteTimer > 3) {
      this.noteTimer = 0;
      game.spawnParticles(particlePresets.musicalNote(Math.random() * game.width, game.height * 0.1));
    }

    // Camera follow
    const targetCX = this.playerX - game.width * 0.35;
    const targetCY = this.playerY - game.height * 0.5;
    this.cameraX += (targetCX - this.cameraX) * Math.min(1, dt * 4);
    this.cameraY += (targetCY - this.cameraY) * Math.min(1, dt * 4);
    this.cameraX = Math.max(0, Math.min(this.levelWidth - game.width, this.cameraX));
    this.cameraY = Math.max(0, Math.min(this.levelHeight - game.height, this.cameraY));

    // Camera shake
    if (game.camera.shakeTimer < game.camera.shakeDuration) {
      game.camera.shakeTimer += dt;
      const shake = game.camera.shakeIntensity * (1 - game.camera.shakeTimer / game.camera.shakeDuration);
      game.camera.shakeX = (Math.random() - 0.5) * shake;
      game.camera.shakeY = (Math.random() - 0.5) * shake;
    } else {
      game.camera.shakeX = 0;
      game.camera.shakeY = 0;
    }

    // Goal reached
    if (this.playerX >= this.goalX) {
      game.state.actComplete = true;
      this.completeAct(game);
    }
  }

  private completeAct(game: GameEngine) {
    let stars = 1;
    if (game.state.gems >= this.totalGems * 0.7) stars++;
    if (game.state.noHitBonus) stars++;
    game.state.stars.act2 = Math.max(game.state.stars.act2, stars);

    const totalStars = Object.values(game.state.stars).reduce((a, b) => a + b, 0);
    if (totalStars >= 5 && !game.state.unlockedCostumes.includes(game.state.character === 'elphaba' ? 'elphaba_sparkly' : 'glinda_wings')) {
      game.state.unlockedCostumes.push(game.state.character === 'elphaba' ? 'elphaba_sparkly' : 'glinda_wings');
    }

    if (!game.state.lastCompletedAct || game.state.lastCompletedAct < 'act2') {
      game.state.lastCompletedAct = 'act2';
    }
    game.saveGame();
    game.playSound('actComplete');

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        game.spawnParticles(particlePresets.confetti(Math.random() * game.width, game.height * 0.3));
      }, i * 200);
    }

    setTimeout(() => {
      game.state.currentAct = 'act3';
      game.state.storyCardIndex = 0;
      game.transitionTo('storyCard');
    }, 2500);
  }

  render(game: GameEngine, ctx: CanvasRenderingContext2D) {
    const w = game.width;
    const h = game.height;
    const scale = game.getScale();
    const isElphaba = game.state.character === 'elphaba';
    const cx = this.cameraX + (game.camera.shakeX || 0);
    const cy = this.cameraY + (game.camera.shakeY || 0);

    // Sky
    drawSky(ctx, w, h, '#0a0025', '#003520', game.time);

    // Distant Emerald City
    ctx.globalAlpha = 0.4;
    const cityParallax = cx * 0.1;
    drawEmeraldCity(ctx, w * 0.7 - cityParallax, h * 0.5, scale * 0.8, game.time);
    ctx.globalAlpha = 1;

    // Buildings background (parallax)
    this.drawBuildingsBackground(ctx, w, h, cx, scale, game.time);

    ctx.save();
    ctx.translate(-cx, -cy);

    // Platforms
    for (const plat of this.platforms) {
      drawPlatform(ctx, plat.x, plat.y, plat.w, plat.h, plat.type);
    }

    // Gates
    for (const gate of this.gates) {
      if (gate.openAmount >= 1) continue;
      const gateH = gate.h * (1 - gate.openAmount);
      const gateY = gate.y + gate.h - gateH;
      ctx.fillStyle = '#8B4513';
      ctx.fillRect(gate.x, gateY, gate.w, gateH);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(gate.x + 6, gateY + gateH * 0.4, 8, 8);
    }

    // Switches
    for (const sw of this.switches) {
      ctx.fillStyle = sw.activated ? COLORS.emeraldGlow : '#666';
      ctx.fillRect(sw.x - 8, sw.y, 16, 20);
      // Lever
      ctx.strokeStyle = sw.activated ? COLORS.gold : '#888';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sw.x, sw.y);
      ctx.lineTo(sw.x + (sw.activated ? 8 : -8), sw.y - 12);
      ctx.stroke();
      // Base
      ctx.fillStyle = '#444';
      ctx.fillRect(sw.x - 10, sw.y + 16, 20, 6);
    }

    // Gems
    for (const gem of this.gems) {
      if (gem.collected) continue;
      drawGem(ctx, gem.x, gem.y, 8, isElphaba, game.time);
    }

    // Power-ups
    for (const pu of this.powerups) {
      if (pu.collected) continue;
      this.drawPowerupItem(ctx, pu.x, pu.y, pu.type, scale, game.time);
    }

    // NPCs
    for (const npc of this.npcs) {
      const dist = Math.abs(npc.x - this.playerX);
      const showMessage = dist < 100;
      drawNPC(ctx, npc.x, npc.y, scale * 1.2, game.time, showMessage ? npc.message : '');
    }

    // Player
    const blink = this.invincibleTimer > 0 && Math.sin(this.invincibleTimer * 20) > 0;
    if (!blink) {
      ctx.save();
      if (this.facing < 0) {
        ctx.translate(this.playerX, 0);
        ctx.scale(-1, 1);
        ctx.translate(-this.playerX, 0);
      }
      const charScale = scale * 1.4;
      const hasSparkly = game.state.unlockedCostumes.includes('elphaba_sparkly');
      const hasWings = game.state.unlockedCostumes.includes('glinda_wings');

      if (isElphaba) {
        drawElphaba(ctx, this.playerX, this.playerY - 5, charScale, game.time, { sparkly: hasSparkly });
      } else {
        drawGlinda(ctx, this.playerX, this.playerY - 5, charScale, game.time, { goldenWings: hasWings, wand: true });
      }
      ctx.restore();

      // Shield visual
      if (this.shieldTimer > 0) {
        const shieldAlpha = this.shieldTimer < 2 ? this.shieldTimer / 2 * 0.3 : 0.3;
        ctx.strokeStyle = isElphaba ? COLORS.emeraldGlow : COLORS.pinkGlow;
        ctx.lineWidth = 2;
        ctx.globalAlpha = shieldAlpha;
        ctx.beginPath();
        ctx.arc(this.playerX, this.playerY - 5, 25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // Goal marker
    this.drawGoal(ctx, this.goalX, this.levelHeight - 80, scale, game.time);

    ctx.restore();

    // HUD
    drawHUD(ctx, game);

    // Speed boost indicator
    if (this.speedTimer > 0) {
      drawText(ctx, 'SPEED BOOST!', w / 2, 70, 12 * scale, COLORS.gold);
    }
    if (this.shieldTimer > 0) {
      drawText(ctx, 'SHIELD ACTIVE!', w / 2, 70, 12 * scale, COLORS.emeraldGlow);
    }

    // Act complete overlay
    if (game.state.actComplete) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, w, h);
      drawText(ctx, 'Act II Complete!', w / 2, h * 0.35, 28 * scale, COLORS.gold);
      drawText(ctx, `Gems: ${game.state.gems}/${this.totalGems}`, w / 2, h * 0.45, 18 * scale, COLORS.emeraldGlow);
      drawText(ctx, `Score: ${game.state.score}`, w / 2, h * 0.52, 18 * scale, '#fff');

      const stars = game.state.stars.act2;
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
      drawText(ctx, 'Touch to move toward finger', w / 2, h * 0.85, 13 * scale, '#fff');
      drawText(ctx, 'Touch top of screen to jump', w / 2, h * 0.9, 12 * scale, '#ccc');
      ctx.globalAlpha = 1;
    }
  }

  private drawBuildingsBackground(ctx: CanvasRenderingContext2D, w: number, h: number, camX: number, scale: number, time: number) {
    const parallax = camX * 0.3;
    ctx.fillStyle = 'rgba(0, 40, 20, 0.5)';

    for (let i = 0; i < 12; i++) {
      const bx = (i * 120 - parallax % 120 + 120) % (12 * 120) - 60;
      const bh = 60 + (i * 37) % 100;
      const by = h * 0.6 - bh;
      ctx.fillRect(bx, by, 50 + (i * 13) % 30, bh + h * 0.4);

      // Windows
      ctx.fillStyle = `rgba(0, 255, 100, ${Math.sin(time + i) * 0.15 + 0.2})`;
      for (let wy = by + 10; wy < by + bh; wy += 20) {
        ctx.fillRect(bx + 8, wy, 6, 8);
        ctx.fillRect(bx + 22, wy, 6, 8);
      }
      ctx.fillStyle = 'rgba(0, 40, 20, 0.5)';
    }
  }

  private drawPowerupItem(ctx: CanvasRenderingContext2D, x: number, y: number, type: string, scale: number, time: number) {
    const bob = Math.sin(time * 3 + x * 0.1) * 4;
    const glow = Math.sin(time * 4) * 0.2 + 0.8;

    // Glow
    ctx.fillStyle = `rgba(255, 215, 0, ${glow * 0.25})`;
    ctx.beginPath();
    ctx.arc(x, y + bob, 20, 0, Math.PI * 2);
    ctx.fill();

    // Book shape
    ctx.fillStyle = type === 'shield' ? '#4488ff' : type === 'speed' ? '#ff8844' : '#aa44ff';
    ctx.fillRect(x - 10, y + bob - 8, 20, 16);
    // Pages
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 8, y + bob - 6, 16, 12);
    // Spine
    ctx.fillStyle = type === 'shield' ? '#2266cc' : type === 'speed' ? '#cc6622' : '#8822cc';
    ctx.fillRect(x - 10, y + bob - 8, 4, 16);

    // Label
    ctx.fillStyle = '#333';
    ctx.font = `${8 * scale}px Georgia, serif`;
    ctx.textAlign = 'center';
    const label = type === 'shield' ? '🛡' : type === 'speed' ? '⚡' : '✨';
    ctx.fillText(label, x + 2, y + bob + 4);
  }

  private drawGoal(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, time: number) {
    // Golden archway
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.arc(x, y, 30 * scale, Math.PI, 0);
    ctx.lineTo(x + 30 * scale, y + 40 * scale);
    ctx.moveTo(x - 30 * scale, y);
    ctx.lineTo(x - 30 * scale, y + 40 * scale);
    ctx.stroke();

    // Star on top
    const bob = Math.sin(time * 3) * 3;
    ctx.fillStyle = COLORS.gold;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 10 * scale : 4 * scale;
      const angle = (i * Math.PI) / 5 - Math.PI / 2 + time;
      const px = x + Math.cos(angle) * r;
      const py = y - 30 * scale + bob + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Glow
    const glow = Math.sin(time * 2) * 0.2 + 0.5;
    ctx.fillStyle = `rgba(255, 215, 0, ${glow * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y - 10 * scale, 40 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}
