// Act 9 — 'Finale (For Good Reprise)' — Rhythm Tap
// Musical notes fall gently in 3 columns. Tap when they reach the glowing zone!
// Designed to be fun and forgiving for a child.
import { Scene, GameEngine, actIndex } from '../engine/types';
import { drawText, drawElphaba, drawGlinda, drawHealth, COLORS } from '../engine/renderer';
import { particlePresets } from '../engine/particles';
import { startBgMusic, stopBgMusic } from '../engine/audio';

interface RhythmNote {
  column: 0 | 1 | 2;
  y: number;
  speed: number;
  state: 'falling' | 'hit_perfect' | 'hit_good' | 'missed';
  hitAlpha: number;
  active: boolean;
}

// Pre-designed note patterns that feel musical (column sequences)
const NOTE_PATTERNS: (0 | 1 | 2)[][] = [
  [1, 0, 1, 2, 1],           // center-left-center-right-center
  [0, 1, 2, 1, 0],           // sweep left to right and back
  [1, 1, 0, 1, 1, 2],        // center-heavy with sides
  [0, 0, 2, 2, 1],           // left-left-right-right-center
  [2, 1, 0, 1, 2],           // sweep right to left and back
  [1, 0, 2, 1, 0, 2],        // alternating sides
  [0, 1, 2, 2, 1, 0],        // zigzag
  [1, 2, 1, 0, 1],           // center bounce
];

export class Act9Scene implements Scene {
  private notes: RhythmNote[] = [];
  private spawnTimer = 0;
  private noteSpeed = 0;
  private noteInterval = 0;
  private combo = 0;
  private maxCombo = 0;
  private totalNotes = 0;
  private hitNotes = 0;
  private perfectNotes = 0;
  private columnTapAlpha: number[] = [0, 0, 0];
  private hitFlash: { result: string; col: number; timer: number } | null = null;
  private targetZoneY = 0;
  private targetZoneH = 0;
  private columnX: number[] = [];
  private columnW = 0;
  private noteTimer = 0;
  private patternIndex = 0;
  private patternStep = 0;
  private encourageText = '';
  private encourageTimer = 0;
  private noteSize = 0;

  enter(game: GameEngine) {
    const w = game.width;
    const h = game.height;
    const scale = game.getScale();

    // Generous target zone — big and visible
    this.targetZoneH = 90 * scale;
    this.targetZoneY = h * 0.74;
    this.columnW = w * 0.30;
    this.columnX = [w * 0.17, w * 0.5, w * 0.83];
    this.noteSize = Math.max(16, 18 * scale);

    this.notes = [];
    this.spawnTimer = 0;
    // Slow, gentle note speed
    this.noteSpeed = 130 * scale;
    this.noteInterval = 1.8;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalNotes = 0;
    this.hitNotes = 0;
    this.perfectNotes = 0;
    this.columnTapAlpha = [0, 0, 0];
    this.hitFlash = null;
    this.noteTimer = 0;
    this.patternIndex = Math.floor(Math.random() * NOTE_PATTERNS.length);
    this.patternStep = 0;
    this.encourageText = '';
    this.encourageTimer = 0;

    game.state.gems = 0;
    game.state.score = 0;
    game.state.health = 8;
    game.state.maxHealth = 8;
    game.state.noHitBonus = true;
    game.state.levelTime = 0;
    game.state.actComplete = false;

    startBgMusic('finale');
  }

  exit(_game: GameEngine) {
    stopBgMusic();
  }

  update(game: GameEngine, dt: number) {
    if (game.state.actComplete) return;

    const scale = game.getScale();
    game.state.levelTime += dt;
    this.spawnTimer += dt;
    this.noteTimer += dt;

    // Fade column tap effects
    for (let i = 0; i < 3; i++) {
      if (this.columnTapAlpha[i] > 0) this.columnTapAlpha[i] -= dt * 3;
    }
    if (this.hitFlash) {
      this.hitFlash.timer -= dt;
      if (this.hitFlash.timer <= 0) this.hitFlash = null;
    }
    if (this.encourageTimer > 0) this.encourageTimer -= dt;

    // Very gentle speed ramp — barely noticeable
    this.noteSpeed = (130 + Math.min(game.state.levelTime * 0.5, 30)) * scale;
    // Interval ramps slowly: 1.8s → 1.2s over 45 seconds
    this.noteInterval = Math.max(1.2, 1.8 - game.state.levelTime * 0.013);

    // Spawn notes from musical patterns (never double notes)
    if (this.spawnTimer >= this.noteInterval) {
      this.spawnTimer = 0;

      const pattern = NOTE_PATTERNS[this.patternIndex];
      const col = pattern[this.patternStep];
      this.patternStep++;
      if (this.patternStep >= pattern.length) {
        this.patternStep = 0;
        this.patternIndex = (this.patternIndex + 1) % NOTE_PATTERNS.length;
      }

      this.notes.push({
        column: col,
        y: -30,
        speed: this.noteSpeed,
        state: 'falling',
        hitAlpha: 0,
        active: true,
      });
      this.totalNotes++;
    }

    // Move notes
    for (const note of this.notes) {
      if (note.state === 'falling') {
        note.y += note.speed * dt;
      }
      if (note.hitAlpha > 0) note.hitAlpha -= dt * 2;
    }

    // Miss detection — very generous, notes travel well past before counting
    const targetCenter = this.targetZoneY + this.targetZoneH / 2;
    const missLine = targetCenter + this.targetZoneH * 0.8;
    for (const note of this.notes) {
      if (note.state === 'falling' && note.y > missLine) {
        note.state = 'missed';
        note.active = false;
        game.state.health--;
        game.state.noHitBonus = false;
        this.combo = 0;
        game.playSound('hit');
        game.shakeCamera(2, 0.1);
        if (game.state.health <= 0) {
          // Don't restart — just end and let them try again
          game.state.actComplete = true;
          this.failAct(game);
          return;
        }
      }
    }

    // Tap detection — generous hit windows
    if (game.input.tap) {
      const tapX = game.input.tapX;
      let tappedCol = -1;

      // Very forgiving column detection — covers full screen width
      if (tapX < game.width * 0.33) {
        tappedCol = 0;
      } else if (tapX < game.width * 0.66) {
        tappedCol = 1;
      } else {
        tappedCol = 2;
      }

      if (tappedCol >= 0) {
        this.columnTapAlpha[tappedCol] = 1;

        // Find closest falling note in this column within generous hit window
        let best: RhythmNote | null = null;
        let bestDist = Infinity;
        const hitWindow = this.targetZoneH * 0.9;

        for (const note of this.notes) {
          if (note.state !== 'falling' || note.column !== tappedCol) continue;
          const delta = Math.abs(note.y - targetCenter);
          if (delta < hitWindow && delta < bestDist) {
            best = note;
            bestDist = delta;
          }
        }

        if (best) {
          const delta = Math.abs(best.y - targetCenter);
          const perfectWindow = this.targetZoneH * 0.4;

          if (delta < perfectWindow) {
            // Perfect hit!
            best.state = 'hit_perfect';
            best.hitAlpha = 1;
            this.hitNotes++;
            this.perfectNotes++;
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            const bonus = Math.floor(300 * (1 + this.combo * 0.1));
            game.state.score += bonus;
            game.state.gems++;
            game.playSound('rhythmPerfect');
            game.spawnParticles(particlePresets.gemCollect(this.columnX[tappedCol], this.targetZoneY, true));

            const perfects = ['PERFECT!', 'AMAZING!', 'WOW!', 'SUPERSTAR!'];
            this.hitFlash = {
              result: perfects[Math.floor(Math.random() * perfects.length)],
              col: tappedCol,
              timer: 0.6,
            };

            // Encouragement at milestones
            if (this.combo === 5) this.showEncouragement('You got this!');
            else if (this.combo === 10) this.showEncouragement('On fire!');
            else if (this.combo === 15) this.showEncouragement('Unstoppable!');
          } else {
            // Good hit
            best.state = 'hit_good';
            best.hitAlpha = 1;
            this.hitNotes++;
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);
            const bonus = Math.floor(150 * (1 + this.combo * 0.1));
            game.state.score += bonus;
            game.playSound('rhythmGood');

            const goods = ['NICE!', 'GREAT!', 'GOOD!'];
            this.hitFlash = {
              result: goods[Math.floor(Math.random() * goods.length)],
              col: tappedCol,
              timer: 0.5,
            };
          }
        }
        // No penalty for tapping wrong column — just no reward
      }
    }

    // Clean up old notes
    this.notes = this.notes.filter(n => n.active && n.hitAlpha > -1 && n.y < game.height + 50);

    // Ambient sparkles
    if (this.noteTimer > 2.5) {
      this.noteTimer = 0;
      game.spawnParticles(particlePresets.musicalNote(Math.random() * game.width, game.height * 0.1));
    }

    // Win condition — survive 45 seconds
    if (game.state.levelTime >= 45 && !game.state.actComplete) {
      game.state.actComplete = true;
      this.completeAct(game);
    }
  }

  private showEncouragement(text: string) {
    this.encourageText = text;
    this.encourageTimer = 1.5;
  }

  private completeAct(game: GameEngine) {
    const accuracy = this.totalNotes > 0 ? this.hitNotes / this.totalNotes : 0;
    let stars = 1;
    if (accuracy >= 0.65) stars++;
    if (accuracy >= 0.80) stars++;
    game.state.stars.act9 = Math.max(game.state.stars.act9 || 0, stars);

    if (!game.state.lastCompletedAct || actIndex(game.state.lastCompletedAct) < actIndex('act9')) {
      game.state.lastCompletedAct = 'act9';
    }
    game.saveGame();
    game.playSound('actComplete');
    game.playSound('victoryFanfare');

    for (let i = 0; i < 12; i++) {
      setTimeout(() => {
        game.spawnParticles(particlePresets.confetti(Math.random() * game.width, game.height * 0.3));
      }, i * 150);
    }

    game.state.currentAct = 'act10';
    game.state.storyCardIndex = 0;
    setTimeout(() => {
      game.transitionTo('storyCard');
    }, 3500);
  }

  private failAct(game: GameEngine) {
    game.playSound('hit');
    setTimeout(() => {
      game.transitionTo('levelSelect');
    }, 2000);
  }

  render(game: GameEngine, ctx: CanvasRenderingContext2D) {
    const w = game.width;
    const h = game.height;
    const scale = game.getScale();
    const t = game.time;
    const isElphaba = game.state.character === 'elphaba';

    // Background — grand concert hall
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#180035');
    bgGrad.addColorStop(0.4, '#100025');
    bgGrad.addColorStop(1, '#08001a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Spotlight cones from top — brighter and more dramatic
    for (let i = 0; i < 3; i++) {
      const spotGrad = ctx.createRadialGradient(
        this.columnX[i], 0, 0,
        this.columnX[i], h * 0.6, w * 0.25
      );
      const colors = [
        'rgba(0, 200, 100, 0.06)',
        'rgba(255, 215, 0, 0.06)',
        'rgba(200, 80, 200, 0.06)',
      ];
      spotGrad.addColorStop(0, colors[i]);
      spotGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = spotGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // Column zones with clearer coloring
    const colColors = [COLORS.emeraldGlow, COLORS.gold, COLORS.pinkGlow];
    const colLabels = ['\u266B', '\u2605', '\u266A']; // musical note, star, note
    for (let i = 0; i < 3; i++) {
      // Column background
      ctx.fillStyle = `rgba(${i === 0 ? '0,100,50' : i === 1 ? '100,80,0' : '100,0,80'}, 0.06)`;
      ctx.fillRect(this.columnX[i] - this.columnW / 2, 0, this.columnW, h);

      // Column divider lines (subtle)
      ctx.strokeStyle = colColors[i];
      ctx.globalAlpha = 0.15;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.columnX[i] - this.columnW / 2, 0);
      ctx.lineTo(this.columnX[i] - this.columnW / 2, h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(this.columnX[i] + this.columnW / 2, 0);
      ctx.lineTo(this.columnX[i] + this.columnW / 2, h);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Column label at top
      ctx.globalAlpha = 0.3;
      drawText(ctx, colLabels[i], this.columnX[i], 40 * scale, 14 * scale, colColors[i]);
      ctx.globalAlpha = 1;

      // Tap flash — whole column lights up
      if (this.columnTapAlpha[i] > 0) {
        ctx.fillStyle = colColors[i];
        ctx.globalAlpha = this.columnTapAlpha[i] * 0.12;
        ctx.fillRect(this.columnX[i] - this.columnW / 2, 0, this.columnW, h);
        ctx.globalAlpha = 1;
      }
    }

    // Target zone — big, bright glowing band
    const zoneGlow = Math.sin(t * 2.5) * 0.08 + 0.25;
    // Outer glow
    const glowGrad = ctx.createLinearGradient(0, this.targetZoneY - 20, 0, this.targetZoneY + this.targetZoneH + 20);
    glowGrad.addColorStop(0, 'transparent');
    glowGrad.addColorStop(0.15, `rgba(255, 215, 0, ${zoneGlow * 0.3})`);
    glowGrad.addColorStop(0.5, `rgba(255, 215, 0, ${zoneGlow})`);
    glowGrad.addColorStop(0.85, `rgba(255, 215, 0, ${zoneGlow * 0.3})`);
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, this.targetZoneY - 20, w, this.targetZoneH + 40);

    // Target zone core
    ctx.fillStyle = `rgba(255, 215, 0, ${zoneGlow * 0.5})`;
    ctx.fillRect(0, this.targetZoneY, w, this.targetZoneH);

    // Target zone border lines
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, this.targetZoneY);
    ctx.lineTo(w, this.targetZoneY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, this.targetZoneY + this.targetZoneH);
    ctx.lineTo(w, this.targetZoneY + this.targetZoneH);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Center line in target zone (the "sweet spot")
    ctx.strokeStyle = COLORS.gold;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(0, this.targetZoneY + this.targetZoneH / 2);
    ctx.lineTo(w, this.targetZoneY + this.targetZoneH / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Falling notes — big, colorful, and clear
    const ns = this.noteSize;
    for (const note of this.notes) {
      if (note.state === 'missed') continue;
      const nx = this.columnX[note.column];
      const ny = note.y;
      const col = colColors[note.column];

      if (note.state === 'falling') {
        // Soft trail behind note
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = col;
        ctx.fillRect(nx - ns * 0.3, ny - ns * 2, ns * 0.6, ns * 2);
        ctx.globalAlpha = 1;

        // Note shape — big rounded diamond with glow
        // Outer glow
        ctx.shadowColor = col;
        ctx.shadowBlur = 12;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(nx, ny - ns);
        ctx.lineTo(nx + ns * 0.8, ny);
        ctx.lineTo(nx, ny + ns);
        ctx.lineTo(nx - ns * 0.8, ny);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // Inner bright core
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.moveTo(nx, ny - ns * 0.5);
        ctx.lineTo(nx + ns * 0.4, ny);
        ctx.lineTo(nx, ny + ns * 0.5);
        ctx.lineTo(nx - ns * 0.4, ny);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // Music note symbol in center
        ctx.fillStyle = '#000';
        ctx.globalAlpha = 0.7;
        ctx.font = `bold ${ns * 0.7}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u266A', nx, ny + 1);
        ctx.globalAlpha = 1;
      } else if (note.hitAlpha > 0) {
        // Hit explosion — bigger and more celebratory
        const isPerfect = note.state === 'hit_perfect';
        const explodeR = (1 - note.hitAlpha) * 45 + 15;
        ctx.globalAlpha = note.hitAlpha;

        // Outer ring
        ctx.strokeStyle = isPerfect ? COLORS.gold : COLORS.emeraldGlow;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(nx, this.targetZoneY + this.targetZoneH / 2, explodeR, 0, Math.PI * 2);
        ctx.stroke();

        // Inner fill
        ctx.fillStyle = isPerfect ? COLORS.gold : COLORS.emeraldGlow;
        ctx.globalAlpha = note.hitAlpha * 0.4;
        ctx.beginPath();
        ctx.arc(nx, this.targetZoneY + this.targetZoneH / 2, explodeR * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Hit result flash — big text
    if (this.hitFlash) {
      const fx = this.columnX[this.hitFlash.col];
      const fy = this.targetZoneY - 25 * scale;
      const isPerfect = this.hitFlash.result.includes('PERFECT') ||
        this.hitFlash.result.includes('AMAZING') ||
        this.hitFlash.result.includes('WOW') ||
        this.hitFlash.result.includes('SUPERSTAR');
      const flashScale = 1 + (1 - Math.min(1, this.hitFlash.timer * 3)) * 0.2;
      ctx.globalAlpha = Math.min(1, this.hitFlash.timer * 3);
      drawText(ctx, this.hitFlash.result, fx, fy,
        (isPerfect ? 18 : 15) * scale * flashScale,
        isPerfect ? COLORS.gold : COLORS.emeraldGlow);
      ctx.globalAlpha = 1;
    }

    // Encouragement text (center screen)
    if (this.encourageTimer > 0) {
      const eAlpha = Math.min(1, this.encourageTimer);
      ctx.globalAlpha = eAlpha;
      const eScale = 1 + (1 - eAlpha) * 0.3;
      drawText(ctx, this.encourageText, w / 2, h * 0.35,
        22 * scale * eScale, COLORS.pinkGlow);
      ctx.globalAlpha = 1;
    }

    // Characters at bottom — performing together
    const charY = h * 0.92;
    const charScale = scale * 0.85;
    // Characters bob slightly to the rhythm
    const bob = Math.sin(t * 3) * 2;
    drawElphaba(ctx, w * 0.25, charY + bob, charScale, t, {
      sparkly: game.state.unlockedCostumes.includes('elphaba_sparkly'),
    });
    drawGlinda(ctx, w * 0.75, charY - bob, charScale, t, {
      goldenWings: game.state.unlockedCostumes.includes('glinda_wings'),
      wand: true,
    });

    // Stage floor
    ctx.fillStyle = 'rgba(255, 215, 0, 0.05)';
    ctx.fillRect(0, h * 0.88, w, h * 0.12);
    ctx.strokeStyle = COLORS.gold;
    ctx.globalAlpha = 0.2;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.88);
    ctx.lineTo(w, h * 0.88);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Combo display — fun and bouncy
    if (this.combo > 1) {
      const comboScale = Math.min(1.4, 1 + (this.combo - 1) * 0.03);
      const comboPulse = Math.sin(t * 4) * 0.08 + 0.92;
      drawText(ctx, `COMBO x${this.combo}`, w / 2, h * 0.12,
        (20 * comboScale * comboPulse) * scale, COLORS.gold);
    }

    // Accuracy display
    const accuracy = this.totalNotes > 0 ? Math.floor((this.hitNotes / this.totalNotes) * 100) : 100;
    drawText(ctx, `${accuracy}%`, w - 30 * scale, h * 0.06, 10 * scale, '#aaa');

    // HUD
    drawHealth(ctx, 10, 10, game.state.health, game.state.maxHealth, isElphaba);
    drawText(ctx, `Score: ${game.state.score}`, w / 2, 20, 12 * scale, COLORS.gold);
    const timeLeft = Math.max(0, 45 - Math.floor(game.state.levelTime));
    drawText(ctx, `${timeLeft}s`, w - 30 * scale, 20, 11 * scale, '#aaa');

    // Controls hint — show longer for clarity
    if (game.state.levelTime < 8 && !game.state.actComplete) {
      const alpha = Math.max(0, 1 - game.state.levelTime / 8);
      ctx.globalAlpha = alpha;
      drawText(ctx, 'Tap when notes reach the gold line!', w / 2, h * 0.22, 14 * scale, '#fff');

      // Arrow indicators pointing at target zone
      const arrowY = this.targetZoneY - 15 * scale;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = colColors[i];
        ctx.globalAlpha = alpha * (0.5 + Math.sin(t * 4 + i) * 0.3);
        ctx.beginPath();
        ctx.moveTo(this.columnX[i] - 8 * scale, arrowY - 10 * scale);
        ctx.lineTo(this.columnX[i] + 8 * scale, arrowY - 10 * scale);
        ctx.lineTo(this.columnX[i], arrowY);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Act complete overlay
    if (game.state.actComplete && game.state.health > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.fillRect(0, 0, w, h);

      // Decorative stars in background
      for (let i = 0; i < 20; i++) {
        const sx = (w * 0.1) + (i * w * 0.04) % (w * 0.8);
        const sy = h * 0.15 + ((i * 37) % 7) * h * 0.08;
        ctx.fillStyle = COLORS.gold;
        ctx.globalAlpha = 0.15 + Math.sin(t * 2 + i) * 0.1;
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      drawText(ctx, 'Grand Finale Complete!', w / 2, h * 0.22, 24 * scale, COLORS.gold);
      drawText(ctx, 'You were amazing, Havi!', w / 2, h * 0.30, 14 * scale, COLORS.pinkGlow);

      drawText(ctx, `Accuracy: ${accuracy}%`, w / 2, h * 0.40, 18 * scale,
        accuracy >= 80 ? COLORS.gold : accuracy >= 65 ? COLORS.emeraldGlow : '#ddd');
      drawText(ctx, `Max Combo: ${this.maxCombo}`, w / 2, h * 0.47, 15 * scale, COLORS.pinkGlow);
      drawText(ctx, `Perfect Hits: ${this.perfectNotes}`, w / 2, h * 0.53, 13 * scale, '#ccc');
      drawText(ctx, `Score: ${game.state.score}`, w / 2, h * 0.60, 20 * scale, '#fff');

      const stars = game.state.stars.act9;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < stars ? COLORS.gold : 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        for (let si = 0; si < 10; si++) {
          const r = si % 2 === 0 ? 15 * scale : 7 * scale;
          const angle = (si * Math.PI) / 5 - Math.PI / 2;
          const sx = w / 2 - 40 * scale + i * 40 * scale + Math.cos(angle) * r;
          const sy = h * 0.70 + Math.sin(angle) * r;
          if (si === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    // Fail overlay
    if (game.state.actComplete && game.state.health <= 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, w, h);
      drawText(ctx, 'Keep Practicing!', w / 2, h * 0.35, 22 * scale, COLORS.pinkGlow);
      drawText(ctx, 'You can do it, Havi!', w / 2, h * 0.45, 16 * scale, '#ddd');
      drawText(ctx, `Score: ${game.state.score}`, w / 2, h * 0.55, 18 * scale, COLORS.gold);
    }
  }
}
