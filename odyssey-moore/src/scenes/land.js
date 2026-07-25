// land.js — big top-down land battle. Odysseus (sword + bow) + allied crew vs waves.
import { drawWarrior, drawBeast, drawArrow, drawBurst, PAL, text, textShadow, font } from '../gfx.js';
import { TAU, clamp, angDiff, turnToward, dist, rand, nearestInCone, nearest } from '../util.js';

const SPD = 165, SWORD_CD = 0.32, SWORD_REACH = 46, SWORD_ARC = 1.1, SWORD_DMG = 26;
const BOW_CD = 0.45, ARROW_SPD = 460, ARROW_LIFE = 1.3, ARROW_DMG = 30;
const QUIVER_MAX = 14, QUIVER_REGEN = 0.9;

const FOE = {
  cicone: { hp: 22, spd: 70, dmg: 14, ranged: 0, cloth: '#8a4a3a', shield: '#9a7a3a', crest: '#c8683c', name: 'Cicones' },
  beast: { hp: 28, spd: 95, dmg: 16, ranged: 0, beast: true, name: 'Beasts' },
  suitor: { hp: 26, spd: 75, dmg: 15, ranged: 0.25, cloth: '#6a4a7a', shield: '#b09030', crest: '#d0b040', name: 'Suitors' },
};

export default class LandScene {
  constructor(G) { this.G = G; }
  enter(cfg) {
    const G = this.G, W = G.W, H = G.H;
    this.cfg = cfg;
    this.battle = cfg.battle;
    this.foe = FOE[this.battle.enemy] || FOE.cicone;
    this.waves = this.battle.waves; this.counts = this.battle.count;
    this.wave = 0; this.t = 0; this.phase = 'fight'; this.phaseT = 0;
    this.enemies = []; this.arrows = []; this.fx = [];
    this.swordCd = 0; this.bowCd = 0; this.quiver = QUIVER_MAX; this.prayCd = 0;
    this.swing = 0; this.shake = 0;
    this.hero = { x: W * 0.5, y: H * 0.72, ang: -Math.PI / 2, flash: 0 };
    // allied crew units (subset of the galley's oarsmen)
    this.allies = [];
    const nAlly = Math.min(6, Math.max(1, Math.floor(G.state.crew / 3)));
    for (let i = 0; i < nAlly; i++) this.allies.push({ x: W * (0.3 + 0.4 * (i / Math.max(1, nAlly - 1))), y: H * 0.85, ang: -Math.PI / 2, hp: 34, maxhp: 34, atkCd: 0, flash: 0, dead: false });
    G.audio.setMode('battle');
    G.setButtons({ a: 'SWORD', b: 'BOW', c: 'RALLY' });
    this.banner = this.battle.finale ? 'The Great Bow' : this.foe.name + '!';
    this.bannerT = 2.4;
    this._spawnWave();
  }
  get input() { return this.G.input; }

  _spawnWave() {
    const G = this.G, W = G.W, H = G.H;
    const n = this.counts[this.wave] || 4;
    for (let i = 0; i < n; i++) {
      const edge = Math.floor(rand(0, 3));
      let x, y;
      if (edge === 0) { x = rand(40, W - 40); y = -20 - rand(0, 60); }
      else if (edge === 1) { x = -20; y = rand(30, H * 0.5); }
      else { x = W + 20; y = rand(30, H * 0.5); }
      this.enemies.push({ x, y, ang: Math.PI / 2, hp: this.foe.hp, maxhp: this.foe.hp, atkCd: rand(0.4, 1.2), flash: 0, dead: false, swing: 0 });
    }
  }

  update(dt) {
    const G = this.G, input = this.input, W = G.W, H = G.H;
    this.t += dt;
    if (this.shake > 0) this.shake -= dt;
    if (this.bannerT > 0) this.bannerT -= dt;
    if (this.phase === 'win') { this.phaseT += dt; if (this.phaseT > 2.2) { this._finish(); } this._decayFx(dt); return; }
    if (G.checkDeath()) return;

    // ---- hero movement ----
    const hero = this.hero;
    const mv = input.moveVec();
    if (mv.m > 0.06) {
      hero.x = clamp(hero.x + mv.x * SPD * dt, 20, W - 20);
      hero.y = clamp(hero.y + mv.y * SPD * dt, 20, H - 20);
      hero.ang = Math.atan2(mv.y, mv.x);
    }
    // ---- sword ----
    this.swordCd -= dt; this.bowCd -= dt; this.prayCd -= dt; this.swing -= dt * 4;
    if (this.quiver < QUIVER_MAX) this.quiver = Math.min(QUIVER_MAX, this.quiver + QUIVER_REGEN * dt);
    // aim direction: nearest enemy in a forward cone (aim assist), else facing
    const near = nearestInCone(hero.x, hero.y, hero.ang, this.enemies, 1.3, 600);
    const aim = near ? Math.atan2(near.y - hero.y, near.x - hero.x) : hero.ang;

    if ((input.held.a || input.consume('a')) && this.swordCd <= 0) {
      this.swordCd = SWORD_CD; this.swing = 1; hero.ang = aim; G.audio.sword();
      for (const e of this.enemies) {
        if (e.dead) continue;
        const d = dist(hero.x, hero.y, e.x, e.y);
        if (d < SWORD_REACH) {
          const ea = Math.atan2(e.y - hero.y, e.x - hero.x);
          if (Math.abs(angDiff(hero.ang, ea)) < SWORD_ARC) {
            e.hp -= SWORD_DMG; e.flash = 1; this._fx(e.x, e.y, '#fff', 8, 0.25); this.shake = 0.12;
          }
        }
      }
    }
    // ---- bow ----
    if ((input.consume('b')) && this.bowCd <= 0 && this.quiver >= 1) {
      this.bowCd = BOW_CD; this.quiver -= 1; hero.ang = aim; G.audio.bow();
      this.arrows.push({ x: hero.x + Math.cos(aim) * 14, y: hero.y + Math.sin(aim) * 14, vx: Math.cos(aim) * ARROW_SPD, vy: Math.sin(aim) * ARROW_SPD, life: ARROW_LIFE, team: 'player', dmg: ARROW_DMG });
    }
    // ---- rally / Athena ----
    if (input.consume('c') && this.prayCd <= 0 && G.state.favor >= 12) {
      G.state.favor -= 12; this.prayCd = 5; G.audio.pray();
      G.state.hp = clamp(G.state.hp + 18, 0, G.state.hpMax);
      for (const a of this.allies) if (!a.dead) { a.hp = Math.min(a.maxhp, a.hp + 20); a.flash = 0.3; }
      this.banner = 'Athena rallies you!'; this.bannerT = 1.2;
      this.quiver = QUIVER_MAX;
    }

    // ---- allies ----
    for (const a of this.allies) {
      if (a.dead) continue;
      a.atkCd -= dt; if (a.flash > 0) a.flash -= dt * 3;
      const tgt = nearest(a.x, a.y, this.enemies);
      if (tgt) {
        const d = dist(a.x, a.y, tgt.x, tgt.y);
        a.ang = Math.atan2(tgt.y - a.y, tgt.x - a.x);
        if (d > 34) { a.x += Math.cos(a.ang) * 120 * dt; a.y += Math.sin(a.ang) * 120 * dt; }
        else if (a.atkCd <= 0) { a.atkCd = 0.6; tgt.hp -= 12; tgt.flash = 1; a.swing = 1; G.audio.clash(); }
      }
      a.swing -= dt * 4;
    }

    // ---- enemies ----
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (e.flash > 0) e.flash -= dt * 3;
      e.atkCd -= dt; e.swing -= dt * 4;
      // target hero or nearest ally
      const targets = [hero, ...this.allies.filter(a => !a.dead)];
      const tgt = nearest(e.x, e.y, targets.map(t => ({ x: t.x, y: t.y, ref: t, dead: false })));
      const ref = tgt ? tgt.ref : hero;
      const d = dist(e.x, e.y, ref.x, ref.y);
      e.ang = Math.atan2(ref.y - e.y, ref.x - e.x);
      if (this.foe.beast) { if (d > 26) { e.x += Math.cos(e.ang) * this.foe.spd * dt; e.y += Math.sin(e.ang) * this.foe.spd * dt; } }
      else if (d > 30) { e.x += Math.cos(e.ang) * this.foe.spd * dt; e.y += Math.sin(e.ang) * this.foe.spd * dt; }
      // ranged (suitors throw spears)
      if (this.foe.ranged && e.atkCd <= 0 && d > 120 && d < 460 && Math.random() < 0.5) {
        e.atkCd = rand(1.4, 2.6);
        const a = Math.atan2(ref.y - e.y, ref.x - e.x);
        this.arrows.push({ x: e.x, y: e.y, vx: Math.cos(a) * 300, vy: Math.sin(a) * 300, life: 1.6, team: 'enemy', dmg: this.foe.dmg });
      } else if (d <= 30 && e.atkCd <= 0) {
        e.atkCd = 0.8; e.swing = 1;
        if (ref === hero) { G.state.hp = clamp(G.state.hp - this.foe.dmg, 0, G.state.hpMax); hero.flash = 1; G.audio.hurt(); this.shake = 0.2; }
        else { ref.hp -= this.foe.dmg; ref.flash = 1; G.audio.clash(); }
      }
    }

    // ---- arrows ----
    for (const ar of this.arrows) {
      ar.x += ar.vx * dt; ar.y += ar.vy * dt; ar.life -= dt;
      if (ar.team === 'player') {
        for (const e of this.enemies) { if (e.dead) continue; if (dist(ar.x, ar.y, e.x, e.y) < 16) { e.hp -= ar.dmg; e.flash = 1; ar.life = 0; this._fx(ar.x, ar.y, '#fff', 7, 0.2); G.audio.arrowHit(); break; } }
      } else {
        if (dist(ar.x, ar.y, hero.x, hero.y) < 16) { ar.life = 0; G.state.hp = clamp(G.state.hp - ar.dmg, 0, G.state.hpMax); hero.flash = 1; G.audio.hurt(); }
        for (const a of this.allies) { if (a.dead) continue; if (dist(ar.x, ar.y, a.x, a.y) < 14) { a.hp -= ar.dmg; a.flash = 1; ar.life = 0; break; } }
      }
    }
    this.arrows = this.arrows.filter(a => a.life > 0 && a.x > -30 && a.x < W + 30 && a.y > -30 && a.y < H + 30);

    // ---- deaths ----
    for (const e of this.enemies) if (!e.dead && e.hp <= 0) { e.dead = true; this._fx(e.x, e.y, PAL.blood, 16, 0.5); G.addGlory(this.battle.finale ? 30 : 20); }
    for (const a of this.allies) if (!a.dead && a.hp <= 0) { a.dead = true; this._fx(a.x, a.y, PAL.blood, 14, 0.5); G.state.crew = Math.max(0, G.state.crew - 1); }
    if (hero.flash > 0) hero.flash -= dt * 3;
    this._decayFx(dt);

    // ---- wave progression ----
    if (this.enemies.every(e => e.dead)) {
      this.wave++;
      if (this.wave >= this.waves) this._win();
      else { this.banner = 'Wave ' + (this.wave + 1) + ' of ' + this.waves; this.bannerT = 1.6; this._spawnWave(); }
    }
  }
  _decayFx(dt) { for (const f of this.fx) f.t += dt; this.fx = this.fx.filter(f => f.t < f.life); }
  _fx(x, y, color, r = 12, life = 0.35) { this.fx.push({ x, y, color, r, life, t: 0 }); }

  _win() {
    if (this.phase === 'win') return;
    this.phase = 'win'; this.phaseT = 0;
    this.banner = this.battle.finale ? 'The suitors are slain!' : 'The field is won!';
    this.bannerT = 3;
    this.G.applyEffect(this.battle.reward);
    this.G.audio.setMode('calm'); this.G.audio.victory();
  }
  _finish() { if (this.battle.win) this.G.toast(this.battle.win, 3.5); this.G.phaseDone(); }

  draw(ctx) {
    const G = this.G, W = G.W, H = G.H;
    ctx.save();
    if (this.shake > 0) ctx.translate(rand(this.shake * 6, -this.shake * 6), rand(this.shake * 6, -this.shake * 6));
    this._drawGround(ctx, W, H);
    // fx under
    for (const f of this.fx) drawBurst(ctx, f.x, f.y, f.r * (1 + f.t / f.life), f.color, 1 - f.t / f.life);
    // allies
    for (const a of this.allies) if (!a.dead) { drawWarrior(ctx, a.x, a.y, a.ang, 1, { cloth: '#3a5a7a', shield: PAL.bronze, crest: PAL.athena, weapon: 'sword', swing: a.swing > 0 ? -a.swing * 6 : 0, flash: a.flash }); }
    // enemies
    for (const e of this.enemies) if (!e.dead) {
      if (this.foe.beast) drawBeast(ctx, e.x, e.y, e.ang, 1, e.flash);
      else drawWarrior(ctx, e.x, e.y, e.ang, 1, { cloth: this.foe.cloth, shield: this.foe.shield, crest: this.foe.crest, weapon: 'spear', swing: e.swing > 0 ? -e.swing * 6 : 0, flash: e.flash });
      this._hpbar(ctx, e);
    }
    // hero
    const hero = this.hero;
    drawWarrior(ctx, hero.x, hero.y, hero.ang, 1.2, { cloth: PAL.terracotta, shield: PAL.gold, crest: PAL.blood, skin: '#e0b070', weapon: this.swing > 0 ? 'sword' : 'sword', swing: this.swing > 0 ? -this.swing * 8 : 0, flash: hero.flash });
    // arrows
    for (const ar of this.arrows) drawArrow(ctx, ar.x, ar.y, Math.atan2(ar.vy, ar.vx), 1.1);
    ctx.restore();

    // overlays
    const left = this.enemies.filter(e => !e.dead).length;
    textShadow(ctx, this.foe.name + ' left: ' + left + '   ·   Wave ' + Math.min(this.wave + 1, this.waves) + '/' + this.waves, W / 2, 30, 14, '#f0d0a0', 'center');
    // quiver
    text(ctx, 'Arrows: ' + Math.floor(this.quiver) + '/' + QUIVER_MAX, 12, H - 26, 12, PAL.sail, 'left', 'normal');
    text(ctx, G.state.favor >= 12 ? 'Rally ready (favor 12)' : 'Rally: need 12 favor', 12, H - 12, 12, G.state.favor >= 12 ? PAL.athena : '#778', 'left', 'normal');
    if (this.cfg.battle.tutorial && this.t < 8) {
      font(ctx, 12, 'normal'); ctx.textAlign = 'center'; ctx.fillStyle = '#e8dcc2';
      ctx.fillText(this.G.isTouch ? 'Stick to move · SWORD melee · BOW ranged (auto-aims)' : 'WASD move · SPACE sword · K bow (auto-aims nearest) · L rally', W / 2, H - 40);
    }
    if (this.bannerT > 0) textShadow(ctx, this.banner, W / 2, H * 0.4, 30, PAL.gold, 'center');
  }
  _drawGround(ctx, W, H) {
    const key = this.cfg.stage ? this.cfg.stage.key : '';
    if (this.battle.finale) {
      // marble hall
      ctx.fillStyle = '#cdbf9e'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(120,100,70,0.4)'; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      // columns
      ctx.fillStyle = '#efe7d2';
      for (const cx of [W * 0.12, W * 0.88]) for (const cy of [H * 0.2, H * 0.55]) { ctx.beginPath(); ctx.arc(cx, cy, 16, 0, TAU); ctx.fill(); ctx.fillStyle = '#d8cdb0'; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, TAU); ctx.fill(); ctx.fillStyle = '#efe7d2'; }
    } else if (this.foe.beast) {
      // grove
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#5a6b3a'); g.addColorStop(1, '#3d4a26');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(20,30,10,0.3)';
      for (let i = 0; i < 24; i++) { const x = (i * 173) % W, y = (i * 97) % H; ctx.beginPath(); ctx.arc(x, y, 10, 0, TAU); ctx.fill(); }
    } else {
      // sandy shore / town
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#c9b47e'); g.addColorStop(1, '#a68a54');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(90,70,40,0.25)';
      for (let i = 0; i < 18; i++) { const x = (i * 211) % W, y = (i * 143) % H; ctx.fillRect(x, y, 6, 6); }
    }
  }
  _hpbar(ctx, s) {
    if (s.hp >= s.maxhp) return;
    const w = 20, x = s.x - w / 2, y = s.y - 22;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = '#c85040'; ctx.fillRect(x, y, w * clamp(s.hp / s.maxhp, 0, 1), 3);
  }
}
