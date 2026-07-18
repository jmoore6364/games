// Moore-Out!! — main loop, screens, career mode.

import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import { Fight } from './fight.js';
import { OPPONENTS } from './opponents.js';
import { drawPortrait, drawPlayer, drawTrainer } from './sprites.js';

const VIEW_W = 256, VIEW_H = 240;
const SAVE_KEY = 'moore-out-save';
const TEST = location.search.includes('test=1');

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function fitCanvas() {
  const s = Math.max(1, Math.floor(Math.min(window.innerWidth / VIEW_W, window.innerHeight / VIEW_H) * 2) / 2);
  canvas.style.width = `${Math.floor(VIEW_W * s)}px`;
  canvas.style.height = `${Math.floor(VIEW_H * s)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

function text(c, str, x, y, color = '#fff', size = 8, align = 'left') {
  c.font = `${size}px monospace`;
  c.textAlign = align;
  c.textBaseline = 'top';
  c.fillStyle = color;
  c.fillText(str, x, y);
}

function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && typeof s.beat === 'number') return { beat: s.beat, w: s.w | 0, l: s.l | 0, ko: s.ko | 0 };
  } catch { /* fresh save */ }
  return { beat: 0, w: 0, l: 0, ko: 0 };
}
function storeSave(s) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* private mode */ }
}

class Game {
  constructor() {
    this.input = new Input();
    this.touch = initTouch(this.input);
    this.sound = new Sound();
    this.state = 'title';
    this.frame = 0;
    this.save = loadSave();
    this.sel = 0;
    this.fight = null;
    this.paused = false;
    this.stateT = 0;
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  setState(s) { this.state = s; this.stateT = 0; }

  // ---------------- title ----------------

  updateTitle() {
    this.sound.playMusic('title');
    const inp = this.input;
    if (inp.pressed('start') || inp.pressed('lpunch') || inp.pressed('rpunch')) {
      this.sound.confirm();
      this.sel = Math.min(this.save.beat, OPPONENTS.length - 1);
      this.setState('career');
    }
  }

  drawTitle() {
    ctx.fillStyle = '#080810';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // spotlight cone
    ctx.fillStyle = 'rgba(248,216,56,0.06)';
    ctx.beginPath(); ctx.moveTo(128, 0); ctx.lineTo(40, 240); ctx.lineTo(216, 240); ctx.closePath(); ctx.fill();
    // marquee bulbs
    for (let i = 0; i < 30; i++) {
      const on = (i + (this.frame >> 4)) % 3 === 0;
      ctx.fillStyle = on ? '#f8d838' : '#584818';
      ctx.fillRect(8 + i * 8, 8, 4, 4);
      ctx.fillRect(8 + i * 8, 228, 4, 4);
    }
    text(ctx, 'MOORE', 128, 34, '#f8d838', 34, 'center');
    text(ctx, '- OUT!! -', 128, 68, '#f85858', 20, 'center');
    text(ctx, 'PATTERN BOXING CHAMPIONSHIP', 128, 96, '#99a', 8, 'center');

    // the champ silhouette + little moore
    drawPortrait(ctx, OPPONENTS[4].cfg, 128, 138, 1.2, 'grin', this.frame);
    drawPlayer(ctx, { pose: 'idle', alpha: 0.95, oy: 14 }, this.frame);

    if (this.frame % 60 < 40) {
      text(ctx, this.touch ? 'TAP MENU TO START' : 'PUSH ENTER', 128, 196, '#f8f8f8', 10, 'center');
    }
    text(ctx, `RECORD ${this.save.w}-${this.save.l}  ${this.save.ko} KO`, 128, 214, '#556', 8, 'center');
  }

  // ---------------- career ----------------

  updateCareer() {
    this.sound.playMusic('career');
    const inp = this.input;
    const maxSel = Math.min(this.save.beat, OPPONENTS.length - 1);
    if (inp.pressed('up')) { this.sel = Math.max(0, this.sel - 1); this.sound.select(); }
    if (inp.pressed('down')) { this.sel = Math.min(maxSel, this.sel + 1); this.sound.select(); }
    if (inp.pressed('start') || inp.pressed('lpunch') || inp.pressed('rpunch')) {
      this.sound.confirm();
      this.setState('vscard');
    }
  }

  drawCareer() {
    ctx.fillStyle = '#0c0c18';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'CAREER', 128, 10, '#f8d838', 14, 'center');
    text(ctx, `RECORD ${this.save.w}-${this.save.l} (${this.save.ko} KO)`, 128, 28, '#99a', 8, 'center');
    OPPONENTS.forEach((o, i) => {
      const y = 48 + i * 32;
      const locked = i > this.save.beat;
      const beaten = i < this.save.beat;
      if (i === this.sel && !locked) {
        ctx.fillStyle = 'rgba(248,216,56,0.12)';
        ctx.fillRect(10, y - 4, 236, 28);
        text(ctx, '▶', 16, y + 4, '#f8d838', 10);
      }
      if (!locked) drawPortrait(ctx, o.cfg, 46, y + 10, 0.42, beaten ? 'idle' : 'angry', this.frame);
      else {
        ctx.fillStyle = '#222232'; ctx.fillRect(34, y - 2, 24, 24);
        text(ctx, '?', 46, y + 4, '#556', 12, 'center');
      }
      text(ctx, locked ? '???????' : o.name, 66, y, locked ? '#556' : '#f8f8f8', 9);
      text(ctx, o.circuit, 66, y + 12, '#667', 7);
      if (beaten) text(ctx, 'WON', 240, y + 4, '#48d858', 8, 'right');
      else if (i === this.save.beat) text(ctx, i === 4 ? 'TITLE' : 'NEXT', 240, y + 4, '#f8d838', 8, 'right');
    });
    if (this.save.beat >= OPPONENTS.length) {
      text(ctx, '★ YOU ARE THE CHAMPION ★', 128, 214, '#f8d838', 9, 'center');
    } else if (this.frame % 60 < 40) {
      text(ctx, 'ENTER: FIGHT', 128, 218, '#99a', 8, 'center');
    }
  }

  // ---------------- VS card ----------------

  updateVsCard() {
    this.sound.stopMusic();
    const inp = this.input;
    if (this.stateT > 30 && (inp.pressed('start') || inp.pressed('lpunch') || inp.pressed('rpunch'))) {
      this.startFight();
    }
    if (this.stateT > 480) this.startFight();
  }

  startFight() {
    this.sound.confirm();
    this.fight = new Fight(this.sound, this.sel, TEST ? 12345 : (Date.now() & 0xffff));
    this.paused = false;
    this.setState('fight');
    this.sound.playMusic(this.sel === 4 ? 'champ' : 'fight');
  }

  drawVsCard() {
    const o = OPPONENTS[this.sel];
    ctx.fillStyle = '#101020';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#182038';
    ctx.fillRect(0, 0, 128, VIEW_H);
    text(ctx, o.circuit, 128, 8, '#f8d838', 9, 'center');

    // little moore side
    drawPlayer(ctx, { pose: 'idle', alpha: 1, ox: -64, oy: -80 }, this.frame);
    text(ctx, 'LITTLE MOORE', 64, 172, '#88e898', 8, 'center');
    text(ctx, 'BRONX, USA', 64, 184, '#667', 7, 'center');

    text(ctx, 'VS', 128, 104, '#f85858', 22, 'center');

    // opponent side
    drawPortrait(ctx, o.cfg, 192, 90, 1.1, 'angry', this.frame);
    text(ctx, o.name, 192, 150, '#f8f8f8', 9, 'center');
    text(ctx, o.tag, 192, 162, '#667', 7, 'center');

    // taunt quote
    ctx.fillStyle = '#f8f8f8';
    ctx.fillRect(16, 186, 224, 26);
    const q = `"${o.quote}"`;
    ctx.font = '7px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#101010';
    if (q.length > 38) {
      const mid = q.lastIndexOf(' ', 38);
      ctx.fillText(q.slice(0, mid), 128, 190);
      ctx.fillText(q.slice(mid + 1), 128, 200);
    } else ctx.fillText(q, 128, 194);

    if (this.frame % 60 < 40) text(ctx, 'PUSH ENTER', 128, 222, '#99a', 8, 'center');
  }

  // ---------------- fight ----------------

  updateFightState() {
    const f = this.fight;
    const inp = this.input;
    if (f.phase === 'fight' && inp.pressed('start')) {
      this.paused = !this.paused;
      this.sound.pause();
    }
    if (!this.paused) f.update(inp);

    // music cues
    if (f.phase === 'over' && !this.musicStopped) {
      this.sound.stopMusic();
      this.musicStopped = true;
    }

    if (f.phase === 'over' && f.overT > 60 && (inp.pressed('start') || f.overT > 600)) {
      this.musicStopped = false;
      const won = f.result.win;
      if (won) {
        this.save.w++;
        if (f.result.method !== 'DECISION') this.save.ko++;
        const wasTitle = this.sel === OPPONENTS.length - 1 && this.save.beat === OPPONENTS.length - 1;
        if (this.sel === this.save.beat) this.save.beat++;
        storeSave(this.save);
        this.wasTitleWin = wasTitle;
        this.setState('victory');
        this.sound.playMusic('victory');
      } else {
        this.save.l++;
        storeSave(this.save);
        this.setState('defeat');
        this.sound.stopMusic();
      }
    }
  }

  drawFightState() {
    this.fight.draw(ctx, this.frame);
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      text(ctx, 'PAUSE', 128, 110, '#f8f8f8', 14, 'center');
    }
  }

  // ---------------- victory / defeat ----------------

  updateVictory() {
    const inp = this.input;
    if (this.stateT > 40 && (inp.pressed('start') || inp.pressed('lpunch') || inp.pressed('rpunch'))) {
      this.sound.confirm();
      if (this.wasTitleWin) { this.setState('credits'); this.sound.playMusic('credits'); }
      else { this.sel = Math.min(this.save.beat, OPPONENTS.length - 1); this.setState('career'); }
    }
  }

  drawVictory() {
    const o = OPPONENTS[this.sel];
    const f = this.fight;
    ctx.fillStyle = '#080814';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // confetti
    for (let i = 0; i < 60; i++) {
      const x = (i * 41 + this.frame * (1 + (i % 3))) % VIEW_W;
      const y = (i * 67 + this.frame * (2 + (i % 2))) % VIEW_H;
      ctx.fillStyle = ['#f8d838', '#f85858', '#48d858', '#4878e8'][i % 4];
      ctx.fillRect(x, y, 2, 3);
    }
    text(ctx, 'WINNER!!', 128, 22, '#f8d838', 22, 'center');
    text(ctx, `BY ${f.result.method}`, 128, 48, '#f8f8f8', 10, 'center');

    // championship belt
    ctx.fillStyle = '#8a6018'; ctx.fillRect(58, 96, 140, 22);
    ctx.fillStyle = '#f8d838'; ctx.beginPath(); ctx.arc(128, 107, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b89020'; ctx.beginPath(); ctx.arc(128, 107, 14, 0, Math.PI * 2); ctx.fill();
    text(ctx, 'MO', 128, 102, '#f8f8f8', 10, 'center');
    ctx.fillStyle = '#f8d838';
    ctx.fillRect(70, 100, 12, 12); ctx.fillRect(174, 100, 12, 12);

    text(ctx, `${o.name} DEFEATED`, 128, 138, '#f8f8f8', 9, 'center');
    text(ctx, o.circuit + (this.wasTitleWin ? ' — CHAMPION!' : ' ADVANCES'), 128, 152, '#88e898', 8, 'center');
    text(ctx, `SCORE ${f.player.score}`, 128, 168, '#f8d838', 8, 'center');
    text(ctx, `RECORD ${this.save.w}-${this.save.l} (${this.save.ko} KO)`, 128, 182, '#99a', 8, 'center');
    if (this.frame % 60 < 40) text(ctx, 'PUSH ENTER', 128, 214, '#f8f8f8', 8, 'center');
  }

  updateDefeat() {
    const inp = this.input;
    if (this.stateT > 40) {
      if (inp.pressed('start') || inp.pressed('lpunch') || inp.pressed('rpunch')) {
        this.sound.confirm();
        this.setState('vscard'); // rematch
      }
      if (inp.pressed('down') || inp.pressed('left')) {
        this.sound.select();
        this.setState('career');
      }
    }
  }

  drawDefeat() {
    const o = OPPONENTS[this.sel];
    ctx.fillStyle = '#0a0608';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawPortrait(ctx, o.cfg, 128, 84, 1.0, 'grin', this.frame);
    text(ctx, 'YOU LOST...', 128, 20, '#f85858', 16, 'center');
    text(ctx, `${o.name} KEEPS SMILING`, 128, 136, '#99a', 8, 'center');
    text(ctx, 'MOORE LOUIS: "GET BACK IN THERE,', 24, 158, '#88e898', 8);
    text(ctx, 'KID. YOU KNOW HIS PATTERN NOW."', 24, 170, '#88e898', 8);
    if (this.frame % 60 < 40) text(ctx, 'ENTER: REMATCH   ↓: CAREER', 128, 206, '#f8f8f8', 8, 'center');
  }

  // ---------------- credits ----------------

  updateCredits() {
    const inp = this.input;
    if (this.stateT > 120 && inp.pressed('start')) {
      this.sound.stopMusic();
      this.setState('title');
    }
  }

  drawCredits() {
    ctx.fillStyle = '#060610';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const lines = [
      ['MOORE-OUT!!', '#f8d838', 14],
      ['', '', 8],
      ['A MOORE ARCADE PRODUCTION', '#f8f8f8', 8],
      ['', '', 8],
      ['STARRING', '#99a', 8],
      ['LITTLE MOORE', '#88e898', 9],
      ['', '', 8],
      ['THE CIRCUIT', '#99a', 8],
      ...OPPONENTS.map((o) => [o.name, '#f8f8f8', 8]),
      ['', '', 8],
      ['REFEREE', '#99a', 8],
      ['MOORE MARIO', '#f8f8f8', 8],
      ['CORNER MAN', '#99a', 8],
      ['MOORE LOUIS', '#f8f8f8', 8],
      ['', '', 8],
      ['CROWD NOISE', '#99a', 8],
      ['1 BANDPASS FILTER', '#f8f8f8', 8],
      ['', '', 8],
      ['YOU ARE THE CHAMPION.', '#f8d838', 10],
      ['THANKS FOR PLAYING!', '#f8d838', 10],
    ];
    let y = 240 - this.stateT / 2 + 40;
    for (const [str, col, size] of lines) {
      if (str && y > -20 && y < 250) text(ctx, str, 128, y, col, size, 'center');
      y += 16;
    }
    if (y < 120 && this.frame % 60 < 40) {
      text(ctx, 'PUSH ENTER', 128, 200, '#f8f8f8', 8, 'center');
    }
    // trainer + player at the bottom celebrating
    drawTrainer(ctx, 36, 232);
    drawPlayer(ctx, { pose: 'idle', alpha: 1, ox: 60, oy: 0 }, this.frame);
  }

  // ---------------- frame ----------------

  tick() {
    this.frame++;
    this.stateT++;
    this.input.pollGamepad();
    if (this.input.pressed('mute')) this.sound.toggleMute();
    this.sound.updateMusic();
    if (this.state !== 'fight') this.sound.setCrowd(0);

    switch (this.state) {
      case 'title': this.updateTitle(); this.drawTitle(); break;
      case 'career': this.updateCareer(); this.drawCareer(); break;
      case 'vscard': this.updateVsCard(); this.drawVsCard(); break;
      case 'fight': this.updateFightState(); this.drawFightState(); break;
      case 'victory': this.updateVictory(); this.drawVictory(); break;
      case 'defeat': this.updateDefeat(); this.drawDefeat(); break;
      case 'credits': this.updateCredits(); this.drawCredits(); break;
    }
    this.input.endFrame();
  }
}

const game = new Game();
window.__game = game; // for smoke tests

if (TEST) {
  // deterministic manual stepping for the smoke tests
  window.__tick = (n = 1) => { for (let i = 0; i < n; i++) game.tick(); };
  game.tick(); // draw first frame
} else {
  let last = 0;
  function loop(ts) {
    requestAnimationFrame(loop);
    if (ts - last < 1000 / 61) return;
    last = ts;
    game.tick();
  }
  requestAnimationFrame(loop);
}
