// Act 3 — 'For Good' — Boss/Finale
// Face the Wizard's magic machine, dodge projectiles, reflect them back
import { Scene, GameEngine } from '../engine/types';
import {
  drawSky, drawElphaba, drawGlinda, drawHUD, drawText, COLORS,
} from '../engine/renderer';
import { particlePresets } from '../engine/particles';
import { startBgMusic, stopBgMusic } from '../engine/audio';

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  reflected: boolean;
  active: boolean;
  size: number;
}

interface BossPart {
  x: number;
  y: number;
  w: number;
  h: number;
  health: number;
  type: string;
  destroyed: boolean;
  shakeTimer: number;
}

export class Act3Scene implements Scene {
  private playerX = 0;
  private playerY = 0;
  private bossX = 0;
  private bossY = 0;
  private projectiles: Projectile[] = [];
  private bossParts: BossPart[] = [];
  private shootTimer = 0;
  private phase = 1;
  private invincibleTimer = 0;
  private trailTimer = 0;
  private noteTimer = 0;
  private bossDefeated = false;
  private victoryTimer = 0;
  private cutscenePhase = 0;

  enter(game: GameEngine) {
    this.playerX = game.width * 0.3;
    this.playerY = game.height * 0.7;
    this.bossX = game.width * 0.75;
    this.bossY = game.height * 0.35;
    this.projectiles = [];
    this.shootTimer = 0;
    this.phase = 1;
    this.invincibleTimer = 0;
    this.trailTimer = 0;
    this.noteTimer = 0;
    this.bossDefeated = false;
    this.victoryTimer = 0;
    this.cutscenePhase = 0;

    game.state.gems = 0;
    game.state.health = 3;
    game.state.noHitBonus = true;
    game.state.levelTime = 0;
    game.state.actComplete = false;
    game.state.bossHealth = game.state.bossMaxHealth;

    this.buildBoss(game);
    startBgMusic('boss');
  }

  exit(_game: GameEngine) {
    stopBgMusic();
  }

  private buildBoss(game: GameEngine) {
    const bx = this.bossX;
    const by = this.bossY;
    const s = game.getScale();

    this.bossParts = [
      // Main body
      { x: bx - 40 * s, y: by - 30 * s, w: 80 * s, h: 100 * s, health: 3, type: 'body', destroyed: false, shakeTimer: 0 },
      // Top dome
      { x: bx - 25 * s, y: by - 60 * s, w: 50 * s, h: 35 * s, health: 2, type: 'dome', destroyed: false, shakeTimer: 0 },
      // Left arm
      { x: bx - 70 * s, y: by - 10 * s, w: 35 * s, h: 20 * s, health: 2, type: 'arm_l', destroyed: false, shakeTimer: 0 },
      // Right arm
      { x: bx + 35 * s, y: by - 10 * s, w: 35 * s, h: 20 * s, health: 2, type: 'arm_r', destroyed: false, shakeTimer: 0 },
      // Antenna
      { x: bx - 5 * s, y: by - 80 * s, w: 10 * s, h: 25 * s, health: 1, type: 'antenna', destroyed: false, shakeTimer: 0 },
    ];
  }

  update(game: GameEngine, dt: number) {
    if (game.state.actComplete && !this.bossDefeated) return;

    game.state.levelTime += dt;
    this.trailTimer += dt;
    this.noteTimer += dt;
    if (this.invincibleTimer > 0) this.invincibleTimer -= dt;

    const w = game.width;
    const h = game.height;
    const isElphaba = game.state.character === 'elphaba';

    // Victory cutscene
    if (this.bossDefeated) {
      this.victoryTimer += dt;
      if (this.victoryTimer > 6) {
        game.state.actComplete = true;
        this.completeAct(game);
      }

      // Confetti
      if (Math.random() < 0.3) {
        game.spawnParticles(particlePresets.confetti(Math.random() * w, h * 0.1));
      }

      return;
    }

    // Player movement — finger-follow
    const moveSpeed = 220;
    if (game.input.isTouching) {
      this.playerX += (game.input.touchX - this.playerX) * Math.min(1, dt * 12);
      this.playerY += (game.input.touchY - this.playerY) * Math.min(1, dt * 12);
    }
    if (game.input.left) this.playerX -= moveSpeed * dt;
    if (game.input.right) this.playerX += moveSpeed * dt;
    if (game.input.up) this.playerY -= moveSpeed * dt;
    if (game.input.down) this.playerY += moveSpeed * dt;

    // Tilt
    if (Math.abs(game.input.tiltX) > 0.1) {
      this.playerX += game.input.tiltX * moveSpeed * dt;
    }

    this.playerX = Math.max(25, Math.min(w * 0.55, this.playerX));
    this.playerY = Math.max(60, Math.min(h - 50, this.playerY));

    // Magic blast to reflect projectiles
    if (game.input.tap || game.input.actionPressed) {
      game.playSound('magicBlast');
      const preset = isElphaba
        ? particlePresets.greenMagic(this.playerX, this.playerY)
        : particlePresets.pinkMagic(this.playerX, this.playerY);
      game.spawnParticles(preset);

      // Check for nearby projectiles to reflect
      for (const proj of this.projectiles) {
        if (!proj.active || proj.reflected) continue;
        const dx = proj.x - this.playerX;
        const dy = proj.y - this.playerY;
        if (Math.sqrt(dx * dx + dy * dy) < 60) {
          proj.reflected = true;
          proj.vx = -proj.vx * 1.5;
          proj.vy = (this.bossY - proj.y) * 0.5;
          game.playSound('sparkle');
        }
      }
    }

    // Trail
    if (this.trailTimer > 0.06) {
      this.trailTimer = 0;
      game.spawnParticles(particlePresets.trail(this.playerX, this.playerY + 15, isElphaba));
    }

    // Musical notes
    if (this.noteTimer > 4) {
      this.noteTimer = 0;
      game.spawnParticles(particlePresets.musicalNote(Math.random() * w, h * 0.2));
    }

    // Boss shooting
    const shootInterval = this.phase === 1 ? 1.2 : this.phase === 2 ? 0.8 : 0.5;
    this.shootTimer += dt;
    if (this.shootTimer >= shootInterval) {
      this.shootTimer = 0;
      this.bossShoot(game);
    }

    // Boss movement (sway)
    const activeParts = this.bossParts.filter(p => !p.destroyed);
    const sway = Math.sin(game.time * (1 + this.phase * 0.5)) * 20;
    for (const part of this.bossParts) {
      part.shakeTimer = Math.max(0, part.shakeTimer - dt);
    }

    // Update projectiles
    for (const proj of this.projectiles) {
      if (!proj.active) continue;
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;

      // Off screen
      if (proj.x < -20 || proj.x > w + 20 || proj.y < -20 || proj.y > h + 20) {
        proj.active = false;
        continue;
      }

      // Hit player
      if (!proj.reflected) {
        const dx = proj.x - this.playerX;
        const dy = proj.y - this.playerY;
        if (Math.sqrt(dx * dx + dy * dy) < 20 && this.invincibleTimer <= 0) {
          proj.active = false;
          game.state.health--;
          game.state.noHitBonus = false;
          game.playSound('hit');
          game.shakeCamera(10, 0.3);
          this.invincibleTimer = 1.5;

          if (game.state.health <= 0) {
            game.state.health = 3;
            this.enter(game);
            return;
          }
        }
      }

      // Reflected projectile hits boss part
      if (proj.reflected) {
        for (const part of this.bossParts) {
          if (part.destroyed) continue;
          if (proj.x > part.x && proj.x < part.x + part.w &&
              proj.y > part.y && proj.y < part.y + part.h) {
            proj.active = false;
            part.health--;
            part.shakeTimer = 0.3;
            game.state.bossHealth--;
            game.state.score += 200;
            game.playSound('bossHit');
            game.shakeCamera(6, 0.2);
            game.spawnParticles(particlePresets.explosion(proj.x, proj.y));

            if (part.health <= 0) {
              part.destroyed = true;
              game.spawnParticles(particlePresets.explosion(part.x + part.w / 2, part.y + part.h / 2));
              game.state.score += 500;

              // Check phase advancement
              const remaining = this.bossParts.filter(p => !p.destroyed).length;
              if (remaining <= 3) this.phase = 2;
              if (remaining <= 1) this.phase = 3;

              // All destroyed
              if (remaining === 0) {
                this.bossDefeated = true;
                this.victoryTimer = 0;
                game.playSound('victoryFanfare');
                stopBgMusic();
                startBgMusic('victory');

                // Big explosion
                for (let i = 0; i < 8; i++) {
                  setTimeout(() => {
                    game.spawnParticles(particlePresets.explosion(
                      this.bossX + (Math.random() - 0.5) * 100,
                      this.bossY + (Math.random() - 0.5) * 80
                    ));
                    game.spawnParticles(particlePresets.confetti(
                      Math.random() * w, Math.random() * h * 0.5
                    ));
                  }, i * 300);
                }
              }
            }
            break;
          }
        }
      }
    }

    // Clean projectiles
    this.projectiles = this.projectiles.filter(p => p.active);

    // Update boss part positions (sway)
    const baseX = this.bossX + sway;
    const s = game.getScale();
    this.bossParts[0].x = baseX - 40 * s;
    this.bossParts[1].x = baseX - 25 * s;
    this.bossParts[2].x = baseX - 70 * s;
    this.bossParts[3].x = baseX + 35 * s;
    this.bossParts[4].x = baseX - 5 * s;
  }

  private bossShoot(game: GameEngine) {
    const activeParts = this.bossParts.filter(p => !p.destroyed);
    if (activeParts.length === 0) return;

    const shooter = activeParts[Math.floor(Math.random() * activeParts.length)];
    const sx = shooter.x + shooter.w / 2;
    const sy = shooter.y + shooter.h / 2;

    // Aim at player with some variance
    const dx = this.playerX - sx;
    const dy = this.playerY - sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = 150 + this.phase * 40;
    const variance = 0.3;

    const proj: Projectile = {
      x: sx, y: sy,
      vx: (dx / dist + (Math.random() - 0.5) * variance) * speed,
      vy: (dy / dist + (Math.random() - 0.5) * variance) * speed,
      reflected: false,
      active: true,
      size: 8 + this.phase * 2,
    };

    this.projectiles.push(proj);
    game.playSound('whoosh');
  }

  private completeAct(game: GameEngine) {
    let stars = 1;
    if (game.state.bossHealth <= 0) stars++; // All parts destroyed
    if (game.state.noHitBonus) stars++;
    game.state.stars.act3 = Math.max(game.state.stars.act3, stars);

    const totalStars = Object.values(game.state.stars).reduce((a, b) => a + b, 0);
    if (totalStars >= 5 && !game.state.unlockedCostumes.includes(game.state.character === 'elphaba' ? 'elphaba_sparkly' : 'glinda_wings')) {
      game.state.unlockedCostumes.push(game.state.character === 'elphaba' ? 'elphaba_sparkly' : 'glinda_wings');
    }

    game.state.lastCompletedAct = 'act3';
    game.saveGame();

    setTimeout(() => {
      game.transitionTo('victory');
    }, 1500);
  }

  render(game: GameEngine, ctx: CanvasRenderingContext2D) {
    const w = game.width;
    const h = game.height;
    const scale = game.getScale();
    const isElphaba = game.state.character === 'elphaba';
    const t = game.time;

    // Dramatic sky
    const skyPhase = Math.sin(t * 0.5) * 0.5 + 0.5;
    const topColor = `rgb(${Math.floor(30 + skyPhase * 20)}, 0, ${Math.floor(40 + skyPhase * 20)})`;
    const botColor = `rgb(0, ${Math.floor(20 + skyPhase * 15)}, ${Math.floor(10 + skyPhase * 10)})`;
    drawSky(ctx, w, h, topColor, botColor, t);

    // Lightning flashes (phase dependent)
    if (this.phase >= 2 && Math.random() < 0.005 * this.phase) {
      ctx.fillStyle = 'rgba(200, 200, 255, 0.15)';
      ctx.fillRect(0, 0, w, h);
    }

    // Floor
    const floorGrad = ctx.createLinearGradient(0, h * 0.78, 0, h);
    floorGrad.addColorStop(0, '#1a3322');
    floorGrad.addColorStop(1, '#0a1a10');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, h * 0.78, w, h * 0.22);

    // Floor tiles
    ctx.strokeStyle = 'rgba(0, 200, 80, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo(i * (w / 10), h * 0.78);
      ctx.lineTo(i * (w / 10), h);
      ctx.stroke();
    }

    // Boss machine
    if (!this.bossDefeated) {
      this.drawBoss(ctx, scale, t, game);
    }

    // Projectiles
    for (const proj of this.projectiles) {
      if (!proj.active) continue;

      if (proj.reflected) {
        // Reflected — player's color
        ctx.fillStyle = isElphaba ? COLORS.emeraldGlow : COLORS.pinkGlow;
        ctx.shadowColor = isElphaba ? COLORS.emeraldGlow : COLORS.pinkGlow;
        ctx.shadowBlur = 10;
      } else {
        // Boss projectile — orange/red
        ctx.fillStyle = '#ff6622';
        ctx.shadowColor = '#ff4400';
        ctx.shadowBlur = 8;
      }

      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2);
      ctx.fill();

      // Inner glow
      ctx.fillStyle = proj.reflected ? '#fff' : '#ffcc00';
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.size * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.shadowBlur = 0;
    }

    // Player
    const blink = this.invincibleTimer > 0 && Math.sin(this.invincibleTimer * 20) > 0;
    if (!blink) {
      const charScale = scale * 1.6;
      const hasSparkly = game.state.unlockedCostumes.includes('elphaba_sparkly');
      const hasWings = game.state.unlockedCostumes.includes('glinda_wings');

      if (isElphaba) {
        drawElphaba(ctx, this.playerX, this.playerY, charScale, t, { sparkly: hasSparkly });
      } else {
        drawGlinda(ctx, this.playerX, this.playerY, charScale, t, { goldenWings: hasWings, wand: true });
      }
    }

    // Reflect zone indicator
    if (!this.bossDefeated) {
      ctx.strokeStyle = isElphaba
        ? `rgba(0, 255, 100, ${Math.sin(t * 4) * 0.15 + 0.15})`
        : `rgba(255, 100, 180, ${Math.sin(t * 4) * 0.15 + 0.15})`;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(this.playerX, this.playerY, 60, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // HUD
    drawHUD(ctx, game);

    // Boss health bar
    if (!this.bossDefeated) {
      const barW = w * 0.5;
      const barX = (w - barW) / 2;
      const barY = h - 30;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(barX - 2, barY - 2, barW + 4, 16);
      const healthPct = game.state.bossHealth / game.state.bossMaxHealth;
      const hGrad = ctx.createLinearGradient(barX, 0, barX + barW * healthPct, 0);
      hGrad.addColorStop(0, '#ff4400');
      hGrad.addColorStop(1, '#ff8800');
      ctx.fillStyle = hGrad;
      ctx.fillRect(barX, barY, barW * healthPct, 12);
      drawText(ctx, "Wizard's Machine", w / 2, barY - 6, 10 * scale, '#ddd');
    }

    // Victory cutscene
    if (this.bossDefeated) {
      this.renderVictoryCutscene(ctx, w, h, scale, game);
    }

    // Controls hint
    if (game.state.levelTime < 4 && !this.bossDefeated) {
      const alpha = Math.max(0, 1 - game.state.levelTime / 4);
      ctx.globalAlpha = alpha;
      drawText(ctx, 'Move to dodge!', w / 2, h * 0.88, 13 * scale, '#fff');
      drawText(ctx, 'Tap near projectiles to reflect!', w / 2, h * 0.93, 12 * scale, '#ccc');
      ctx.globalAlpha = 1;
    }
  }

  private drawBoss(ctx: CanvasRenderingContext2D, scale: number, t: number, game: GameEngine) {
    for (const part of this.bossParts) {
      if (part.destroyed) continue;

      const shakeX = part.shakeTimer > 0 ? (Math.random() - 0.5) * 6 : 0;
      const shakeY = part.shakeTimer > 0 ? (Math.random() - 0.5) * 6 : 0;
      const px = part.x + shakeX;
      const py = part.y + shakeY;

      switch (part.type) {
        case 'body': {
          // Main chassis
          const bodyGrad = ctx.createLinearGradient(px, py, px, py + part.h);
          bodyGrad.addColorStop(0, '#555');
          bodyGrad.addColorStop(1, '#333');
          ctx.fillStyle = bodyGrad;
          ctx.fillRect(px, py, part.w, part.h);

          // Rivets
          ctx.fillStyle = '#777';
          for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 3; j++) {
              ctx.beginPath();
              ctx.arc(px + 15 + j * 25, py + 15 + i * 25, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // Glowing core
          const coreGlow = Math.sin(t * 3) * 0.3 + 0.7;
          ctx.fillStyle = `rgba(255, 80, 0, ${coreGlow})`;
          ctx.beginPath();
          ctx.arc(px + part.w / 2, py + part.h / 2, 15 * scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(255, 200, 50, ${coreGlow * 0.5})`;
          ctx.beginPath();
          ctx.arc(px + part.w / 2, py + part.h / 2, 8 * scale, 0, Math.PI * 2);
          ctx.fill();
          break;
        }

        case 'dome': {
          ctx.fillStyle = '#666';
          ctx.beginPath();
          ctx.arc(px + part.w / 2, py + part.h, part.w / 2, Math.PI, 0);
          ctx.fill();
          // Glass
          ctx.fillStyle = `rgba(100, 200, 255, ${Math.sin(t * 2) * 0.2 + 0.3})`;
          ctx.beginPath();
          ctx.arc(px + part.w / 2, py + part.h, part.w / 2 - 5, Math.PI, 0);
          ctx.fill();
          break;
        }

        case 'arm_l':
        case 'arm_r': {
          const armAngle = Math.sin(t * 2 + (part.type === 'arm_l' ? 0 : Math.PI)) * 0.2;
          ctx.save();
          ctx.translate(px + part.w / 2, py + part.h / 2);
          ctx.rotate(armAngle);
          ctx.fillStyle = '#555';
          ctx.fillRect(-part.w / 2, -part.h / 2, part.w, part.h);
          // Claw
          ctx.fillStyle = '#888';
          const clawDir = part.type === 'arm_l' ? -1 : 1;
          ctx.beginPath();
          ctx.moveTo(clawDir * part.w / 2, -part.h / 2);
          ctx.lineTo(clawDir * (part.w / 2 + 8), -part.h);
          ctx.lineTo(clawDir * (part.w / 2 + 4), 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          break;
        }

        case 'antenna': {
          ctx.fillStyle = '#777';
          ctx.fillRect(px, py, part.w, part.h);
          // Blinking light
          const blink = Math.sin(t * 6) > 0;
          ctx.fillStyle = blink ? '#ff0000' : '#440000';
          ctx.beginPath();
          ctx.arc(px + part.w / 2, py, 5 * scale, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
      }
    }

    // Smoke from damaged parts
    const destroyed = this.bossParts.filter(p => p.destroyed);
    for (const part of destroyed) {
      if (Math.random() < 0.1) {
        game.spawnParticles({
          x: part.x + part.w / 2, y: part.y + part.h / 2,
          count: 1, spread: 10,
          speed: 15, speedVariance: 10,
          life: 0.8, lifeVariance: 0.3,
          size: 8, sizeEnd: 15, sizeVariance: 4,
          color: { r: 80, g: 80, b: 80 },
          shape: 'circle', gravity: -30,
          alpha: 0.4, alphaEnd: 0,
        });
      }
    }
  }

  private renderVictoryCutscene(ctx: CanvasRenderingContext2D, w: number, h: number, scale: number, game: GameEngine) {
    const t = this.victoryTimer;

    // Fade in overlay
    const fade = Math.min(0.6, t * 0.15);
    ctx.fillStyle = `rgba(0, 0, 0, ${fade})`;
    ctx.fillRect(0, 0, w, h);

    if (t > 1) {
      const textFade = Math.min(1, (t - 1) * 0.8);
      ctx.globalAlpha = textFade;
      drawText(ctx, 'You did it, Havi!', w / 2, h * 0.25, 28 * scale, COLORS.gold);
    }

    if (t > 2.5) {
      const textFade = Math.min(1, (t - 2.5) * 0.8);
      ctx.globalAlpha = textFade;
      drawText(ctx, 'You changed Oz for good!', w / 2, h * 0.38, 18 * scale, '#fff');
    }

    if (t > 4) {
      const textFade = Math.min(1, (t - 4) * 0.8);
      ctx.globalAlpha = textFade;
      const color = game.state.character === 'elphaba' ? COLORS.emeraldGlow : COLORS.pinkGlow;
      drawText(ctx, '"Because I knew you,', w / 2, h * 0.52, 16 * scale, color);
      drawText(ctx, 'I have been changed for good"', w / 2, h * 0.58, 16 * scale, color);
    }

    ctx.globalAlpha = 1;
  }
}
