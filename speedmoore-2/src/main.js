// Speedmoore 2 — main loop, screens, match presentation, league flow.

import { Input, initTouch } from './input.js';
import { Sound } from './audio.js';
import { initSprites, makeTeamSprites, buildArena, drawPlayer, SPR } from './sprites.js';
import { Match, WORLD_W, WORLD_H, STARS } from './match.js';
import {
  TEAMS, UPGRADES, UPGRADE_MAX, upgradeCost, buyUpgrade,
  newLeague, loadLeague, saveLeague, playerFixture, advanceRound, tableOrder, playerStats,
} from './league.js';

const VIEW_W = 256, VIEW_H = 224;

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

// chrome-plated headline text
function chromeText(c, str, x, y, size) {
  c.font = `bold ${size}px monospace`;
  c.textAlign = 'center';
  c.textBaseline = 'top';
  c.fillStyle = '#101018';
  c.fillText(str, x + 2, y + 2);
  const g = c.createLinearGradient(0, y, 0, y + size);
  g.addColorStop(0, '#f8f8ff');
  g.addColorStop(0.42, '#c0c8d8');
  g.addColorStop(0.5, '#586078');
  g.addColorStop(0.58, '#a8b0c0');
  g.addColorStop(1, '#e8ecf8');
  c.fillStyle = g;
  c.fillText(str, x, y);
}

const EXHIB_OPP = { easy: 7, medium: 2, hard: 1 };  // league team index per difficulty

class Game {
  constructor() {
    this.input = new Input();
    this.touch = initTouch(this.input);
    this.sound = new Sound();
    this.state = 'title';
    this.frame = 0;
    this.menuSel = 0;
    this.diffSel = 1;
    this.hubSel = 0;
    this.shopSel = 0;
    this.league = loadLeague();
    this.arena = buildArena();
    this.fx = { shake: 0, hitstop: 0, floaters: [], banner: '', bannerT: 0, excite: 0 };
    this.camX = 32; this.camY = (WORLD_H - VIEW_H) / 2;
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
  }

  // ---------------- match setup ----------------

  startExhibition(diffKey) {
    const opp = TEAMS[EXHIB_OPP[diffKey]];
    this.beginMatch({
      mode: 'exhibition',
      home: { name: TEAMS[0].name, stats: { attack: 0, defence: 0, speed: 0, armor: 0 }, human: true },
      away: { name: opp.name, stats: opp.stats, difficulty: diffKey },
      oppIdx: EXHIB_OPP[diffKey],
      diffKey,
    });
  }

  startLeagueMatch() {
    const fx = playerFixture(this.league);
    if (!fx) return;
    const opp = TEAMS[fx.opponent];
    this.beginMatch({
      mode: 'league',
      home: { name: TEAMS[0].name, stats: playerStats(this.league), human: true },
      away: { name: opp.name, stats: opp.stats, difficulty: opp.tier },
      oppIdx: fx.opponent,
      diffKey: opp.tier,
    });
  }

  beginMatch(setup) {
    this.setup = setup;
    this.state = 'prematch';
    this.prematchT = 0;
    this.sound.stopMusic();
  }

  enterPlay() {
    const s = this.setup;
    this.match = new Match({ home: s.home, away: s.away });
    this.spr = [
      { field: makeTeamSprites(TEAMS[0].colors), gk: makeTeamSprites(TEAMS[0].colors, true) },
      { field: makeTeamSprites(TEAMS[s.oppIdx].colors), gk: makeTeamSprites(TEAMS[s.oppIdx].colors, true) },
    ];
    this.fx = { shake: 0, hitstop: 0, floaters: [], banner: '', bannerT: 0, excite: 0 };
    this.paused = false;
    this.rewards = null;
    this.finished = false;
    this.camX = (WORLD_W - VIEW_W) / 2;
    this.camY = (WORLD_H - VIEW_H) / 2;
    this.state = 'play';
    this.sound.playMusic('match');
  }

  // ---------------- play ----------------

  matchInput() {
    const i = this.input;
    return {
      mx: (i.down('right') ? 1 : 0) - (i.down('left') ? 1 : 0),
      my: (i.down('down') ? 1 : 0) - (i.down('up') ? 1 : 0),
      passPressed: i.pressed('pass'),
      throwPressed: i.pressed('throw'),
      throwHeld: i.down('throw'),
      throwReleased: i.released('throw'),
    };
  }

  updatePlay() {
    const inp = this.input;
    if (inp.pressed('start')) {
      this.paused = !this.paused;
      this.sound.menuSel();
    }
    if (this.paused) return;

    if (this.fx.hitstop > 0) { this.fx.hitstop--; return; }

    const m = this.match;
    m.step(1 / 60, this.matchInput());
    for (const e of m.drainEvents()) this.handleEvent(e);
    if (this.state !== 'play') return;

    // camera follows the ball (with a nudge toward the carrier's run)
    const foc = m.ball;
    const tx = Math.max(0, Math.min(WORLD_W - VIEW_W, foc.x - VIEW_W / 2));
    const ty = Math.max(0, Math.min(WORLD_H - VIEW_H, foc.y - VIEW_H / 2));
    this.camX += (tx - this.camX) * 0.12;
    this.camY += (ty - this.camY) * 0.12;

    // crowd murmur follows the action up the pitch
    const nearGoal = Math.min(m.ball.y, WORLD_H - m.ball.y) < 130 ? 0.25 : 0;
    this.fx.excite = Math.max(0, this.fx.excite - 0.004);
    this.sound.setCrowd(0.28 + nearGoal + this.fx.excite);
    this.sound.updateMusic();

    if (this.fx.shake > 0) this.fx.shake--;
    for (const f of this.fx.floaters) f.t++;
    this.fx.floaters = this.fx.floaters.filter((f) => f.t < 50);
    if (this.fx.bannerT > 0) this.fx.bannerT--;
  }

  handleEvent(e) {
    const S = this.sound;
    switch (e.t) {
      case 'clang': S.clang(Math.min(1, e.speed / 280)); break;
      case 'bumper': S.bumper(); this.fx.excite += 0.05; break;
      case 'star': S.starDing(); this.banner('MULTIPLIER LIT! x2', 90); this.fx.excite += 0.2; break;
      case 'throw': S.whoosh(e.power); if (e.power >= 0.95) this.fx.excite += 0.15; break;
      case 'pass': S.pass(); break;
      case 'slide': S.slideSfx(); break;
      case 'pickup': S.pickup(); break;
      case 'switch': S.switchTick(); break;
      case 'knockdown': {
        S.crunch(e.brutal);
        this.fx.hitstop = e.brutal ? 8 : 5;
        this.fx.shake = e.brutal ? 8 : 4;
        this.fx.excite += e.brutal ? 0.3 : 0.12;
        if (e.brutal || e.how === 'power') S.roar(0.8);
        this.floater(e.x, e.y, '+2', e.team === 0 ? '#68e8f8' : '#f86858');
        break;
      }
      case 'goal': {
        S.klaxon(); S.roar(1.4);
        this.fx.shake = 10;
        this.fx.excite = 1;
        this.banner(e.team === 0 ? `GOAL! +${e.pts}` : `${TEAMS[this.setup.oppIdx].short} SCORE +${e.pts}`, 130);
        this.lastGoalFrame = this.frame;
        break;
      }
      case 'powerup': {
        if (e.kind === 'coin') S.coin();
        else if (e.kind === 'freeze') S.freeze();
        else S.powerup();
        if (e.team === 0) this.banner(e.kind.toUpperCase() + '!', 50);
        break;
      }
      case 'freeze': break;
      case 'whistle': S.whistle(); break;
      case 'halftime': this.state = 'halftime'; this.sound.stopMusic(); break;
      case 'fulltime': this.finishMatch(); break;
    }
  }

  banner(msg, t) { this.fx.banner = msg; this.fx.bannerT = t; }
  floater(x, y, str, color) { this.fx.floaters.push({ x, y, str, color, t: 0 }); }

  finishMatch() {
    if (this.finished) return;
    this.finished = true;
    this.sound.stopMusic();
    const m = this.match;
    if (this.setup.mode === 'league') {
      this.rewards = advanceRound(this.league, {
        score: [m.teams[0].score, m.teams[1].score],
        knockdowns: [m.teams[0].knockdowns, m.teams[1].knockdowns],
        coins: m.coins,
      });
      saveLeague(this.league);
      this.sound.cash();
    }
    this.state = 'fulltime';
  }

  // ---------------- rendering: match ----------------

  drawPlay() {
    const m = this.match;
    ctx.save();
    if (this.fx.shake > 0) {
      ctx.translate((this.frame % 2) * 2 - 1, ((this.frame >> 1) % 2) * 2 - 1);
    }
    const cx = this.camX | 0, cy = this.camY | 0;
    ctx.drawImage(this.arena, cx, cy, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);

    // multiplier stars
    STARS.forEach((s, i) => {
      const lit = m.litStars.has(i) && (this.frame % 14 < 9);
      const img = lit ? SPR.starLit : SPR.starOff;
      ctx.drawImage(img, (s.x - 4 - cx) | 0, (s.y - 4 - cy) | 0);
    });

    // powerup tokens
    for (const pu of m.powerups) {
      const bob = Math.sin(this.frame / 10) * 2;
      if (pu.life > 3 || this.frame % 8 < 5) {
        ctx.drawImage(SPR.tokens[pu.kind], (pu.x - 4 - cx) | 0, (pu.y - 4 + bob - cy) | 0);
      }
    }

    // control ring under the controlled player
    if (m.controlled >= 0) {
      const p = m.players[m.controlled];
      ctx.strokeStyle = this.frame % 20 < 10 ? '#f8f870' : '#f8f8f8';
      ctx.beginPath();
      ctx.ellipse(p.x - cx, p.y + 6 - cy, 8, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // players, painter's order
    const order = [...m.players].sort((a, b) => a.y - b.y);
    for (const p of order) {
      const set = this.spr[p.team];
      const spr = p.role === 'GK' ? set.gk : set.field;
      drawPlayer(ctx, spr, p, p.x - cx, p.y - cy, this.frame);
      if (p.injured > 0 && this.frame % 16 < 8 && p.down <= 0) {
        ctx.fillStyle = '#f83828';
        ctx.fillRect((p.x - cx - 1) | 0, (p.y - cy - 13) | 0, 3, 1);
        ctx.fillRect((p.x - cx) | 0, (p.y - cy - 14) | 0, 1, 3);
      }
      if (m.teams[p.team].freeze > 0) {
        ctx.fillStyle = 'rgba(104,232,248,0.45)';
        ctx.fillRect((p.x - cx - 6) | 0, (p.y - cy - 8) | 0, 12, 15);
      }
    }

    // ball (+ power sparks)
    const b = m.ball;
    ctx.drawImage(SPR.ball, (b.x - 3 - cx) | 0, (b.y - 3 - cy) | 0);
    if (b.power > 0) {
      ctx.fillStyle = this.frame % 4 < 2 ? '#f8f838' : '#f88028';
      for (let i = 0; i < 4; i++) {
        ctx.fillRect((b.x - cx - b.vx * 0.02 * i + (i * 7 % 5) - 2) | 0, (b.y - cy - b.vy * 0.02 * i + (i * 3 % 5) - 2) | 0, 2, 2);
      }
    }

    // power ramp bar
    if (m.charge >= 0 && m.controlled >= 0) {
      const p = m.players[m.controlled];
      ctx.fillStyle = '#101018';
      ctx.fillRect((p.x - cx - 9) | 0, (p.y - cy - 14) | 0, 18, 4);
      ctx.fillStyle = m.charge >= 0.95 ? '#f8f838' : '#f88028';
      ctx.fillRect((p.x - cx - 8) | 0, (p.y - cy - 13) | 0, (16 * m.charge) | 0, 2);
    }

    // floaters
    for (const f of this.fx.floaters) {
      text(ctx, f.str, f.x - cx, f.y - cy - 10 - f.t * 0.4, f.color, 8, 'center');
    }
    ctx.restore();

    this.drawMatchHUD();

    if (this.fx.bannerT > 0 && (this.fx.bannerT > 30 || this.frame % 8 < 5)) {
      text(ctx, this.fx.banner, VIEW_W / 2, 78, '#f8d838', 10, 'center');
    }
    if (m.state === 'kickoff') text(ctx, 'GET READY', VIEW_W / 2, 100, '#f8f8f8', 8, 'center');
    if (this.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      text(ctx, 'PAUSE', VIEW_W / 2, 104, '#f8f8f8', 12, 'center');
    }
  }

  drawMatchHUD() {
    const m = this.match;
    ctx.fillStyle = 'rgba(8,8,14,0.82)';
    ctx.fillRect(0, 0, VIEW_W, 14);
    const oppShort = TEAMS[this.setup.oppIdx].short;
    text(ctx, `MOO ${m.teams[0].score}`, 6, 3, '#68b8f8');
    text(ctx, `${oppShort} ${m.teams[1].score}`, VIEW_W - 6, 3, '#f87858', 8, 'right');
    const t = Math.max(0, Math.ceil(m.clock));
    const mm = (t / 60) | 0, ss = t % 60;
    text(ctx, `${m.half === 1 ? '1ST' : '2ND'} ${mm}:${String(ss).padStart(2, '0')}`, VIEW_W / 2, 3, '#e8e8f0', 8, 'center');
    if (m.starLit > 0 && this.frame % 10 < 6) {
      ctx.drawImage(SPR.starLit, VIEW_W / 2 - 40, 3);
      ctx.drawImage(SPR.starLit, VIEW_W / 2 + 32, 3);
    }
    // armor of controlled player
    if (m.controlled >= 0) {
      const p = m.players[m.controlled];
      ctx.fillStyle = 'rgba(8,8,14,0.82)';
      ctx.fillRect(0, VIEW_H - 12, 70, 12);
      text(ctx, 'ARM', 4, VIEW_H - 10, '#99a');
      ctx.fillStyle = '#101018';
      ctx.fillRect(28, VIEW_H - 9, 36, 5);
      ctx.fillStyle = p.armor > 60 ? '#48d858' : p.armor > 30 ? '#f8d838' : '#f84838';
      ctx.fillRect(29, VIEW_H - 8, (34 * p.armor / 100) | 0, 3);
    }
  }

  // ---------------- screens ----------------

  drawTitle() {
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // arena floodlights
    for (let i = 0; i < 2; i++) {
      const gx = i === 0 ? 40 : VIEW_W - 40;
      const g = ctx.createLinearGradient(gx, 0, gx + (i === 0 ? 60 : -60), 150);
      g.addColorStop(0, 'rgba(200,220,255,0.14)');
      g.addColorStop(1, 'rgba(200,220,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(gx, 0); ctx.lineTo(gx + (i === 0 ? 90 : -90), 224); ctx.lineTo(gx + (i === 0 ? 20 : -20), 224);
      ctx.closePath(); ctx.fill();
    }
    chromeText(ctx, 'SPEEDMOORE', VIEW_W / 2, 42, 34);
    chromeText(ctx, '2', VIEW_W / 2, 78, 30);
    text(ctx, 'B R U T A L   M O O R E   D E L U X E', VIEW_W / 2, 116, '#8890a8', 8, 'center');
    if (this.frame % 90 < 60) {
      text(ctx, 'the crowd chants: "ICE CREAM! ICE CREAM!"', VIEW_W / 2, 136, '#556', 8, 'center');
    }
    if (this.frame % 60 < 40) {
      text(ctx, this.touch ? 'TAP MENU TO START' : 'PUSH ENTER', VIEW_W / 2, 168, '#f8f8f8', 9, 'center');
    }
    text(ctx, '© 2ØXX MOORE ARCADE', VIEW_W / 2, 208, '#445', 8, 'center');
  }

  updateTitle() {
    const i = this.input;
    if (i.pressed('start') || i.pressed('pass') || i.pressed('throw')) {
      this.state = 'menu';
      this.menuSel = 0;
      this.sound.menuSel();
    }
    this.sound.playMusic('title');
    this.sound.updateMusic();
  }

  drawMenu() {
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    chromeText(ctx, 'SPEEDMOORE 2', VIEW_W / 2, 24, 20);
    const items = ['EXHIBITION', this.league ? 'LEAGUE (CONTINUE)' : 'LEAGUE (NEW)'];
    items.forEach((it, ix) => {
      const sel = ix === this.menuSel;
      text(ctx, `${sel ? '▶ ' : '  '}${it}`, VIEW_W / 2, 90 + ix * 20, sel ? '#f8d838' : '#c8c8d8', 10, 'center');
    });
    text(ctx, 'LEAGUE: 8 teams, 7 fixtures, prize money,', VIEW_W / 2, 160, '#667', 8, 'center');
    text(ctx, 'team upgrades. Win the trophy.', VIEW_W / 2, 172, '#667', 8, 'center');
  }

  updateMenu() {
    const i = this.input;
    if (i.pressed('up') || i.pressed('down')) { this.menuSel = 1 - this.menuSel; this.sound.menuMove(); }
    if (i.pressed('start') || i.pressed('pass') || i.pressed('throw')) {
      this.sound.menuSel();
      if (this.menuSel === 0) { this.state = 'exhib'; this.diffSel = 1; }
      else {
        if (!this.league) { this.league = newLeague(); saveLeague(this.league); }
        this.state = 'league';
        this.hubSel = 0;
      }
    }
    this.sound.playMusic('title');
    this.sound.updateMusic();
  }

  drawExhib() {
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    chromeText(ctx, 'EXHIBITION', VIEW_W / 2, 24, 18);
    text(ctx, 'SELECT OPPOSITION', VIEW_W / 2, 62, '#8890a8', 8, 'center');
    ['EASY', 'MEDIUM', 'HARD'].forEach((d, ix) => {
      const sel = ix === this.diffSel;
      const opp = TEAMS[EXHIB_OPP[['easy', 'medium', 'hard'][ix]]];
      text(ctx, `${sel ? '▶ ' : '  '}${d} — ${opp.name.toUpperCase()}`, VIEW_W / 2, 96 + ix * 18, sel ? '#f8d838' : '#c8c8d8', 9, 'center');
    });
    text(ctx, 'ENTER: play   Z/X: play', VIEW_W / 2, 180, '#556', 8, 'center');
  }

  updateExhib() {
    const i = this.input;
    if (i.pressed('up')) { this.diffSel = (this.diffSel + 2) % 3; this.sound.menuMove(); }
    if (i.pressed('down')) { this.diffSel = (this.diffSel + 1) % 3; this.sound.menuMove(); }
    if (i.pressed('start') || i.pressed('pass') || i.pressed('throw')) {
      this.sound.menuSel();
      this.startExhibition(['easy', 'medium', 'hard'][this.diffSel]);
    }
    this.sound.updateMusic();
  }

  drawLeague() {
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const lg = this.league;
    chromeText(ctx, 'THE MOORE LEAGUE', VIEW_W / 2, 6, 14);
    text(ctx, `CREDITS ${lg.money}`, 8, 26, '#f8d838');
    text(ctx, lg.round >= 7 ? 'SEASON OVER' : `ROUND ${lg.round + 1}/7`, VIEW_W - 8, 26, '#8890a8', 8, 'right');

    // table
    text(ctx, '   TEAM P  W  D  L   F   A PTS', 10, 40, '#667');
    const order = tableOrder(lg);
    order.forEach((ti, row) => {
      const t = lg.table[ti];
      const mine = ti === 0;
      const y = 51 + row * 10;
      const col = mine ? '#68b8f8' : row === 0 ? '#f8d838' : '#c8c8d8';
      text(ctx, `${row + 1}`, 10, y, col);
      text(ctx, TEAMS[ti].short, 24, y, col);
      text(ctx, `${t.p}`.padStart(2), 48, y, col);
      text(ctx, `${t.w}`.padStart(2), 63, y, col);
      text(ctx, `${t.d}`.padStart(2), 78, y, col);
      text(ctx, `${t.l}`.padStart(2), 93, y, col);
      text(ctx, `${t.f}`.padStart(4), 105, y, col);
      text(ctx, `${t.a}`.padStart(4), 130, y, col);
      text(ctx, `${t.pts}`.padStart(3), 157, y, col);
    });

    // next fixture
    const fx = playerFixture(lg);
    if (fx) {
      text(ctx, `NEXT: ${TEAMS[0].short} vs ${TEAMS[fx.opponent].short} (${TEAMS[fx.opponent].tier.toUpperCase()})`, 10, 136, '#8890a8');
    } else if (lg.champion === 0) {
      text(ctx, 'CHAMPIONS! THE TROPHY IS YOURS', 10, 136, '#f8d838');
    } else if (lg.champion >= 0) {
      text(ctx, `CHAMPIONS: ${TEAMS[lg.champion].name.toUpperCase()}`, 10, 136, '#f87858');
    }

    const items = this.leagueMenuItems();
    items.forEach((it, ix) => {
      const sel = ix === this.hubSel;
      text(ctx, `${sel ? '▶ ' : '  '}${it}`, 130, 150 + ix * 12, sel ? '#f8d838' : '#c8c8d8', 9, 'center');
    });
    text(ctx, 'Z/X/ENTER select', VIEW_W / 2, 212, '#445', 8, 'center');
  }

  leagueMenuItems() {
    if (this.league.round >= 7) {
      return this.league.champion === 0 ? ['VIEW TROPHY', 'NEW LEAGUE', 'MAIN MENU'] : ['NEW LEAGUE', 'MAIN MENU'];
    }
    return ['PLAY NEXT MATCH', 'TEAM SHOP', 'MAIN MENU'];
  }

  updateLeague() {
    const i = this.input;
    const items = this.leagueMenuItems();
    if (i.pressed('up')) { this.hubSel = (this.hubSel + items.length - 1) % items.length; this.sound.menuMove(); }
    if (i.pressed('down')) { this.hubSel = (this.hubSel + 1) % items.length; this.sound.menuMove(); }
    if (i.pressed('start') || i.pressed('pass') || i.pressed('throw')) {
      const it = items[this.hubSel];
      this.sound.menuSel();
      if (it === 'PLAY NEXT MATCH') this.startLeagueMatch();
      else if (it === 'TEAM SHOP') { this.state = 'shop'; this.shopSel = 0; }
      else if (it === 'VIEW TROPHY') { this.state = 'trophy'; this.trophyT = 0; this.sound.fanfare(); }
      else if (it === 'NEW LEAGUE') { this.league = newLeague(); saveLeague(this.league); this.hubSel = 0; }
      else { this.state = 'menu'; this.menuSel = 0; }
    }
    this.sound.playMusic('title');
    this.sound.updateMusic();
  }

  drawShop() {
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    chromeText(ctx, 'TEAM SHOP', VIEW_W / 2, 10, 16);
    text(ctx, `CREDITS ${this.league.money}`, VIEW_W / 2, 40, '#f8d838', 9, 'center');
    UPGRADES.forEach((u, ix) => {
      const lvl = this.league.upgrades[u.key];
      const sel = ix === this.shopSel;
      const y = 64 + ix * 26;
      const maxed = lvl >= UPGRADE_MAX;
      text(ctx, `${sel ? '▶ ' : '  '}${u.label}`, 20, y, sel ? '#f8d838' : '#c8c8d8', 9);
      text(ctx, u.desc, 32, y + 10, '#667');
      for (let b = 0; b < UPGRADE_MAX; b++) {
        ctx.fillStyle = b < lvl ? '#48d858' : '#22222c';
        ctx.fillRect(150 + b * 10, y + 1, 7, 6);
      }
      text(ctx, maxed ? 'MAX' : `${upgradeCost(lvl)}cr`, 236, y, maxed ? '#48d858' : '#8890a8', 8, 'right');
    });
    text(ctx, 'Z/X buy — upgrades last all season', VIEW_W / 2, 182, '#667', 8, 'center');
    text(ctx, 'ENTER: back to league', VIEW_W / 2, 196, '#556', 8, 'center');
  }

  updateShop() {
    const i = this.input;
    if (i.pressed('up')) { this.shopSel = (this.shopSel + 3) % 4; this.sound.menuMove(); }
    if (i.pressed('down')) { this.shopSel = (this.shopSel + 1) % 4; this.sound.menuMove(); }
    if (i.pressed('pass') || i.pressed('throw')) {
      const u = UPGRADES[this.shopSel];
      if (buyUpgradeSfx(this.league, u.key, this.sound)) saveLeague(this.league);
    }
    if (i.pressed('start')) { this.state = 'league'; this.sound.menuSel(); }
    this.sound.updateMusic();
  }

  drawPrematch() {
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const s = this.setup;
    if (s.mode === 'league') chromeText(ctx, `ROUND ${this.league.round + 1}`, VIEW_W / 2, 12, 14);
    else chromeText(ctx, 'EXHIBITION', VIEW_W / 2, 12, 14);
    const opp = TEAMS[s.oppIdx];
    text(ctx, TEAMS[0].name.toUpperCase(), VIEW_W / 2, 62, TEAMS[0].colors.main, 10, 'center');
    text(ctx, 'vs', VIEW_W / 2, 84, '#8890a8', 9, 'center');
    text(ctx, opp.name.toUpperCase(), VIEW_W / 2, 102, opp.colors.main, 10, 'center');
    text(ctx, `OPPOSITION CLASS: ${s.diffKey.toUpperCase()}`, VIEW_W / 2, 130, '#667', 8, 'center');
    text(ctx, '2 x 90 SECOND HALVES', VIEW_W / 2, 144, '#667', 8, 'center');
    text(ctx, 'GOAL 10 PTS (x2 WHEN STAR LIT)', VIEW_W / 2, 156, '#667', 8, 'center');
    text(ctx, 'KNOCKDOWN 2 PTS — AGGRESSION PAYS', VIEW_W / 2, 168, '#667', 8, 'center');
    if (this.frame % 60 < 40) text(ctx, 'PUSH ENTER', VIEW_W / 2, 196, '#f8f8f8', 9, 'center');
  }

  updatePrematch() {
    this.prematchT++;
    const i = this.input;
    if (this.prematchT > 20 && (i.pressed('start') || i.pressed('pass') || i.pressed('throw'))) {
      this.sound.whistle();
      this.enterPlay();
    }
  }

  drawHalftime() {
    this.drawPlay();
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    chromeText(ctx, 'HALFTIME', VIEW_W / 2, 50, 18);
    const m = this.match;
    text(ctx, `MOO ${m.teams[0].score} — ${m.teams[1].score} ${TEAMS[this.setup.oppIdx].short}`, VIEW_W / 2, 92, '#f8f8f8', 12, 'center');
    text(ctx, 'TEAMS SWAP ENDS', VIEW_W / 2, 120, '#8890a8', 8, 'center');
    if (this.frame % 60 < 40) text(ctx, 'PUSH ENTER FOR THE SECOND HALF', VIEW_W / 2, 150, '#f8d838', 8, 'center');
  }

  updateHalftime() {
    const i = this.input;
    if (i.pressed('start') || i.pressed('pass') || i.pressed('throw')) {
      this.match.startSecondHalf();
      this.match.drainEvents();
      this.state = 'play';
      this.sound.whistle();
      this.sound.playMusic('match');
    }
  }

  drawFulltime() {
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const m = this.match;
    const us = m.teams[0], them = m.teams[1];
    const won = us.score > them.score, draw = us.score === them.score;
    chromeText(ctx, 'FULL TIME', VIEW_W / 2, 8, 16);
    text(ctx, won ? 'VICTORY' : draw ? 'DRAW' : 'DEFEAT', VIEW_W / 2, 36, won ? '#48d858' : draw ? '#f8d838' : '#f85848', 10, 'center');
    text(ctx, `MOO ${us.score} — ${them.score} ${TEAMS[this.setup.oppIdx].short}`, VIEW_W / 2, 54, '#f8f8f8', 12, 'center');

    const poss = us.possession + them.possession || 1;
    const rows = [
      ['GOALS', us.goals, them.goals],
      ['KNOCKDOWNS', us.knockdowns, them.knockdowns],
      ['POSSESSION', `${Math.round(us.possession / poss * 100)}%`, `${Math.round(them.possession / poss * 100)}%`],
    ];
    rows.forEach(([label, a, b], ix) => {
      const y = 84 + ix * 13;
      text(ctx, `${a}`, 74, y, '#68b8f8', 8, 'right');
      text(ctx, label, VIEW_W / 2, y, '#8890a8', 8, 'center');
      text(ctx, `${b}`, 182, y, '#f87858', 8);
    });

    if (this.rewards) {
      text(ctx, `PRIZE ${this.rewards.base}cr  AGGRESSION +${this.rewards.aggro}cr  COINS +${this.rewards.coins}cr`, VIEW_W / 2, 138, '#f8d838', 8, 'center');
      text(ctx, `EARNED ${this.rewards.earned} CREDITS`, VIEW_W / 2, 152, '#f8d838', 9, 'center');
    }
    if (this.frame % 60 < 40) text(ctx, 'PUSH ENTER', VIEW_W / 2, 190, '#f8f8f8', 9, 'center');
  }

  updateFulltime() {
    const i = this.input;
    if (i.pressed('start') || i.pressed('pass') || i.pressed('throw')) {
      this.sound.menuSel();
      if (this.setup.mode === 'league') {
        if (this.league.round >= 7 && this.league.champion === 0) {
          this.state = 'trophy'; this.trophyT = 0;
          this.sound.fanfare();
        } else {
          this.state = 'league'; this.hubSel = 0;
        }
      } else {
        this.state = 'menu';
      }
    }
  }

  drawTrophy() {
    this.trophyT = (this.trophyT || 0) + 1;
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // confetti
    for (let i = 0; i < 40; i++) {
      const x = (i * 53 + this.frame * (1 + i % 3)) % VIEW_W;
      const y = (i * 91 + this.frame * (2 + i % 2)) % VIEW_H;
      ctx.fillStyle = ['#f8d838', '#68b8f8', '#f85848', '#48d858'][i % 4];
      ctx.fillRect(x, y, 2, 2);
    }
    // the trophy: chrome cup
    const tx = VIEW_W / 2, ty = 84;
    const g = ctx.createLinearGradient(tx - 24, 0, tx + 24, 0);
    g.addColorStop(0, '#f8e878'); g.addColorStop(0.5, '#fff8c8'); g.addColorStop(1, '#c8a028');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(tx - 22, ty); ctx.quadraticCurveTo(tx - 20, ty + 34, tx, ty + 38);
    ctx.quadraticCurveTo(tx + 20, ty + 34, tx + 22, ty); ctx.closePath(); ctx.fill();
    ctx.fillRect(tx - 4, ty + 36, 8, 12);
    ctx.fillRect(tx - 14, ty + 48, 28, 5);
    ctx.strokeStyle = '#c8a028';
    ctx.beginPath(); ctx.arc(tx - 26, ty + 10, 9, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(tx + 26, ty + 10, 9, Math.PI * 1.5, Math.PI * 0.5); ctx.stroke();

    chromeText(ctx, 'CHAMPIONS', VIEW_W / 2, 16, 20);
    text(ctx, 'BRUTAL MOORE DELUXE', VIEW_W / 2, 46, '#68b8f8', 10, 'center');
    if (this.frame % 40 < 28) {
      text(ctx, '"ICE CREAM! ICE CREAM!"', VIEW_W / 2, 152, '#f8d838', 9, 'center');
    }
    text(ctx, 'THE MOORE LEAGUE TROPHY IS YOURS', VIEW_W / 2, 172, '#8890a8', 8, 'center');
    if (this.trophyT > 60 && this.frame % 60 < 40) text(ctx, 'PUSH ENTER', VIEW_W / 2, 200, '#f8f8f8', 8, 'center');
  }

  updateTrophy() {
    this.sound.playMusic('trophy');
    this.sound.updateMusic();
    if (this.trophyT > 60 && (this.input.pressed('start') || this.input.pressed('pass') || this.input.pressed('throw'))) {
      this.sound.menuSel();
      this.state = 'league';
      this.hubSel = 0;
    }
  }

  // ---------------- frame ----------------

  tick() {
    this.frame++;
    this.input.pollGamepad();
    if (this.input.pressed('mute')) this.sound.toggleMute();
    if (this.state !== 'play') this.sound.setCrowd(this.state === 'trophy' ? 0.5 : 0);

    switch (this.state) {
      case 'title': this.updateTitle(); this.drawTitle(); break;
      case 'menu': this.updateMenu(); this.drawMenu(); break;
      case 'exhib': this.updateExhib(); this.drawExhib(); break;
      case 'league': this.updateLeague(); this.drawLeague(); break;
      case 'shop': this.updateShop(); this.drawShop(); break;
      case 'prematch': this.updatePrematch(); this.drawPrematch(); break;
      case 'play': this.updatePlay(); this.drawPlay(); break;
      case 'halftime': this.updateHalftime(); this.drawHalftime(); break;
      case 'fulltime': this.updateFulltime(); this.drawFulltime(); break;
      case 'trophy': this.updateTrophy(); this.drawTrophy(); break;
    }
    this.input.endFrame();
  }
}

function buyUpgradeSfx(lg, key, sound) {
  if (buyUpgrade(lg, key)) { sound.cash(); return true; }
  sound.denied();
  return false;
}

initSprites();
const game = new Game();
window.__game = game; // for smoke tests

let last = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  if (ts - last < 1000 / 61) return;
  last = ts;
  game.tick();
}
requestAnimationFrame(loop);
