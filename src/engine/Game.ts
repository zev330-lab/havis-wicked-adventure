// Main game engine — ties everything together
import {
  GameState, GameEngine, SceneId, Scene,
  CameraState, InputState, Particle, SaveData,
  ParticleEmitterConfig, ActId,
} from './types';
import { InputManager } from './input';
import { ParticleSystem, particlePresets } from './particles';
import { playSound, initAudio, startBgMusic, stopBgMusic } from './audio';
import { drawTransition } from './renderer';

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
import { VictoryScene } from '../scenes/Victory';

const SAVE_KEY = 'havis-wicked-adventure-save';

function createInitialState(): GameState {
  return {
    currentScene: 'splash',
    character: null,
    currentAct: 'act1',
    score: 0,
    gems: 0,
    health: 3,
    maxHealth: 3,
    stars: { act1: 0, act2: 0, act3: 0, act4: 0, act5: 0, act6: 0, act7: 0, act8: 0, act9: 0 },
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

    // Update particles
    this.particleSystem.update(dt);

    // Clear and render (use canvas pixel dimensions to clear entire canvas)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const scene = this.scenes.get(this.state.currentScene);
    if (scene) scene.render(this, this.ctx);

    // Render particles (screen space)
    this.particleSystem.render(this.ctx);

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
