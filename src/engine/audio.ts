// Procedural audio system using Web Audio API — no external files needed

let audioCtx: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean) { muted = m; }
export function getMuted(): boolean { return muted; }

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playNote(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.15, delay = 0) {
  if (muted) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
  gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration + 0.05);
}

function playChord(freqs: number[], duration: number, type: OscillatorType = 'sine', volume = 0.08, delay = 0) {
  freqs.forEach(f => playNote(f, duration, type, volume, delay));
}

// Musical note frequencies
const C4 = 261.63, D4 = 293.66, E4 = 329.63, F4 = 349.23, G4 = 392.00;
const A4 = 440.00, B4 = 493.88, C5 = 523.25, D5 = 587.33, E5 = 659.25;
const F5 = 698.46, G5 = 783.99, A5 = 880.00;
const Eb4 = 311.13, Bb4 = 466.16, Ab4 = 415.30;
const Eb5 = 622.25, Bb3 = 233.08, G3 = 196.00;
const Db4 = 277.18, Gb4 = 369.99;

export function initAudio() {
  getCtx();
}

export const sounds: Record<string, () => void> = {
  gemCollect() {
    playNote(E5, 0.12, 'sine', 0.2);
    playNote(G5, 0.15, 'sine', 0.18, 0.08);
    playNote(A5, 0.2, 'sine', 0.12, 0.16);
  },

  starCollect() {
    playNote(C5, 0.1, 'triangle', 0.2);
    playNote(E5, 0.1, 'triangle', 0.18, 0.08);
    playNote(G5, 0.1, 'triangle', 0.16, 0.16);
    playNote(C5 * 2, 0.3, 'triangle', 0.14, 0.24);
  },

  jump() {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(250, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  },

  magicBlast() {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const osc2 = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc2.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.3);
    osc2.frequency.setValueAtTime(1200, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    osc2.stop(ctx.currentTime + 0.4);
  },

  hit() {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  },

  whoosh() {
    const ctx = getCtx();
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.15);
    filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.3);
    filter.Q.value = 2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
  },

  sparkle() {
    for (let i = 0; i < 4; i++) {
      playNote(1200 + Math.random() * 2000, 0.08 + Math.random() * 0.1, 'sine', 0.05, i * 0.04);
    }
  },

  menuSelect() {
    playNote(E5, 0.08, 'sine', 0.15);
    playNote(A5, 0.12, 'sine', 0.12, 0.06);
  },

  menuBack() {
    playNote(A4, 0.08, 'sine', 0.12);
    playNote(E4, 0.12, 'sine', 0.1, 0.06);
  },

  bossHit() {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.55);
    playNote(100, 0.3, 'square', 0.08, 0.1);
  },

  victoryFanfare() {
    const notes = [C5, E5, G5, C5 * 2, G5, C5 * 2];
    const durations = [0.15, 0.15, 0.15, 0.3, 0.15, 0.5];
    let t = 0;
    notes.forEach((n, i) => {
      playNote(n, durations[i] + 0.1, 'triangle', 0.15, t);
      t += durations[i];
    });
  },

  actComplete() {
    const progression = [
      [C4, E4, G4], [F4, A4, C5], [G4, B4, D5], [C4, E4, G4, C5]
    ];
    progression.forEach((chord, i) => {
      playChord(chord, 0.6, 'triangle', 0.06, i * 0.5);
    });
  },

  elphabaMagic() {
    // Minor key mysterious chime
    playNote(Eb4, 0.2, 'triangle', 0.12);
    playNote(G4, 0.2, 'triangle', 0.1, 0.1);
    playNote(Bb4, 0.25, 'triangle', 0.08, 0.2);
  },

  glindaMagic() {
    // Bright sparkly bell
    playNote(E5, 0.15, 'sine', 0.15);
    playNote(G5, 0.15, 'sine', 0.12, 0.05);
    playNote(A5, 0.2, 'sine', 0.1, 0.1);
    playNote(E5 * 2, 0.25, 'sine', 0.08, 0.15);
  },

  transitionSwoosh() {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.3);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.6);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.65);
  },

  powerUp() {
    const notes = [C4, E4, G4, C5, E5];
    notes.forEach((n, i) => {
      playNote(n, 0.15, 'triangle', 0.1, i * 0.06);
    });
  },

  switchActivate() {
    playNote(G4, 0.1, 'square', 0.08);
    playNote(C5, 0.2, 'square', 0.06, 0.1);
  },

  catchItem() {
    playNote(A5, 0.1, 'sine', 0.18);
    playNote(C5 * 2, 0.15, 'sine', 0.14, 0.06);
  },

  crumble() {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  },

  doorOpen() {
    const notes = [C4, E4, G4, C5];
    notes.forEach((n, i) => {
      playNote(n, 0.25, 'triangle', 0.1, i * 0.1);
    });
  },

  gravityFlip() {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.22);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  },

  rhythmPerfect() {
    playNote(C5, 0.08, 'triangle', 0.2);
    playNote(E5, 0.1, 'triangle', 0.18, 0.06);
    playNote(G5, 0.15, 'triangle', 0.15, 0.12);
  },

  rhythmGood() {
    playNote(G4, 0.15, 'triangle', 0.12);
  },

  characterSwitch() {
    playNote(A4, 0.07, 'sine', 0.1);
    playNote(Bb4, 0.07, 'sine', 0.1, 0.05);
  },
};

// Background music system
let bgMusicInterval: number | null = null;
let currentBgMusic: string | null = null;

const bgMusicPatterns: Record<string, { notes: number[][]; tempo: number; type: OscillatorType; vol: number }> = {
  elphaba_fly: {
    notes: [
      [Eb4, G3], [0], [Bb3], [0],
      [Eb4], [0], [G4, Bb3], [0],
      [Ab4, Eb4], [0], [G4], [Eb4],
      [Bb4], [Ab4], [G4], [0],
    ],
    tempo: 220,
    type: 'triangle',
    vol: 0.04,
  },
  glinda_fly: {
    notes: [
      [E5, C4], [G5], [A5, E4], [G5],
      [E5, C4], [0], [D5, G3], [0],
      [C5, A4], [E5], [G5, C4], [E5],
      [A5], [G5], [E5], [0],
    ],
    tempo: 200,
    type: 'sine',
    vol: 0.04,
  },
  platformer: {
    notes: [
      [C4, E4], [0], [G4], [0],
      [A4, C4], [0], [G4], [E4],
      [F4, A4], [0], [E4], [D4],
      [C4, G4], [0], [0], [0],
    ],
    tempo: 250,
    type: 'triangle',
    vol: 0.035,
  },
  boss: {
    notes: [
      [Eb4, Bb3], [0], [Eb4], [G4],
      [Ab4, Eb4], [0], [G4], [0],
      [Bb4, G4], [Ab4], [G4], [Eb4],
      [Bb3], [0], [Eb4, G4], [0],
    ],
    tempo: 180,
    type: 'sawtooth',
    vol: 0.03,
  },
  victory: {
    notes: [
      [C5, E4, G4], [0], [E5, G4], [0],
      [G5, C5, E4], [0], [E5], [C5],
      [F5, A4, C5], [0], [E5], [D5],
      [C5, E4, G4], [0], [0], [0],
    ],
    tempo: 300,
    type: 'sine',
    vol: 0.035,
  },
  popular: {
    notes: [
      [E5, C4], [G5], [A5, E4], [G5],
      [E5], [C5, G4], [D5], [E5],
      [F5, A4], [E5], [D5, G4], [C5],
      [E5, C4], [G5], [A5], [0],
    ],
    tempo: 180,
    type: 'sine',
    vol: 0.04,
  },
  dance: {
    notes: [
      [C5, E4], [0], [G4],
      [A4, C5], [0], [E4],
      [F4, A4], [0], [C5],
      [G4, B4], [0], [D5],
      [C5, E4], [0], [G4],
      [A4], [0], [0],
    ],
    tempo: 280,
    type: 'triangle',
    vol: 0.035,
  },
  escape: {
    notes: [
      [Eb4, Bb3], [Eb4], [G4], [Eb4],
      [Ab4, Eb4], [G4], [Bb4], [Ab4],
      [G4, Eb4], [Bb4], [Eb5], [Bb4],
      [Ab4], [G4], [Eb4], [0],
    ],
    tempo: 160,
    type: 'sawtooth',
    vol: 0.03,
  },
  wizard: {
    notes: [
      [F4, C4], [0], [A4], [0],
      [C5], [Bb4], [A4], [0],
      [G4, C4], [0], [F4], [0],
      [A4], [G4], [F4], [C4],
    ],
    tempo: 240,
    type: 'square',
    vol: 0.03,
  },
  feeling: {
    notes: [
      [Bb3, F4], [0], [Db4], [Eb4],
      [F4, Bb3], [Ab4], [Gb4], [0],
      [Eb4, Bb3], [0], [F4], [0],
      [Bb4], [Ab4], [Gb4], [Eb4],
    ],
    tempo: 190,
    type: 'sine',
    vol: 0.035,
  },
  finale: {
    notes: [
      [G4, B4], [D5], [0], [G5],
      [0], [E5], [D5], [0],
      [C5, E4], [0], [B4], [D5],
      [G4, D4], [0], [0], [0],
    ],
    tempo: 130,
    type: 'triangle',
    vol: 0.04,
  },
  oneShortDay: {
    notes: [
      [C5, E5], [0], [G5], [E5],
      [F5], [0], [D5], [0],
      [E5, C5], [G5], [0], [A5],
      [G5], [E5], [0], [0],
    ],
    tempo: 220,
    type: 'sine',
    vol: 0.04,
  },
  wonderful: {
    notes: [
      [Eb4], [0], [Gb4], [0],
      [Bb4], [0], [Db4], [0],
      [Eb4, Gb4], [0], [0], [Ab4],
      [0], [Gb4], [Eb4], [0],
    ],
    tempo: 210,
    type: 'square',
    vol: 0.03,
  },
  noGoodDeed: {
    notes: [
      [Eb4, Bb3], [0], [Gb4], [Eb4],
      [Db4], [0], [Bb3], [Eb4],
      [Gb4, Bb4], [0], [Ab4], [0],
      [Gb4], [Eb4], [Db4], [0],
    ],
    tempo: 160,
    type: 'sawtooth',
    vol: 0.03,
  },
  asLongAsYoureMine: {
    notes: [
      [E4, G4], [0], [A4], [B4],
      [0], [A4], [G4], [0],
      [E4, B4], [0], [A4], [0],
      [G4], [0], [E4], [0],
    ],
    tempo: 280,
    type: 'sine',
    vol: 0.035,
  },
  marchHunters: {
    notes: [
      [Eb4], [Eb4], [Bb3], [0],
      [Db4], [Db4], [Ab4], [0],
      [Eb4, Gb4], [0], [Bb3], [Bb3],
      [Db4], [0], [Eb4], [0],
    ],
    tempo: 200,
    type: 'sawtooth',
    vol: 0.03,
  },
  thankGoodness: {
    notes: [
      [C5, E5], [G5], [0], [E5],
      [F5, A5], [0], [G5], [E5],
      [C5, G5], [0], [A5], [0],
      [G5, E5], [0], [C5], [0],
    ],
    tempo: 190,
    type: 'triangle',
    vol: 0.04,
  },
};

export function startBgMusic(name: string) {
  if (currentBgMusic === name) return;
  stopBgMusic();
  currentBgMusic = name;
  const pattern = bgMusicPatterns[name];
  if (!pattern) return;

  let step = 0;
  bgMusicInterval = window.setInterval(() => {
    const noteGroup = pattern.notes[step % pattern.notes.length];
    if (noteGroup[0] !== 0) {
      noteGroup.forEach(n => {
        playNote(n, pattern.tempo / 1000 * 1.5, pattern.type, pattern.vol);
      });
    }
    step++;
  }, pattern.tempo);
}

export function stopBgMusic() {
  if (bgMusicInterval !== null) {
    clearInterval(bgMusicInterval);
    bgMusicInterval = null;
  }
  currentBgMusic = null;
}

export function playSound(name: string) {
  try {
    const fn = sounds[name];
    if (fn) fn();
  } catch {
    // Audio not available, ignore
  }
}
