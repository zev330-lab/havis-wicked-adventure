// Level select — styled like a theater playbill, scrollable for 15 acts
import { Scene, GameEngine, ActId, ACT_ORDER, actIndex } from '../engine/types';
import { drawText, COLORS } from '../engine/renderer';
import { particlePresets } from '../engine/particles';

interface ActInfo {
  id: ActId;
  title: string;
  subtitle: string;
  song: string;
}

const acts: ActInfo[] = [
  { id: 'act1', title: 'Act I', subtitle: 'Sky Flight', song: '"Something Has Changed"' },
  { id: 'act2', title: 'Act II', subtitle: 'Emerald City', song: '"Defying Gravity"' },
  { id: 'act3', title: 'Act III', subtitle: 'Boss Battle', song: '"For Good"' },
  { id: 'act4', title: 'Act IV', subtitle: 'The Stage', song: '"Popular"' },
  { id: 'act5', title: 'Act V', subtitle: 'Ballroom Maze', song: '"Dancing Through Life"' },
  { id: 'act6', title: 'Act VI', subtitle: 'The Escape', song: '"No One Mourns"' },
  { id: 'act7', title: 'Act VII', subtitle: 'Bubble Float', song: '"The Wizard and I"' },
  { id: 'act8', title: 'Act VIII', subtitle: 'Tap to Zap', song: '"What Is This Feeling?"' },
  { id: 'act9', title: 'Act IX', subtitle: 'Rhythm Tap', song: '"For Good (Finale)"' },
  { id: 'act10', title: 'Act X', subtitle: 'City Dash', song: '"One Short Day"' },
  { id: 'act11', title: 'Act XI', subtitle: 'Illusions', song: '"Wonderful"' },
  { id: 'act12', title: 'Act XII', subtitle: 'Spell Chain', song: '"No Good Deed"' },
  { id: 'act13', title: 'Act XIII', subtitle: 'Pair Flight', song: '"As Long As You\'re Mine"' },
  { id: 'act14', title: 'Act XIV', subtitle: 'Stealth Escape', song: '"March of the Witch Hunters"' },
  { id: 'act15', title: 'Act XV', subtitle: 'Parade', song: '"Thank Goodness"' },
];

export class LevelSelectScene implements Scene {
  private timer = 0;
  private sparkleTimer = 0;

  // Scroll state
  private scrollOffset = 0;
  private scrollVelocity = 0;
  private isDragging = false;
  private dragStartY = 0;
  private dragStartScroll = 0;
  private dragDistance = 0;
  private lastTouchY = 0;

  enter(game: GameEngine) {
    this.timer = 0;
    this.sparkleTimer = 0;
    this.scrollVelocity = 0;
    this.isDragging = false;
    this.dragDistance = 0;
  }

  exit(_game: GameEngine) {}

  private getCardLayout(h: number, scale: number) {
    const cardStartY = h * 0.18;
    const cardHeight = h * 0.065;
    const cardGap = h * 0.008;
    const totalContentHeight = acts.length * (cardHeight + cardGap);
    const visibleHeight = h * 0.78; // from cardStartY to bottom quote area
    const maxScroll = Math.max(0, totalContentHeight - visibleHeight);
    return { cardStartY, cardHeight, cardGap, totalContentHeight, visibleHeight, maxScroll };
  }

  update(game: GameEngine, dt: number) {
    this.timer += dt;
    this.sparkleTimer += dt;

    if (this.sparkleTimer > 0.3) {
      this.sparkleTimer = 0;
      game.spawnParticles(particlePresets.ambientSparkle(0, 0, game.width, game.height));
    }

    const h = game.height;
    const scale = game.getScale();
    const { maxScroll } = this.getCardLayout(h, scale);

    // Handle scrolling
    if (game.input.isTouching) {
      if (!this.isDragging) {
        // Start drag
        this.isDragging = true;
        this.dragStartY = game.input.touchY;
        this.dragStartScroll = this.scrollOffset;
        this.lastTouchY = game.input.touchY;
        this.dragDistance = 0;
        this.scrollVelocity = 0;
      } else {
        // Continue drag
        const deltaY = game.input.touchY - this.lastTouchY;
        this.dragDistance += Math.abs(game.input.touchY - this.dragStartY);
        this.scrollOffset = this.dragStartScroll - (game.input.touchY - this.dragStartY);
        this.scrollVelocity = -deltaY / Math.max(dt, 0.016);
        this.lastTouchY = game.input.touchY;
      }
    } else {
      if (this.isDragging) {
        this.isDragging = false;
      }
      // Momentum scroll
      if (Math.abs(this.scrollVelocity) > 1) {
        this.scrollOffset += this.scrollVelocity * dt;
        this.scrollVelocity *= 0.92; // friction
      } else {
        this.scrollVelocity = 0;
      }
    }

    // Clamp scroll
    this.scrollOffset = Math.max(0, Math.min(maxScroll, this.scrollOffset));

    // Check for act selection (only if it was a tap, not a scroll drag)
    if (game.input.tap && this.dragDistance < 15) {
      const { cardStartY, cardHeight, cardGap } = this.getCardLayout(h, scale);

      for (let i = 0; i < acts.length; i++) {
        const act = acts[i];
        const cy = cardStartY + i * (cardHeight + cardGap) - this.scrollOffset;
        const isLocked = this.isActLocked(game, act.id);

        if (!isLocked && game.input.tapY >= cy && game.input.tapY <= cy + cardHeight
            && game.input.tapY >= cardStartY && game.input.tapY <= h * 0.95) {
          game.state.currentAct = act.id;
          game.state.storyCardIndex = 0;
          game.playSound('menuSelect');
          game.transitionTo('storyCard');
          return;
        }
      }
    }
  }

  private isActLocked(game: GameEngine, actId: ActId): boolean {
    if (actId === 'act1') return false;
    const prev = game.state.lastCompletedAct;
    if (!prev) return true;
    const ai = actIndex(actId);
    const ci = actIndex(prev);
    return ci < ai - 1;
  }

  render(game: GameEngine, ctx: CanvasRenderingContext2D) {
    const w = game.width;
    const h = game.height;
    const scale = game.getScale();

    // Background — velvet curtain feel
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#1a0020');
    bgGrad.addColorStop(0.5, '#0d0015');
    bgGrad.addColorStop(1, '#000a05');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Curtain drape effect at top
    ctx.fillStyle = 'rgba(80, 0, 30, 0.3)';
    for (let i = 0; i < 6; i++) {
      const cx = (w / 6) * i + w / 12;
      ctx.beginPath();
      ctx.moveTo(cx - w / 12, 0);
      ctx.quadraticCurveTo(cx, 30 * scale, cx + w / 12, 0);
      ctx.fill();
    }

    // Playbill header
    drawText(ctx, 'THE PROGRAM', w / 2, h * 0.06, 12 * scale, COLORS.gold);
    drawText(ctx, "Havi's Wicked Adventure", w / 2, h * 0.12, 20 * scale, COLORS.gold);

    // Divider
    ctx.strokeStyle = COLORS.gold;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h * 0.16);
    ctx.lineTo(w * 0.85, h * 0.16);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Scrollable card area — clip to visible region
    const { cardStartY, cardHeight, cardGap, maxScroll } = this.getCardLayout(h, scale);
    const cardMargin = 16 * scale;
    const clipTop = cardStartY;
    const clipBottom = h * 0.96;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, clipTop, w, clipBottom - clipTop);
    ctx.clip();

    for (let i = 0; i < acts.length; i++) {
      const act = acts[i];
      const cy = cardStartY + i * (cardHeight + cardGap) - this.scrollOffset;

      // Skip off-screen cards
      if (cy + cardHeight < clipTop || cy > clipBottom) continue;

      const isLocked = this.isActLocked(game, act.id);
      const stars = game.state.stars[act.id] || 0;

      // Card background
      const cardGrad = ctx.createLinearGradient(cardMargin, cy, w - cardMargin, cy + cardHeight);
      if (isLocked) {
        cardGrad.addColorStop(0, 'rgba(40, 40, 40, 0.5)');
        cardGrad.addColorStop(1, 'rgba(30, 30, 30, 0.5)');
      } else {
        const isGreen = game.state.character === 'elphaba';
        cardGrad.addColorStop(0, isGreen ? 'rgba(0, 60, 30, 0.6)' : 'rgba(60, 0, 40, 0.6)');
        cardGrad.addColorStop(1, isGreen ? 'rgba(0, 40, 20, 0.6)' : 'rgba(40, 0, 25, 0.6)');
      }
      ctx.fillStyle = cardGrad;

      // Rounded card
      const r = 5 * scale;
      const cx2 = cardMargin;
      const cw = w - cardMargin * 2;
      ctx.beginPath();
      ctx.moveTo(cx2 + r, cy);
      ctx.lineTo(cx2 + cw - r, cy);
      ctx.arcTo(cx2 + cw, cy, cx2 + cw, cy + r, r);
      ctx.lineTo(cx2 + cw, cy + cardHeight - r);
      ctx.arcTo(cx2 + cw, cy + cardHeight, cx2 + cw - r, cy + cardHeight, r);
      ctx.lineTo(cx2 + r, cy + cardHeight);
      ctx.arcTo(cx2, cy + cardHeight, cx2, cy + cardHeight - r, r);
      ctx.lineTo(cx2, cy + r);
      ctx.arcTo(cx2, cy, cx2 + r, cy, r);
      ctx.closePath();
      ctx.fill();

      // Border
      ctx.strokeStyle = isLocked ? 'rgba(100, 100, 100, 0.3)' : COLORS.gold;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = isLocked ? 0.4 : 0.8;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Content
      const textAlpha = isLocked ? 0.4 : 1;
      ctx.globalAlpha = textAlpha;

      // Title and subtitle side by side for compact layout
      drawText(ctx, act.title, w * 0.22, cy + cardHeight * 0.5, 10 * scale, COLORS.gold);
      drawText(ctx, act.subtitle, w / 2, cy + cardHeight * 0.5, 9 * scale, '#ddd');

      // Stars (right side)
      for (let s = 0; s < 3; s++) {
        const sx = w * 0.78 - 12 * scale + s * 12 * scale;
        const sy = cy + cardHeight * 0.5;
        ctx.fillStyle = s < stars ? COLORS.gold : 'rgba(100, 100, 100, 0.3)';
        ctx.beginPath();
        for (let si = 0; si < 10; si++) {
          const sr = si % 2 === 0 ? 3 * scale : 1.5 * scale;
          const angle = (si * Math.PI) / 5 - Math.PI / 2;
          const px = sx + Math.cos(angle) * sr;
          const py = sy + Math.sin(angle) * sr;
          if (si === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      }

      // Lock icon
      if (isLocked) {
        ctx.fillStyle = '#666';
        ctx.fillRect(w / 2 - 4 * scale, cy + cardHeight * 0.25, 8 * scale, 6 * scale);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1 * scale;
        ctx.beginPath();
        ctx.arc(w / 2, cy + cardHeight * 0.22, 3.5 * scale, Math.PI, 0);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }

    ctx.restore();

    // Scroll indicator (right edge)
    if (maxScroll > 0) {
      const indicatorHeight = Math.max(20, (h * 0.78 / (h * 0.78 + maxScroll)) * (clipBottom - clipTop));
      const indicatorY = clipTop + (this.scrollOffset / maxScroll) * (clipBottom - clipTop - indicatorHeight);
      ctx.fillStyle = COLORS.gold;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(w - 4 * scale, indicatorY, 3 * scale, indicatorHeight);
      ctx.globalAlpha = 1;
    }

    // Bottom quote
    ctx.globalAlpha = 0.5;
    drawText(ctx, '"No one mourns the wicked"', w / 2, h * 0.98, 9 * scale, '#aaa');
    ctx.globalAlpha = 1;
  }
}
