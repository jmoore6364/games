// craft.js — items, inventory/hotbar, recipes and crafting logic.
// Logic is DOM-free; drawCraftUI takes a ctx and is browser-only.

import { B, BLOCKS } from './world.js';

// Non-block item ids start at 100. Block ids (0..17) double as item ids.
export const I = {
  STICK: 100, INGOT: 101, CRYSTAL: 102,
  WOODPICK: 103, STONEPICK: 104, IRONPICK: 105,
  APPLE: 106, TETHER: 107,
};

// item metadata: name, stack, place (block id to place or 0), tier (pick tier)
export const ITEMS = {};
function defItem(id, name, opt = {}) {
  ITEMS[id] = { id, name, stack: opt.stack ?? 64, place: opt.place ?? 0, tier: opt.tier ?? 0, food: opt.food ?? 0 };
}
// blocks that can be held/placed
for (let b = 1; b < BLOCKS.length; b++) {
  if (b === B.WATER) continue;
  defItem(b, BLOCKS[b].name, { place: b });
}
defItem(I.STICK, 'stick');
defItem(I.INGOT, 'iron ingot');
defItem(I.CRYSTAL, 'lumite crystal');
defItem(I.WOODPICK, 'wood pickaxe', { stack: 1, tier: 1 });
defItem(I.STONEPICK, 'stone pickaxe', { stack: 1, tier: 2 });
defItem(I.IRONPICK, 'iron pickaxe', { stack: 1, tier: 3 });
defItem(I.APPLE, 'apple', { stack: 16, food: 5 });
defItem(I.TETHER, 'tether', { stack: 1 });

export function itemName(id) { return ITEMS[id] ? ITEMS[id].name : '?'; }
export function toolTier(id) { return ITEMS[id] ? ITEMS[id].tier : 0; }

// ---------------- recipes ----------------
// { out:[id,count], in:[[id,count],...], table:bool, name }
export const RECIPES = [
  { name: 'Planks',        out: [B.PLANKS, 4], in: [[B.LOG, 1]], table: false },
  { name: 'Sticks',        out: [I.STICK, 4],  in: [[B.PLANKS, 2]], table: false },
  { name: 'Crafting Table',out: [B.TABLE, 1],  in: [[B.PLANKS, 4]], table: false },
  { name: 'Storage Chest', out: [B.CHEST, 1],  in: [[B.PLANKS, 6]], table: false },
  { name: 'Torch x4',      out: [B.TORCH, 4],  in: [[B.COAL, 1], [I.STICK, 1]], table: false },
  { name: 'Wood Pickaxe',  out: [I.WOODPICK, 1], in: [[B.PLANKS, 3], [I.STICK, 2]], table: true },
  { name: 'Stone Pickaxe', out: [I.STONEPICK, 1], in: [[B.COBBLE, 3], [I.STICK, 2]], table: true },
  { name: 'Iron Ingot',    out: [I.INGOT, 1],  in: [[B.IRON, 1]], table: true },
  { name: 'Iron Pickaxe',  out: [I.IRONPICK, 1], in: [[I.INGOT, 3], [I.STICK, 2]], table: true },
  { name: 'Glass',         out: [B.GLASS, 1],  in: [[B.SAND, 1]], table: true },
  { name: 'Lumite Crystal',out: [I.CRYSTAL, 1], in: [[B.LUMORE, 1]], table: true },
  { name: 'Lumite Block',  out: [B.LUMITE, 1], in: [[I.CRYSTAL, 4]], table: true },
  { name: 'Tether Tool',   out: [I.TETHER, 1], in: [[I.INGOT, 2], [I.CRYSTAL, 1], [I.STICK, 2]], table: true },
];

// ---------------- inventory ----------------
export class Inventory {
  constructor() {
    this.slots = new Array(36).fill(null); // 0..8 hotbar, 9..35 main
    this.sel = 0;
  }
  selId() { const s = this.slots[this.sel]; return s ? s.id : 0; }
  selItem() { return this.slots[this.sel]; }

  count(id) {
    let n = 0;
    for (const s of this.slots) if (s && s.id === id) n += s.count;
    return n;
  }
  add(id, count = 1) {
    const stack = ITEMS[id] ? ITEMS[id].stack : 64;
    // fill existing stacks
    for (const s of this.slots) {
      if (s && s.id === id && s.count < stack) {
        const take = Math.min(count, stack - s.count);
        s.count += take; count -= take;
        if (count <= 0) return 0;
      }
    }
    // empty slots
    for (let i = 0; i < this.slots.length; i++) {
      if (!this.slots[i]) {
        const take = Math.min(count, stack);
        this.slots[i] = { id, count: take }; count -= take;
        if (count <= 0) return 0;
      }
    }
    return count; // leftover (dropped)
  }
  remove(id, count = 1) {
    if (this.count(id) < count) return false;
    for (let i = 0; i < this.slots.length && count > 0; i++) {
      const s = this.slots[i];
      if (s && s.id === id) {
        const take = Math.min(count, s.count);
        s.count -= take; count -= take;
        if (s.count <= 0) this.slots[i] = null;
      }
    }
    return true;
  }
  canCraft(r) {
    for (const [id, n] of r.in) if (this.count(id) < n) return false;
    return true;
  }
  craft(r) {
    if (!this.canCraft(r)) return false;
    for (const [id, n] of r.in) this.remove(id, n);
    this.add(r.out[0], r.out[1]);
    return true;
  }
  serialize() {
    return this.slots.map(s => s ? [s.id, s.count] : 0);
  }
  load(arr) {
    this.slots = arr.map(s => s ? { id: s[0], count: s[1] } : null);
    while (this.slots.length < 36) this.slots.push(null);
  }
  giveStarter() {
    this.add(B.PLANKS, 8);
    this.add(B.TORCH, 6);
    this.add(I.WOODPICK, 1);
  }
  giveCreative() {
    const blocks = [B.GRASS, B.DIRT, B.STONE, B.COBBLE, B.LOG, B.PLANKS, B.LEAVES,
      B.SAND, B.GLASS, B.COAL, B.IRON, B.LUMITE, B.TABLE, B.TORCH];
    for (let i = 0; i < blocks.length && i < 9; i++) this.add(blocks[i], 64);
    this.add(I.IRONPICK, 1);
    this.add(I.TETHER, 1);
  }
}
