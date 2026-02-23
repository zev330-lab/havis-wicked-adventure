// Act 9 — 'Finale (For Good Reprise)' — Rhythm Tap
// Musical notes fall in 3 columns. Tap the correct column when notes reach the target zone.
import { Scene, GameEngine } from '../engine/types';
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

export class Act9Scene implements Scene {
  private notes: RhythmNote[] = [];
  private spawnTimer = 0;
  private noteSpeed = 250;
  private noteInterval = 1.0;
  private combo = 0;
  private maxCombo = 0;
  private totalNotes = 0;
  private hitNotes = 0;
  private perfectNotes = 0;
  private columnTapAlpha: number[] = [0, 0, 0];
  private hitFlash: { result: string; col: number; timer: number } | null = null;
  private targetZoneY = 0;
  private targetZoneH = 60;
  private columnX: number[] = [];
  private columnW = 0;
  private noteTimer = 0;

  enter(game: GameEngine) {
    const w = game.width;
    const h = game.height;
    this.targetZoneY = h * 0.78;
    this.targetZoneH = 60;
    this.columnW = w * 0.28;
    this.columnX = [w * 0.18, w * 0.5, w * 0.82];
    this.notes = [];
    this.spawnTimer = 0;
    this.noteSpeed = 250;
    this.noteInterval = 1.0;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalNotes = 0;
    this.hitNotes = 0;
    this.perfectNotes = 0;
    this.columnTapAlpha = [0, 0, 0];
    this.hitFlash = null;
    this.noteTimer = 0;

    game.state.gems = 0;
    game.state.score = 0;
    game.state.health = 5;
    game.state.maxHealth = 5;
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

    game.state.levelTime += dt;
    this.spawnTimer += dt;
    this.noteTimer += dt;

    // Update column tap effects
    for (let i = 0; i < 3; i++) {
      if (this.columnTapAlpha[i] > 0) this.columnTapAlpha[i] -= dt * 4;
    }
    if (this.hitFlash) {
      this.hitFlash.timer -= dt;
      if (this.hitFlash.timer <= 0) this.hitFlash = null;
    }

    // Spawn notes
    this.noteInterval = Math.max(0.6, 1.0 - game.state.levelTime * 0.006);
    if (this.spawnTimer >= this.noteInterval) {
      this.spawnTimer = 0;
      const col = Math.floor(Math.random() * 3) as 0 | 1 | 2;
      this.notes.push({
        column: col,
        y: -30,
        speed: this.noteSpeed,
        state: 'falling',
        hitAlpha: 0,
        active: true,
      });
      this.totalNotes++;

      // Sometimes spawn a second note in another column for challenge
      if (game.state.levelTime > 20 && Math.random() < 0.2) {
        let col2 = (col + 1 + Math.floor(Math.random() * 2)) % 3 as 0 | 1 | 2;
        this.notes.push({
          column: col2,
          y: -30,
          speed: this.noteSpeed,
          state: 'falling',
          hitAlpha: 0,
          active: true,
        });
        this.totalNotes++;
      }
    }

    // Move notes
    for (const note of this.notes) {
      if (note.state === 'falling') {
        note.y += note.speed * dt;
      }
      if (note.hitAlpha > 0) note.hitAlpha -= dt * 3;
    }

    // Miss detection — note passed target zone
    const missLine = this.targetZoneY + this.targetZoneH / 2 + 40;
    for (const note of this.notes) {
      if (note.state === 'falling' && note.y > missLine) {
        note.state = 'missed';
        note.active = false;
        game.state.health--;
        game.state.noHitBonus = false;
        this.combo = 0;
        game.playSound('hit');
        game.shakeCamera(3, 0.15);
        if (game.state.health <= 0) {
          this.enter(game);
          return;
        }
      }
    }

    // Tap detection
    if (game.input.tap) {
      const tapX = game.input.tapX;
      let tappedCol = -1;
      for (let i = 0; i < 3; i++) {
        if (Math.abs(tapX - this.columnX[i]) < this.columnW / 2) {
          tappedCol = i;
          break;
        }
      }

      if (tappedCol >= 0) {
        this.columnTapAlpha[tappedCol] = 1;
        const targetCenter = this.targetZoneY + this.targetZoneH / 2;

        // Find frontmost falling note in this column within hit window
        let best: RhythmNote | null = null;
        let bestDist = Infinity;
        for (const note of this.notes) {
          if (note.state !== 'falling' || note.column !== tappedCol) continue;
          const delta = Math.abs(note.y - targetCenter);
          if (delta < 60 && delta < bestDist) {
            best = note;
            bestDist = delta;
          }
        }

        if (best) {
          const delta = Math.abs(best.y - targetCenter);
          if (delta < 22) {
            // Perfect hit
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
            this.hitFlash = { result: 'PERFECT', col: tappedCol, timer: 0.5 };
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
            this.hitFlash = { result: 'GOOD', col: tappedCol, timer: 0.4 };
          }
        }
      }
    }

    // Clean up
    this.notes = this.notes.filter(n => n.active && n.hitAlpha > -1 && n.y < game.height + 50);

    // Musical sparkles
    if (this.noteTimer > 2) {
      this.noteTimer = 0;
      game.spawnParticles(particlePresets.musicalNote(Math.random() * game.width, game.height * 0.1));
    }

    // Win condition — survive 60 seconds
    if (game.state.levelTime >= 60) {
      game.state.actComplete = true;
      this.completeAct(game);
    }
  }

  private completeAct(game: GameEngine) {
    const accuracy = this.totalNotes > 0 ? this.hitNotes / this.totalNotes : 0;
    let stars = 1;
    if (accuracy >= 0.80) stars++;
    if (accuracy >= 0.95) stars++;
    game.state.stars.act9 = Math.max(game.state.stars.act9 || 0, stars);

    if (!game.state.lastCompletedAct || game.state.lastCompletedAct < 'act9') {
      game.state.lastCompletedAct = 'act9';
    }
    game.saveGame();
    game.playSound('actComplete');
    game.playSound('victoryFanfare');

    for (let i = 0; i < 10; i++) {
      setTimeout(() => {
        game.spawnParticles(particlePresets.confetti(Math.random() * game.width, game.height * 0.3));
      }, i * 150);
    }

    setTimeout(() => {
      game.transitionTo('victory');
    }, 3000);
  }

  render(game: GameEngine, ctx: CanvasRenderingContext2D) {
    const w = game.width;
    const h = game.height;
    const scale = game.getScale();
    const t = game.time;
    const isElphaba = game.state.character === 'elphaba';

    // Background — concert hall
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#150030');
    bgGrad.addColorStop(0.5, '#0d0020');
    bgGrad.addColorStop(1, '#08001a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Spotlight cones from top
    for (let i = 0; i < 3; i++) {
      const spotGrad = ctx.createRadialGradient(
        this.columnX[i], 0, 0,
        this.columnX[i], h * 0.5, w * 0.25
      );
      const colors = [
        'rgba(0, 200, 100, 0.04)',
        'rgba(255, 215, 0, 0.04)',
        'rgba(200, 80, 200, 0.04)',
      ];
      spotGrad.addColorStop(0, colors[i]);
      spotGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = spotGrad;
      ctx.fillRect(0, 0, w, h);
    }

    // Column zones
    const colColors = [COLORS.emeraldGlow, COLORS.gold, COLORS.pinkGlow];
    for (let i = 0; i < 3; i++) {
      // Column background
      ctx.fillStyle = `rgba(${i === 0 ? '0,100,50' : i === 1 ? '100,80,0' : '100,0,80'}, 0.08)`;
      ctx.fillRect(this.columnX[i] - this.columnW / 2, 0, this.columnW, h);

      // Column border
      ctx.strokeStyle = colColors[i];
      ctx.globalAlpha = 0.2;
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

      // Tap flash
      if (this.columnTapAlpha[i] > 0) {
        ctx.fillStyle = colColors[i];
        ctx.globalAlpha = this.columnTapAlpha[i] * 0.15;
        ctx.fillRect(this.columnX[i] - this.columnW / 2, 0, this.columnW, h);
        ctx.globalAlpha = 1;
      }
    }

    // Target zone — glowing band
    const zoneGlow = Math.sin(t * 3) * 0.1 + 0.3;
    ctx.fillStyle = `rgba(255, 215, 0, ${zoneGlow})`;
    ctx.fillRect(0, this.targetZoneY, w, this.targetZoneH);
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, this.targetZoneY);
    ctx.lineTo(w, this.targetZoneY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, this.targetZoneY + this.targetZoneH);
    ctx.lineTo(w, this.targetZoneY + this.targetZoneH);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Falling notes
    for (const note of this.notes) {
      if (note.state === 'missed') continue;
      const nx = this.columnX[note.column];
      const ny = note.y;
      const col = colColors[note.column];

      if (note.state === 'falling') {
        // Note shape — diamond
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(nx, ny - 12);
        ctx.lineTo(nx + 10, ny);
        ctx.lineTo(nx, ny + 12);
        ctx.lineTo(nx - 10, ny);
        ctx.closePath();
        ctx.fill();

        // Inner glow
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(nx, ny, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Music note symbol
        ctx.fillStyle = '#000';
        ctx.font = `${10 * scale}px serif`;
        ctx.textAlign = 'center';
        ctx.fillText('\u266A', nx, ny + 4);
      } else if (note.hitAlpha > 0) {
        // Hit explosion
        const isPerfect = note.state === 'hit_perfect';
        ctx.globalAlpha = note.hitAlpha;
        ctx.fillStyle = isPerfect ? COLORS.gold : COLORS.emeraldGlow;
        ctx.beginPath();
        ctx.arc(nx, this.targetZoneY + this.targetZoneH / 2, (1 - note.hitAlpha) * 30 + 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Hit result flash
    if (this.hitFlash) {
      const fx = this.columnX[this.hitFlash.col];
      const fy = this.targetZoneY - 20;
      const isPerfect = this.hitFlash.result === 'PERFECT';
      ctx.globalAlpha = Math.min(1, this.hitFlash.timer * 3);
      drawText(ctx, this.hitFlash.result, fx, fy, (isPerfect ? 16 : 14) * scale,
        isPerfect ? COLORS.gold : COLORS.emeraldGlow);
      ctx.globalAlpha = 1;
    }

    // Characters at bottom
    const charY = h * 0.92;
    const charScale = scale * 0.9;
    drawElphaba(ctx, w * 0.22, charY, charScale, t, {
      sparkly: game.state.unlockedCostumes.includes('elphaba_sparkly'),
    });
    drawGlinda(ctx, w * 0.78, charY, charScale, t, {
      goldenWings: game.state.unlockedCostumes.includes('glinda_wings'),
      wand: true,
    });

    // Combo display
    if (this.combo > 1) {
      const comboScale = Math.min(1.3, 1 + (this.combo - 1) * 0.02);
      const comboPulse = Math.sin(t * 5) * 0.1 + 0.9;
      drawText(ctx, `COMBO x${this.combo}`, w / 2, h * 0.12,
        (18 * comboScale * comboPulse) * scale, COLORS.gold);
    }

    // Accuracy
    const accuracy = this.totalNotes > 0 ? Math.floor((this.hitNotes / this.totalNotes) * 100) : 100;
    drawText(ctx, `${accuracy}%`, w - 25 * scale, h * 0.12, 10 * scale, '#aaa');

    // HUD
    drawHealth(ctx, 10, 10, game.state.health, game.state.maxHealth, isElphaba);
    drawText(ctx, `Score: ${game.state.score}`, w / 2, 20, 12 * scale, COLORS.gold);
    const timeLeft = Math.max(0, 60 - Math.floor(game.state.levelTime));
    drawText(ctx, `${timeLeft}s`, w - 30 * scale, 20, 11 * scale, '#aaa');

    // Controls hint
    if (game.state.levelTime < 5 && !game.state.actComplete) {
      const alpha = Math.max(0, 1 - game.state.levelTime / 5);
      ctx.globalAlpha = alpha;
      drawText(ctx, 'Tap columns as notes reach the line!', w / 2, h * 0.25, 14 * scale, '#fff');
      ctx.globalAlpha = 1;
    }

    // Act complete overlay
    if (game.state.actComplete) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, w, h);
      drawText(ctx, 'Grand Finale Complete!', w / 2, h * 0.25, 26 * scale, COLORS.gold);
      drawText(ctx, `Accuracy: ${accuracy}%`, w / 2, h * 0.35, 18 * scale,
        accuracy >= 95 ? COLORS.gold : accuracy >= 80 ? COLORS.emeraldGlow : '#ddd');
      drawText(ctx, `Max Combo: ${this.maxCombo}`, w / 2, h * 0.42, 16 * scale, COLORS.pinkGlow);
      drawText(ctx, `Perfect Notes: ${this.perfectNotes}`, w / 2, h * 0.49, 14 * scale, '#ccc');
      drawText(ctx, `Score: ${game.state.score}`, w / 2, h * 0.56, 20 * scale, '#fff');

      const stars = game.state.stars.act9;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < stars ? COLORS.gold : 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        for (let si = 0; si < 10; si++) {
          const r = si % 2 === 0 ? 15 * scale : 7 * scale;
          const angle = (si * Math.PI) / 5 - Math.PI / 2;
          const sx = w / 2 - 40 * scale + i * 40 * scale + Math.cos(angle) * r;
          const sy = h * 0.66 + Math.sin(angle) * r;
          if (si === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}
