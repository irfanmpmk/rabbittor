/* Rabbittor — boot, input and main loop. */
(function () {
  const RT = window.RT;
  const $ = (id) => document.getElementById(id);

  const canvas = $('game');
  const renderer = new RT.Renderer(canvas);
  const sound = new RT.Sound();
  const ui = new RT.UI();
  const game = new RT.Game(renderer, sound, ui);
  RT.game = game; // handy for debugging in the console

  let lastMode = 'normal';

  // ---------- screens ----------
  function startRun(mode) {
    lastMode = mode;
    sound.unlock();
    game.newRun(mode);
    sound.startMusic();
  }
  function toMenu() {
    game.state = 'title';
    sound.stopMusic();
    ui.showTitle();
  }

  $('modes').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-mode]');
    if (!b) return;
    sound.unlock(); sound.click();
    startRun(b.dataset.mode);
  });
  $('btnHelp').addEventListener('click', () => { sound.unlock(); sound.click(); ui.showScreen('scrHelp'); });
  $('btnHelpBack').addEventListener('click', () => { sound.click(); ui.showTitle(); });
  $('btnPause').addEventListener('click', () => { sound.unlock(); game.togglePause(); });
  $('btnResume').addEventListener('click', () => game.resume());
  $('btnRestart').addEventListener('click', () => { ui.showPause(false); startRun(lastMode); });
  $('btnQuit').addEventListener('click', toMenu);
  $('btnNext').addEventListener('click', () => { sound.click(); game.nextLevel(); });
  $('btnLcMenu').addEventListener('click', toMenu);
  $('btnAgain').addEventListener('click', () => { sound.click(); startRun(lastMode); });
  $('btnGoMenu').addEventListener('click', toMenu);

  function syncToggles() {
    document.querySelectorAll('[data-toggle="sfx"]').forEach(b => { b.setAttribute('aria-pressed', sound.sfxOn); b.querySelector('b').textContent = sound.sfxOn ? 'On' : 'Off'; });
    document.querySelectorAll('[data-toggle="music"]').forEach(b => { b.setAttribute('aria-pressed', sound.musicOn); b.querySelector('b').textContent = sound.musicOn ? 'On' : 'Off'; });
  }
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-toggle]');
    if (!t) return;
    sound.unlock();
    if (t.dataset.toggle === 'sfx') sound.setSfx(!sound.sfxOn);
    else {
      sound.setMusic(!sound.musicOn);
      if (sound.musicOn && (game.state === 'play' || game.state === 'intro')) sound.startMusic(); else sound.stopMusic();
    }
    syncToggles();
  });
  syncToggles();

  // ---------- skills ----------
  const skillBtn = (id, fn) => {
    const el = $(id);
    el.addEventListener('pointerdown', (ev) => { ev.preventDefault(); sound.unlock(); fn(); });
    el.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') fn(); });
  };
  skillBtn('btnInvis', () => game.useInvisibility());
  skillBtn('btnFighter', () => game.useFighter());

  // ---------- keyboard ----------
  const KEYS = {
    ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right'
  };
  window.addEventListener('keydown', (ev) => {
    const playing = game.state === 'play' || game.state === 'intro';
    if (KEYS[ev.code] && playing) { ev.preventDefault(); game.setDirection(KEYS[ev.code]); return; }
    if (!playing && game.state !== 'paused') return;
    switch (ev.code) {
      case 'Space': case 'KeyE': case 'KeyI':
        ev.preventDefault(); sound.unlock(); game.useInvisibility(); break;
      case 'KeyF': case 'ShiftLeft': case 'ShiftRight': case 'KeyQ':
        ev.preventDefault(); sound.unlock(); game.useFighter(); break;
      case 'KeyP': case 'Escape':
        ev.preventDefault(); game.togglePause(); break;
    }
  });

  // ---------- touch: swipe anywhere on the maze + d-pad ----------
  const stage = $('stage');
  let sw = null;
  stage.addEventListener('pointerdown', (ev) => {
    sound.unlock();
    sw = { x: ev.clientX, y: ev.clientY, id: ev.pointerId };
  });
  stage.addEventListener('pointermove', (ev) => {
    if (!sw || ev.pointerId !== sw.id) return;
    const dx = ev.clientX - sw.x, dy = ev.clientY - sw.y;
    if (Math.hypot(dx, dy) < 18) return;
    game.setDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    sw.x = ev.clientX; sw.y = ev.clientY;
  });
  const endSwipe = () => { sw = null; };
  stage.addEventListener('pointerup', endSwipe);
  stage.addEventListener('pointercancel', endSwipe);

  document.querySelectorAll('[data-dir]').forEach((b) => {
    b.addEventListener('pointerdown', (ev) => {
      ev.preventDefault(); sound.unlock();
      game.setDirection(b.dataset.dir);
      b.classList.add('pressed');
      setTimeout(() => b.classList.remove('pressed'), 140);
    });
  });

  // ---------- window events ----------
  const onResize = () => { if (game.level) renderer.resize(); };
  window.addEventListener('resize', onResize);
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(stage);
  document.addEventListener('visibilitychange', () => { if (document.hidden) game.pause(); });

  // ---------- title art: rabbit running from Big Mouth ----------
  const art = $('titleArt');
  const actx = art.getContext('2d');
  const fake = { state: 'play', invis: 0, fighter: 0, caughtTimer: 0 };
  function drawTitle(t) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = art.clientWidth, h = art.clientHeight;
    if (!w || !h) return;
    if (art.width !== Math.round(w * dpr)) { art.width = Math.round(w * dpr); art.height = Math.round(h * dpr); }
    actx.setTransform(dpr, 0, 0, dpr, 0, 0);
    actx.clearRect(0, 0, w, h);
    const s = Math.min(h * 0.62, 72);
    const cycle = (t * 0.12) % 1;
    const span = w + s * 4;
    const rx = -s + cycle * span, ex = rx - s * 2.1;
    const y = h * 0.58;
    // carrots on the trail
    for (let i = 0; i < 8; i++) {
      const cx = ((i + 0.5) / 8) * w;
      if (cx > rx) {
        actx.save(); actx.translate(cx, y + s * 0.15); actx.rotate(-0.6);
        actx.fillStyle = '#6fdc6a'; actx.fillRect(-2, -s * 0.24, 4, s * 0.1);
        actx.fillStyle = '#ff8a1f';
        actx.beginPath(); actx.moveTo(-s * 0.06, -s * 0.14); actx.lineTo(s * 0.06, -s * 0.14); actx.lineTo(0, s * 0.14); actx.fill();
        actx.restore();
      }
    }
    renderer.drawRabbit(actx, rx, y, s, { dir: RT.DIR.right, face: RT.DIR.right }, t, fake);
    renderer.drawBigMouth(actx, ex, y, s * 1.1, { face: RT.DIR.right, state: 'chase' }, t, fake);
  }

  // ---------- loop ----------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.update(dt);
    if (game.state === 'title' || !game.level) {
      if (!$('scrTitle').hidden) drawTitle(now / 1000);
    } else {
      renderer.draw(game);
      ui.sync(game);
    }
    requestAnimationFrame(frame);
  }

  // credits
  $('credit').textContent = `Story, map and Big Mouth invented by ${RT.CREDITS.storyBy}.`;

  ui.showTitle();
  requestAnimationFrame(frame);
})();
