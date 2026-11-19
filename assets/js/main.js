/* Site-wide behavior. Plain JS, no dependencies. Every feature is optional:
   the site is fully readable if this file fails to load. */
(function () {
  "use strict";

  // ---- Theme toggle (preference saved per browser) ----
  var root = document.documentElement;
  var toggle = document.querySelector(".theme-toggle");

  function currentTheme() {
    var set = root.getAttribute("data-theme");
    if (set) return set;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function renderToggle() {
    if (!toggle) return;
    var dark = currentTheme() === "dark";
    toggle.setAttribute("aria-label", "Switch to " + (dark ? "light" : "dark") + " theme");
  }

  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = currentTheme() === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) { /* storage blocked */ }
      renderToggle();
    });
    renderToggle();
  }

  // ---- Header gets a bottom border once the page scrolls ----
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("is-stuck", window.scrollY > 4); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ---- Mark the current nav link ----
  var path = location.pathname.replace(/index\.html$/, "");
  document.querySelectorAll(".site-nav a[href]").forEach(function (a) {
    var href = a.getAttribute("href");
    var active = href === "/" ? path === "/" : path.indexOf(href) === 0;
    if (active) a.setAttribute("aria-current", "page");
  });

  // ---- Tech chips ----
  // Opening a chip: if there is room to its right, the chips after it slide over; otherwise the pill takes over
  // neighbouring cells and the chips it covers drop to the next row. The chip under the cursor never moves.
  //
  // Hover is driven by real pointer MOVEMENT, not by mouseenter/mouseleave. Browsers send fresh enter/leave events when
  // the layout changes under a stationary mouse; reacting to those made chips open and close each other in a loop.
  var techLists = Array.prototype.slice.call(document.querySelectorAll(".tech-list:not(.tips)"));
  if (techLists.length) {
    document.documentElement.classList.add("js-tech");   // the CSS :hover fallback only applies without this class
    var current = null;                                  // { li, list, items }
    var lastX = -1, lastY = -1;

    var gridInfo = function (list) {
      var cs = getComputedStyle(list);
      var tracks = cs.gridTemplateColumns.split(" ");
      var colW = parseFloat(tracks[0]);
      var gap = parseFloat(cs.columnGap) || 0;
      return { cols: tracks.length, colW: colW, gap: gap, step: colW + gap };
    };

    // Run a layout change, then slide every chip (except `skip`) from where it was to where it is now.
    var animateLayout = function (list, items, change, skip) {
      var before = items.map(function (x) { return x.getBoundingClientRect(); });
      change();
      var after = items.map(function (x) { return x.getBoundingClientRect(); });
      var moved = [];
      items.forEach(function (x, i) {
        if (x === skip) return;
        var dx = before[i].left - after[i].left, dy = before[i].top - after[i].top;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          x.style.transition = "none";
          x.style.transform = "translate(" + dx + "px," + dy + "px)";
          moved.push(x);
        }
      });
      if (moved.length) {
        list.getBoundingClientRect(); // force a reflow so the slide starts from the old position
        moved.forEach(function (x) { x.style.transition = ""; x.style.transform = ""; });
      }
    };

    var closeCurrent = function () {
      if (!current) return;
      var items = current.items, list = current.list;
      current = null;
      var placed = items.some(function (x) { return x.style.gridColumn; });
      if (placed) items.forEach(function (x) { x.style.transition = "none"; });   // restore at once, so hit-testing is exact
      items.forEach(function (x) {
        x.style.transform = "";
        x.style.gridColumn = ""; x.style.gridRow = "";
        x.classList.remove("is-open", "is-flipped");
        var b = x.querySelector(".tech");
        if (b) { b.style.maxWidth = ""; b.style.width = ""; }
      });
      if (placed) { list.getBoundingClientRect(); items.forEach(function (x) { x.style.transition = ""; }); }
    };

    var openChip = function (li) {
      var list = li.parentNode, items = Array.prototype.slice.call(list.children);
      var btn = li.querySelector(".tech");
      if (!btn) return;
      current = { li: li, list: list, items: items };

      var g = gridInfo(list);
      var idx = items.indexOf(li), c = idx % g.cols, r = Math.floor(idx / g.cols);

      // the pill's full width: icon slot + the label's natural text width + its right padding
      var lab = btn.querySelector(".tech-label");
      var textW = Math.max.apply(null, Array.prototype.map.call(lab.children, function (k) { return k.scrollWidth; }));
      var wanted = Math.min(g.colW + textW + parseFloat(getComputedStyle(lab).paddingRight), 352);
      // room to grow to the right: inside the row, and never past the window edge (that would flash a scrollbar)
      var spaceRight = document.documentElement.clientWidth - list.getBoundingClientRect().left - c * g.step - 8;
      var rowEnd = Math.min(items.length - 1, (r + 1) * g.cols - 1);
      var lastRight = (rowEnd % g.cols + 1) * g.step - g.gap;
      var room = list.clientWidth - lastRight;
      var delta = Math.max(0, wanted - g.colW);

      if (delta <= room && wanted <= spaceRight) {
        btn.style.maxWidth = wanted + "px";
        items.slice(idx + 1, rowEnd + 1).forEach(function (m) { m.style.transform = "translateX(" + delta + "px)"; });
      } else {
        var need = Math.ceil(wanted / g.step);                 // columns the pill actually touches
        var leftCap = c + 1, rightCap = g.cols - c;
        var goLeft = leftCap >= need || (rightCap < need && leftCap >= rightCap);
        var n = Math.min(need, goLeft ? leftCap : rightCap);
        if (n >= 2) {
          // the pill fills the whole span, so its hover area and what you see are the same
          btn.style.maxWidth = (n * g.step - g.gap) + "px";
          btn.style.width = "100%";
          // Pin the open chip and every chip it does NOT cover to their own cells; the covered chips are left
          // unpinned, so the grid flows them (in order) into the next row.
          var startCol = goLeft ? c - n + 1 : c;
          animateLayout(list, items, function () {
            items.forEach(function (x, i) {
              if (i < r * g.cols || i > rowEnd) return;
              var col = i % g.cols;
              if (x === li) {
                x.style.gridRow = String(r + 1);
                x.style.gridColumn = (startCol + 1) + " / span " + n;
              } else if (col < startCol || col >= startCol + n) {
                x.style.gridRow = String(r + 1);
                x.style.gridColumn = String(col + 1);
              }
            });
            if (goLeft) li.classList.add("is-flipped");
          }, li);
        } else {
          btn.style.maxWidth = Math.max(g.colW, Math.min(wanted, spaceRight)) + "px";   // last resort: open over its neighbours
        }
      }
      li.classList.add("is-open");
    };

    var chipAt = function (x, y) {
      var el = document.elementFromPoint(x, y);
      return el && el.closest ? el.closest(".tech-list li") : null;
    };

    var evaluate = function (x, y) {
      var li = chipAt(x, y);
      if (current && li === current.li) return;           // still inside the open chip: nothing to do
      if (current) { closeCurrent(); li = chipAt(x, y); } // layout was restored: look again at what is under the pointer
      if (li) openChip(li);
    };

    document.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;               // touch uses focus (below)
      lastX = e.clientX; lastY = e.clientY;
      evaluate(lastX, lastY);
    }, { passive: true });
    document.documentElement.addEventListener("mouseleave", closeCurrent);
    window.addEventListener("scroll", function () { if (lastX >= 0) evaluate(lastX, lastY); }, { passive: true });

    // keyboard and touch: focusing a chip opens it, leaving it closes it
    techLists.forEach(function (list) {
      Array.prototype.forEach.call(list.children, function (li) {
        li.addEventListener("focusin", function () {
          if (current && current.li === li) return;
          closeCurrent(); openChip(li);
        });
        li.addEventListener("focusout", function () { if (current && current.li === li) closeCurrent(); });
      });
    });
  }

  // ---- Image carousels: native scroll-snap (swipe works on touch), plus buttons, dots, a counter and arrow keys ----
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll("[data-carousel]").forEach(function (root) {
    var track = root.querySelector(".carousel-track");
    var n = track.children.length;
    var prev = root.querySelector(".prev"), next = root.querySelector(".next");
    var dots = root.querySelectorAll(".dot"), count = root.querySelector(".carousel-count");
    var current = function () { return Math.round(track.scrollLeft / track.clientWidth); };
    var go = function (i) {
      i = Math.max(0, Math.min(n - 1, i));
      track.scrollTo({ left: i * track.clientWidth, behavior: reducedMotion ? "auto" : "smooth" });
    };
    var sync = function () {
      var i = current();
      dots.forEach(function (d, k) { d.setAttribute("aria-current", k === i ? "true" : "false"); });
      if (count) count.textContent = (i + 1) + " / " + n;
      if (prev) prev.disabled = i === 0;
      if (next) next.disabled = i === n - 1;
    };
    if (prev) prev.addEventListener("click", function () { go(current() - 1); });
    if (next) next.addEventListener("click", function () { go(current() + 1); });
    dots.forEach(function (d, k) { d.addEventListener("click", function () { go(k); }); });
    track.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); go(current() - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); go(current() + 1); }
    });
    var raf;
    track.addEventListener("scroll", function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); }, { passive: true });
    sync();
  });

  // ---- Home page tooltips: nudge a tooltip sideways if it would run off the screen ----
  document.querySelectorAll(".tech-list.tips .tech").forEach(function (btn) {
    var tip = btn.querySelector(".tech-label");
    function place() {
      tip.style.setProperty("--tip-shift", "0px");
      var r = btn.getBoundingClientRect(), half = tip.offsetWidth / 2, c = r.left + r.width / 2, pad = 8, shift = 0;
      if (c - half < pad) shift = pad - (c - half);
      else if (c + half > window.innerWidth - pad) shift = window.innerWidth - pad - (c + half);
      tip.style.setProperty("--tip-shift", shift + "px");
    }
    btn.addEventListener("pointerenter", place);
    btn.addEventListener("focus", place);
  });

  // ---- Footer year ----
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
