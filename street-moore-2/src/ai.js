// ai.js — CPU opponent. Produces the same command struct a human player would.
// Approaches, spaces, attacks, blocks sometimes, and occasionally throws a fireball.

export class AI {
  constructor(fighter, level = 1) {
    this.f = fighter;
    this.level = level;          // scales aggression (round number)
    this.timer = 0;
    this.decision = 'approach';
    this.decisionT = 0;
    this.blockHold = 0;
    this.cooldown = 0;
    this.fireballCd = 90;
  }

  setLevel(l) { this.level = l; }

  // aggression 0..1 scales with level and whether the AI is losing
  aggression(self, opp) {
    let a = 0.42 + this.level * 0.11;
    if (self.hp < opp.hp - 20) a += 0.16;      // behind → press harder
    if (self.hp < 25) a += 0.12;
    return Math.min(0.92, a);
  }

  update(self, opp) {
    const cmd = { moveX: 0, down: false, up: false, jumpPressed: false, pLPressed: false, pHPressed: false, kLPressed: false, kHPressed: false, special: null };
    if (self.dead || self.state === 'ko' || self.state === 'knockdown') return cmd;
    if (self.hitstun > 0 || self.attack) return cmd;

    this.timer++;
    if (this.cooldown > 0) this.cooldown--;
    if (this.fireballCd > 0) this.fireballCd--;
    if (this.blockHold > 0) this.blockHold--;

    const dx = opp.x - self.x;
    const dist = Math.abs(dx);
    const dir = Math.sign(dx) || 1;
    const facing = self.facing;
    const aggro = this.aggression(self, opp);

    // ----- Reactive block: if opponent is attacking in range, sometimes block -----
    const oppAtt = opp.attack && (opp.attack.phase === 'startup' || opp.attack.phase === 'active');
    if (this.blockHold > 0 || (oppAtt && dist < 120 && Math.random() < 0.5 * (0.7 + this.level * 0.12))) {
      if (this.blockHold <= 0) this.blockHold = 14 + Math.floor(Math.random() * 12);
      cmd.moveX = -facing; // hold away = block
      return cmd;
    }

    // ----- Incoming fireball: block or jump it -----
    if (opp._incomingFireball && dist > 90) {
      if (Math.random() < 0.5) { cmd.moveX = -facing; return cmd; }
      else { cmd.jumpPressed = true; cmd.moveX = dir; return cmd; }
    }

    // ----- Fireball zoning at range -----
    if (dist > 260 && this.fireballCd <= 0 && Math.random() < 0.02 + this.level * 0.02) {
      this.fireballCd = 150 - this.level * 20;
      cmd.special = 'fireball';
      return cmd;
    }

    // ----- Close range: attack -----
    if (dist < 96) {
      if (this.cooldown <= 0 && Math.random() < aggro) {
        this.cooldown = 24 - this.level * 3 + Math.floor(Math.random() * 16);
        const r = Math.random();
        // occasional anti-air / uppercut when opponent jumps in
        if (opp.airY > 30 && dist < 70 && Math.random() < 0.35 + this.level * 0.12) {
          cmd.special = 'uppercut';
        } else if (r < 0.30) cmd.pLPressed = true;
        else if (r < 0.5) cmd.kLPressed = true;
        else if (r < 0.74) cmd.pHPressed = true;
        else if (r < 0.9) cmd.kHPressed = true;
        else { cmd.down = true; cmd.kHPressed = true; } // sweep
        return cmd;
      }
      // spacing: slight back-off sometimes
      if (Math.random() < 0.04) cmd.moveX = -facing;
      return cmd;
    }

    // ----- Mid range: approach, occasionally hop in -----
    if (dist < 260) {
      cmd.moveX = dir;
      if (opp.airY > 20 && Math.random() < 0.02) { cmd.jumpPressed = true; }
      else if (Math.random() < 0.012 * aggro) { cmd.jumpPressed = true; cmd.moveX = dir; }
      return cmd;
    }

    // ----- Far: walk in (or jump forward) -----
    cmd.moveX = dir;
    if (Math.random() < 0.008 * (1 + this.level * 0.3)) cmd.jumpPressed = true;
    return cmd;
  }
}
