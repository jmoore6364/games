const MAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  KeyZ: 'jump', Space: 'jump',
  KeyX: 'run', ShiftLeft: 'run', ShiftRight: 'run',
  Enter: 'start', KeyM: 'mute',
};

export class Input {
  constructor() {
    this.held = {};
    this.pressedNow = {};
    window.addEventListener('keydown', (e) => {
      const a = MAP[e.code];
      if (!a) return;
      e.preventDefault();
      if (!this.held[a]) this.pressedNow[a] = true;
      this.held[a] = true;
    });
    window.addEventListener('keyup', (e) => {
      const a = MAP[e.code];
      if (!a) return;
      this.held[a] = false;
    });
    window.addEventListener('blur', () => { this.held = {}; });
  }
  down(a) { return !!this.held[a]; }
  pressed(a) { return !!this.pressedNow[a]; }
  endFrame() { this.pressedNow = {}; }
}
