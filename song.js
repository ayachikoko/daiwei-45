/* 《很努力的人》—— 为代伟的四十五岁生日而写
   纯 Web Audio 合成：钢琴、弦垫、低音，无外部音频文件 */
(function () {
  'use strict';

  /* ---------- 乐谱 ---------- */
  var BPM = 72, SPB = 60 / BPM, BAR = 4 * SPB;

  var CH = {
    C:  { pad: [48, 55, 64], bass: 36, arp: [48, 55, 64, 67] },
    G:  { pad: [43, 50, 59], bass: 31, arp: [43, 50, 55, 59] },
    Am: { pad: [45, 52, 60], bass: 33, arp: [45, 52, 57, 60] },
    Em: { pad: [40, 47, 55], bass: 28, arp: [40, 47, 52, 55] },
    F:  { pad: [41, 48, 57], bass: 29, arp: [41, 48, 53, 57] },
    Dm: { pad: [38, 45, 53], bass: 26, arp: [38, 45, 50, 53] }
  };

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  var P   = ['C', 'G', 'Am', 'Em', 'F', 'C', 'Dm', 'G'];
  var Pch = ['F', 'G', 'Em', 'C', 'F', 'G', 'Am', 'G'];

  /* 旋律： [拍, midi, 时值(拍)] */
  var melIntro = [[0, 72, 2], [4, 69, 2], [8, 67, 3]];

  var melVerse = [
    [0, 64, 1.5], [1.5, 67, 0.5], [2, 69, 2],
    [4, 67, 1], [5, 64, 1], [6, 62, 2],
    [8, 64, 1.5], [9.5, 69, 0.5], [10, 72, 2],
    [12, 71, 1], [13, 69, 1], [14, 64, 2],
    [16, 65, 1.5], [17.5, 69, 0.5], [18, 72, 2],
    [20, 71, 1], [21, 72, 1], [22, 69, 2],
    [24, 67, 1.5], [25.5, 69, 0.5], [26, 74, 2],
    [28, 72, 2], [30, 67, 2]
  ];

  var melChorus = [
    [0, 67, 1], [1, 69, 1], [2, 72, 2],
    [4, 74, 1.5], [5.5, 72, 0.5], [6, 69, 2],
    [8, 67, 1], [9, 69, 1], [10, 72, 2],
    [12, 74, 2], [14, 76, 2],
    [16, 74, 1.5], [17.5, 72, 0.5], [18, 69, 2],
    [20, 72, 1], [21, 74, 1], [22, 76, 2],
    [24, 74, 2], [26, 72, 1], [27, 69, 1],
    [28, 67, 3]
  ];

  var melBridge = [
    [0, 69, 1], [1, 72, 1], [2, 76, 2],
    [4, 74, 1], [5, 72, 1], [6, 69, 2],
    [8, 72, 1.5], [9.5, 74, 0.5], [10, 76, 2],
    [12, 74, 2], [14, 71, 2]
  ];

  var melOutro = [[0, 72, 2], [2, 69, 1], [3, 69, 1], [4, 67, 3.5]];

  var SECTIONS = [
    { bars: 4, chords: ['C', 'G', 'Am', 'G'], melody: melIntro, lines: null },
    { bars: 8, chords: P, melody: melVerse, lines: [
      '天还没亮，你就出了门',
      '楼道那盏灯，还留着你走过的余温',
      '一年一年，鞋底磨得越来越薄',
      '你把所有辛苦，说成一句“没什么”'
    ]},
    { bars: 8, chords: P, melody: melVerse, lines: [
      '我长大以后，才读懂你的沉默',
      '那些没说出口的话，都在饭碗里多了一点',
      '你总把最好的，悄悄推到我面前',
      '然后笑着说，我不太爱吃这些'
    ]},
    { bars: 8, chords: Pch, melody: melChorus, lines: [
      '四十五岁，你还是很努力的人',
      '把平凡的日子，过成家里最稳的灯',
      '不需要谁记得你的名字',
      '在我心里，你一直是英雄'
    ]},
    { bars: 4, chords: ['Am', 'F', 'C', 'G'], melody: melBridge, lines: [
      '你给我的，从来不是很多钱',
      '是一个从不缺席的明天',
      '是你站在那里，什么都不说',
      '我就知道，家还在'
    ]},
    { bars: 8, chords: Pch, melody: melChorus, lines: [
      '四十五岁，愿风对你温柔一点',
      '愿你的肩膀，也能靠一靠、歇一歇',
      '往后的路，换我替你分担一些',
      '爸，生日快乐——我爱你'
    ]},
    { bars: 4, chords: ['F', 'C', 'G', 'C'], melody: melOutro, lines: ['—— 写给我的爸爸，代伟'] }
  ];

  /* ---------- 生成事件表与歌词时间轴 ---------- */
  var events = [], lyrics = [], totalBars = 0;

  SECTIONS.forEach(function (sec) {
    var start = totalBars;
    sec.chords.forEach(function (name, i) {
      var ch = CH[name], t = (start + i) * BAR;

      events.push({ t: t, kind: 'pad', chord: ch.pad, dur: BAR });
      events.push({ t: t, kind: 'bass', midi: ch.bass, dur: SPB * 1.9, vel: 0.5 });
      events.push({ t: t + SPB * 2, kind: 'bass', midi: ch.bass, dur: SPB * 1.9, vel: 0.36 });

      var order = [0, 1, 2, 3, 1, 2, 3, 2];
      order.forEach(function (idx, k) {
        events.push({
          t: t + k * (SPB / 2),
          kind: 'piano',
          midi: ch.arp[idx],
          dur: SPB * 1.1,
          vel: k % 2 === 0 ? 0.17 : 0.12
        });
      });
    });

    if (sec.melody) {
      sec.melody.forEach(function (n) {
        events.push({ t: start * BAR + n[0] * SPB, kind: 'piano', midi: n[1], dur: n[2] * SPB, vel: 0.62 });
      });
    }

    if (sec.lines) {
      var per = sec.bars / sec.lines.length;
      sec.lines.forEach(function (text, i) {
        lyrics.push({ t: (start + i * per) * BAR, text: text });
      });
    }
    totalBars += sec.bars;
  });

  events.sort(function (a, b) { return a.t - b.t; });
  lyrics.sort(function (a, b) { return a.t - b.t; });

  var DURATION = totalBars * BAR;
  var END = DURATION;

  /* ---------- 音频引擎 ---------- */
  var ctx = null, master, dry, wet, convolver;
  var started = false, startTime = 0, pointer = 0, timer = null, raf = null;
  var ended = false;
  var VOL = 0.36;

  function makeIR(seconds, decay) {
    var rate = ctx.sampleRate, len = Math.floor(rate * seconds);
    var buf = ctx.createBuffer(2, len, rate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  function ensureAudio() {
    if (ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();

    master = ctx.createGain();
    master.gain.value = 0;

    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 22;
    comp.ratio.value = 2.4;
    comp.attack.value = 0.01;
    comp.release.value = 0.35;

    master.connect(comp);
    comp.connect(ctx.destination);

    dry = ctx.createGain(); dry.gain.value = 0.86; dry.connect(master);
    wet = ctx.createGain(); wet.gain.value = 0.34;
    convolver = ctx.createConvolver();
    convolver.buffer = makeIR(2.8, 2.6);
    wet.connect(convolver); convolver.connect(master);
  }

  function piano(t, midi, dur, vel) {
    var f = mtof(midi);
    var g = ctx.createGain();
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = Math.min(5200, f * 8 + 900);
    lp.Q.value = 0.4;
    g.connect(lp); lp.connect(dry); lp.connect(wet);

    var peak = Math.max(0.0002, vel * 0.2);
    var end = t + Math.max(dur * 1.15, dur + 0.55);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(peak * 0.42, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, end);

    var partials = [[1, 1], [2, 0.33], [3, 0.12], [4, 0.045]];
    partials.forEach(function (p) {
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * p[0];
      o.detune.value = (Math.random() * 5 - 2.5);
      var og = ctx.createGain();
      og.gain.value = p[1];
      o.connect(og); og.connect(g);
      o.start(t); o.stop(end + 0.15);
    });
  }

  function pad(t, chord, dur) {
    var g = ctx.createGain();
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 950; lp.Q.value = 0.3;
    g.connect(lp); lp.connect(dry); lp.connect(wet);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.045, t + 1.5);
    g.gain.setValueAtTime(0.045, t + dur - 0.7);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 1.1);

    chord.forEach(function (m, i) {
      var o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = mtof(m);
      o.detune.value = i % 2 ? 5 : -5;
      o.connect(g);
      o.start(t); o.stop(t + dur + 1.3);
    });
  }

  function bass(t, midi, dur, vel) {
    var f = mtof(midi);
    var g = ctx.createGain();
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 320;
    g.connect(lp); lp.connect(dry);

    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vel * 0.3, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 1.4);

    [[1, 1], [2, 0.25]].forEach(function (p) {
      var o = ctx.createOscillator();
      o.type = p[0] === 1 ? 'sine' : 'triangle';
      o.frequency.value = f * p[0];
      var og = ctx.createGain(); og.gain.value = p[1];
      o.connect(og); og.connect(g);
      o.start(t); o.stop(t + dur * 1.6);
    });
  }

  function playEvent(e, at) {
    if (e.kind === 'piano') piano(at, e.midi, e.dur, e.vel);
    else if (e.kind === 'bass') bass(at, e.midi, e.dur, e.vel);
    else if (e.kind === 'pad') pad(at, e.chord, e.dur);
  }

  function songTime() {
    if (!started) return 0;
    return Math.max(0, ctx.currentTime - startTime);
  }

  function scheduleAhead() {
    if (!started || !ctx || ctx.state !== 'running') return;
    var horizon = songTime() + 1.6;
    while (pointer < events.length && events[pointer].t < horizon) {
      playEvent(events[pointer], startTime + events[pointer].t);
      pointer++;
    }
  }

  /* ---------- 界面 ---------- */
  var veil = document.getElementById('veil');
  var startBtn = document.getElementById('startBtn');
  var playBtn = document.getElementById('playBtn');
  var dockBtn = document.getElementById('dockBtn');
  var barEl = document.getElementById('songBar');
  var timeEl = document.getElementById('songTime');
  var topEl = document.querySelector('#topline i');
  var nowEl = document.getElementById('lyricNow');
  var prevEl = document.getElementById('lyricPrev');
  var nextEl = document.getElementById('lyricNext');
  var lastLyric = null;

  function fmt(s) {
    s = Math.max(0, Math.floor(s));
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }

  function setLyric(i, animate) {
    if (i === lastLyric) return;
    lastLyric = i;
    var cur = lyrics[i] ? lyrics[i].text : '';
    var prev = i > 0 ? lyrics[i - 1].text : '';
    var next = lyrics[i + 1] ? lyrics[i + 1].text : '';
    if (i < 0) { cur = '正在为你播放…'; prev = ''; next = lyrics[0] ? lyrics[0].text : ''; }
    prevEl.textContent = prev;
    nextEl.textContent = next;
    nowEl.classList.remove('tick');
    nowEl.textContent = cur;
    if (animate) { void nowEl.offsetWidth; nowEl.classList.add('tick'); }
  }

  function updateUI() {
    var t = songTime();
    var pct = Math.min(1, t / DURATION);
    if (barEl) barEl.style.width = (pct * 100).toFixed(2) + '%';
    if (topEl) topEl.style.width = (pct * 100).toFixed(2) + '%';
    if (timeEl) timeEl.textContent = fmt(t) + ' / ' + fmt(DURATION);

    var idx = -1;
    for (var i = 0; i < lyrics.length; i++) {
      if (t + 0.15 >= lyrics[i].t) idx = i; else break;
    }
    setLyric(idx, idx >= 0);

    if (started && t >= END) finish();
  }

  function loop() {
    updateUI();
    raf = requestAnimationFrame(loop);
  }

  function finish() {
    if (!started) return;
    started = false;
    ended = true;
    try { ctx.suspend(); } catch (e) {}
    document.body.classList.remove('playing');
    nowEl.textContent = '全曲完 · 谢谢你来听';
    prevEl.textContent = '—— 写给我的爸爸，代伟';
    nextEl.textContent = '想再听一次，就点播放';
    if (raf) { cancelAnimationFrame(raf); raf = null; }
    if (timer) { clearInterval(timer); timer = null; }
  }

  function begin() {
    if (started) return;
    ensureAudio();
    if (!ctx) return;

    var go = function () {
      if (started) return;
      started = true;
      ended = false;
      pointer = 0;
      lastLyric = null;
      startTime = ctx.currentTime + 0.25;

      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.gain.linearRampToValueAtTime(VOL, startTime + 1.6);
      master.gain.setValueAtTime(VOL, startTime + END - 3.6);
      master.gain.linearRampToValueAtTime(0.0001, startTime + END - 0.2);

      document.body.classList.add('playing');
      document.body.classList.add('music-on');
      veil.classList.add('hide');
      document.body.classList.remove('locked');
      setLyric(-1, false);

      scheduleAhead();
      timer = setInterval(scheduleAhead, 140);
      loop();
    };

    if (ctx.state === 'running') { go(); return; }
    ctx.resume().then(function () {
      if (ctx.state === 'running') go();
    }).catch(function () {});
  }

  function togglePlay() {
    if (ended) { ended = false; begin(); return; }
    if (!started) { begin(); return; }
    if (ctx.state === 'running') {
      ctx.suspend();
      document.body.classList.remove('playing');
      if (timer) { clearInterval(timer); timer = null; }
    } else {
      ctx.resume();
      document.body.classList.add('playing');
      timer = setInterval(scheduleAhead, 140);
    }
  }

  /* 自动尝试播放；被浏览器拦下就等那一次轻触 */
  function tryAutoplay() {
    ensureAudio();
    if (!ctx) return;
    var p = ctx.resume();
    if (!p || !p.then) return;
    p.then(function () {
      setTimeout(function () {
        if (!started && ctx.state === 'running') begin();
      }, 200);
    }).catch(function () {});
  }

  /* ---------- 绑定 ---------- */
  var start = function (e) {
    if (e) e.preventDefault();
    begin();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(function () { if (!started) begin(); });
    }
  };

  startBtn.addEventListener('click', start);
  veil.addEventListener('click', start);
  document.addEventListener('keydown', function (e) {
    if ((e.key === 'Enter' || e.key === ' ') && veil && !veil.classList.contains('hide')) start();
  });
  playBtn.addEventListener('click', togglePlay);
  if (dockBtn) dockBtn.addEventListener('click', togglePlay);

  document.addEventListener('visibilitychange', function () {
    if (!started || !ctx) return;
    if (document.hidden) {
      ctx.suspend();
      document.body.classList.remove('playing');
    } else {
      ctx.resume().then(function () {
        document.body.classList.add('playing');
        if (!timer) timer = setInterval(scheduleAhead, 140);
      }).catch(function () {});
    }
  });

  /* 入场动画 */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  setLyric(-1, false);
  if (timeEl) timeEl.textContent = '0:00 / ' + fmt(DURATION);

  window.addEventListener('load', function () {
    setTimeout(tryAutoplay, 300);
  });
})();
