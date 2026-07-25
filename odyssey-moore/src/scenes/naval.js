// naval.js — big top-down fleet battle. Ram + arrow/spear volleys.
import { drawSea, drawGalley, drawEnemyShip, drawArrow, drawBurst, PAL, text, textShadow } from '../gfx.js';
import { TAU, clamp, angDiff, turnToward, dist, rand, nearestInCone, nearest } from '../util.js';

const TURN = 2.4, MAXSPD = 175, ACCEL = 3.0;
const VOLLEY_CD = 0.55, ARROW_SPD = 330, ARROW_LIFE = 1.4;
const RAM_BOOST_SPD = 300;

export default class NavalScene {
  constructor(G) { this.G = G; }
  enter(cfg) {
    const G = this.G, W = G.W, H = G.H;
    this.cfg = cfg;
    this.random = !!cfg.random;
    this.battle = cfg.battle || { reward: { glory: 90, favor: 6 } };
    this.t = 0; this.phase = 'fight'; this.phaseT = 0;
    this.arrows = []; this.fx = [];
    this.volleyCd = 0; this.ramBoost = 0; this.ramBoostCd = 0; this.prayCd = 0;
    this.shake = 0;
    // player ship mirrors shared hull
    this.player = { x: W * 0.5, y: H * 0.78, ang: -Math.PI / 2, spd: 40, team: 'player', flash: 0, fireCd: 0, s: 1, oar: 0 };
    // fleet
    const n = this.random ? 3 : (this.battle.fleet || 4);
    this.enemies = [];
    for (let i = 0; i < n; i++) {
      this.enemies.push(this._mkShip('enemy',
        rand(80, W - 80), rand(50, H * 0.4),
        this.random ? 26 : 34));
    }
    // an allied galley in set-piece battles
    this.allies = [];
    if (!this.random) this.allies.push(this._mkShip('ally', W * 0.32, H * 0.72, 40));
    G.audio.setMode('battle');
    G.setButtons({ a: 'VOLLEY', b: 'RAM', c: 'ATHENA' });
    this.banner = this.random ? 'Raiders intercept!' : 'Naval Battle';
    this.bannerT = 2;
  }
  _mkShip(team, x, y, hp) {
    return { x, y, ang: team === 'enemy' ? Math.PI / 2 : -Math.PI / 2, spd: 30, hp, maxhp: hp, team, fireCd: rand(0.5, 2), flash: 0, s: 1, oar: rand(0, 6), dead: false };
  }
  get input() { return this.G.input; }

  update(dt) {
    const { G, input } = this;
    const W = G.W, H = G.H;
    this.t += dt;
    if (this.shake > 0) this.shake -= dt;
    if (this.bannerT > 0) this.bannerT -= dt;

    if (this.phase === 'win') { this._updateWin(dt); return; }
    if (G.checkDeath()) return;

    // ----- player control -----
    const p = this.player;
    const mv = input.moveVec();
    let throttle = 0.4;
    if (mv.m > 0.06) {
      const desired = Math.atan2(mv.y, mv.x);
      p.ang = turnToward(p.ang, desired, TURN * dt * (0.5 + 0.5 * mv.m));
      throttle = 0.6 + 0.4 * mv.m;
    }
    // ram boost
    this.ramBoostCd -= dt; this.prayCd -= dt; this.volleyCd -= dt;
    if ((input.consume('b')) && this.ramBoostCd <= 0) { this.ramBoost = 0.7; this.ramBoostCd = 2.2; G.audio.oar(); }
    if (this.ramBoost > 0) this.ramBoost -= dt;
    const maxspd = this.ramBoost > 0 ? RAM_BOOST_SPD : MAXSPD;
    p.spd += (maxspd * throttle - p.spd) * clamp(ACCEL * dt, 0, 1);
    p.x = clamp(p.x + Math.cos(p.ang) * p.spd * dt, 24, W - 24);
    p.y = clamp(p.y + Math.sin(p.ang) * p.spd * dt, 24, H - 24);
    p.oar += dt * (4 + p.spd * 0.03);

    // volley (aim assist forward cone)
    if ((input.held.a || input.consume('a')) && this.volleyCd <= 0) {
      this._volley(p, 'player');
      this.volleyCd = VOLLEY_CD;
    }
    // Athena special
    if (input.consume('c') && this.prayCd <= 0 && G.state.favor >= 15) {
      G.state.favor -= 15; this.prayCd = 4; G.audio.pray();
      G.state.hull = clamp(G.state.hull + 16, 0, G.state.hullMax);
      for (const e of this.enemies) { if (e.dead) continue; const a = Math.atan2(e.y - p.y, e.x - p.x); e.x += Math.cos(a) * 60; e.y += Math.sin(a) * 60; e.hp -= 10; e.flash = 0.3; this._fx(e.x, e.y, PAL.athena); }
      this.banner = "Athena's gale!"; this.bannerT = 1.2;
    }

    // ----- allies -----
    for (const s of this.allies) this._aiShip(s, dt, true);
    // ----- enemies -----
    for (const e of this.enemies) this._aiShip(e, dt, false);

    // ----- ram collisions -----
    this._rams(dt);

    // ----- arrows -----
    this._arrows(dt);

    // flashes
    for (const s of [p, ...this.allies, ...this.enemies]) if (s.flash > 0) s.flash -= dt * 3;
    for (const f of this.fx) { f.t += dt; }
    this.fx = this.fx.filter(f => f.t < f.life);

    // clean dead enemies
    for (const e of this.enemies) if (!e.dead && e.hp <= 0) { e.dead = true; this._fx(e.x, e.y, PAL.terra2, 26, 0.7); G.audio.sink(); this.shake = 0.3; G.addGlory(this.random ? 25 : 40); }
    // win check
    if (this.enemies.every(e => e.dead)) this._win();
  }

  _aiShip(s, dt, ally) {
    if (s.dead) return;
    const { G } = this; const W = G.W, H = G.H;
    const foes = ally ? this.enemies : [this.player, ...this.allies];
    const tgt = nearest(s.x, s.y, foes.filter(f => !f.dead));
    if (tgt) {
      const d = dist(s.x, s.y, tgt.x, tgt.y);
      // keep a standoff distance, circle & fire; charge to ram sometimes
      const toT = Math.atan2(tgt.y - s.y, tgt.x - s.x);
      let want = toT;
      if (d < 120) want = toT + 0.5; // veer
      s.ang = turnToward(s.ang, want, 1.3 * dt);
      const spd = (d > 220 ? 130 : 80);
      s.spd += (spd - s.spd) * clamp(2.4 * dt, 0, 1);
      s.fireCd -= dt;
      if (s.fireCd <= 0 && d < 460 && Math.abs(angDiff(s.ang, toT)) < 0.8) {
        this._volley(s, ally ? 'ally' : 'enemy', tgt);
        s.fireCd = rand(1.3, 2.6);
      }
    } else { s.spd *= 0.98; }
    s.x = clamp(s.x + Math.cos(s.ang) * s.spd * dt, 24, W - 24);
    s.y = clamp(s.y + Math.sin(s.ang) * s.spd * dt, 24, H - 24);
    s.oar += dt * 4;
  }

  _volley(s, team, tgt) {
    let aim = s.ang;
    const foes = team === 'player' || team === 'ally' ? this.enemies : [this.player, ...this.allies];
    if (team === 'player') {
      const near = nearestInCone(s.x, s.y, s.ang, this.enemies, 1.0, 520);
      if (near) aim = Math.atan2(near.y - s.y, near.x - s.x);
    } else if (tgt) {
      // lead the target a little
      aim = Math.atan2(tgt.y - s.y, tgt.x - s.x);
    }
    const nArrows = team === 'player' ? 3 : 2;
    for (let i = 0; i < nArrows; i++) {
      const spread = (i - (nArrows - 1) / 2) * 0.14;
      const a = aim + spread + rand(0.03, -0.03);
      this.arrows.push({ x: s.x + Math.cos(a) * 22, y: s.y + Math.sin(a) * 22, vx: Math.cos(a) * ARROW_SPD, vy: Math.sin(a) * ARROW_SPD, life: ARROW_LIFE, team, dmg: team === 'player' ? 9 : 6 });
    }
    this.G.audio.volley();
  }

  _arrows(dt) {
    const { G } = this;
    for (const ar of this.arrows) {
      ar.x += ar.vx * dt; ar.y += ar.vy * dt; ar.life -= dt;
      const targets = (ar.team === 'enemy') ? [this.player, ...this.allies] : this.enemies;
      for (const s of targets) {
        if (s.dead) continue;
        if (dist(ar.x, ar.y, s.x, s.y) < 26) {
          ar.life = 0; s.flash = 1; this._fx(ar.x, ar.y, '#fff', 8, 0.3); G.audio.arrowHit();
          if (s.team === 'player') {
            G.state.hull = clamp(G.state.hull - ar.dmg, 0, G.state.hullMax);
            if (Math.random() < 0.22) G.state.crew = Math.max(0, G.state.crew - 1);
          } else s.hp -= ar.dmg;
          break;
        }
      }
    }
    this.arrows = this.arrows.filter(a => a.life > 0 && a.x > -20 && a.x < G.W + 20 && a.y > -20 && a.y < G.H + 20);
  }

  _rams(dt) {
    const { G } = this; const p = this.player;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = dist(p.x, p.y, e.x, e.y);
      if (d < 38) {
        const closing = p.spd + e.spd;
        const dmgToE = 14 + p.spd * 0.06 + (this.ramBoost > 0 ? 14 : 0);
        e.hp -= dmgToE; e.flash = 1;
        G.state.hull = clamp(G.state.hull - (5 + e.spd * 0.02), 0, G.state.hullMax);
        p.flash = 0.6;
        // knock apart
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        p.x += Math.cos(a) * 14; p.y += Math.sin(a) * 14;
        e.x -= Math.cos(a) * 14; e.y -= Math.sin(a) * 14;
        this._fx((p.x + e.x) / 2, (p.y + e.y) / 2, '#e8d0a0', 18, 0.4);
        G.audio.ram(); this.shake = 0.35;
        p.spd *= 0.5;
      }
    }
  }

  _fx(x, y, color, r = 12, life = 0.35) { this.fx.push({ x, y, color, r, life, t: 0 }); }

  _win() {
    if (this.phase === 'win') return;
    this.phase = 'win'; this.phaseT = 0;
    this.banner = 'Victory at sea!'; this.bannerT = 3;
    this.G.applyEffect(this.battle.reward);
    this.G.audio.setMode('calm'); this.G.audio.victory();
  }
  _updateWin(dt) {
    this.phaseT += dt;
    if (this.phaseT > 2.2) {
      if (this.random) this.G.returnToMap();
      else { if (this.battle.win) this.G.toast(this.battle.win, 3); this.G.phaseDone(); }
    }
  }

  draw(ctx) {
    const { G } = this; const W = G.W, H = G.H;
    ctx.save();
    if (this.shake > 0) ctx.translate(rand(this.shake * 6, -this.shake * 6), rand(this.shake * 6, -this.shake * 6));
    drawSea(ctx, W, H, this.t, G.state.poseidonWrath);
    // ships
    for (const s of this.allies) if (!s.dead) { drawGalley(ctx, s.x, s.y, s.ang, 0.95, { hull: '#5a6b8a', moving: s.spd > 20, oarPhase: s.oar, flash: s.flash }); this._hpbar(ctx, s); }
    for (const e of this.enemies) if (!e.dead) { drawEnemyShip(ctx, e.x, e.y, e.ang, 0.95, e.flash); this._hpbar(ctx, e); }
    const p = this.player;
    drawGalley(ctx, p.x, p.y, p.ang, 1.0, { moving: p.spd > 20, oarPhase: p.oar, flash: p.flash });
    // arrows
    for (const ar of this.arrows) drawArrow(ctx, ar.x, ar.y, Math.atan2(ar.vy, ar.vx), 1);
    // fx
    for (const f of this.fx) drawBurst(ctx, f.x, f.y, f.r * (1 + f.t / f.life), f.color, 1 - f.t / f.life);
    ctx.restore();

    // overlays
    const left = this.enemies.filter(e => !e.dead).length;
    textShadow(ctx, 'Enemy ships: ' + left, W / 2, 30, 15, left ? '#e6b0a0' : PAL.gold, 'center');
    if (this.ramBoostCd > 0 && this.ramBoost <= 0) text(ctx, 'ram ready in ' + this.ramBoostCd.toFixed(1) + 's', W - 12, H - 26, 11, '#89a', 'right', 'normal');
    text(ctx, G.state.favor >= 15 ? 'Athena ready (favor 15)' : 'Athena: need 15 favor', W - 12, H - 12, 11, G.state.favor >= 15 ? PAL.athena : '#778', 'right', 'normal');
    if (this.bannerT > 0) textShadow(ctx, this.banner, W / 2, H * 0.5, 30, PAL.gold, 'center');
  }
  _hpbar(ctx, s) {
    const w = 30, x = s.x - w / 2, y = s.y - 34;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = s.team === 'enemy' ? '#c85040' : '#5ac0d0'; ctx.fillRect(x, y, w * clamp(s.hp / s.maxhp, 0, 1), 4);
  }
}
