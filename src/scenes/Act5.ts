// Act 5 — 'Dancing Through Life' — Top-Down Maze
// Navigate a ballroom maze collecting dance gems, magic walls pulse open/closed
import { Scene, GameEngine } from '../engine/types';
import { drawText, COLORS } from '../engine/renderer';
import { particlePresets } from '../engine/particles';
import { startBgMusic, stopBgMusic } from '../engine/audio';

const COLS = 15;
const ROWS = 19;

// 0 = open, 1 = solid wall, 2 = magic wall (toggles)
const MAZE_DATA: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
  [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,1,0,0,0,1,0,1],
  [1,0,1,1,1,2,1,0,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
  [1,1,1,0,1,0,1,1,1,0,1,0,1,1,1],
  [1,0,0,0,1,0,0,0,1,0,1,0,0,0,1],
  [1,0,1,1,1,0,1,2,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
  [1,0,1,0,1,1,1,0,1,1,1,0,1,0,1],
  [1,0,1,0,0,0,2,0,0,0,0,0,1,0,1],
  [1,0,1,1,1,0,1,1,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
  [1,0,1,0,1,1,1,2,1,1,1,0,1,0,1],
  [1,0,1,0,0,0,0,0,0,0,0,0,1,0,1],
  [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

interface DanceGem {
  x: number;
  y: number;
  collected: boolean;
  row: number;
  col: number;
}

export class Act5Scene implements Scene {
  private playerX = 0;
  private playerY = 0;
  private cameraX = 0;
  private cameraY = 0;
  private gems: DanceGem[] = [];
  private totalGems = 0;
  private collectedGems = 0;
  private doorOpen = false;
  private doorRow = 17;
  private doorCol = 13;
  private trailTimer = 0;
  private noteTimer = 0;
  private sparkleTimer = 0;
  private cell = 28;
  private levelW = COLS * 28;
  private levelH = ROWS * 28;

  enter(game: GameEngine) {
    // Scale cell size so maze fills the screen
    // Use the larger dimension to ensure maze is at least as big as screen
    this.cell = Math.max(Math.ceil(game.width / COLS), Math.ceil(game.height / ROWS));
    this.levelW = COLS * this.cell;
    this.levelH = ROWS * this.cell;

    // Start position (row 1, col 1)
    this.playerX = 1.5 * this.cell;
    this.playerY = 1.5 * this.cell;
    this.cameraX = 0;
    this.cameraY = 0;
    this.doorOpen = false;
    this.trailTimer = 0;
    this.noteTimer = 0;
    this.sparkleTimer = 0;
    this.collectedGems = 0;

    this.placeGems();

    game.state.gems = 0;
    game.state.health = 3;
    game.state.maxHealth = 3;
    game.state.noHitBonus = true;
    game.state.levelTime = 0;
    game.state.actComplete = false;

    startBgMusic('dance');
  }

  exit(_game: GameEngine) {
    stopBgMusic();
  }

  private placeGems() {
    this.gems = [];
    this.totalGems = 0;
    // Place gems at specific open cells throughout the maze
    const gemSpots: [number, number][] = [
      [1, 5], [1, 9], [2, 3], [3, 7], [3, 13],
      [5, 1], [5, 7], [5, 13], [7, 3], [7, 11],
      [9, 5], [9, 9], [11, 7], [13, 3], [15, 11],
    ];
    for (const [r, c] of gemSpots) {
      this.gems.push({
        x: (c + 0.5) * this.cell,
        y: (r + 0.5) * this.cell,
        collected: false,
        row: r,
        col: c,
      });
      this.totalGems++;
    }
  }

  private isWallSolid(row: number, col: number, time: number): boolean {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return true;
    const cell = MAZE_DATA[row][col];
    if (cell === 0) return false;
    if (cell === 1) return true;
    // Magic wall — toggles every 5 seconds
    if (cell === 2) {
      return Math.floor(time / 5) % 2 === 0;
    }
    return true;
  }

  update(game: GameEngine, dt: number) {
    if (game.state.actComplete) return;

    game.state.levelTime += dt;
    this.trailTimer += dt;
    this.noteTimer += dt;
    this.sparkleTimer += dt;

    const isElphaba = game.state.character === 'elphaba';

    // Player movement — follow finger in 2D
    let targetX = this.playerX;
    let targetY = this.playerY;
    const moveSpeed = 160;

    if (game.input.isTouching) {
      targetX = game.input.touchX + this.cameraX;
      targetY = game.input.touchY + this.cameraY;
    }
    if (game.input.left) targetX = this.playerX - moveSpeed * dt * 10;
    if (game.input.right) targetX = this.playerX + moveSpeed * dt * 10;
    if (game.input.up) targetY = this.playerY - moveSpeed * dt * 10;
    if (game.input.down) targetY = this.playerY + moveSpeed * dt * 10;

    // Move toward target with lerp
    const dx = targetX - this.playerX;
    const dy = targetY - this.playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 2) {
      const step = Math.min(moveSpeed * dt, dist);
      let nx = this.playerX + (dx / dist) * step;
      let ny = this.playerY + (dy / dist) * step;

      const r = 8; // player radius
      const time = game.time;

      // Wall collision — try X then Y independently (slide along walls)
      const colX = Math.floor(nx / this.cell);
      const rowY = Math.floor(this.playerY / this.cell);
      const colCur = Math.floor(this.playerX / this.cell);
      const rowN = Math.floor(ny / this.cell);

      // Check X movement
      if (dx > 0) {
        // Moving right — check right edge
        const checkCol = Math.floor((nx + r) / this.cell);
        const checkRow1 = Math.floor((this.playerY - r + 2) / this.cell);
        const checkRow2 = Math.floor((this.playerY + r - 2) / this.cell);
        if (this.isWallSolid(checkRow1, checkCol, time) || this.isWallSolid(checkRow2, checkCol, time)) {
          nx = checkCol * this.cell - r - 0.1;
        }
      } else if (dx < 0) {
        const checkCol = Math.floor((nx - r) / this.cell);
        const checkRow1 = Math.floor((this.playerY - r + 2) / this.cell);
        const checkRow2 = Math.floor((this.playerY + r - 2) / this.cell);
        if (this.isWallSolid(checkRow1, checkCol, time) || this.isWallSolid(checkRow2, checkCol, time)) {
          nx = (checkCol + 1) * this.cell + r + 0.1;
        }
      }

      // Check Y movement
      if (dy > 0) {
        const checkRow = Math.floor((ny + r) / this.cell);
        const checkCol1 = Math.floor((nx - r + 2) / this.cell);
        const checkCol2 = Math.floor((nx + r - 2) / this.cell);
        if (this.isWallSolid(checkRow, checkCol1, time) || this.isWallSolid(checkRow, checkCol2, time)) {
          ny = checkRow * this.cell - r - 0.1;
        }
      } else if (dy < 0) {
        const checkRow = Math.floor((ny - r) / this.cell);
        const checkCol1 = Math.floor((nx - r + 2) / this.cell);
        const checkCol2 = Math.floor((nx + r - 2) / this.cell);
        if (this.isWallSolid(checkRow, checkCol1, time) || this.isWallSolid(checkRow, checkCol2, time)) {
          ny = (checkRow + 1) * this.cell + r + 0.1;
        }
      }

      this.playerX = nx;
      this.playerY = ny;
    }

    // Clamp to level bounds
    this.playerX = Math.max(10, Math.min(this.levelW - 10, this.playerX));
    this.playerY = Math.max(10, Math.min(this.levelH - 10, this.playerY));

    // Collect gems
    for (const gem of this.gems) {
      if (gem.collected) continue;
      const gx = gem.x - this.playerX;
      const gy = gem.y - this.playerY;
      if (gx * gx + gy * gy < 20 * 20) {
        gem.collected = true;
        this.collectedGems++;
        game.state.gems++;
        game.state.score += 150;
        game.playSound('gemCollect');
        game.spawnParticles(particlePresets.gemCollect(
          gem.x - this.cameraX, gem.y - this.cameraY, isElphaba
        ));

        // All gems collected — open door
        if (this.collectedGems >= this.totalGems && !this.doorOpen) {
          this.doorOpen = true;
          game.playSound('doorOpen');
        }
      }
    }

    // Check if player reached the exit door
    if (this.doorOpen) {
      const doorX = (this.doorCol + 0.5) * this.cell;
      const doorY = (this.doorRow + 0.5) * this.cell;
      const ddx = doorX - this.playerX;
      const ddy = doorY - this.playerY;
      if (ddx * ddx + ddy * ddy < 20 * 20) {
        game.state.actComplete = true;
        this.completeAct(game);
      }
    }

    // Camera
    const w = game.width;
    const h = game.height;
    const targetCX = this.playerX - w / 2;
    const targetCY = this.playerY - h / 2;
    this.cameraX += (targetCX - this.cameraX) * Math.min(1, dt * 6);
    this.cameraY += (targetCY - this.cameraY) * Math.min(1, dt * 6);
    this.cameraX = Math.max(0, Math.min(this.levelW - w, this.cameraX));
    this.cameraY = Math.max(0, Math.min(this.levelH - h, this.cameraY));

    // Trail
    if (this.trailTimer > 0.08 && dist > 5) {
      this.trailTimer = 0;
      game.spawnParticles(particlePresets.trail(
        this.playerX - this.cameraX, this.playerY - this.cameraY, isElphaba
      ));
    }

    // Musical notes
    if (this.noteTimer > 3) {
      this.noteTimer = 0;
      game.spawnParticles(particlePresets.musicalNote(Math.random() * w, h * 0.1));
    }
  }

  private completeAct(game: GameEngine) {
    let stars = 1;
    if (game.state.levelTime < 45) stars++;
    if (game.state.levelTime < 30) stars++;
    game.state.stars.act5 = Math.max(game.state.stars.act5, stars);

    const totalStars = Object.values(game.state.stars).reduce((a, b) => a + b, 0);
    if (totalStars >= 5 && !game.state.unlockedCostumes.includes(game.state.character === 'elphaba' ? 'elphaba_sparkly' : 'glinda_wings')) {
      game.state.unlockedCostumes.push(game.state.character === 'elphaba' ? 'elphaba_sparkly' : 'glinda_wings');
    }

    if (!game.state.lastCompletedAct || game.state.lastCompletedAct < 'act5') {
      game.state.lastCompletedAct = 'act5';
    }
    game.saveGame();
    game.playSound('actComplete');

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        game.spawnParticles(particlePresets.confetti(Math.random() * game.width, game.height * 0.3));
      }, i * 200);
    }

    setTimeout(() => {
      game.state.currentAct = 'act6';
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
    const cx = this.cameraX;
    const cy = this.cameraY;

    // Background — dark ballroom
    ctx.fillStyle = '#0a1a10';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(-cx, -cy);

    // Draw floor tiles
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * this.cell;
        const y = r * this.cell;
        // Skip if off screen
        if (x + this.cell < cx || x > cx + w || y + this.cell < cy || y > cy + h) continue;

        const cell = MAZE_DATA[r][c];

        if (cell === 0) {
          // Floor tile — checkerboard
          ctx.fillStyle = (r + c) % 2 === 0 ? '#0d2a18' : '#0a2214';
          ctx.fillRect(x, y, this.cell, this.cell);
        } else if (cell === 1) {
          // Solid wall
          ctx.fillStyle = '#2a1a0a';
          ctx.fillRect(x, y, this.cell, this.cell);
          // Gold trim
          ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 1, y + 1, this.cell - 2, this.cell - 2);
        } else if (cell === 2) {
          // Magic wall
          const solid = Math.floor(t / 5) % 2 === 0;
          const transitionTime = (t % 5);
          const warning = transitionTime > 4; // Last second — warning flash

          if (solid) {
            const alpha = warning ? 0.3 + Math.sin(t * 12) * 0.2 : 0.7;
            ctx.fillStyle = isElphaba
              ? `rgba(0, 180, 80, ${alpha})`
              : `rgba(200, 80, 180, ${alpha})`;
            ctx.fillRect(x, y, this.cell, this.cell);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 2, y + 2, this.cell - 4, this.cell - 4);
          } else {
            // Open — faint outline
            const alpha = warning ? 0.1 + Math.sin(t * 12) * 0.05 : 0.08;
            ctx.strokeStyle = isElphaba
              ? `rgba(0, 180, 80, ${alpha})`
              : `rgba(200, 80, 180, ${alpha})`;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(x + 2, y + 2, this.cell - 4, this.cell - 4);
            ctx.setLineDash([]);
            // Floor beneath
            ctx.fillStyle = (r + c) % 2 === 0 ? '#0d2a18' : '#0a2214';
            ctx.fillRect(x, y, this.cell, this.cell);
          }
        }
      }
    }

    // Dance gems
    for (const gem of this.gems) {
      if (gem.collected) continue;
      const gx = gem.x;
      const gy = gem.y;
      const spin = t * 3 + gem.row;
      const bob = Math.sin(t * 2 + gem.col) * 2;

      // Glow
      ctx.fillStyle = isElphaba
        ? `rgba(0, 255, 100, ${Math.sin(t * 2 + gem.col) * 0.1 + 0.15})`
        : `rgba(255, 100, 200, ${Math.sin(t * 2 + gem.col) * 0.1 + 0.15})`;
      ctx.beginPath();
      ctx.arc(gx, gy + bob, 12, 0, Math.PI * 2);
      ctx.fill();

      // Diamond shape
      ctx.fillStyle = isElphaba ? COLORS.emeraldGlow : COLORS.pinkGlow;
      ctx.beginPath();
      ctx.moveTo(gx, gy - 8 + bob);
      ctx.lineTo(gx + 6, gy + bob);
      ctx.lineTo(gx, gy + 8 + bob);
      ctx.lineTo(gx - 6, gy + bob);
      ctx.closePath();
      ctx.fill();

      // Inner sparkle
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(gx, gy + bob, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Exit door
    const doorX = this.doorCol * this.cell;
    const doorY = this.doorRow * this.cell;
    if (this.doorOpen) {
      // Golden open door
      const pulse = Math.sin(t * 3) * 0.15 + 0.85;
      ctx.fillStyle = `rgba(255, 215, 0, ${pulse * 0.4})`;
      ctx.fillRect(doorX, doorY, this.cell, this.cell);
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 2;
      ctx.strokeRect(doorX + 2, doorY + 2, this.cell - 4, this.cell - 4);
      // Archway
      ctx.beginPath();
      ctx.arc(doorX + this.cell / 2, doorY + this.cell * 0.6, this.cell * 0.4, Math.PI, 0);
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      // Locked door
      ctx.fillStyle = 'rgba(100, 80, 60, 0.6)';
      ctx.fillRect(doorX, doorY, this.cell, this.cell);
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.strokeRect(doorX + 2, doorY + 2, this.cell - 4, this.cell - 4);
    }

    // Player — top-down circle
    const pColor = isElphaba ? COLORS.emeraldGlow : COLORS.pinkGlow;
    ctx.fillStyle = pColor;
    ctx.beginPath();
    ctx.arc(this.playerX, this.playerY, 8, 0, Math.PI * 2);
    ctx.fill();
    // Hat/tiara indicator
    ctx.fillStyle = isElphaba ? '#000' : COLORS.gold;
    ctx.beginPath();
    if (isElphaba) {
      // Tiny hat triangle
      ctx.moveTo(this.playerX, this.playerY - 12);
      ctx.lineTo(this.playerX - 5, this.playerY - 5);
      ctx.lineTo(this.playerX + 5, this.playerY - 5);
    } else {
      // Tiny tiara
      ctx.arc(this.playerX, this.playerY - 10, 4, Math.PI, 0);
    }
    ctx.fill();
    // Glow around player
    ctx.strokeStyle = pColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(this.playerX, this.playerY, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.restore();

    // Minimap (top-right corner)
    this.drawMinimap(ctx, w, h, t);

    // Gem counter
    drawText(ctx, `Gems: ${this.collectedGems}/${this.totalGems}`, w / 2, h * 0.04, 12 * scale, COLORS.gold);

    // Door arrow when all gems collected
    if (this.doorOpen && !game.state.actComplete) {
      const arrowPulse = Math.sin(t * 4) * 3;
      drawText(ctx, 'Find the golden door!', w / 2, h * 0.09, 11 * scale, COLORS.gold);
    }

    // Timer
    drawText(ctx, `${Math.floor(game.state.levelTime)}s`, w - 30 * scale, h * 0.04, 10 * scale, '#aaa');

    // Act complete overlay
    if (game.state.actComplete) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, w, h);
      drawText(ctx, 'Act V Complete!', w / 2, h * 0.35, 28 * scale, COLORS.gold);
      drawText(ctx, `Time: ${Math.floor(game.state.levelTime)}s`, w / 2, h * 0.45, 18 * scale, COLORS.emeraldGlow);
      drawText(ctx, `Score: ${game.state.score}`, w / 2, h * 0.52, 18 * scale, '#fff');

      const stars = game.state.stars.act5;
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
    if (game.state.levelTime < 5 && !game.state.actComplete) {
      const alpha = Math.max(0, 1 - game.state.levelTime / 5);
      ctx.globalAlpha = alpha;
      drawText(ctx, 'Touch to move through the maze!', w / 2, h * 0.88, 14 * scale, '#fff');
      drawText(ctx, 'Collect all gems to open the door!', w / 2, h * 0.93, 12 * scale, '#ccc');
      ctx.globalAlpha = 1;
    }
  }

  private drawMinimap(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
    const mapScale = 3;
    const mapW = COLS * mapScale;
    const mapH = ROWS * mapScale;
    const mapX = w - mapW - 8;
    const mapY = h - mapH - 8;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(mapX - 2, mapY - 2, mapW + 4, mapH + 4);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = MAZE_DATA[r][c];
        if (cell === 1) {
          ctx.fillStyle = 'rgba(150, 120, 80, 0.5)';
          ctx.fillRect(mapX + c * mapScale, mapY + r * mapScale, mapScale, mapScale);
        } else if (cell === 2) {
          const solid = Math.floor(time / 5) % 2 === 0;
          ctx.fillStyle = solid ? 'rgba(0, 200, 100, 0.4)' : 'rgba(0, 200, 100, 0.1)';
          ctx.fillRect(mapX + c * mapScale, mapY + r * mapScale, mapScale, mapScale);
        }
      }
    }

    // Gems on minimap
    for (const gem of this.gems) {
      if (gem.collected) continue;
      ctx.fillStyle = '#ffdd00';
      ctx.fillRect(mapX + gem.col * mapScale, mapY + gem.row * mapScale, mapScale, mapScale);
    }

    // Door on minimap
    if (this.doorOpen) {
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(mapX + this.doorCol * mapScale, mapY + this.doorRow * mapScale, mapScale, mapScale);
    }

    // Player on minimap
    const pCol = Math.floor(this.playerX / this.cell);
    const pRow = Math.floor(this.playerY / this.cell);
    ctx.fillStyle = '#fff';
    ctx.fillRect(mapX + pCol * mapScale, mapY + pRow * mapScale, mapScale, mapScale);
  }
}
