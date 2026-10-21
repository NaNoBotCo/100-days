/* 100 days — charts and toys. Data comes from the boot block, which build.py fills
   from src/data.json; nothing here types a count. */
(function () {
  "use strict";
  var B = JSON.parse(document.getElementById("boot").textContent);
  var TH = B.lang === "th", m = B.m, D = B.d;
  var T = function (en, th) { return TH ? th : en; };
  var NS = "http://www.w3.org/2000/svg";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fmt = function (n) { return Number(n).toLocaleString("en-US"); };
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var MON = TH ? ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
               : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function dayLabel(iso) { var p = iso.split("-"); return (+p[2]) + " " + MON[+p[1] - 1]; }
  function addDays(iso, n) { var t = new Date(iso + "T00:00:00Z"); t.setUTCDate(t.getUTCDate() + n); return t.toISOString().slice(0, 10); }
  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function h(html) { var d = document.createElement("div"); d.innerHTML = html; return d; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function tipFor(box) {
    var t = document.createElement("div"); t.className = "tip"; box.appendChild(t);
    return {
      show: function (x, y, txt) { t.textContent = txt; var hw = t.offsetWidth / 2, bw = box.clientWidth; t.style.left = Math.max(hw, Math.min(bw - hw, x)) + "px"; t.style.top = y + "px"; t.classList.add("show"); },
      hide: function () { t.classList.remove("show"); }
    };
  }
  function whenSeen(node, fn) {
    if (!("IntersectionObserver" in window)) return fn();
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); fn(); } }); }, { threshold: .3 });
    io.observe(node);
  }
  function countUp(node, to, ms, pre, post) {
    pre = pre || ""; post = post || "";
    if (reduce) { node.textContent = pre + fmt(to) + post; return; }
    var t0 = performance.now();
    (function f(t) {
      var k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      node.textContent = pre + fmt(Math.round(to * e)) + post;
      if (k < 1) requestAnimationFrame(f);
    })(t0);
  }

  /* ---------- bar chart (one series, one axis) ---------- */
  function bars(box, vals, opt) {
    opt = opt || {};
    var W = Math.max(260, Math.round(box.clientWidth || 1000)), H = opt.h || 160, P = { l: 34, r: 6, t: 10, b: opt.xl ? 22 : 8 };
    var n = vals.length, max = Math.max.apply(null, vals) || 1;
    var step = niceStep(max), top = Math.ceil(max / step) * step;
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": opt.label || "" }, box);
    for (var g = 0; g <= top; g += step) {
      var gy = P.t + (H - P.t - P.b) * (1 - g / top);
      el("line", { x1: P.l, x2: W - P.r, y1: gy, y2: gy, "class": "gl" }, svg);
      el("text", { x: P.l - 6, y: gy + 4, "text-anchor": "end", "class": "ax" }, svg).textContent = fmt(g);
    }
    var bw = (W - P.l - P.r) / n, gap = Math.min(4, bw * .18), tip = tipFor(box), list = [];
    vals.forEach(function (v, i) {
      var x = P.l + i * bw + gap / 2, w = bw - gap, bh = (H - P.t - P.b) * v / top, y = H - P.b - bh, r = Math.min(4, w / 2, bh);
      var hit = el("rect", { x: P.l + i * bw, y: P.t, width: bw, height: H - P.t - P.b, "class": "hit" }, svg);
      var b = el("path", { d: roundTop(x, y, w, bh, r), "class": "bar" + (opt.hl && opt.hl(i) ? " hl" : "") }, svg);
      list.push(b);
      if (opt.xl && i % Math.max(1, Math.ceil(n * (opt.xw || 56) / W)) === 0) el("text", { x: x + w / 2, y: H - 6, "text-anchor": "middle", "class": "ax" }, svg).textContent = opt.xl(i);
      function on(ev) {
        var rb = box.getBoundingClientRect(), sb = svg.getBoundingClientRect(), sc = sb.width / W;
        tip.show((x + w / 2) * sc + (sb.left - rb.left), y * sc + (sb.top - rb.top), opt.tip(i, v));
        list.forEach(function (o) { o.classList.remove("on"); }); b.classList.add("on");
      }
      hit.addEventListener("mouseenter", on); hit.addEventListener("mouseleave", function () { tip.hide(); b.classList.remove("on"); });
      hit.addEventListener("click", function (ev) { on(ev); if (opt.click) opt.click(i); });
    });
    if (!reduce && !opt.still) list.forEach(function (b, i) { b.style.transformOrigin = "center bottom"; b.style.transformBox = "fill-box"; b.animate([{ transform: "scaleY(0)" }, { transform: "scaleY(1)" }], { duration: 500, delay: i * (300 / n), easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }); });
    return svg;
  }
  var MOUNTS = [];
  function mount(box, vals, opt) { bars(box, vals, opt); MOUNTS.push([box, vals, opt]); }
  var rsz; addEventListener("resize", function () { clearTimeout(rsz); rsz = setTimeout(function () { MOUNTS.forEach(function (mt) { if (Math.abs(mt[0].clientWidth - (mt[0]._w || 0)) < 8) return; mt[0]._w = mt[0].clientWidth; mt[0].innerHTML = ""; mt[2].still = true; bars(mt[0], mt[1], mt[2]); }); }, 200); });
  function roundTop(x, y, w, hgt, r) {
    if (hgt <= 0) return "";
    return "M" + x + "," + (y + hgt) + "V" + (y + r) + "Q" + x + "," + y + " " + (x + r) + "," + y + "H" + (x + w - r) + "Q" + (x + w) + "," + y + " " + (x + w) + "," + (y + r) + "V" + (y + hgt) + "Z";
  }
  function niceStep(max) { var p = Math.pow(10, Math.floor(Math.log10(max))), f = max / p; return (f <= 2 ? .5 : f <= 5 ? 1 : 2) * p; }

  /* ---------- hero ---------- */
  var dayn = $("#dayn");
  if (dayn) whenSeen(dayn, function () { countUp(dayn, D.days, 1800); });
  $$(".stats li").forEach(function (li) {
    var b = $("b", li), n = b.getAttribute("data-n");
    li.addEventListener("click", function () { if (n) countUp(b, +n, 900); li.animate && li.animate([{ transform: "rotate(-3deg)" }, { transform: "rotate(2deg)" }, { transform: "none" }], { duration: 400 }); });
  });
  var h1 = $(".hero h1");
  if (h1) h1.addEventListener("click", function () { h1.classList.remove("wobble"); void h1.offsetWidth; h1.classList.add("wobble"); });
  var sky = $("#skyline");
  if (sky) mount(sky, D.daily, {
    h: 150, label: m.skyline,
    xl: function (i) { return dayLabel(addDays(D.day0, i)); },
    hl: function (i) { return D.daily[i] === D.top_day[1]; },
    tip: function (i, v) { return m.dayword + " " + (i + 1) + " · " + dayLabel(addDays(D.day0, i)) + " · " + fmt(v); }
  });

  /* ---------- weeks, three charts ---------- */
  var goWeek = function (i) { var t = document.getElementById("w" + (i + 1)); if (t) { t.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); var wk = $(".wk", t); if (wk) { wk.classList.add("spin"); setTimeout(function () { wk.classList.remove("spin"); }, 700); } } };
  var wl = function (i) { return "W" + (i + 1); };
  var wt = function (unit) { return function (i, v) { var w = B.weeks[i]; return m.week + " " + (i + 1) + " · " + w.dates + " · " + fmt(v) + " " + unit; }; };
  [["#ch-commits", D.weekly, m.c_commits], ["#ch-rules", D.rules_weekly, m.c_rules], ["#ch-repos", D.repos_weekly, m.c_repos]].forEach(function (c) {
    var box = $(c[0]); if (!box) return;
    whenSeen(box, function () { mount(box, c[1], { h: 120, xw: 26, label: c[2], xl: wl, tip: wt(c[2].toLowerCase()), click: goWeek }); });
  });
  var wtab = $("#weektable");
  if (wtab) {
    var rows = B.weeks.map(function (w, i) { return "<tr><td>" + m.week + " " + w.w + " · " + w.dates + "</td><td>" + fmt(D.weekly[i]) + "</td><td>" + D.rules_weekly[i] + "</td><td>" + D.repos_weekly[i] + "</td></tr>"; }).join("");
    wtab.innerHTML = "<table><thead><tr><th>" + m.week + "</th><th>" + m.c_commits + "</th><th>" + m.c_rules + "</th><th>" + m.c_repos + "</th></tr></thead><tbody>" + rows + "</tbody></table>";
  }

  /* ---------- bands: pictures drawn from the counts ---------- */
  var HUES = ["#ff3d7f", "#9a86ff", "#ffb000", "#2fc596", "#3987e5"];
  function bandCommits(seed) {
    var c = document.createElement("canvas"), W = 1600, H = 700; c.width = W; c.height = H;
    var x = c.getContext("2d"), g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, "#140c2a"); g.addColorStop(1, "#2a0c2a"); x.fillStyle = g; x.fillRect(0, 0, W, H);
    var n = D.daily.length, cw = W / n;
    D.daily.forEach(function (v, i) {
      for (var k = 0; k < v; k++) {
        var px = i * cw + Math.random() * cw, py = H - 20 - (k / D.top_day[1]) * (H - 60) - Math.random() * 6;
        x.globalAlpha = .55 + Math.random() * .45; x.fillStyle = HUES[(Math.floor(i / 7) + seed) % HUES.length];
        x.beginPath(); x.arc(px, py, 1.4 + Math.random() * 1.6, 0, 7); x.fill();
      }
    });
    return c.toDataURL("image/jpeg", .82);
  }
  function bandRules(seed) {
    var c = document.createElement("canvas"), W = 1600, H = 700; c.width = W; c.height = H;
    var x = c.getContext("2d"); x.fillStyle = "#120d20"; x.fillRect(0, 0, W, H);
    var k = 0;
    D.rules_weekly.forEach(function (v, w) {
      for (var i = 0; i < v; i++, k++) {
        var px = (w + Math.random()) * W / D.rules_weekly.length, py = 30 + Math.random() * (H - 60), s = 22 + Math.random() * 26;
        x.save(); x.translate(px, py); x.rotate((Math.random() - .5) * .9);
        x.globalAlpha = .82; x.fillStyle = HUES[(w + seed) % HUES.length]; x.fillRect(-s / 2, -s / 2, s, s * .8);
        x.fillStyle = "rgba(0,0,0,.35)"; x.fillRect(-s / 2 + 4, -s / 2 + 6, s - 10, 2); x.fillRect(-s / 2 + 4, -s / 2 + 12, s - 14, 2);
        x.restore();
      }
    });
    return c.toDataURL("image/jpeg", .82);
  }
  [["#band1", bandCommits], ["#band2", bandRules]].forEach(function (b) {
    var node = $(b[0]); if (!node) return; var seed = 0;
    whenSeen(node, function () { node.style.backgroundImage = "url(" + b[1](seed) + ")"; });
    node.addEventListener("click", function () { seed++; node.style.backgroundImage = "url(" + b[1](seed) + ")"; node.classList.remove("pop"); void node.offsetWidth; node.classList.add("pop"); });
  });

  /* ---------- lesson badges spin ---------- */
  $$(".wk").forEach(function (w) { w.addEventListener("click", function () { w.classList.add("spin"); setTimeout(function () { w.classList.remove("spin"); }, 700); }); });
  $$(".story").forEach(function (s) { s.addEventListener("click", function () { s.classList.toggle("open"); }); });

  /* ---------- toys ---------- */
  var TOYS = {};

  TOYS.jar = function (box) {
    box.innerHTML = "<h5>" + T("Two ways to count amulets", "นับพระเครื่องสองแบบ") + "</h5><div class='jar'>" +
      "<div class='pot'><canvas class='dots' width='300' height='190'></canvas><div class='n'><span>0</span><small>" + T("new cards", "การ์ดใหม่") + "</small></div><p class='tiny'>" + T("the seed list: 47 terms", "รายการคำค้น: 47 คำ") + "</p><button class='btn'>" + T("Read the list", "อ่านรายการ") + "</button></div>" +
      "<div class='pot'><canvas class='dots' width='300' height='190'></canvas><div class='n'><span>0</span><small>" + T("varieties", "แบบ") + "</small></div><p class='tiny mono'>0 / 4,778 " + T("rows", "แถว") + "</p><button class='btn'>" + T("Mine the table", "ขุดทั้งตาราง") + "</button></div></div>";
    var pots = $$(".pot", box);
    function run(pot, total, cols, hits, ms, rowsLabel) {
      var cv = $("canvas", pot), x = cv.getContext("2d"), W = cv.width, H = cv.height, rows = Math.ceil(total / cols);
      var cw = W / cols, ch = H / rows, r = Math.max(.8, Math.min(cw, ch) * .38), pick = {};
      shuffle(Array.apply(null, Array(total)).map(function (_, i) { return i; })).slice(0, hits).forEach(function (i) { pick[i] = 1; });
      var css = getComputedStyle(document.documentElement), base = css.getPropertyValue("--line"), hot = css.getPropertyValue("--accent"), seen = css.getPropertyValue("--s1");
      function dot(i, col) { x.fillStyle = col; x.beginPath(); x.arc((i % cols + .5) * cw, (Math.floor(i / cols) + .5) * ch, r, 0, 7); x.fill(); }
      x.clearRect(0, 0, W, H); for (var i = 0; i < total; i++) dot(i, base);
      var nEl = $(".n span", pot), lab = $(".tiny", pot), btn = $("button", pot), t0 = performance.now(), done = 0, found = 0;
      btn.disabled = true;
      (function f(t) {
        var k = reduce ? 1 : Math.min(1, (t - t0) / ms), upto = Math.floor(total * k);
        for (; done < upto; done++) { if (pick[done]) { dot(done, hot); found++; } else dot(done, seen); }
        if (rowsLabel) lab.textContent = fmt(done) + " / " + fmt(total) + " " + T("rows", "แถว");
        nEl.textContent = found;
        if (k < 1) requestAnimationFrame(f); else btn.disabled = false;
      })(t0);
    }
    $("button", pots[0]).onclick = function () { run(pots[0], 47, 8, 7, 900, false); };
    $("button", pots[1]).onclick = function () { run(pots[1], 4778, 98, 112, 2600, true); };
  };

  // stylecheck: allow-start — this toy has to name the words it hunts
  TOYS.tics = function (box) {
    var BAN = ["load[- ]bearing", "honest(?:ly|y)?", "authentic(?:ity|ally)?", "purists?", "touristy?s?"];
    var SMELL = ["just", "actually", "simply", "basically", "essentially", "truly", "genuinely", "robust", "seamless", "powerful", "comprehensive", "vibrant", "delightful", "crucial", "vital", "deep dive", "unpack", "leverage", "ensure", "align", "real"];
    var CLEAR = ["great question", "let me", "i[’']ll go ahead and", "absolutely", "to summari[sz]e", "in short", "we never", "we always", "nothing is (?:stored|sent|tracked)", "no tracking", "it[’']s worth noting", "that said", "ควร", "ระวัง", "อย่าลืม"];
    var sample = "Great question! I’ll go ahead and unpack this. Honestly, the real issue is a load-bearing assumption: the build is robust, and we never store anything. To summarize, this is a seamless, powerful fix that will ensure everything just works.";
    box.innerHTML = "<h5>" + T("Tic detector", "เครื่องจับคำติดปาก") + "</h5><textarea class='tics' aria-label='" + T("Text to check", "ข้อความที่จะตรวจ") + "'></textarea>" +
      "<div class='row'><span class='score'>0</span><span class='tiny'></span><button class='btn alt'>" + T("Bot sample", "ตัวอย่างจากบอท") + "</button></div><div class='marked'></div>" +
      "<div class='legend'><span><i style='background:var(--accent)'></i>" + T("banned", "ห้ามใช้") + "</span><span><i style='background:var(--gold)'></i>" + T("smell", "น่าสงสัย") + "</span><span><i style='background:var(--violet)'></i>" + T("throat-clearing or pledge", "เกริ่นหรือคำสัญญา") + "</span></div>";
    var ta = $("textarea", box), out = $(".marked", box), sc = $(".score", box), info = $(".tiny", box);
    var re = new RegExp("(\\b(?:" + BAN.join("|") + ")\\b)|(\\b(?:" + SMELL.join("|") + ")\\b)|((?:" + CLEAR.join("|") + "))", "gi");
    function esc(s) { return s.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
    function check() {
      var s = ta.value, n = 0, html = "", last = 0, mm; re.lastIndex = 0;
      while ((mm = re.exec(s))) {
        if (!mm[0]) { re.lastIndex++; continue; }
        n++; html += esc(s.slice(last, mm.index)) + "<mark class='" + (mm[1] ? "" : mm[2] ? "smell" : "clear") + "'>" + esc(mm[0]) + "</mark>"; last = mm.index + mm[0].length;
      }
      html += esc(s.slice(last)); out.innerHTML = html || "<span class='tiny'>…</span>";
      var words = (s.match(/\S+/g) || []).length; sc.textContent = n;
      info.textContent = T(" tics in " + words + " words", " คำติดปาก จาก " + words + " คำ");
    }
    ta.value = sample; ta.addEventListener("input", check); $("button", box).onclick = function () { ta.value = sample; check(); };
    check();
  };

  TOYS.squeeze = function (box) {
    var S = [
      [4, "Great question!", "เป็นคำถามที่ดีมากค่ะ!"],
      [4, " I’ll go ahead and walk you through everything I found.", " เดี๋ยวจะเล่าทุกอย่างที่เจอให้ฟังทีละขั้นนะคะ"],
      [3, " To summarize the background, builds have been failing on and off for several days, which can happen for many different reasons.", " สรุปที่มาก่อน การสร้างเว็บพัง ๆ ดี ๆ มาหลายวัน ซึ่งเกิดได้จากหลายสาเหตุ"],
      [2, " I started by reading the logs carefully and then ran a profiler to see where the time was going.", " เริ่มจากอ่านล็อกอย่างละเอียด แล้วรันตัววัดดูว่าเวลาหายไปไหน"],
      [0, " Fixed.", " แก้แล้ว"],
      [0, " The build re-read a 140 MB file for every shelf map; it reads it once now.", " ขั้นสร้างอ่านไฟล์ 140 MB ใหม่ทุกแผนที่ ตอนนี้อ่านครั้งเดียว"],
      [1, " This should make things noticeably faster going forward.", " น่าจะทำให้เร็วขึ้นเห็นได้ชัดจากนี้ไป"],
      [0, " Build: about 93 minutes, from 3.5 hours.", " สร้างเว็บ: ราว 93 นาที จาก 3.5 ชั่วโมง"],
      [3, " Let me know if you have any questions or would like more detail on any part!", " ถ้ามีคำถามหรืออยากให้อธิบายส่วนไหนเพิ่ม บอกได้เลยนะคะ!"],
      [4, " I hope this helps!", " หวังว่าจะช่วยได้นะคะ!"]
    ];
    box.innerHTML = "<h5>" + T("Squeeze the reply", "บีบคำตอบ") + "</h5><div class='sentences'></div>" +
      "<input type='range' min='0' max='4' step='1' value='4' aria-label='" + T("Padding kept", "คำเกินที่เหลือ") + "'><div class='row'><span class='score'></span><span class='tiny'></span></div>";
    var sbox = $(".sentences", box), rng = $("input", box), sc = $(".score", box), info = $(".tiny", box);
    sbox.innerHTML = S.map(function (s) { return "<span data-l='" + s[0] + "'" + (s[0] === 0 ? " class='core'" : "") + ">" + (TH ? s[2] : s[1]) + "</span>"; }).join("");
    var full = 0;
    function words(t) { return TH ? t.replace(/\s/g, "").length : (t.match(/\S+/g) || []).length; }
    S.forEach(function (s) { full += words(TH ? s[2] : s[1]); });
    function upd() {
      var k = +rng.value, n = 0;
      $$("span", sbox).forEach(function (sp) { var l = +sp.getAttribute("data-l"); sp.classList.toggle("gone", l > k); if (l <= k) n += words(sp.textContent); });
      sc.textContent = n; info.textContent = T(" words of " + full + " · drag left", " ตัวอักษร จาก " + full + " · เลื่อนไปทางซ้าย");
    }
    rng.addEventListener("input", upd); upd();
  };

  TOYS.accrete = function (box) {
    var C = [
      ["psoriasis biologics card", "การ์ดยาชีววัตถุรักษาสะเก็ดเงิน", "+ a creed block", "+ บล็อกหลักความเชื่อ", "hold to"],
      ["self-hosted basemap", "แผนที่ฐานที่โฮสต์เอง", "+ “Nothing on this page is watching you”", "+ “Nothing on this page is watching you”", "watching you"],
      ["new tagline", "สโลแกนใหม่", "+ a whole page: “Why we beat Google”", "+ ทั้งหน้า: “Why we beat Google”", "beat Google"]
    ];
    box.innerHTML = "<h5>" + T("What rode in", "อะไรติดมาด้วย") + "</h5><ul class='commits'>" +
      C.map(function (c) { return "<li><span class='h'>commit</span> " + (TH ? c[1] : c[0]) + "<div class='diff'>" + (TH ? c[3] : c[2]) + "</div></li>"; }).join("") +
      "</ul><div class='row'><button class='btn'>git log -S</button><span class='tiny'>" + T("tap a commit to open its diff", "แตะคอมมิตเพื่อดูส่วนที่เปลี่ยน") + "</span></div><div class='term'>$ </div>";
    var lis = $$("li", box), term = $(".term", box), k = 0;
    lis.forEach(function (li) { li.onclick = function () { li.classList.toggle("open"); }; });
    $("button", box).onclick = function () {
      var c = C[k % C.length], li = lis[k % C.length]; k++;
      lis.forEach(function (x) { x.classList.remove("found"); });
      var line = "$ git log -S \"" + c[4] + "\" --format=%s", i = 0; term.textContent = "";
      (function type() {
        term.textContent = line.slice(0, ++i);
        if (i < line.length && !reduce) return setTimeout(type, 22);
        term.textContent = line + "\n" + (TH ? c[1] : c[0]);
        li.classList.add("found", "open");
      })();
    };
  };
  TOYS.whose = function (box) {
    var R = shuffle([
      [0, "The search index must stay under 10 MB.", "อินเด็กซ์ค้นหาต้องไม่เกิน 10 MB", "The index’s size that afternoon, rounded up. Never committed. 8 Sep.", "ขนาดอินเด็กซ์บ่ายวันนั้น ปัดขึ้น ไม่เคยคอมมิต 8 ก.ย."],
      [0, "No ?v= on script links (Nan).", "ห้ามใส่ ?v= ในลิงก์สคริปต์ (Nan)", "A session’s fork with her name added. Her word 13 Oct: “I said no such thing”.", "ทางเลือกของเซสชันที่ใส่ชื่อเธอ เธอบอก 13 ต.ค. ว่า “I said no such thing”"],
      [0, "Nothing is for sale except the ad box.", "ไม่มีอะไรขายนอกจากช่องโฆษณา", "Written by a session, 31 Jul. She uses affiliate links.", "เซสชันเขียนเอง 31 ก.ค. เธอใช้ลิงก์แอฟฟิลิเอต"],
      [0, "Never scrape that site.", "ห้ามดึงข้อมูลจากเว็บนั้น", "Sessions’ inventions. She has no objection to scraping. 6 Sep.", "เซสชันคิดเอง เธอไม่ขัดข้องเรื่องดึงข้อมูล 6 ก.ย."],
      [0, "Leftover rows may not pass 40.", "แถวที่เหลือต้องไม่เกิน 40", "Set when the count was 16. Nobody chose it.", "ตั้งไว้ตอนที่มี 16 ไม่มีใครเลือก"],
      [0, "Share-alike licences are a risk to avoid.", "สัญญาอนุญาตแบบ share-alike เสี่ยง ควรเลี่ยง", "A session’s fear. Her word 8 Sep: use them aggressively.", "ความกลัวของเซสชัน เธอบอก 8 ก.ย. ให้ใช้เต็มที่"],
      [1, "Yellow buttons carry black text.", "ปุ่มสีเหลืองใช้ตัวอักษรสีดำ", "Hers, 10 Oct.", "ของเธอ 10 ต.ค."],
      [1, "Green arrows pointing down read as going broke.", "ลูกศรเขียวชี้ลงอ่านว่ากำลังจะเจ๊ง", "Hers, 23 Sep. Marks point up or up-right.", "ของเธอ 23 ก.ย. เครื่องหมายชี้ขึ้นหรือขึ้นขวา"],
      [1, "In Chiang Mai, every car park takes motorcycles.", "ในเชียงใหม่ ทุกที่จอดรถรับมอเตอร์ไซค์", "Hers, 7 Sep. The useful fact is which lots are bikes-only.", "ของเธอ 7 ก.ย. ข้อมูลที่มีประโยชน์คือที่ไหนรับแต่มอเตอร์ไซค์"],
      [1, "Every graphic does something cute when tapped.", "ภาพทุกภาพทำอะไรน่ารัก ๆ เมื่อแตะ", "Hers, 10 Oct. Tap the badges on this page.", "ของเธอ 10 ต.ค. ลองแตะป้ายบนหน้านี้"],
      [1, "7-Elevens are sacred.", "เซเว่นอีเลฟเว่นศักดิ์สิทธิ์", "Hers, 26 Sep. Hello welcome, popsicles.", "ของเธอ 26 ก.ย. สวัสดีค่ะ ไอติมแท่ง"],
      [1, "No Google Translate on her sites.", "ไม่มี Google Translate บนเว็บของเธอ", "Hers, 23 Sep. This page carries the block.", "ของเธอ 23 ก.ย. หน้านี้ก็ปิดไว้"]
    ]);
    var i = 0, score = 0;
    box.innerHTML = "<h5>" + T("Whose rule?", "กฎของใคร?") + "</h5><div class='card'><div class='rule'></div><div class='verdict'></div></div>" +
      "<div class='row'><button class='btn' data-a='1'>NaN’s</button><button class='btn alt' data-a='0'>" + T("A bot’s", "ของบอท") + "</button><button class='btn alt nx'>" + T("Next", "ต่อไป") + "</button><span class='tiny mono'></span></div>";
    var card = $(".card", box), rule = $(".rule", box), ver = $(".verdict", box), sc = $(".tiny", box), nx = $(".nx", box), ans = $$("[data-a]", box);
    function show() {
      var r = R[i % R.length]; rule.textContent = TH ? r[2] : r[1]; ver.textContent = ""; card.className = "card";
      ans.forEach(function (b) { b.disabled = false; }); nx.disabled = true;
      sc.textContent = score + " / " + Math.min(i, R.length);
    }
    ans.forEach(function (b) {
      b.onclick = function () {
        var r = R[i % R.length], ok = +b.getAttribute("data-a") === r[0];
        if (ok) score++;
        card.className = "card " + (ok ? "ok" : "no");
        ver.innerHTML = "<b>" + (r[0] ? "NaN" : T("A bot", "บอท")) + "</b> · " + (TH ? r[4] : r[3]);
        ans.forEach(function (x) { x.disabled = true; }); nx.disabled = false; i++;
        sc.textContent = score + " / " + Math.min(i, R.length);
        if (i === R.length) nx.textContent = T("Again", "อีกรอบ");
      };
    });
    nx.onclick = function () { if (i >= R.length) { i = 0; score = 0; shuffle(R); nx.textContent = T("Next", "ต่อไป"); } show(); };
    show();
  };
  // stylecheck: allow-end — the quiz quotes rules bots wrote

  TOYS.silence = function (box) {
    var L = D.decision_list || [];
    box.innerHTML = "<h5>" + T("Who decided", "ใครตัดสิน") + "</h5><div class='tiles2'><div><b>" + D.by_silence + "</b>" + T("by their default", "ตามค่าเริ่มต้น") + "</div><div><b>" + D.by_her + "</b>" + T("by her word", "ด้วยคำของเธอ") + "</div></div>" +
      "<div class='legend'><span><i style='background:var(--s1)'></i>" + T("default fired", "ค่าเริ่มต้นทำงาน") + "</span><span><i style='background:var(--s2)'></i>" + T("her word", "คำของเธอ") + "</span></div>" +
      "<div class='waffle chart'></div><p class='tiny'>" + T(D.decisions + " decisions logged since " + dayLabel(D.decisions_from) + ", one square each. Tap one.", "บันทึกการตัดสินใจ " + D.decisions + " ข้อ ตั้งแต่ " + dayLabel(D.decisions_from) + " หนึ่งช่องต่อหนึ่งข้อ แตะดูได้") + "</p>";
    var wf = $(".waffle", box), tip = tipFor(wf);
    L.forEach(function (r, i) {
      var sq = document.createElement("i"); if (r[1] === "her") sq.className = "her";
      sq.title = dayLabel(r[0]);
      sq.onclick = sq.onmouseenter = function () {
        var rb = wf.getBoundingClientRect(), sb = sq.getBoundingClientRect();
        tip.show(sb.left - rb.left + sb.width / 2, sb.top - rb.top, dayLabel(r[0]) + " · " + (r[1] === "her" ? T("her word", "คำของเธอ") : T("default", "ค่าเริ่มต้น")));
      };
      sq.onmouseleave = tip.hide;
      wf.appendChild(sq);
      if (!reduce) sq.animate([{ transform: "scale(0)" }, { transform: "scale(1)" }], { duration: 300, delay: i * 18, fill: "backwards" });
    });
  };

  TOYS.count = function (box) {
    var F = [
      ["“Seven questions. Seventeen answers.”", "“เจ็ดคำถาม สิบเจ็ดคำตอบ”", "The data file held 16. Walking all 32,000 paths gave 761 outcomes.", "ไฟล์ข้อมูลมี 16 เดินครบ 32,000 เส้นทางได้ผลลัพธ์ 761 แบบ"],
      ["“Nobody gets the same loop.”", "“ไม่มีใครได้ลูปเหมือนกัน”", "29% of paths land on the same plan.", "29% ของเส้นทางไปจบที่แผนเดียวกัน"],
      ["Hardest 2 km on Route 1095: 7.45", "2 กม. ที่โหดสุดบนทางหลวง 1095: 7.45", "8.93, and the label named a different road.", "8.93 และป้ายบอกชื่อถนนอีกเส้น"],
      ["Sitemap: FIXED (note, 20 Sep)", "ไซต์แมป: แก้แล้ว (บันทึก 20 ก.ย.)", "Live file, 21 Sep: one flat list, 84,908 entries, 9,091,038 bytes.", "ไฟล์จริง 21 ก.ย.: รายการเดียว 84,908 รายการ 9,091,038 ไบต์"],
      ["motdang.net builds 98,153 pages", "motdang.net สร้าง 98,153 หน้า", "Google had 4 of them, 20 Sep.", "Google มีอยู่ 4 หน้า 20 ก.ย."]
    ];
    box.innerHTML = "<h5>" + T("Claim, then count. Tap a card.", "อ้าง แล้วนับ แตะการ์ด") + "</h5><div class='flips'>" +
      F.map(function (f) { return "<div class='flip' tabindex='0'><div><div class='f'><small>" + T("claimed", "อ้างไว้") + "</small><strong>" + (TH ? f[1] : f[0]) + "</strong></div><div class='b'><small>" + T("counted", "นับจริง") + "</small><strong>" + (TH ? f[3] : f[2]) + "</strong></div></div></div>"; }).join("") + "</div>";
    $$(".flip", box).forEach(function (f) { f.onclick = f.onkeydown = function (e) { if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return; f.classList.toggle("on"); }; });
  };

  TOYS.disk = function (box) {
    box.innerHTML = "<h5>" + T("Free space on the Mac, GB, lowest each day", "ที่ว่างบนแมค (GB) ต่ำสุดของแต่ละวัน") + "</h5><div class='chart'></div>" +
      "<div class='tiles2'><div><b>~60%</b>" + T("of the week of 24 Sep: photo-reading sessions", "ของสัปดาห์ 24 ก.ย.: เซสชันอ่านรูป") + "</div><div><b>49%</b>" + T("of the week of 1 Oct: 193 helper agents", "ของสัปดาห์ 1 ต.ค.: เอเจนต์ผู้ช่วย 193 ตัว") + "</div></div>" +
      "<p class='tiny'>" + T("The disk ledger starts 27 Sep, when diskkeeper began.", "บันทึกดิสก์เริ่ม 27 ก.ย. วันที่ diskkeeper เริ่มทำงาน") + "</p>";
    var c = $(".chart", box), P = D.disk, W = Math.max(260, Math.round(c.clientWidth || 600)), H = 200, pl = 34, pr = 10, pt = 10, pb = 24;
    var max = Math.max.apply(null, P.map(function (p) { return p[1]; })), step = niceStep(max), top = Math.ceil(max / step) * step;
    var X = function (i) { return pl + (W - pl - pr) * i / (P.length - 1); }, Y = function (v) { return pt + (H - pt - pb) * (1 - v / top); };
    var svg = el("svg", { viewBox: "0 0 " + W + " " + H, role: "img", "aria-label": T("Free disk space per day", "ที่ว่างดิสก์ต่อวัน") }, c);
    for (var g = 0; g <= top; g += step) { el("line", { x1: pl, x2: W - pr, y1: Y(g), y2: Y(g), "class": "gl" }, svg); el("text", { x: pl - 6, y: Y(g) + 4, "text-anchor": "end", "class": "ax" }, svg).textContent = g; }
    var lk = Math.max(1, Math.ceil(P.length * 52 / W)); P.forEach(function (p, i) { if (i % lk === 0) el("text", { x: X(i), y: H - 6, "text-anchor": "middle", "class": "ax" }, svg).textContent = dayLabel(p[0]); });
    var d = P.map(function (p, i) { return (i ? "L" : "M") + X(i).toFixed(1) + "," + Y(p[1]).toFixed(1); }).join("");
    el("path", { d: d + "L" + X(P.length - 1) + "," + Y(0) + "L" + X(0) + "," + Y(0) + "Z", "class": "area" }, svg);
    var line = el("path", { d: d, "class": "line" }, svg);
    if (!reduce && line.getTotalLength) { var len = line.getTotalLength(); line.style.strokeDasharray = len; line.style.strokeDashoffset = len; whenSeen(c, function () { line.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: 1400, fill: "forwards", easing: "ease-out" }); }); }
    var mi = 0; P.forEach(function (p, i) { if (p[1] < P[mi][1]) mi = i; });
    el("circle", { cx: X(mi), cy: Y(P[mi][1]), r: 5, "class": "dot" }, svg);
    var ly = pt + 14, lx = Math.min(X(mi) + 8, W - 120); el("line", { x1: X(mi), x2: X(mi), y1: ly + 4, y2: Y(P[mi][1]) - 6, "class": "xh" }, svg); el("text", { x: lx, y: ly, "class": "lbl" }, svg).textContent = T("lowest ", "ต่ำสุด ") + P[mi][1] + " GB · " + dayLabel(P[mi][0]);
    var xh = el("line", { y1: pt, y2: H - pb, "class": "xh", opacity: 0 }, svg), dt = el("circle", { r: 5, "class": "dot", opacity: 0 }, svg), tip = tipFor(c);
    function move(ev) {
      var sb = svg.getBoundingClientRect(), rb = c.getBoundingClientRect(), sc = sb.width / W;
      var cx = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - sb.left) / sc, i = Math.max(0, Math.min(P.length - 1, Math.round((cx - pl) / (W - pl - pr) * (P.length - 1))));
      xh.setAttribute("x1", X(i)); xh.setAttribute("x2", X(i)); xh.setAttribute("opacity", 1);
      dt.setAttribute("cx", X(i)); dt.setAttribute("cy", Y(P[i][1])); dt.setAttribute("opacity", 1);
      tip.show(X(i) * sc + sb.left - rb.left, Y(P[i][1]) * sc + sb.top - rb.top, dayLabel(P[i][0]) + " · " + P[i][1] + " GB");
    }
    svg.addEventListener("mousemove", move); svg.addEventListener("touchstart", move, { passive: true }); svg.addEventListener("touchmove", move, { passive: true });
    svg.addEventListener("mouseleave", function () { tip.hide(); xh.setAttribute("opacity", 0); dt.setAttribute("opacity", 0); });
  };

  TOYS.wipe = function (box) {
    box.innerHTML = "<h5>" + T("8 October, the Mot Dang repo", "8 ตุลาคม รีโปมดแดง") + "</h5><div class='row'><span class='clock'>08:23</span><span class='server'><i></i>" + T("server copy", "สำเนาบนเซิร์ฟเวอร์") + "</span></div>" +
      "<div class='grid179'></div><p class='tiny'>" + T("One square ≈ 100 untracked files. Blue: 175 edited tracked files.", "หนึ่งช่อง ≈ ไฟล์ที่ไม่ได้ติดตาม 100 ไฟล์ สีฟ้า: ไฟล์ที่ติดตามแต่แก้ไว้ 175 ไฟล์") + "</p>" +
      "<div class='row'><button class='btn go'>" + T("19:11 · “put everything back”", "19:11 · “คืนทุกอย่างกลับที่เดิม”") + "</button><button class='btn alt back' disabled>" + T("Restore from the server", "กู้จากเซิร์ฟเวอร์") + "</button></div><p class='tiny msg'></p>";
    var g = $(".grid179", box), clock = $(".clock", box), srv = $(".server", box), msg = $(".msg", box), go = $(".go", box), back = $(".back", box);
    for (var i = 0; i < 181; i++) { var q = document.createElement("i"); if (i >= 179) q.className = "t"; g.appendChild(q); }
    var sq = $$("i", g);
    go.onclick = function () {
      go.disabled = true; clock.textContent = "19:11";
      shuffle(sq.slice()).forEach(function (q, k) { setTimeout(function () { q.classList.add("gone"); }, reduce ? 0 : k * 9); });
      setTimeout(function () { msg.textContent = T("≈17,900 files gone, 12,960 of them pictures. Git holds none of them.", "หายไป ≈17,900 ไฟล์ เป็นรูป 12,960 รูป git ไม่มีสักไฟล์"); back.disabled = false; }, reduce ? 0 : 1800);
    };
    back.onclick = function () {
      back.disabled = true; clock.textContent = T("9 Oct", "9 ต.ค."); srv.classList.add("glow");
      sq.forEach(function (q, k) { setTimeout(function () { q.classList.remove("gone"); }, reduce ? 0 : k * 7); });
      setTimeout(function () { srv.classList.remove("glow"); msg.textContent = T("Back from the 08:23 copy, two minutes older than the trouble.", "กลับมาจากสำเนา 08:23 ก่อนเกิดเรื่องสองนาที"); go.disabled = false; clock.textContent = "08:23"; }, reduce ? 0 : 1600);
    };
  };

  TOYS.flame = function (box) {
    var F = [["build failures", "สร้างพัง", 64], ["import failures", "นำเข้าพัง", 39], ["deploy failures", "ดีพลอยพัง", 21], ["gate refusals", "ด่านปฏิเสธ", 17]];
    box.innerHTML = "<h5>" + T("Where 939 seconds went", "939 วินาทีหายไปไหน") + "</h5>" +
      "<div class='flame'><div style='flex-grow:96;background:var(--s2)' data-t='" + T("one function re-reading a 140 MB file · 96%", "ฟังก์ชันเดียวอ่านไฟล์ 140 MB ซ้ำ · 96%") + "'>96%</div><div style='flex-grow:4;background:var(--s1)' data-t='" + T("everything else · 4%", "ที่เหลือทั้งหมด · 4%") + "'>4%</div></div>" +
      "<p class='tiny ft'>" + T("Tap a segment.", "แตะที่แถบ") + "</p><div class='row'><button class='btn'>" + T("One shared read", "อ่านครั้งเดียวใช้ร่วมกัน") + "</button></div>" +
      "<div class='hbars bt'><div class='r'><span>" + T("before", "ก่อน") + "</span><div class='t' style='width:100%;background:var(--s2)'></div><span class='v'>210m</span></div><div class='r'><span>" + T("after", "หลัง") + "</span><div class='t' style='width:100%'></div><span class='v'>210m</span></div></div>" +
      "<h5 style='margin-top:14px'>" + T("What the Mac logged", "สิ่งที่แมคบันทึกไว้") + "</h5><div class='hbars fl'>" +
      F.map(function (f) { return "<div class='r'><span>" + (TH ? f[1] : f[0]) + "</span><div class='t' style='width:" + (f[2] / 64 * 100) + "%'></div><span class='v'>" + f[2] + "</span></div>"; }).join("") + "</div>";
    var ft = $(".ft", box);
    $$(".flame div", box).forEach(function (s) { s.onclick = function () { ft.textContent = s.getAttribute("data-t"); }; });
    var after = $$(".bt .r", box)[1];
    $("button", box).onclick = function () { $(".t", after).style.width = (93 / 210 * 100) + "%"; $(".v", after).textContent = "93m"; $(".t", after).style.background = "var(--jade)"; };
  };

  TOYS.funnel = function (box) {
    var S = [[D.commits, T("commits", "คอมมิต")], [D.public, T("public repos", "รีโปสาธารณะ")], [D.asks, T("outbound asks", "ข้อเสนอที่ส่งออก")], [1, T("paying client", "ลูกค้าที่จ่ายเงิน")], ["US$" + D.usd_in, T("cash in", "เงินเข้า")]];
    box.innerHTML = "<h5>" + T("From commits to cash", "จากคอมมิตสู่เงินสด") + "</h5><div class='ladder'>" +
      S.map(function (s) { return "<div><span>" + s[1] + "</span><b>" + (typeof s[0] === "number" ? fmt(s[0]) : s[0]) + "</b></div>"; }).join("") + "</div>" +
      "<h5 style='margin-top:14px'>" + T("Find the people: 1,000 requests to motdang.net, 16–22 Sep", "หาคนให้เจอ: 1,000 คำขอถึง motdang.net 16–22 ก.ย.") + "</h5><div class='humans'></div>" +
      "<div class='row'><span class='score'>0 / 4</span><span class='tiny'>" + T("85% AI crawlers · 6% SEO bots · 0.4% shaped like people", "ครอว์เลอร์ AI 85% · บอท SEO 6% · ดูเป็นคน 0.4%") + "</span><button class='btn alt'>" + T("Shuffle", "สับใหม่") + "</button></div>";
    $$(".ladder div", box).forEach(function (r) { r.onclick = function () { r.animate && r.animate([{ transform: "scale(1.04)" }, { transform: "none" }], { duration: 250 }); }; });
    var hb = $(".humans", box), sc = $(".score", box), found = 0;
    function deal() {
      hb.innerHTML = ""; found = 0; sc.textContent = "0 / 4";
      var who = {}; shuffle(Array.apply(null, Array(1000)).map(function (_, i) { return i; })).slice(0, 4).forEach(function (i) { who[i] = 1; });
      for (var i = 0; i < 1000; i++) {
        var d = document.createElement("i"); d.setAttribute("data-h", who[i] ? 1 : 0);
        d.onclick = function () {
          if (this.getAttribute("data-h") === "1") { if (!this.classList.contains("found")) { this.classList.add("found"); found++; sc.textContent = found + " / 4"; } }
          else this.classList.add("miss");
        };
        hb.appendChild(d);
      }
    }
    $("button", box).onclick = deal; deal();
  };

  $$(".toy").forEach(function (t) { var f = TOYS[t.getAttribute("data-toy")]; if (f) try { f(t); } catch (e) { t.textContent = ""; if (window.console) console.error(e); } });

  /* ---------- share ---------- */
  var sb = $(".sharebar");
  if (sb) {
    var u = sb.getAttribute("data-url"), ti = sb.getAttribute("data-title"), q = encodeURIComponent;
    var links = [["line", "LINE", "https://social-plugins.line.me/lineit/share?url=" + q(u)], ["", "Facebook", "https://www.facebook.com/sharer/sharer.php?u=" + q(u)], ["", "Bluesky", "https://bsky.app/intent/compose?text=" + q(ti + " " + u)], ["", "Mastodon", "https://mastodonshare.com/?text=" + q(ti) + "&url=" + q(u)]];
    if (navigator.share) { var ns = document.createElement("button"); ns.textContent = m.share + " …"; ns.onclick = function () { navigator.share({ title: ti, url: u }).catch(function () {}); }; sb.appendChild(ns); }
    links.forEach(function (l) { var a = document.createElement("a"); a.className = l[0]; a.textContent = l[1]; a.href = l[2]; a.target = "_blank"; a.rel = "noopener"; sb.appendChild(a); });
    var cp = document.createElement("button"); cp.textContent = m.copy;
    cp.onclick = function () { (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { cp.textContent = m.copied; setTimeout(function () { cp.textContent = m.copy; }, 1500); }).catch(function () { prompt(m.copy, u); }); };
    sb.appendChild(cp);
  }

  /* ---------- top bar steps aside on scroll down ---------- */
  var lastY = scrollY, acc = 0;
  addEventListener("scroll", function () {
    var y = scrollY, d = y - lastY; lastY = y;
    if (y < 80) { document.body.classList.remove("nav-away"); acc = 0; return; }
    acc = (d > 0) === (acc > 0) ? acc + d : d;
    if (acc > 24) document.body.classList.add("nav-away"); else if (acc < -60) document.body.classList.remove("nav-away");
  }, { passive: true });
})();
