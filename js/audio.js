/* Rabbittor — synthesized sound effects and music (no audio files needed). */
(function () {
  const RT = window.RT;

  class Sound {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.sfxOn = load('rt_sfx', true);
      this.musicOn = load('rt_music', true);
      this.munchFlip = false;
      this.musicTimer = null;
      this.musicStep = 0;
      this.musicTempo = 1;
    }

    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.5;
        this.master.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    tone(freq, dur, opts = {}) {
      if (!this.ctx || (!this.sfxOn && !opts.music)) return;
      const t0 = this.ctx.currentTime + (opts.delay || 0);
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = opts.type || 'square';
      osc.frequency.setValueAtTime(freq, t0);
      if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t0 + dur);
      const vol = opts.vol == null ? 0.15 : opts.vol;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g); g.connect(this.master);
      osc.start(t0); osc.stop(t0 + dur + 0.02);
    }

    noise(dur, vol = 0.2, delay = 0, hp = 800) {
      if (!this.ctx || !this.sfxOn) return;
      const t0 = this.ctx.currentTime + delay;
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = hp;
      const g = this.ctx.createGain();
      g.gain.value = vol;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t0);
    }

    munch() {
      this.munchFlip = !this.munchFlip;
      this.tone(this.munchFlip ? 620 : 520, 0.06, { type: 'square', vol: 0.06, slide: this.munchFlip ? 760 : 430 });
    }
    golden() { [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.12, { type: 'triangle', vol: 0.12, delay: i * 0.06 })); }
    charge() { [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.14, { type: 'square', vol: 0.08, delay: i * 0.07 })); }
    invis() { this.tone(300, 0.5, { type: 'sine', vol: 0.18, slide: 1400 }); this.tone(450, 0.5, { type: 'triangle', vol: 0.06, slide: 1800, delay: 0.05 }); }
    invisEnd() { this.tone(1200, 0.35, { type: 'sine', vol: 0.12, slide: 300 }); }
    fighter() { this.tone(110, 0.25, { type: 'sawtooth', vol: 0.18, slide: 220 }); this.noise(0.15, 0.15); this.tone(440, 0.2, { type: 'square', vol: 0.08, delay: 0.12, slide: 880 }); }
    bounce() { this.tone(180, 0.45, { type: 'sine', vol: 0.3, slide: 900 }); this.noise(0.2, 0.25, 0, 400); }
    deny() { this.tone(160, 0.15, { type: 'square', vol: 0.08 }); this.tone(120, 0.18, { type: 'square', vol: 0.08, delay: 0.09 }); }
    caught() {
      this.tone(520, 0.9, { type: 'sawtooth', vol: 0.16, slide: 60 });
      this.noise(0.3, 0.2, 0.05, 200);
    }
    growl() { this.tone(70, 0.9, { type: 'sawtooth', vol: 0.18, slide: 55 }); this.tone(74, 0.9, { type: 'sawtooth', vol: 0.12, slide: 50 }); }
    arrive() {
      this.tone(90, 0.6, { type: 'sawtooth', vol: 0.22, slide: 180 });
      this.tone(60, 1.0, { type: 'square', vol: 0.1, delay: 0.1, slide: 45 });
      this.noise(0.4, 0.15, 0, 300);
    }
    tick() { this.tone(880, 0.08, { type: 'square', vol: 0.08 }); }
    go() { this.tone(1320, 0.25, { type: 'square', vol: 0.1 }); this.noise(0.2, 0.08, 0, 3000); }
    door() { [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', vol: 0.14, delay: i * 0.09 })); }
    win() { [659, 784, 988, 1319, 988, 1319, 1568].forEach((f, i) => this.tone(f, 0.22, { type: 'square', vol: 0.09, delay: i * 0.1 })); }
    lose() { [392, 349, 311, 262, 196].forEach((f, i) => this.tone(f, 0.35, { type: 'triangle', vol: 0.14, delay: i * 0.18 })); }
    heart(intensity) { this.tone(65, 0.12, { type: 'sine', vol: 0.18 * intensity }); this.tone(55, 0.12, { type: 'sine', vol: 0.14 * intensity, delay: 0.14 }); }
    click() { this.tone(700, 0.04, { type: 'square', vol: 0.05 }); }

    // Tiny looping chiptune
    startMusic() {
      this.stopMusic();
      if (!this.ctx || !this.musicOn) return;
      const bass = [131, 0, 131, 165, 175, 0, 175, 165, 147, 0, 147, 175, 196, 0, 196, 175];
      const lead = [523, 0, 659, 0, 784, 659, 0, 523, 587, 0, 698, 0, 784, 0, 659, 0];
      const loop = () => {
        const i = this.musicStep++ % 16;
        const bar = Math.floor(this.musicStep / 16) % 4;
        if (bass[i]) this.tone(bass[i] * (bar === 2 ? 1.122 : 1), 0.16, { type: 'triangle', vol: 0.07, music: true });
        if (lead[i] && bar % 2 === 1) this.tone(lead[i], 0.1, { type: 'square', vol: 0.025, music: true });
        if (i % 4 === 0) this.noiseHat();
        this.musicTimer = setTimeout(loop, 150 / this.musicTempo);
      };
      loop();
    }
    noiseHat() {
      if (!this.ctx || !this.musicOn) return;
      const was = this.sfxOn; this.sfxOn = true;
      this.noise(0.03, 0.025, 0, 6000);
      this.sfxOn = was;
    }
    stopMusic() { if (this.musicTimer) clearTimeout(this.musicTimer); this.musicTimer = null; }

    setSfx(on) { this.sfxOn = on; save('rt_sfx', on); }
    setMusic(on) { this.musicOn = on; save('rt_music', on); }
  }

  function load(k, def) {
    try { const v = localStorage.getItem(k); return v == null ? def : v === '1'; } catch (e) { return def; }
  }
  function save(k, v) {
    try { localStorage.setItem(k, v ? '1' : '0'); } catch (e) { /* storage unavailable */ }
  }

  RT.Sound = Sound;
})();
