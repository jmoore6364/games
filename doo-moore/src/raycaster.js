// raycaster.js — software column raycaster into an ImageData buffer.
// Textured walls with distance shading, per-column floor/ceiling casting,
// and depth-tested billboard sprites. 2D canvas only.
import { tileAt } from './map.js';

const FOV = 0.72; // camera-plane half-width (~72° horizontal)

export class Raycaster {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.off = document.createElement('canvas');
    this.offctx = this.off.getContext('2d');
    this.RW = 0; this.RH = 0;
    this.resize(320, 200);
  }

  resize(RW, RH) {
    RW = Math.max(80, Math.floor(RW)); RH = Math.max(60, Math.floor(RH));
    if (RW === this.RW && RH === this.RH) return;
    this.RW = RW; this.RH = RH;
    this.off.width = RW; this.off.height = RH;
    this.abuf = new ArrayBuffer(RW * RH * 4);
    this.buf32 = new Uint32Array(this.abuf);
    this.buf8 = new Uint8ClampedArray(this.abuf);
    this.imageData = new ImageData(this.buf8, RW, RH);
    this.zbuffer = new Float32Array(RW);
    this.rayX = new Float32Array(RW);
    this.rayY = new Float32Array(RW);
  }

  renderWorld(player, level, tex, pitch = 0) {
    const RW = this.RW, RH = this.RH;
    const buf = this.buf32, zb = this.zbuffer;
    const posX = player.x, posY = player.y;
    const dirX = Math.cos(player.dir), dirY = Math.sin(player.dir);
    const planeX = -dirY * FOV, planeY = dirX * FOV;
    const horizon = (RH * 0.5 + pitch) | 0;

    // ceiling & floor base colors
    const ceilC = { r: 26, g: 24, b: 30 };
    const floorA = { r: 62, g: 50, b: 36 };
    const floorB = { r: 44, g: 36, b: 26 };

    for (let x = 0; x < RW; x++) {
      const cameraX = 2 * x / RW - 1;
      const rayDirX = dirX + planeX * cameraX;
      const rayDirY = dirY + planeY * cameraX;
      this.rayX[x] = rayDirX; this.rayY[x] = rayDirY;

      let mapX = Math.floor(posX), mapY = Math.floor(posY);
      const deltaX = Math.abs(1 / rayDirX), deltaY = Math.abs(1 / rayDirY);
      let stepX, stepY, sideDistX, sideDistY;
      if (rayDirX < 0) { stepX = -1; sideDistX = (posX - mapX) * deltaX; }
      else { stepX = 1; sideDistX = (mapX + 1 - posX) * deltaX; }
      if (rayDirY < 0) { stepY = -1; sideDistY = (posY - mapY) * deltaY; }
      else { stepY = 1; sideDistY = (mapY + 1 - posY) * deltaY; }

      let hit = 0, side = 0, tile = 0;
      let doorOpen = 0;
      while (hit === 0) {
        if (sideDistX < sideDistY) { sideDistX += deltaX; mapX += stepX; side = 0; }
        else { sideDistY += deltaY; mapY += stepY; side = 1; }
        tile = tileAt(level, mapX, mapY);
        if (tile > 0) {
          if (tile === 4) {
            const d = level.doors.get(mapX + ',' + mapY);
            doorOpen = d ? d.open : 0;
            if (doorOpen > 0.85) { tile = 0; continue; } // fully open, ray passes
            hit = 1;
          } else hit = 1;
        }
        if (mapX < 0 || mapY < 0 || mapX >= level.W || mapY >= level.H) { hit = 1; tile = 1; break; }
      }

      let perpDist = (side === 0) ? (sideDistX - deltaX) : (sideDistY - deltaY);
      if (perpDist < 0.0001) perpDist = 0.0001;
      zb[x] = perpDist;

      let wallX = (side === 0) ? posY + perpDist * rayDirY : posX + perpDist * rayDirX;
      wallX -= Math.floor(wallX);

      const texture = tex.walls[tile] || tex.walls[1];
      const TW = texture.w, TH = texture.h, tbuf = texture.buf;
      let texX = (wallX * TW) | 0;
      if ((side === 0 && rayDirX > 0) || (side === 1 && rayDirY < 0)) texX = TW - texX - 1;
      if (texX < 0) texX = 0; if (texX >= TW) texX = TW - 1;

      const lineHeight = (RH / perpDist);
      let drawStart = horizon - lineHeight / 2;
      let drawEnd = horizon + lineHeight / 2;
      // door lowering animation: top edge descends as it opens
      let visTop = drawStart;
      if (tile === 4 && doorOpen > 0) visTop = drawStart + doorOpen / 0.85 * lineHeight;

      const iStart = Math.max(0, Math.ceil(visTop));
      const iEnd = Math.min(RH - 1, Math.floor(drawEnd));

      // shading: distance fog + side darkening
      let shade = 1 / (1 + perpDist * 0.16 + perpDist * perpDist * 0.006);
      if (side === 1) shade *= 0.70;
      if (shade > 1) shade = 1;

      const spanTop = visTop, spanH = drawEnd - visTop;

      // --- ceiling (above wall) ---
      for (let y = 0; y < iStart; y++) {
        const rd = (0.5 * RH) / (horizon - y);
        let f = 1 / (1 + rd * 0.22 + rd * rd * 0.004);
        if (f > 1) f = 1;
        const idx = y * RW + x;
        buf[idx] = (255 << 24) | ((ceilC.b * f) << 16) | ((ceilC.g * f) << 8) | (ceilC.r * f);
      }

      // --- wall slice ---
      for (let y = iStart; y <= iEnd; y++) {
        const v = (y - spanTop) / spanH;         // 0..1 across visible slice
        let texY = (v * TH) | 0;
        if (texY < 0) texY = 0; if (texY >= TH) texY = TH - 1;
        const c = tbuf[texY * TW + texX];
        const r = (c & 255) * shade;
        const g = ((c >> 8) & 255) * shade;
        const b = ((c >> 16) & 255) * shade;
        buf[y * RW + x] = (255 << 24) | (b << 16) | (g << 8) | r;
      }

      // --- floor (below wall) ---
      for (let y = iEnd + 1; y < RH; y++) {
        const rd = (0.5 * RH) / (y - horizon);
        const fx = posX + rayDirX * rd;
        const fy = posY + rayDirY * rd;
        const chk = ((fx | 0) ^ (fy | 0)) & 1;
        const base = chk ? floorA : floorB;
        let f = 1 / (1 + rd * 0.20 + rd * rd * 0.004);
        if (f > 1) f = 1;
        buf[y * RW + x] = (255 << 24) | ((base.b * f) << 16) | ((base.g * f) << 8) | (base.r * f);
      }
    }
  }

  // sprites: [{ x, y, frame:{w,h,buf}, ground:bool, scale, tint(optional 0..1) }]
  renderSprites(player, sprites, pitch = 0) {
    const RW = this.RW, RH = this.RH, buf = this.buf32, zb = this.zbuffer;
    const posX = player.x, posY = player.y;
    const dirX = Math.cos(player.dir), dirY = Math.sin(player.dir);
    const planeX = -dirY * FOV, planeY = dirX * FOV;
    const horizon = (RH * 0.5 + pitch) | 0;

    // sort far -> near
    for (const s of sprites) s._d = (s.x - posX) ** 2 + (s.y - posY) ** 2;
    sprites.sort((a, b) => b._d - a._d);

    const invDet = 1 / (planeX * dirY - dirX * planeY);
    for (const s of sprites) {
      const relX = s.x - posX, relY = s.y - posY;
      const transformX = invDet * (dirY * relX - dirX * relY);
      const transformY = invDet * (-planeY * relX + planeX * relY);
      if (transformY <= 0.06) continue;

      const scale = s.scale || 1;
      const screenX = ((RW / 2) * (1 + transformX / transformY)) | 0;
      const spriteH = Math.abs((RH / transformY)) * scale;
      const spriteW = spriteH;

      let startY, endY;
      if (s.ground) {
        const floorY = horizon + (0.5 * RH) / transformY; // floor line at that depth
        endY = floorY; startY = floorY - spriteH;
      } else {
        startY = horizon - spriteH / 2; endY = horizon + spriteH / 2;
      }
      const iStartY = Math.max(0, Math.ceil(startY));
      const iEndY = Math.min(RH - 1, Math.floor(endY));
      const left = Math.ceil(screenX - spriteW / 2);
      const right = Math.floor(screenX + spriteW / 2);
      const iLeft = Math.max(0, left), iRight = Math.min(RW - 1, right);

      const fr = s.frame, TW = fr.w, TH = fr.h, tbuf = fr.buf;
      let shade = 1 / (1 + transformY * 0.14 + transformY * transformY * 0.004);
      if (shade > 1) shade = 1; if (shade < 0.25) shade = 0.25;
      const tint = s.tint || 0; // 0 none, up to 1 white flash

      for (let x = iLeft; x <= iRight; x++) {
        if (transformY >= zb[x]) continue; // behind wall
        let texX = (((x - left) * TW / spriteW) | 0);
        if (texX < 0) texX = 0; if (texX >= TW) texX = TW - 1;
        for (let y = iStartY; y <= iEndY; y++) {
          let texY = (((y - startY) * TH / spriteH) | 0);
          if (texY < 0) texY = 0; if (texY >= TH) texY = TH - 1;
          const c = tbuf[texY * TW + texX];
          if ((c >>> 24) < 128) continue; // transparent
          let r = (c & 255) * shade, g = ((c >> 8) & 255) * shade, b = ((c >> 16) & 255) * shade;
          if (tint > 0) { r = r + (255 - r) * tint; g = g + (255 - g) * tint; b = b + (255 - b) * tint; }
          buf[y * RW + x] = (255 << 24) | (b << 16) | (g << 8) | r;
        }
      }
    }
  }

  blit(dispW, dispH) {
    this.offctx.putImageData(this.imageData, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.off, 0, 0, this.RW, this.RH, 0, 0, dispW, dispH);
  }
}
