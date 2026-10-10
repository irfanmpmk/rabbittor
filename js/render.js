/* Rabbittor — canvas renderer: meadow maze, hedges, rabbit, Big Mouth. */
(function () {
  const RT = window.RT;
  const T = RT.T;

  const C = {
    void: '#0b1611',
    ground: '#1f3528',
    ground2: '#1c3125',
    tuft: '#2c4a36',
    hedgeEdge: '#0e2618',
    hedge: '#2f7445',
    hedgeTop: '#3f9157',
    leaf: '#5bb874',
    dirt: '#3a2a1c',
    carrot: '#ff8a1f',
    carrotDark: '#d9600a',
    leafGreen: '#6fdc6a',
    gold: '#ffd23f'
  };
  RT.COLORS = C;

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function ellipse(ctx, x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2);
  }

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.level = null;
      this.ts = 24;
      this.dpr = 1;
      this.vw = 300; this.vh = 300;
      this.cam = { x: 0, y: 0, init: false };
      this.shake = 0;
      this.staticLayer = null;
      this.sprites = {};
    }

    setLevel(level) {
      this.level = level;
      this.cam.init = false;
      this.resize();
    }

    resize() {
      const parent = this.canvas.parentElement;
      const rect = parent.getBoundingClientRect();
      this.vw = Math.max(100, Math.floor(rect.width));
      this.vh = Math.max(100, Math.floor(rect.height));
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.floor(this.vw * this.dpr);
      this.canvas.height = Math.floor(this.vh * this.dpr);
      this.canvas.style.width = this.vw + 'px';
      this.canvas.style.height = this.vh + 'px';
      if (!this.level) return;
      const L = this.level;
      const fit = Math.floor(Math.min(this.vw / L.W, this.vh / L.H));
      const touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      const minTs = touch ? 20 : 18;
      this.ts = Math.min(48, Math.max(fit, minTs));
      this.buildStatic();
      this.buildSprites();
      this.cam.init = false;
    }

    buildSprites() {
      const ts = this.ts, d = this.dpr;
      const make = (golden) => {
        const c = document.createElement('canvas');
        c.width = c.height = Math.ceil(ts * d);
        const g = c.getContext('2d');
        g.scale(d, d);
        g.translate(ts / 2, ts / 2);
        g.rotate(-0.6);
        const len = ts * (golden ? 0.46 : 0.36), w = ts * (golden ? 0.13 : 0.1);
        // leaves
        g.fillStyle = golden ? '#9be36b' : C.leafGreen;
        for (let i = -1; i <= 1; i++) {
          ellipse(g, i * w * 0.5, -len * 0.55, w * 0.32, w * 0.9, i * 0.5);
          g.fill();
        }
        // body
        const grd = g.createLinearGradient(-w, 0, w, 0);
        grd.addColorStop(0, golden ? '#fff1a6' : '#ffb35c');
        grd.addColorStop(1, golden ? '#e6a800' : C.carrotDark);
        g.fillStyle = grd;
        g.beginPath();
        g.moveTo(-w, -len * 0.38);
        g.quadraticCurveTo(0, -len * 0.55, w, -len * 0.38);
        g.lineTo(0, len * 0.55);
        g.closePath();
        g.fill();
        g.strokeStyle = golden ? 'rgba(140,90,0,.6)' : 'rgba(120,40,0,.5)';
        g.lineWidth = Math.max(1, ts * 0.03);
        for (let i = 0; i < 2; i++) {
          const yy = -len * 0.12 + i * len * 0.22;
          g.beginPath(); g.moveTo(-w * 0.55 * (1 - i * 0.3), yy); g.lineTo(-w * 0.1, yy + 1); g.stroke();
        }
        return c;
      };
      this.sprites.carrot = make(false);
      this.sprites.golden = make(true);
    }

    buildStatic() {
      const L = this.level, ts = this.ts, d = this.dpr;
      const c = document.createElement('canvas');
      c.width = Math.ceil(L.W * ts * d);
      c.height = Math.ceil(L.H * ts * d);
      const g = c.getContext('2d');
      g.scale(d, d);
      const rand = RT.rng(L.seed + 99);
      g.fillStyle = C.void;
      g.fillRect(0, 0, L.W * ts, L.H * ts);

      // ground
      for (let y = 0; y < L.H; y++) {
        for (let x = 0; x < L.W; x++) {
          const t = L.at(x, y);
          if (t === T.WALL || t === T.VOID) continue;
          g.fillStyle = (t === T.LAIR || t === T.GATE) ? C.dirt : ((x + y) % 2 ? C.ground : C.ground2);
          g.fillRect(x * ts, y * ts, ts + 0.5, ts + 0.5);
          if (t === T.PATH && rand() < 0.35) {
            g.strokeStyle = C.tuft; g.lineWidth = Math.max(1, ts * 0.04);
            const gx = x * ts + rand() * ts * 0.8 + ts * 0.1, gy = y * ts + rand() * ts * 0.8 + ts * 0.15;
            g.beginPath();
            g.moveTo(gx - ts * 0.06, gy); g.lineTo(gx - ts * 0.09, gy - ts * 0.1);
            g.moveTo(gx, gy); g.lineTo(gx, gy - ts * 0.13);
            g.moveTo(gx + ts * 0.06, gy); g.lineTo(gx + ts * 0.09, gy - ts * 0.1);
            g.stroke();
          }
        }
      }
      // decorations in the void around the lair
      for (let y = 0; y < L.H; y++) {
        for (let x = 0; x < L.OX; x++) {
          if (L.at(x, y) !== T.VOID) continue;
          if (rand() < 0.5) {
            g.fillStyle = 'rgba(70,120,80,.25)';
            ellipse(g, x * ts + rand() * ts, y * ts + rand() * ts, ts * 0.12, ts * 0.06);
            g.fill();
          }
        }
      }

      // hedges: outline pass, fill pass, top light, leaves
      const isWall = (x, y) => L.at(x, y) === T.WALL;
      const pass = (inset, color) => {
        g.fillStyle = color;
        for (let y = 0; y < L.H; y++) {
          for (let x = 0; x < L.W; x++) {
            if (!isWall(x, y)) continue;
            const px = x * ts, py = y * ts;
            rr(g, px + inset, py + inset, ts - inset * 2, ts - inset * 2, ts * 0.3);
            g.fill();
            if (isWall(x + 1, y)) g.fillRect(px + ts / 2, py + inset, ts, ts - inset * 2);
            if (isWall(x, y + 1)) g.fillRect(px + inset, py + ts / 2, ts - inset * 2, ts);
            if (isWall(x + 1, y) && isWall(x, y + 1) && isWall(x + 1, y + 1)) g.fillRect(px + ts / 2, py + ts / 2, ts, ts);
          }
        }
      };
      pass(ts * 0.04, C.hedgeEdge);
      pass(ts * 0.12, C.hedge);
      // light on tiles with open ground above
      g.fillStyle = C.hedgeTop;
      for (let y = 0; y < L.H; y++) {
        for (let x = 0; x < L.W; x++) {
          if (!isWall(x, y)) continue;
          const px = x * ts, py = y * ts;
          if (!isWall(x, y - 1)) {
            rr(g, px + ts * 0.16, py + ts * 0.14, ts * 0.68, ts * 0.22, ts * 0.11);
            g.fill();
          }
        }
      }
      for (let y = 0; y < L.H; y++) {
        for (let x = 0; x < L.W; x++) {
          if (!isWall(x, y)) continue;
          const n = 1 + Math.floor(rand() * 3);
          for (let i = 0; i < n; i++) {
            g.fillStyle = rand() < 0.15 ? '#f2c6e0' : C.leaf;
            const r = ts * (0.04 + rand() * 0.04);
            g.beginPath();
            g.arc(x * ts + ts * (0.25 + rand() * 0.5), y * ts + ts * (0.3 + rand() * 0.45), r, 0, Math.PI * 2);
            g.fill();
          }
        }
      }
      this.staticLayer = c;
    }

    // ---------- per-frame ----------
    draw(game) {
      const ctx = this.ctx, L = this.level;
      if (!L) return;
      const ts = this.ts;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.fillStyle = C.void;
      ctx.fillRect(0, 0, this.vw, this.vh);

      // camera
      const worldW = L.W * ts, worldH = L.H * ts;
      const rp = game.posOf(game.rabbit);
      const target = { x: 0, y: 0 };
      target.x = worldW <= this.vw ? (this.vw - worldW) / 2 : clamp(this.vw / 2 - (rp.x + 0.5) * ts, this.vw - worldW, 0);
      target.y = worldH <= this.vh ? (this.vh - worldH) / 2 : clamp(this.vh / 2 - (rp.y + 0.5) * ts, this.vh - worldH, 0);
      if (!this.cam.init) { this.cam.x = target.x; this.cam.y = target.y; this.cam.init = true; }
      this.cam.x += (target.x - this.cam.x) * 0.15;
      this.cam.y += (target.y - this.cam.y) * 0.15;
      let ox = Math.round(this.cam.x), oy = Math.round(this.cam.y);
      if (this.shake > 0) {
        ox += (Math.random() - 0.5) * this.shake;
        oy += (Math.random() - 0.5) * this.shake;
        this.shake *= 0.88;
        if (this.shake < 0.4) this.shake = 0;
      }

      ctx.drawImage(this.staticLayer, ox, oy, worldW, worldH);
      ctx.save();
      ctx.translate(ox, oy);
      const t = game.clock;

      // visible tile range
      const x0 = Math.max(0, Math.floor(-ox / ts) - 1), x1 = Math.min(L.W, Math.ceil((this.vw - ox) / ts) + 1);
      const y0 = Math.max(0, Math.floor(-oy / ts) - 1), y1 = Math.min(L.H, Math.ceil((this.vh - oy) / ts) + 1);

      this.drawLair(ctx, game, t);
      this.drawDoor(ctx, game, t);

      // carrots
      const spr = this.sprites.carrot;
      for (const k of L.carrots) {
        const x = k % L.W, y = (k / L.W) | 0;
        if (x < x0 || x > x1 || y < y0 || y > y1) continue;
        const bob = Math.sin(t * 3 + x * 0.7 + y * 1.3) * ts * 0.03;
        ctx.drawImage(spr, x * ts + ts * 0.15, y * ts + ts * 0.15 + bob, ts * 0.7, ts * 0.7);
      }
      if (game.golden) {
        const gd = game.golden;
        if (gd.life > 3 || Math.floor(t * 8) % 2 === 0) {
          const s = 1 + Math.sin(t * 6) * 0.1;
          const cx = (gd.x + 0.5) * ts, cy = (gd.y + 0.5) * ts;
          const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, ts * 0.8);
          glow.addColorStop(0, 'rgba(255,220,80,.55)'); glow.addColorStop(1, 'rgba(255,220,80,0)');
          ctx.fillStyle = glow; ctx.fillRect(cx - ts, cy - ts, ts * 2, ts * 2);
          ctx.drawImage(this.sprites.golden, cx - ts * 0.5 * s, cy - ts * 0.5 * s, ts * s, ts * s);
        }
      }

      this.drawCage(ctx, game, t);

      // characters: draw the one lower on screen last
      const e = game.enemy;
      const ep = game.posOf(e);
      const enemyVisible = e.state !== 'lair';
      const drawE = () => { if (enemyVisible) this.drawBigMouth(ctx, (ep.x + 0.5) * ts, (ep.y + 0.5) * ts, ts, e, t, game); };
      const drawR = () => this.drawRabbit(ctx, (rp.x + 0.5) * ts, (rp.y + 0.5) * ts, ts * 1.15, game.rabbit, t, game);
      if (game.state === 'caught') { drawR(); drawE(); }
      else if (ep.y > rp.y) { drawR(); drawE(); } else { drawE(); drawR(); }

      // particles
      for (const p of game.particles) {
        const a = Math.max(0, p.life / p.max);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        if (p.star) this.star(ctx, p.x * ts, p.y * ts, p.size * ts, t * 4 + p.x);
        else { ctx.beginPath(); ctx.arc(p.x * ts, p.y * ts, p.size * ts, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.globalAlpha = 1;

      // popups
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const p of game.popups) {
        const a = Math.min(1, p.life / 0.4);
        ctx.globalAlpha = a;
        const size = Math.max(12, ts * (p.big ? 0.75 : 0.5));
        ctx.font = `${size}px "Lilita One", "Arial Rounded MT Bold", system-ui, sans-serif`;
        ctx.lineWidth = Math.max(3, size * 0.18);
        ctx.strokeStyle = 'rgba(10,20,14,.85)';
        ctx.strokeText(p.text, p.x * ts, p.y * ts);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, p.x * ts, p.y * ts);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      this.drawVignette(ctx, game, t);
    }

    star(ctx, x, y, r, rot) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = rot + i * Math.PI / 5;
        const rr2 = i % 2 ? r * 0.45 : r;
        ctx.lineTo(x + Math.cos(a) * rr2, y + Math.sin(a) * rr2);
      }
      ctx.closePath(); ctx.fill();
    }

    drawLair(ctx, game, t) {
      const L = this.level, ts = this.ts;
      const lx = (L.lair.x + 0.5) * ts, ly = (L.lair.y + 0.5) * ts;
      // cave mouth
      const grd = ctx.createRadialGradient(lx, ly, ts * 0.05, lx, ly, ts * 0.7);
      grd.addColorStop(0, '#000'); grd.addColorStop(0.7, '#160a0e'); grd.addColorStop(1, 'rgba(22,10,14,0)');
      ctx.fillStyle = grd;
      ellipse(ctx, lx, ly, ts * 0.62, ts * 0.55); ctx.fill();
      // stones
      ctx.fillStyle = '#5a5248';
      for (let i = 0; i < 5; i++) {
        const a = Math.PI * 0.6 + i * Math.PI * 0.2;
        ellipse(ctx, lx + Math.cos(a) * ts * 0.55, ly - Math.sin(a) * ts * 0.48 * -1, ts * 0.1, ts * 0.07); ctx.fill();
      }
      const e = game.enemy;
      if (e.state === 'lair') {
        const close = e.timer < 3;
        const blink = Math.sin(t * 2.3) > 0.94;
        if (!blink) {
          const jx = close ? (Math.random() - 0.5) * ts * 0.06 : 0;
          ctx.fillStyle = close ? '#ff3344' : '#ffd84a';
          ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = ts * 0.4;
          ellipse(ctx, lx - ts * 0.14 + jx, ly - ts * 0.04, ts * 0.08, ts * 0.05, 0.3); ctx.fill();
          ellipse(ctx, lx + ts * 0.14 + jx, ly - ts * 0.04, ts * 0.08, ts * 0.05, -0.3); ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
      // gate: wooden planks
      const gx = L.gate.x * ts, gy = L.gate.y * ts;
      const lift = game.gateAnim * ts * 0.82;
      ctx.save();
      ctx.beginPath(); ctx.rect(gx, gy - ts * 0.9, ts, ts * 1.9); ctx.clip();
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i % 2 ? '#8a5a32' : '#9c6a3c';
        rr(ctx, gx + ts * (0.12 + i * 0.27), gy + ts * 0.06 - lift, ts * 0.22, ts * 0.88, ts * 0.06);
        ctx.fill();
      }
      ctx.fillStyle = '#6b4224';
      ctx.fillRect(gx + ts * 0.06, gy + ts * 0.3 - lift, ts * 0.88, ts * 0.12);
      ctx.restore();
    }

    drawCage(ctx, game, t) {
      const L = this.level, ts = this.ts;
      const a = game.cageAnim;
      if (a >= 1) return;
      const x = L.cage.x * ts, y = L.cage.y * ts - a * ts * 0.9;
      ctx.save();
      ctx.globalAlpha = 1 - a;
      ctx.strokeStyle = '#c9d3dc';
      ctx.lineWidth = Math.max(1.5, ts * 0.07);
      ctx.lineCap = 'round';
      rr(ctx, x + ts * 0.06, y + ts * 0.06, ts * 0.88, ts * 0.88, ts * 0.12);
      ctx.stroke();
      ctx.lineWidth = Math.max(1.2, ts * 0.055);
      for (let i = 1; i <= 4; i++) {
        const bx = x + ts * 0.06 + i * ts * 0.176;
        ctx.beginPath(); ctx.moveTo(bx, y + ts * 0.08); ctx.lineTo(bx, y + ts * 0.92); ctx.stroke();
      }
      // lock
      ctx.fillStyle = '#ffd23f';
      rr(ctx, x + ts * 0.78, y + ts * 0.42, ts * 0.18, ts * 0.16, ts * 0.04); ctx.fill();
      ctx.restore();
    }

    drawDoor(ctx, game, t) {
      const L = this.level, ts = this.ts;
      const x = L.door.x * ts, y = L.door.y * ts;
      const cx = x + ts / 2, cy = y + ts / 2;
      if (game.doorOpen) {
        const pulse = 0.85 + Math.sin(t * 5) * 0.15;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, ts * 1.6 * pulse);
        g.addColorStop(0, 'rgba(255,255,230,1)');
        g.addColorStop(0.3, 'rgba(160,255,200,.8)');
        g.addColorStop(1, 'rgba(80,220,160,0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - ts * 2, cy - ts * 2, ts * 4, ts * 4);
        // archway
        ctx.fillStyle = '#fffbe6';
        rr(ctx, x + ts * 0.18, y + ts * 0.1, ts * 0.64, ts * 0.85, ts * 0.32); ctx.fill();
        ctx.fillStyle = 'rgba(255,210,63,.9)';
        for (let i = 0; i < 4; i++) {
          const a = t * 2 + i * Math.PI / 2;
          this.star(ctx, cx + Math.cos(a) * ts * 0.62, cy + Math.sin(a) * ts * 0.62, ts * 0.1, t * 3);
        }
      } else {
        ctx.fillStyle = '#5b3a1f';
        rr(ctx, x + ts * 0.14, y + ts * 0.06, ts * 0.72, ts * 0.9, ts * 0.34); ctx.fill();
        ctx.fillStyle = '#8b5a2b';
        rr(ctx, x + ts * 0.2, y + ts * 0.12, ts * 0.6, ts * 0.8, ts * 0.28); ctx.fill();
        ctx.strokeStyle = '#6b4220'; ctx.lineWidth = Math.max(1, ts * 0.04);
        for (let i = 1; i < 3; i++) {
          ctx.beginPath(); ctx.moveTo(x + ts * (0.2 + i * 0.2), y + ts * 0.18); ctx.lineTo(x + ts * (0.2 + i * 0.2), y + ts * 0.9); ctx.stroke();
        }
        // padlock
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = Math.max(1.5, ts * 0.06);
        ctx.beginPath(); ctx.arc(cx, cy + ts * 0.02, ts * 0.11, Math.PI, 0); ctx.stroke();
        ctx.fillStyle = '#ffd23f';
        rr(ctx, cx - ts * 0.16, cy + ts * 0.02, ts * 0.32, ts * 0.26, ts * 0.05); ctx.fill();
        ctx.fillStyle = '#5b3a1f';
        ctx.beginPath(); ctx.arc(cx, cy + ts * 0.13, ts * 0.04, 0, Math.PI * 2); ctx.fill();
        // progress ring around the door shows how close it is to opening
        const frac = 1 - L.carrots.size / Math.max(1, game.carrotsTotal);
        ctx.strokeStyle = 'rgba(255,138,31,.85)'; ctx.lineWidth = Math.max(2, ts * 0.07);
        ctx.beginPath(); ctx.arc(cx, cy, ts * 0.62, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2); ctx.stroke();
      }
    }

    drawRabbit(ctx, x, y, s, r, t, game) {
      ctx.save();
      ctx.translate(x, y);
      const moving = !!r.dir && game.state === 'play';
      if (game.state === 'caught') {
        const k = Math.max(0, game.caughtTimer / 1.8);
        ctx.rotate((1 - k) * 6);
        ctx.scale(k, k);
      }
      const bob = moving ? -Math.abs(Math.sin(t * 14)) * s * 0.1 : Math.sin(t * 3) * s * 0.015;
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ellipse(ctx, 0, s * 0.34, s * 0.26, s * 0.08); ctx.fill();
      ctx.translate(0, bob);

      const invis = game.invis > 0;
      const fighter = game.fighter > 0;
      if (invis) {
        ctx.globalAlpha = 0.28 + Math.sin(t * 10) * 0.08;
        if (game.invis < 1.5 && Math.floor(t * 10) % 2) ctx.globalAlpha = 0.7;
      }
      if (fighter) {
        const pr = s * (0.55 + Math.sin(t * 12) * 0.05);
        const g = ctx.createRadialGradient(0, 0, s * 0.1, 0, 0, pr);
        g.addColorStop(0, 'rgba(255,90,60,.0)'); g.addColorStop(0.6, 'rgba(255,90,60,.35)'); g.addColorStop(1, 'rgba(255,90,60,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, pr, 0, Math.PI * 2); ctx.fill();
      }
      const f = r.face || RT.DIR.right;
      const fx = f.x, back = f.y === -1;
      const white = '#f6f2ea', pink = '#f7a8bc', shade = '#d9d2c4';

      // tail
      if (fx !== 0 || back) {
        ctx.fillStyle = '#ffffff';
        ellipse(ctx, back ? 0 : -fx * s * 0.27, back ? s * 0.16 : s * 0.12, s * 0.09, s * 0.09); ctx.fill();
      }
      // ears
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.translate(side * s * 0.1 + fx * s * 0.04, -s * 0.18);
        ctx.rotate(side * 0.2 + fx * 0.3 + (moving ? Math.sin(t * 14 + side) * 0.1 : Math.sin(t * 2 + side) * 0.04));
        ctx.fillStyle = white;
        ellipse(ctx, 0, -s * 0.2, s * 0.08, s * 0.22); ctx.fill();
        if (!back) { ctx.fillStyle = pink; ellipse(ctx, 0, -s * 0.19, s * 0.04, s * 0.15); ctx.fill(); }
        ctx.restore();
      }
      // body
      ctx.fillStyle = shade;
      ellipse(ctx, 0, s * 0.12, s * 0.27, s * 0.23); ctx.fill();
      ctx.fillStyle = white;
      ellipse(ctx, 0, s * 0.1, s * 0.25, s * 0.21); ctx.fill();
      // head
      const hx = fx * s * 0.06;
      ellipse(ctx, hx, -s * 0.06, s * 0.2, s * 0.18); ctx.fill();
      if (!back) {
        const spread = fx === 0 ? s * 0.08 : s * 0.06;
        const ex = hx + fx * s * 0.06;
        ctx.fillStyle = '#1b1420';
        for (const side of [-1, 1]) {
          ellipse(ctx, ex + side * spread, -s * 0.09, s * 0.035, s * 0.045); ctx.fill();
        }
        ctx.fillStyle = '#fff';
        for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(ex + side * spread + s * 0.012, -s * 0.105, s * 0.012, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = pink;
        ellipse(ctx, hx + fx * s * 0.14, -s * 0.02, s * 0.03, s * 0.022); ctx.fill();
        ctx.fillStyle = 'rgba(247,140,170,.45)';
        for (const side of [-1, 1]) { ellipse(ctx, ex + side * s * 0.12, -s * 0.0, s * 0.035, s * 0.022); ctx.fill(); }
      }
      // fighter gloves
      if (fighter) {
        const punch = Math.sin(t * 16) * s * 0.05;
        for (const side of [-1, 1]) {
          const gx = side * s * 0.27 + (side === Math.sign(fx || 1) ? punch : 0), gy = s * 0.08;
          ctx.fillStyle = '#e8332a';
          ctx.beginPath(); ctx.arc(gx, gy, s * 0.11, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.fillRect(gx - s * 0.06 * side - s * 0.03, gy - s * 0.06, s * 0.06, s * 0.12);
        }
      }
      if (invis) {
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = 'rgba(127,212,255,.8)';
        ctx.setLineDash([s * 0.08, s * 0.08]);
        ctx.lineDashOffset = t * 30;
        ctx.lineWidth = Math.max(1, s * 0.04);
        ctx.beginPath(); ctx.arc(0, -s * 0.02, s * 0.42, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }

    drawBigMouth(ctx, x, y, s, e, t, game) {
      const R = s * 0.6;
      const f = e.face || RT.DIR.right;
      const ang = Math.atan2(f.y, f.x);
      const dizzy = e.state === 'dizzy';
      const flying = e.state === 'flying';
      let mouth = dizzy ? 0.12 : 0.1 + Math.abs(Math.sin(t * (game.state === 'caught' ? 16 : 9))) * 0.55;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = 'rgba(0,0,0,.4)';
      ellipse(ctx, 0, s * 0.42, R * 0.8, R * 0.22); ctx.fill();
      if (flying) ctx.rotate(t * 20);
      ctx.save();
      ctx.rotate(ang);
      if (f.x < 0) ctx.scale(1, -1);

      // mouth cavity
      ctx.fillStyle = '#3d0518';
      ctx.beginPath(); ctx.moveTo(-R * 0.05, 0); ctx.arc(0, 0, R * 0.97, -mouth, mouth); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff5c8a';
      ellipse(ctx, R * 0.45, R * 0.06, R * 0.28, R * Math.min(0.14, mouth * 0.25)); ctx.fill();

      // body
      const g = ctx.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R);
      g.addColorStop(0, dizzy ? '#b17aa6' : '#d4418f');
      g.addColorStop(1, dizzy ? '#5a3460' : '#5e1149');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, mouth, Math.PI * 2 - mouth); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#2a0420'; ctx.lineWidth = Math.max(1.5, s * 0.05);
      ctx.beginPath(); ctx.arc(0, 0, R, mouth, Math.PI * 2 - mouth); ctx.stroke();

      // teeth
      ctx.fillStyle = '#fffaf0';
      for (const side of [-1, 1]) {
        const a = side * mouth;
        for (let i = 0; i < 4; i++) {
          const r0 = R * (0.3 + i * 0.16), r1 = r0 + R * 0.14, rm = (r0 + r1) / 2;
          const ta = a - side * Math.min(0.32, mouth * 0.9 + 0.1);
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
          ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
          ctx.lineTo(Math.cos(ta) * rm, Math.sin(ta) * rm);
          ctx.closePath(); ctx.fill();
        }
      }
      // spikes on the back
      ctx.fillStyle = '#3c0a30';
      for (let i = -2; i <= 2; i++) {
        const a = Math.PI + i * 0.38;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - 0.14) * R * 0.95, Math.sin(a - 0.14) * R * 0.95);
        ctx.lineTo(Math.cos(a) * R * 1.22, Math.sin(a) * R * 1.22);
        ctx.lineTo(Math.cos(a + 0.14) * R * 0.95, Math.sin(a + 0.14) * R * 0.95);
        ctx.fill();
      }
      // eye + angry brow
      const exx = R * 0.12, eyy = -R * 0.5;
      ctx.fillStyle = '#fff';
      ellipse(ctx, exx, eyy, R * 0.2, R * 0.18); ctx.fill();
      if (dizzy) {
        ctx.strokeStyle = '#2a0420'; ctx.lineWidth = Math.max(1.5, s * 0.04);
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const a = i * 0.7 + t * 6, rr2 = R * 0.012 * i;
          ctx.lineTo(exx + Math.cos(a) * rr2, eyy + Math.sin(a) * rr2);
        }
        ctx.stroke();
      } else {
        ctx.fillStyle = game.invis > 0 ? '#7a6b80' : '#d4001e';
        ctx.beginPath(); ctx.arc(exx + R * 0.06, eyy + R * 0.02, R * 0.09, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(exx + R * 0.07, eyy + R * 0.02, R * 0.045, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#1a0214'; ctx.lineWidth = Math.max(2, s * 0.08); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(exx - R * 0.24, eyy - R * 0.3); ctx.lineTo(exx + R * 0.26, eyy - R * 0.12); ctx.stroke();
      }
      ctx.restore();

      // status bubbles (not rotated)
      if (dizzy) {
        ctx.fillStyle = '#ffd23f';
        for (let i = 0; i < 3; i++) {
          const a = t * 5 + i * Math.PI * 2 / 3;
          this.star(ctx, Math.cos(a) * R * 0.8, -R * 0.95 + Math.sin(a) * R * 0.25, s * 0.1, t * 4);
        }
      } else if (game.invis > 0 && e.state === 'chase' && game.state === 'play') {
        ctx.font = `${Math.max(12, s * 0.6)}px "Lilita One", system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 3;
        const qy = -R * 1.35 + Math.sin(t * 4) * s * 0.06;
        ctx.strokeText('?', 0, qy); ctx.fillText('?', 0, qy);
      }
      ctx.restore();
    }

    drawVignette(ctx, game, t) {
      const w = this.vw, h = this.vh;
      let color = null, strength = 0;
      if (game.state === 'play' && game.enemy.state === 'chase' && game.invis <= 0) {
        const d = game.enemyDistance();
        if (d < 6) { color = '255,40,70'; strength = (1 - d / 6) * 0.45; }
      }
      if (game.invis > 0) { color = '90,180,255'; strength = 0.28; }
      if (game.fighter > 0) { color = '255,110,50'; strength = 0.14 + Math.sin(t * 10) * 0.04; }
      if (game.state === 'caught') { color = '255,30,50'; strength = 0.5; }
      if (!color) return;
      const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
      g.addColorStop(0, `rgba(${color},0)`);
      g.addColorStop(1, `rgba(${color},${strength})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  RT.Renderer = Renderer;
})();
