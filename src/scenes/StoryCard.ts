// Story cards between acts — Wicked quotes adapted for Havi
import { Scene, GameEngine, ActId } from '../engine/types';
import { drawSky, drawText, COLORS, drawEmeraldCity } from '../engine/renderer';
import { particlePresets } from '../engine/particles';

interface StoryCard {
  title: string;
  lines: string[];
  bgTop: string;
  bgBottom: string;
}

const storyCards: Record<string, StoryCard[]> = {
  act1_intro: [
    {
      title: 'Act One',
      lines: [
        '"Something Has Changed',
        'Within Me"',
        '',
        'Havi, welcome to the Land of Oz!',
        'The skies are calling...',
        'Fly high and collect the magic gems',
        'that light the way to the Emerald City!',
      ],
      bgTop: '#0a0025',
      bgBottom: '#002a15',
    },
  ],
  act2_intro: [
    {
      title: 'Act Two',
      lines: [
        '"Defying Gravity"',
        '',
        'The Emerald City awaits, Havi!',
        'Leap across rooftops and towers,',
        'gather spell books of ancient power,',
        'and show Oz what courage looks like!',
        '',
        'The Ozians are cheering for you!',
      ],
      bgTop: '#0a0020',
      bgBottom: '#003520',
    },
  ],
  act3_intro: [
    {
      title: 'Act Three',
      lines: [
        '"For Good"',
        '',
        'Havi, you\'ve come so far!',
        'The Wizard\'s machine threatens',
        'the Land of Oz.',
        'Only your magic can stop it!',
        '',
        'Be brave. Be true. Be YOU.',
      ],
      bgTop: '#150025',
      bgBottom: '#002a10',
    },
  ],
  act4_intro: [
    {
      title: 'Act Four',
      lines: [
        '"Popular"',
        '',
        'The Ozians want to celebrate!',
        'Havi, it\'s time for the stage!',
        'Catch the falling treasures',
        'and become the most popular',
        'witch in all of Oz!',
        '',
        'The spotlight is yours!',
      ],
      bgTop: '#2a0030',
      bgBottom: '#1a0020',
    },
  ],
  act5_intro: [
    {
      title: 'Act Five',
      lines: [
        '"Dancing Through Life"',
        '',
        'Deep in the Emerald Palace,',
        'a grand ballroom awaits!',
        'Find all the hidden dance gems',
        'and unlock the golden door.',
        '',
        'Watch for the magic walls, Havi!',
      ],
      bgTop: '#0a1a10',
      bgBottom: '#001a0d',
    },
  ],
  act6_intro: [
    {
      title: 'Act Six',
      lines: [
        '"No One Mourns the Wicked"',
        '',
        'The palace is crumbling!',
        'Havi, you must escape!',
        'Climb up through the towers',
        'and reach the rooftop.',
        '',
        'Don\'t look down... GO!',
      ],
      bgTop: '#1a0a00',
      bgBottom: '#0a1500',
    },
  ],
  act7_intro: [
    {
      title: 'Act Seven',
      lines: [
        '"The Wizard and I"',
        '',
        'Havi, a magic bubble awaits!',
        'Float up through the enchanted sky',
        'toward the Emerald City!',
        'Hold to rise, let go to drift.',
        '',
        'Collect gems and dodge the clouds!',
      ],
      bgTop: '#000820',
      bgBottom: '#0d2a20',
    },
  ],
  act8_intro: [
    {
      title: 'Act Eight',
      lines: [
        '"What Is This Feeling?"',
        '',
        'Enemies are coming, Havi!',
        'They approach from both sides.',
        'Tap each enemy to zap them',
        'before they reach the center!',
        '',
        'Protect Elphaba and Glinda!',
      ],
      bgTop: '#0a001a',
      bgBottom: '#001a0a',
    },
  ],
  act9_intro: [
    {
      title: 'Act Nine',
      lines: [
        '"For Good — Finale"',
        '',
        'The final performance, Havi!',
        'Musical notes fall in 3 columns.',
        'Tap the right column as each note',
        'reaches the glowing line!',
        '',
        'This is your moment!',
      ],
      bgTop: '#150030',
      bgBottom: '#08001a',
    },
  ],
};

export class StoryCardScene implements Scene {
  private timer = 0;
  private lineTimers: number[] = [];
  private sparkleTimer = 0;
  private ready = false;

  enter(game: GameEngine) {
    this.timer = 0;
    this.sparkleTimer = 0;
    this.ready = false;
    this.lineTimers = [];
  }

  exit(_game: GameEngine) {}

  private getCard(game: GameEngine): StoryCard {
    const actKey = `${game.state.currentAct}_intro`;
    const cards = storyCards[actKey] || storyCards['act1_intro'];
    return cards[0];
  }

  update(game: GameEngine, dt: number) {
    this.timer += dt;
    this.sparkleTimer += dt;

    const card = this.getCard(game);
    const totalLines = card.lines.length;

    // Auto-advance line reveals
    for (let i = 0; i < totalLines; i++) {
      if (this.lineTimers.length <= i) {
        this.lineTimers.push(0);
      }
      if (this.timer > 1.0 + i * 0.8) {
        this.lineTimers[i] += dt;
      }
    }

    // Ready to proceed after all lines shown — give time to read
    if (this.timer > 1.0 + totalLines * 0.8 + 2.0) {
      this.ready = true;
    }

    // Sparkles
    if (this.sparkleTimer > 0.2) {
      this.sparkleTimer = 0;
      game.spawnParticles(particlePresets.ambientSparkle(0, 0, game.width, game.height));
    }

    // Musical notes floating up
    if (Math.random() < 0.08) {
      game.spawnParticles(particlePresets.musicalNote(
        Math.random() * game.width,
        game.height * 0.9
      ));
    }

    // Tap/key to continue
    if (this.ready && (game.input.tap || game.input.jumpPressed || game.input.actionPressed)) {
      game.playSound('menuSelect');

      // Reset game state for the act
      game.state.gems = 0;
      game.state.score = 0;
      game.state.health = 3;
      game.state.noHitBonus = true;
      game.state.levelTime = 0;
      game.state.actComplete = false;

      if (game.state.currentAct === 'act3') {
        game.state.bossHealth = game.state.bossMaxHealth;
      }

      game.transitionTo('gameplay');
    }
  }

  render(game: GameEngine, ctx: CanvasRenderingContext2D) {
    const w = game.width;
    const h = game.height;
    const scale = game.getScale();
    const card = this.getCard(game);

    // Background
    drawSky(ctx, w, h, card.bgTop, card.bgBottom, game.time);

    // Emerald City silhouette (small, distant)
    ctx.globalAlpha = 0.3;
    drawEmeraldCity(ctx, w / 2, h * 0.85, scale * 0.6, game.time);
    ctx.globalAlpha = 1;

    // Decorative border
    const borderAlpha = Math.min(1, this.timer * 2);
    ctx.globalAlpha = borderAlpha * 0.4;
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2;
    const margin = 20 * scale;
    ctx.strokeRect(margin, margin, w - margin * 2, h - margin * 2);
    // Corner decorations
    const corners = [[margin, margin], [w - margin, margin], [margin, h - margin], [w - margin, h - margin]];
    for (const [cx, cy] of corners) {
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.arc(cx, cy, 4 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Title
    const titleFade = Math.min(1, this.timer * 1.5);
    ctx.globalAlpha = titleFade;
    drawText(ctx, card.title, w / 2, h * 0.12, 32 * scale, COLORS.gold);
    ctx.globalAlpha = 1;

    // Horizontal rule under title
    ctx.globalAlpha = titleFade * 0.5;
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.25, h * 0.17);
    ctx.lineTo(w * 0.75, h * 0.17);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Lines of text
    const startY = h * 0.25;
    const lineHeight = 24 * scale;

    for (let i = 0; i < card.lines.length; i++) {
      if (i >= this.lineTimers.length) break;
      const lineFade = Math.min(1, this.lineTimers[i] * 1.5);
      if (lineFade <= 0) continue;

      ctx.globalAlpha = lineFade;
      const line = card.lines[i];
      const isQuote = line.startsWith('"');
      const color = isQuote ? COLORS.emeraldGlow : '#ddd';
      const size = isQuote ? 18 * scale : 14 * scale;
      drawText(ctx, line, w / 2, startY + i * lineHeight, size, color);
    }
    ctx.globalAlpha = 1;

    // Continue prompt
    if (this.ready) {
      const pulse = Math.sin(game.time * 3) * 0.3 + 0.7;
      ctx.globalAlpha = pulse;
      drawText(ctx, 'Tap to begin your adventure!', w / 2, h * 0.88, 14 * scale,
        game.state.character === 'elphaba' ? COLORS.emeraldGlow : COLORS.pinkGlow);
      ctx.globalAlpha = 1;
    }
  }
}
