import { Input } from './input.js';
import { initTouch } from './touch.js';
import { sound } from './audio.js';
import { initSprites, SPR, TILES, drawText } from './sprites.js';
import { LEVELS, LEVEL_NAMES, TILE, ROWS, T, tileAt, setTile } from './level.js';
import {
  Player, Goomba, Koopa, Mushroom, FireFlower, CoinPop, Fireball, Shard, Popup, Star,
  Piranha, Puff, FireBar, Boss, Enemy, overlaps,
} from './entities.js';

const W = 256, H = 240;
const canvas = document.getElementById('game');
const g = canvas.getContext('2d');
g.imageSmoothingEnabled = false;

function fitCanvas() {
  // integer scaling for crispness on big screens; fractional fill on phones
  const raw = Math.min(window.innerWidth / W, (window.innerHeight - 8) / H);
  const scale = raw >= 2 ? Math.floor(raw) : Math.max(0.75, raw);
  canvas.style.width = W * scale + 'px';
  canvas.style.height = H * scale + 'px';
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

initSprites();
const input = new Input();
initTouch(input);

// iOS/Android require AudioContext creation inside a real gesture handler
for (const ev of ['pointerdown', 'touchstart', 'keydown']) {
  window.addEventListener(ev, () => sound.unlock(), { passive: true });
}

// ------------------------------------------------------------------ game ----

const game = {
  state: 'title', // title | play | pause | clear | won | gameover
  level: null,
  levelIdx: 0,
  player: null,
  entities: [],
  popups: [],
  bumps: [],       // animated block bounces {tx, ty, t}
  spawnIdx: 0,
  cam: 0,
  score: 0,
  coins: 0,
  lives: 3,
  time: 400,
  frame: 0,
  timeWarned: false,
  clearTimer: 0,
  deathHandled: false,
  highScore: +(localStorage.getItem('smb-highscore') || 0),

  saveHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('smb-highscore', String(this.highScore));
    }
  },

  addScore(n, x, y) {
    this.score += n;
    if (x !== undefined) this.popups.push(new Popup(n, x, y - 8));
  },

  addCoin(x, y) {
    this.coins++;
    this.addScore(200, x, y);
    sound.coin();
    if (this.coins >= 100) {
      this.coins -= 100;
      this.lives++;
      sound.oneUp();
      this.popups.push(new Popup('1UP!', x, y - 16));
    }
  },

  onPlayerDeath() { this.deathHandled = false; },

  bumpTile(tx, ty, player) {
    const t = tileAt(this.level, tx, ty);
    if (t === T.Q || t === T.QM) {
      setTile(this.level, tx, ty, T.USED);
      this.bumps.push({ tx, ty, t: 0 });
      if (t === T.Q) {
        this.entities.push(new CoinPop(tx, ty - 1));
        this.addCoin(tx * TILE, ty * TILE);
      } else {
        this.entities.push(player.size === 0
          ? new Mushroom(tx, ty - 1)
          : new FireFlower(tx, ty - 1));
        sound.tone('square', 200, 800, 0.25, 0.4);
      }
      this.bumpKillEnemies(tx, ty);
    } else if (t === T.QS || t === T.Q1) {
      setTile(this.level, tx, ty, T.USED);
      this.bumps.push({ tx, ty, t: 0 });
      this.entities.push(t === T.QS ? new Star(tx, ty - 1) : new Mushroom(tx, ty - 1, true));
      sound.tone('square', 200, 800, 0.25, 0.4);
      this.bumpKillEnemies(tx, ty);
    } else if (t === T.BRICK) {
      if (player.size > 0) {
        setTile(this.level, tx, ty, T.EMPTY);
        const x = tx * TILE, y = ty * TILE;
        this.entities.push(
          new Shard(x + 2, y + 2, -1.2, -4.5), new Shard(x + 10, y + 2, 1.2, -4.5),
          new Shard(x + 2, y + 8, -1, -2.5), new Shard(x + 10, y + 8, 1, -2.5));
        this.addScore(50);
        sound.breakBrick();
      } else {
        this.bumps.push({ tx, ty, t: 0 });
        sound.bump();
      }
      this.bumpKillEnemies(tx, ty);
    } else if (t !== T.EMPTY) {
      sound.bump();
    }
  },

  bumpKillEnemies(tx, ty) {
    // enemies standing on a bumped block get launched
    for (const e of this.entities) {
      if (e instanceof Enemy && e.harmful) {
        const feetY = e.y + e.h;
        const onTile = Math.abs(feetY - ty * TILE) < 3 &&
          e.x + e.w > tx * TILE && e.x < (tx + 1) * TILE;
        if (onTile) { e.flip(this, 1, 100); sound.kick(); }
      }
    }
  },
};

function resetLevel(fullReset, carrySize = 0) {
  game.level = LEVELS[game.levelIdx]();
  game.player = new Player(game.level.playerStart.x, 13 * TILE - 14);
  if (carrySize > 0) {
    game.player.setSize(1);
    game.player.size = carrySize;
  }
  game.entities = [];
  game.popups = [];
  game.bumps = [];
  game.spawnIdx = 0;
  game.cam = 0;
  game.time = game.level.timeLimit;
  game.timeWarned = false;
  game.clearTimer = 0;
  game.axeSeq = null;
  if (fullReset) {
    game.score = 0;
    game.coins = 0;
    game.lives = 3;
  }
}

function startGame() {
  game.levelIdx = 0;
  resetLevel(true);
  game.state = 'play';
  sound.startMusic(game.level.theme === 'overworld' ? 0 : 1);
}

function nextLevel() {
  game.levelIdx++;
  resetLevel(false, game.player.size);
  game.state = 'play';
  sound.startMusic(game.level.theme === 'overworld' ? 0 : 1);
}

// ---------------------------------------------------------------- update ----

// Drop a spawned enemy onto the first solid tile below its column.
function spawnOnPlatform(e) {
  const tx = Math.floor((e.x + e.w / 2) / TILE);
  for (let ty = 0; ty < ROWS; ty++) {
    if (tileAt(game.level, tx, ty) !== T.EMPTY) {
      e.y = ty * TILE - e.h;
      return e;
    }
  }
  e.y = 13 * TILE - e.h;
  return e;
}

function updatePlay() {
  const p = game.player;

  // spawn enemies as they scroll into view
  const spawns = game.level.spawns;
  while (game.spawnIdx < spawns.length && spawns[game.spawnIdx].x < game.cam + W + 32) {
    const s = spawns[game.spawnIdx++];
    const br = game.level.bridge;
    game.entities.push(
      s.type === 'piranha' ? new Piranha(s.cx, s.top)
      : s.type === 'firebar' ? new FireBar(s.cx, s.cy)
      : s.type === 'boss' ? new Boss(s.x, br.y * TILE - 19, { fromPx: br.from * TILE, toPx: (br.to + 1) * TILE })
      : s.type === 'koopa' ? new Koopa(s.x, 13 * TILE - 14)
      : s.type === 'koopared' ? spawnOnPlatform(new Koopa(s.x, 0, true))
      : new Goomba(s.x, 13 * TILE - 13));
  }

  p.update(input, game);

  for (const e of game.entities) e.update(game);
  game.entities = game.entities.filter(e =>
    !e.dead && !(e.x < game.cam - 48 && e instanceof Enemy && !(e instanceof Boss)));

  for (const pop of game.popups) pop.update();
  game.popups = game.popups.filter(p2 => !p2.dead);

  for (const b of game.bumps) b.t++;
  game.bumps = game.bumps.filter(b => b.t < 10);

  // enemies that wander into lava are done for
  for (const e of game.entities) {
    if (e instanceof Enemy && !e.dead && !(e instanceof Boss) && !(e instanceof Piranha)) {
      if (tileAt(game.level, Math.floor((e.x + e.w / 2) / TILE), Math.floor((e.y + e.h - 1) / TILE)) === T.LAVA) {
        e.dead = true;
      }
    }
  }

  // bridge collapse sequence after grabbing the axe
  if (game.axeSeq) {
    const seq = game.axeSeq;
    if (++seq.t % 3 === 0 && seq.x >= game.level.bridge.from) {
      setTile(game.level, seq.x--, game.level.bridge.y, T.EMPTY);
      sound.bump();
    }
    if (seq.x < game.level.bridge.from && !seq.bossFell) {
      seq.bossFell = true;
      const boss = game.entities.find(e => e instanceof Boss);
      if (boss && !boss.dead) { boss.falling = true; boss.vy = 0; game.addScore(5000, boss.x, boss.y); }
      sound.stomp();
    }
    if (seq.bossFell && seq.t > 160 && p.state === 'axe') {
      p.state = 'walkoff';
      sound.clearFanfare();
    }
  }

  if (p.state === 'normal') {
    // coin tiles, lava, and the axe
    const x0 = Math.floor(p.x / TILE), x1 = Math.floor((p.x + p.w - 0.01) / TILE);
    const y0 = Math.floor(p.y / TILE), y1 = Math.floor((p.y + p.h - 0.01) / TILE);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const t = tileAt(game.level, tx, ty);
      if (t === T.COIN) {
        setTile(game.level, tx, ty, T.EMPTY);
        game.addCoin(tx * TILE, ty * TILE);
      } else if (t === T.LAVA) {
        p.die(game);
      } else if (t === T.AXE) {
        setTile(game.level, tx, ty, T.EMPTY);
        p.state = 'axe';
        p.vx = 0;
        game.axeSeq = { t: 0, x: game.level.bridge.to, bossFell: false };
        game.addScore(1000, tx * TILE, ty * TILE);
        sound.stopMusic();
        sound.flagpole();
      }
    }
    if (p.state !== 'normal') { /* axe or lava changed our plans */ }

    // rotating fire bars
    for (const e of game.entities) {
      if (e instanceof FireBar && p.starTimer <= 0 && p.state === 'normal' && e.hits(p)) {
        p.hurt(game);
      }
    }

    // items & enemies
    for (const e of game.entities) {
      if (e.dead) continue;
      if ((e instanceof Mushroom || e instanceof FireFlower || e instanceof Star) && overlaps(p, e)) {
        e.collect(game);
        continue;
      }
      if (e instanceof Enemy && overlaps(p, e)) {
        if (!e.harmful && !(e instanceof Koopa && e.mode === 'shell')) continue;
        if (p.starTimer > 0) { // invincible: plow through everything
          e.flip(game, p.facing, 200);
          sound.kick();
          continue;
        }
        if (e instanceof Koopa && e.mode === 'shell' && e.flipTimer === 0) {
          // kick the resting shell
          const dir = p.x + p.w / 2 < e.x + e.w / 2 ? 1 : -1;
          e.kick(game, dir);
          continue;
        }
        if (e instanceof Piranha) { p.hurt(game); continue; } // can't be stomped
        const stomping = p.vy > 0 && (p.y + p.h) - e.y < 9;
        if (stomping) {
          e.stomp(game);
          p.vy = input.down('jump') ? -6.5 : -4;
          p.y = e.y - p.h;
          game.entities.push(
            new Puff(e.x + 2, e.y - 2, -0.6), new Puff(e.x + e.w - 4, e.y - 2, 0.6));
        } else if (e.harmful) {
          p.hurt(game);
        }
      }
    }

    // flagpole (the solid base block clamps x+w to the pole column, so trigger at its edge)
    if (game.level.flagX > 0 && p.x + p.w >= game.level.flagX * TILE) {
      p.x = game.level.flagX * TILE - p.w + 6;
      p.state = 'flag';
      p.vx = 0; p.vy = 0;
      sound.stopMusic();
      sound.flagpole();
      // height bonus
      const bonus = Math.max(100, Math.min(5000, Math.round((12 * TILE - p.y) * 20 / 100) * 100));
      game.addScore(bonus, p.x, p.y);
    }

    // fell into a pit
    if (p.y > (ROWS + 1) * TILE) p.die(game);
  }

  // flag → walk to castle → course clear
  if (p.state === 'walkoff' && p.hidden) {
    if (++game.clearTimer === 1) sound.clearFanfare();
    if (game.clearTimer > 30 && game.time > 0) {
      // count down remaining time into score
      const chunk = Math.min(game.time, 4);
      game.time -= chunk;
      game.score += chunk * 50;
      if (game.frame % 4 === 0) sound.coin();
    }
    if (game.clearTimer > 240 && game.time <= 0) {
      game.state = game.levelIdx < LEVELS.length - 1 ? 'clear' : 'won';
      game.saveHighScore();
    }
  }

  // death sequence finished?
  if (p.state === 'die' && p.y > (ROWS + 6) * TILE && !game.deathHandled) {
    game.deathHandled = true;
    game.lives--;
    if (game.lives <= 0) {
      game.state = 'gameover';
      game.saveHighScore();
    } else {
      resetLevel(false);
      sound.startMusic(game.level.theme === 'overworld' ? 0 : 1);
    }
  }

  // timer
  if (p.state === 'normal') {
    if (game.frame % 24 === 0 && game.time > 0) {
      game.time--;
      if (game.time === 100 && !game.timeWarned) { game.timeWarned = true; sound.timeWarn(); }
      if (game.time === 0) p.die(game);
    }
  }

  // camera: follows right, never scrolls back
  const target = p.x + p.w / 2 - 108;
  game.cam = Math.max(game.cam, Math.min(target, game.level.width * TILE - W));
}

// ------------------------------------------------------------------ draw ----

function drawBackground() {
  g.fillStyle = game.level.theme === 'underground' ? '#080810'
    : game.level.theme === 'castle' ? '#1a0a10' : '#6b8cff';
  g.fillRect(0, 0, W, H);

  const camT = game.cam / TILE;

  for (const c of game.level.decor.clouds) {
    if (c.x + c.w + 3 < camT - 1 || c.x > camT + 17) continue;
    drawCloud((c.x - camT) * TILE, c.y * TILE, c.w);
  }
  for (const h of game.level.decor.hills) {
    if (h.x + 6 < camT - 1 || h.x > camT + 17) continue;
    drawHill((h.x - camT) * TILE, h.big);
  }
  for (const b of game.level.decor.bushes) {
    if (b.x + b.w + 2 < camT - 1 || b.x > camT + 17) continue;
    drawBush((b.x - camT) * TILE, b.w);
  }
}

function drawCloud(x, y, w) {
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.arc(x + 8, y + 8, 7, 0, 7);
  g.arc(x + 8 + w * 16, y + 8, 7, 0, 7);
  g.fill();
  g.fillRect(x + 8, y + 1, w * 16, 14);
  g.fillStyle = '#d8e8f8';
  g.fillRect(x + 4, y + 12, w * 16 + 8, 3);
}

function drawHill(x, big) {
  const hgt = big ? 35 : 19;
  const wid = big ? 80 : 48;
  const baseY = 13 * TILE;
  g.fillStyle = '#1e9e30';
  g.beginPath();
  g.moveTo(x, baseY);
  g.lineTo(x + wid / 2, baseY - hgt);
  g.lineTo(x + wid, baseY);
  g.fill();
  g.fillStyle = '#0c6018';
  g.fillRect(x + wid / 2 - 4, baseY - hgt + 8, 2, 2);
  g.fillRect(x + wid / 2 + 4, baseY - hgt + 14, 2, 2);
  g.fillRect(x + wid / 2 - 8, baseY - hgt + 20, 2, 2);
}

function drawBush(x, w) {
  const baseY = 13 * TILE;
  g.fillStyle = '#30c040';
  g.beginPath();
  g.arc(x + 8, baseY - 6, 8, Math.PI, 0);
  g.fill();
  g.fillRect(x + 8, baseY - 6, w * 16, 6);
  g.beginPath();
  g.arc(x + 8 + w * 16, baseY - 6, 8, Math.PI, 0);
  g.fill();
  for (let i = 0; i < w; i++) {
    g.beginPath();
    g.arc(x + 16 + i * 16, baseY - 10, 9, Math.PI, 0);
    g.fill();
  }
  g.fillRect(x, baseY - 2, w * 16 + 16, 2);
}

function drawCastle(x) {
  const y = 13 * TILE;
  g.fillStyle = '#c85820';
  g.fillRect(x, y - 80, 80, 80);
  g.fillStyle = '#78290c';
  for (let i = 0; i < 5; i++) g.fillRect(x + i * 16 + 2, y - 80, 12, 6); // crenellations gaps
  g.fillStyle = '#f0a060';
  for (let yy = y - 74; yy < y; yy += 8) g.fillRect(x, yy, 80, 1);
  g.fillStyle = '#181008';
  g.fillRect(x + 30, y - 32, 20, 32);
  g.beginPath(); g.arc(x + 40, y - 32, 10, Math.PI, 0); g.fill();
  g.fillStyle = '#78290c';
  g.fillRect(x + 12, y - 60, 10, 12); g.fillRect(x + 58, y - 60, 10, 12);
}

const TILE_IMG = () => {
  const s = TILES[game.level.theme] || TILES.overworld;
  return {
    [T.GROUND]: s.ground, [T.BRICK]: s.brick, [T.Q]: s.q, [T.QM]: s.q,
    [T.QS]: s.brick, [T.Q1]: s.brick,
    [T.USED]: s.used, [T.HARD]: s.hard,
    [T.PIPE_TL]: s.pipeTL, [T.PIPE_TR]: s.pipeTR,
    [T.PIPE_L]: s.pipeL, [T.PIPE_R]: s.pipeR,
  };
};

function drawTiles() {
  const imgs = TILE_IMG();
  const tx0 = Math.floor(game.cam / TILE), tx1 = tx0 + 17;
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const t = tileAt(game.level, tx, ty);
      if (t === T.EMPTY) continue;
      const x = tx * TILE - game.cam;
      let dy = 0;
      for (const b of game.bumps) {
        if (b.tx === tx && b.ty === ty) dy = -Math.round(Math.sin(b.t / 10 * Math.PI) * 6);
      }
      if (t === T.COIN) {
        g.drawImage(SPR.coin[(game.frame / 8 | 0) % 3], x, ty * TILE + 1);
      } else if (t === T.LAVA) {
        // only the surface row shimmers
        const surface = tileAt(game.level, tx, ty - 1) !== T.LAVA;
        g.drawImage(surface ? SPR.lava[(game.frame / 16 | 0) % 2] : SPR.lava[0], x, ty * TILE);
        if (!surface) { g.fillStyle = '#c02800'; g.fillRect(x, ty * TILE, TILE, TILE); }
      } else if (t === T.BRIDGE) {
        g.drawImage(SPR.bridge, x, ty * TILE + dy);
      } else if (t === T.AXE) {
        g.drawImage(SPR.axe, x, ty * TILE + Math.round(Math.sin(game.frame / 20) * 2));
      } else if (t === T.POLE) {
        g.fillStyle = '#30c040'; g.fillRect(x + 7, ty * TILE, 2, TILE);
      } else if (t === T.POLE_TOP) {
        g.fillStyle = '#30c040'; g.fillRect(x + 7, ty * TILE + 4, 2, 12);
        g.fillStyle = '#f8b800';
        g.beginPath(); g.arc(x + 8, ty * TILE + 4, 4, 0, 7); g.fill();
      } else if (imgs[t]) {
        g.drawImage(imgs[t], x, ty * TILE + dy);
      }
    }
  }
  // flag on the pole (slides down with player)
  const p = game.player;
  const flagPx = game.level.flagX * TILE - game.cam;
  if (game.level.flagX > 0 && flagPx > -32 && flagPx < W + 32) {
    let fy = 3 * TILE;
    if (p.state === 'flag' || p.state === 'walkoff' || p.hidden) {
      fy = Math.min(Math.max(p.y - 8, 3 * TILE), 10 * TILE);
      if (p.state !== 'flag') fy = 10 * TILE;
    }
    g.fillStyle = '#0aa7a0';
    g.beginPath();
    g.moveTo(flagPx + 7, fy);
    g.lineTo(flagPx - 6, fy + 5);
    g.lineTo(flagPx + 7, fy + 10);
    g.fill();
  }
  if (game.level.theme !== 'castle' && game.level.castleX > 0) {
    drawCastle(game.level.castleX * TILE - game.cam);
  }
}

function drawHUD() {
  drawText(g, 'MOORE', 16, 8);
  drawText(g, String(game.score).padStart(6, '0'), 16, 16);
  g.drawImage(SPR.coin[0], 88, 10, 8, 7);
  drawText(g, 'x' + String(game.coins).padStart(2, '0'), 98, 11);
  drawText(g, 'WORLD', 136, 8);
  drawText(g, game.level.name, 140, 16);
  drawText(g, 'TIME', 176, 8);
  drawText(g, String(Math.max(0, game.time)).padStart(3, '0'), 178, 16,
    game.time <= 100 ? '#f85030' : '#ffffff');
  drawText(g, 'LIVES x' + game.lives, 208, 11);
}

function drawCenter(text, y, color) {
  const wpx = text.replace(/ /g, '.').length * 4;
  drawText(g, text, Math.round(W / 2 - wpx / 2), y, color);
}

function draw() {
  drawBackground();
  for (const e of game.entities) if (e.drawUnder) e.draw(g, game.cam); // piranhas behind pipes
  drawTiles();
  for (const e of game.entities) if (!e.drawUnder) e.draw(g, game.cam);
  game.player.draw(g, game.cam);
  for (const p of game.popups) drawText(g, p.text, Math.round(p.x - game.cam), Math.round(p.y), '#ffffff');
  drawHUD();

  if (game.state === 'title') {
    g.fillStyle = 'rgba(16,16,40,0.55)';
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#c85820';
    g.fillRect(38, 52, 180, 54);
    g.fillStyle = '#f8a800';
    g.fillRect(42, 56, 172, 46);
    g.fillStyle = '#78290c';
    g.fillRect(46, 60, 164, 38);
    drawCenter('SUPER', 68, '#ffffff');
    drawCenter('MOORE BROS!', 82, '#f8d048');
    if (game.frame % 60 < 40) drawCenter('PRESS ENTER TO START', 140, '#ffffff');
    if (game.highScore > 0) drawCenter('TOP ' + game.highScore, 118, '#f8d048');
    drawCenter('Z JUMP  X RUN AND FIRE', 168, '#b8c8ff');
    drawCenter('ARROWS MOVE  M MUTE', 178, '#b8c8ff');
  } else if (game.state === 'pause') {
    g.fillStyle = 'rgba(0,0,0,0.4)';
    g.fillRect(0, 0, W, H);
    drawCenter('PAUSED', 112, '#ffffff');
  } else if (game.state === 'clear') {
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(0, 0, W, H);
    drawCenter('COURSE CLEAR!', 96, '#f8d048');
    drawCenter('SCORE ' + game.score, 116, '#ffffff');
    if (game.frame % 60 < 40) {
      drawCenter('PRESS ENTER FOR WORLD ' + LEVEL_NAMES[game.levelIdx + 1], 140, '#ffffff');
    }
  } else if (game.state === 'won') {
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(0, 0, W, H);
    drawCenter('YOU SAVED THE KINGDOM!', 88, '#f8d048');
    drawCenter('SCORE ' + game.score, 112, '#ffffff');
    drawCenter('TOP ' + game.highScore, 124, '#b8c8ff');
    if (game.frame % 60 < 40) drawCenter('PRESS ENTER', 148, '#ffffff');
  } else if (game.state === 'gameover') {
    g.fillStyle = 'rgba(0,0,0,0.6)';
    g.fillRect(0, 0, W, H);
    drawCenter('GAME OVER', 104, '#f85030');
    drawCenter('SCORE ' + game.score, 124, '#ffffff');
    if (game.frame % 60 < 40) drawCenter('PRESS ENTER', 148, '#ffffff');
  }
}

// ------------------------------------------------------------------ loop ----

function step() {
  game.frame++;
  input.pollGamepad();

  if (input.pressed('mute')) sound.toggleMute();

  switch (game.state) {
    case 'title':
      if (input.pressed('start') || input.pressed('jump')) {
        sound.unlock();
        startGame();
      }
      // idle camera drift on title
      game.cam = (game.cam + 0.25) % ((game.level.width - 16) * TILE);
      break;
    case 'play':
      if (input.pressed('start')) { game.state = 'pause'; break; }
      updatePlay();
      break;
    case 'pause':
      if (input.pressed('start')) game.state = 'play';
      break;
    case 'clear':
      if (input.pressed('start')) nextLevel();
      break;
    case 'won':
    case 'gameover':
      if (input.pressed('start')) {
        game.saveHighScore();
        game.state = 'title';
        game.levelIdx = 0;
        resetLevel(true);
        game.cam = 0;
        sound.stopMusic();
      }
      break;
  }

  sound.update();
  input.endFrame();
}

// boot with a level behind the title screen
resetLevel(true);
// debug/testing hooks: step N frames synchronously (works in hidden tabs where rAF is paused)
window.__game = game;
window.__input = input;
window.__tick = (n = 1) => { for (let i = 0; i < n; i++) step(); draw(); };
window.__reset = () => { resetLevel(true); game.state = 'play'; };

let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(now - last, 100);
  last = now;
  while (acc >= 1000 / 60) {
    step();
    acc -= 1000 / 60;
  }
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
