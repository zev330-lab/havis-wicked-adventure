// Act 14 — 'March of the Witch Hunters' — Stealth Escape
// Side-view stealth: auto-walk when not touching, hold to hide behind cover.
// Avoid sweeping searchlights across 4 sections.
import { Scene, GameEngine, actIndex } from '../engine/types';
import { drawText, drawElphaba, drawGlinda, drawGem, COLORS } from '../engine/renderer';
import { particlePresets } from '../engine/particles';
import { startBgMusic, stopBgMusic } from '../engine/audio';

interface CoverObject {
  x: number;           // world x position
  y: number;           // base y position
  type: 'bush' | 'barrel' | 'wall';
  section: number;     // which section (0-3) this belongs to
}

interface Searchlight {
  baseX: number;       // world x anchor
  sweepWidth: number;  // how far it sweeps left/right
  speed: number;       // radians per second
  phase: number;       // offset phase
  timer: number;       // current sweep timer
  warning: boolean;    // currently in warning blink phase
  warningTimer: number;
  active: boolean;     // light is on (false during blink)
  blinkCount: number;  // blinks remaining in warning
}

interface GemItem {
  x: number;
  y: number;
  collected: boolean;
  section: number;
}

const SECTION_WIDTH = 300;
const TOTAL_WIDTH = SECTION_WIDTH * 4;
const WALK_SPEED = 50;
const COVER_SPACING = 80;
const LIGHT_CONE_WIDTH = 50;
const LIGHT_CONE_HEIGHT_RATIO = 0.7;

export class Act14Scene implements Scene {
  private charX = 0;
  private charY = 0;
  private cameraX = 0;
  private hiding = false;
  private nearestCover: CoverObject | null = null;
  private covers: CoverObject[] = [];
  private searchlights: Searchlight[] = [];
  private gems: GemItem[] = [];
  private spottedCount = 0;
  private spottedFlash = 0;
  private currentSection = 0;
  private sectionCheckpoints: boolean[] = [false, false, false, false];
  private safeTextTimer = 0;
  private levelComplete = false;
  private hintTimer = 0;
  private spottedCooldown = 0;

  enter(game: GameEngine) {
    this.charX = 30;
    this.charY = game.height * 0.78;
    this.cameraX = 0;
    this.hiding = false;
    this.nearestCover = null;
    this.spottedCount = 0;
    this.spottedFlash = 0;
    this.currentSection = 0;
    this.sectionCheckpoints = [false, false, false, false];
    this.safeTextTimer = 0;
    this.levelComplete = false;
    this.hintTimer = 0;
    this.spottedCooldown = 0;

    game.state.gems = 0;
    game.state.health = 3;
    game.state.maxHealth = 3;
    game.state.noHitBonus = true;
    game.state.levelTime = 0;
    game.state.actComplete = false;

    this.buildLevel(game);
    startBgMusic('marchHunters');
  }

  exit(_game: GameEngine) {
    stopBgMusic();
  }

  private buildLevel(game: GameEngine) {
    this.covers = [];
    this.gems = [];
    this.searchlights = [];

    const groundY = game.height * 0.78;

    // Build cover objects for all 4 sections
    for (let section = 0; section < 4; section++) {
      const sectionStart = section * SECTION_WIDTH + 40;
      const sectionEnd = (section + 1) * SECTION_WIDTH - 20;

      // Place covers every ~80px within each section
      for (let cx = sectionStart; cx < sectionEnd; cx += COVER_SPACING) {
        const jitter = (Math.random() - 0.5) * 20;
        const types: CoverObject['type'][] = ['bush', 'barrel', 'wall'];
        this.covers.push({
          x: cx + jitter,
          y: groundY,
          type: types[Math.floor(Math.random() * types.length)],
          section,
        });
      }

      // Place gems between covers
      for (let gx = sectionStart + 40; gx < sectionEnd; gx += 60) {
        this.gems.push({
          x: gx + (Math.random() - 0.5) * 15,
          y: groundY - 20,
          collected: false,
          section,
        });
      }
    }

    // Place searchlights (3-4 total, spread across sections)
    const lightConfigs = [
      { baseX: SECTION_WIDTH * 0.5, sweepWidth: 100, speed: 1.2, phase: 0 },
      { baseX: SECTION_WIDTH * 1.3, sweepWidth: 120, speed: 0.9, phase: Math.PI * 0.5 },
      { baseX: SECTION_WIDTH * 2.2, sweepWidth: 90, speed: 1.5, phase: Math.PI },
      { baseX: SECTION_WIDTH * 3.1, sweepWidth: 110, speed: 1.0, phase: Math.PI * 1.5 },
    ];

    for (const cfg of lightConfigs) {
      this.searchlights.push({
        baseX: cfg.baseX,
        sweepWidth: cfg.sweepWidth,
        speed: cfg.speed,
        phase: cfg.phase,
        timer: cfg.phase,
        warning: false,
        warningTimer: 0,
        active: true,
        blinkCount: 0,
      });
    }
  }

  update(game: GameEngine, dt: number) {
    if (game.state.actComplete) return;

    game.state.levelTime += dt;
    this.hintTimer += dt;
    if (this.safeTextTimer > 0) this.safeTextTimer -= dt;
    if (this.spottedFlash > 0) this.spottedFlash -= dt;
    if (this.spottedCooldown > 0) this.spottedCooldown -= dt;

    const groundY = game.height * 0.78;
    this.charY = groundY;

    // Determine if player is holding the screen (hiding)
    const isTouching = game.input.isTouching;

    if (isTouching) {
      // Find nearest cover object to snap to
      let nearest: CoverObject | null = null;
      let nearestDist = Infinity;
      for (const cover of this.covers) {
        const dist = Math.abs(cover.x - this.charX);
        if (dist < nearestDist && dist < 60) {
          nearestDist = dist;
          nearest = cover;
        }
      }
      if (nearest) {
        this.hiding = true;
        this.nearestCover = nearest;
        // Snap character to the cover position
        this.charX += (nearest.x - this.charX) * Math.min(1, dt * 12);
      } else {
        this.hiding = false;
        this.nearestCover = null;
      }
    } else {
      // Not touching — auto-walk right
      this.hiding = false;
      this.nearestCover = null;
      this.charX += WALK_SPEED * dt;
    }

    // Keyboard fallback
    if (game.input.right) this.charX += WALK_SPEED * dt;
    if (game.input.left) this.charX -= WALK_SPEED * 0.5 * dt;

    // Clamp character position
    this.charX = Math.max(10, Math.min(TOTAL_WIDTH - 10, this.charX));

    // Camera follows character
    const targetCamX = this.charX - game.width * 0.35;
    this.cameraX += (targetCamX - this.cameraX) * Math.min(1, dt * 4);
    this.cameraX = Math.max(0, Math.min(TOTAL_WIDTH - game.width, this.cameraX));

    // Update searchlights
    for (const light of this.searchlights) {
      light.timer += dt * light.speed;

      // Warning blink logic: blink twice before each full sweep cycle
      const cycle = light.timer % (Math.PI * 2);
      if (cycle < 0.4 && !light.warning && light.blinkCount === 0) {
        // Start warning phase
        light.warning = true;
        light.warningTimer = 0;
        light.blinkCount = 4; // 4 transitions = 2 blinks (on-off-on-off)
        light.active = false;
      }

      if (light.warning) {
        light.warningTimer += dt;
        if (light.warningTimer > 0.15) {
          light.warningTimer = 0;
          light.blinkCount--;
          light.active = !light.active;
          if (light.blinkCount <= 0) {
            light.warning = false;
            light.active = true;
          }
        }
      }

      // Check if light hits character
      if (light.active && !this.hiding && this.spottedCooldown <= 0) {
        const lightX = light.baseX + Math.sin(light.timer) * light.sweepWidth;
        const dist = Math.abs(lightX - this.charX);
        if (dist < LIGHT_CONE_WIDTH * 0.6) {
          // SPOTTED!
          this.spottedCount++;
          this.spottedFlash = 1.0;
          this.spottedCooldown = 1.5; // Brief invulnerability after being spotted
          game.state.noHitBonus = false;
          game.playSound('hit');
          game.shakeCamera(8, 0.3);

          // 3 spots in current section = reset to start of section
          if (this.spottedCount % 3 === 0) {
            this.charX = this.currentSection * SECTION_WIDTH + 30;
            this.spottedFlash = 1.5;
          }
        }
      }
    }

    // Auto-collect gems
    for (const gem of this.gems) {
      if (gem.collected) continue;
      const dist = Math.abs(gem.x - this.charX);
      if (dist < 20) {
        gem.collected = true;
        game.state.gems++;
        game.state.score += 100;
        game.playSound('catchItem');
        const isElphaba = game.state.character === 'elphaba';
        game.spawnParticles(particlePresets.gemCollect(
          gem.x - this.cameraX, gem.y, isElphaba
        ));
      }
    }

    // Check section completion
    const newSection = Math.min(3, Math.floor(this.charX / SECTION_WIDTH));
    if (newSection > this.currentSection) {
      // Completed a section
      this.sectionCheckpoints[this.currentSection] = true;
      this.currentSection = newSection;
      this.safeTextTimer = 2.0;
      game.playSound('powerUp');
      game.spawnParticles(particlePresets.confetti(game.width * 0.5, game.height * 0.3));
    }

    // Check win condition: reached end of section 4
    if (this.charX >= TOTAL_WIDTH - 20) {
      this.sectionCheckpoints[3] = true;
      this.levelComplete = true;
      game.state.actComplete = true;
      this.completeAct(game);
    }
  }

  private completeAct(game: GameEngine) {
    let stars = 1; // Complete = 1 star
    if (this.spottedCount <= 2) stars = 2; // Spotted 2 or fewer
    if (this.spottedCount === 0) stars = 3; // Perfect — never spotted

    game.state.stars.act14 = Math.max(game.state.stars.act14, stars);

    if (!game.state.lastCompletedAct || actIndex(game.state.lastCompletedAct) < actIndex('act14')) {
      game.state.lastCompletedAct = 'act14';
    }
    game.saveGame();
    game.playSound('actComplete');

    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        game.spawnParticles(particlePresets.confetti(Math.random() * game.width, game.height * 0.3));
      }, i * 200);
    }

    setTimeout(() => {
      game.state.currentAct = 'act15';
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
    const camX = this.cameraX;

    // --- Night sky background ---
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#05081a');
    bgGrad.addColorStop(0.4, '#0a0f2e');
    bgGrad.addColorStop(0.7, '#101530');
    bgGrad.addColorStop(1, '#181e3a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Stars in sky
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < 30; i++) {
      const sx = ((i * 97 + 13) % w);
      const sy = ((i * 53 + 7) % (h * 0.3));
      const flicker = Math.sin(t * 2 + i) * 0.3 + 0.7;
      ctx.globalAlpha = flicker * 0.5;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // --- Far background buildings with yellow windows ---
    this.drawBackgroundBuildings(ctx, w, h, camX, t);

    // --- Ground ---
    const groundY = h * 0.78;
    const groundGrad = ctx.createLinearGradient(0, groundY, 0, h);
    groundGrad.addColorStop(0, '#1a1e2e');
    groundGrad.addColorStop(0.3, '#14182a');
    groundGrad.addColorStop(1, '#0a0e1e');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, groundY, w, h - groundY);

    // Subtle ground line
    ctx.strokeStyle = 'rgba(100, 120, 160, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();

    // --- Section dividers ---
    for (let s = 1; s <= 3; s++) {
      const sx = s * SECTION_WIDTH - camX;
      if (sx > -10 && sx < w + 10) {
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.15)';
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, h);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // --- Cover objects ---
    for (const cover of this.covers) {
      const screenX = cover.x - camX;
      if (screenX < -50 || screenX > w + 50) continue;
      this.drawCover(ctx, screenX, cover.y, cover.type, scale, cover === this.nearestCover && this.hiding);
    }

    // --- Gems ---
    for (const gem of this.gems) {
      if (gem.collected) continue;
      const screenX = gem.x - camX;
      if (screenX < -20 || screenX > w + 20) continue;
      drawGem(ctx, screenX, gem.y, 6 * scale, isElphaba, t);
    }

    // --- Searchlights ---
    for (const light of this.searchlights) {
      if (!light.active) continue;
      const lightX = light.baseX + Math.sin(light.timer) * light.sweepWidth;
      const screenX = lightX - camX;
      if (screenX < -LIGHT_CONE_WIDTH - 20 || screenX > w + LIGHT_CONE_WIDTH + 20) continue;

      // Draw cone from top
      const coneTopY = 0;
      const coneBottomY = h * LIGHT_CONE_HEIGHT_RATIO;
      const halfWidth = LIGHT_CONE_WIDTH;

      const coneGrad = ctx.createLinearGradient(0, coneTopY, 0, coneBottomY);
      coneGrad.addColorStop(0, 'rgba(255, 255, 100, 0.35)');
      coneGrad.addColorStop(0.5, 'rgba(255, 255, 100, 0.15)');
      coneGrad.addColorStop(1, 'rgba(255, 255, 100, 0.02)');

      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(screenX, coneTopY);
      ctx.lineTo(screenX - halfWidth, coneBottomY);
      ctx.lineTo(screenX + halfWidth, coneBottomY);
      ctx.closePath();
      ctx.fill();

      // Light source glow at top
      ctx.fillStyle = 'rgba(255, 255, 150, 0.6)';
      ctx.beginPath();
      ctx.arc(screenX, coneTopY + 5, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Warning blink indicators (for lights in warning state) ---
    for (const light of this.searchlights) {
      if (!light.warning) continue;
      const lightX = light.baseX + Math.sin(light.timer) * light.sweepWidth;
      const screenX = lightX - camX;
      if (screenX < -50 || screenX > w + 50) continue;

      // Blinking indicator
      if (!light.active) {
        ctx.fillStyle = 'rgba(255, 200, 50, 0.4)';
        ctx.beginPath();
        ctx.arc(screenX, 15, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // --- Character ---
    const charScreenX = this.charX - camX;
    const charScale = scale * 1.2;

    if (this.hiding) {
      ctx.globalAlpha = 0.4; // Semi-transparent when hiding
    }

    if (isElphaba) {
      drawElphaba(ctx, charScreenX, this.charY - 15, charScale, t);
    } else {
      drawGlinda(ctx, charScreenX, this.charY - 15, charScale, t);
    }
    ctx.globalAlpha = 1;

    // --- Spotted indicator ---
    if (this.spottedFlash > 0) {
      // Red flash overlay
      ctx.fillStyle = `rgba(255, 0, 0, ${this.spottedFlash * 0.2})`;
      ctx.fillRect(0, 0, w, h);

      // Red "!" above character
      drawText(ctx, '!', charScreenX, this.charY - 55, 28 * scale, '#ff3333');
      drawText(ctx, 'SPOTTED!', w / 2, h * 0.25, 24 * scale, '#ff4444');
    }

    // --- "Safe!" checkpoint text ---
    if (this.safeTextTimer > 0) {
      const alpha = Math.min(1, this.safeTextTimer);
      ctx.globalAlpha = alpha;
      drawText(ctx, 'Safe!', w / 2, h * 0.3, 26 * scale, '#66ff88');
      ctx.globalAlpha = 1;
    }

    // --- HUD ---
    // Section progress
    for (let s = 0; s < 4; s++) {
      const dotX = w * 0.3 + s * 20;
      const dotY = 20;
      ctx.fillStyle = this.sectionCheckpoints[s]
        ? COLORS.emerald
        : s === this.currentSection
          ? COLORS.gold
          : 'rgba(255, 255, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Gem counter
    drawGem(ctx, 25, 25, 7 * scale, isElphaba, t);
    drawText(ctx, `${game.state.gems}`, 45, 25, 16 * scale, COLORS.gold, 'left');

    // Spotted counter
    drawText(ctx, `Spotted: ${this.spottedCount}`, w - 20, 25, 13 * scale,
      this.spottedCount === 0 ? '#66ff88' : this.spottedCount <= 2 ? COLORS.gold : '#ff6666', 'right');

    // --- Controls hint ---
    if (this.hintTimer < 5) {
      const alpha = Math.max(0, 1 - this.hintTimer / 5);
      ctx.globalAlpha = alpha;
      drawText(ctx, 'Hold screen to HIDE', w / 2, h * 0.6, 14 * scale, '#fff');
      drawText(ctx, 'Release to walk forward', w / 2, h * 0.65, 12 * scale, '#ccc');
      ctx.globalAlpha = 1;
    }

    // --- Act complete overlay ---
    if (game.state.actComplete) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, w, h);
      drawText(ctx, 'Act XIV Complete!', w / 2, h * 0.32, 26 * scale, COLORS.emerald);
      drawText(ctx, 'March of the Witch Hunters', w / 2, h * 0.40, 14 * scale, '#aaa');
      drawText(ctx, `Spotted: ${this.spottedCount} time${this.spottedCount !== 1 ? 's' : ''}`, w / 2, h * 0.48, 16 * scale, '#fff');
      drawText(ctx, `Gems: ${game.state.gems}`, w / 2, h * 0.54, 16 * scale, COLORS.gold);

      const stars = game.state.stars.act14;
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
    }
  }

  private drawBackgroundBuildings(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    camX: number,
    t: number,
  ) {
    // Parallax buildings far in background
    const parallax = camX * 0.2;
    const buildingColor = 'rgba(15, 20, 40, 0.9)';

    for (let i = 0; i < 10; i++) {
      const bx = i * 120 - parallax % 120 - 60;
      const bw = 40 + (i * 37 % 40);
      const bh = 60 + (i * 53 % 80);
      const by = h * 0.78 - bh;

      ctx.fillStyle = buildingColor;
      ctx.fillRect(bx, by, bw, bh);

      // Yellow windows
      ctx.fillStyle = 'rgba(255, 220, 100, 0.6)';
      const windowCols = Math.floor(bw / 14);
      const windowRows = Math.floor(bh / 20);
      for (let row = 0; row < windowRows; row++) {
        for (let col = 0; col < windowCols; col++) {
          // Some windows are dark (random but deterministic)
          const seed = (i * 7 + row * 3 + col * 11) % 5;
          if (seed < 2) continue;
          const wx = bx + 6 + col * 14;
          const wy = by + 8 + row * 20;
          // Gentle flicker
          const flicker = Math.sin(t * 1.5 + i + row * 2 + col) * 0.15 + 0.85;
          ctx.globalAlpha = flicker;
          ctx.fillRect(wx, wy, 6, 8);
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  private drawCover(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    type: CoverObject['type'],
    scale: number,
    isActive: boolean,
  ) {
    const outlineAlpha = isActive ? 0.9 : 0.5;

    switch (type) {
      case 'bush': {
        // Green oval bush
        ctx.fillStyle = '#1a5c2a';
        ctx.beginPath();
        ctx.ellipse(x, y - 12, 22 * scale, 14 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        // Darker foliage detail
        ctx.fillStyle = '#124a20';
        ctx.beginPath();
        ctx.ellipse(x - 6, y - 14, 10 * scale, 8 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
        // White outline
        ctx.strokeStyle = `rgba(255, 255, 255, ${outlineAlpha})`;
        ctx.lineWidth = isActive ? 2 : 1;
        ctx.beginPath();
        ctx.ellipse(x, y - 12, 22 * scale, 14 * scale, 0, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'barrel': {
        // Brown circle barrel
        ctx.fillStyle = '#6b3a1f';
        ctx.beginPath();
        ctx.arc(x, y - 14, 13 * scale, 0, Math.PI * 2);
        ctx.fill();
        // Barrel bands
        ctx.strokeStyle = '#4a2810';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 12 * scale, y - 18);
        ctx.lineTo(x + 12 * scale, y - 18);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 12 * scale, y - 10);
        ctx.lineTo(x + 12 * scale, y - 10);
        ctx.stroke();
        // White outline
        ctx.strokeStyle = `rgba(255, 255, 255, ${outlineAlpha})`;
        ctx.lineWidth = isActive ? 2 : 1;
        ctx.beginPath();
        ctx.arc(x, y - 14, 13 * scale, 0, Math.PI * 2);
        ctx.stroke();
        break;
      }
      case 'wall': {
        // Gray rectangle wall piece
        const wallW = 20 * scale;
        const wallH = 30 * scale;
        ctx.fillStyle = '#3a3f4e';
        ctx.fillRect(x - wallW / 2, y - wallH, wallW, wallH);
        // Brick lines
        ctx.strokeStyle = '#2a2f3e';
        ctx.lineWidth = 1;
        for (let row = 0; row < 4; row++) {
          const ry = y - wallH + row * (wallH / 4);
          ctx.beginPath();
          ctx.moveTo(x - wallW / 2, ry);
          ctx.lineTo(x + wallW / 2, ry);
          ctx.stroke();
        }
        // White outline
        ctx.strokeStyle = `rgba(255, 255, 255, ${outlineAlpha})`;
        ctx.lineWidth = isActive ? 2 : 1;
        ctx.strokeRect(x - wallW / 2, y - wallH, wallW, wallH);
        break;
      }
    }
  }
}
