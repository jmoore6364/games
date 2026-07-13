import { Game, W, H } from './game.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { setupTouch } from './touch.js';

const canvas = document.getElementById('game');
canvas.width = W;
canvas.height = H;

const input = new Input();
const sound = new Sound();
setupTouch(input);
const game = new Game(canvas, input, sound);
window.__game = game; // debug/test hook

// audio contexts need a user gesture
const kick = () => sound.ensure();
window.addEventListener('keydown', kick, { once: true });
window.addEventListener('pointerdown', kick, { once: true });

// letterbox scaling
function resize() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = `${Math.floor(W * scale)}px`;
  canvas.style.height = `${Math.floor(H * scale)}px`;
}
window.addEventListener('resize', resize);
resize();

// fixed-timestep loop
const STEP = 1 / 60;
let last = performance.now();
let acc = 0;
function frame(now) {
  acc += Math.min(0.25, (now - last) / 1000);
  last = now;
  while (acc >= STEP) {
    game.update(STEP);
    acc -= STEP;
  }
  game.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
