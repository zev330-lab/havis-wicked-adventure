// Core type definitions for Havi's Wicked Adventure

export type Character = 'elphaba' | 'glinda';
export type ActId = 'act1' | 'act2' | 'act3';
export type SceneId = 'splash' | 'characterSelect' | 'levelSelect' | 'storyCard' | 'gameplay' | 'victory' | 'pause';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Circle {
  x: number;
  y: number;
  r: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface GameState {
  currentScene: SceneId;
  character: Character | null;
  currentAct: ActId;
  score: number;
  gems: number;
  health: number;
  maxHealth: number;
  stars: Record<ActId, number>;
  unlockedCostumes: string[];
  lastCompletedAct: ActId | null;
  storyCardIndex: number;
  isPaused: boolean;
  levelTime: number;
  noHitBonus: boolean;
  bossHealth: number;
  bossMaxHealth: number;
  actComplete: boolean;
  transitionAlpha: number;
  transitionDirection: 'in' | 'out' | null;
  transitionTarget: SceneId | null;
}

export interface SaveData {
  stars: Record<ActId, number>;
  unlockedCostumes: string[];
  lastCompletedAct: ActId | null;
  character: Character | null;
}

export interface InputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  jumpPressed: boolean;
  action: boolean;
  actionPressed: boolean;
  tap: boolean;
  tapX: number;
  tapY: number;
  touchX: number;
  touchY: number;
  isTouching: boolean;
  tiltX: number;
  tiltY: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  sizeEnd: number;
  color: Color;
  colorEnd?: Color;
  rotation: number;
  rotationSpeed: number;
  shape: 'circle' | 'star' | 'note' | 'sparkle' | 'square' | 'diamond';
  gravity: number;
  alpha: number;
  alphaEnd: number;
}

export interface ParticleEmitterConfig {
  x: number;
  y: number;
  count: number;
  spread: number;
  speed: number;
  speedVariance: number;
  life: number;
  lifeVariance: number;
  size: number;
  sizeEnd: number;
  sizeVariance: number;
  color: Color;
  colorEnd?: Color;
  shape: Particle['shape'];
  gravity: number;
  angle?: number;
  angleVariance?: number;
  alpha?: number;
  alphaEnd?: number;
  rotationSpeed?: number;
}

export interface Entity {
  id: string;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  active: boolean;
  data: Record<string, any>;
}

export interface LevelConfig {
  act: ActId;
  width: number;
  height: number;
  platforms: { x: number; y: number; w: number; h: number; type?: string }[];
  gems: { x: number; y: number; type?: string }[];
  enemies: { x: number; y: number; type: string; data?: Record<string, any> }[];
  npcs: { x: number; y: number; message: string }[];
  switches: { x: number; y: number; gateId: string }[];
  gates: { id: string; x: number; y: number; w: number; h: number }[];
  playerStart: Vec2;
  goal: Vec2;
  background: string;
}

export interface CameraState {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  shakeX: number;
  shakeY: number;
  shakeIntensity: number;
  shakeDuration: number;
  shakeTimer: number;
  zoom: number;
}

export interface Scene {
  enter(game: GameEngine): void;
  exit(game: GameEngine): void;
  update(game: GameEngine, dt: number): void;
  render(game: GameEngine, ctx: CanvasRenderingContext2D): void;
  handleTap?(game: GameEngine, x: number, y: number): void;
}

export interface GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  state: GameState;
  input: InputState;
  camera: CameraState;
  particles: Particle[];
  dt: number;
  time: number;
  scenes: Map<SceneId, Scene>;
  saveGame(): void;
  loadGame(): SaveData | null;
  changeScene(sceneId: SceneId): void;
  transitionTo(sceneId: SceneId): void;
  spawnParticles(config: ParticleEmitterConfig): void;
  playSound(name: string): void;
  shakeCamera(intensity: number, duration: number): void;
  getScale(): number;
}
