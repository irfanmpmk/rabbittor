/* Rabbittor — maze generation.
   Layout follows the original drawing: Big Mouth's lair and the rabbit cage
   sit at the left entrance, the escape door is locked in the centre vault. */
(function () {
  const RT = window.RT;

  const T = RT.T = { PATH: 0, WALL: 1, VOID: 2, LAIR: 3, GATE: 4, DOOR: 5 };

  const DIR = RT.DIR = {
    up: { x: 0, y: -1, name: 'up' },
    down: { x: 0, y: 1, name: 'down' },
    left: { x: -1, y: 0, name: 'left' },
    right: { x: 1, y: 0, name: 'right' }
  };
  RT.DIR_LIST = [DIR.up, DIR.right, DIR.down, DIR.left];
  RT.opposite = function (d) {
    if (!d) return null;
    if (d === DIR.up) return DIR.down;
    if (d === DIR.down) return DIR.up;
    if (d === DIR.left) return DIR.right;
    return DIR.left;
  };

  // Small seeded random generator (mulberry32)
  RT.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /* Build a level.
     mw, mh : maze size (mw odd, mh = 4k+3 so the entrance row is a corridor)
     braid  : chance of removing each dead end (1 = no dead ends)
     loops  : chance of opening extra shortcuts between parallel corridors */
  RT.generateLevel = function (mw, mh, braid, loops, seed) {
    const rand = RT.rng(seed);
    const m = [];
    for (let y = 0; y < mh; y++) m.push(new Array(mw).fill(1));
    const inner = (x, y) => x > 0 && y > 0 && x < mw - 1 && y < mh - 1;
    const K = (x, y) => y * mw + x;

    // 1. Perfect maze with a recursive backtracker
    const stack = [[1, 1]];
    m[1][1] = 0;
    const steps = [[2, 0], [-2, 0], [0, 2], [0, -2]];
    while (stack.length) {
      const [cx, cy] = stack[stack.length - 1];
      const opts = steps.filter(([dx, dy]) => {
        const nx = cx + dx, ny = cy + dy;
        return inner(nx, ny) && m[ny][nx] === 1;
      });
      if (!opts.length) { stack.pop(); continue; }
      const [dx, dy] = opts[Math.floor(rand() * opts.length)];
      m[cy + dy / 2][cx + dx / 2] = 0;
      m[cy + dy][cx + dx] = 0;
      stack.push([cx + dx, cy + dy]);
    }

    const midY = (mh - 1) / 2;
    const cx = (mw - 1) / 2, cy = midY;
    const soft = new Set();  // braid / shortcuts may not open these
    const hard = new Set();  // nothing may open these

    // 2. Centre vault: a ring corridor around a walled room holding the door
    for (let y = cy - 3; y <= cy + 3; y++) {
      for (let x = cx - 3; x <= cx + 3; x++) {
        const ring = Math.max(Math.abs(x - cx), Math.abs(y - cy));
        if (ring === 3) { m[y][x] = 1; soft.add(K(x, y)); }
        else if (ring === 2) { m[y][x] = 0; soft.add(K(x, y)); }
        else { m[y][x] = 1; hard.add(K(x, y)); }
      }
    }
    m[cy][cx] = 5;          // door
    m[cy + 1][cx] = 0;      // entry below the door
    // four exits from the ring, carved outward until they meet the maze
    [[0, -1], [0, 1], [-1, 0], [1, 0]].forEach(([dx, dy]) => {
      let x = cx + dx * 3, y = cy + dy * 3;
      m[y][x] = 0;
      x += dx; y += dy;
      while (inner(x, y) && m[y][x] !== 0) { m[y][x] = 0; x += dx; y += dy; }
    });

    // 3. Cage entrance on the left border
    m[midY][0] = 0; hard.add(K(0, midY));
    m[midY][1] = 0;

    const isOpen = (x, y) => x >= 0 && y >= 0 && x < mw && y < mh && m[y][x] !== 1;
    const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    // 4. Remove dead ends (braiding) so the rabbit has escape loops
    for (let y = 1; y < mh - 1; y++) {
      for (let x = 1; x < mw - 1; x++) {
        if (m[y][x] !== 0) continue;
        const walls = D4.filter(([dx, dy]) => !isOpen(x + dx, y + dy));
        if (walls.length < 3 || rand() >= braid) continue;
        let cands = walls.filter(([dx, dy]) => {
          const wx = x + dx, wy = y + dy;
          return inner(wx, wy) && !soft.has(K(wx, wy)) && !hard.has(K(wx, wy)) && isOpen(x + 2 * dx, y + 2 * dy);
        });
        if (!cands.length) {
          cands = walls.filter(([dx, dy]) => {
            const wx = x + dx, wy = y + dy;
            return inner(wx, wy) && !soft.has(K(wx, wy)) && !hard.has(K(wx, wy));
          });
        }
        if (!cands.length) continue;
        const [dx, dy] = cands[Math.floor(rand() * cands.length)];
        m[y + dy][x + dx] = 0;
      }
    }

    // 5. Extra shortcuts between parallel corridors
    for (let y = 1; y < mh - 1; y++) {
      for (let x = 1; x < mw - 1; x++) {
        if (m[y][x] !== 1 || soft.has(K(x, y)) || hard.has(K(x, y))) continue;
        const h = isOpen(x - 1, y) && isOpen(x + 1, y) && !isOpen(x, y - 1) && !isOpen(x, y + 1);
        const v = isOpen(x, y - 1) && isOpen(x, y + 1) && !isOpen(x - 1, y) && !isOpen(x + 1, y);
        if ((h || v) && rand() < loops) m[y][x] = 0;
      }
    }

    // 6. Make sure every open tile is reachable from the cage
    const reach = () => {
      const seen = new Uint8Array(mw * mh);
      const q = [K(0, midY)];
      seen[q[0]] = 1;
      while (q.length) {
        const k = q.pop();
        const x = k % mw, y = (k / mw) | 0;
        for (const [dx, dy] of D4) {
          const nx = x + dx, ny = y + dy;
          if (isOpen(nx, ny) && !seen[K(nx, ny)]) { seen[K(nx, ny)] = 1; q.push(K(nx, ny)); }
        }
      }
      return seen;
    };
    for (let guard = 0; guard < 400; guard++) {
      const seen = reach();
      let fixed = false, missing = false;
      for (let y = 1; y < mh - 1 && !fixed; y++) {
        for (let x = 1; x < mw - 1 && !fixed; x++) {
          if (m[y][x] !== 0 || seen[K(x, y)]) continue;
          missing = true;
          for (const [dx, dy] of D4) {
            const wx = x + dx, wy = y + dy;
            if (!inner(wx, wy) || hard.has(K(wx, wy)) || m[wy][wx] !== 1) continue;
            if (isOpen(wx + dx, wy + dy) && seen[K(wx + dx, wy + dy)]) {
              m[wy][wx] = 0; fixed = true; break;
            }
          }
        }
      }
      if (!missing) break;
      if (!fixed) {
        // fall back: open any wall touching both regions
        for (let y = 1; y < mh - 1 && !fixed; y++) {
          for (let x = 1; x < mw - 1 && !fixed; x++) {
            if (m[y][x] !== 1 || hard.has(K(x, y))) continue;
            let a = false, b = false;
            for (const [dx, dy] of D4) {
              const nx = x + dx, ny = y + dy;
              if (!isOpen(nx, ny)) continue;
              if (seen[K(nx, ny)]) a = true; else b = true;
            }
            if (a && b) { m[y][x] = 0; fixed = true; }
          }
        }
        if (!fixed) break;
      }
    }

    // 7. Build the full grid with two outside columns for lair + gate
    const OX = 2;
    const W = mw + OX, H = mh;
    const grid = new Uint8Array(W * H).fill(T.VOID);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < mw; x++) {
        const v = m[y][x];
        grid[y * W + x + OX] = v === 1 ? T.WALL : v === 5 ? T.DOOR : T.PATH;
      }
    }
    grid[midY * W + 0] = T.LAIR;
    grid[midY * W + 1] = T.GATE;

    const level = {
      W, H, OX, grid, seed,
      cage: { x: OX, y: midY },
      lair: { x: 0, y: midY },
      gate: { x: 1, y: midY },
      door: { x: OX + cx, y: cy },
      carrots: new Set()
    };
    level.key = (x, y) => y * W + x;
    level.at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? T.VOID : grid[y * W + x];

    for (let y = 0; y < H; y++) {
      for (let x = OX; x < W; x++) {
        if (grid[y * W + x] !== T.PATH) continue;
        if (x === level.cage.x && y === level.cage.y) continue;
        level.carrots.add(y * W + x);
      }
    }
    return level;
  };

  // Breadth-first distances from (sx, sy). passable(x, y) -> bool
  RT.bfs = function (level, sx, sy, passable) {
    const { W, H } = level;
    const dist = new Int32Array(W * H).fill(-1);
    const q = new Int32Array(W * H);
    let head = 0, tail = 0;
    dist[sy * W + sx] = 0;
    q[tail++] = sy * W + sx;
    while (head < tail) {
      const k = q[head++];
      const x = k % W, y = (k / W) | 0;
      const d = dist[k] + 1;
      if (x + 1 < W && dist[k + 1] < 0 && passable(x + 1, y)) { dist[k + 1] = d; q[tail++] = k + 1; }
      if (x > 0 && dist[k - 1] < 0 && passable(x - 1, y)) { dist[k - 1] = d; q[tail++] = k - 1; }
      if (y + 1 < H && dist[k + W] < 0 && passable(x, y + 1)) { dist[k + W] = d; q[tail++] = k + W; }
      if (y > 0 && dist[k - W] < 0 && passable(x, y - 1)) { dist[k - W] = d; q[tail++] = k - W; }
    }
    return dist;
  };
})();
