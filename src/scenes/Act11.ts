// Act 11 — 'Wonderful' — Memory Match
// 4x4 grid of face-down tiles. Tap to flip. Match all 8 pairs to win.
import { Scene, GameEngine, actIndex } from '../engine/types';
import { drawText, COLORS } from '../engine/renderer';
import { particlePresets } from '../engine/particles';
import { startBgMusic, stopBgMusic } from '../engine/audio';

type SymbolType = 'star' | 'wand' | 'hat' | 'bubble' | 'emerald' | 'ruby' | 'moon' | 'heart';

interface Tile {
  symbol: SymbolType;
  row: number;
  col: number;
  faceUp: boolean;
  matched: boolean;
  flipProgress: number;     // 0=face-down, 1=face-up, animate between
  matchGlow: number;         // glow timer after match
}

export class Act11Scene implements Scene {
  private tiles: Tile[] = [];
  private gridRows = 4;
  private gridCols = 4;
  private tileSize = 0;
  private gridOffsetX = 0;
  private gridOffsetY = 0;
  private gridSpacing = 8;

  private firstFlipped: number | null = null;    // index of first flipped tile
  private secondFlipped: number | null = null;   // index of second flipped tile
  private checkTimer = 0;                        // countdown before flipping back non-match
  private lockInput = false;                     // prevent taps during check
  private attempts = 0;
  private matchedPairs = 0;
  private revealPowerReady = false;
  private revealTimer = 0;                       // time remaining for reveal power-up
  private revealButtonX = 0;
  private revealButtonY = 0;
  private revealButtonW = 120;
  private revealButtonH = 36;
  private attemptsSinceLastReveal = 0;

  private smokeParticles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string }[] = [];
  private smokeTimer = 0;

  enter(game: GameEngine) {
    game.state.gems = 0;
    game.state.health = 3;
    game.state.maxHealth = 3;
    game.state.noHitBonus = true;
    game.state.levelTime = 0;
    game.state.actComplete = false;

    this.firstFlipped = null;
    this.secondFlipped = null;
    this.checkTimer = 0;
    this.lockInput = false;
    this.attempts = 0;
    this.matchedPairs = 0;
    this.revealPowerReady = false;
    this.revealTimer = 0;
    this.attemptsSinceLastReveal = 0;
    this.smokeParticles = [];
    this.smokeTimer = 0;

    // Calculate tile sizing
    const w = game.width;
    const h = game.height;
    const availW = w * 0.8;
    const availH = h * 0.55;
    this.tileSize = Math.min(
      (availW - (this.gridCols - 1) * this.gridSpacing) / this.gridCols,
      (availH - (this.gridRows - 1) * this.gridSpacing) / this.gridRows
    );
    this.tileSize = Math.floor(Math.min(this.tileSize, 75));

    const totalW = this.gridCols * this.tileSize + (this.gridCols - 1) * this.gridSpacing;
    const totalH = this.gridRows * this.tileSize + (this.gridRows - 1) * this.gridSpacing;
    this.gridOffsetX = (w - totalW) / 2;
    this.gridOffsetY = h * 0.22;

    // Reveal button position
    this.revealButtonX = w / 2 - this.revealButtonW / 2;
    this.revealButtonY = this.gridOffsetY + totalH + 20;

    // Create shuffled tiles
    const symbols: SymbolType[] = ['star', 'wand', 'hat', 'bubble', 'emerald', 'ruby', 'moon', 'heart'];
    const pairs: SymbolType[] = [...symbols, ...symbols];
    this.shuffleArray(pairs);

    this.tiles = [];
    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const idx = r * this.gridCols + c;
        this.tiles.push({
          symbol: pairs[idx],
          row: r,
          col: c,
          faceUp: false,
          matched: false,
          flipProgress: 0,
          matchGlow: 0,
        });
      }
    }

    startBgMusic('wonderful');
  }

  exit(_game: GameEngine) {
    stopBgMusic();
  }

  private shuffleArray<T>(arr: T[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  update(game: GameEngine, dt: number) {
    if (game.state.actComplete) return;

    game.state.levelTime += dt;
    this.smokeTimer += dt;

    // Animate flip progress
    for (const tile of this.tiles) {
      const target = (tile.faceUp || tile.matched) ? 1 : 0;
      tile.flipProgress += (target - tile.flipProgress) * Math.min(1, dt * 10);
      if (tile.matchGlow > 0) tile.matchGlow -= dt;
    }

    // Reveal power-up timer
    if (this.revealTimer > 0) {
      this.revealTimer -= dt;
      if (this.revealTimer <= 0) {
        this.revealTimer = 0;
        // Flip non-matched, non-selected tiles back down
        for (const tile of this.tiles) {
          if (!tile.matched && tile !== this.tiles[this.firstFlipped!] && tile !== this.tiles[this.secondFlipped!]) {
            tile.faceUp = false;
          }
        }
      }
    }

    // Check timer (flip back non-matching pair)
    if (this.checkTimer > 0) {
      this.checkTimer -= dt;
      if (this.checkTimer <= 0) {
        this.checkTimer = 0;
        // Flip both back
        if (this.firstFlipped !== null) this.tiles[this.firstFlipped].faceUp = false;
        if (this.secondFlipped !== null) this.tiles[this.secondFlipped].faceUp = false;
        this.firstFlipped = null;
        this.secondFlipped = null;
        this.lockInput = false;
      }
    }

    // Handle tap input
    if (game.input.tap && !this.lockInput) {
      const tx = game.input.tapX;
      const ty = game.input.tapY;

      // Check reveal button
      if (this.revealPowerReady && this.revealTimer <= 0) {
        if (
          tx >= this.revealButtonX && tx <= this.revealButtonX + this.revealButtonW &&
          ty >= this.revealButtonY && ty <= this.revealButtonY + this.revealButtonH
        ) {
          this.activateReveal();
          return;
        }
      }

      // Check tile taps
      const tileIdx = this.getTileAtPosition(tx, ty);
      if (tileIdx !== null) {
        const tile = this.tiles[tileIdx];
        if (!tile.faceUp && !tile.matched) {
          this.flipTile(game, tileIdx);
        }
      }
    }

    // Smoke background particles
    if (this.smokeTimer > 0.3) {
      this.smokeTimer = 0;
      const w = game.width;
      const h = game.height;
      const side = Math.random() > 0.5;
      this.smokeParticles.push({
        x: side ? w * 0.1 + Math.random() * 40 : w * 0.85 + Math.random() * 40,
        y: h * 0.8 + Math.random() * h * 0.2,
        vx: (Math.random() - 0.5) * 15,
        vy: -20 - Math.random() * 30,
        life: 3 + Math.random() * 2,
        maxLife: 3 + Math.random() * 2,
        size: 20 + Math.random() * 30,
        color: Math.random() > 0.5 ? 'rgba(80, 0, 120,' : 'rgba(0, 80, 50,',
      });
    }

    // Update smoke
    for (const p of this.smokeParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.smokeParticles = this.smokeParticles.filter(p => p.life > 0);
  }

  private getTileAtPosition(px: number, py: number): number | null {
    for (let i = 0; i < this.tiles.length; i++) {
      const tile = this.tiles[i];
      const tx = this.gridOffsetX + tile.col * (this.tileSize + this.gridSpacing);
      const ty = this.gridOffsetY + tile.row * (this.tileSize + this.gridSpacing);
      if (px >= tx && px <= tx + this.tileSize && py >= ty && py <= ty + this.tileSize) {
        return i;
      }
    }
    return null;
  }

  private flipTile(game: GameEngine, idx: number) {
    const tile = this.tiles[idx];
    tile.faceUp = true;
    game.playSound('catchItem');

    if (this.firstFlipped === null) {
      // First tile of pair
      this.firstFlipped = idx;
    } else {
      // Second tile of pair
      this.secondFlipped = idx;
      this.attempts++;
      this.attemptsSinceLastReveal++;

      const first = this.tiles[this.firstFlipped];
      const second = this.tiles[this.secondFlipped];

      if (first.symbol === second.symbol) {
        // Match!
        first.matched = true;
        second.matched = true;
        first.matchGlow = 1.5;
        second.matchGlow = 1.5;
        this.matchedPairs++;

        game.playSound('powerUp');

        // Sparkle particles on both tiles
        const fx = this.gridOffsetX + first.col * (this.tileSize + this.gridSpacing) + this.tileSize / 2;
        const fy = this.gridOffsetY + first.row * (this.tileSize + this.gridSpacing) + this.tileSize / 2;
        const sx = this.gridOffsetX + second.col * (this.tileSize + this.gridSpacing) + this.tileSize / 2;
        const sy = this.gridOffsetY + second.row * (this.tileSize + this.gridSpacing) + this.tileSize / 2;
        game.spawnParticles(particlePresets.gemCollect(fx, fy, true));
        game.spawnParticles(particlePresets.gemCollect(sx, sy, true));

        game.state.score += 200;
        game.state.gems++;

        this.firstFlipped = null;
        this.secondFlipped = null;

        // Check win
        if (this.matchedPairs >= 8) {
          game.state.actComplete = true;
          this.completeAct(game);
        }
      } else {
        // No match — flip back after delay
        this.lockInput = true;
        this.checkTimer = 1.5;
      }

      // Check reveal power-up (every 6 attempts)
      if (this.attemptsSinceLastReveal >= 6 && !this.revealPowerReady) {
        this.revealPowerReady = true;
      }
    }
  }

  private activateReveal() {
    this.revealPowerReady = false;
    this.attemptsSinceLastReveal = 0;
    this.revealTimer = 2.0;

    // Flip all non-matched tiles face up temporarily
    for (const tile of this.tiles) {
      if (!tile.matched) {
        tile.faceUp = true;
      }
    }
  }

  private completeAct(game: GameEngine) {
    let stars = 1;
    if (this.attempts <= 18) stars++;
    if (this.attempts <= 12) stars++;
    game.state.stars.act11 = Math.max(game.state.stars.act11, stars);

    if (!game.state.lastCompletedAct || actIndex(game.state.lastCompletedAct) < actIndex('act11')) {
      game.state.lastCompletedAct = 'act11';
    }
    game.saveGame();
    game.playSound('actComplete');

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        game.spawnParticles(particlePresets.confetti(Math.random() * game.width, game.height * 0.3));
      }, i * 200);
    }

    setTimeout(() => {
      game.state.currentAct = 'act12';
      game.state.storyCardIndex = 0;
      game.transitionTo('storyCard');
    }, 2500);
  }

  render(game: GameEngine, ctx: CanvasRenderingContext2D) {
    const w = game.width;
    const h = game.height;
    const scale = game.getScale();
    const t = game.time;

    // --- Dark theatrical background ---
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0a0015');
    bgGrad.addColorStop(0.4, '#120020');
    bgGrad.addColorStop(0.8, '#0a0a1a');
    bgGrad.addColorStop(1, '#050510');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Smoke particles (background atmosphere)
    for (const p of this.smokeParticles) {
      const alpha = (p.life / p.maxLife) * 0.25;
      ctx.fillStyle = p.color + `${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stage curtain edges
    ctx.fillStyle = 'rgba(60, 0, 40, 0.4)';
    for (let i = 0; i < 8; i++) {
      const cy = i * h / 7;
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.quadraticCurveTo(18 * scale, cy + h / 14, 0, cy + h / 7);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(w, cy);
      ctx.quadraticCurveTo(w - 18 * scale, cy + h / 14, w, cy + h / 7);
      ctx.fill();
    }

    // Wizard silhouette on right side
    this.drawWizardSilhouette(ctx, w, h, scale, t);

    // Title
    drawText(ctx, '"Wonderful"', w / 2, h * 0.06, 18 * scale, COLORS.emeraldGlow);
    drawText(ctx, `Attempts: ${this.attempts}`, w / 2, h * 0.12, 12 * scale, '#ccc');
    drawText(ctx, `Pairs: ${this.matchedPairs}/8`, w / 2, h * 0.16, 12 * scale, COLORS.gold);

    // --- Draw tile grid ---
    for (let i = 0; i < this.tiles.length; i++) {
      this.drawTile(ctx, this.tiles[i], scale, t);
    }

    // --- Reveal power-up button ---
    if (this.revealPowerReady && this.revealTimer <= 0 && !game.state.actComplete) {
      // Glowing button
      const bx = this.revealButtonX;
      const by = this.revealButtonY;
      const bw = this.revealButtonW;
      const bh = this.revealButtonH;

      const btnGlow = Math.sin(t * 4) * 0.15 + 0.85;
      ctx.fillStyle = `rgba(0, 200, 100, ${btnGlow * 0.3})`;
      ctx.beginPath();
      ctx.roundRect(bx - 4, by - 4, bw + 8, bh + 8, 14);
      ctx.fill();

      ctx.fillStyle = COLORS.emerald;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 10);
      ctx.fill();

      drawText(ctx, 'REVEAL!', bx + bw / 2, by + bh / 2, 13 * scale, '#fff');
    }

    // Reveal active indicator
    if (this.revealTimer > 0) {
      drawText(ctx, `Revealing... ${this.revealTimer.toFixed(1)}s`, w / 2, this.revealButtonY + this.revealButtonH / 2, 12 * scale, COLORS.emeraldGlow);
    }

    // --- Controls hint ---
    if (game.state.levelTime < 4) {
      const alpha = Math.max(0, 1 - game.state.levelTime / 4);
      ctx.globalAlpha = alpha;
      drawText(ctx, 'Tap tiles to flip them!', w / 2, h * 0.88, 14 * scale, '#fff');
      drawText(ctx, 'Match all 8 pairs to win!', w / 2, h * 0.92, 12 * scale, '#aaa');
      ctx.globalAlpha = 1;
    }

    // --- Act complete overlay ---
    if (game.state.actComplete) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, w, h);
      drawText(ctx, 'Act XI Complete!', w / 2, h * 0.30, 28 * scale, COLORS.gold);
      drawText(ctx, '"Wonderful"', w / 2, h * 0.37, 16 * scale, COLORS.emeraldGlow);
      drawText(ctx, `Matched in ${this.attempts} attempts`, w / 2, h * 0.45, 16 * scale, COLORS.pinkGlow);

      const stars = game.state.stars.act11;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < stars ? COLORS.gold : 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        for (let si = 0; si < 10; si++) {
          const r = si % 2 === 0 ? 15 * scale : 7 * scale;
          const angle = (si * Math.PI) / 5 - Math.PI / 2;
          const sx = w / 2 - 40 * scale + i * 40 * scale + Math.cos(angle) * r;
          const sy = h * 0.56 + Math.sin(angle) * r;
          if (si === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
      }

      // Star thresholds hint
      drawText(ctx, '1 star = complete', w / 2, h * 0.65, 10 * scale, '#999');
      drawText(ctx, '2 stars = 18 or fewer attempts', w / 2, h * 0.69, 10 * scale, '#999');
      drawText(ctx, '3 stars = 12 or fewer attempts', w / 2, h * 0.73, 10 * scale, '#999');
    }
  }

  private drawTile(ctx: CanvasRenderingContext2D, tile: Tile, scale: number, t: number) {
    const tx = this.gridOffsetX + tile.col * (this.tileSize + this.gridSpacing);
    const ty = this.gridOffsetY + tile.row * (this.tileSize + this.gridSpacing);
    const size = this.tileSize;
    const cx = tx + size / 2;
    const cy = ty + size / 2;
    const fp = tile.flipProgress;

    // Flip animation: scale X based on progress
    // 0->0.5 = shrinking (face-down disappearing), 0.5->1 = growing (face-up appearing)
    const scaleX = Math.abs(fp - 0.5) * 2; // 1 at 0, 0 at 0.5, 1 at 1
    const showFace = fp > 0.5;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scaleX, 1);

    // Match glow
    if (tile.matched && tile.matchGlow > 0) {
      ctx.shadowColor = COLORS.gold;
      ctx.shadowBlur = 15;
    }

    // Tile background
    const radius = 8;
    ctx.beginPath();
    ctx.roundRect(-size / 2, -size / 2, size, size, radius);

    if (showFace) {
      // Face-up: dark purple tile
      const faceGrad = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
      faceGrad.addColorStop(0, '#2a1045');
      faceGrad.addColorStop(1, '#1a0830');
      ctx.fillStyle = faceGrad;
      ctx.fill();

      // Gold border if matched
      if (tile.matched) {
        ctx.strokeStyle = COLORS.gold;
        ctx.lineWidth = 3;
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(150, 100, 200, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw symbol
      ctx.shadowBlur = 0;
      this.drawSymbol(ctx, tile.symbol, 0, 0, size * 0.35, t);
    } else {
      // Face-down: green patterned tile
      const backGrad = ctx.createLinearGradient(-size / 2, -size / 2, size / 2, size / 2);
      backGrad.addColorStop(0, '#005533');
      backGrad.addColorStop(1, '#003322');
      ctx.fillStyle = backGrad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(51, 255, 153, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Question mark pattern
      ctx.shadowBlur = 0;
      drawText(ctx, '?', 0, 0, 22 * scale, 'rgba(51, 255, 153, 0.6)');
    }

    ctx.restore();
  }

  private drawSymbol(ctx: CanvasRenderingContext2D, symbol: SymbolType, x: number, y: number, size: number, _t: number) {
    const s = size;

    switch (symbol) {
      case 'star': {
        // 5-point star
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? s : s * 0.4;
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const px = x + Math.cos(angle) * r;
          const py = y + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'wand': {
        // Wand: line with star on top
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y + s * 0.6);
        ctx.lineTo(x, y - s * 0.2);
        ctx.stroke();
        // Small star
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? s * 0.35 : s * 0.15;
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const px = x + Math.cos(angle) * r;
          const py = y - s * 0.4 + Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'hat': {
        // Witch hat: triangle
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.moveTo(x, y - s * 0.8);
        ctx.lineTo(x + s * 0.6, y + s * 0.4);
        ctx.lineTo(x - s * 0.6, y + s * 0.4);
        ctx.closePath();
        ctx.fill();
        // Brim
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.ellipse(x, y + s * 0.4, s * 0.8, s * 0.2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Band
        ctx.fillStyle = COLORS.emerald;
        ctx.fillRect(x - s * 0.45, y + s * 0.05, s * 0.9, s * 0.15);
        break;
      }
      case 'bubble': {
        // Glinda's bubble: circle with shine
        ctx.strokeStyle = COLORS.pinkGlow;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, s * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        // Inner glow
        ctx.fillStyle = 'rgba(255, 150, 200, 0.15)';
        ctx.fill();
        // Shine highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(x - s * 0.25, y - s * 0.25, s * 0.15, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'emerald': {
        // Diamond shape
        ctx.fillStyle = COLORS.emerald;
        ctx.beginPath();
        ctx.moveTo(x, y - s * 0.7);
        ctx.lineTo(x + s * 0.45, y);
        ctx.lineTo(x, y + s * 0.7);
        ctx.lineTo(x - s * 0.45, y);
        ctx.closePath();
        ctx.fill();
        // Facet line
        ctx.strokeStyle = COLORS.emeraldGlow;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - s * 0.3, y - s * 0.2);
        ctx.lineTo(x + s * 0.3, y - s * 0.2);
        ctx.lineTo(x + s * 0.15, y + s * 0.2);
        ctx.lineTo(x - s * 0.15, y + s * 0.2);
        ctx.closePath();
        ctx.stroke();
        break;
      }
      case 'ruby': {
        // Hexagon shape
        ctx.fillStyle = '#cc2244';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3 - Math.PI / 6;
          const px = x + Math.cos(angle) * s * 0.65;
          const py = y + Math.sin(angle) * s * 0.65;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        // Shine
        ctx.fillStyle = 'rgba(255, 100, 120, 0.5)';
        ctx.beginPath();
        ctx.arc(x - s * 0.15, y - s * 0.15, s * 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'moon': {
        // Crescent moon using two overlapping circles
        ctx.fillStyle = '#eedd88';
        ctx.beginPath();
        ctx.arc(x, y, s * 0.6, 0, Math.PI * 2);
        ctx.fill();
        // Cut out overlap for crescent
        ctx.fillStyle = '#1a0830'; // match tile background
        ctx.beginPath();
        ctx.arc(x + s * 0.35, y - s * 0.1, s * 0.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'heart': {
        // Heart using bezier curves
        ctx.fillStyle = '#ff4477';
        ctx.beginPath();
        ctx.moveTo(x, y + s * 0.5);
        ctx.bezierCurveTo(x - s * 0.9, y - s * 0.1, x - s * 0.5, y - s * 0.8, x, y - s * 0.3);
        ctx.bezierCurveTo(x + s * 0.5, y - s * 0.8, x + s * 0.9, y - s * 0.1, x, y + s * 0.5);
        ctx.closePath();
        ctx.fill();
        // Shine
        ctx.fillStyle = 'rgba(255, 200, 220, 0.5)';
        ctx.beginPath();
        ctx.arc(x - s * 0.2, y - s * 0.3, s * 0.12, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
  }

  private drawWizardSilhouette(ctx: CanvasRenderingContext2D, w: number, h: number, scale: number, t: number) {
    const wx = w * 0.9;
    const wy = h * 0.55;
    const sway = Math.sin(t * 0.5) * 3;

    ctx.fillStyle = 'rgba(20, 10, 30, 0.7)';

    // Body (tall rectangle narrowing at top)
    ctx.beginPath();
    ctx.moveTo(wx - 18 * scale, wy + 80 * scale);
    ctx.lineTo(wx + 18 * scale, wy + 80 * scale);
    ctx.lineTo(wx + 12 * scale + sway, wy - 10 * scale);
    ctx.lineTo(wx - 12 * scale + sway, wy - 10 * scale);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(wx + sway, wy - 22 * scale, 14 * scale, 0, Math.PI * 2);
    ctx.fill();

    // Top hat
    ctx.fillRect(wx - 16 * scale + sway, wy - 36 * scale, 32 * scale, 4 * scale);
    ctx.fillRect(wx - 10 * scale + sway, wy - 60 * scale, 20 * scale, 26 * scale);

    // Mysterious green glow behind
    const glowAlpha = 0.08 + Math.sin(t * 1.5) * 0.04;
    const wizGlow = ctx.createRadialGradient(wx + sway, wy, 0, wx + sway, wy, 60 * scale);
    wizGlow.addColorStop(0, `rgba(0, 200, 100, ${glowAlpha})`);
    wizGlow.addColorStop(1, 'rgba(0, 200, 100, 0)');
    ctx.fillStyle = wizGlow;
    ctx.fillRect(wx - 80 * scale, wy - 80 * scale, 160 * scale, 180 * scale);
  }
}
