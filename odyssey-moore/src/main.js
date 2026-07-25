// main.js — The Odyssey of Moore. Engine, shared voyage state, scene manager, test hook.
import { Input } from './input.js';
import { Audio } from './audio.js';
import { drawHUD, drawToast } from './hud.js';
import { VOYAGE } from './voyage.js';
import { clamp } from './util.js';

import TitleScene from './scenes/title.js';
import SeaMapScene from './scenes/seamap.js';
import NavalScene from './scenes/naval.js';
import LandScene from './scenes/land.js';
import IslandScene from './scenes/island.js';
import CyclopsScene from './scenes/cyclops.js';
import GauntletScene from './scenes/gauntlet.js';
import EndScene from './scenes/end.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
const W = canvas.width, H = canvas.height;

const audio = new Audio();
const input = new Input();
input.bindTouch({
  stick: document.getElementById('stick'), nub: document.getElementById('nub'),
  a: document.getElementById('bA'), b: document.getElementById('bB'), c: document.getElementById('bC'),
  c1: document.getElementById('bC1'), c2: document.getElementById('bC2'), c3: document.getElementById('bC3'),
  choices: document.getElementById('choices'),
}, audio);

const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
if (isTouch) document.getElementById('touch').classList.add('on');

function newState() {
  return {
    crew: 24, crewMax: 24,
    hull: 130, hullMax: 130,
    hp: 100, hpMax: 100,
    favor: 30, favorMax: 100,
    glory: 0,
    poseidonWrath: false,
    lotusRested: false,
  };
}

// ---- shared game context handed to every scene ----
const G = {
  W, H, ctx, canvas, input, audio, isTouch,
  state: newState(),
  stageIndex: 0,
  phases: [], phaseIndex: 0,
  scene: null, sceneName: '',
  toastMsg: '', toastT: 0,
  scenes: null,
  VOYAGE,

  setButtons(l) { input.setButtons(l); },
  showChoices(l) { input.showChoices(l); },
  toast(msg, dur = 2.4) { this.toastMsg = msg; this.toastT = dur; },

  setScene(name, cfg) {
    this.scene = this.scenes[name];
    this.sceneName = name;
    input.clearEdges();
    input.showChoices(null);
    input.setButtons({ a: '', b: '', c: '' });
    this.scene.enter(cfg || {});
  },

  // ----- voyage flow -----
  startVoyage() {
    this.state = newState();
    this.stageIndex = 0;
    audio.ensure(); audio.resume();
    this.setScene('seamap', {});
  },
  phasesFor(st) {
    const p = ['intro'];
    if (st.battle) p.push(st.type === 'naval' ? 'naval' : 'land');
    if (st.type === 'cyclops') p.push('cyclops');
    if (st.type === 'gauntlet') p.push('gauntlet');
    if (st.choices) p.push('choice');
    return p;
  },
  enterStage(i) {
    this.stageIndex = i;
    this.phases = this.phasesFor(VOYAGE[i]);
    this.phaseIndex = 0;
    this._runPhase();
  },
  _runPhase() {
    const st = VOYAGE[this.stageIndex];
    const ph = this.phases[this.phaseIndex];
    if (ph === 'intro' || ph === 'choice') this.setScene('island', { stage: st, phase: ph });
    else if (ph === 'land') this.setScene('land', { stage: st, battle: st.battle });
    else if (ph === 'naval') this.setScene('naval', { stage: st, battle: st.battle });
    else if (ph === 'cyclops') this.setScene('cyclops', { stage: st });
    else if (ph === 'gauntlet') this.setScene('gauntlet', { stage: st });
  },
  phaseDone() {
    this.phaseIndex++;
    if (this.phaseIndex < this.phases.length) { this._runPhase(); return; }
    // stage complete
    this.stageIndex++;
    if (this.stageIndex >= VOYAGE.length) { this.win(); return; }
    this.setScene('seamap', { arrived: true });
  },
  returnToMap() { this.setScene('seamap', {}); },

  // ----- resource helpers -----
  applyEffect(e) {
    if (!e) return;
    const s = this.state;
    if (e.crew) s.crew = clamp(s.crew + e.crew, 0, s.crewMax);
    if (e.hull) s.hull = clamp(s.hull + e.hull, 0, s.hullMax);
    if (e.hp) s.hp = clamp(s.hp + e.hp, 0, s.hpMax);
    if (e.favor) s.favor = clamp(s.favor + e.favor, 0, s.favorMax);
    if (e.glory) s.glory += e.glory;
  },
  addGlory(n) { this.state.glory += n; },
  checkDeath() {
    const s = this.state;
    if (s.hp <= 0) return this.gameOver('Odysseus falls. The voyage ends in shadow.');
    if (s.crew <= 0) return this.gameOver('The last oarsman is lost. The ship drifts, crewless.');
    if (s.hull <= 0) return this.gameOver('The black ship breaks apart beneath the waves.');
    return false;
  },
  gameOver(msg) {
    if (this.sceneName === 'end') return true;
    audio.setMode('tense');
    this.setScene('end', { win: false, msg });
    return true;
  },
  win() {
    audio.setMode('calm'); audio.victory();
    this.setScene('end', { win: true, msg: 'Ithaca is won. Glory ' + this.state.glory + '.' });
  },
};

// instantiate scenes
G.scenes = {
  title: new TitleScene(G),
  seamap: new SeaMapScene(G),
  naval: new NavalScene(G),
  land: new LandScene(G),
  island: new IslandScene(G),
  cyclops: new CyclopsScene(G),
  gauntlet: new GauntletScene(G),
  end: new EndScene(G),
};

// start on title
G.setScene('title', {});

// global keys: mute + restart
function globalKeys() {
  if (input.consume('mute')) { audio.ensure(); const m = audio.toggleMute(); G.toast(m ? 'Muted' : 'Sound on', 1); }
  if (input.consume('restart')) {
    if (G.sceneName === 'end' || G.sceneName === 'title') { G.setScene('title', {}); }
  }
}

// whether to overlay the shared HUD (not on title/end/pure narrative)
function hudVisible() {
  return ['seamap', 'naval', 'land', 'cyclops', 'gauntlet'].includes(G.sceneName);
}

let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.05) dt = 0.05; // clamp
  globalKeys();
  if (G.scene) {
    G.scene.update(dt);
    G.scene.draw(ctx);
  }
  if (hudVisible()) drawHUD(ctx, W, H, G.state);
  // toast
  if (G.toastT > 0) { G.toastT -= dt; drawToast(ctx, W, H, G.toastMsg, Math.min(1, G.toastT)); }
  syncHook();
  requestAnimationFrame(frame);
}

// ---------- test hook ----------
function syncHook() {
  const s = G.state;
  const h = window.__od;
  h.scene = G.sceneName; h.stage = G.stageIndex;
  h.crew = Math.ceil(s.crew); h.hull = Math.ceil(s.hull); h.hp = Math.ceil(s.hp);
  h.favor = Math.ceil(s.favor); h.glory = s.glory;
}
window.__od = {
  scene: 'title', stage: 0, crew: 24, hull: 130, hp: 100, favor: 30, glory: 0,
  start() { audio.ensure(); G.startVoyage(); },
  // jump straight to a stage index and (optionally) a phase scene
  gotoStage(i) { audio.ensure(); G.state = G.state || newState(); G.enterStage(i | 0); },
  jump(scene, cfg) { audio.ensure(); G.setScene(scene, cfg || {}); },
  // convenience: enter a specific mode with a sensible demo config
  demoNaval() { audio.ensure(); G.setScene('naval', { stage: VOYAGE[3], battle: VOYAGE[3].battle }); },
  demoLand() { audio.ensure(); G.setScene('land', { stage: VOYAGE[0], battle: VOYAGE[0].battle }); },
  demoIsland() { audio.ensure(); G.setScene('island', { stage: VOYAGE[1], phase: 'intro' }); },
  demoGauntlet() { audio.ensure(); G.setScene('gauntlet', { stage: VOYAGE[5] }); },
  seaMap() { audio.ensure(); G.setScene('seamap', {}); },
  get state() { return G.state; },
  get G() { return G; },
};

requestAnimationFrame(frame);
