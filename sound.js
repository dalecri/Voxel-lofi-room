// Lofi Rooms: sound. A little generative lofi band (warm keys, soft drums, a
// bassline and vinyl crackle), room ambience (rain, fire, purring) and the
// small clicks and chimes of the interface. Everything is synthesized with the
// Web Audio API, so there are no audio files. Exposes window.LofiSound.

(function () {
  let BEAT = 60 / 74;   // set by the mood
  // ii–V–I–vi style loops, voiced as 7ths and 9ths (frequencies in Hz)
  const n = m => 440 * Math.pow(2, (m - 69) / 12);
  const PROGS = [
    [[50, 53, 57, 60, 64], [55, 59, 62, 65, 69], [48, 52, 55, 59, 62], [45, 48, 52, 55, 59]],   // Dm9 G13 Cmaj9 Am9
    [[53, 57, 60, 64, 67], [52, 55, 59, 62, 66], [50, 53, 57, 60, 64], [48, 52, 55, 59, 62]],   // Fmaj9 Em9 Dm9 Cmaj9
    [[49, 53, 56, 60, 63], [51, 54, 58, 61, 65], [46, 49, 53, 56, 60], [44, 48, 51, 55, 58]],   // Dbmaj9 Ebm9 Bbm9 Abmaj9
    [[52, 55, 59, 62, 66], [57, 60, 64, 67, 71], [50, 53, 57, 60, 64], [55, 59, 62, 65, 69]],   // Em9 Am9 Dm9 G13, a slow jazz turnaround
    [[48, 52, 55, 59, 62], [53, 57, 60, 64, 67], [45, 48, 52, 55, 59], [53, 57, 60, 64, 69]],   // Cmaj9 Fmaj9 Am9 F6/9, bright and open
  ];
  const DRUMS = {        // 16 steps: kick, snare, hat
    k: [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0],
    s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    h: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1],
  };
  // moods the jukebox and records switch between: tempo, chords, groove and tone
  const MOODS = [
    { name: 'Late night lofi', bpm: 74, progs: [0, 1, 2], drums: DRUMS, tape: 2600, bells: 0.35, up: 0 },
    { name: 'Rainy day jazz', bpm: 66, progs: [1, 3], tape: 2000, bells: 0.5, up: -3, drums: {
      k: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0], s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1], h: [1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1] } },
    { name: 'Sunny morning', bpm: 84, progs: [4, 1], tape: 3600, bells: 0.5, up: 2, drums: {
      k: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0], s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], h: [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1] } },
    { name: 'Chillhop bounce', bpm: 88, progs: [0, 2], tape: 3000, bells: 0.25, up: 0, drums: {
      k: [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0], s: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], h: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0] } },
    { name: 'Morning bossa', bpm: 80, progs: [4, 1], tape: 3200, bells: 0.45, up: 0, drums: {
      k: [1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1], s: [0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0], h: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1] } },
    { name: 'Dreamy ambient', bpm: 60, progs: [3, 4], tape: 1600, bells: 0.7, up: -5, drums: {
      k: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], s: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], h: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0] } },
  ];

  const S = {
    on: true, ctx: null, music: false, night: 0, crackleOn: true, mood: 0, moods: MOODS,
    init() {
      if (this.ctx || !this.on) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 3;
      this.master = ctx.createGain(); this.master.gain.value = 0.85;
      this.master.connect(comp); comp.connect(ctx.destination);

      // noise for drums, crackle and ambience
      const len = ctx.sampleRate * 2, nb = ctx.createBuffer(1, len, ctx.sampleRate), d = nb.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.03 * w) / 1.03; d[i] = i % 2 ? w * 0.6 : last * 3; }
      this.noise = nb;

      // the band plays through a warm low-pass "tape"
      this.tape = ctx.createBiquadFilter(); this.tape.type = 'lowpass'; this.tape.frequency.value = 2600; this.tape.Q.value = 0.4;
      this.band = ctx.createGain(); this.band.gain.value = 0;
      this.tape.connect(this.band); this.band.connect(this.master);
      // a slow wobble on the keys, like a worn cassette
      this.wob = ctx.createOscillator(); this.wob.frequency.value = 0.35;
      this.wobAmt = ctx.createGain(); this.wobAmt.gain.value = 4;
      this.wob.connect(this.wobAmt); this.wob.start();

      // vinyl crackle: a few soft, warm pops over a whisper of hiss (kept well under the music)
      const cb = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate), cd = cb.getChannelData(0);
      for (let i = 0; i < cd.length; i++) cd[i] = (Math.random() < 0.00012 ? (Math.random() * 2 - 1) * 0.4 : 0) + (Math.random() * 2 - 1) * 0.003;
      const cs = ctx.createBufferSource(); cs.buffer = cb; cs.loop = true;
      const cf = ctx.createBiquadFilter(); cf.type = 'lowpass'; cf.frequency.value = 2000; cf.Q.value = 0.3;
      this.crackle = ctx.createGain(); this.crackle.gain.value = 0;
      cs.connect(cf); cf.connect(this.crackle); this.crackle.connect(this.master); cs.start();

      const bed = (type, freq, q) => {
        const src = ctx.createBufferSource(); src.buffer = nb; src.loop = true;
        const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
        const g = ctx.createGain(); g.gain.value = 0;
        src.connect(f); f.connect(g); g.connect(this.master); src.start(0, Math.random() * 2);
        return { g, f };
      };
      this.rainBed = bed('highpass', 1400, 0.3);
      this.rainLow = bed('lowpass', 500, 0.5);
      this.fireBed = bed('lowpass', 380, 0.7);
      this.purrBed = bed('lowpass', 160, 2);
      this.purrLfo = ctx.createOscillator(); this.purrLfo.frequency.value = 24;
      const pl = ctx.createGain(); pl.gain.value = 0;
      this.purrLfo.connect(pl); pl.connect(this.purrBed.g.gain); this.purrLfo.start();
      this.purrDepth = pl;

      this.prog = 0; this.bar = 0; this.step = 0; this.nextStep = ctx.currentTime + 0.1; this.beats = [];
      this.timer = setInterval(() => this.schedule(), 90);
    },
    toggle() {
      this.on = !this.on;
      if (this.on) { this.init(); this.ctx && this.ctx.resume(); } else if (this.ctx) this.ctx.suspend();
    },
    ready() { return this.on && this.ctx && this.ctx.state === 'running'; },

    // ---- the band ----
    setMusic(on) {
      this.music = on;
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      this.band.gain.cancelScheduledValues(t);
      this.band.gain.setTargetAtTime(on ? 0.9 : 0, t, on ? 0.6 : 0.4);
      this.crackle.gain.setTargetAtTime(on && this.crackleOn ? 0.2 : 0, t, 0.5);
      if (on) { this.nextStep = Math.max(this.nextStep, t + 0.05); this.needle(); }
    },
    // where we are in the current beat, 0 just on it to 1 just before the next; -1 when the band is quiet
    beat() {
      if (!this.music || !this.ready() || !this.beats) return -1;
      const now = this.ctx.currentTime;
      let b = -1; for (const x of this.beats) if (x <= now && x > b) b = x;
      return b < 0 ? -1 : Math.min(1, (now - b) / BEAT);
    },
    // switch to a mood (or the next one); the band picks it up on the next bar
    setMood(i) {
      this.mood = ((i == null ? this.mood + 1 : i) % MOODS.length + MOODS.length) % MOODS.length;
      const M = MOODS[this.mood];
      BEAT = 60 / M.bpm;
      this.prog = 0;
      if (this.ctx) this.tape.frequency.setTargetAtTime(M.tape, this.ctx.currentTime, 0.8);
      return M.name;
    },
    schedule() {
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running') return;
      const sixteenth = BEAT / 4;
      while (this.nextStep < ctx.currentTime + 0.3) {
        if (this.music) this.playStep(this.step, this.nextStep);
        // lazy swing: the off 16ths come a touch late
        if (this.step % 4 === 0) { this.beats.push(this.nextStep); if (this.beats.length > 8) this.beats.shift(); }
        this.nextStep += sixteenth * (this.step % 2 ? 0.84 : 1.16);
        this.step = (this.step + 1) % 16;
        if (this.step === 0) {
          this.bar++;
          if (this.bar % 16 === 0) this.prog = (this.prog + 1) % MOODS[this.mood].progs.length;
        }
      }
    },
    playStep(st, t) {
      const M = MOODS[this.mood], D = M.drums;
      const ctx = this.ctx, chord = PROGS[M.progs[this.prog % M.progs.length]][this.bar % 4].map(m => m + M.up);
      const hum = () => (Math.random() - 0.5) * 0.012;
      if (st === 0) this.keys(chord, t + 0.02);
      if (st === 10 && Math.random() < 0.55) this.keys(chord.slice(1, 4).map(m => m + 12), t + 0.01, 0.5);
      if (st === 0 || st === 8 || (st === 14 && Math.random() < 0.4)) this.bass(chord[0] - 12 - (chord[0] > 52 ? 12 : 0) + (st === 14 ? 7 : 0), t);
      if (D.k[st]) this.kick(t + hum());
      if (D.s[st]) this.snare(t + hum() + 0.01);
      if (D.h[st] && Math.random() < 0.92) this.hat(t + hum(), st % 4 === 2 ? 0.05 : 0.03);
      // a sparse lazy melody from the chord's top notes
      if ((st === 6 || st === 12 || st === 3) && Math.random() < M.bells) {
        const m = chord[2 + ((Math.random() * 3) | 0)] + 12 + (Math.random() < 0.3 ? 2 : 0);
        this.bell(n(m), t + 0.02);
      }
    },
    keys(chord, t, vel) {
      const ctx = this.ctx, v = vel || 1;
      chord.forEach((m, k) => {
        const f = n(m + (this.night > 0.5 ? -2 : 0)), t0 = t + k * 0.022;
        [['sine', 0, 0.05], ['triangle', 7, 0.02]].forEach(([type, det, vol]) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = type; o.frequency.value = f; o.detune.value = det;
          this.wobAmt.connect(o.detune);
          g.gain.setValueAtTime(0, t0);
          g.gain.linearRampToValueAtTime(vol * v, t0 + 0.02);
          g.gain.exponentialRampToValueAtTime(vol * v * 0.35, t0 + 0.8);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + BEAT * 4.2);
          o.connect(g); g.connect(this.tape);
          o.onended = () => { try { this.wobAmt.disconnect(o.detune); } catch (e) { /* already gone */ } };
          o.start(t0); o.stop(t0 + BEAT * 4.3);
        });
      });
    },
    bass(m, t) {
      const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = n(m + (this.night > 0.5 ? -2 : 0));
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.2, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + BEAT * 1.8);
      o.connect(g); g.connect(this.tape); o.start(t); o.stop(t + BEAT * 2);
    },
    bell(f, t) {
      const ctx = this.ctx;
      [[1, 0.035], [2.01, 0.008]].forEach(([mul, vol]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f * mul;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
        o.connect(g); g.connect(this.tape); o.start(t); o.stop(t + 1.7);
      });
    },
    kick(t) {
      const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
      o.connect(g); g.connect(this.tape); o.start(t); o.stop(t + 0.35);
    },
    snare(t) {
      const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = 0.7;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.22, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      s.connect(f); f.connect(g); g.connect(this.tape); s.start(t, Math.random()); s.stop(t + 0.22);
      const o = ctx.createOscillator(), og = ctx.createGain();
      o.frequency.value = 190; og.gain.setValueAtTime(0.08, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      o.connect(og); og.connect(this.tape); o.start(t); o.stop(t + 0.12);
    },
    hat(t, vol) {
      const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      s.connect(f); f.connect(g); g.connect(this.tape); s.start(t, Math.random()); s.stop(t + 0.06);
    },

    // ---- ambience ----
    ambience(rain, fire, night) {
      if (!this.ready()) return;
      const t = this.ctx.currentTime;
      this.night = night;
      this.rainBed.g.gain.setTargetAtTime(rain ? 0.05 : 0, t, 1.2);
      this.rainLow.g.gain.setTargetAtTime(rain ? 0.12 : 0, t, 1.2);
      this.fireBed.g.gain.setTargetAtTime(fire ? 0.06 : 0, t, 0.8);
      if (fire && Math.random() < 0.05) this.burst(0.03, 0.14, 'highpass', 2500);       // a pop from the logs
      if (rain && Math.random() < 0.08) this.burst(0.02, 0.05, 'bandpass', 4000 + Math.random() * 2000);   // a drop on the glass
      const tone = MOODS[this.mood].tape;
      this.tape.frequency.setTargetAtTime(night > 0.5 ? Math.min(tone, 1700) : tone, t, 2);
    },
    purr(on) {
      if (!this.ready()) return;
      const t = this.ctx.currentTime;
      this.purrBed.g.gain.setTargetAtTime(on ? 0.22 : 0, t, on ? 0.15 : 0.5);
      this.purrDepth.gain.setTargetAtTime(on ? 0.2 : 0, t, 0.2);
    },

    // ---- interface sounds ----
    tone(freq, t0, dur, vol, type, attack) {
      const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + (attack || 0.006));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + dur + 0.05);
      return o;
    },
    burst(dur, vol, type, freq) {
      const ctx = this.ctx, t0 = ctx.currentTime;
      const s = ctx.createBufferSource(); s.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(f); f.connect(g); g.connect(this.master);
      s.start(t0, Math.random()); s.stop(t0 + dur + 0.05);
    },
    place() {     // a soft wooden knock
      if (!this.ready()) return;
      const t = this.ctx.currentTime, o = this.tone(260 + Math.random() * 60, t, 0.12, 0.18, 'triangle');
      o.frequency.exponentialRampToValueAtTime(140, t + 0.1);
      this.burst(0.05, 0.08, 'bandpass', 1200);
    },
    lift() { if (!this.ready()) return; const t = this.ctx.currentTime, o = this.tone(300, t, 0.14, 0.08, 'sine'); o.frequency.exponentialRampToValueAtTime(620, t + 0.12); },
    poof() { if (!this.ready()) return; this.burst(0.25, 0.18, 'lowpass', 900); const t = this.ctx.currentTime, o = this.tone(500, t, 0.18, 0.06); o.frequency.exponentialRampToValueAtTime(160, t + 0.16); },
    click(on) { if (!this.ready()) return; const t = this.ctx.currentTime; this.tone(on ? 1800 : 1300, t, 0.03, 0.08, 'square'); this.tone(on ? 900 : 700, t + 0.03, 0.05, 0.05, 'triangle'); },
    nope() { if (!this.ready()) return; const t = this.ctx.currentTime; this.tone(220, t, 0.12, 0.08, 'triangle'); this.tone(180, t + 0.1, 0.14, 0.08, 'triangle'); },
    turn() { if (!this.ready()) return; const t = this.ctx.currentTime; this.tone(520, t, 0.08, 0.06, 'triangle'); this.tone(700, t + 0.05, 0.08, 0.05, 'triangle'); },
    paint() { if (!this.ready()) return; this.burst(0.12, 0.08, 'bandpass', 2400); const t = this.ctx.currentTime; this.tone(880, t + 0.04, 0.3, 0.04); },
    sip() { if (!this.ready()) return; const t = this.ctx.currentTime; for (let k = 0; k < 3; k++) { const o = this.tone(500 + k * 80, t + k * 0.09, 0.07, 0.05); o.frequency.exponentialRampToValueAtTime(900, t + k * 0.09 + 0.06); } },
    water() { if (!this.ready()) return; const t = this.ctx.currentTime; for (let k = 0; k < 5; k++) { const f = 1200 + Math.random() * 1400; const o = this.tone(f, t + k * 0.06, 0.08, 0.035); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + k * 0.06 + 0.05); } },
    needle() { if (!this.ready() || !this.crackleOn) return; this.burst(0.06, 0.06, 'lowpass', 1800); },
    setCrackle(on) { this.crackleOn = on; if (this.ctx) this.crackle.gain.setTargetAtTime(on && this.music ? 0.2 : 0, this.ctx.currentTime, 0.3); },
    piano() {
      if (!this.ready()) return;
      const t = this.ctx.currentTime, chord = PROGS[this.prog][this.bar % 4];
      [0, 1, 2, 3, 4, 3, 2].forEach((k, i) => this.tone(n(chord[k] + 12), t + i * 0.13, 1.4, 0.07, 'triangle'));
    },
    meow() {
      if (!this.ready()) return;
      const t = this.ctx.currentTime, o = this.tone(620, t, 0.45, 0.06, 'sawtooth', 0.05);
      const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 2;
      o.disconnect(); const g = this.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.connect(f); f.connect(g); g.connect(this.master);
      o.frequency.setValueAtTime(560, t); o.frequency.linearRampToValueAtTime(820, t + 0.12); o.frequency.exponentialRampToValueAtTime(480, t + 0.42);
    },
    chime() { if (!this.ready()) return; const t = this.ctx.currentTime; [784, 1174.7, 1568].forEach((f, k) => this.tone(f, t + k * 0.12, 1.4, 0.05)); },
    arpeggio() { if (!this.ready()) return; const t = this.ctx.currentTime; [523.3, 659.3, 784, 987.8, 1174.7].forEach((f, k) => this.tone(f, t + k * 0.08, 0.7, 0.05)); },
    // ---- sounds for the new pieces ----
    static() { if (!this.ready()) return; this.burst(0.25, 0.08, 'bandpass', 3000); },
    boot() { if (!this.ready()) return; const t = this.ctx.currentTime; [523.3, 784, 1046.5].forEach((f, k) => this.tone(f, t + k * 0.09, 0.5, 0.05, 'triangle')); },
    coin() { if (!this.ready()) return; const t = this.ctx.currentTime; this.tone(988, t, 0.08, 0.06, 'square'); this.tone(1319, t + 0.08, 0.35, 0.06, 'square'); },
    chiptune() {
      if (!this.ready()) return;
      const t = this.ctx.currentTime, mel = [659, 784, 1047, 784, 880, 1175, 1047, 784];
      mel.forEach((f, k) => this.tone(f, t + 0.25 + k * 0.11, 0.1, 0.04, 'square'));
    },
    fridge(open) {
      if (!this.ready()) return;
      const t = this.ctx.currentTime;
      if (open) { this.burst(0.12, 0.15, 'lowpass', 600); const o = this.tone(60, t + 0.05, 1.6, 0.06, 'sawtooth'); o.frequency.value = 60; this.tone(1500, t + 0.3, 0.05, 0.03, 'sine'); }
      else { this.burst(0.08, 0.22, 'lowpass', 300); }
    },
    creak() { if (!this.ready()) return; const t = this.ctx.currentTime, o = this.tone(180, t, 0.4, 0.04, 'sawtooth'); o.frequency.linearRampToValueAtTime(260, t + 0.35); this.burst(0.1, 0.08, 'lowpass', 500); },
    whistle() {
      if (!this.ready()) return;
      const t = this.ctx.currentTime, o = this.tone(1700, t + 0.8, 1.8, 0.05, 'sine', 0.5);
      o.frequency.setValueAtTime(1500, t + 0.8); o.frequency.linearRampToValueAtTime(1900, t + 2.4);
      for (let k = 0; k < 8; k++) this.burst(0.2, 0.03 + k * 0.006, 'bandpass', 800 + k * 120);
    },
    gurgle(n) {
      if (!this.ready()) return;
      const t = this.ctx.currentTime;
      for (let k = 0; k < (n || 6); k++) { const f = 140 + Math.random() * 140, o = this.tone(f, t + k * 0.11 + Math.random() * 0.04, 0.09, 0.09); o.frequency.exponentialRampToValueAtTime(f * 2.2, t + k * 0.11 + 0.08); }
    },
    pour() { if (!this.ready()) return; for (let k = 0; k < 6; k++) this.burst(0.18, 0.05, 'bandpass', 1400 + k * 150); this.gurgle(3); },
    hum(up) { if (!this.ready()) return; const t = this.ctx.currentTime, o = this.tone(up ? 90 : 120, t, 1.2, 0.07, 'sawtooth', 0.1); o.frequency.linearRampToValueAtTime(up ? 120 : 90, t + 1.1); },
    whoosh() { if (!this.ready()) return; this.burst(0.5, 0.12, 'bandpass', 900); },
    strum() {
      if (!this.ready()) return;
      const t = this.ctx.currentTime, chord = PROGS[this.prog][this.bar % 4];
      chord.forEach((m, k) => {
        const o = this.tone(n(m), t + k * 0.03, 1.8, 0.05, 'triangle');
        const o2 = this.tone(n(m) * 2.005, t + k * 0.03, 0.8, 0.015, 'sawtooth'); o2.frequency.value = n(m) * 2.005;
      });
    },
    clack(k) {
      if (!this.ready()) return;
      const t = this.ctx.currentTime;
      for (let i = 0; i < (k || 8); i++) { const at = t + i * (0.08 + Math.random() * 0.06); const s = this.ctx.createBufferSource(); s.buffer = this.noise; const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200 + Math.random() * 800; const g = this.ctx.createGain(); g.gain.setValueAtTime(0.18, at); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.03); s.connect(f); f.connect(g); g.connect(this.master); s.start(at, Math.random()); s.stop(at + 0.04); }
      this.tone(2637, t + (k || 8) * 0.11, 0.6, 0.04, 'sine');
    },
    squeak() { if (!this.ready()) return; const t = this.ctx.currentTime, o = this.tone(900, t, 0.18, 0.06, 'sine'); o.frequency.exponentialRampToValueAtTime(1500, t + 0.08); o.frequency.exponentialRampToValueAtTime(1000, t + 0.17); },
    beep() { if (!this.ready()) return; const t = this.ctx.currentTime; this.tone(1200, t, 0.08, 0.05, 'square'); this.tone(1600, t + 0.1, 0.1, 0.05, 'square'); },
    flip() { if (!this.ready()) return; for (let k = 0; k < 3; k++) setTimeout(() => this.burst(0.06, 0.12, 'bandpass', 1800), k * 90); },
    rustle() { if (!this.ready()) return; for (let k = 0; k < 4; k++) setTimeout(() => this.burst(0.15, 0.06, 'highpass', 3000), k * 70); },
    drip() { if (!this.ready()) return; const t = this.ctx.currentTime; for (let k = 0; k < 4; k++) { const o = this.tone(900 + Math.random() * 500, t + k * 0.18, 0.08, 0.05); o.frequency.exponentialRampToValueAtTime(1800, t + k * 0.18 + 0.06); } this.burst(0.6, 0.05, 'bandpass', 2500); },
    bell() { if (!this.ready()) return; const t = this.ctx.currentTime; [0, 0.28].forEach(d => { this.tone(1318.5, t + d, 0.9, 0.06, 'triangle'); this.tone(2637, t + d, 0.5, 0.02, 'sine'); }); },
    puff() { if (!this.ready()) return; this.gurgle(9); this.burst(1, 0.04, 'lowpass', 500); },
    cuckoo() { if (!this.ready()) return; const t = this.ctx.currentTime; [0, 0.42].forEach(d => { this.tone(784, t + d, 0.18, 0.07, 'sine', 0.01); this.tone(622, t + d + 0.2, 0.24, 0.07, 'sine', 0.01); }); },
    tweet() { if (!this.ready()) return; const t = this.ctx.currentTime; for (let k = 0; k < 3; k++) { const o = this.tone(2600 + Math.random() * 600, t + k * 0.11, 0.07, 0.03, 'sine'); o.frequency.exponentialRampToValueAtTime(3600, t + k * 0.11 + 0.06); } },
    crunch() { if (!this.ready()) return; for (let k = 0; k < 4; k++) setTimeout(() => this.burst(0.05, 0.08, 'bandpass', 2200 + Math.random() * 1500), k * 110); },
    plop() { if (!this.ready()) return; const t = this.ctx.currentTime; for (let k = 0; k < 4; k++) { const o = this.tone(500 + Math.random() * 300, t + k * 0.13, 0.09, 0.05, 'sine'); o.frequency.exponentialRampToValueAtTime(1400, t + k * 0.13 + 0.08); } },
    clatter() { if (!this.ready()) return; this.burst(0.08, 0.2, 'bandpass', 2600); setTimeout(() => this.burst(0.06, 0.12, 'bandpass', 1900), 90); setTimeout(() => this.burst(0.05, 0.08, 'bandpass', 3200), 200); },
    tick() { if (!this.ready()) return; const t = this.ctx.currentTime; this.tone(1600, t, 0.02, 0.04, 'square'); this.burst(0.15, 0.03, 'lowpass', 600); },
    snap() { if (!this.ready()) return; this.burst(0.06, 0.25, 'highpass', 3000); const t = this.ctx.currentTime; this.tone(1500, t + 0.05, 0.08, 0.04, 'square'); },
  };

  window.LofiSound = S;
})();
