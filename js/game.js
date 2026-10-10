/* Rabbittor — game rules and state. */
(function () {
  const RT = window.RT;
  const { T, DIR, DIR_LIST } = RT;

  class Game {
    constructor(renderer, sound, ui) {
      this.renderer = renderer;
      this.sound = sound;
      this.ui = ui;
      this.state = 'title';
      this.clock = 0;
      this.particles = [];
      this.popups = [];
      this.level = null;
      this.heartTimer = 0;
    }

    // ---------- run / level setup ----------
    newRun(diffKey) {
      this.diff = RT.DIFFICULTIES[diffKey];
      this.lives = this.diff.lives;
      this.score = 0;
      this.levelNum = 1;
      this.charges = 0;
      this.chargeProgress = 0;
      this.totalCarrots = 0;
      this.bounces = 0;
      this.startLevel();
    }

    startLevel() {
      const d = this.diff;
      const portrait = window.innerHeight > window.innerWidth * 1.05;
      const base = portrait ? d.port : d.land;
      // later levels get bigger mazes (on tall phone screens only taller, so they still fit the width)
      const grow = Math.min(this.levelNum - 1, 3) * 4;
      const growW = portrait ? Math.min(this.levelNum - 1, 3) * 2 : grow;
      this.seed = (Math.random() * 1e9) | 0;
      this.level = RT.generateLevel(base[0] + growW, base[1] + grow, d.braid, d.loops, this.seed);
      this.carrotsTotal = this.level.carrots.size;
      this.doorOpen = false;
      this.levelTime = 0;
      this.golden = null;
      this.goldenTimer = 14 + Math.random() * 10;
      this.particles = [];
      this.popups = [];
      this.streak = 0;
      this.lastEat = -9;
      this.invis = 0;
      this.invisCd = 0;
      this.fighter = 0;
      this.enemySpeedMul = Math.min(d.enemySpeed + (this.levelNum - 1) * 0.04, 1.08);
      this.renderer.setLevel(this.level);
      this.resetPositions(true);
      this.ui.levelStarted(this);
    }

    resetPositions(first) {
      const L = this.level;
      this.rabbit = { tx: L.cage.x, ty: L.cage.y, p: 0, dir: null, next: null, face: DIR.right };
      this.enemy = {
        tx: L.lair.x, ty: L.lair.y, p: 0, dir: null, face: DIR.right,
        state: 'lair', timer: first ? this.diff.enemyDelay : this.diff.respawnDelay,
        lastSeen: null, warned: false, lastTick: 99
      };
      this.gateOpen = false;
      this.gateAnim = 0;
      this.cageOpen = false;
      this.cageAnim = 0;
      this.invis = 0;
      this.fighter = 0;
      this.state = 'intro';
      this.introTimer = first ? 3.2 : 1.8;
      this.introFirst = first;
      this.lastCount = null;
    }

    // ---------- helpers ----------
    posOf(e) {
      if (e.fly) {
        const k = Math.min(1, e.fly.t);
        const ease = 1 - Math.pow(1 - k, 3);
        return {
          x: e.fly.fx + (e.fly.tx - e.fly.fx) * ease,
          y: e.fly.fy + (e.fly.ty - e.fly.fy) * ease - Math.sin(k * Math.PI) * 3
        };
      }
      return { x: e.tx + (e.dir ? e.dir.x * e.p : 0), y: e.ty + (e.dir ? e.dir.y * e.p : 0) };
    }
    tileOf(e) {
      if (e.dir && e.p >= 0.5) return { x: e.tx + e.dir.x, y: e.ty + e.dir.y };
      return { x: e.tx, y: e.ty };
    }
    rabbitCan(x, y) {
      const t = this.level.at(x, y);
      if (x < this.level.OX) return false;
      return t === T.PATH || (t === T.DOOR && this.doorOpen);
    }
    enemyTile(x, y) {
      const t = this.level.at(x, y);
      if (t === T.PATH) return true;
      if (t === T.LAIR || t === T.GATE) return this.gateOpen;
      return false;
    }
    enemyDistance() {
      const a = this.posOf(this.rabbit), b = this.posOf(this.enemy);
      return Math.hypot(a.x - b.x, a.y - b.y);
    }

    // ---------- input ----------
    setDirection(name) {
      const d = DIR[name];
      if (!d || !this.rabbit) return;
      this.rabbit.next = d;
    }

    useInvisibility() {
      if (this.state !== 'play') return;
      if (this.invis > 0 || this.invisCd > 0) {
        this.sound.deny();
        if (this.invisCd > 0 && this.invis <= 0) this.ui.toast(`Invisibility recharging: ${Math.ceil(this.invisCd)}s`);
        return;
      }
      this.invis = this.diff.invisDur;
      this.invisCd = RT.INVIS_COOLDOWN;
      this.sound.invis();
      const p = this.posOf(this.rabbit);
      this.popup(p.x + 0.5, p.y - 0.2, 'Invisible!', '#9fe0ff');
      this.burst(p.x + 0.5, p.y + 0.5, '#9fe0ff', 14);
    }

    useFighter() {
      if (this.state !== 'play') return;
      if (this.fighter > 0) return;
      if (this.charges <= 0) {
        this.sound.deny();
        this.ui.toast(`Fighter needs ${RT.FIGHTER_COST} carrots — ${RT.FIGHTER_COST - this.chargeProgress} to go`);
        return;
      }
      this.charges--;
      this.normalizeCharges();
      this.fighter = this.diff.fighterDur;
      this.sound.fighter();
      const p = this.posOf(this.rabbit);
      this.popup(p.x + 0.5, p.y - 0.2, 'Fighter!', '#ff7b54');
      this.burst(p.x + 0.5, p.y + 0.5, '#ff7b54', 14);
    }

    togglePause() {
      if (this.state === 'paused') this.resume();
      else if (this.state === 'play' || this.state === 'intro') this.pause();
    }
    pause() {
      if (this.state !== 'play' && this.state !== 'intro') return;
      this.pausedFrom = this.state;
      this.state = 'paused';
      this.sound.stopMusic();
      this.ui.showPause(true);
    }
    resume() {
      if (this.state !== 'paused') return;
      this.state = this.pausedFrom || 'play';
      this.ui.showPause(false);
      this.sound.startMusic();
    }

    // ---------- main update ----------
    update(dt) {
      this.clock += dt;
      if (this.state === 'paused' || this.state === 'title') return;

      this.cageAnim = this.cageOpen ? Math.min(1, this.cageAnim + dt * 1.8) : 0;
      this.gateAnim = this.gateOpen ? Math.min(1, this.gateAnim + dt * 2) : Math.max(0, this.gateAnim - dt * 2);

      if (this.state === 'intro') {
        this.introTimer -= dt;
        if (this.introFirst) {
          const n = Math.ceil(this.introTimer - 0.2);
          if (n !== this.lastCount && n >= 1 && n <= 3) { this.lastCount = n; this.ui.countdown(String(n)); this.sound.tick(); }
        } else if (this.lastCount == null) { this.lastCount = 0; this.ui.countdown('Ready!'); }
        if (this.introTimer <= 0) {
          this.cageOpen = true;
          this.state = 'play';
          this.ui.countdown('GO!', true);
          this.sound.go();
          const L = this.level;
          this.burst(L.cage.x + 0.5, L.cage.y + 0.5, '#c9d3dc', 10);
        }
      } else if (this.state === 'play') {
        this.updatePlay(dt);
      } else if (this.state === 'caught') {
        this.caughtTimer -= dt;
        if (this.caughtTimer <= 0) {
          if (this.lives <= 0) this.gameOver();
          else this.resetPositions(false);
        }
      }

      // particles & popups
      for (const p of this.particles) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; p.life -= dt;
      }
      this.particles = this.particles.filter(p => p.life > 0);
      for (const p of this.popups) { p.y -= dt * 1.1; p.life -= dt; }
      this.popups = this.popups.filter(p => p.life > 0);
    }

    updatePlay(dt) {
      this.levelTime += dt;
      if (this.invis > 0) {
        this.invis -= dt;
        if (this.invis <= 0) { this.invis = 0; this.sound.invisEnd(); }
      }
      if (this.invisCd > 0) {
        this.invisCd -= dt;
        if (this.invisCd <= 0) { this.invisCd = 0; this.ui.toast('Invisibility is ready!'); this.sound.charge(); }
      }
      if (this.fighter > 0) {
        this.fighter -= dt;
        if (this.fighter <= 0) this.fighter = 0;
      }

      this.moveRabbit(dt);
      if (this.state !== 'play') return;
      this.updateEnemy(dt);
      this.checkCollision();
      this.updateGolden(dt);

      // heartbeat when Big Mouth is near
      if (this.enemy.state === 'chase' && this.invis <= 0) {
        const d = this.enemyDistance();
        this.sound.musicTempo = d < 6 ? 1.35 : 1;
        if (d < 6) {
          this.heartTimer -= dt;
          if (this.heartTimer <= 0) { this.heartTimer = 0.35 + d * 0.12; this.sound.heart(1 - d / 7); }
        }
      } else this.sound.musicTempo = 1;
    }

    // ---------- movement ----------
    step(e, dist, decide, arrive) {
      let guard = 10;
      while (guard-- > 0) {
        if (e.p === 0) { decide(e); if (!e.dir) return; }
        const need = 1 - e.p;
        if (dist < need) { e.p += dist; return; }
        dist -= need;
        e.tx += e.dir.x; e.ty += e.dir.y; e.p = 0;
        if (arrive) arrive(e);
        if (this.state !== 'play') return;
        if (dist <= 1e-6) return;
      }
    }

    moveRabbit(dt) {
      const r = this.rabbit;
      if (!this.cageOpen) return;
      if (r.next && r.dir && r.p > 0 && r.next === RT.opposite(r.dir)) {
        r.tx += r.dir.x; r.ty += r.dir.y; r.p = 1 - r.p; r.dir = r.next; r.face = r.dir;
      }
      this.step(r, RT.RABBIT_SPEED * dt, (e) => this.rabbitDecide(e), (e) => this.rabbitArrive(e));
    }

    rabbitDecide(r) {
      const can = (d) => d && this.rabbitCan(r.tx + d.x, r.ty + d.y);
      if (can(r.next)) r.dir = r.next;
      else if (!can(r.dir)) r.dir = null;
      if (r.dir) r.face = r.dir;
    }

    rabbitArrive(r) {
      const L = this.level;
      const k = L.key(r.tx, r.ty);
      if (L.carrots.has(k)) this.eatCarrot(k, r.tx, r.ty);
      if (this.golden && this.golden.x === r.tx && this.golden.y === r.ty) this.eatGolden();
      if (L.at(r.tx, r.ty) === T.DOOR && this.doorOpen) this.escape();
    }

    eatCarrot(k, x, y) {
      this.level.carrots.delete(k);
      this.totalCarrots++;
      if (this.levelTime - this.lastEat < 0.5) this.streak++; else this.streak = 1;
      this.lastEat = this.levelTime;
      this.addScore(RT.CARROT_POINTS);
      if (this.streak > 0 && this.streak % 15 === 0) {
        this.addScore(50);
        this.popup(x + 0.5, y, `Munch x${this.streak} +${Math.round(50 * this.diff.mult)}`, '#ffd23f');
      }
      this.addCharge(1, x, y);
      this.sound.munch();
      for (let i = 0; i < 4; i++) {
        this.particles.push({
          x: x + 0.5, y: y + 0.5, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 3,
          g: 8, life: 0.4, max: 0.4, size: 0.05, color: i % 2 ? '#ff8a1f' : '#6fdc6a'
        });
      }
      if (this.level.carrots.size === 0) this.openDoor();
    }

    addCharge(n, x, y) {
      if (this.charges >= RT.FIGHTER_MAX) { this.chargeProgress = RT.FIGHTER_COST; return; }
      this.chargeProgress += n;
      if (this.chargeProgress >= RT.FIGHTER_COST) {
        this.chargeProgress -= RT.FIGHTER_COST;
        this.charges++;
        if (this.charges >= RT.FIGHTER_MAX) this.chargeProgress = RT.FIGHTER_COST;
        this.popup(x + 0.5, y - 0.4, 'Fighter ready!', '#ff7b54', true);
        this.sound.charge();
      }
    }
    normalizeCharges() {
      if (this.chargeProgress >= RT.FIGHTER_COST && this.charges < RT.FIGHTER_MAX) {
        this.charges++;
        this.chargeProgress = this.charges >= RT.FIGHTER_MAX ? RT.FIGHTER_COST : 0;
      }
    }

    eatGolden() {
      const g = this.golden;
      this.golden = null;
      this.goldenTimer = 20 + Math.random() * 12;
      this.addScore(RT.GOLDEN_POINTS);
      this.popup(g.x + 0.5, g.y, `+${Math.round(RT.GOLDEN_POINTS * this.diff.mult)}`, '#ffd23f', true);
      this.addCharge(5, g.x, g.y);
      this.sound.golden();
      this.burst(g.x + 0.5, g.y + 0.5, '#ffd23f', 16, true);
    }

    updateGolden(dt) {
      if (this.golden) {
        this.golden.life -= dt;
        if (this.golden.life <= 0) { this.golden = null; this.goldenTimer = 18 + Math.random() * 12; }
        return;
      }
      this.goldenTimer -= dt;
      if (this.goldenTimer > 0) return;
      const L = this.level, r = this.tileOf(this.rabbit);
      const dist = RT.bfs(L, r.x, r.y, (x, y) => this.rabbitCan(x, y));
      const cands = [];
      for (let i = 0; i < dist.length; i++) {
        if (dist[i] >= 6 && L.grid[i] === T.PATH) cands.push(i);
      }
      if (!cands.length) { this.goldenTimer = 5; return; }
      const k = cands[Math.floor(Math.random() * cands.length)];
      this.golden = { x: k % L.W, y: (k / L.W) | 0, life: 10 };
      this.ui.toast('A golden carrot appeared!');
    }

    openDoor() {
      this.doorOpen = true;
      this.sound.door();
      this.ui.banner('All carrots eaten! The escape door is OPEN — run to the centre!', 'good');
      const d = this.level.door;
      this.burst(d.x + 0.5, d.y + 0.5, '#ffd23f', 24, true);
    }

    // ---------- enemy ----------
    updateEnemy(dt) {
      const e = this.enemy;
      if (e.state === 'lair') {
        e.timer -= dt;
        const n = Math.ceil(e.timer);
        if (n !== e.lastTick) { e.lastTick = n; this.ui.enemyCountdown(Math.max(0, n)); }
        if (e.timer <= 3 && !e.warned) { e.warned = true; this.sound.growl(); }
        if (e.timer <= 0) {
          e.state = 'chase';
          this.gateOpen = true;
          this.ui.enemyCountdown(-1);
          this.ui.banner('BIG MOUTH IS COMING!', 'danger');
          this.sound.arrive();
          this.renderer.shake = 10;
        }
        return;
      }
      if (e.state === 'flying') {
        e.fly.t += dt / e.fly.dur;
        if (e.fly.t >= 1) {
          e.tx = e.fly.tx; e.ty = e.fly.ty; e.p = 0; e.dir = null; e.fly = null;
          e.state = 'dizzy'; e.timer = 2.5;
          this.renderer.shake = 6;
        }
        return;
      }
      if (e.state === 'dizzy') {
        e.timer -= dt;
        if (e.timer <= 0) e.state = 'chase';
        return;
      }
      // chase
      let speed = RT.RABBIT_SPEED * this.enemySpeedMul;
      if (this.doorOpen) speed *= 1.1;
      if (this.invis > 0) speed *= 0.85;
      this.step(e, speed * dt, (en) => this.enemyDecide(en), null);
    }

    enemyDecide(e) {
      const L = this.level;
      const inMaze = e.tx >= L.OX;
      const opts = DIR_LIST.filter(d => {
        const nx = e.tx + d.x, ny = e.ty + d.y;
        if (inMaze && nx < L.OX) return false;
        return this.enemyTile(nx, ny);
      });
      if (!opts.length) { e.dir = null; return; }
      const rev = RT.opposite(e.dir);
      const hidden = this.invis > 0;
      let target = null;
      if (!hidden) { target = this.tileOf(this.rabbit); e.lastSeen = target; }
      else if (e.lastSeen && !(e.lastSeen.x === e.tx && e.lastSeen.y === e.ty)) target = e.lastSeen;
      else e.lastSeen = null;

      let choice = null;
      const nonRev = opts.filter(d => d !== rev);
      if (target && !(inMaze && opts.length > 2 && Math.random() < this.diff.wander)) {
        const dist = RT.bfs(L, target.x, target.y, (x, y) => this.enemyTile(x, y));
        let best = Infinity;
        for (const d of opts) {
          const v = dist[L.key(e.tx + d.x, e.ty + d.y)];
          if (v >= 0 && v < best) { best = v; choice = d; }
        }
      }
      if (!choice) {
        const pool = nonRev.length ? nonRev : opts;
        choice = pool[Math.floor(Math.random() * pool.length)];
      }
      e.dir = choice;
      e.face = choice;
    }

    checkCollision() {
      const e = this.enemy;
      if (e.state !== 'chase') return;
      if (this.enemyDistance() > 0.72) return;
      if (this.fighter > 0) this.bounce();
      else if (this.invis > 0) return;
      else this.caught();
    }

    bounce() {
      const L = this.level, e = this.enemy;
      const r = this.tileOf(this.rabbit);
      const dist = RT.bfs(L, r.x, r.y, (x, y) => x >= L.OX && this.level.at(x, y) === T.PATH);
      let best = -1, bk = L.key(L.cage.x, L.cage.y);
      for (let i = 0; i < dist.length; i++) if (dist[i] > best) { best = dist[i]; bk = i; }
      const from = this.posOf(e);
      e.fly = { fx: from.x, fy: from.y, tx: bk % L.W, ty: (bk / L.W) | 0, t: 0, dur: 0.9 };
      e.state = 'flying';
      e.dir = null; e.p = 0;
      this.fighter = 0;
      this.bounces++;
      this.addScore(RT.BOUNCE_POINTS);
      this.popup(from.x + 0.5, from.y, `POW! +${Math.round(RT.BOUNCE_POINTS * this.diff.mult)}`, '#ff7b54', true);
      this.burst(from.x + 0.5, from.y + 0.5, '#ffd23f', 20, true);
      this.sound.bounce();
      this.renderer.shake = 14;
      if (navigator.vibrate) try { navigator.vibrate(60); } catch (err) { /* ignore */ }
    }

    caught() {
      this.state = 'caught';
      this.caughtTimer = 1.8;
      this.lives--;
      this.sound.caught();
      this.sound.musicTempo = 1;
      this.renderer.shake = 16;
      const p = this.posOf(this.rabbit);
      this.popup(p.x + 0.5, p.y - 0.3, 'CAUGHT!', '#ff4d5e', true);
      this.ui.banner(this.lives > 0 ? `Big Mouth caught you! ${this.lives} ${this.lives === 1 ? 'life' : 'lives'} left` : 'Big Mouth caught you!', 'danger');
      if (navigator.vibrate) try { navigator.vibrate([120, 60, 200]); } catch (err) { /* ignore */ }
    }

    // ---------- endings ----------
    escape() {
      this.state = 'levelclear';
      const mult = this.diff.mult;
      const par = this.carrotsTotal * 0.55 + 25;
      const timeBonus = Math.max(0, Math.round(par - this.levelTime)) * 5;
      const livesBonus = this.lives * 250;
      const escapeBonus = 1000;
      const total = Math.round((escapeBonus + timeBonus + livesBonus) * mult);
      this.score += total;
      const best = this.saveBest();
      this.sound.win();
      this.sound.stopMusic();
      this.ui.enemyCountdown(-1);
      this.ui.showLevelClear({
        level: this.levelNum, time: this.levelTime, escapeBonus, timeBonus, livesBonus,
        mult, total, score: this.score, best
      });
    }

    nextLevel() {
      this.levelNum++;
      this.startLevel();
      this.sound.startMusic();
    }

    gameOver() {
      this.state = 'gameover';
      const best = this.saveBest();
      this.sound.stopMusic();
      this.sound.lose();
      this.ui.enemyCountdown(-1);
      this.ui.showGameOver({ score: this.score, level: this.levelNum, carrots: this.totalCarrots, bounces: this.bounces, best });
    }

    saveBest() {
      const key = 'rt_best_' + this.diff.key;
      let prev = 0;
      try { prev = parseInt(localStorage.getItem(key) || '0', 10) || 0; } catch (e) { /* ignore */ }
      const isNew = this.score > prev;
      if (isNew) { try { localStorage.setItem(key, String(this.score)); } catch (e) { /* ignore */ } }
      return { value: Math.max(prev, this.score), isNew };
    }

    // ---------- fx ----------
    addScore(n) { this.score += Math.round(n * this.diff.mult); }
    popup(x, y, text, color, big) { this.popups.push({ x, y, text, color, life: big ? 1.3 : 0.9, big }); }
    burst(x, y, color, n, star) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = 1.5 + Math.random() * 3;
        this.particles.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 2,
          life: 0.7, max: 0.7, size: star ? 0.12 : 0.07, color, star
        });
      }
    }
  }

  RT.Game = Game;
})();
