/* Ball Shooter page background: a tiny self-playing copy of the game (numbered blocks, ring pickups,
   a stream of balls fired from the floor). Decorative only. Pauses when the tab is hidden, shows a
   still frame if the visitor prefers reduced motion, and does not run (or show) below 1024px wide. */
(function () {
  "use strict";
  var canvas = document.querySelector(".game-bg");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var W = 0, H = 0, cell = 60, cols = 16, rows = 10, ballR = 6, speed = 4.5, ink = "#f2f2f4", top = 64, pulse = 0;
  var blocks, rings, balls, round, toFire, fireTimer, launchX, nextLaunchX, phase, phaseTime, aim;

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function hueFor(v) {            // low numbers green / yellow, high ones pink / purple / cyan (as in the game)
    var h = [120, 48, 330, 280, 190][Math.min(4, Math.floor(v / 18))];
    return "hsl(" + h + " 70% 58%)";
  }

  // The floor is the top edge of the footer when it is on screen, so balls land on it instead of vanishing behind it.
  var floorY = 0, footer = document.querySelector(".site-footer");
  function updateFloor() {
    var f = footer ? footer.getBoundingClientRect().top : H;
    floorY = Math.max(top + 4 * cell, Math.min(H, f)) - 8;
  }

  function resize() {
    var hd = document.querySelector(".site-header");
    top = hd ? Math.round(hd.getBoundingClientRect().bottom) : 0;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = Math.max(44, Math.min(72, W / 14));
    cols = Math.ceil(W / cell); updateFloor(); rows = Math.max(6, Math.floor((floorY - top - cell * 0.4) / cell));
    ballR = Math.max(4, cell * 0.1); speed = cell * 0.075;
    reset();
  }

  function reset() {
    bonus = 0; extra = 0; blocks = []; rings = []; balls = []; round = 14; launchX = nextLaunchX = W / 2; phase = "aim"; phaseTime = 0;
    for (var i = 0; i < 4; i++) { addRow(); descend(true); }
    addRow(); newAim();
  }

  function addRow() {
    round++;
    var any = false;
    for (var c = 0; c < cols; c++) {
      var r = Math.random();
      if (r < 0.34) { blocks.push({ c: c, r: 0, v: Math.round(rnd(round * 0.8, round * 1.9 + 3)) }); any = true; }
      else if (r < 0.40) rings.push({ c: c, r: 0 });
    }
    if (!any) {                     // a row always has at least one block; never put it on top of a ring
      var c0 = Math.floor(rnd(0, cols));
      rings = rings.filter(function (g) { return !(g.r === 0 && g.c === c0); });
      blocks.push({ c: c0, r: 0, v: round + 2 });
    }
  }
  function descend(silent) {
    blocks.forEach(function (b) { b.r++; });
    rings.forEach(function (g) { g.r++; });
    rings = rings.filter(function (g) { return g.r < rows; });
    if (!silent && blocks.some(function (b) { return b.r >= rows; })) reset();
  }

  function newAim() {
    // Aim at a random block that is still alive, with a small error, but never close to flat.
    var t = blocks[Math.floor(Math.random() * blocks.length)], a;
    if (t) a = Math.atan2(-(rowY(t.r) - (floorY)), colX(t.c) - launchX) + rnd(-0.1, 0.1);
    else a = rnd(1, 2.1);
    var lim = 0.22; a = Math.max(lim, Math.min(Math.PI - lim, a < 0 ? (Math.cos(a) > 0 ? lim : Math.PI - lim) : a));
    aim = a; phase = "aim"; phaseTime = 0;
  }

  function colX(c) { return c * cell + cell / 2; }
  function rowY(r) { return top + cell * 0.25 + r * cell + cell / 2; }

  function fire() {
    toFire = Math.min(40, 3 + Math.floor(round * 0.9) + bonus); fireTimer = 0; nextLaunchX = null; phase = "fire"; phaseTime = 0;
  }

  function step() {
    phaseTime++;
    if (phase === "aim") { if (phaseTime > 40) fire(); return; }
    if (phase === "fire" && toFire > 0 && --fireTimer <= 0) {
      balls.push({ x: launchX, y: floorY, vx: Math.cos(aim) * speed, vy: -Math.sin(aim) * speed });
      toFire--; fireTimer = 5;
    }
    for (var s = 0; s < 3; s++) {
      for (var i = balls.length - 1; i >= 0; i--) {
        var b = balls[i];
        b.x += b.vx / 3; b.y += b.vy / 3;
        if (b.x < ballR) { b.x = ballR; b.vx = Math.abs(b.vx); }
        else if (b.x > W - ballR) { b.x = W - ballR; b.vx = -Math.abs(b.vx); }
        if (b.y < top + ballR) { b.y = top + ballR; b.vy = Math.abs(b.vy); }   // the header is the ceiling
        if (b.y > floorY && b.vy > 0) { if (nextLaunchX === null) nextLaunchX = b.x; balls.splice(i, 1); continue; }
        hitBlocks(b);
        for (var g = rings.length - 1; g >= 0; g--) {
          var dx = b.x - colX(rings[g].c), dy = b.y - rowY(rings[g].r);
          if (dx * dx + dy * dy < (cell * 0.3) * (cell * 0.3)) { rings.splice(g, 1); extra++; }
        }
      }
    }
    if (phase === "fire" && toFire === 0 && !balls.length) {
      launchX = nextLaunchX === null ? launchX : nextLaunchX;
      bonus += extra; extra = 0;
      addRow(); descend(); newAim();
    }
  }
  var extra = 0, bonus = 0;

  function hitBlocks(b) {
    var half = cell / 2 - 3;
    for (var i = 0; i < blocks.length; i++) {
      var k = blocks[i], cx = colX(k.c), cy = rowY(k.r);
      var dx = b.x - cx, dy = b.y - cy;
      var px = half + ballR - Math.abs(dx), py = half + ballR - Math.abs(dy);
      if (px > 0 && py > 0) {
        if (px < py) { b.vx = (dx > 0 ? 1 : -1) * Math.abs(b.vx); b.x += dx > 0 ? px : -px; }
        else { b.vy = (dy > 0 ? 1 : -1) * Math.abs(b.vy); b.y += dy > 0 ? py : -py; }
        if (--k.v <= 0) blocks.splice(i, 1);
        return;
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "500 " + Math.round(cell * 0.3) + "px Inter, system-ui, sans-serif";
    var size = cell - 6;
    blocks.forEach(function (k) {
      var x = colX(k.c) - size / 2, y = rowY(k.r) - size / 2;
      ctx.fillStyle = hueFor(k.v); ctx.fillRect(x, y, size, size);
      ctx.fillStyle = "rgba(0,0,0,.75)"; ctx.fillText(k.v, x + size / 2, y + size / 2 + 1);
    });
    ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 2.5;
    var inner = cell * 0.08, k = (1 + Math.sin(pulse)) / 2;   // the ring breathes from its wide size down to hugging the dot
    var ringR = inner + ctx.lineWidth + k * (cell * 0.22 - inner - ctx.lineWidth);
    rings.forEach(function (g) {
      var x = colX(g.c), y = rowY(g.r);
      ctx.beginPath(); ctx.arc(x, y, ringR, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, inner, 0, 7); ctx.fill();
    });
    if (phase === "aim") {            // dotted aim guide
      for (var i = 1; i < 14; i++) {
        var d = i * cell * 0.34;
        ctx.beginPath(); ctx.arc(launchX + Math.cos(aim) * d, floorY - Math.sin(aim) * d, ballR * 0.8, 0, 7); ctx.fill();
      }
    }
    balls.forEach(function (b) { ctx.beginPath(); ctx.arc(b.x, b.y, ballR, 0, 7); ctx.fill(); });
    ctx.beginPath(); ctx.arc(launchX, floorY, ballR, 0, 7); ctx.fill();
  }

  var raf = 0, last = 0, acc = 0;
  function frame(t) {
    raf = requestAnimationFrame(frame);
    acc += Math.min(100, t - last); last = t;
    while (acc >= 1000 / 60) { step(); acc -= 1000 / 60; }
    pulse = t / 450; updateFloor();
    draw();
  }

  var small = window.matchMedia("(max-width: 1023px)");   // phones and tablets: no background at all
  var running = false;
  function start() {
    if (running) return;
    running = true; resize();
    if (reduce) { for (var i = 0; i < 400; i++) step(); draw(); }
    else { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  function stop() { running = false; cancelAnimationFrame(raf); }
  function sync() { if (small.matches) stop(); else start(); }

  window.addEventListener("resize", function () { if (running) { resize(); if (reduce) draw(); } });
  document.addEventListener("visibilitychange", function () {
    if (!running || reduce) return;
    if (document.hidden) cancelAnimationFrame(raf); else { last = performance.now(); raf = requestAnimationFrame(frame); }
  });
  if (small.addEventListener) small.addEventListener("change", sync); else small.addListener(sync);
  sync();
})();
