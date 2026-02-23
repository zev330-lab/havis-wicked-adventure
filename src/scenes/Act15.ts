// Act 15 — 'Thank Goodness' — Parade Float Builder (FINAL ACT)
// Phase 1: Drag decorations onto a parade float.
// Phase 2: Watch the parade roll through cheering crowds.
import { Scene, GameEngine, actIndex } from '../engine/types';
import { drawText, drawElphaba, drawGlinda, drawGem, COLORS } from '../engine/renderer';
import { particlePresets } from '../engine/particles';
import { startBgMusic, stopBgMusic } from '../engine/audio';

type DecoType = 'banner' | 'flower' | 'star' | 'emerald' | 'sparkle' | 'note' | 'crown' | 'wand';

const DECO_TYPES: DecoType[] = ['banner', 'flower', 'star', 'emerald', 'sparkle', 'note', 'crown', 'wand'];

const DECO_COLORS: Record<DecoType, string> = {
  banner: '#ff6688',
  flower: '#ff99cc',
  star: '#ffd700',
  emerald: '#00cc66',
  sparkle: '#aaddff',
  note: '#cc88ff',
  crown: '#ffbf00',
  wand: '#ffffff',
};

interface DecoZone {
  x: number;
  y: number;
  w: number;
  h: number;
  item: DecoType | null;
  sparkleTimer: number;
}

interface PaletteCard {
  type: DecoType;
  x: number;  // base x in scrolling strip
  y: number;
}

interface CrowdNPC {
  x: number;
  baseY: number;
  color: string;
  bouncePhase: number;
  bounceSpeed: number;
  size: number;
}

interface BonusGem {
  x: number;
  y: number;
  vy: number;
  collected: boolean;
  life: number;
}

type Phase = 'building' | 'parade' | 'complete';

export class Act15Scene implements Scene {
  private phase: Phase = 'building';

  // Building phase
  private zones: DecoZone[] = [];
  private palette: PaletteCard[] = [];
  private paletteScrollX = 0;
  private dragging: DecoType | null = null;
  private dragX = 0;
  private dragY = 0;
  private dragStartedFromPalette = false;
  private placedCount = 0;
  private goButtonPulse = 0;
  private sparkleEffects: { x: number; y: number; timer: number }[] = [];

  // Parade phase
  private floatX = 0;
  private floatSpeed = 0;
  private paradeTimer = 0;
  private crowd: CrowdNPC[] = [];
  private bonusGems: BonusGem[] = [];
  private confettiTimer = 0;
  private gemSpawnTimer = 0;

  // Shared
  private hintTimer = 0;
  private themeBonus = false;

  enter(game: GameEngine) {
    this.phase = 'building';
    this.dragging = null;
    this.dragX = 0;
    this.dragY = 0;
    this.dragStartedFromPalette = false;
    this.placedCount = 0;
    this.goButtonPulse = 0;
    this.sparkleEffects = [];
    this.paletteScrollX = 0;

    this.floatX = -200;
    this.floatSpeed = 0;
    this.paradeTimer = 0;
    this.crowd = [];
    this.bonusGems = [];
    this.confettiTimer = 0;
    this.gemSpawnTimer = 0;

    this.hintTimer = 0;
    this.themeBonus = false;

    game.state.gems = 0;
    game.state.health = 3;
    game.state.maxHealth = 3;
    game.state.noHitBonus = true;
    game.state.levelTime = 0;
    game.state.actComplete = false;

    this.buildZones(game);
    this.buildPalette(game);
    startBgMusic('thankGoodness');
  }

  exit(_game: GameEngine) {
    stopBgMusic();
  }

  private buildZones(game: GameEngine) {
    const w = game.width;
    const floatLeft = w * 0.1;
    const floatRight = w * 0.9;
    const floatTop = game.height * 0.15;
    const floatMid = game.height * 0.35;

    const zoneW = (floatRight - floatLeft) / 4 - 8;
    const zoneH = (floatMid - floatTop) / 2 - 8;

    this.zones = [];
    // 4 top row, 4 bottom row
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        this.zones.push({
          x: floatLeft + col * (zoneW + 8) + 4,
          y: floatTop + row * (zoneH + 8) + 4,
          w: zoneW,
          h: zoneH,
          item: null,
          sparkleTimer: 0,
        });
      }
    }
  }

  private buildPalette(game: GameEngine) {
    this.palette = [];
    const w = game.width;
    const paletteTopY = game.height * 0.68;
    const cols = 4;
    const cellW = (w - 20) / cols;
    const rowH = 58;
    for (let i = 0; i < DECO_TYPES.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      this.palette.push({
        type: DECO_TYPES[i],
        x: 10 + col * cellW + cellW / 2,
        y: paletteTopY + row * rowH + rowH / 2,
      });
    }
  }

  private buildCrowd(game: GameEngine) {
    this.crowd = [];
    const crowdY = game.height * 0.88;
    const crowdColors = ['#ff6688', '#66bbff', '#ffcc44', '#88ff66', '#ff88dd', '#aaddff', '#ffaa55', '#cc88ff'];

    for (let i = 0; i < 25; i++) {
      this.crowd.push({
        x: i * (game.width / 24),
        baseY: crowdY + (Math.random() - 0.5) * 10,
        color: crowdColors[i % crowdColors.length],
        bouncePhase: Math.random() * Math.PI * 2,
        bounceSpeed: 3 + Math.random() * 3,
        size: 8 + Math.random() * 4,
      });
    }
  }

  update(game: GameEngine, dt: number) {
    if (game.state.actComplete) return;

    game.state.levelTime += dt;
    this.hintTimer += dt;

    if (this.phase === 'building') {
      this.updateBuilding(game, dt);
    } else if (this.phase === 'parade') {
      this.updateParade(game, dt);
    }
  }

  private updateBuilding(game: GameEngine, dt: number) {
    this.goButtonPulse += dt * 3;

    // Update sparkle effects
    for (const fx of this.sparkleEffects) {
      fx.timer -= dt;
    }
    this.sparkleEffects = this.sparkleEffects.filter(fx => fx.timer > 0);

    // Update zone sparkle timers
    for (const zone of this.zones) {
      if (zone.sparkleTimer > 0) zone.sparkleTimer -= dt;
    }

    // Handle drag input
    if (game.input.isTouching) {
      const tx = game.input.touchX;
      const ty = game.input.touchY;

      if (this.dragging) {
        // Move dragged item
        this.dragX = tx;
        this.dragY = ty;
      } else {
        // Check if tapping a palette item
        for (const card of this.palette) {
          const cardScreenX = card.x - this.paletteScrollX;
          if (
            tx >= cardScreenX - 25 && tx <= cardScreenX + 25 &&
            ty >= card.y - 25 && ty <= card.y + 25
          ) {
            this.dragging = card.type;
            this.dragX = tx;
            this.dragY = ty;
            this.dragStartedFromPalette = true;
            break;
          }
        }

        // Scroll palette by dragging in palette area if not dragging an item
        if (!this.dragging && ty > game.height * 0.65) {
          // Simple scroll: track horizontal movement
        }
      }
    } else {
      if (this.dragging) {
        // Released — check if over a zone
        let placed = false;
        for (const zone of this.zones) {
          if (
            zone.item === null &&
            this.dragX >= zone.x && this.dragX <= zone.x + zone.w &&
            this.dragY >= zone.y && this.dragY <= zone.y + zone.h
          ) {
            zone.item = this.dragging;
            zone.sparkleTimer = 0.8;
            this.placedCount++;
            placed = true;
            game.playSound('catchItem');
            game.spawnParticles(particlePresets.gemCollect(
              zone.x + zone.w / 2,
              zone.y + zone.h / 2,
              game.state.character === 'elphaba'
            ));
            this.sparkleEffects.push({
              x: zone.x + zone.w / 2,
              y: zone.y + zone.h / 2,
              timer: 0.5,
            });
            break;
          }
        }
        if (!placed) {
          // Dropped outside a valid zone — do nothing, item returns to palette
        }
        this.dragging = null;
        this.dragStartedFromPalette = false;
      }
    }

    // Check if tap on GO button
    if (game.input.tap && this.placedCount >= 4) {
      const w = game.width;
      const h = game.height;
      const goX = w / 2;
      const goY = h * 0.55;
      const dist = Math.sqrt(
        (game.input.tapX - goX) ** 2 + (game.input.tapY - goY) ** 2
      );
      if (dist < 40) {
        this.startParade(game);
      }
    }
  }

  private startParade(game: GameEngine) {
    this.phase = 'parade';
    this.floatX = -200;
    this.floatSpeed = (game.width + 400) / 15; // Cross screen in ~15 seconds
    this.paradeTimer = 0;
    this.buildCrowd(game);

    // Check for theme bonus (3+ of same type)
    const typeCounts: Record<string, number> = {};
    for (const zone of this.zones) {
      if (zone.item) {
        typeCounts[zone.item] = (typeCounts[zone.item] || 0) + 1;
      }
    }
    this.themeBonus = Object.values(typeCounts).some(count => count >= 3);

    game.playSound('powerUp');
    game.spawnParticles(particlePresets.confetti(game.width * 0.5, game.height * 0.3));
  }

  private updateParade(game: GameEngine, dt: number) {
    this.paradeTimer += dt;
    this.confettiTimer += dt;
    this.gemSpawnTimer += dt;

    // Move float
    this.floatX += this.floatSpeed * dt;

    // Confetti based on decoration count
    const confettiInterval = Math.max(0.2, 0.8 - this.placedCount * 0.06);
    if (this.confettiTimer > confettiInterval) {
      this.confettiTimer = 0;
      const confX = this.floatX + Math.random() * 200 - 100;
      if (confX > 0 && confX < game.width) {
        game.spawnParticles(particlePresets.confetti(confX, game.height * 0.3));
      }
    }

    // Spawn bonus gems from crowd
    if (this.gemSpawnTimer > 0.8) {
      this.gemSpawnTimer = 0;
      const gx = Math.random() * game.width;
      this.bonusGems.push({
        x: gx,
        y: game.height * 0.85,
        vy: -120 - Math.random() * 60,
        collected: false,
        life: 2,
      });
    }

    // Update bonus gems
    for (const gem of this.bonusGems) {
      if (gem.collected) continue;
      gem.y += gem.vy * dt;
      gem.vy += 200 * dt; // gravity
      gem.life -= dt;
      if (gem.life <= 0) {
        // Auto-collect
        gem.collected = true;
        game.state.gems++;
        game.state.score += 50;
      }
    }
    this.bonusGems = this.bonusGems.filter(g => !g.collected && g.life > 0);

    // Parade complete after float has crossed the screen
    if (this.floatX > game.width + 220) {
      // Auto-collect remaining gems
      for (const gem of this.bonusGems) {
        if (!gem.collected) {
          gem.collected = true;
          game.state.gems++;
          game.state.score += 50;
        }
      }
      game.state.actComplete = true;
      this.phase = 'complete';
      this.completeAct(game);
    }
  }

  private completeAct(game: GameEngine) {
    const allFilled = this.zones.every(z => z.item !== null);

    let stars = 1; // Complete (4+ items)
    if (allFilled) stars = 2; // All 8 slots filled
    if (allFilled && this.themeBonus) stars = 3; // All 8 + theme bonus

    game.state.stars.act15 = Math.max(game.state.stars.act15, stars);

    if (!game.state.lastCompletedAct || actIndex(game.state.lastCompletedAct) < actIndex('act15')) {
      game.state.lastCompletedAct = 'act15';
    }
    game.saveGame();
    game.playSound('actComplete');

    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        game.spawnParticles(particlePresets.confetti(Math.random() * game.width, game.height * 0.3));
      }, i * 200);
    }

    // FINAL ACT — transition to victory
    setTimeout(() => {
      // game.state.currentAct stays 'act15'
      game.transitionTo('victory');
    }, 3000);
  }

  render(game: GameEngine, ctx: CanvasRenderingContext2D) {
    if (this.phase === 'building') {
      this.renderBuilding(game, ctx);
    } else if (this.phase === 'parade') {
      this.renderParade(game, ctx);
    } else if (this.phase === 'complete') {
      this.renderComplete(game, ctx);
    }
  }

  private renderBuilding(game: GameEngine, ctx: CanvasRenderingContext2D) {
    const w = game.width;
    const h = game.height;
    const scale = game.getScale();
    const t = game.time;

    // Warm workshop background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#2a1a00');
    bgGrad.addColorStop(0.4, '#3d2800');
    bgGrad.addColorStop(1, '#1a1000');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Ambient warm glow
    const glowGrad = ctx.createRadialGradient(w / 2, h * 0.3, 0, w / 2, h * 0.3, w * 0.6);
    glowGrad.addColorStop(0, 'rgba(255, 180, 50, 0.08)');
    glowGrad.addColorStop(1, 'rgba(255, 180, 50, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);

    // Title
    drawText(ctx, 'Build Your Parade Float!', w / 2, h * 0.08, 16 * scale, COLORS.gold);

    // --- Float platform ---
    const floatLeft = w * 0.08;
    const floatRight = w * 0.92;
    const floatTop = h * 0.13;
    const floatBottom = h * 0.47;
    const floatW = floatRight - floatLeft;
    const floatH = floatBottom - floatTop;

    // Green platform with gold trim
    ctx.fillStyle = '#1a6633';
    ctx.fillRect(floatLeft, floatTop, floatW, floatH);

    // Gold trim border
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 3;
    ctx.strokeRect(floatLeft, floatTop, floatW, floatH);

    // Gold trim inner decoration
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(floatLeft + 4, floatTop + 4, floatW - 8, floatH - 8);

    // 4 Golden wheels
    const wheelR = 10 * scale;
    const wheelY = floatBottom + wheelR * 0.5;
    const wheelPositions = [
      floatLeft + floatW * 0.15,
      floatLeft + floatW * 0.4,
      floatLeft + floatW * 0.6,
      floatLeft + floatW * 0.85,
    ];
    for (const wx of wheelPositions) {
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.arc(wx, wheelY, wheelR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.goldDark;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Spokes
      for (let sp = 0; sp < 4; sp++) {
        const ang = sp * Math.PI / 2 + t;
        ctx.beginPath();
        ctx.moveTo(wx, wheelY);
        ctx.lineTo(wx + Math.cos(ang) * wheelR * 0.7, wheelY + Math.sin(ang) * wheelR * 0.7);
        ctx.stroke();
      }
    }

    // --- Decoration zones ---
    for (const zone of this.zones) {
      if (zone.item) {
        // Filled zone — draw the decoration
        this.drawDecoration(ctx, zone.item, zone.x + zone.w / 2, zone.y + zone.h / 2, zone.w * 0.4, scale, t);

        // Sparkle on recent placement
        if (zone.sparkleTimer > 0) {
          ctx.globalAlpha = zone.sparkleTimer;
          ctx.strokeStyle = COLORS.gold;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(zone.x + zone.w / 2, zone.y + zone.h / 2, zone.w * 0.4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      } else {
        // Empty zone — glowing dashed outline
        const pulse = Math.sin(t * 3 + zone.x) * 0.2 + 0.6;
        ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(zone.x + 2, zone.y + 2, zone.w - 4, zone.h - 4);
        ctx.setLineDash([]);

        // Plus sign
        ctx.fillStyle = `rgba(255, 215, 0, ${pulse * 0.5})`;
        const cx = zone.x + zone.w / 2;
        const cy = zone.y + zone.h / 2;
        ctx.fillRect(cx - 6, cy - 1.5, 12, 3);
        ctx.fillRect(cx - 1.5, cy - 6, 3, 12);
      }
    }

    // --- Palette area ---
    const paletteAreaY = h * 0.62;

    // Palette background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, paletteAreaY, w, h - paletteAreaY);

    // Palette label
    drawText(ctx, 'Decorations', w / 2, paletteAreaY + 12 * scale, 12 * scale, '#ccc');

    // Palette cards
    for (const card of this.palette) {
      const screenX = card.x - this.paletteScrollX;
      if (screenX < -40 || screenX > w + 40) continue;

      // Card background
      ctx.fillStyle = 'rgba(40, 30, 20, 0.8)';
      ctx.fillRect(screenX - 25, card.y - 25, 50, 50);
      ctx.strokeStyle = DECO_COLORS[card.type];
      ctx.lineWidth = 2;
      ctx.strokeRect(screenX - 25, card.y - 25, 50, 50);

      // Draw decoration icon on card
      this.drawDecoration(ctx, card.type, screenX, card.y, 14, scale, t);

      // Label
      drawText(ctx, card.type, screenX, card.y + 32, 8 * scale, '#aaa');
    }

    // --- GO button (visible when 4+ placed) ---
    if (this.placedCount >= 4 && !this.dragging) {
      const goX = w / 2;
      const goY = h * 0.55;
      const pulse = Math.sin(this.goButtonPulse) * 0.15 + 0.85;
      const btnR = 32 * scale * pulse;

      // Glow
      const glowG = ctx.createRadialGradient(goX, goY, btnR * 0.5, goX, goY, btnR * 2);
      glowG.addColorStop(0, 'rgba(50, 255, 100, 0.2)');
      glowG.addColorStop(1, 'rgba(50, 255, 100, 0)');
      ctx.fillStyle = glowG;
      ctx.fillRect(goX - btnR * 2, goY - btnR * 2, btnR * 4, btnR * 4);

      // Button
      ctx.fillStyle = COLORS.emerald;
      ctx.beginPath();
      ctx.arc(goX, goY, btnR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.emeraldGlow;
      ctx.lineWidth = 3;
      ctx.stroke();

      drawText(ctx, 'GO!', goX, goY, 20 * scale, '#fff');
    }

    // --- Dragged item ---
    if (this.dragging) {
      ctx.globalAlpha = 0.8;
      this.drawDecoration(ctx, this.dragging, this.dragX, this.dragY, 20, scale, t);
      ctx.globalAlpha = 1;
    }

    // --- Sparkle effects ---
    for (const fx of this.sparkleEffects) {
      ctx.globalAlpha = fx.timer;
      ctx.fillStyle = COLORS.gold;
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + t * 3;
        const dist = 15 * (1 - fx.timer);
        ctx.beginPath();
        ctx.arc(
          fx.x + Math.cos(ang) * dist,
          fx.y + Math.sin(ang) * dist,
          3,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Counter
    drawText(ctx, `${this.placedCount}/8 placed`, w / 2, h * 0.50, 12 * scale,
      this.placedCount >= 8 ? COLORS.emeraldGlow : this.placedCount >= 4 ? COLORS.gold : '#aaa');

    // Hint
    if (this.hintTimer < 6) {
      const alpha = Math.max(0, 1 - this.hintTimer / 6);
      ctx.globalAlpha = alpha;
      drawText(ctx, 'Drag decorations onto the float!', w / 2, h * 0.58, 13 * scale, '#fff');
      ctx.globalAlpha = 1;
    }
  }

  private renderParade(game: GameEngine, ctx: CanvasRenderingContext2D) {
    const w = game.width;
    const h = game.height;
    const scale = game.getScale();
    const t = game.time;
    const isElphaba = game.state.character === 'elphaba';

    // Festive emerald city street background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0a3320');
    bgGrad.addColorStop(0.3, '#0d4428');
    bgGrad.addColorStop(0.6, '#1a5533');
    bgGrad.addColorStop(1, '#0a2a18');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Emerald buildings in background
    for (let i = 0; i < 7; i++) {
      const bx = i * (w / 6) - 20;
      const bw = w / 7 + 10;
      const bh = 80 + (i * 37 % 60);
      const by = h * 0.55 - bh;

      ctx.fillStyle = `rgba(0, ${60 + (i * 20 % 40)}, ${30 + (i * 15 % 30)}, 0.6)`;
      ctx.fillRect(bx, by, bw, bh);

      // Glowing windows
      ctx.fillStyle = 'rgba(50, 255, 100, 0.5)';
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const wx = bx + 8 + col * (bw / 3 - 4);
          const wy = by + 10 + row * 22;
          ctx.fillRect(wx, wy, 8, 10);
        }
      }
    }

    // Festive bunting
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const bx1 = i * (w / 4);
      const bx2 = bx1 + w / 4;
      const by = h * 0.25;
      ctx.beginPath();
      ctx.moveTo(bx1, by);
      ctx.quadraticCurveTo((bx1 + bx2) / 2, by + 30, bx2, by);
      ctx.stroke();
    }

    // Street/road
    ctx.fillStyle = '#2a4a35';
    ctx.fillRect(0, h * 0.55, w, h * 0.45);

    // --- Parade float ---
    const fx = this.floatX;
    const fy = h * 0.45;
    const floatW = 180;
    const floatH = 100;

    // Float platform
    ctx.fillStyle = '#1a6633';
    ctx.fillRect(fx - floatW / 2, fy - floatH, floatW, floatH);

    // Gold trim
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 3;
    ctx.strokeRect(fx - floatW / 2, fy - floatH, floatW, floatH);

    // Wheels
    const wheelR2 = 10;
    const wheelPositions2 = [fx - floatW * 0.35, fx - floatW * 0.1, fx + floatW * 0.1, fx + floatW * 0.35];
    for (const wx of wheelPositions2) {
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.arc(wx, fy + 5, wheelR2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = COLORS.goldDark;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Spinning spokes
      for (let sp = 0; sp < 4; sp++) {
        const ang = sp * Math.PI / 2 + this.paradeTimer * 3;
        ctx.beginPath();
        ctx.moveTo(wx, fy + 5);
        ctx.lineTo(wx + Math.cos(ang) * wheelR2 * 0.7, fy + 5 + Math.sin(ang) * wheelR2 * 0.7);
        ctx.stroke();
      }
    }

    // Draw placed decorations on the float
    const zoneW = floatW / 4;
    const zoneH = floatH / 2;
    for (let i = 0; i < this.zones.length; i++) {
      const zone = this.zones[i];
      if (!zone.item) continue;
      const row = Math.floor(i / 4);
      const col = i % 4;
      const dx = fx - floatW / 2 + col * zoneW + zoneW / 2;
      const dy = fy - floatH + row * zoneH + zoneH / 2;
      this.drawDecoration(ctx, zone.item, dx, dy, 10, scale, t);
    }

    // Characters riding the float
    const charScale2 = scale * 1.0;
    drawElphaba(ctx, fx - 25, fy - floatH - 15, charScale2, t);
    drawGlinda(ctx, fx + 25, fy - floatH - 15, charScale2, t);

    // --- Crowd ---
    for (const npc of this.crowd) {
      const bounce = Math.sin(t * npc.bounceSpeed + npc.bouncePhase) * 6;
      const cy = npc.baseY + bounce;

      // Body circle
      ctx.fillStyle = npc.color;
      ctx.beginPath();
      ctx.arc(npc.x, cy, npc.size, 0, Math.PI * 2);
      ctx.fill();

      // Face
      ctx.fillStyle = '#222';
      // Eyes
      ctx.beginPath();
      ctx.arc(npc.x - 2, cy - 2, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(npc.x + 2, cy - 2, 1.5, 0, Math.PI * 2);
      ctx.fill();
      // Smile
      ctx.beginPath();
      ctx.arc(npc.x, cy + 1, 3, 0, Math.PI);
      ctx.stroke();
    }

    // --- Bonus gems ---
    for (const gem of this.bonusGems) {
      if (gem.collected) continue;
      drawGem(ctx, gem.x, gem.y, 6 * scale, isElphaba, t);
    }

    // Gems counter
    drawGem(ctx, 25, 25, 7 * scale, isElphaba, t);
    drawText(ctx, `${game.state.gems}`, 45, 25, 16 * scale, COLORS.gold, 'left');

    // Parade progress
    const progress = Math.min(1, (this.floatX + 200) / (w + 400));
    const barW2 = w * 0.5;
    const barX2 = (w - barW2) / 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(barX2, 10, barW2, 8);
    ctx.fillStyle = COLORS.emerald;
    ctx.fillRect(barX2, 10, barW2 * progress, 8);
    ctx.strokeStyle = COLORS.emeraldGlow;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX2, 10, barW2, 8);

    // Theme bonus indicator
    if (this.themeBonus) {
      const tbAlpha = Math.sin(t * 4) * 0.3 + 0.7;
      ctx.globalAlpha = tbAlpha;
      drawText(ctx, 'Theme Bonus!', w / 2, 30, 12 * scale, COLORS.gold);
      ctx.globalAlpha = 1;
    }
  }

  private renderComplete(game: GameEngine, ctx: CanvasRenderingContext2D) {
    const w = game.width;
    const h = game.height;
    const scale = game.getScale();
    const t = game.time;

    // Dark overlay
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0a2a18');
    bgGrad.addColorStop(0.5, '#0d3320');
    bgGrad.addColorStop(1, '#0a1a10');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, w, h);

    // Completion text
    drawText(ctx, 'Act XV Complete!', w / 2, h * 0.25, 26 * scale, COLORS.gold);
    drawText(ctx, 'Thank Goodness', w / 2, h * 0.33, 16 * scale, COLORS.emeraldGlow);

    drawText(ctx, `Decorations: ${this.placedCount}/8`, w / 2, h * 0.42, 16 * scale, '#fff');
    if (this.themeBonus) {
      drawText(ctx, 'Theme Bonus!', w / 2, h * 0.48, 14 * scale, COLORS.gold);
    }
    drawText(ctx, `Gems: ${game.state.gems}`, w / 2, h * 0.54, 16 * scale, COLORS.gold);

    // Stars
    const stars = game.state.stars.act15;
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < stars ? COLORS.gold : 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      for (let si = 0; si < 10; si++) {
        const r = si % 2 === 0 ? 15 * scale : 7 * scale;
        const angle = (si * Math.PI) / 5 - Math.PI / 2;
        const sx = w / 2 - 40 * scale + i * 40 * scale + Math.cos(angle) * r;
        const sy = h * 0.65 + Math.sin(angle) * r;
        if (si === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Final act message
    const pulse = Math.sin(t * 2) * 0.2 + 0.8;
    ctx.globalAlpha = pulse;
    drawText(ctx, 'The Grand Finale!', w / 2, h * 0.78, 18 * scale, COLORS.pinkGlow);
    ctx.globalAlpha = 1;

    // Characters
    const charScale = scale * 1.3;
    drawElphaba(ctx, w * 0.35, h * 0.88, charScale, t);
    drawGlinda(ctx, w * 0.65, h * 0.88, charScale, t);
  }

  private drawDecoration(
    ctx: CanvasRenderingContext2D,
    type: DecoType,
    x: number,
    y: number,
    size: number,
    _scale: number,
    time: number,
  ) {
    const s = size;
    const color = DECO_COLORS[type];

    switch (type) {
      case 'banner': {
        // Triangular banner/pennant
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x - s * 0.6, y - s * 0.5);
        ctx.lineTo(x + s * 0.6, y - s * 0.5);
        ctx.lineTo(x, y + s * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      }
      case 'flower': {
        // 5-petal flower
        ctx.fillStyle = color;
        for (let i = 0; i < 5; i++) {
          const ang = (i / 5) * Math.PI * 2 - Math.PI / 2;
          ctx.beginPath();
          ctx.arc(
            x + Math.cos(ang) * s * 0.3,
            y + Math.sin(ang) * s * 0.3,
            s * 0.3,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
        // Center
        ctx.fillStyle = '#ffdd44';
        ctx.beginPath();
        ctx.arc(x, y, s * 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'star': {
        // 5-pointed star
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? s * 0.6 : s * 0.25;
          const ang = (i * Math.PI) / 5 - Math.PI / 2 + Math.sin(time) * 0.1;
          const px = x + Math.cos(ang) * r;
          const py = y + Math.sin(ang) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'emerald': {
        // Diamond/emerald shape
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y - s * 0.6);
        ctx.lineTo(x + s * 0.4, y);
        ctx.lineTo(x, y + s * 0.6);
        ctx.lineTo(x - s * 0.4, y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#33ff99';
        ctx.lineWidth = 1;
        ctx.stroke();
        break;
      }
      case 'sparkle': {
        // 4-pointed sparkle
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y - s * 0.6);
        ctx.lineTo(x + s * 0.15, y);
        ctx.lineTo(x + s * 0.6, y);
        ctx.lineTo(x + s * 0.15, y + s * 0.05);
        ctx.lineTo(x, y + s * 0.6);
        ctx.lineTo(x - s * 0.15, y + s * 0.05);
        ctx.lineTo(x - s * 0.6, y);
        ctx.lineTo(x - s * 0.15, y);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'note': {
        // Musical note
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x - s * 0.15, y + s * 0.2, s * 0.2, 0, Math.PI * 2);
        ctx.fill();
        // Stem
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + s * 0.05, y + s * 0.2);
        ctx.lineTo(x + s * 0.05, y - s * 0.4);
        ctx.stroke();
        // Flag
        ctx.beginPath();
        ctx.moveTo(x + s * 0.05, y - s * 0.4);
        ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.2, x + s * 0.05, y - s * 0.1);
        ctx.stroke();
        break;
      }
      case 'crown': {
        // Mini crown
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x - s * 0.5, y + s * 0.3);
        ctx.lineTo(x - s * 0.4, y - s * 0.2);
        ctx.lineTo(x - s * 0.15, y + s * 0.1);
        ctx.lineTo(x, y - s * 0.4);
        ctx.lineTo(x + s * 0.15, y + s * 0.1);
        ctx.lineTo(x + s * 0.4, y - s * 0.2);
        ctx.lineTo(x + s * 0.5, y + s * 0.3);
        ctx.closePath();
        ctx.fill();
        // Gems
        ctx.fillStyle = '#ff4466';
        ctx.beginPath();
        ctx.arc(x, y - s * 0.25, s * 0.08, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'wand': {
        // Magic wand
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + s * 0.3, y + s * 0.3);
        ctx.lineTo(x - s * 0.15, y - s * 0.15);
        ctx.stroke();
        // Star tip
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? s * 0.25 : s * 0.1;
          const ang = (i * Math.PI) / 5 - Math.PI / 2 + time * 1.5;
          const px = x - s * 0.2 + Math.cos(ang) * r;
          const py = y - s * 0.2 + Math.sin(ang) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
    }
  }
}
