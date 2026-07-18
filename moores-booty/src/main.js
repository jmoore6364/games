// Moore's Booty — main loop, state machine, rendering, HUD.
// A Sid Meier's Pirates!-style career: sail, trade, duel, raid, dig, retire.

import { Input, initTouch } from './input.js';
import { Sound, SHANTIES } from './audio.js';
import {
  PAL, SPR, initSprites, drawShip, drawFencer, drawCompassRose,
} from './sprites.js';
import * as W from './world.js';
import * as B from './battle.js';
import * as D from './duel.js';
import * as P from './port.js';

const VIEW_W = 320, VIEW_H = 224;
const DAY_SECONDS = 2.4;         // real seconds per game day while sailing

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

function panel(c, x, y, w, h) {
  c.fillStyle = 'rgba(12,16,28,0.92)';
  c.fillRect(x, y, w, h);
  c.strokeStyle = PAL.parch;
  c.lineWidth = 1;
  c.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
}

const DIRS8 = [
  [1, 0, 0], [1, 1, Math.PI / 4], [0, 1, Math.PI / 2], [-1, 1, (3 * Math.PI) / 4],
  [-1, 0, Math.PI], [-1, -1, (-3 * Math.PI) / 4], [0, -1, -Math.PI / 2], [1, -1, -Math.PI / 4],
];

class Game {
  constructor() {
    this.input = new Input();
    this.touch = initTouch(this.input);
    this.sound = new Sound();
    initSprites();
    this.state = 'title';
    this.frame = 0;
    this.st = null;              // career state (world.js)
    this.msg = null;             // modal {lines, then}
    this.menu = null;            // modal menu {title, items, idx, portrait}
    this.titleIdx = 0;
    this.shanty = 0;
    this.ngField = 0;
    this.ngName = 'Moore';
    this.ngNation = 0;
    this.ngDiff = 1;
    this.banner = null; this.bannerT = 0;
    const unlock = () => this.sound.unlock();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
    // free-typing for the name field
    window.addEventListener('keydown', (e) => {
      if (this.state !== 'newgame' || this.ngField !== 0) return;
      if (e.key === 'Backspace') { this.ngName = this.ngName.slice(0, -1); e.preventDefault(); }
      else if (/^[a-zA-Z ]$/.test(e.key) && this.ngName.length < 12) this.ngName += e.key;
    });
  }

  // ---------------- helpers ----------------

  showMsg(lines, then = null) {
    this.msg = { lines: Array.isArray(lines) ? lines : [lines], then };
  }

  openMenu(title, items, portrait = null, sub = '') {
    this.menu = { title, items: items.filter(Boolean), idx: 0, portrait, sub };
  }

  setBanner(s, t = 150) { this.banner = s; this.bannerT = t; }

  playerColor() { return this.st ? this.st.nation : 5; }

  // ---------------- new game / load ----------------

  beginCareer() {
    this.st = W.newGame({ name: this.ngName.trim() || 'Moore', nation: this.ngNation, diff: this.ngDiff });
    this.enterSailing();
    this.showMsg([
      `The year is 1660. Capitan El Moorro`,
      `seized your family's estate and left`,
      `you for the gutter. You have a sloop,`,
      `${this.st.gold} gold, and the Caribbean.`,
      ``,
      `Take back what is yours, ${this.st.name}.`,
    ]);
  }

  enterSailing() {
    this.state = 'sailing';
    this.sound.setWaves(true);
    this.shanty = (this.shanty + 1) % SHANTIES.length;
    this.sound.playMusic(SHANTIES[this.shanty]);
  }

  // ---------------- update dispatch ----------------

  update(dt) {
    const inp = this.input;
    inp.pollGamepad();
    if (inp.pressed('mute')) this.sound.toggleMute();

    if (this.msg) {
      if (inp.pressed('x') || inp.pressed('start') || inp.pressed('z')) {
        const then = this.msg.then;
        this.msg = null;
        if (then) then();
      }
      return;
    }
    if (this.menu) {
      const m = this.menu;
      if (inp.pressed('up')) { m.idx = (m.idx + m.items.length - 1) % m.items.length; this.sound.moveCur(); }
      if (inp.pressed('down')) { m.idx = (m.idx + 1) % m.items.length; this.sound.moveCur(); }
      if (inp.pressed('x') || inp.pressed('start')) {
        const it = m.items[m.idx];
        if (it.disabled) { this.sound.deny(); }
        else { this.sound.select(); this.menu = null; it.cb(); }
      }
      if (inp.pressed('z') && m.cancel) { this.menu = null; m.cancel(); }
      return;
    }

    switch (this.state) {
      case 'title': this.upTitle(); break;
      case 'newgame': this.upNewGame(); break;
      case 'sailing': this.upSailing(dt); break;
      case 'battle': this.upBattle(dt); break;
      case 'duel': this.upDuel(dt); break;
      case 'beach': this.upBeach(dt); break;
      case 'port': this.openPortMenu(); break;
      case 'trade': this.upTrade(); break;
      case 'retire': this.upRetire(); break;
      case 'ending': this.upEnding(); break;
    }
  }

  // ---------------- title / new game ----------------

  upTitle() {
    this.sound.playMusic('title');
    this.sound.setWaves(false);
    const inp = this.input;
    const items = P.hasSave() ? 2 : 1;
    if (inp.pressed('up') || inp.pressed('down')) {
      this.titleIdx = (this.titleIdx + 1) % items;
      this.sound.moveCur();
    }
    if (inp.pressed('start') || inp.pressed('x')) {
      this.sound.select();
      if (this.titleIdx === 1 && P.hasSave()) {
        const st = P.loadGame();
        if (st) { this.st = st; this.enterSailing(); this.setBanner('Welcome back, Captain ' + st.name); return; }
      }
      this.state = 'newgame';
      this.ngField = 0;
    }
  }

  upNewGame() {
    const inp = this.input;
    if (inp.pressed('up')) { this.ngField = (this.ngField + 3) % 4; this.sound.moveCur(); }
    if (inp.pressed('down')) { this.ngField = (this.ngField + 1) % 4; this.sound.moveCur(); }
    if (this.ngField === 1) {
      if (inp.pressed('left')) this.ngNation = (this.ngNation + 3) % 4;
      if (inp.pressed('right')) this.ngNation = (this.ngNation + 1) % 4;
    }
    if (this.ngField === 2) {
      if (inp.pressed('left')) this.ngDiff = (this.ngDiff + 3) % 4;
      if (inp.pressed('right')) this.ngDiff = (this.ngDiff + 1) % 4;
    }
    if (inp.pressed('start') || (inp.pressed('x') && this.ngField === 3)) {
      if (this.ngField === 3 || inp.pressed('start')) {
        this.sound.select();
        this.beginCareer();
      }
    }
  }

  // ---------------- sailing ----------------

  upSailing(dt) {
    const st = this.st, inp = this.input;

    if (inp.pressed('start')) { this.openPauseMenu(); return; }

    // steering: 8-dir
    const dx = (inp.down('right') ? 1 : 0) - (inp.down('left') ? 1 : 0);
    const dy = (inp.down('down') ? 1 : 0) - (inp.down('up') ? 1 : 0);
    if (dx || dy) {
      for (const [ddx, ddy, a] of DIRS8) {
        if (ddx === dx && ddy === dy) { st.heading = a; break; }
      }
    }
    const cls = W.SHIP_CLASSES[st.ship.classIdx];
    const wf = W.windFactor(st.heading, st.wind, W.DIFFS[st.diff].minWind);
    const spd = cls.speed * wf * (0.35 + 0.65 * st.ship.sails / 100);
    this.sailSpd = spd; this.sailWf = wf;
    const nx = st.x + Math.cos(st.heading) * spd * dt;
    const ny = st.y + Math.sin(st.heading) * spd * dt;
    if (W.isSeaAt(W.WORLD.mask, nx, st.y)) st.x = nx;
    if (W.isSeaAt(W.WORLD.mask, st.x, ny)) st.y = ny;
    st.x = Math.max(8, Math.min(W.WORLD_W - 8, st.x));
    st.y = Math.max(8, Math.min(W.WORLD_H - 8, st.y));

    // reefs claw the hull
    const t = W.tileAt(W.WORLD.mask, Math.floor(st.x / W.TILE), Math.floor(st.y / W.TILE));
    if (t === W.REEF) {
      this.reefT = (this.reefT || 0) + dt;
      if (this.reefT > 0.5) {
        this.reefT = 0;
        st.ship.hull -= 3;
        this.sound.crunch();
        this.setBanner('Reef! The hull grinds on coral!', 60);
        if (st.ship.hull <= 0) { this.shipLost('Your ship breaks apart on the reef!'); return; }
      }
    }

    // time passes
    st.dayFrac += dt / DAY_SECONDS;
    while (st.dayFrac >= 1) {
      st.dayFrac -= 1;
      const ev = W.nextDay(st);
      if (ev === 'warning') {
        this.sound.mutinyDrum();
        this.showMsg([
          'The crew mutters against you, Captain!',
          'Feed them and fill their pockets,',
          'or they will feed YOU to the sharks.',
        ]);
      } else if (ev === 'mutiny') {
        this.sound.mutinyDrum();
        this.doRetire(true);
        return;
      }
    }
    W.updateWind(st, dt);
    W.updateAiShips(st, dt);

    // ports
    if (this.portGrace > 0) this.portGrace -= dt;
    else for (const p of W.WORLD.ports) {
      if (Math.hypot(st.x - p.x, st.y - p.y) < 26) {
        if (P.canEnterPort(st, p)) {
          this.curPort = p;
          P.onArrival(st);
          this.sound.portJingle();
          this.sound.setWaves(false);
          this.state = 'port';
          this.openPortMenu();
        } else {
          // shoved off by the fort's guns
          st.x += Math.cos(st.heading) * -30;
          st.y += Math.sin(st.heading) * -30;
          this.sound.cannon();
          this.setBanner(`${p.name} fires on you! ${W.NATIONS[p.nation].name} wants you hanged!`, 120);
        }
        return;
      }
    }

    // deserted isle landing
    if (W.nearTreasureIsle(st) && inp.pressed('x')) {
      this.enterBeach();
      return;
    }

    // encounters
    for (const s of st.ships) {
      if (s.grace > 0) continue;
      if (Math.hypot(st.x - s.x, st.y - s.y) < 22) {
        this.openEncounter(s);
        return;
      }
    }
  }

  openPauseMenu() {
    this.sound.select();
    this.openMenu('Anchored (paused)', [
      { label: 'Resume', cb: () => {} },
      { label: this.sound.muted ? 'Sound: OFF' : 'Sound: ON', cb: () => { this.sound.toggleMute(); } },
      { label: 'Abandon career (title)', cb: () => { this.state = 'title'; this.sound.setWaves(false); } },
    ]);
    this.menu.cancel = () => {};
  }

  openEncounter(s) {
    const st = this.st;
    const cls = W.SHIP_CLASSES[s.classIdx];
    const who = s.type === 'nemesis' ? "EL MOORRO'S BLACK GALLEON"
      : s.type === 'pirate' ? `Pirate ${cls.name}`
        : `${W.NATIONS[s.nation].adj} ${s.type === 'war' ? 'war ' : 'merchant '}${cls.name}`;
    const hostileToYou = s.type === 'pirate' || s.type === 'nemesis'
      || (s.nation >= 0 && st.hostile[s.nation]);
    const legal = s.nation >= 0 ? W.isLegalTarget(st, s.nation) : true;
    const items = [
      {
        label: hostileToYou ? 'Fight!' : `Attack${legal ? ' (letter of marque)' : ' (PIRACY!)'}`,
        cb: () => this.startBattle(s),
      },
      {
        label: hostileToYou ? 'Flee!' : 'Sail on',
        cb: () => { s.grace = 8; },
      },
    ];
    this.sound.bell();
    this.openMenu(who, items, s.type === 'nemesis' ? 'villain' : null,
      hostileToYou ? 'She runs out her guns!' : 'She dips her colours in greeting.');
    this.menu.cancel = () => { s.grace = 8; };
  }

  // ---------------- battle ----------------

  startBattle(enemyShip) {
    this.battleEnemy = enemyShip;
    this.bt = B.createBattle(this.st, enemyShip);
    this.state = 'battle';
    this.sound.playMusic('battle');
    this.sound.setWaves(true);
    this.setBanner(enemyShip.type === 'nemesis' ? 'The black galleon turns to fight!' : 'Battle stations!', 100);
  }

  upBattle(dt) {
    const inp = this.input, b = this.bt, st = this.st;
    const phase = B.stepBattle(b, {
      left: inp.down('left'), right: inp.down('right'),
      fire: inp.down('x'), board: inp.pressed('z'),
    }, dt);
    for (const ev of b.events) {
      if (ev === 'cannon') this.sound.cannon();
      else if (ev === 'splash') this.sound.splash();
      else if (ev === 'hitP' || ev === 'hitE') this.sound.crunch();
      else if (ev === 'sink') this.sound.sink();
      else if (ev === 'loot') this.sound.coin();
    }
    st.ship.hull = Math.max(1, Math.round(b.p.hull));

    if (phase === 'board') {
      this.startDuel('boarding');
    } else if (phase === 'looted') {
      // sank her (and maybe scooped the loot)
      const e = this.battleEnemy;
      const got = b.loot && b.loot.taken ? Math.round(e.gold * 0.6) : 0;
      if (e.nation >= 0) W.recordCapture(st, e.nation);
      W.removeShip(st, e);
      st.plunders++;
      W.moraleBoost(st, 8);
      st.gold += got;
      this.enterSailing();
      this.showMsg(got > 0
        ? [`She goes down! You fish ${got} gold`, 'from the flotsam.']
        : ['She goes down with all hands.']);
    } else if (phase === 'lost') {
      this.shipLost('Your ship slips beneath the waves!');
    } else if (phase === 'escaped') {
      this.battleEnemy.grace = 10;
      this.enterSailing();
      this.setBanner('You show them your heels.', 100);
    }
  }

  shipLost(why) {
    const st = this.st;
    st.gold = Math.floor(st.gold / 2);
    st.ship = { classIdx: 0, hull: W.SHIP_CLASSES[0].hull, sails: 100, cannons: W.SHIP_CLASSES[0].cannons };
    st.crew = Math.max(8, Math.floor(st.crew * 0.4));
    st.morale = Math.max(30, st.morale - 20);
    const home = W.WORLD.ports.find((p) => !st.hostile[p.nation]) || W.WORLD.ports[0];
    const spot = W.findSeaNear(st, home.tx, home.ty);
    st.x = spot.x; st.y = spot.y;
    this.enterSailing();
    this.showMsg([why, '', 'Fishermen drag you ashore. You start',
      'again with a leaky sloop, half your', 'gold, and your pride somewhere astern.']);
  }

  // ---------------- duel ----------------

  startDuel(context) {
    const st = this.st;
    const e = this.battleEnemy;
    const diff = W.DIFFS[st.diff];
    const nem = context === 'nemesis' || (e && e.type === 'nemesis');
    this.duelCtx = nem ? 'nemesis' : context;
    this.dl = D.createDuel({
      eSkill: Math.min(0.95, diff.eSkill + (nem ? 0.15 : 0)),
      eSpeed: diff.eSpeed + (nem ? 0.3 : 0),
      pWindup: 20 + W.agePenalty(st) - (st.fineSword ? 3 : 0),
      fineSword: st.fineSword,
      seed: (st.rngS ^ st.day) | 0,
    });
    this.state = 'duel';
    this.sound.duelSting();
    this.sound.playMusic('duel');
    this.sound.setWaves(false);
    this.duelAcc = 0;
  }

  upDuel(dt) {
    const inp = this.input, d = this.dl;
    this.duelAcc += dt;
    while (this.duelAcc >= 1 / 60) {
      this.duelAcc -= 1 / 60;
      const winner = D.stepDuel(d, {
        up: inp.down('up'), down: inp.down('down'),
        left: inp.down('left'), right: inp.down('right'),
        attack: inp.pressed('x'), parry: inp.pressed('z'),
      });
      // consume one-shot presses only once per frame batch
      this.input.endFrame();
      for (const ev of d.events) {
        if (ev === 'clang') this.sound.parry();
        else if (ev === 'hit') { this.sound.clash(); this.sound.grunt(); }
        else if (ev === 'swish') this.sound.swish();
      }
      if (winner) { this.resolveDuel(winner); return; }
    }
  }

  resolveDuel(winner) {
    const st = this.st, e = this.battleEnemy;
    if (winner === 'player') {
      if (this.duelCtx === 'nemesis') {
        W.defeatNemesis(st);
        W.removeShip(st, e);
        this.battleEnemy = null;
        this.bannerT = 0;
        this.state = 'ending';
        this.sound.treasureFanfare();
        this.sound.playMusic('ending');
        return;
      }
      // boarding victory → prize choices
      const legal = e.nation >= 0 ? W.recordCapture(st, e.nation) : true;
      W.removeShip(st, e);
      const spoils = P.captainSpoils(st, e);
      const cls = W.SHIP_CLASSES[e.classIdx];
      this.sound.promotionFanfare();
      this.openMenu(`${cls.name} captured! (+${e.gold} gold)`, [
        { label: `Take her as flagship (${cls.name})`, cb: () => this.finishCapture(e, 'flagship', spoils, legal) },
        { label: `Send her off as a prize (+${P.prizeValue(e.classIdx)}g)`, cb: () => this.finishCapture(e, 'prize', spoils, legal) },
        { label: 'Plunder the holds and scuttle her', cb: () => this.finishCapture(e, 'plunder', spoils, legal) },
      ]);
    } else {
      this.shipLost(this.duelCtx === 'nemesis'
        ? 'El Moorro laughs as you drop into the sea!'
        : 'You are driven off the deck!');
    }
  }

  finishCapture(e, choice, spoils, legal) {
    const st = this.st;
    const msg = [P.resolveCapture(st, e, choice)];
    if (!legal && e.nation >= 0) msg.push(`${W.NATIONS[e.nation].name} brands you a pirate!`);
    if (spoils) msg.push(spoils);
    this.battleEnemy = null;
    this.enterSailing();
    this.showMsg(msg);
  }

  // ---------------- port ----------------

  openPortMenu() {
    const st = this.st, p = this.curPort;
    this.sound.playMusic('tavern');
    this.state = 'port';
    this.openMenu(`${p.name} — ${W.NATIONS[p.nation].name}`, [
      { label: 'Governor\'s mansion', cb: () => this.openGovernor() },
      { label: 'Tavern', cb: () => this.openTavern() },
      { label: 'Shipwright', cb: () => this.openShipwright() },
      { label: 'Trade goods', cb: () => { this.state = 'trade'; this.tradeIdx = 0; } },
      { label: 'Save game', cb: () => { P.saveGame(st); this.sound.coin(); this.showMsg('Your log is safely stowed. (Saved)', () => this.openPortMenu()); } },
      { label: 'Retire from piracy', cb: () => this.confirmRetire() },
      { label: 'Set sail', cb: () => this.leavePort() },
    ]);
    this.menu.cancel = () => this.leavePort();
  }

  leavePort() {
    const st = this.st, p = this.curPort;
    // push off the coast a little
    const spot = W.findSeaNear(st, p.tx, p.ty);
    st.x = spot.x; st.y = spot.y;
    for (const s of st.ships) { if (Math.hypot(st.x - s.x, st.y - s.y) < 60) s.grace = 6; }
    this.portGrace = 2.5;
    this.enterSailing();
  }

  openGovernor() {
    const st = this.st, p = this.curPort;
    const aud = P.governorAudience(st, p);
    if (aud.promotion) this.sound.promotionFanfare();
    const items = [];
    for (const v of aud.marqueOffers) {
      items.push({
        label: `Accept letter of marque vs ${W.NATIONS[v].name}`,
        cb: () => this.showMsg(P.acceptMarque(st, p), () => this.openPortMenu()),
      });
    }
    items.push({ label: 'Take your leave', cb: () => this.openPortMenu() });
    this.openMenu('The Governor', items, 'governor', aud.lines.join('\n'));
    this.menu.cancel = () => this.openPortMenu();
  }

  openTavern() {
    const st = this.st;
    const items = [
      {
        label: `Hire 5 crew (${P.CREW_COST * 5}g) [${st.crew}/${P.crewCapacity(st)}]`,
        cb: () => {
          const got = P.hireCrew(st, 5);
          this.sound.coin();
          this.showMsg(got > 0 ? `${got} salty souls sign your articles.` : 'No takers — full ship or empty purse.', () => this.openTavern());
        },
      },
      {
        label: `Buy a round — hear rumors (${P.ROUND_COST}g)`,
        cb: () => {
          const r = P.buyRumor(st);
          this.showMsg(r ? r.text : 'Your purse is too light for that.', () => this.openTavern());
        },
      },
      st.fragments < 4 ? {
        label: `Old sailor's map fragment (${P.fragmentCost(st)}g) [${st.fragments}/4]`,
        cb: () => {
          const r = P.buyFragment(st);
          if (r.ok) this.sound.treasureFanfare();
          this.showMsg(r.text, () => this.openTavern());
        },
      } : null,
      !st.fineSword ? {
        label: `Toledo blade (${P.SWORD_COST}g)`,
        cb: () => {
          const r = P.buyFineSword(st);
          if (r.ok) this.sound.parry();
          this.showMsg(r.text, () => this.openTavern());
        },
      } : null,
      { label: 'Back to the quay', cb: () => this.openPortMenu() },
    ];
    this.openMenu('The Tavern', items, 'tavern', `Gold: ${st.gold}   Morale: ${Math.round(st.morale)}`);
    this.menu.cancel = () => this.openPortMenu();
  }

  openShipwright() {
    const st = this.st;
    const rc = P.repairCost(st);
    const items = [
      {
        label: rc > 0 ? `Repair hull & sails (${rc}g)` : 'Hull is sound',
        disabled: rc === 0,
        cb: () => {
          this.showMsg(P.doRepair(st) ? 'Caulked, patched and rigged anew.' : 'You cannot afford the yard fees.', () => this.openShipwright());
        },
      },
      {
        label: `Add a cannon (${P.CANNON_COST}g) [${st.ship.cannons}/${P.maxCannons(st)}]`,
        cb: () => {
          this.showMsg(P.buyCannon(st) ? 'Another gun run out the ports!' : 'No room or no gold, Captain.', () => this.openShipwright());
        },
      },
    ];
    for (let ci = 0; ci < W.SHIP_CLASSES.length; ci++) {
      if (ci === st.ship.classIdx) continue;
      const cls = W.SHIP_CLASSES[ci];
      items.push({
        label: `Buy ${cls.name} (${P.shipSwapCost(st, ci)}g) g${cls.cannons} c${cls.cargo}`,
        cb: () => {
          this.showMsg(P.buyShipClass(st, ci)
            ? `The ${cls.name} is yours. Fair winds!`
            : 'Your purse will not stretch to her.', () => this.openShipwright());
        },
      });
    }
    items.push({ label: 'Back to the quay', cb: () => this.openPortMenu() });
    const cls = W.SHIP_CLASSES[st.ship.classIdx];
    this.openMenu('The Shipwright', items, 'shipwright',
      `${cls.name}: hull ${Math.round(st.ship.hull)}/${cls.hull}  guns ${st.ship.cannons}  gold ${st.gold}`);
    this.menu.cancel = () => this.openPortMenu();
  }

  // ---------------- trade ----------------

  upTrade() {
    const st = this.st, inp = this.input, p = this.curPort;
    if (inp.pressed('up')) { this.tradeIdx = (this.tradeIdx + W.GOODS.length - 1) % W.GOODS.length; this.sound.moveCur(); }
    if (inp.pressed('down')) { this.tradeIdx = (this.tradeIdx + 1) % W.GOODS.length; this.sound.moveCur(); }
    const many = inp.down('left') || inp.down('right') ? 10 : 1;
    if (inp.pressed('x')) {
      const n = W.buyGood(st, p.i, this.tradeIdx, many);
      if (n > 0) this.sound.buy(); else this.sound.deny();
    }
    if (inp.pressed('z')) {
      const n = W.sellGood(st, p.i, this.tradeIdx, many);
      if (n > 0) this.sound.sellSfx(); else this.sound.deny();
    }
    if (inp.pressed('start')) { this.sound.select(); this.state = 'port'; this.openPortMenu(); }
  }

  // ---------------- beach / treasure ----------------

  enterBeach() {
    this.state = 'beach';
    this.sound.setWaves(true);
    this.sound.stopMusic();
    this.beach = {
      x: 160, y: 200,
      dug: false,
      spot: { x: 236, y: 96 },
    };
    this.setBanner('A deserted isle. Bring the map... and a spade.', 150);
  }

  upBeach(dt) {
    const st = this.st, inp = this.input, b = this.beach;
    const spd = 60 * dt;
    if (inp.down('left')) b.x -= spd;
    if (inp.down('right')) b.x += spd;
    if (inp.down('up')) b.y -= spd;
    if (inp.down('down')) b.y += spd;
    b.x = Math.max(8, Math.min(VIEW_W - 8, b.x));
    b.y = Math.max(60, Math.min(VIEW_H - 10, b.y));

    if (inp.pressed('start') || (b.y > VIEW_H - 14 && inp.pressed('z'))) {
      this.enterSailing();
      return;
    }
    if (inp.pressed('x')) {
      this.sound.dig();
      const near = Math.hypot(b.x - b.spot.x, b.y - b.spot.y) < 16;
      if (near && W.treasureKnown(st) && !st.treasureFound) {
        const gold = W.digTreasure(st);
        b.dug = true;
        this.sound.treasureFanfare();
        this.showMsg([
          'Your spade strikes oak! A great chest —',
          `the Lost Treasure of Moore!`,
          '',
          `+${gold} GOLD`,
        ]);
      } else if (near && st.treasureFound) {
        this.setBanner('Only an empty pit remains.', 90);
      } else if (W.treasureKnown(st)) {
        this.setBanner('Nothing but sand and crabs here.', 90);
      } else {
        this.setBanner(`You need the whole map... (${st.fragments}/4 fragments)`, 120);
      }
    }
  }

  // ---------------- retirement / endings ----------------

  confirmRetire() {
    this.openMenu('Hang up the cutlass?', [
      { label: 'Yes — retire with my fortune', cb: () => this.doRetire(false) },
      { label: 'No — the sea still calls', cb: () => this.openPortMenu() },
    ]);
    this.menu.cancel = () => this.openPortMenu();
  }

  doRetire(marooned) {
    const st = this.st;
    st.retired = true;
    this.retireInfo = W.careerScore(st);
    this.retireMarooned = marooned;
    this.bannerT = 0;
    this.state = 'retire';
    this.sound.setWaves(false);
    this.sound.playMusic(marooned ? 'title' : 'ending');
    if (typeof localStorage !== 'undefined') localStorage.removeItem(P.SAVE_KEY);
  }

  upRetire() {
    if (this.input.pressed('start') || this.input.pressed('x')) {
      this.sound.select();
      this.state = 'title';
      this.titleIdx = 0;
    }
  }

  upEnding() {
    if (this.input.pressed('start') || this.input.pressed('x')) {
      this.sound.select();
      this.enterSailing();
      this.showMsg([
        'The Moore estate is yours again.',
        'Sail on as long as you please —',
        'and retire, when you will, a legend.',
      ]);
    }
  }

  // ================= drawing =================

  draw() {
    ctx.fillStyle = PAL.black;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    switch (this.state) {
      case 'title': this.drTitle(); break;
      case 'newgame': this.drNewGame(); break;
      case 'sailing': case 'port': this.drSailing(); break;
      case 'battle': this.drBattle(); break;
      case 'duel': this.drDuel(); break;
      case 'trade': this.drTrade(); break;
      case 'beach': this.drBeach(); break;
      case 'retire': this.drRetire(); break;
      case 'ending': this.drEnding(); break;
    }
    if (this.banner && this.bannerT > 0) {
      this.bannerT--;
      text(ctx, this.banner, VIEW_W / 2, 34, PAL.gold, 8, 'center');
    }
    if (this.menu) this.drMenu();
    if (this.msg) this.drMsg();
  }

  drParchment() {
    ctx.fillStyle = PAL.parch;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = PAL.parchDark;
    for (let i = 0; i < 40; i++) {
      const x = (i * 53) % VIEW_W, y = (i * 97) % VIEW_H;
      ctx.fillRect(x, y, 3, 1);
    }
    // faint chart lines
    ctx.strokeStyle = 'rgba(120,90,40,0.35)';
    ctx.lineWidth = 1;
    for (const [x1, y1, x2, y2] of [[20, 40, 300, 90], [40, 200, 280, 30], [10, 120, 310, 150]]) {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }
    // sketched islands
    ctx.fillStyle = 'rgba(120,90,40,0.30)';
    for (const [x, y, w, h] of [[50, 60, 40, 18], [180, 50, 60, 22], [90, 150, 50, 20], [230, 140, 44, 26]]) {
      ctx.beginPath(); ctx.ellipse(x, y, w / 2, h / 2, 0.3, 0, Math.PI * 2); ctx.fill();
    }
    drawCompassRose(ctx, 272, 180, 24, -Math.PI / 2 + Math.sin(this.frame / 90) * 0.2);
  }

  drTitle() {
    this.drParchment();
    ctx.fillStyle = 'rgba(16,16,24,0.75)';
    ctx.fillRect(30, 26, 260, 54);
    text(ctx, "MOORE'S BOOTY", VIEW_W / 2, 36, PAL.gold, 20, 'center');
    text(ctx, 'a Caribbean career of sail & steel', VIEW_W / 2, 62, PAL.parch, 8, 'center');
    const items = P.hasSave() ? ['New Career', 'Load Saved Career'] : ['New Career'];
    items.forEach((s, i) => {
      const sel = i === this.titleIdx;
      text(ctx, (sel ? '> ' : '  ') + s, VIEW_W / 2, 110 + i * 16, sel ? '#101018' : '#403018', 10, 'center');
    });
    text(ctx, 'Enter / X to choose', VIEW_W / 2, 154, '#605030', 8, 'center');
    // a little sloop sails the chart
    drawShip(ctx, 60 + (this.frame / 3) % 240, 100, 0, 0, 4);
  }

  drNewGame() {
    this.drParchment();
    ctx.fillStyle = 'rgba(16,16,24,0.82)';
    ctx.fillRect(24, 16, 272, 192);
    text(ctx, 'ARTICLES OF THE VOYAGE', VIEW_W / 2, 26, PAL.gold, 10, 'center');
    const rows = [
      ['Name', this.ngName + (this.frame % 40 < 20 && this.ngField === 0 ? '_' : '')],
      ['Nation', W.NATIONS[this.ngNation].name],
      ['Difficulty', W.DIFFS[this.ngDiff].name],
      ['', 'SIGN THE ARTICLES'],
    ];
    rows.forEach(([k, v], i) => {
      const sel = this.ngField === i;
      const y = 58 + i * 26;
      if (k) text(ctx, k, 60, y, PAL.parch, 8);
      text(ctx, (sel ? '> ' : '  ') + v, 130, y, sel ? PAL.gold : '#c8c0a0', i === 3 ? 10 : 9);
      if (i === 1) {
        ctx.fillStyle = W.NATIONS[this.ngNation].color;
        ctx.fillRect(110, y, 12, 8);
      }
    });
    text(ctx, 'type your name  ·  arrows change  ·  Enter begin', VIEW_W / 2, 186, '#889', 7, 'center');
    text(ctx, 'difficulty sets enemy blades, prices & the wind', VIEW_W / 2, 198, '#667', 7, 'center');
  }

  // ---- world / sailing ----

  drSailing() {
    const st = this.st;
    if (!st) return;
    const camX = Math.max(0, Math.min(W.WORLD_W - VIEW_W, st.x - VIEW_W / 2));
    const camY = Math.max(0, Math.min(W.WORLD_H - VIEW_H, st.y - VIEW_H / 2));
    this.drMap(camX, camY);

    // AI ships
    for (const s of st.ships) {
      const sx = s.x - camX, sy = s.y - camY;
      if (sx < -30 || sx > VIEW_W + 30 || sy < -30 || sy > VIEW_H + 30) continue;
      const col = s.type === 'pirate' || s.type === 'nemesis' ? 4 : s.nation;
      drawShip(ctx, sx, sy, s.a, s.classIdx, col);
    }
    // player
    drawShip(ctx, st.x - camX, st.y - camY, st.heading, st.ship.classIdx, this.playerColor());
    // wake
    ctx.fillStyle = 'rgba(210,230,240,0.5)';
    for (let i = 1; i < 4; i++) {
      ctx.fillRect(st.x - camX - Math.cos(st.heading) * (14 + i * 7) - 1,
        st.y - camY - Math.sin(st.heading) * (14 + i * 7), 2, 1);
    }

    this.drSailHUD();
  }

  drMap(camX, camY) {
    const st = this.st;
    const f = Math.floor(this.frame / 14) % 3;
    const tx0 = Math.floor(camX / W.TILE), ty0 = Math.floor(camY / W.TILE);
    for (let ty = ty0; ty <= ty0 + Math.ceil(VIEW_H / W.TILE); ty++) {
      for (let tx = tx0; tx <= tx0 + Math.ceil(VIEW_W / W.TILE); tx++) {
        const t = W.tileAt(W.WORLD.mask, tx, ty);
        const dx = tx * W.TILE - camX, dy = ty * W.TILE - camY;
        if (t === W.SEA) ctx.drawImage(SPR.sea[(f + ((tx + ty) % 3)) % 3], dx, dy);
        else if (t === W.REEF) ctx.drawImage(SPR.reef[(f + ((tx * 2 + ty) % 3)) % 3], dx, dy);
        else {
          // land: sandy if coastal, green inland
          let coastal = false;
          for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            if (W.tileAt(W.WORLD.mask, tx + ox, ty + oy) !== W.LAND) { coastal = true; break; }
          }
          ctx.drawImage(coastal ? SPR.sand : SPR.land, dx, dy);
        }
      }
    }
    // ports + flags + names
    for (const p of W.WORLD.ports) {
      const dx = p.x - 16 - camX, dy = p.y - 16 - camY;
      if (dx < -40 || dx > VIEW_W + 8 || dy < -40 || dy > VIEW_H + 8) continue;
      ctx.drawImage(SPR.ports[p.nation], dx, dy);
      if (st && Math.hypot(st.x - p.x, st.y - p.y) < 110) {
        text(ctx, p.name, dx + 16, dy - 10, st.hostile[p.nation] ? PAL.red : '#fff', 7, 'center');
      }
    }
    // deserted isle dressing + the X
    const tr = W.WORLD.treasure;
    const ix = tr.x - camX, iy = tr.y - camY;
    if (ix > -60 && ix < VIEW_W + 60 && iy > -60 && iy < VIEW_H + 60) {
      ctx.drawImage(SPR.palm, ix - 26, iy - 30);
      ctx.drawImage(SPR.palm, ix + 8, iy - 18);
      if (st && W.treasureKnown(st) && !st.treasureFound) {
        ctx.strokeStyle = PAL.red;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ix - 5, iy - 5); ctx.lineTo(ix + 5, iy + 5);
        ctx.moveTo(ix + 5, iy - 5); ctx.lineTo(ix - 5, iy + 5);
        ctx.stroke();
      }
      if (st && W.nearTreasureIsle(st)) {
        text(ctx, 'X: go ashore', ix, iy + 22, PAL.gold, 7, 'center');
      }
    }
  }

  drSailHUD() {
    const st = this.st;
    ctx.fillStyle = 'rgba(10,14,24,0.8)';
    ctx.fillRect(0, 0, VIEW_W, 22);
    text(ctx, W.dateStr(st), 4, 3, PAL.parch, 8);
    text(ctx, `Gold ${st.gold}`, 4, 13, PAL.gold, 7);
    text(ctx, `Crew ${st.crew}`, 88, 13, '#cde', 7);
    const mCol = st.morale > 50 ? '#7c8' : st.morale > 25 ? PAL.gold : PAL.red;
    text(ctx, `Morale ${Math.round(st.morale)}`, 146, 13, mCol, 7);
    const food = st.cargo[0];
    text(ctx, `Food ${food}`, 224, 13, food > 10 ? '#cde' : PAL.red, 7);
    const cls = W.SHIP_CLASSES[st.ship.classIdx];
    text(ctx, `${cls.name}  hull ${Math.max(0, Math.round(st.ship.hull))}`, 110, 3, '#cde', 7);
    text(ctx, `frag ${st.fragments}/4`, 224, 3, st.fragments >= 4 ? PAL.gold : '#89a', 7);
    // wind rose + trim readout
    drawCompassRose(ctx, VIEW_W - 22, 44, 15, this.st.wind);
    const pct = Math.round((this.sailWf || 1) * 100);
    text(ctx, `wind ${pct}%`, VIEW_W - 22, 64, pct > 75 ? '#7c8' : pct > 45 ? PAL.parch : PAL.red, 7, 'center');
  }

  // ---- battle ----

  drBattle() {
    const b = this.bt;
    const shx = (Math.random() - 0.5) * b.shake, shy = (Math.random() - 0.5) * b.shake;
    ctx.save();
    ctx.translate(shx, shy);
    // arena sea, scaled 0.5 so the whole 640x448 fits the view
    ctx.save();
    ctx.scale(0.5, 0.5);
    const f = Math.floor(this.frame / 14) % 3;
    for (let ty = 0; ty < B.ARENA_H / 32; ty++) {
      for (let tx = 0; tx < B.ARENA_W / 32; tx++) {
        ctx.drawImage(SPR.sea[(f + ((tx + ty) % 3)) % 3], tx * 32, ty * 32);
      }
    }
    if (b.loot && !b.loot.taken) ctx.drawImage(SPR.loot, b.loot.x - 8, b.loot.y - 8);
    for (const sp of b.splashes) {
      ctx.fillStyle = PAL.foam;
      ctx.beginPath(); ctx.arc(sp.x, sp.y, 6 * sp.t + 2, 0, Math.PI * 2); ctx.fill();
    }
    for (const ball of b.balls) {
      ctx.fillStyle = PAL.black;
      ctx.fillRect(ball.x - 2, ball.y - 2, 4, 4);
    }
    if (b.phase === 'fight') {
      const e = b.e;
      const col = b.enemyType === 'pirate' || b.enemyType === 'nemesis' ? 4 : b.enemyNation;
      drawShip(ctx, e.x, e.y, e.a, e.classIdx, col, e.sails);
    }
    drawShip(ctx, b.p.x, b.p.y, b.p.a, b.p.classIdx, this.playerColor(), b.p.sails);
    ctx.restore();
    ctx.restore();

    // HUD
    ctx.fillStyle = 'rgba(10,14,24,0.8)';
    ctx.fillRect(0, 0, VIEW_W, 20);
    const bar = (x, label, v, max, col) => {
      text(ctx, label, x, 2, '#cde', 7);
      ctx.fillStyle = '#223';
      ctx.fillRect(x, 11, 60, 5);
      ctx.fillStyle = col;
      ctx.fillRect(x, 11, Math.max(0, Math.min(60, (v / max) * 60)), 5);
    };
    bar(6, `You (${W.SHIP_CLASSES[b.p.classIdx].name})`, b.p.hull, b.p.maxHull, '#7c8');
    bar(120, 'Enemy hull', Math.max(0, b.e.hull), b.e.maxHull, PAL.red);
    bar(228, 'Reload', Math.max(0, B.reloadTime(b.p.classIdx) - Math.max(0, b.p.reload)), B.reloadTime(b.p.classIdx), PAL.gold);
    drawCompassRose(ctx, VIEW_W - 20, 40, 13, b.wind);
    if (B.boardable(b)) text(ctx, 'Z — BOARD HER!', VIEW_W / 2, VIEW_H - 16, PAL.gold, 10, 'center');
    else if (b.phase === 'sunk' && b.loot && !b.loot.taken) text(ctx, 'Sail over the flotsam to loot it — or sail off the edge to leave', VIEW_W / 2, VIEW_H - 14, PAL.parch, 7, 'center');
    else text(ctx, 'arrows steer · X broadside · off the edge = flee', VIEW_W / 2, VIEW_H - 12, '#89a', 7, 'center');
  }

  // ---- duel ----

  drDuel() {
    const d = this.dl;
    // sky + sea horizon
    ctx.fillStyle = '#88b8d0';
    ctx.fillRect(0, 0, VIEW_W, 96);
    ctx.fillStyle = PAL.sea;
    ctx.fillRect(0, 96, VIEW_W, 40);
    ctx.fillStyle = PAL.seaLight;
    for (let i = 0; i < 10; i++) ctx.fillRect((i * 37 + this.frame) % VIEW_W, 100 + (i * 13) % 30, 8, 1);
    // deck: maps duel coords (0..DECK) onto screen with rails at both ends
    const x0 = 24, x1 = VIEW_W - 24;
    const mapx = (v) => x0 + ((x1 - x0) * v) / D.DECK;
    ctx.fillStyle = PAL.wood;
    ctx.fillRect(x0 - 10, 150, x1 - x0 + 20, 30);
    ctx.fillStyle = PAL.woodDark;
    for (let i = 0; i < 12; i++) ctx.fillRect(x0 - 10 + i * 26, 150, 1, 30);
    ctx.fillRect(x0 - 10, 150, x1 - x0 + 20, 2);
    // masts + rigging backdrop
    ctx.fillStyle = PAL.woodDark;
    ctx.fillRect(80, 20, 4, 130);
    ctx.fillRect(230, 30, 4, 120);
    ctx.strokeStyle = 'rgba(40,30,20,0.6)';
    ctx.beginPath(); ctx.moveTo(82, 20); ctx.lineTo(180, 150); ctx.stroke();
    // the drop off both ends
    ctx.fillStyle = PAL.navy;
    ctx.fillRect(0, 150, x0 - 10, 74);
    ctx.fillRect(x1 + 10, 150, VIEW_W - x1 - 10, 74);

    const poseOf = (f, foe) => ({
      stance: f.windup > 0 ? f.attackStance : f.stance,
      windup: f.windup > 0 ? f.windup / (f.windupLen || 20) : 0,
      strike: f.strike > 0 ? 1 : 0,
      parry: f.parry > 0,
      stun: f.stun > 0,
      hurt: f.hurt > 0,
      walk: this.frame,
    });
    drawFencer(ctx, mapx(d.p.x), 150, 1, poseOf(d.p, d.e), { body: '#3858c8', trim: PAL.gold, hat: '#182888' });
    drawFencer(ctx, mapx(d.e.x), 150, -1, poseOf(d.e, d.p),
      this.duelCtx === 'nemesis' ? { body: '#282830', trim: PAL.red, hat: '#101014' } : { body: '#801818', trim: '#e0b830', hat: '#4c3018' });

    // telegraphs
    const tele = (f, sx) => {
      if (f.windup > 0) {
        const ic = ['HIGH', 'MID', 'LOW'][f.attackStance];
        text(ctx, ic + '!', sx, 108, PAL.red, 8, 'center');
      } else if (f.stun > 0) text(ctx, 'staggered!', sx, 108, PAL.gold, 7, 'center');
    };
    tele(d.p, mapx(d.p.x)); tele(d.e, mapx(d.e.x));

    // HUD
    ctx.fillStyle = 'rgba(10,14,24,0.8)';
    ctx.fillRect(0, 0, VIEW_W, 18);
    text(ctx, this.st.name, 8, 5, '#9cf', 8);
    text(ctx, this.duelCtx === 'nemesis' ? 'CAPITAN EL MOORRO' : 'the enemy captain', VIEW_W - 8, 5, PAL.red, 8, 'right');
    if (this.duelCtx === 'nemesis') {
      ctx.drawImage(SPR.portraits.villain, VIEW_W / 2 - 20, VIEW_H - 46);
    }
    text(ctx, 'up/dn stance · X attack · Z parry (match!) · push them off the deck', VIEW_W / 2, VIEW_H - 10, '#89a', 7, 'center');
  }

  // ---- trade ----

  drTrade() {
    this.drSailing();
    const st = this.st, p = this.curPort;
    panel(ctx, 24, 24, 272, 176);
    text(ctx, `${p.name} MARKET — ${W.NATIONS[p.nation].name}`, VIEW_W / 2, 32, PAL.gold, 9, 'center');
    text(ctx, `Gold: ${st.gold}   Hold: ${W.cargoTotal(st)}/${W.cargoMax(st)}`, VIEW_W / 2, 46, PAL.parch, 8, 'center');
    text(ctx, 'good        buy   sell   held', 48, 62, '#89a', 8);
    for (let g = 0; g < W.GOODS.length; g++) {
      const sel = g === this.tradeIdx;
      const y = 76 + g * 15;
      const bp = W.buyPrice(st, p.i, g), sp = W.sellPrice(st, p.i, g);
      text(ctx, (sel ? '> ' : '  ') + W.GOODS[g].name.padEnd(9), 48, y, sel ? PAL.gold : '#cde', 8);
      text(ctx, String(bp).padStart(4), 148, y, '#e88', 8);
      text(ctx, String(sp).padStart(4), 188, y, '#8e8', 8);
      text(ctx, String(st.cargo[g]).padStart(4), 232, y, '#cde', 8);
    }
    text(ctx, 'X buy · Z sell · hold arrow-left/right = x10', VIEW_W / 2, 162, '#89a', 7, 'center');
    text(ctx, 'Enter — back to port', VIEW_W / 2, 176, PAL.parch, 8, 'center');
  }

  // ---- beach ----

  drBeach() {
    const st = this.st, b = this.beach;
    ctx.fillStyle = '#88b8d0';
    ctx.fillRect(0, 0, VIEW_W, 40);
    ctx.fillStyle = PAL.sea;
    ctx.fillRect(0, 40, VIEW_W, 18);
    for (let x = 0; x < VIEW_W; x += 32) ctx.drawImage(SPR.sand, x, 56);
    ctx.fillStyle = PAL.sand;
    ctx.fillRect(0, 56, VIEW_W, VIEW_H - 56);
    ctx.fillStyle = PAL.sandDark;
    for (let i = 0; i < 30; i++) ctx.fillRect((i * 53 + 11) % VIEW_W, 70 + (i * 37) % 140, 3, 1);
    ctx.drawImage(SPR.palm, 40, 70);
    ctx.drawImage(SPR.palm, 110, 100);
    ctx.drawImage(SPR.palm, 260, 140);
    // your boat
    drawShip(ctx, 160, 46, Math.PI, 0, this.playerColor());
    // the X
    if (W.treasureKnown(st) && !st.treasureFound) {
      ctx.strokeStyle = PAL.red; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.spot.x - 7, b.spot.y - 7); ctx.lineTo(b.spot.x + 7, b.spot.y + 7);
      ctx.moveTo(b.spot.x + 7, b.spot.y - 7); ctx.lineTo(b.spot.x - 7, b.spot.y + 7);
      ctx.stroke();
    }
    if (b.dug) {
      ctx.fillStyle = PAL.woodDark;
      ctx.fillRect(b.spot.x - 8, b.spot.y - 4, 16, 10);
      ctx.fillStyle = PAL.gold;
      ctx.fillRect(b.spot.x - 6, b.spot.y - 2, 12, 3);
    }
    // the captain ashore
    drawFencer(ctx, b.x, b.y, 1, { stance: 1, windup: 0, strike: 0, parry: false, stun: false, hurt: false, walk: this.frame }, { body: '#3858c8', trim: PAL.gold, hat: '#182888' });
    text(ctx, 'X — dig · Enter — back to ship', VIEW_W / 2, VIEW_H - 10, '#89a', 7, 'center');
  }

  // ---- retire / ending ----

  drRetire() {
    this.drParchment();
    ctx.fillStyle = 'rgba(16,16,24,0.85)';
    ctx.fillRect(20, 12, 280, 200);
    const r = this.retireInfo;
    text(ctx, this.retireMarooned ? 'MAROONED BY YOUR OWN CREW' : 'THE CAREER OF ' + this.st.name.toUpperCase(),
      VIEW_W / 2, 22, this.retireMarooned ? PAL.red : PAL.gold, 10, 'center');
    const rows = [
      ['Years at sea', String(r.years)],
      ['Gold', String(r.gold)],
      ['Land granted', `${r.land} acres`],
      ['Rank honours', String(r.rankPts)],
      ['Lost Treasure of Moore', r.treasure ? 'FOUND' : 'never found'],
      ['El Moorro', r.nemesis ? 'DEFEATED' : 'still at large'],
    ];
    rows.forEach(([k, v], i) => {
      text(ctx, k, 50, 46 + i * 15, PAL.parch, 8);
      text(ctx, v, 270, 46 + i * 15, '#cde', 8, 'right');
    });
    text(ctx, `SCORE: ${r.score}`, VIEW_W / 2, 146, PAL.gold, 12, 'center');
    text(ctx, `You retire as... ${r.title.toUpperCase()}`, VIEW_W / 2, 166, '#fff', 10, 'center');
    text(ctx, 'Enter — back to the title', VIEW_W / 2, 194, '#89a', 8, 'center');
  }

  drEnding() {
    ctx.fillStyle = '#182030';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // sunset
    ctx.fillStyle = '#d87838';
    ctx.beginPath(); ctx.arc(VIEW_W / 2, 120, 30, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#c05828';
    ctx.fillRect(0, 120, VIEW_W, 3);
    ctx.fillStyle = PAL.navy;
    ctx.fillRect(0, 122, VIEW_W, VIEW_H - 122);
    // the black galleon going down
    ctx.save();
    ctx.translate(VIEW_W / 2 + 60, 130);
    ctx.rotate(0.5);
    drawShip(ctx, 0, 0, -Math.PI / 2, 3, 4);
    ctx.restore();
    ctx.drawImage(SPR.portraits.villain, 30, 130);
    text(ctx, 'THE TRUE ENDING', VIEW_W / 2, 20, PAL.gold, 12, 'center');
    const lines = [
      'El Moorro yields on his own quarterdeck.',
      'The deed to the Moore estate is in his',
      'sea chest — with a fortune in plunder.',
      '',
      'Your family name is restored.',
    ];
    lines.forEach((s, i) => text(ctx, s, VIEW_W / 2, 44 + i * 12, '#e8e4d0', 8, 'center'));
    text(ctx, 'Enter — sail on', VIEW_W / 2, 200, '#89a', 8, 'center');
  }

  // ---- modals ----

  drMenu() {
    const m = this.menu;
    const h = 60 + m.items.length * 14 + (m.sub ? m.sub.split('\n').length * 10 : 0);
    const y0 = Math.max(10, (VIEW_H - h) / 2);
    panel(ctx, 20, y0, 280, h);
    text(ctx, m.title, VIEW_W / 2, y0 + 8, PAL.gold, 9, 'center');
    let y = y0 + 24;
    if (m.portrait && SPR.portraits[m.portrait]) {
      ctx.drawImage(SPR.portraits[m.portrait], 32, y0 + 24);
    }
    if (m.sub) {
      for (const line of m.sub.split('\n')) {
        text(ctx, line, m.portrait ? 84 : VIEW_W / 2, y, PAL.parch, 7, m.portrait ? 'left' : 'center');
        y += 10;
      }
      y += 4;
    }
    m.items.forEach((it, i) => {
      const sel = i === m.idx;
      const col = it.disabled ? '#556' : sel ? PAL.gold : '#cde';
      text(ctx, (sel ? '> ' : '  ') + it.label, m.portrait ? 84 : 40, y + i * 14, col, 8);
    });
  }

  drMsg() {
    const lines = this.msg.lines;
    const h = 34 + lines.length * 12;
    const y0 = (VIEW_H - h) / 2;
    panel(ctx, 28, y0, 264, h);
    lines.forEach((s, i) => text(ctx, s, VIEW_W / 2, y0 + 12 + i * 12, '#e8e4d0', 8, 'center'));
    text(ctx, '· X ·', VIEW_W / 2, y0 + h - 14, '#89a', 7, 'center');
  }
}

// ---------------- boot ----------------

const game = new Game();
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.frame++;
  game.update(dt);
  game.sound.updateMusic();
  game.draw();
  game.input.endFrame();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// tiny hooks for automated browser tests
window.__game = game;
window.__W = W;
