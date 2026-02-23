// Level select — styled like a theater playbill
import { Scene, GameEngine, ActId } from '../engine/types';
import { drawSky, drawText, drawEmeraldCity, COLORS } from '../engine/renderer';
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
];

export class LevelSelectScene implements Scene {
  private timer = 0;
  private sparkleTimer = 0;

  enter(game: GameEngine) {
    this.timer = 0;
    this.sparkleTimer = 0;
  }

  exit(_game: GameEngine) {}

  update(game: GameEngine, dt: number) {
    this.timer += dt;
    this.sparkleTimer += dt;

    if (this.sparkleTimer > 0.3) {
      this.sparkleTimer = 0;
      game.spawnParticles(particlePresets.ambientSparkle(0, 0, game.width, game.height));
    }

    // Check for act selection
    if (game.input.tap) {
      const h = game.height;
      const cardStartY = h * 0.16;
      const cardHeight = h * 0.11;
      const cardGap = h * 0.02;

      for (let i = 0; i < acts.length; i++) {
        const act = acts[i];
        const cy = cardStartY + i * (cardHeight + cardGap);
        const isLocked = this.isActLocked(game, act.id);

        if (!isLocked && game.input.tapY >= cy && game.input.tapY <= cy + cardHeight) {
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
    // Each act unlocks when the previous act has been completed
    const order: ActId[] = ['act1', 'act2', 'act3', 'act4', 'act5', 'act6'];
    const actIndex = order.indexOf(actId);
    const completedIndex = order.indexOf(prev);
    return completedIndex < actIndex - 1;
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
    drawText(ctx, "Havi's Wicked Adventure", w / 2, h * 0.12, 22 * scale, COLORS.gold);

    // Divider
    ctx.strokeStyle = COLORS.gold;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h * 0.17);
    ctx.lineTo(w * 0.85, h * 0.17);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Act cards — compact to fit 6
    const cardStartY = h * 0.16;
    const cardHeight = h * 0.11;
    const cardGap = h * 0.02;
    const cardMargin = 20 * scale;

    for (let i = 0; i < acts.length; i++) {
      const act = acts[i];
      const cy = cardStartY + i * (cardHeight + cardGap);
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
      const r = 8 * scale;
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

      drawText(ctx, act.title, w / 2, cy + cardHeight * 0.22, 14 * scale, COLORS.gold);
      drawText(ctx, act.subtitle, w / 2, cy + cardHeight * 0.5, 11 * scale, '#ddd');
      drawText(ctx, act.song, w / 2, cy + cardHeight * 0.75, 8 * scale, '#aaa');

      // Stars (smaller for compact cards)
      for (let s = 0; s < 3; s++) {
        const sx = w / 2 - 18 * scale + s * 18 * scale;
        const sy = cy + cardHeight * 0.92;
        ctx.fillStyle = s < stars ? COLORS.gold : 'rgba(100, 100, 100, 0.3)';
        ctx.beginPath();
        for (let si = 0; si < 10; si++) {
          const sr = si % 2 === 0 ? 4 * scale : 2 * scale;
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
        ctx.fillRect(w / 2 - 6 * scale, cy + cardHeight * 0.3, 12 * scale, 9 * scale);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1.5 * scale;
        ctx.beginPath();
        ctx.arc(w / 2, cy + cardHeight * 0.28, 5 * scale, Math.PI, 0);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }

    // Bottom quote
    ctx.globalAlpha = 0.5;
    drawText(ctx, '"No one mourns the wicked"', w / 2, h * 0.94, 10 * scale, '#aaa');
    ctx.globalAlpha = 1;
  }
}
