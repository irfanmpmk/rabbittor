/* Rabbittor — HUD, screens and messages. */
(function () {
  const RT = window.RT;
  const $ = (id) => document.getElementById(id);

  const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';

  class UI {
    constructor() {
      this.cache = {};
      this.bannerTimer = null;
      this.toastTimer = null;
      this.countTimer = null;
    }

    set(id, prop, value) {
      const k = id + '.' + prop;
      if (this.cache[k] === value) return;
      this.cache[k] = value;
      const el = $(id);
      if (!el) return;
      if (prop === 'text') el.textContent = value;
      else if (prop === 'html') el.innerHTML = value;
      else if (prop.startsWith('--')) el.style.setProperty(prop, value);
      else if (prop === 'class') el.className = value;
      else if (prop === 'hidden') el.hidden = value;
      else el.style[prop] = value;
    }

    hearts(n, max) {
      let h = '';
      for (let i = 0; i < max; i++) h += `<span class="heart ${i < n ? '' : 'lost'}">${HEART}</span>`;
      return h;
    }

    levelStarted(game) {
      this.cache = {};
      this.hideAllScreens();
      $('hud').hidden = false;
      $('controls').hidden = false;
      $('enemyTimer').hidden = true;
      this.set('levelChip', 'text', `Lv ${game.levelNum} · ${game.diff.name}`);
    }

    sync(game) {
      if (!game.diff) return;
      this.set('lives', 'html', this.hearts(game.lives, game.diff.lives));
      this.set('score', 'text', game.score.toLocaleString());
      const L = game.level;
      const eaten = game.carrotsTotal - L.carrots.size;
      this.set('carrotCount', 'text', `${eaten} / ${game.carrotsTotal}`);
      this.set('carrotFill', 'width', (eaten / Math.max(1, game.carrotsTotal) * 100).toFixed(1) + '%');
      this.set('carrotMeter', 'class', 'carrot-meter' + (game.doorOpen ? ' open' : ''));

      // invisibility button
      let iState, iPct, iClass;
      if (game.invis > 0) { iState = `${Math.ceil(game.invis)}s left`; iPct = game.invis / game.diff.invisDur; iClass = 'skill invis active'; }
      else if (game.invisCd > 0) {
        const s = Math.ceil(game.invisCd);
        iState = s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
        iPct = 1 - game.invisCd / RT.INVIS_COOLDOWN; iClass = 'skill invis cooling';
      } else { iState = 'Ready'; iPct = 1; iClass = 'skill invis ready'; }
      this.set('invisSub', 'text', iState);
      this.set('btnInvis', 'class', iClass);
      this.set('btnInvis', '--pct', (iPct * 100).toFixed(1) + '%');

      // fighter button
      let fState, fPct, fClass;
      if (game.fighter > 0) { fState = `${Math.ceil(game.fighter)}s left`; fPct = game.fighter / game.diff.fighterDur; fClass = 'skill fighter active'; }
      else if (game.charges > 0) { fState = 'Ready'; fPct = 1; fClass = 'skill fighter ready'; }
      else { fState = `${game.chargeProgress}/${RT.FIGHTER_COST}`; fPct = game.chargeProgress / RT.FIGHTER_COST; fClass = 'skill fighter cooling'; }
      this.set('fighterSub', 'text', fState);
      this.set('btnFighter', 'class', fClass);
      this.set('btnFighter', '--pct', (fPct * 100).toFixed(1) + '%');
      this.set('fighterBadge', 'text', String(game.charges));
      this.set('fighterBadge', 'hidden', game.charges <= 0);
    }

    enemyCountdown(n) {
      const el = $('enemyTimer');
      if (n < 0) { el.hidden = true; return; }
      el.hidden = false;
      el.classList.toggle('soon', n <= 3);
      $('enemyTimerNum').textContent = n;
    }

    banner(text, kind) {
      const el = $('banner');
      el.textContent = text;
      el.className = 'banner ' + (kind || '');
      el.hidden = false;
      el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
      clearTimeout(this.bannerTimer);
      this.bannerTimer = setTimeout(() => { el.hidden = true; }, 2800);
    }

    toast(text) {
      const el = $('toast');
      el.textContent = text;
      el.hidden = false;
      el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => { el.hidden = true; }, 2200);
    }

    countdown(text, go) {
      const el = $('countdown');
      el.textContent = text;
      el.className = 'countdown show' + (go ? ' go' : '');
      el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
      clearTimeout(this.countTimer);
      this.countTimer = setTimeout(() => { el.className = 'countdown'; }, go ? 700 : 950);
    }

    hideAllScreens() {
      document.querySelectorAll('.screen').forEach(s => { s.hidden = true; });
    }
    showScreen(id) {
      this.hideAllScreens();
      $(id).hidden = false;
      const first = $(id).querySelector('[data-autofocus]') || $(id).querySelector('button');
      if (first) setTimeout(() => first.focus({ preventScroll: true }), 30);
    }

    showTitle() {
      this.renderModes();
      this.showScreen('scrTitle');
      $('hud').hidden = true;
      $('controls').hidden = true;
    }

    renderModes() {
      const wrap = $('modes');
      wrap.innerHTML = '';
      RT.DIFF_ORDER.forEach((k) => {
        const d = RT.DIFFICULTIES[k];
        let best = 0;
        try { best = parseInt(localStorage.getItem('rt_best_' + k) || '0', 10) || 0; } catch (e) { /* ignore */ }
        const b = document.createElement('button');
        b.className = 'mode mode-' + k;
        b.dataset.mode = k;
        b.innerHTML = `
          <span class="mode-name">${d.name}</span>
          <span class="mode-hearts" aria-label="${d.lives} lives">${this.hearts(d.lives, d.lives)}</span>
          <span class="mode-info">${d.mapLabel} · score ×${d.mult}</span>
          <span class="mode-blurb">${d.blurb}</span>
          <span class="mode-best">${best ? 'Best ' + best.toLocaleString() : 'No score yet'}</span>`;
        wrap.appendChild(b);
      });
    }

    showPause(on) {
      if (on) this.showScreen('scrPause'); else $('scrPause').hidden = true;
    }

    showLevelClear(d) {
      const mins = Math.floor(d.time / 60), secs = Math.floor(d.time % 60);
      $('lcTitle').textContent = `Level ${d.level} escaped!`;
      $('lcRows').innerHTML = `
        <div><span>Escape bonus</span><b>${d.escapeBonus.toLocaleString()}</b></div>
        <div><span>Speed bonus (${mins}:${String(secs).padStart(2, '0')})</span><b>${d.timeBonus.toLocaleString()}</b></div>
        <div><span>Lives bonus</span><b>${d.livesBonus.toLocaleString()}</b></div>
        <div><span>Difficulty</span><b>×${d.mult}</b></div>
        <div class="total"><span>Level total</span><b>+${d.total.toLocaleString()}</b></div>
        <div class="total"><span>Score</span><b>${d.score.toLocaleString()}</b></div>`;
      $('lcBest').hidden = !d.best.isNew;
      setTimeout(() => this.showScreen('scrLevel'), 500);
    }

    showGameOver(d) {
      $('goScore').textContent = d.score.toLocaleString();
      $('goStats').innerHTML = `
        <div><span>Reached level</span><b>${d.level}</b></div>
        <div><span>Carrots eaten</span><b>${d.carrots.toLocaleString()}</b></div>
        <div><span>Big Mouth bounced</span><b>${d.bounces}</b></div>
        <div><span>Best score</span><b>${d.best.value.toLocaleString()}</b></div>`;
      $('goBest').hidden = !d.best.isNew;
      setTimeout(() => this.showScreen('scrOver'), 400);
    }
  }

  RT.UI = UI;
})();
