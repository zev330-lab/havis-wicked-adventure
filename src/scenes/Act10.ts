// Act 10 — 'One Short Day' — Sightseeing Dash
// Top-down auto-scrolling runner through the Emerald City.
// Drag left/right to steer around obstacles and visit landmarks.
import { Scene, GameEngine, actIndex } from '../engine/types';
import { drawElphaba, drawGlinda, drawGem, drawText, COLORS } from '../engine/renderer';
import { particlePresets } from '../engine/particles';
import { startBgMusic, stopBgMusic } from '../engine/audio';

interface Landmark {
  x: number;
  y: number;       // world-space y (scrolls upward)
  name: string;
  visited: boolean;
  glowPhase: number;
}

interface Obstacle {
  x: number;
  y: number;
  type: 'cart' | 'fountain' | 'crowd';
  w: number;
  h: number;
}

interface GemItem {
  x: number;
  y: number;
  collected: boolean;
}

export class Act10Scene implements Scene {
  private playerX = 0;
  private playerY = 0;
  private scrollY = 0;
  private scrollSpeed = 160;   // pixels per second
  private slowTimer = 0;       // slow debuff remaining
  private landmarks: Landmark[] = [];
  private obstacles: Obstacle[] = [];
  private gems: GemItem[] = [];
  private visitedCount = 0;
  private trailTimer = 0;
  private noteTimer = 0;
  private roadLineOffset = 0;

  // World generation tracking
  private nextObstacleY = 0;
  private nextGemY = 0;
  private worldGenY = 0;       // how far we've generated

  enter(game: GameEngine) {
    const w = game.width;
    const h = game.height;

    this.playerX = w * 0.5;
    this.playerY = h * 0.78;
    this.scrollY = 0;
    this.scrollSpeed = 160;
    this.slowTimer = 0;
    this.visitedCount = 0;
    this.trailTimer = 0;
    this.noteTimer = 0;
    this.roadLineOffset = 0;
    this.nextObstacleY = 0;
    this.nextGemY = 0;
    this.worldGenY = 0;

    game.state.gems = 0;
    game.state.score = 0;
    game.state.health = 3;
    game.state.maxHealth = 3;
    game.state.noHitBonus = true;
    game.state.levelTime = 0;
    game.state.actComplete = false;

    // Create 6 landmarks spaced evenly along the path
    const totalDistance = 3200;
    this.landmarks = [];
    const landmarkNames = [
      'Emerald Palace',
      'Crystal Tower',
      'Wizard Museum',
      'Ozdust Ballroom',
      'Rose Garden',
      'Clock Tower',
    ];
    for (let i = 0; i < 6; i++) {
      const ly = 400 + i * (totalDistance / 6);
      const lx = 60 + Math.random() * (w - 120);
      this.landmarks.push({
        x: lx,
        y: ly,
        name: landmarkNames[i],
        visited: false,
        glowPhase: Math.random() * Math.PI * 2,
      });
    }

    // Pre-generate obstacles and gems
    this.obstacles = [];
    this.gems = [];
    this.generateWorld(game, totalDistance + 600);

    startBgMusic('oneShortDay');
  }

  exit(_game: GameEngine) {
    stopBgMusic();
  }

  private generateWorld(game: GameEngine, untilY: number) {
    const w = game.width;

    // Obstacles every ~150-250px
    while (this.nextObstacleY < untilY) {
      this.nextObstacleY += 150 + Math.random() * 100;
      const type = (['cart', 'fountain', 'crowd'] as const)[Math.floor(Math.random() * 3)];
      const ox = 40 + Math.random() * (w - 80);
      const ow = type === 'fountain' ? 40 : type === 'cart' ? 50 : 60;
      const oh = type === 'fountain' ? 40 : type === 'cart' ? 30 : 35;
      this.obstacles.push({ x: ox, y: this.nextObstacleY, type, w: ow, h: oh });
    }

    // Gems every ~80px
    while (this.nextGemY < untilY) {
      this.nextGemY += 60 + Math.random() * 40;
      const gx = 30 + Math.random() * (w - 60);
      this.gems.push({ x: gx, y: this.nextGemY, collected: false });
    }
  }

  update(game: GameEngine, dt: number) {
    if (game.state.actComplete) return;

    game.state.levelTime += dt;
    this.trailTimer += dt;
    this.noteTimer += dt;

    const w = game.width;

    // Handle slow debuff
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
    }

    const currentSpeed = this.slowTimer > 0 ? this.scrollSpeed * 0.4 : this.scrollSpeed;

    // Scroll the world
    this.scrollY += currentSpeed * dt;
    this.roadLineOffset = (this.roadLineOffset + currentSpeed * dt) % 40;

    // Player movement — drag horizontally
    if (game.input.isTouching) {
      this.playerX += (game.input.touchX - this.playerX) * Math.min(1, dt * 12);
    }
    if (game.input.left) this.playerX -= 220 * dt;
    if (game.input.right) this.playerX += 220 * dt;
    this.playerX = Math.max(30, Math.min(w - 30, this.playerX));

    // Player world-space Y for collision
    const playerWorldY = this.scrollY + this.playerY;

    // Check landmark visits
    for (const lm of this.landmarks) {
      if (lm.visited) continue;
      const dx = lm.x - this.playerX;
      const dy = lm.y - playerWorldY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        lm.visited = true;
        this.visitedCount++;
        game.playSound('powerUp');
        game.spawnParticles(particlePresets.confetti(this.playerX, this.playerY - 40));
        game.state.score += 500;
      }
    }

    // Check obstacle collisions
    for (const obs of this.obstacles) {
      const screenY = obs.y - this.scrollY;
      if (screenY < -60 || screenY > game.height + 60) continue;

      const dx = Math.abs(this.playerX - obs.x);
      const dy = Math.abs(playerWorldY - obs.y);
      if (dx < (obs.w / 2 + 15) && dy < (obs.h / 2 + 15)) {
        if (this.slowTimer <= 0) {
          this.slowTimer = 1.0;
          game.playSound('hit');
          game.shakeCamera(4, 0.15);
        }
      }
    }

    // Collect gems
    const isElphaba = game.state.character === 'elphaba';
    for (const gem of this.gems) {
      if (gem.collected) continue;
      const screenY = gem.y - this.scrollY;
      if (screenY < -30 || screenY > game.height + 30) continue;

      const dx = Math.abs(this.playerX - gem.x);
      const dy = Math.abs(playerWorldY - gem.y);
      if (dx < 25 && dy < 25) {
        gem.collected = true;
        game.state.gems++;
        game.state.score += 100;
        game.playSound('catchItem');
        game.spawnParticles(particlePresets.gemCollect(gem.x, screenY, isElphaba));
      }
    }

    // Trail particles
    if (this.trailTimer > 0.1) {
      this.trailTimer = 0;
      game.spawnParticles(particlePresets.trail(this.playerX, this.playerY + 15, isElphaba));
    }

    // Musical notes
    if (this.noteTimer > 3) {
      this.noteTimer = 0;
      game.spawnParticles(particlePresets.musicalNote(Math.random() * w, game.height * 0.1));
    }

    // Win condition — all 6 landmarks visited
    if (this.visitedCount >= 6) {
      game.state.actComplete = true;
      this.completeAct(game);
    }
  }

  private completeAct(game: GameEngine) {
    let stars = 1;
    if (game.state.gems >= 30) stars++;
    if (game.state.levelTime <= 50) stars++;
    game.state.stars.act10 = Math.max(game.state.stars.act10, stars);

    if (!game.state.lastCompletedAct || actIndex(game.state.lastCompletedAct) < actIndex('act10')) {
      game.state.lastCompletedAct = 'act10';
    }
    game.saveGame();
    game.playSound('actComplete');

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        game.spawnParticles(particlePresets.confetti(Math.random() * game.width, game.height * 0.3));
      }, i * 200);
    }

    setTimeout(() => {
      game.state.currentAct = 'act11';
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

    // --- Background: Emerald City top-down view ---
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#003322');
    bgGrad.addColorStop(0.5, '#004d33');
    bgGrad.addColorStop(1, '#002211');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Sidewalks on sides
    ctx.fillStyle = '#1a3d2e';
    ctx.fillRect(0, 0, 25, h);
    ctx.fillRect(w - 25, 0, 25, h);

    // Road surface
    ctx.fillStyle = '#0a2a1a';
    ctx.fillRect(25, 0, w - 50, h);

    // Scrolling road center lines
    ctx.strokeStyle = 'rgba(51, 255, 153, 0.3)';
    ctx.lineWidth = 2;
    ctx.setLineDash([12, 12]);
    const centerX = w / 2;
    for (let ly = -this.roadLineOffset; ly < h; ly += 40) {
      ctx.beginPath();
      ctx.moveTo(centerX, ly);
      ctx.lineTo(centerX, ly + 20);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Buildings on sidewalks (decorative rectangles scrolling)
    ctx.fillStyle = 'rgba(0, 100, 60, 0.4)';
    const buildingOffset = (this.scrollY * 0.3) % 120;
    for (let by = -buildingOffset; by < h + 120; by += 120) {
      // Left side buildings
      ctx.fillRect(0, by, 22, 80);
      ctx.fillStyle = 'rgba(0, 150, 80, 0.3)';
      ctx.fillRect(3, by + 5, 16, 15);
      ctx.fillRect(3, by + 30, 16, 15);
      ctx.fillStyle = 'rgba(0, 100, 60, 0.4)';

      // Right side buildings
      ctx.fillRect(w - 22, by + 40, 22, 80);
      ctx.fillStyle = 'rgba(0, 150, 80, 0.3)';
      ctx.fillRect(w - 19, by + 45, 16, 15);
      ctx.fillRect(w - 19, by + 70, 16, 15);
      ctx.fillStyle = 'rgba(0, 100, 60, 0.4)';
    }

    // --- Draw landmarks ---
    for (const lm of this.landmarks) {
      const screenY = lm.y - this.scrollY;
      if (screenY < -100 || screenY > h + 100) continue;

      const glow = Math.sin(t * 2 + lm.glowPhase) * 0.15 + 0.35;

      if (lm.visited) {
        // Visited: gold glow
        ctx.fillStyle = `rgba(255, 215, 0, ${glow + 0.2})`;
      } else {
        // Unvisited: bright emerald glow
        ctx.fillStyle = `rgba(51, 255, 153, ${glow})`;
      }

      // Landmark as large glowing structure
      const lx = lm.x;
      const ly = screenY;

      // Outer glow
      const glowGrad = ctx.createRadialGradient(lx, ly, 0, lx, ly, 55);
      if (lm.visited) {
        glowGrad.addColorStop(0, 'rgba(255, 215, 0, 0.3)');
        glowGrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
      } else {
        glowGrad.addColorStop(0, 'rgba(51, 255, 153, 0.25)');
        glowGrad.addColorStop(1, 'rgba(51, 255, 153, 0)');
      }
      ctx.fillStyle = glowGrad;
      ctx.fillRect(lx - 60, ly - 60, 120, 120);

      // Building shape
      ctx.fillStyle = lm.visited ? COLORS.gold : COLORS.emeraldGlow;
      ctx.beginPath();
      ctx.moveTo(lx, ly - 30);           // spire top
      ctx.lineTo(lx + 20, ly - 10);
      ctx.lineTo(lx + 18, ly + 20);
      ctx.lineTo(lx - 18, ly + 20);
      ctx.lineTo(lx - 20, ly - 10);
      ctx.closePath();
      ctx.fill();

      // Door
      ctx.fillStyle = lm.visited ? '#b8960f' : '#006633';
      ctx.fillRect(lx - 5, ly + 8, 10, 12);

      // Name label
      drawText(ctx, lm.name, lx, ly + 32, 9 * scale, lm.visited ? COLORS.gold : '#aaffcc');
    }

    // --- Draw obstacles ---
    for (const obs of this.obstacles) {
      const screenY = obs.y - this.scrollY;
      if (screenY < -50 || screenY > h + 50) continue;

      switch (obs.type) {
        case 'cart': {
          // Brown vendor cart
          ctx.fillStyle = '#8B4513';
          ctx.fillRect(obs.x - obs.w / 2, screenY - obs.h / 2, obs.w, obs.h);
          ctx.fillStyle = '#A0522D';
          ctx.fillRect(obs.x - obs.w / 2 + 3, screenY - obs.h / 2 + 3, obs.w - 6, obs.h - 6);
          // Wheels
          ctx.fillStyle = '#5a3010';
          ctx.beginPath();
          ctx.arc(obs.x - obs.w / 2 + 5, screenY + obs.h / 2, 4, 0, Math.PI * 2);
          ctx.arc(obs.x + obs.w / 2 - 5, screenY + obs.h / 2, 4, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'fountain': {
          // Blue fountain circle
          ctx.fillStyle = 'rgba(50, 130, 220, 0.6)';
          ctx.beginPath();
          ctx.arc(obs.x, screenY, obs.w / 2, 0, Math.PI * 2);
          ctx.fill();
          // Water ripple
          ctx.strokeStyle = 'rgba(100, 180, 255, 0.5)';
          ctx.lineWidth = 1.5;
          const ripple = Math.sin(t * 3) * 3;
          ctx.beginPath();
          ctx.arc(obs.x, screenY, obs.w / 2 - 6 + ripple, 0, Math.PI * 2);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(obs.x, screenY, obs.w / 2 - 12 + ripple * 0.5, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'crowd': {
          // Green cluster of people
          ctx.fillStyle = 'rgba(50, 160, 80, 0.7)';
          for (let ci = 0; ci < 5; ci++) {
            const cx = obs.x - 15 + (ci % 3) * 15;
            const cy = screenY - 8 + Math.floor(ci / 3) * 16;
            ctx.beginPath();
            ctx.arc(cx, cy, 8, 0, Math.PI * 2);
            ctx.fill();
            // Head
            ctx.fillStyle = 'rgba(80, 200, 100, 0.8)';
            ctx.beginPath();
            ctx.arc(cx, cy - 7, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(50, 160, 80, 0.7)';
          }
          break;
        }
      }
    }

    // --- Draw gems ---
    for (const gem of this.gems) {
      if (gem.collected) continue;
      const screenY = gem.y - this.scrollY;
      if (screenY < -20 || screenY > h + 20) continue;
      drawGem(ctx, gem.x, screenY, 8 * scale, isElphaba, t);
    }

    // --- Draw player characters (smaller for top-down) ---
    const charScale = scale * 1.1;
    if (isElphaba) {
      drawElphaba(ctx, this.playerX, this.playerY, charScale, t, {});
    } else {
      drawGlinda(ctx, this.playerX, this.playerY, charScale, t, {});
    }

    // Slow debuff visual
    if (this.slowTimer > 0) {
      ctx.strokeStyle = 'rgba(255, 100, 50, 0.5)';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.5 + Math.sin(t * 8) * 0.3;
      ctx.beginPath();
      ctx.arc(this.playerX, this.playerY, 25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      drawText(ctx, 'SLOW!', this.playerX, this.playerY - 35, 11 * scale, '#ff6633');
    }

    // --- Passport stamps bar (bottom of screen) ---
    this.drawPassportBar(ctx, w, h, scale, t);

    // --- HUD: gems and time ---
    drawText(ctx, `Gems: ${game.state.gems}`, w * 0.18, 22, 13 * scale, COLORS.emeraldGlow);
    const timeStr = `Time: ${Math.floor(game.state.levelTime)}s`;
    drawText(ctx, timeStr, w * 0.82, 22, 13 * scale, '#fff');

    // --- Controls hint ---
    if (game.state.levelTime < 4) {
      const alpha = Math.max(0, 1 - game.state.levelTime / 4);
      ctx.globalAlpha = alpha;
      drawText(ctx, 'Drag left/right to steer!', w / 2, h * 0.5, 15 * scale, '#fff');
      drawText(ctx, 'Visit all 6 landmarks!', w / 2, h * 0.55, 13 * scale, '#aaffcc');
      ctx.globalAlpha = 1;
    }

    // --- Act complete overlay ---
    if (game.state.actComplete) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, w, h);
      drawText(ctx, 'Act X Complete!', w / 2, h * 0.32, 28 * scale, COLORS.gold);
      drawText(ctx, '"One Short Day"', w / 2, h * 0.39, 16 * scale, COLORS.emeraldGlow);
      drawText(ctx, `Landmarks Visited: ${this.visitedCount}/6`, w / 2, h * 0.47, 16 * scale, COLORS.pinkGlow);
      drawText(ctx, `Gems: ${game.state.gems}`, w / 2, h * 0.53, 16 * scale, '#fff');
      drawText(ctx, `Time: ${Math.floor(game.state.levelTime)}s`, w / 2, h * 0.59, 14 * scale, '#ccc');

      const stars = game.state.stars.act10;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < stars ? COLORS.gold : 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        for (let si = 0; si < 10; si++) {
          const r = si % 2 === 0 ? 15 * scale : 7 * scale;
          const angle = (si * Math.PI) / 5 - Math.PI / 2;
          const sx = w / 2 - 40 * scale + i * 40 * scale + Math.cos(angle) * r;
          const sy = h * 0.68 + Math.sin(angle) * r;
          if (si === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  private drawPassportBar(ctx: CanvasRenderingContext2D, w: number, h: number, scale: number, t: number) {
    const barY = h - 38;
    const barH = 32;

    // Background panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.roundRect(w * 0.08, barY, w * 0.84, barH, 10);
    ctx.fill();

    // Label
    drawText(ctx, 'PASSPORT', w * 0.17, barY + barH / 2, 9 * scale, '#aaa');

    // 6 stamp circles
    const stampStartX = w * 0.3;
    const stampSpacing = (w * 0.6) / 6;
    for (let i = 0; i < 6; i++) {
      const cx = stampStartX + i * stampSpacing + stampSpacing / 2;
      const cy = barY + barH / 2;
      const radius = 10;

      if (this.landmarks[i] && this.landmarks[i].visited) {
        // Filled gold stamp
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        // Checkmark
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy);
        ctx.lineTo(cx - 1, cy + 4);
        ctx.lineTo(cx + 5, cy - 4);
        ctx.stroke();
      } else {
        // Empty circle
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Pulsing dot
        ctx.fillStyle = `rgba(255, 215, 0, ${0.2 + Math.sin(t * 2 + i) * 0.1})`;
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
