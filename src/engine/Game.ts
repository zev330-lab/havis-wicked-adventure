// Main game engine — ties everything together
import {
  GameState, GameEngine, SceneId, Scene,
  CameraState, InputState, Particle, SaveData,
  ParticleEmitterConfig, ActId,
} from './types';
import { InputManager } from './input';
import { ParticleSystem, particlePresets } from './particles';
import { playSound, initAudio, startBgMusic, stopBgMusic, setMuted, getMuted } from './audio';
import { drawTransition, drawText, COLORS } from './renderer';

// Import scenes
import { SplashScene } from '../scenes/Splash';
import { CharacterSelectScene } from '../scenes/CharacterSelect';
import { LevelSelectScene } from '../scenes/LevelSelect';
import { StoryCardScene } from '../scenes/StoryCard';
import { Act1Scene } from '../scenes/Act1';
import { Act2Scene } from '../scenes/Act2';
import { Act3Scene } from '../scenes/Act3';
import { Act4Scene } from '../scenes/Act4';
import { Act5Scene } from '../scenes/Act5';
import { Act6Scene } from '../scenes/Act6';
import { Act7Scene } from '../scenes/Act7';
import { Act8Scene } from '../scenes/Act8';
import { Act9Scene } from '../scenes/Act9';
import { Act10Scene } from '../scenes/Act10';
import { Act11Scene } from '../scenes/Act11';
import { Act12Scene } from '../scenes/Act12';
import { Act13Scene } from '../scenes/Act13';
import { Act14Scene } from '../scenes/Act14';
import { Act15Scene } from '../scenes/Act15';
import { VictoryScene } from '../scenes/Victory';

const SAVE_KEY = 'havis-wicked-adventure-save';
const MUTE_KEY = 'havis-wicked-adventure-mute';

function createInitialState(): GameState {
  return {
    currentScene: 'splash',
    character: null,
    currentAct: 'act1',
    score: 0,
    gems: 0,
    health: 3,
    maxHealth: 3,
    stars: { act1: 0, act2: 0, act3: 0, act4: 0, act5: 0, act6: 0, act7: 0, act8: 0, act9: 0, act10: 0, act11: 0, act12: 0, act13: 0, act14: 0, act15: 0 },
    unlockedCostumes: [],
    lastCompletedAct: null,
    storyCardIndex: 0,
    isPaused: false,
    levelTime: 0,
    noHitBonus: true,
    bossHealth: 10,
    bossMaxHealth: 6,
    actComplete: false,
    transitionAlpha: 0,
    transitionDirection: null,
    transitionTarget: null,
  };
}

// Pause button layout constants
const PAUSE_BTN_SIZE = 36;
const PAUSE_BTN_MARGIN = 12;

export class Game implements GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width = 0;
  height = 0;
  state: GameState;
  input: InputState;
  camera: CameraState;
  particles: Particle[];
  dt = 0;
  time = 0;
  scenes: Map<SceneId, Scene>;

  private inputManager: InputManager;
  private particleSystem: ParticleSystem;
  private lastTime = 0;
  private running = false;
  private rafId = 0;
  private designWidth = 390;
  private designHeight = 680;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.state = createInitialState();
    this.inputManager = new InputManager(canvas);
    this.input = this.inputManager.state;
    this.particleSystem = new ParticleSystem();
    this.particles = this.particleSystem.particles;
    this.camera = {
      x: 0, y: 0, targetX: 0, targetY: 0,
      shakeX: 0, shakeY: 0,
      shakeIntensity: 0, shakeDuration: 0, shakeTimer: 0,
      zoom: 1,
    };

    // Register scenes
    this.scenes = new Map();
    this.scenes.set('splash', new SplashScene());
    this.scenes.set('characterSelect', new CharacterSelectScene());
    this.scenes.set('levelSelect', new LevelSelectScene());
    this.scenes.set('storyCard', new StoryCardScene());
    this.scenes.set('gameplay', new Act1Scene());
    this.scenes.set('victory', new VictoryScene());

    // Load save data
    const save = this.loadGame();
    if (save) {
      this.state.stars = save.stars;
      this.state.unlockedCostumes = save.unlockedCostumes;
      this.state.lastCompletedAct = save.lastCompletedAct;
      if (save.character) this.state.character = save.character;
    }

    // Load mute preference
    try {
      const m = localStorage.getItem(MUTE_KEY);
      if (m === 'true') setMuted(true);
    } catch { /* ignore */ }

    this.resize();
    window.addEventListener('resize', () => this.resize());

    // iOS safe area handling
    document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top)');
    document.documentElement.style.setProperty('--sab', 'env(safe-area-inset-bottom)');
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Scale to fit while maintaining aspect ratio
    const aspect = this.designWidth / this.designHeight;
    const windowAspect = vw / vh;

    let canvasW: number, canvasH: number;
    if (windowAspect > aspect) {
      // Window is wider — fit to height
      canvasH = vh;
      canvasW = vh * aspect;
    } else {
      // Window is taller — fit to width
      canvasW = vw;
      canvasH = vw / aspect;
    }

    // For landscape, allow wider
    if (vw > vh) {
      canvasW = vw;
      canvasH = vh;
    }

    this.canvas.style.width = `${canvasW}px`;
    this.canvas.style.height = `${canvasH}px`;
    this.canvas.width = canvasW * dpr;
    this.canvas.height = canvasH * dpr;
    // DPR transform makes drawing ops use CSS-pixel units
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Game logic uses CSS pixels (matching touch coordinates)
    this.width = canvasW;
    this.height = canvasH;
  }

  getScale(): number {
    return Math.min(this.width / this.designWidth, this.height / this.designHeight);
  }

  start() {
    if (this.running) return;
    this.running = true;
    initAudio();
    this.lastTime = performance.now();
    // Enter initial scene
    const scene = this.scenes.get(this.state.currentScene);
    if (scene) scene.enter(this);
    this.loop(this.lastTime);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    stopBgMusic();
  }

  private isGameplayScene(): boolean {
    return this.state.currentScene === 'gameplay';
  }

  private getPauseBtnBounds() {
    const scale = this.getScale();
    const size = PAUSE_BTN_SIZE * scale;
    const margin = PAUSE_BTN_MARGIN * scale;
    return {
      x: this.width - size - margin,
      y: margin,
      w: size,
      h: size,
    };
  }

  private getPauseMenuButtons(scale: number) {
    const w = this.width;
    const h = this.height;
    const btnW = 180 * scale;
    const btnH = 44 * scale;
    const gap = 16 * scale;
    const startY = h * 0.42;
    const cx = w / 2 - btnW / 2;

    return {
      resume: { x: cx, y: startY, w: btnW, h: btnH, label: 'Resume' },
      restart: { x: cx, y: startY + btnH + gap, w: btnW, h: btnH, label: 'Restart Level' },
      menu: { x: cx, y: startY + 2 * (btnH + gap), w: btnW, h: btnH, label: 'Level Select' },
      mute: { x: cx, y: startY + 3 * (btnH + gap), w: btnW, h: btnH, label: getMuted() ? 'Sound: OFF' : 'Sound: ON' },
    };
  }

  private handlePauseInput() {
    if (!this.input.tap) return;
    const tx = this.input.tapX;
    const ty = this.input.tapY;

    if (!this.state.isPaused) {
      // Check pause button tap (only during gameplay, not during act complete)
      if (this.isGameplayScene() && !this.state.actComplete && !this.state.transitionDirection) {
        const btn = this.getPauseBtnBounds();
        if (tx >= btn.x && tx <= btn.x + btn.w && ty >= btn.y && ty <= btn.y + btn.h) {
          this.state.isPaused = true;
          playSound('menuSelect');
          // Consume the tap so the act scene doesn't get it
          this.inputManager.clearTap();
        }
      }
    } else {
      // Check pause menu button taps
      const scale = this.getScale();
      const btns = this.getPauseMenuButtons(scale);

      if (this.hitTest(tx, ty, btns.resume)) {
        this.state.isPaused = false;
        playSound('menuSelect');
      } else if (this.hitTest(tx, ty, btns.restart)) {
        this.state.isPaused = false;
        // Reset per-act state
        this.state.gems = 0;
        this.state.score = 0;
        this.state.health = 3;
        this.state.maxHealth = 3;
        this.state.noHitBonus = true;
        this.state.levelTime = 0;
        this.state.actComplete = false;
        if (this.state.currentAct === 'act3') {
          this.state.bossHealth = this.state.bossMaxHealth;
        }
        // Re-create and enter the scene
        this.changeScene('gameplay');
        playSound('menuSelect');
      } else if (this.hitTest(tx, ty, btns.menu)) {
        this.state.isPaused = false;
        stopBgMusic();
        this.transitionTo('levelSelect');
        playSound('menuBack');
      } else if (this.hitTest(tx, ty, btns.mute)) {
        const newMuted = !getMuted();
        setMuted(newMuted);
        if (newMuted) {
          stopBgMusic();
        }
        try {
          localStorage.setItem(MUTE_KEY, String(newMuted));
        } catch { /* ignore */ }
        playSound('menuSelect');
      }
      // Consume tap so it doesn't pass through to the paused scene
      this.inputManager.clearTap();
    }
  }

  private hitTest(tx: number, ty: number, rect: { x: number; y: number; w: number; h: number }) {
    return tx >= rect.x && tx <= rect.x + rect.w && ty >= rect.y && ty <= rect.y + rect.h;
  }

  private renderPauseButton(ctx: CanvasRenderingContext2D) {
    if (!this.isGameplayScene() || this.state.actComplete || this.state.isPaused) return;

    const btn = this.getPauseBtnBounds();
    const scale = this.getScale();

    // Semi-transparent background rounded rect
    const cx = btn.x + btn.w / 2;
    const cy = btn.y + btn.h / 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.arc(cx, cy, btn.w / 2, 0, Math.PI * 2);
    ctx.fill();

    // Hamburger icon (3 horizontal lines)
    ctx.fillStyle = COLORS.gold;
    const lineW = 14 * scale;
    const lineH = 2 * scale;
    const lineGap = 4 * scale;
    const iconTop = cy - lineGap - lineH / 2;
    for (let i = 0; i < 3; i++) {
      const ly = iconTop + i * lineGap;
      ctx.beginPath();
      ctx.roundRect(cx - lineW / 2, ly, lineW, lineH, lineH / 2);
      ctx.fill();
    }

    // "MENU" label below the button
    ctx.fillStyle = COLORS.gold;
    ctx.font = `bold ${7 * scale}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.globalAlpha = 0.8;
    ctx.fillText('MENU', cx, btn.y + btn.h + 2 * scale);
    ctx.globalAlpha = 1;
  }

  private renderPauseOverlay(ctx: CanvasRenderingContext2D) {
    if (!this.state.isPaused) return;

    const w = this.width;
    const h = this.height;
    const scale = this.getScale();

    // Dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, w, h);

    // Decorative border
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4;
    const m = 25 * scale;
    ctx.strokeRect(m, m, w - m * 2, h - m * 2);
    ctx.globalAlpha = 1;

    // Title
    drawText(ctx, 'PAUSED', w / 2, h * 0.25, 28 * scale, COLORS.gold);

    // Act info
    const actNum = this.state.currentAct.replace('act', '');
    drawText(ctx, `Act ${actNum}`, w / 2, h * 0.33, 14 * scale, '#aaa');

    // Menu buttons
    const btns = this.getPauseMenuButtons(scale);

    for (const btn of [btns.resume, btns.restart, btns.menu, btns.mute]) {
      // Button background
      const isResume = btn === btns.resume;
      const isMute = btn === btns.mute;
      const grad = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h);

      if (isResume) {
        grad.addColorStop(0, 'rgba(0, 100, 50, 0.7)');
        grad.addColorStop(1, 'rgba(0, 70, 35, 0.7)');
      } else if (isMute) {
        grad.addColorStop(0, getMuted() ? 'rgba(100, 40, 40, 0.6)' : 'rgba(40, 80, 100, 0.6)');
        grad.addColorStop(1, getMuted() ? 'rgba(70, 25, 25, 0.6)' : 'rgba(25, 55, 70, 0.6)');
      } else {
        grad.addColorStop(0, 'rgba(60, 30, 60, 0.6)');
        grad.addColorStop(1, 'rgba(40, 20, 40, 0.6)');
      }
      ctx.fillStyle = grad;

      // Rounded rect
      const r = 8 * scale;
      ctx.beginPath();
      ctx.moveTo(btn.x + r, btn.y);
      ctx.lineTo(btn.x + btn.w - r, btn.y);
      ctx.arcTo(btn.x + btn.w, btn.y, btn.x + btn.w, btn.y + r, r);
      ctx.lineTo(btn.x + btn.w, btn.y + btn.h - r);
      ctx.arcTo(btn.x + btn.w, btn.y + btn.h, btn.x + btn.w - r, btn.y + btn.h, r);
      ctx.lineTo(btn.x + r, btn.y + btn.h);
      ctx.arcTo(btn.x, btn.y + btn.h, btn.x, btn.y + btn.h - r, r);
      ctx.lineTo(btn.x, btn.y + r);
      ctx.arcTo(btn.x, btn.y, btn.x + r, btn.y, r);
      ctx.closePath();
      ctx.fill();

      // Border
      ctx.strokeStyle = isResume ? COLORS.emeraldGlow : COLORS.gold;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Label
      const color = isResume ? COLORS.emeraldGlow : isMute ? (getMuted() ? '#ff9999' : '#99ccff') : '#ddd';
      drawText(ctx, btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2, 14 * scale, color);
    }

    // Hint
    ctx.globalAlpha = 0.4;
    drawText(ctx, 'Tap a button to continue', w / 2, h * 0.88, 10 * scale, '#aaa');
    ctx.globalAlpha = 1;
  }

  private loop = (timestamp: number) => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);

    let dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    // Clamp dt to prevent spiral of death
    if (dt > 0.05) dt = 0.05;
    this.dt = dt;
    this.time += dt;

    // Update input
    this.inputManager.update();

    // Handle pause input BEFORE scene update (so pause button intercepts taps)
    this.handlePauseInput();

    // Handle transition
    if (this.state.transitionDirection) {
      if (this.state.transitionDirection === 'out') {
        this.state.transitionAlpha += dt * 3;
        if (this.state.transitionAlpha >= 1) {
          this.state.transitionAlpha = 1;
          // Switch scene
          if (this.state.transitionTarget) {
            this.changeScene(this.state.transitionTarget);
            this.state.transitionTarget = null;
          }
          this.state.transitionDirection = 'in';
        }
      } else {
        this.state.transitionAlpha -= dt * 3;
        if (this.state.transitionAlpha <= 0) {
          this.state.transitionAlpha = 0;
          this.state.transitionDirection = null;
        }
      }
    }

    // Update current scene
    if (!this.state.isPaused) {
      const scene = this.scenes.get(this.state.currentScene);
      if (scene) scene.update(this, dt);
    }

    // Update particles (only if not paused)
    if (!this.state.isPaused) {
      this.particleSystem.update(dt);
    }

    // Clear and render (use canvas pixel dimensions to clear entire canvas)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const scene = this.scenes.get(this.state.currentScene);
    if (scene) scene.render(this, this.ctx);

    // Render particles (screen space)
    this.particleSystem.render(this.ctx);

    // Render pause button (on top of gameplay)
    this.renderPauseButton(this.ctx);

    // Render pause overlay (on top of everything)
    this.renderPauseOverlay(this.ctx);

    // Render transition overlay
    if (this.state.transitionAlpha > 0) {
      drawTransition(this.ctx, this.width, this.height, this.state.transitionAlpha, this.state.character);
    }

    // Clear one-frame inputs
    this.inputManager.clearTap();
    this.inputManager.clearPressed();
  };

  changeScene(sceneId: SceneId) {
    const currentScene = this.scenes.get(this.state.currentScene);
    if (currentScene) currentScene.exit(this);

    // Handle act-specific scene replacement
    if (sceneId === 'gameplay') {
      switch (this.state.currentAct) {
        case 'act1':
          this.scenes.set('gameplay', new Act1Scene());
          break;
        case 'act2':
          this.scenes.set('gameplay', new Act2Scene());
          break;
        case 'act3':
          this.scenes.set('gameplay', new Act3Scene());
          break;
        case 'act4':
          this.scenes.set('gameplay', new Act4Scene());
          break;
        case 'act5':
          this.scenes.set('gameplay', new Act5Scene());
          break;
        case 'act6':
          this.scenes.set('gameplay', new Act6Scene());
          break;
        case 'act7':
          this.scenes.set('gameplay', new Act7Scene());
          break;
        case 'act8':
          this.scenes.set('gameplay', new Act8Scene());
          break;
        case 'act9':
          this.scenes.set('gameplay', new Act9Scene());
          break;
        case 'act10':
          this.scenes.set('gameplay', new Act10Scene());
          break;
        case 'act11':
          this.scenes.set('gameplay', new Act11Scene());
          break;
        case 'act12':
          this.scenes.set('gameplay', new Act12Scene());
          break;
        case 'act13':
          this.scenes.set('gameplay', new Act13Scene());
          break;
        case 'act14':
          this.scenes.set('gameplay', new Act14Scene());
          break;
        case 'act15':
          this.scenes.set('gameplay', new Act15Scene());
          break;
      }
    }

    this.state.currentScene = sceneId;
    const newScene = this.scenes.get(sceneId);
    if (newScene) newScene.enter(this);

    this.particleSystem.clear();
  }

  transitionTo(sceneId: SceneId) {
    if (this.state.transitionDirection) return;
    this.state.transitionTarget = sceneId;
    this.state.transitionDirection = 'out';
    playSound('transitionSwoosh');
  }

  spawnParticles(config: ParticleEmitterConfig) {
    this.particleSystem.emit(config);
  }

  playSound(name: string) {
    playSound(name);
  }

  shakeCamera(intensity: number, duration: number) {
    this.camera.shakeIntensity = intensity;
    this.camera.shakeDuration = duration;
    this.camera.shakeTimer = 0;
  }

  saveGame() {
    const data: SaveData = {
      stars: this.state.stars,
      unlockedCostumes: this.state.unlockedCostumes,
      lastCompletedAct: this.state.lastCompletedAct,
      character: this.state.character,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // Storage full or unavailable
    }
  }

  loadGame(): SaveData | null {
    try {
      const json = localStorage.getItem(SAVE_KEY);
      if (json) return JSON.parse(json);
    } catch {
      // Invalid data
    }
    return null;
  }
}
