// seamap.js — top-down sailing overworld connecting the episodes.
import { drawSea, drawGalley, drawEnemyShip, drawIsland, drawCompass, PAL, text, textShadow } from '../gfx.js';
import { VOYAGE } from '../voyage.js';
import { TAU, clamp, angDiff, turnToward, dist } from '../util.js';

const TURN = 2.2, MAXSPD = 170, ACCEL = 130;

export default class SeaMapScene {
  constructor(G) {
    this.G = G;
    this.ship = null;
    this.wind = { ang: -0.6, str: 0.7, t: 0 };
    this.roamers = [];
    this.oar = 0;
  }
  _initShip() {
    const n0 = VOYAGE[0].node;
    this.ship = { x: n0.x - 150, y: n0.y + 150, ang: -0.6, spd: 0 };
    this._spawnRoamers();
  }
  _spawnRoamers() {
    this.roamers = [];
    // place a few wandering raiders between nodes
    for (let i = 1; i < VOYAGE.length; i++) {
      const a = VOYAGE[i - 1].node, b = VOYAGE[i].node;
      const mx = (a.x + b.x) / 2 + (Math.random() * 120 - 60);
      const my = (a.y + b.y) / 2 - 90 + (Math.random() * 80 - 40);
      this.roamers.push({ x: mx, y: my, ang: Math.random() * TAU, spd: 55, cd: 0, leg: i });
    }
  }
  enter(cfg) {
    const { G } = this;
    if (!this.ship) this._initShip();
    if (cfg.arrived) {
      const prev = VOYAGE[G.stageIndex - 1];
      if (prev) { this.ship.x = prev.node.x; this.ship.y = prev.node.y; this.ship.spd = 20; }
      // reset roamers that were behind us
      for (const r of this.roamers) if (r.leg < G.stageIndex) r.cd = 999;
    }
    G.audio.setMode(G.state.poseidonWrath ? 'tense' : 'calm');
    G.setButtons({ a: 'ROW', b: '', c: '' });
    this.arriveBanner = cfg.arrived ? 2.5 : 0;
  }
  update(dt) {
    const { G, input, ship, wind } = this;
    if (G.checkDeath()) return;
    wind.t += dt;
    wind.ang += Math.sin(wind.t * 0.3) * 0.2 * dt;
    wind.str = 0.5 + 0.35 * Math.sin(wind.t * 0.4) + (G.state.poseidonWrath ? 0.1 : 0);

    // steering: stick direction = desired heading
    const mv = input.moveVec();
    let throttle = 0.35; // idle drift/row
    const rowing = input.held.a || input.down('arrowup', 'w', ' ');
    if (mv.m > 0.06) {
      const desired = Math.atan2(mv.y, mv.x);
      ship.ang = turnToward(ship.ang, desired, TURN * dt * (0.45 + 0.55 * mv.m));
      throttle = 0.55 + 0.45 * mv.m;
    }
    if (rowing) throttle = Math.max(throttle, 0.85);
    // wind bonus/penalty by alignment
    const align = Math.cos(angDiff(ship.ang, wind.ang + Math.PI)); // sailing WITH the wind
    const windFactor = 0.7 + 0.5 * clamp(align, -1, 1) * wind.str;
    const target = MAXSPD * throttle * clamp(windFactor, 0.4, 1.35);
    ship.spd += (target - ship.spd) * clamp(ACCEL * dt / 60, 0, 1);
    ship.x += Math.cos(ship.ang) * ship.spd * dt;
    ship.y += Math.sin(ship.ang) * ship.spd * dt;
    this.oar += dt * (4 + ship.spd * 0.03);
    if (Math.random() < ship.spd * dt * 0.004) G.audio.oar();

    // destination check
    const dest = VOYAGE[G.stageIndex];
    if (dest && dist(ship.x, ship.y, dest.node.x, dest.node.y) < 60) {
      G.enterStage(G.stageIndex); return;
    }

    // roamers wander + intercept
    for (const r of this.roamers) {
      if (r.cd > 100) continue; // retired
      if (r.cd > 0) { r.cd -= dt; continue; }
      // steer gently toward player when near, else wander
      const d = dist(r.x, r.y, ship.x, ship.y);
      let desired;
      if (d < 340) desired = Math.atan2(ship.y - r.y, ship.x - r.x);
      else desired = r.ang + Math.sin(wind.t * 0.5 + r.leg) * 0.4;
      r.ang = turnToward(r.ang, desired, 1.0 * dt);
      const spd = r.spd * (d < 340 ? 1.4 : 0.7) * (G.state.poseidonWrath ? 1.2 : 1);
      r.x += Math.cos(r.ang) * spd * dt;
      r.y += Math.sin(r.ang) * spd * dt;
      if (d < 46) {
        r.cd = 999; // consumed by the encounter
        G.setScene('naval', { random: true, roamer: r });
        return;
      }
    }
    if (this.arriveBanner > 0) this.arriveBanner -= dt;
  }
  draw(ctx) {
    const { G, ship, wind } = this;
    const { W, H } = G;
    drawSea(ctx, W, H, wind.t, G.state.poseidonWrath);
    const camX = ship.x - W / 2, camY = ship.y - H / 2;
    ctx.save(); ctx.translate(-camX, -camY);

    // route line
    ctx.strokeStyle = 'rgba(255,216,112,0.18)'; ctx.lineWidth = 3; ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(this.ship_start_x(), this.ship_start_y());
    for (const s of VOYAGE) ctx.lineTo(s.node.x, s.node.y);
    ctx.stroke(); ctx.setLineDash([]);

    // islands / nodes
    VOYAGE.forEach((s, i) => {
      const done = i < G.stageIndex;
      const active = i === G.stageIndex;
      ctx.globalAlpha = done ? 0.5 : 1;
      drawIsland(ctx, s.node.x, s.node.y, 62, i * 1.3 + 1, { marble: s.type === 'land' || s.type === 'island' });
      ctx.globalAlpha = 1;
      if (active) {
        const pulse = 66 + 6 * Math.sin(wind.t * 3);
        ctx.strokeStyle = PAL.gold; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.arc(s.node.x, s.node.y, pulse, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      }
      text(ctx, s.title, s.node.x, s.node.y - 72, 13, done ? '#89a' : PAL.marble, 'center');
    });

    // roamers
    for (const r of this.roamers) {
      if (r.cd > 100) continue;
      drawEnemyShip(ctx, r.x, r.y, r.ang, 0.8);
    }
    // player galley
    drawGalley(ctx, ship.x, ship.y, ship.ang, 1, { moving: ship.spd > 20, oarPhase: this.oar });
    ctx.restore();

    // ---- overlays ----
    const dest = VOYAGE[G.stageIndex];
    if (dest) {
      const bearing = Math.atan2(dest.node.y - ship.y, dest.node.x - ship.x);
      drawCompass(ctx, W - 44, H - 48, 30, bearing, wind.ang);
      textShadow(ctx, 'Bound for ' + dest.title, W - 78, H - 90, 13, PAL.gold, 'right');
      const legN = G.stageIndex + 1;
      text(ctx, 'Leg ' + legN + ' / ' + VOYAGE.length + '  ·  ' + dest.subtitle, W - 78, H - 74, 11, '#bcd', 'right', 'normal');
    }
    // wind readout
    const align = Math.cos(angDiff(ship.ang, wind.ang + Math.PI));
    const sailing = align > 0.2;
    textShadow(ctx, sailing ? 'Wind in the sail' : 'Rowing against the wind', 12, H - 14, 12,
      sailing ? PAL.athena : '#e0a060', 'left');
    if (this.arriveBanner > 0) textShadow(ctx, 'Sail to the glowing island', W / 2, 40, 16, PAL.marble, 'center');
    if (G.state.poseidonWrath) textShadow(ctx, "Poseidon's wrath churns the sea", W / 2, H - 14, 12, '#e07a6a', 'center');
  }
  ship_start_x() { return VOYAGE[0].node.x - 150; }
  ship_start_y() { return VOYAGE[0].node.y + 150; }
  get input() { return this.G.input; }
}
