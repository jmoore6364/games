// Headless logic tests (no canvas). Run: node test/node-test.mjs
import { World, B, BLOCKS, WY } from '../src/world.js';
import { Player } from '../src/player.js';
import { Inventory, RECIPES, I } from '../src/craft.js';
import { Entities } from '../src/entities.js';

let pass = 0, fail = 0;
function ok(name, cond) { if (cond) { pass++; console.log('  ok  ' + name); } else { fail++; console.log('FAIL  ' + name); } }
function near(a, b, e = 0.01) { return Math.abs(a - b) < e; }

// ---- terrain ----
const w = new World(1337); w.generate();
const sp = w.islands[0];
// solid ground at spawn island centre
let surf = WY - 1; while (surf > 0 && w.get(sp.cx, surf, sp.cz) === 0) surf--;
ok('spawn island has solid surface', w.get(sp.cx, surf, sp.cz) !== 0);
ok('surface block is grass/dirt/sand', [B.GRASS, B.DIRT, B.SAND].includes(w.get(sp.cx, surf, sp.cz)));
ok('air above the island surface', w.get(sp.cx, surf + 3, sp.cz) === 0);
// void: far from all islands should be air (floating islands over void)
ok('void gap around islands is air', w.get(2, 30, 2) === 0 && w.get(126, 10, 126) === 0);
ok('deep bottom under void is empty', w.get(64, 1, 10) === 0);
// count solid to ensure islands actually generated volume
let solid = 0; for (let i = 0; i < w.voxels.length; i++) if (w.voxels[i]) solid++;
ok('generated a substantial voxel volume', solid > 20000);
console.log('  solid voxels:', solid);
// ores exist
let ores = 0; for (const id of w.voxels) if (id === B.COAL || id === B.IRON || id === B.LUMORE) ores++;
ok('ore veins generated', ores > 20);

// ---- raycast pick ----
// aim straight down from above the surface -> should hit the top face
const pick = w.raycastPick(sp.cx + 0.5, surf + 4, sp.cz + 0.5, 0, -1, 0, 10);
ok('raycast down hits a block', pick && pick.by === surf);
ok('raycast down hits TOP face (ny=1)', pick && pick.ny === 1);
ok('empty cell before hit is directly above', pick && pick.pby === surf + 1);

// ---- break then place round-trips voxel array ----
const bx = sp.cx, by = surf, bz = sp.cz;
const before = w.get(bx, by, bz);
w.set(bx, by, bz, B.AIR);
ok('break sets voxel to air', w.get(bx, by, bz) === B.AIR);
w.set(bx, by, bz, before);
ok('place restores voxel', w.get(bx, by, bz) === before);

// ---- save-diff reconstructs identical edited world ----
const w2 = new World(1337); w2.generate();
w2.set(bx, by, bz, B.AIR);
w2.set(bx, by + 1, bz, B.GLASS);
w2.set(bx + 1, by + 1, bz, B.LUMITE);
const diff = w2.serializeDiff();
const w3 = new World(1337); w3.generate(); w3.loadDiff(diff);
let identical = true;
for (let i = 0; i < w2.voxels.length; i++) if (w2.voxels[i] !== w3.voxels[i]) { identical = false; break; }
ok('save-diff + reload reconstructs identical world', identical);

// ---- lighting: lumite emits block light ----
ok('lumite block lights its neighbour', w3.lightAt(bx + 2, by + 1, bz) > 0 || w3.lightAt(bx, by + 1, bz) > 0);

// ---- player collision + gravity ----
const p = new Player({ x: sp.cx + 0.5, y: surf + 6, z: sp.cz + 0.5 });
const still = { fwd: 0, back: 0, left: 0, right: 0, jump: 0, sneak: 0 };
for (let i = 0; i < 120; i++) p.update(w, still, 1 / 30);
ok('gravity settles player on ground', p.onGround === true);
ok('player rests just above surface', near(p.y, surf + 1, 0.2));
console.log('  settled y:', p.y.toFixed(2), 'surface top:', surf + 1);

// walk into a wall -> collision stops horizontal movement
// build a wall in front
const wallX = Math.floor(p.x) + 2;
for (let yy = 0; yy < 3; yy++) w.set(wallX, Math.floor(p.y) + yy, Math.floor(p.z), B.STONE);
w.set(wallX, Math.floor(p.y) + 3, Math.floor(p.z), B.STONE); // block step-up too
p.yaw = 0; // face +X
const startX = p.x;
const fwd = { fwd: 1, back: 0, left: 0, right: 0, jump: 0, sneak: 0 };
for (let i = 0; i < 60; i++) p.update(w, fwd, 1 / 30);
ok('collision stops player before wall', p.x < wallX - 0.2);
console.log('  player x:', p.x.toFixed(2), 'wall at:', wallX);

// ---- tether pulls player toward anchor ----
const p2 = new Player({ x: sp.cx + 0.5, y: surf + 3, z: sp.cz + 0.5 });
p2.tether = { x: sp.cx + 0.5, y: surf + 3, z: sp.cz + 12 };
p2.tetherTime = 2;
const z0 = p2.z;
for (let i = 0; i < 30; i++) p2.update(w, still, 1 / 30);
ok('tether moves player toward anchor (+z)', p2.z > z0 + 0.5);
console.log('  tether z0:', z0.toFixed(2), '-> z:', p2.z.toFixed(2));

// ---- inventory + crafting round trips ----
const inv = new Inventory();
inv.add(B.LOG, 3);
ok('inventory holds 3 logs', inv.count(B.LOG) === 3);
const rPlanks = RECIPES.find(r => r.name === 'Planks');
ok('can craft planks', inv.canCraft(rPlanks));
inv.craft(rPlanks);
ok('crafting consumed 1 log', inv.count(B.LOG) === 2);
ok('crafting produced 4 planks', inv.count(B.PLANKS) === 4);
// chain: planks -> sticks -> table
inv.craft(RECIPES.find(r => r.name === 'Sticks'));
ok('sticks crafted', inv.count(I.STICK) === 4);
ok('planks reduced by 2', inv.count(B.PLANKS) === 2);

// remove more than present fails
ok('cannot remove missing items', inv.remove(B.IRON, 5) === false);

// ---- entity drop pickup ----
const inv2 = new Inventory();
const ents = new Entities();
ents.spawnDrop(p.x, p.y + 0.5, p.z, B.DIRT, 1);
for (let i = 0; i < 60; i++) ents.update(w, p, 1 / 30, { isNight: false, inv: inv2, audio: null });
ok('drop picked up into inventory', inv2.count(B.DIRT) === 1);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
