// Act 6 — 'No One Mourns the Wicked' — Vertical Escape
// Climb up through crumbling palace, stay above rising green fire
import { Scene, GameEngine, actIndex } from '../engine/types';
import {
  drawElphaba, drawGlinda, drawPlatform, drawGem,
  drawHUD, drawText, COLORS,
} from '../engine/renderer';
import { particlePresets } from '../engine/particles';
import { startBgMusic, stopBgMusic } from '../engine/audio';

interface EscapePlatform {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'normal' | 'crumble' | 'safe';
  crumbleTimer: number;
  active: boolean;
  touched: boolean;
}

interface EscapeGem {
  x: number;
  y: number;
  collected: boolean;
}

interface Debris {
  x: number;
  y: number;
  vy: number;
  rotation: number;
  size: number;
  active: boolean;
}

export class Act6Scene implements Scene {
  private playerX = 0;
  private playerY = 0;
  private playerVY = 0;
  private onGround = false;
  private jumpHeld = false;
  private jumpTimer = 0;
  private jumpCooldown = 0;
  private facing = 1;

  private platforms: EscapePlatform[] = [];
  private gems: EscapeGem[] = [];
  private debris: Debris[] = [];
  private debrisTimer = 0;

  private scrollY = 0;
  private scrollSpeed = 55;
  private collapseY = 0;
  private levelTop = -4000; // How far up the level goes
  private rooftopY = -3800;

  private gravity = 600;
  private jumpForce = -480;
  private maxJumpTime = 0.28;
  private moveSpeed = 220;

  private invincibleTimer = 0;
  private trailTimer = 0;
  private noteTimer = 0;
  private totalGems = 0;

  enter(game: GameEngine) {
    const w = game.width;

    this.playerVY = 0;
    this.onGround = false;
    this.jumpHeld = false;
    this.jumpTimer = 0;
    this.jumpCooldown = 0;
    this.facing = 1;
    this.invincibleTimer = 0;
    this.trailTimer = 0;
    this.noteTimer = 0;
    this.debrisTimer = 0;
    this.scrollY = 0;
    this.scrollSpeed = 55;
    this.collapseY = 80;
    this.totalGems = 0;

    this.buildLevel(w);

    this.playerX = w * 0.5;
    this.playerY = -30; // Start near bottom of first safe platform

    game.state.gems = 0;
    game.state.score = 0;
    game.state.health = 5;
    game.state.maxHealth = 5;
    game.state.noHitBonus = true;
    game.state.levelTime = 0;
    game.state.actComplete = false;

    startBgMusic('escape');
  }

  exit(_game: GameEngine) {
    stopBgMusic();
  }

  private buildLevel(w: number) {
    this.platforms = [];
    this.gems = [];

    // Build platforms going upward (negative Y = higher)
    // Safe starting platform
    this.platforms.push({ x: 20, y: 0, w: w - 40, h: 20, type: 'safe', crumbleTimer: 0, active: true, touched: false });

    let y = -80;
    let gemIndex = 0;

    for (let i = 0; i < 50; i++) {
      const isSafe = i % 12 === 11; // Safe zone every ~12 platforms
      const isCrumble = !isSafe && Math.random() < 0.25;
      const platW = isSafe ? w * 0.8 : 80 + Math.random() * 60;
      const platX = isSafe ? w * 0.1 : 20 + Math.random() * (w - platW - 40);

      this.platforms.push({
        x: platX,
        y: y,
        w: platW,
        h: 16,
        type: isSafe ? 'safe' : (isCrumble ? 'crumble' : 'normal'),
        crumbleTimer: 0,
        active: true,
        touched: false,
      });

      // Place gem above some platforms
      if (i % 2 === 0) {
        this.gems.push({ x: platX + platW / 2, y: y - 25, collected: false });
        this.totalGems++;
      }

      y -= 65 + Math.random() * 25;
    }

    // Rooftop — the goal
    this.rooftopY = y - 50;
    this.platforms.push({
      x: 10, y: this.rooftopY, w: w - 20, h: 25,
      type: 'safe', crumbleTimer: 0, active: true, touched: false,
    });
  }

  update(game: GameEngine, dt: number) {
    if (game.state.actComplete) return;

    game.state.levelTime += dt;
    this.trailTimer += dt;
    this.noteTimer += dt;
    this.debrisTimer += dt;
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;
    if (this.jumpCooldown > 0) this.jumpCooldown -= dt;

    const w = game.width;
    const h = game.height;
    const isElphaba = game.state.character === 'elphaba';

    // Auto-scroll upward (accelerating)
    this.scrollSpeed = Math.min(100, 55 + game.state.levelTime * 0.6);
    this.scrollY -= this.scrollSpeed * dt;

    // Collapse zone rises
    this.collapseY = this.scrollY + h + 30;

    // --- MOVEMENT (same as Act 2) ---
    let vx = 0;
    const speed = this.moveSpeed;

    if (game.input.isTouching) {
      const dx = game.input.touchX - (this.playerX);
      if (Math.abs(dx) > 8) {
        vx = Math.sign(dx) * Math.min(Math.abs(dx) * 4, speed * 1.5);
        this.facing = dx > 0 ? 1 : -1;
      }

      // Auto-jump when finger is above player (screen space)
      const playerScreenY = this.playerY - this.scrollY;
      if (game.input.touchY < playerScreenY - 30 && this.onGround && this.jumpCooldown <= 0) {
        this.playerVY = this.jumpForce;
        this.jumpHeld = true;
        this.jumpTimer = 0;
        this.onGround = false;
        this.jumpCooldown = 0.25;
        game.playSound('jump');
      }
    }

    if (game.input.left) { vx = -speed; this.facing = -1; }
    if (game.input.right) { vx = speed; this.facing = 1; }

    // Keyboard jump
    if (game.input.jumpPressed && this.onGround && this.jumpCooldown <= 0) {
      this.playerVY = this.jumpForce;
      this.jumpHeld = true;
      this.jumpTimer = 0;
      this.onGround = false;
      this.jumpCooldown = 0.25;
      game.playSound('jump');
    }

    // Variable jump
    const holdingJump = game.input.jump || game.input.up || game.input.isTouching;
    if (this.jumpHeld && holdingJump && this.jumpTimer < this.maxJumpTime) {
      this.jumpTimer += dt;
    } else {
      this.jumpHeld = false;
    }

    // Gravity
    let gravityMult = 1;
    if (this.jumpHeld && this.playerVY < 0) gravityMult = 0.4;
    else if (game.input.isTouching && (game.input.touchY < (this.playerY - this.scrollY))) gravityMult = 0.6;
    this.playerVY += this.gravity * gravityMult * dt;
    if (this.playerVY > 400) this.playerVY = 400;

    // Move
    this.playerX += vx * dt;
    this.playerY += this.playerVY * dt;
    this.playerX = Math.max(15, Math.min(w - 15, this.playerX));

    // --- PLATFORM COLLISION ---
    this.onGround = false;
    const pw = 10;
    const pFeet = 16;

    for (const plat of this.platforms) {
      if (!plat.active) continue;
      if (this.playerX + pw > plat.x && this.playerX - pw < plat.x + plat.w) {
        const prevFeetY = this.playerY + pFeet - this.playerVY * dt;
        if (this.playerVY >= 0 && this.playerY + pFeet >= plat.y && prevFeetY <= plat.y + 6) {
          this.playerY = plat.y - pFeet;
          this.playerVY = 0;
          this.onGround = true;

          // Start crumble timer
          if (plat.type === 'crumble' && !plat.touched) {
            plat.touched = true;
            plat.crumbleTimer = 1.0;
          }
        }
      }
    }

    // Update crumbling platforms
    for (const plat of this.platforms) {
      if (plat.type === 'crumble' && plat.touched && plat.active) {
        plat.crumbleTimer -= dt;
        if (plat.crumbleTimer <= 0) {
          plat.active = false;
          game.playSound('crumble');
          // Rubble particles
          game.spawnParticles({
            x: plat.x + plat.w / 2, y: plat.y - this.scrollY,
            count: 8, spread: plat.w / 2,
            speed: 60, speedVariance: 40,
            life: 0.6, lifeVariance: 0.2,
            size: 4, sizeEnd: 1, sizeVariance: 2,
            color: { r: 100, g: 80, b: 60 },
            shape: 'square', gravity: 200,
            alpha: 0.8, alphaEnd: 0,
          });
        }
      }
    }

    // --- COLLECT GEMS ---
    for (const gem of this.gems) {
      if (gem.collected) continue;
      const dx = gem.x - this.playerX;
      const dy = gem.y - this.playerY;
      if (dx * dx + dy * dy < 25 * 25) {
        gem.collected = true;
        game.state.gems++;
        game.state.score += 100;
        game.playSound('gemCollect');
        game.spawnParticles(particlePresets.gemCollect(
          gem.x, gem.y - this.scrollY, isElphaba
        ));
      }
    }

    // --- DEBRIS ---
    if (this.debrisTimer > 2.5) {
      this.debrisTimer = 0;
      this.debris.push({
        x: 30 + Math.random() * (w - 60),
        y: this.scrollY - 30,
        vy: 200 + Math.random() * 150,
        rotation: Math.random() * Math.PI * 2,
        size: 6 + Math.random() * 8,
        active: true,
      });
    }

    for (const d of this.debris) {
      if (!d.active) continue;
      d.y += d.vy * dt;
      d.rotation += dt * 3;

      // Off screen below
      if (d.y > this.collapseY + 50) {
        d.active = false;
        continue;
      }

      // Hit player
      if (this.invincibleTimer <= 0) {
        const dx = d.x - this.playerX;
        const dy = d.y - this.playerY;
        if (Math.sqrt(dx * dx + dy * dy) < 18) {
          d.active = false;
          game.state.health--;
          game.state.noHitBonus = false;
          game.playSound('hit');
          game.shakeCamera(6, 0.2);
          this.invincibleTimer = 2;

          if (game.state.health <= 0) {
            game.state.health = 5;
            this.enter(game);
            return;
          }
        }
      }
    }
    this.debris = this.debris.filter(d => d.active);

    // --- FALL INTO FIRE ---
    if (this.playerY > this.collapseY - 30) {
      game.state.health--;
      game.state.noHitBonus = false;
      game.playSound('hit');
      game.shakeCamera(8, 0.3);
      this.invincibleTimer = 2;

      if (game.state.health <= 0) {
        game.state.health = 5;
        this.enter(game);
        return;
      }

      // Respawn on nearest platform above
      let bestPlat: EscapePlatform | null = null;
      let bestDist = Infinity;
      for (const plat of this.platforms) {
        if (!plat.active) continue;
        if (plat.y < this.collapseY - 50 && plat.y > this.scrollY) {
          const d = Math.abs(plat.y - this.scrollY);
          if (d < bestDist) {
            bestDist = d;
            bestPlat = plat;
          }
        }
      }
      if (bestPlat) {
        this.playerX = bestPlat.x + bestPlat.w / 2;
        this.playerY = bestPlat.y - pFeet - 5;
      } else {
        this.playerY = this.scrollY + 50;
      }
      this.playerVY = 0;
    }

    // Trail
    if (this.trailTimer > 0.07) {
      this.trailTimer = 0;
      game.spawnParticles(particlePresets.trail(
        this.playerX, this.playerY - this.scrollY + 10, isElphaba
      ));
    }

    // Musical notes
    if (this.noteTimer > 4) {
      this.noteTimer = 0;
      game.spawnParticles(particlePresets.musicalNote(Math.random() * w, h * 0.1));
    }

    // --- VICTORY: reached the rooftop ---
    if (this.playerY < this.rooftopY + 20 && this.onGround) {
      game.state.actComplete = true;
      this.completeAct(game);
    }
  }

  private completeAct(game: GameEngine) {
    let stars = 1;
    if (game.state.gems >= 20) stars++;
    if (game.state.noHitBonus) stars++;
    game.state.stars.act6 = Math.max(game.state.stars.act6, stars);

    const totalStars = Object.values(game.state.stars).reduce((a, b) => a + b, 0);
    if (totalStars >= 5 && !game.state.unlockedCostumes.includes(game.state.character === 'elphaba' ? 'elphaba_sparkly' : 'glinda_wings')) {
      game.state.unlockedCostumes.push(game.state.character === 'elphaba' ? 'elphaba_sparkly' : 'glinda_wings');
    }

    if (!game.state.lastCompletedAct || actIndex(game.state.lastCompletedAct) < actIndex('act6')) {
      game.state.lastCompletedAct = 'act6';
    }
    game.saveGame();
    game.playSound('actComplete');

    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        game.spawnParticles(particlePresets.confetti(Math.random() * game.width, game.height * 0.3));
      }, i * 200);
    }

    game.state.currentAct = 'act7';
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
    const sy = this.scrollY;

    // Sky — gets brighter as you climb
    const progress = Math.min(1, Math.abs(this.scrollY) / Math.abs(this.rooftopY));
    const topR = Math.floor(10 + progress * 50);
    const topG = Math.floor(0 + progress * 20);
    const topB = Math.floor(25 + progress * 30);
    const botR = Math.floor(15 + progress * 40);
    const botG = Math.floor(10 + progress * 30);
    const botB = Math.floor(5 + progress * 20);

    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, `rgb(${topR},${topG},${topB})`);
    skyGrad.addColorStop(1, `rgb(${botR},${botG},${botB})`);
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Palace walls on sides
    const wallW = 25 * scale;
    ctx.fillStyle = '#1a1210';
    ctx.fillRect(0, 0, wallW, h);
    ctx.fillRect(w - wallW, 0, wallW, h);

    // Brick lines
    ctx.strokeStyle = 'rgba(80, 60, 40, 0.3)';
    ctx.lineWidth = 1;
    for (let by = 0; by < h; by += 15) {
      const offset = (Math.floor((by - sy * 0.5) / 15) % 2) * 8;
      ctx.beginPath();
      ctx.moveTo(0, by);
      ctx.lineTo(wallW, by);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(w - wallW, by);
      ctx.lineTo(w, by);
      ctx.stroke();
    }

    // Windows (every ~150px of climb)
    for (let wy = -4000; wy < 200; wy += 150) {
      const screenY = wy - sy;
      if (screenY < -40 || screenY > h + 40) continue;

      // Left window
      ctx.fillStyle = `rgba(${50 + progress * 100}, ${30 + progress * 60}, ${80 + progress * 80}, 0.4)`;
      ctx.fillRect(3, screenY, wallW - 6, 25);
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.15)';
      ctx.strokeRect(3, screenY, wallW - 6, 25);

      // Right window
      ctx.fillStyle = `rgba(${50 + progress * 100}, ${30 + progress * 60}, ${80 + progress * 80}, 0.4)`;
      ctx.fillRect(w - wallW + 3, screenY, wallW - 6, 25);
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.15)';
      ctx.strokeRect(w - wallW + 3, screenY, wallW - 6, 25);
    }

    // Platforms (translated to screen space)
    for (const plat of this.platforms) {
      if (!plat.active) continue;
      const py = plat.y - sy;
      if (py < -30 || py > h + 30) continue;

      // Crumble warning
      if (plat.type === 'crumble' && plat.touched) {
        const urgency = 1 - plat.crumbleTimer;
        const shakeX = urgency > 0.5 ? (Math.random() - 0.5) * 4 : 0;
        const color = urgency > 0.8 ? '#884422' : '#664422';
        ctx.fillStyle = color;
        ctx.fillRect(plat.x + shakeX, py, plat.w, plat.h);
        // Crack lines
        ctx.strokeStyle = `rgba(200, 100, 50, ${urgency})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(plat.x + plat.w * 0.3 + shakeX, py);
        ctx.lineTo(plat.x + plat.w * 0.5 + shakeX, py + plat.h);
        ctx.moveTo(plat.x + plat.w * 0.7 + shakeX, py);
        ctx.lineTo(plat.x + plat.w * 0.6 + shakeX, py + plat.h);
        ctx.stroke();
      } else if (plat.type === 'safe') {
        drawPlatform(ctx, plat.x, py, plat.w, plat.h, 'gold');
      } else {
        drawPlatform(ctx, plat.x, py, plat.w, plat.h, 'emerald');
      }
    }

    // Gems
    for (const gem of this.gems) {
      if (gem.collected) continue;
      const gy = gem.y - sy;
      if (gy < -20 || gy > h + 20) continue;
      drawGem(ctx, gem.x, gy, 8, isElphaba, t);
    }

    // Debris
    for (const d of this.debris) {
      if (!d.active) continue;
      const dy = d.y - sy;
      if (dy < -20 || dy > h + 20) continue;
      ctx.save();
      ctx.translate(d.x, dy);
      ctx.rotate(d.rotation);
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(-d.size / 2, -d.size / 2, d.size, d.size);
      ctx.restore();
    }

    // Player
    const playerScreenY = this.playerY - sy;
    const blink = this.invincibleTimer > 0 && Math.sin(this.invincibleTimer * 15) > 0;
    if (!blink) {
      ctx.save();
      if (this.facing < 0) {
        ctx.translate(this.playerX, 0);
        ctx.scale(-1, 1);
        ctx.translate(-this.playerX, 0);
      }
      const charScale = scale * 1.3;
      if (isElphaba) {
        drawElphaba(ctx, this.playerX, playerScreenY - 5, charScale, t, {
          sparkly: game.state.unlockedCostumes.includes('elphaba_sparkly'),
        });
      } else {
        drawGlinda(ctx, this.playerX, playerScreenY - 5, charScale, t, {
          goldenWings: game.state.unlockedCostumes.includes('glinda_wings'),
        });
      }
      ctx.restore();
    }

    // Green fire at bottom (collapse zone)
    const fireY = this.collapseY - sy;
    if (fireY < h + 50) {
      const fireGrad = ctx.createLinearGradient(0, fireY - 40, 0, fireY + 60);
      fireGrad.addColorStop(0, 'rgba(0, 255, 80, 0)');
      fireGrad.addColorStop(0.3, 'rgba(0, 200, 60, 0.4)');
      fireGrad.addColorStop(0.7, 'rgba(0, 150, 40, 0.7)');
      fireGrad.addColorStop(1, 'rgba(0, 80, 20, 0.9)');
      ctx.fillStyle = fireGrad;
      ctx.fillRect(0, fireY - 40, w, h - fireY + 100);

      // Fire bubbles
      for (let i = 0; i < 8; i++) {
        const bx = (i * w / 7 + Math.sin(t * 2 + i) * 15) % w;
        const by = fireY - 10 + Math.sin(t * 3 + i * 1.5) * 15;
        ctx.fillStyle = `rgba(0, 255, 100, ${Math.sin(t * 4 + i) * 0.15 + 0.25})`;
        ctx.beginPath();
        ctx.arc(bx, by, 8 + Math.sin(t * 2 + i) * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Rooftop glow if near top
    if (progress > 0.85) {
      const roofScreenY = this.rooftopY - sy;
      if (roofScreenY > -100 && roofScreenY < h) {
        const glowA = Math.sin(t * 2) * 0.1 + 0.2;
        ctx.fillStyle = `rgba(255, 215, 0, ${glowA})`;
        ctx.fillRect(0, roofScreenY - 50, w, 30);
        drawText(ctx, 'Freedom!', w / 2, roofScreenY - 35, 16 * scale, COLORS.gold);
      }
    }

    // HUD
    drawHUD(ctx, game);

    // Act complete overlay
    if (game.state.actComplete) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, w, h);
      drawText(ctx, 'Act VI Complete!', w / 2, h * 0.3, 28 * scale, COLORS.gold);
      drawText(ctx, 'You escaped!', w / 2, h * 0.38, 18 * scale, '#fff');
      drawText(ctx, `Gems: ${game.state.gems}`, w / 2, h * 0.47, 18 * scale, COLORS.emeraldGlow);
      drawText(ctx, `Score: ${game.state.score}`, w / 2, h * 0.54, 18 * scale, '#fff');

      const stars = game.state.stars.act6;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < stars ? COLORS.gold : 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        for (let si = 0; si < 10; si++) {
          const r = si % 2 === 0 ? 15 * scale : 7 * scale;
          const angle = (si * Math.PI) / 5 - Math.PI / 2;
          const sx = w / 2 - 40 * scale + i * 40 * scale + Math.cos(angle) * r;
          const ssy = h * 0.64 + Math.sin(angle) * r;
          if (si === 0) ctx.moveTo(sx, ssy);
          else ctx.lineTo(sx, ssy);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    // Controls hint
    if (game.state.levelTime < 5 && !game.state.actComplete) {
      const alpha = Math.max(0, 1 - game.state.levelTime / 5);
      ctx.globalAlpha = alpha;
      drawText(ctx, 'Climb up! Stay above the fire!', w / 2, h * 0.83, 14 * scale, '#fff');
      drawText(ctx, 'Touch above to jump!', w / 2, h * 0.88, 12 * scale, '#ccc');
      ctx.globalAlpha = 1;
    }
  }
}
