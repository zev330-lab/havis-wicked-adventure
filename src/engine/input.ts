// Input handling — touch, keyboard, and device orientation
import { InputState } from './types';

export function createInputState(): InputState {
  return {
    left: false, right: false, up: false, down: false,
    jump: false, jumpPressed: false,
    action: false, actionPressed: false,
    tap: false, tapX: 0, tapY: 0,
    touchX: 0, touchY: 0, isTouching: false,
    tiltX: 0, tiltY: 0,
  };
}

export class InputManager {
  state: InputState;
  private canvas: HTMLCanvasElement;
  private keys = new Set<string>();
  private prevKeys = new Set<string>();
  private touchStartX = 0;
  private touchStartY = 0;
  private tapThreshold = 15;
  private prevTouchState = false;
  private prevJump = false;
  private prevAction = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.state = createInputState();
    this.setupKeyboard();
    this.setupTouch();
    this.setupOrientation();
  }

  private setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key);
      // Prevent scrolling
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
    });
    // Clear on blur
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
  }

  private setupTouch() {
    // Convert touch position to game coordinates (CSS pixels, matching game.width/height)
    const getCanvasPos = (touch: Touch) => {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    };

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const pos = getCanvasPos(touch);
      this.touchStartX = pos.x;
      this.touchStartY = pos.y;
      this.state.touchX = pos.x;
      this.state.touchY = pos.y;
      this.state.isTouching = true;
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const pos = getCanvasPos(touch);
      this.state.touchX = pos.x;
      this.state.touchY = pos.y;
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      const dx = this.state.touchX - this.touchStartX;
      const dy = this.state.touchY - this.touchStartY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.tapThreshold) {
        this.state.tap = true;
        this.state.tapX = this.state.touchX;
        this.state.tapY = this.state.touchY;
      }
      this.state.isTouching = false;
    }, { passive: false });

    // Prevent default on canvas
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  private setupOrientation() {
    if (typeof DeviceOrientationEvent !== 'undefined') {
      const requestPermission = (DeviceOrientationEvent as any).requestPermission;
      if (typeof requestPermission === 'function') {
        // iOS 13+ requires permission
        this.canvas.addEventListener('touchstart', () => {
          requestPermission().then((response: string) => {
            if (response === 'granted') {
              window.addEventListener('deviceorientation', (e) => this.handleOrientation(e));
            }
          }).catch(() => {});
        }, { once: true });
      } else {
        window.addEventListener('deviceorientation', (e) => this.handleOrientation(e));
      }
    }
  }

  private handleOrientation(e: DeviceOrientationEvent) {
    if (e.gamma !== null) this.state.tiltX = Math.max(-1, Math.min(1, e.gamma / 45));
    if (e.beta !== null) this.state.tiltY = Math.max(-1, Math.min(1, (e.beta - 45) / 45));
  }

  update() {
    // Keyboard mapping
    this.state.left = this.keys.has('ArrowLeft') || this.keys.has('a');
    this.state.right = this.keys.has('ArrowRight') || this.keys.has('d');
    this.state.up = this.keys.has('ArrowUp') || this.keys.has('w');
    this.state.down = this.keys.has('ArrowDown') || this.keys.has('s');

    const jumpNow = this.keys.has(' ') || this.keys.has('ArrowUp') || this.keys.has('w');
    this.state.jumpPressed = jumpNow && !this.prevJump;
    this.state.jump = jumpNow;
    this.prevJump = jumpNow;

    const actionNow = this.keys.has('x') || this.keys.has('z') || this.keys.has('Enter');
    this.state.actionPressed = actionNow && !this.prevAction;
    this.state.action = actionNow;
    this.prevAction = actionNow;

    // Touch input is handled directly by scenes using touchX/touchY/isTouching
    // We just detect jumpPressed on new touch
    if (this.state.isTouching && !this.prevTouchState) {
      this.state.jumpPressed = true;
    }

    this.prevTouchState = this.state.isTouching;
    this.prevKeys = new Set(this.keys);
  }

  clearTap() {
    this.state.tap = false;
  }

  clearPressed() {
    this.state.jumpPressed = false;
    this.state.actionPressed = false;
  }

  destroy() {
    // Cleanup would go here
  }
}
