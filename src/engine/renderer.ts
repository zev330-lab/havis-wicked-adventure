// Canvas rendering helpers — drawing characters, backgrounds, HUD, etc.
import { Character, CameraState, GameEngine } from './types';

// Color palette
export const COLORS = {
  emerald: '#00cc66',
  emeraldDark: '#006633',
  emeraldGlow: '#33ff99',
  pink: '#ff69b4',
  pinkLight: '#ffb6d9',
  pinkGlow: '#ff99cc',
  gold: '#ffd700',
  goldDark: '#b8960f',
  amber: '#ffbf00',
  skyTop: '#1a0533',
  skyBottom: '#0d3320',
  white: '#ffffff',
  black: '#000000',
  slate: '#1e293b',
  velvet: '#4a0028',
};

// Draw gradient sky
export function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number, topColor: string, bottomColor: string, time: number) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, topColor);
  grad.addColorStop(1, bottomColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Twinkling stars
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 40; i++) {
    const sx = ((i * 137.5) % w);
    const sy = ((i * 73.1) % (h * 0.6));
    const twinkle = Math.sin(time * 2 + i * 1.7) * 0.5 + 0.5;
    ctx.globalAlpha = twinkle * 0.7;
    const starSize = 1 + (i % 3);
    ctx.beginPath();
    ctx.arc(sx, sy, starSize, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Draw parallax clouds
export function drawClouds(ctx: CanvasRenderingContext2D, w: number, h: number, offset: number, time: number) {
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  for (let i = 0; i < 8; i++) {
    const cx = ((i * 200 + offset * (0.3 + i * 0.05)) % (w + 200)) - 100;
    const cy = 60 + (i * 47) % (h * 0.4);
    const cw = 80 + (i * 23) % 60;
    const ch = 25 + (i * 11) % 15;
    const wobble = Math.sin(time + i) * 3;
    ctx.beginPath();
    ctx.ellipse(cx, cy + wobble, cw, ch, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - cw * 0.3, cy + wobble + 5, cw * 0.6, ch * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + cw * 0.4, cy + wobble + 3, cw * 0.5, ch * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Draw Emerald City silhouette
export function drawEmeraldCity(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, time: number) {
  const s = scale;
  ctx.save();
  ctx.translate(x, y);

  // Glow
  const glowGrad = ctx.createRadialGradient(0, -40 * s, 10 * s, 0, -40 * s, 120 * s);
  glowGrad.addColorStop(0, 'rgba(0, 255, 100, 0.3)');
  glowGrad.addColorStop(1, 'rgba(0, 255, 100, 0)');
  ctx.fillStyle = glowGrad;
  ctx.fillRect(-150 * s, -200 * s, 300 * s, 250 * s);

  // Buildings - art deco silhouette
  ctx.fillStyle = COLORS.emeraldDark;
  // Central tower
  ctx.fillRect(-8 * s, -140 * s, 16 * s, 140 * s);
  // Tower top (dome)
  ctx.beginPath();
  ctx.arc(0, -140 * s, 12 * s, Math.PI, 0);
  ctx.fill();
  // Spire
  ctx.beginPath();
  ctx.moveTo(-3 * s, -152 * s);
  ctx.lineTo(0, -180 * s);
  ctx.lineTo(3 * s, -152 * s);
  ctx.fill();

  // Side towers
  for (const dir of [-1, 1]) {
    ctx.fillRect(dir * 25 * s - 10 * s, -100 * s, 20 * s, 100 * s);
    ctx.beginPath();
    ctx.arc(dir * 25 * s, -100 * s, 10 * s, Math.PI, 0);
    ctx.fill();

    ctx.fillRect(dir * 55 * s - 8 * s, -80 * s, 16 * s, 80 * s);
    ctx.beginPath();
    ctx.moveTo(dir * 55 * s - 6 * s, -80 * s);
    ctx.lineTo(dir * 55 * s, -100 * s);
    ctx.lineTo(dir * 55 * s + 6 * s, -80 * s);
    ctx.fill();

    ctx.fillRect(dir * 80 * s - 12 * s, -60 * s, 24 * s, 60 * s);
    ctx.fillRect(dir * 105 * s - 8 * s, -45 * s, 16 * s, 45 * s);
  }

  // Windows (glowing)
  const glow = Math.sin(time * 1.5) * 0.3 + 0.7;
  ctx.fillStyle = `rgba(0, 255, 100, ${glow})`;
  for (let dy = -130; dy < -10; dy += 15) {
    for (let dx = -5; dx <= 5; dx += 10) {
      ctx.fillRect(dx * s - 1.5 * s, dy * s, 3 * s, 6 * s);
    }
  }
  for (const dir of [-1, 1]) {
    for (let dy = -90; dy < -10; dy += 15) {
      ctx.fillRect(dir * 25 * s - 2 * s, dy * s, 4 * s, 6 * s);
    }
  }

  ctx.restore();
}

// Draw Elphaba character
export function drawElphaba(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, time: number, data: Record<string, any> = {}) {
  const s = scale;
  const bobble = Math.sin(time * 3) * 2 * s;
  const capeWave = Math.sin(time * 4) * 5 * s;
  const sparkly = data.sparkly || false;

  ctx.save();
  ctx.translate(x, y + bobble);

  // Cape
  ctx.fillStyle = sparkly ? '#1a1a3a' : '#1a1a2e';
  ctx.beginPath();
  ctx.moveTo(-8 * s, -8 * s);
  ctx.quadraticCurveTo(-20 * s + capeWave, 10 * s, -15 * s + capeWave * 1.3, 25 * s);
  ctx.lineTo(0, 15 * s);
  ctx.closePath();
  ctx.fill();
  // Right side cape
  ctx.beginPath();
  ctx.moveTo(8 * s, -8 * s);
  ctx.quadraticCurveTo(20 * s - capeWave * 0.5, 10 * s, 15 * s - capeWave * 0.7, 25 * s);
  ctx.lineTo(0, 15 * s);
  ctx.closePath();
  ctx.fill();

  if (sparkly) {
    // Sparkly cape glitter
    ctx.fillStyle = '#6633ff';
    for (let i = 0; i < 6; i++) {
      const sx = (Math.sin(time * 2 + i * 2) * 10 - 5) * s;
      const sy = (5 + i * 3) * s;
      ctx.globalAlpha = Math.sin(time * 3 + i) * 0.3 + 0.4;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Body (dress)
  ctx.fillStyle = '#111122';
  ctx.beginPath();
  ctx.moveTo(-7 * s, -5 * s);
  ctx.lineTo(-10 * s, 18 * s);
  ctx.lineTo(10 * s, 18 * s);
  ctx.lineTo(7 * s, -5 * s);
  ctx.closePath();
  ctx.fill();

  // Head (green)
  ctx.fillStyle = '#2ecc71';
  ctx.beginPath();
  ctx.arc(0, -15 * s, 10 * s, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(-3 * s, -16 * s, 2 * s, 2.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(3 * s, -16 * s, 2 * s, 2.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eye shine
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-2 * s, -17 * s, 0.8 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4 * s, -17 * s, 0.8 * s, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = '#1a8f4e';
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.arc(0, -13 * s, 4 * s, 0.1, Math.PI - 0.1);
  ctx.stroke();

  // Hat (pointy witch hat)
  ctx.fillStyle = '#111';
  // Brim
  ctx.beginPath();
  ctx.ellipse(0, -24 * s, 14 * s, 4 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Cone
  ctx.beginPath();
  ctx.moveTo(-9 * s, -25 * s);
  ctx.lineTo(0, -50 * s);
  ctx.lineTo(9 * s, -25 * s);
  ctx.closePath();
  ctx.fill();
  // Hat buckle
  ctx.fillStyle = COLORS.emerald;
  ctx.fillRect(-4 * s, -30 * s, 8 * s, 3 * s);

  // Hair flowing
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.moveTo(-10 * s, -18 * s);
  ctx.quadraticCurveTo(-14 * s, -5 * s, -12 * s + capeWave * 0.5, 5 * s);
  ctx.lineTo(-8 * s, -5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(10 * s, -18 * s);
  ctx.quadraticCurveTo(14 * s, -5 * s, 12 * s - capeWave * 0.3, 5 * s);
  ctx.lineTo(8 * s, -5 * s);
  ctx.closePath();
  ctx.fill();

  // Broomstick (when flying)
  if (data.flying) {
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(-25 * s, 15 * s);
    ctx.lineTo(25 * s, 15 * s);
    ctx.stroke();
    // Bristles
    ctx.strokeStyle = '#DAA520';
    ctx.lineWidth = 1.5 * s;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(25 * s, 15 * s);
      ctx.lineTo(35 * s, 10 * s + i * 3 * s);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// Draw Glinda character
export function drawGlinda(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, time: number, data: Record<string, any> = {}) {
  const s = scale;
  const bobble = Math.sin(time * 2.5) * 3 * s;
  const hasWings = data.goldenWings || false;

  ctx.save();
  ctx.translate(x, y + bobble);

  // Golden wings (unlockable)
  if (hasWings) {
    ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
    const wingFlap = Math.sin(time * 5) * 8 * s;
    // Left wing
    ctx.beginPath();
    ctx.moveTo(-5 * s, -10 * s);
    ctx.quadraticCurveTo(-30 * s - wingFlap, -30 * s, -20 * s - wingFlap, -5 * s);
    ctx.quadraticCurveTo(-15 * s, 5 * s, -5 * s, 0);
    ctx.closePath();
    ctx.fill();
    // Right wing
    ctx.beginPath();
    ctx.moveTo(5 * s, -10 * s);
    ctx.quadraticCurveTo(30 * s + wingFlap, -30 * s, 20 * s + wingFlap, -5 * s);
    ctx.quadraticCurveTo(15 * s, 5 * s, 5 * s, 0);
    ctx.closePath();
    ctx.fill();
    // Wing sparkle
    ctx.fillStyle = '#ffd700';
    for (let i = 0; i < 4; i++) {
      const wx = (Math.sin(time * 3 + i) * 15 * (i % 2 === 0 ? -1 : 1)) * s;
      const wy = (-15 + Math.cos(time * 2 + i) * 10) * s;
      ctx.globalAlpha = Math.sin(time * 4 + i * 2) * 0.3 + 0.5;
      ctx.beginPath();
      ctx.arc(wx, wy, 1.5 * s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Gown (flowing pink)
  const grad = ctx.createLinearGradient(0, -5 * s, 0, 22 * s);
  grad.addColorStop(0, '#ff69b4');
  grad.addColorStop(1, '#ff99cc');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-6 * s, -5 * s);
  ctx.quadraticCurveTo(-14 * s, 10 * s, -12 * s, 20 * s);
  ctx.lineTo(12 * s, 20 * s);
  ctx.quadraticCurveTo(14 * s, 10 * s, 6 * s, -5 * s);
  ctx.closePath();
  ctx.fill();

  // Gown sparkles
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 6; i++) {
    const gx = (Math.sin(i * 1.5) * 6) * s;
    const gy = (2 + i * 3) * s;
    ctx.globalAlpha = Math.sin(time * 2 + i) * 0.3 + 0.5;
    ctx.beginPath();
    ctx.arc(gx, gy, 1 * s, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Head
  ctx.fillStyle = '#fdd5b1';
  ctx.beginPath();
  ctx.arc(0, -14 * s, 10 * s, 0, Math.PI * 2);
  ctx.fill();

  // Hair (blonde curls)
  ctx.fillStyle = '#f4d03f';
  ctx.beginPath();
  ctx.arc(-8 * s, -18 * s, 5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(8 * s, -18 * s, 5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -22 * s, 6 * s, 0, Math.PI * 2);
  ctx.fill();
  // Flowing curls
  const curlWave = Math.sin(time * 3) * 2 * s;
  ctx.beginPath();
  ctx.moveTo(-9 * s, -16 * s);
  ctx.quadraticCurveTo(-13 * s + curlWave, -5 * s, -11 * s, 2 * s);
  ctx.lineTo(-7 * s, -5 * s);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(9 * s, -16 * s);
  ctx.quadraticCurveTo(13 * s - curlWave, -5 * s, 11 * s, 2 * s);
  ctx.lineTo(7 * s, -5 * s);
  ctx.closePath();
  ctx.fill();

  // Crown/Tiara
  ctx.fillStyle = COLORS.gold;
  ctx.beginPath();
  ctx.moveTo(-6 * s, -24 * s);
  ctx.lineTo(-4 * s, -30 * s);
  ctx.lineTo(-2 * s, -26 * s);
  ctx.lineTo(0, -33 * s);
  ctx.lineTo(2 * s, -26 * s);
  ctx.lineTo(4 * s, -30 * s);
  ctx.lineTo(6 * s, -24 * s);
  ctx.closePath();
  ctx.fill();
  // Jewel
  ctx.fillStyle = '#ff69b4';
  ctx.beginPath();
  ctx.arc(0, -28 * s, 1.5 * s, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#4a86c8';
  ctx.beginPath();
  ctx.ellipse(-3 * s, -15 * s, 2 * s, 2.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(3 * s, -15 * s, 2 * s, 2.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Pupil
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(-3 * s, -15 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(3 * s, -15 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();
  // Eye shine
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-2 * s, -16 * s, 0.7 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4 * s, -16 * s, 0.7 * s, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = '#e8a090';
  ctx.lineWidth = 1.2 * s;
  ctx.beginPath();
  ctx.arc(0, -12 * s, 4 * s, 0.1, Math.PI - 0.1);
  ctx.stroke();
  // Blush
  ctx.fillStyle = 'rgba(255, 150, 150, 0.3)';
  ctx.beginPath();
  ctx.ellipse(-6 * s, -12 * s, 2.5 * s, 1.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(6 * s, -12 * s, 2.5 * s, 1.5 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bubble (when flying)
  if (data.flying) {
    const bubbleWobble = Math.sin(time * 2) * 2 * s;
    ctx.strokeStyle = 'rgba(255, 182, 217, 0.5)';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.arc(0, -5 * s, 28 * s + bubbleWobble, 0, Math.PI * 2);
    ctx.stroke();
    // Bubble shine
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.arc(-8 * s, -18 * s, 8 * s, -0.5, 0.8);
    ctx.stroke();
  }

  // Wand
  if (data.wand !== false) {
    ctx.save();
    ctx.translate(12 * s, -5 * s);
    ctx.rotate(Math.sin(time * 2) * 0.15);
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(8 * s, -12 * s);
    ctx.stroke();
    // Star on wand tip
    ctx.fillStyle = COLORS.gold;
    drawStarShape(ctx, 8 * s, -14 * s, 5, 4 * s, 2 * s);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawStarShape(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerR: number, innerR: number) {
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / spikes - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// Draw a gem (collectible)
export function drawGem(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, green: boolean, time: number) {
  const bobble = Math.sin(time * 3 + x * 0.01) * 3;
  const shimmer = Math.sin(time * 5 + x * 0.02) * 0.2 + 0.8;

  ctx.save();
  ctx.translate(x, y + bobble);
  ctx.rotate(Math.sin(time * 2 + x * 0.01) * 0.1);

  // Glow
  ctx.fillStyle = green
    ? `rgba(0, 255, 100, ${shimmer * 0.3})`
    : `rgba(255, 150, 200, ${shimmer * 0.3})`;
  ctx.beginPath();
  ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Diamond shape
  const grad = ctx.createLinearGradient(-size, -size, size, size);
  if (green) {
    grad.addColorStop(0, '#33ff99');
    grad.addColorStop(0.5, '#00cc66');
    grad.addColorStop(1, '#009944');
  } else {
    grad.addColorStop(0, '#ffb6d9');
    grad.addColorStop(0.5, '#ff69b4');
    grad.addColorStop(1, '#ff1493');
  }
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.7, 0);
  ctx.lineTo(0, size);
  ctx.lineTo(-size * 0.7, 0);
  ctx.closePath();
  ctx.fill();

  // Shine
  ctx.fillStyle = `rgba(255, 255, 255, ${shimmer * 0.6})`;
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.8);
  ctx.lineTo(size * 0.2, -size * 0.2);
  ctx.lineTo(-size * 0.2, -size * 0.2);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// Draw wand-charge health bar
export function drawHealth(ctx: CanvasRenderingContext2D, x: number, y: number, current: number, max: number, green: boolean) {
  for (let i = 0; i < max; i++) {
    const wx = x + i * 28;
    ctx.strokeStyle = green ? COLORS.emerald : COLORS.pink;
    ctx.lineWidth = 2;

    if (i < current) {
      ctx.fillStyle = green ? COLORS.emeraldGlow : COLORS.pinkGlow;
    } else {
      ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
    }

    // Wand shape
    ctx.beginPath();
    ctx.moveTo(wx, y);
    ctx.lineTo(wx + 4, y - 16);
    ctx.lineTo(wx + 8, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Star tip
    if (i < current) {
      ctx.fillStyle = COLORS.gold;
      drawStarShape(ctx, wx + 4, y - 18, 5, 5, 2);
      ctx.fill();
    }
  }
}

// Draw text with outline (elegant serif-like appearance)
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  align: CanvasTextAlign = 'center',
  outline = true
) {
  ctx.font = `bold ${size}px 'Georgia', 'Times New Roman', serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  if (outline) {
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.lineWidth = size * 0.12;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

// Draw the HUD
export function drawHUD(ctx: CanvasRenderingContext2D, game: GameEngine) {
  const w = game.width;
  const isGreen = game.state.character === 'elphaba';

  // Gem counter
  const gemSize = 8;
  drawGem(ctx, 30, 30, gemSize, isGreen, game.time);
  drawText(ctx, `${game.state.gems}`, 55, 30, 20, COLORS.gold, 'left');

  // Health (wand charges)
  drawHealth(ctx, w - 130, 22, game.state.health, game.state.maxHealth, isGreen);

  // Score
  drawText(ctx, `Score: ${game.state.score}`, w / 2, 25, 16, '#fff');

  // Star progress (3 stars)
  for (let i = 0; i < 3; i++) {
    const sx = w / 2 - 30 + i * 30;
    ctx.fillStyle = i < game.state.stars[game.state.currentAct]
      ? COLORS.gold
      : 'rgba(255, 255, 255, 0.2)';
    drawStarShape(ctx, sx, 48, 5, 8, 3.5);
    ctx.fill();
  }
}

// Draw platform
export function drawPlatform(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, type = 'default') {
  if (type === 'emerald') {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#1a8855');
    grad.addColorStop(1, '#0d5533');
    ctx.fillStyle = grad;
  } else if (type === 'gold') {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#c9a822');
    grad.addColorStop(1, '#8b7315');
    ctx.fillStyle = grad;
  } else {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#3a5a4a');
    grad.addColorStop(1, '#2a3a3a');
    ctx.fillStyle = grad;
  }

  // Rounded rectangle
  const r = Math.min(4, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fill();

  // Top highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(x + 2, y + 1, w - 4, 2);
}

// Draw NPC (Ozian citizen)
export function drawNPC(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, time: number, message: string) {
  const s = scale;
  const bobble = Math.sin(time * 2 + x * 0.1) * 1.5;

  ctx.save();
  ctx.translate(x, y + bobble);

  // Body
  ctx.fillStyle = '#2d5a3d';
  ctx.beginPath();
  ctx.moveTo(-5 * s, -3 * s);
  ctx.lineTo(-7 * s, 12 * s);
  ctx.lineTo(7 * s, 12 * s);
  ctx.lineTo(5 * s, -3 * s);
  ctx.closePath();
  ctx.fill();

  // Head
  ctx.fillStyle = '#fdd5b1';
  ctx.beginPath();
  ctx.arc(0, -10 * s, 7 * s, 0, Math.PI * 2);
  ctx.fill();

  // Top hat (emerald)
  ctx.fillStyle = COLORS.emeraldDark;
  ctx.fillRect(-5 * s, -20 * s, 10 * s, 10 * s);
  ctx.fillRect(-7 * s, -12 * s, 14 * s, 3 * s);

  // Eyes
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(-2 * s, -11 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(2 * s, -11 * s, 1.2 * s, 0, Math.PI * 2);
  ctx.fill();

  // Smile
  ctx.strokeStyle = '#c88';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, -9 * s, 2.5 * s, 0.2, Math.PI - 0.2);
  ctx.stroke();

  // Speech bubble
  if (message) {
    const bubbleW = message.length * 6 + 16;
    const bubbleH = 22;
    const bubbleX = -bubbleW / 2;
    const bubbleY = -35 * s;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.moveTo(bubbleX + 5, bubbleY);
    ctx.lineTo(bubbleX + bubbleW - 5, bubbleY);
    ctx.arcTo(bubbleX + bubbleW, bubbleY, bubbleX + bubbleW, bubbleY + 5, 5);
    ctx.lineTo(bubbleX + bubbleW, bubbleY + bubbleH - 5);
    ctx.arcTo(bubbleX + bubbleW, bubbleY + bubbleH, bubbleX + bubbleW - 5, bubbleY + bubbleH, 5);
    ctx.lineTo(bubbleX + 5, bubbleY + bubbleH);
    ctx.arcTo(bubbleX, bubbleY + bubbleH, bubbleX, bubbleY + bubbleH - 5, 5);
    ctx.lineTo(bubbleX, bubbleY + 5);
    ctx.arcTo(bubbleX, bubbleY, bubbleX + 5, bubbleY, 5);
    ctx.closePath();
    ctx.fill();
    // Arrow
    ctx.beginPath();
    ctx.moveTo(-3, bubbleY + bubbleH);
    ctx.lineTo(0, bubbleY + bubbleH + 6);
    ctx.lineTo(3, bubbleY + bubbleH);
    ctx.fill();

    drawText(ctx, message, 0, bubbleY + bubbleH / 2, 11, '#333', 'center', false);
  }

  ctx.restore();
}

// Transition effect — green smoke swirl or pink bubble pop
export function drawTransition(ctx: CanvasRenderingContext2D, w: number, h: number, alpha: number, character: Character | null) {
  if (alpha <= 0) return;

  if (character === 'glinda') {
    // Pink bubble expand
    ctx.fillStyle = `rgba(255, 105, 180, ${alpha})`;
    const r = Math.max(w, h) * alpha;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
    ctx.fill();
    // Inner lighter
    ctx.fillStyle = `rgba(255, 182, 217, ${alpha * 0.5})`;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Green smoke
    ctx.fillStyle = `rgba(0, 50, 20, ${alpha})`;
    ctx.fillRect(0, 0, w, h);
    // Swirl effect
    ctx.fillStyle = `rgba(0, 200, 80, ${alpha * 0.3})`;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + alpha * 5;
      const dist = alpha * Math.max(w, h) * 0.3;
      const cx = w / 2 + Math.cos(angle) * dist;
      const cy = h / 2 + Math.sin(angle) * dist;
      ctx.beginPath();
      ctx.arc(cx, cy, 40 + alpha * 60, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
