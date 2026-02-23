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
  moveTimer?: number; moveRange?: number; origX?: number; origY?: number;
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
  private jumpCooldown = 0;
  private cameraX = 0;
  private cameraY = 0;
  private facing = 1;
  private invincibleTimer = 0;
  private lastSafeX = 60;
  private lastSafeY = 0;

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
  private jumpForce = -380;
  private maxJumpTime = 0.22;

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
    this.jumpCooldown = 0;
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
    this.lastSafeX = 60;
    this.lastSafeY = this.levelHeight - 100;
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

    this.platforms = [
      // Ground sections — connected with smaller gaps for a child
      { x: 0, y: groundY, w: 500, h: 30, type: 'emerald' },
      { x: 550, y: groundY, w: 350, h: 30, type: 'default' },
      { x: 950, y: groundY, w: 350, h: 30, type: 'emerald' },
      { x: 1350, y: groundY, w: 400, h: 30, type: 'default' },
      { x: 1800, y: groundY, w: 300, h: 30, type: 'emerald' },
      { x: 2150, y: groundY, w: 350, h: 30, type: 'default' },
      { x: 2550, y: groundY, w: 300, h: 30, type: 'emerald' },
      { x: 2900, y: groundY, w: 500, h: 30, type: 'gold' },

      // Elevated platforms — rooftops & bridges
      { x: 200, y: groundY - 70, w: 120, h: 18, type: 'emerald' },
      { x: 400, y: groundY - 130, w: 100, h: 18, type: 'default' },
      { x: 620, y: groundY - 90, w: 130, h: 18, type: 'emerald' },
      { x: 850, y: groundY - 150, w: 110, h: 18, type: 'gold' },
      { x: 1050, y: groundY - 100, w: 150, h: 18, type: 'default' },
      { x: 1250, y: groundY - 170, w: 100, h: 18, type: 'emerald' },
      { x: 1450, y: groundY - 80, w: 130, h: 18, type: 'default' },
      { x: 1650, y: groundY - 140, w: 110, h: 18, type: 'emerald' },
      { x: 1850, y: groundY - 200, w: 100, h: 18, type: 'gold' },

      // Higher platforms
      { x: 2050, y: groundY - 120, w: 110, h: 18, type: 'emerald' },
      { x: 2250, y: groundY - 170, w: 100, h: 18, type: 'default' },
      { x: 2450, y: groundY - 90, w: 130, h: 18, type: 'emerald' },
      { x: 2650, y: groundY - 150, w: 110, h: 18, type: 'gold' },
      { x: 2850, y: groundY - 100, w: 130, h: 18, type: 'default' },
      { x: 3050, y: groundY - 80, w: 150, h: 18, type: 'gold' },

      // Moving platforms — use moveTimer (starts at 0, increments by dt)
      { x: 500, y: groundY - 50, w: 80, h: 18, type: 'gold', moving: true, moveTimer: 0, moveRange: 60, origX: 500, origY: groundY - 50 },
      { x: 1750, y: groundY - 90, w: 80, h: 18, type: 'gold', moving: true, moveTimer: 0, moveRange: 80, origX: 1750, origY: groundY - 90 },
    ];

    // Gems scattered along the level
    this.gems = [];
    this.totalGems = 0;
    const gemPositions = [
      [150, groundY - 30], [300, groundY - 100], [450, groundY - 160],
      [650, groundY - 120], [800, groundY - 30], [900, groundY - 180],
      [1080, groundY - 130], [1280, groundY - 200], [1400, groundY - 30],
      [1500, groundY - 110], [1680, groundY - 170], [1880, groundY - 230],
      [1950, groundY - 30], [2080, groundY - 150], [2280, groundY - 200],
      [2400, groundY - 30], [2500, groundY - 120], [2680, groundY - 180],
      [2800, groundY - 30], [2950, groundY - 130], [3080, groundY - 110],
      [3200, groundY - 30],
    ];
    for (const [gx, gy] of gemPositions) {
      this.gems.push({ x: gx, y: gy, collected: false, type: 'gem' });
      this.totalGems++;
    }

    // NPCs (Ozians)
    this.npcs = [
      { x: 300, y: groundY - 20, message: 'Go Havi!', talked: false },
      { x: 900, y: groundY - 20, message: "You're wonderful!", talked: false },
      { x: 1500, y: groundY - 20, message: 'You can do it!', talked: false },
      { x: 2200, y: groundY - 20, message: 'Almost there!', talked: false },
      { x: 3000, y: groundY - 20, message: 'Havi is amazing!', talked: false },
    ];

    // Switches and gates
    this.switches = [
      { x: 950, y: groundY - 50, activated: false, gateIndex: 0 },
      { x: 2200, y: groundY - 50, activated: false, gateIndex: 1 },
    ];

    this.gates = [
      { x: 1300, y: groundY - 120, w: 20, h: 120, open: false, openAmount: 0 },
      { x: 2500, y: groundY - 120, w: 20, h: 120, open: false, openAmount: 0 },
    ];

    // Power-ups
    this.powerups = [
      { x: 850, y: groundY - 190, type: 'shield', collected: false },
      { x: 1850, y: groundY - 240, type: 'speed', collected: false },
      { x: 2850, y: groundY - 140, type: 'fly', collected: false },
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
    if (this.jumpCooldown > 0) this.jumpCooldown -= dt;

    const isElphaba = game.state.character === 'elphaba';
    const speed = this.speedTimer > 0 ? this.moveSpeed * 1.5 : this.moveSpeed;

    // --- MOVEMENT ---
    this.playerVX = 0;

    if (game.input.isTouching) {
      // Convert screen touch to world X and move toward it
      const worldTouchX = game.input.touchX + this.cameraX;
      const dx = worldTouchX - this.playerX;
      if (Math.abs(dx) > 15) {
        this.playerVX = Math.sign(dx) * speed;
        this.facing = dx > 0 ? 1 : -1;
      }
    }

    // Keyboard overrides
    if (game.input.left) {
      this.playerVX = -speed;
      this.facing = -1;
    }
    if (game.input.right) {
      this.playerVX = speed;
      this.facing = 1;
    }

    // --- JUMP ---
    // Tap upper 40% of screen to jump (with cooldown to prevent spamming)
    const touchJump = game.input.isTouching && (game.input.touchY / game.height) < 0.35;
    const keyJump = game.input.jumpPressed;

    if ((touchJump || keyJump) && this.onGround && this.jumpCooldown <= 0) {
      this.playerVY = this.jumpForce;
      this.jumpHeld = true;
      this.jumpTimer = 0;
      this.onGround = false;
      this.jumpCooldown = 0.3; // Prevent re-jump for 300ms
      game.playSound('jump');
    }

    // Variable jump height — hold touch/key for higher jump
    const holdingJump = game.input.jump || game.input.up || touchJump;
    if (this.jumpHeld && holdingJump && this.jumpTimer < this.maxJumpTime) {
      this.jumpTimer += dt;
    } else {
      this.jumpHeld = false;
    }

    // Gravity (reduced while holding jump for variable height)
    const gravityMult = (this.jumpHeld && this.playerVY < 0) ? 0.5 : 1;
    this.playerVY += this.gravity * gravityMult * dt;
    if (this.playerVY > 500) this.playerVY = 500;

    // Move player
    this.playerX += this.playerVX * dt;
    this.playerY += this.playerVY * dt;

    // Update moving platforms
    for (const plat of this.platforms) {
      if (plat.moving && plat.origY !== undefined) {
        plat.moveTimer = (plat.moveTimer || 0) + dt;
        // Full oscillation in ~3 seconds (2*PI / 2.0 ≈ 3.14s)
        plat.y = plat.origY + Math.sin(plat.moveTimer * 2.0) * (plat.moveRange || 50);
      }
    }

    // --- PLATFORM COLLISION ---
    this.onGround = false;
    const pw = 12; // player half-width
    const pFeet = 18; // feet offset from center
    const pHead = 28; // head offset from center

    for (const plat of this.platforms) {
      // Check horizontal overlap
      if (this.playerX + pw > plat.x && this.playerX - pw < plat.x + plat.w) {
        // Landing on top of platform
        const prevFeetY = this.playerY + pFeet - this.playerVY * dt;
        if (this.playerVY >= 0 &&
            this.playerY + pFeet >= plat.y &&
            prevFeetY <= plat.y + 6) {
          this.playerY = plat.y - pFeet;
          this.playerVY = 0;
          this.onGround = true;
          // Record safe position
          this.lastSafeX = this.playerX;
          this.lastSafeY = this.playerY;
        }
        // Hit head on bottom of platform
        else if (this.playerVY < 0 &&
                 this.playerY - pHead < plat.y + plat.h &&
                 this.playerY - pHead > plat.y - 8) {
          this.playerY = plat.y + plat.h + pHead;
          this.playerVY = 0;
        }
      }

      // Side collision (for thick ground platforms)
      if (plat.h >= 25 &&
          this.playerY + pFeet > plat.y + 4 &&
          this.playerY - pHead < plat.y + plat.h) {
        // Hitting right side of player against left side of platform
        if (this.playerVX > 0 &&
            this.playerX + pw > plat.x &&
            this.playerX + pw < plat.x + 8) {
          this.playerX = plat.x - pw;
        }
        // Hitting left side of player against right side of platform
        if (this.playerVX < 0 &&
            this.playerX - pw < plat.x + plat.w &&
            this.playerX - pw > plat.x + plat.w - 8) {
          this.playerX = plat.x + plat.w + pw;
        }
      }
    }

    // --- GATE COLLISION ---
    for (const gate of this.gates) {
      if (gate.open) {
        gate.openAmount = Math.min(1, gate.openAmount + dt * 2);
      }
      // Only block if gate is not fully open
      if (gate.openAmount >= 1) continue;

      const effectiveH = gate.h * (1 - gate.openAmount);
      const effectiveY = gate.y + gate.h - effectiveH;

      if (this.playerX + pw > gate.x && this.playerX - pw < gate.x + gate.w &&
          this.playerY + pFeet > effectiveY && this.playerY - pHead < effectiveY + effectiveH) {
        if (this.playerVX > 0) this.playerX = gate.x - pw;
        else if (this.playerVX < 0) this.playerX = gate.x + gate.w + pw;
      }
    }

    // --- FALL RECOVERY ---
    if (this.playerY > this.levelHeight + 50) {
      game.state.health--;
      game.state.noHitBonus = false;
      game.playSound('hit');
      game.shakeCamera(8, 0.3);
      if (game.state.health <= 0) {
        game.state.health = 3;
        this.enter(game);
        return;
      }
      // Respawn at last safe ground position
      this.playerX = this.lastSafeX;
      this.playerY = this.lastSafeY - 10;
      this.playerVY = 0;
      this.playerVX = 0;
      this.invincibleTimer = 2.0;
    }

    // Clamp to level bounds
    this.playerX = Math.max(15, Math.min(this.levelWidth, this.playerX));

    // --- COLLECTIBLES ---
    for (const gem of this.gems) {
      if (gem.collected) continue;
      const dx = gem.x - this.playerX;
      const dy = gem.y - this.playerY;
      if (dx * dx + dy * dy < 30 * 30) {
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
      if (dx * dx + dy * dy < 35 * 35) {
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
      if (dx * dx + dy * dy < 28 * 28) {
        pu.collected = true;
        game.playSound('powerUp');
        if (pu.type === 'shield') {
          this.shieldTimer = 8;
          this.invincibleTimer = 8;
        } else if (pu.type === 'speed') {
          this.speedTimer = 8;
        } else if (pu.type === 'fly') {
          this.playerVY = -450;
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

    // --- CAMERA ---
    const targetCX = this.playerX - game.width * 0.35;
    const targetCY = this.playerY - game.height * 0.55;
    this.cameraX += (targetCX - this.cameraX) * Math.min(1, dt * 5);
    this.cameraY += (targetCY - this.cameraY) * Math.min(1, dt * 3);
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
    drawEmeraldCity(ctx, w * 0.7 - cx * 0.1, h * 0.5, scale * 0.8, game.time);
    ctx.globalAlpha = 1;

    // Buildings background (parallax)
    this.drawBuildingsBackground(ctx, w, h, cx, game.time);

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
      ctx.strokeStyle = sw.activated ? COLORS.gold : '#888';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sw.x, sw.y);
      ctx.lineTo(sw.x + (sw.activated ? 8 : -8), sw.y - 12);
      ctx.stroke();
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
      drawNPC(ctx, npc.x, npc.y, scale * 1.2, game.time, dist < 120 ? npc.message : '');
    }

    // Player
    const blink = this.invincibleTimer > 0 && Math.sin(this.invincibleTimer * 15) > 0;
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

    // Power-up indicators
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
    if (game.state.levelTime < 5) {
      const alpha = Math.max(0, 1 - game.state.levelTime / 5);
      ctx.globalAlpha = alpha;
      drawText(ctx, 'Drag to move!', w / 2, h * 0.83, 15 * scale, '#fff');
      drawText(ctx, 'Touch top of screen to jump!', w / 2, h * 0.89, 13 * scale, '#ccc');
      ctx.globalAlpha = 1;
    }
  }

  private drawBuildingsBackground(ctx: CanvasRenderingContext2D, w: number, h: number, camX: number, time: number) {
    const parallax = camX * 0.3;
    ctx.fillStyle = 'rgba(0, 40, 20, 0.5)';

    for (let i = 0; i < 12; i++) {
      const bx = (i * 120 - parallax % 120 + 120) % (12 * 120) - 60;
      const bh = 60 + (i * 37) % 100;
      const by = h * 0.6 - bh;
      ctx.fillRect(bx, by, 50 + (i * 13) % 30, bh + h * 0.4);

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

    ctx.fillStyle = `rgba(255, 215, 0, ${glow * 0.25})`;
    ctx.beginPath();
    ctx.arc(x, y + bob, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = type === 'shield' ? '#4488ff' : type === 'speed' ? '#ff8844' : '#aa44ff';
    ctx.fillRect(x - 10, y + bob - 8, 20, 16);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 8, y + bob - 6, 16, 12);
    ctx.fillStyle = type === 'shield' ? '#2266cc' : type === 'speed' ? '#cc6622' : '#8822cc';
    ctx.fillRect(x - 10, y + bob - 8, 4, 16);

    // Simple text label instead of emoji
    ctx.fillStyle = '#333';
    ctx.font = `bold ${8 * scale}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = type === 'shield' ? 'S' : type === 'speed' ? 'F' : 'M';
    ctx.fillText(label, x + 2, y + bob);
  }

  private drawGoal(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, time: number) {
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 4 * scale;
    ctx.beginPath();
    ctx.arc(x, y, 30 * scale, Math.PI, 0);
    ctx.lineTo(x + 30 * scale, y + 40 * scale);
    ctx.moveTo(x - 30 * scale, y);
    ctx.lineTo(x - 30 * scale, y + 40 * scale);
    ctx.stroke();

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

    const glowA = Math.sin(time * 2) * 0.2 + 0.5;
    ctx.fillStyle = `rgba(255, 215, 0, ${glowA * 0.2})`;
    ctx.beginPath();
    ctx.arc(x, y - 10 * scale, 40 * scale, 0, Math.PI * 2);
    ctx.fill();
  }
}
