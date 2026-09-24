/* Diagram renderers. Each takes a host element plus data from data.js and draws inline SVG,
   so diagrams inherit theme colours through CSS variables. */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const shade = (hex, amt) => {
    // amt -1..1, negative darkens
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p + r); g = Math.round((t - g) * p + g); b = Math.round((t - b) * p + b);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  /* ---------------- Isometric container hub ---------------- */
  const C30 = Math.cos(Math.PI / 6), S30 = 0.5;
  function isoBuilding(host, zones, opts = {}) {
    const s = opts.scale || 30;
    const ox = 14.2 * C30 * s + 100, oy = 9.6 * s + 30;
    const P = (x, y, z) => [ox + (x - y) * C30 * s, oy + (x + y) * S30 * s - z * s];
    const pts = (arr) => arr.map((p) => P(...p).map((v) => v.toFixed(1)).join(",")).join(" ");
    const W = 980, H = 790;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "iso", role: "img", "aria-labelledby": "isoTitle isoDesc" });
    el("title", { id: "isoTitle" }, svg).textContent = "Indicative massing of the five-container L-shaped hub";
    el("desc", { id: "isoDesc" }, svg).textContent =
      "Two containers at ground level form an L around an open commons. Two more sit on the first floor, one cantilevering over a covered stage. The fifth crowns the long arm. Solar fly roofs, a rainwater tank and a stair and platform lift core complete the building.";

    // site + commons paving
    el("polygon", { points: pts([[-1.5, -1.5, 0], [18.5, -1.5, 0], [18.5, 18, 0], [-1.5, 18, 0]]), class: "iso-ground" }, svg);
    const pav = el("g", { opacity: 0.9 }, svg);
    el("polygon", { points: pts([[2.44, 2.44, 0], [15.19, 2.44, 0], [15.19, 14.63, 0], [2.44, 14.63, 0]]), fill: "var(--paper)", stroke: "var(--line-2)", "stroke-dasharray": "4 4" }, pav);
    for (let i = 4; i < 15; i += 1.6) el("line", { x1: P(2.44, i, 0)[0], y1: P(2.44, i, 0)[1], x2: P(15.19, i, 0)[0], y2: P(15.19, i, 0)[1], stroke: "var(--line)", "stroke-width": 0.8 }, pav);

    // market stalls / demo tables in the commons (small boxes)
    const stalls = [[6, 8.5], [9, 8.5], [6, 11.5], [9, 11.5]];
    const box = (g, x0, y0, z0, lx, ly, lz, col, cls = "") => {
      const x1 = x0 + lx, y1 = y0 + ly, z1 = z0 + lz;
      el("polygon", { points: pts([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]), fill: col, class: cls + " face-left" }, g);
      el("polygon", { points: pts([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]), fill: shade(col, -0.22), class: cls + " face-right" }, g);
      el("polygon", { points: pts([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]), fill: shade(col, 0.2), class: cls + " face-top" }, g);
    };

    // stage under cantilever
    const stage = el("g", {}, svg);
    box(stage, 12.6, 0.2, 0, 2.4, 2.1, 0.45, "#8a9a97");

    // Containers, drawn back-to-front
    const Lc = 12.19, Wc = 2.44, Hc = 2.9;
    const layout = {
      digital: { x: 0, y: 0, z: 0, lx: Lc, ly: Wc },
      eco: { x: 0, y: Wc, z: 0, lx: Wc, ly: Lc },
      enterprise: { x: 3.0, y: 0, z: Hc, lx: Lc, ly: Wc },
      make: { x: 0, y: Wc, z: Hc, lx: Wc, ly: Lc },
      studio: { x: 0, y: 0, z: 2 * Hc, lx: Lc, ly: Wc },
    };
    const groups = {};
    const drawContainer = (key) => {
      const z = zones[key], L = layout[key], col = z.color;
      const g = el("g", { class: "iso-box", "data-zone": key, tabindex: 0, role: "button", "aria-label": `${z.name}, ${z.level}` }, svg);
      groups[key] = g;
      const { x, y, lx, ly } = L, z0 = L.z, x1 = x + lx, y1 = y + ly, z1 = z0 + Hc;
      box(g, x, y, z0, lx, ly, Hc, col);
      // corrugation on both visible faces
      const cg = el("g", { stroke: shade(col, -0.35), "stroke-width": 0.7, opacity: 0.55 }, g);
      if (lx > ly) {
        for (let i = x + 0.25; i < x1; i += 0.3) el("line", { x1: P(i, y1, z0 + 0.12)[0], y1: P(i, y1, z0 + 0.12)[1], x2: P(i, y1, z1 - 0.12)[0], y2: P(i, y1, z1 - 0.12)[1] }, cg);
      } else {
        for (let i = y + 0.25; i < y1; i += 0.3) el("line", { x1: P(x1, i, z0 + 0.12)[0], y1: P(x1, i, z0 + 0.12)[1], x2: P(x1, i, z1 - 0.12)[0], y2: P(x1, i, z1 - 0.12)[1] }, cg);
      }
      // glazed openings on the long visible face
      const glass = el("g", { fill: "#bfe3e6", stroke: shade(col, -0.45), "stroke-width": 1 }, g);
      (z.windows || []).forEach(([a, b, zb, zt]) => {
        if (lx > ly) el("polygon", { points: pts([[x + a, y1, z0 + zb], [x + b, y1, z0 + zb], [x + b, y1, z0 + zt], [x + a, y1, z0 + zt]]) }, glass);
        else el("polygon", { points: pts([[x1, y + a, z0 + zb], [x1, y + b, z0 + zb], [x1, y + b, z0 + zt], [x1, y + a, z0 + zt]]) }, glass);
      });
      // container code painted on the face, set in isometric perspective
      const light = z.lightText ? "#1b1606" : "#ffffff";
      if (lx > ly) {
        const [tx, ty] = P(x + 0.5, y1, z0 + 0.55);
        const t = el("text", { transform: `matrix(${C30.toFixed(4)},0.5,0,1,${tx.toFixed(1)},${ty.toFixed(1)})`, fill: light, "font-family": "Inter, sans-serif", "font-size": 9.5, "letter-spacing": "1.2", "pointer-events": "none" }, g);
        t.textContent = z.code;
      } else {
        const [tx, ty] = P(x1, y1 - 0.5, z0 + 0.55);
        const t = el("text", { transform: `matrix(${C30.toFixed(4)},-0.5,0,1,${tx.toFixed(1)},${ty.toFixed(1)})`, fill: light, "font-family": "Inter, sans-serif", "font-size": 9.5, "letter-spacing": "1.2", "pointer-events": "none" }, g);
        t.textContent = z.code;
      }
      return g;
    };

    drawContainer("digital");
    drawContainer("eco");
    // stair + lift core (steel frame) at first-floor corner
    const core = el("g", { stroke: "var(--ink-2)", "stroke-width": 1.4, fill: "none" }, svg);
    const cz = Hc, cz2 = 3 * Hc;
    [[0.2, 0.2], [2.8, 0.2], [2.8, 2.3], [0.2, 2.3]].forEach(([a, b]) => el("line", { x1: P(a, b, cz)[0], y1: P(a, b, cz)[1], x2: P(a, b, cz2)[0], y2: P(a, b, cz2)[1] }, core));
    for (let k = 0; k < 7; k++) {
      const zz = cz + k * 0.45, xx = 0.4 + k * 0.33;
      el("line", { x1: P(xx, 2.3, zz)[0], y1: P(xx, 2.3, zz)[1], x2: P(xx + 0.33, 2.3, zz)[0], y2: P(xx + 0.33, 2.3, zz)[1] }, core);
    }
    drawContainer("enterprise");
    drawContainer("make");
    drawContainer("studio");

    // fly roofs with PV on top of studio and makerspace
    const pv = el("g", {}, svg);
    const roof = (x0, y0, lx, ly, z) => {
      el("polygon", { points: pts([[x0, y0, z], [x0 + lx, y0, z], [x0 + lx, y0 + ly, z], [x0, y0 + ly, z]]), fill: "#1f3c4a", stroke: "#8fb3c2", "stroke-width": 0.8 }, pv);
      const n = Math.round((lx > ly ? lx : ly) / 1.05);
      for (let i = 1; i < n; i++) {
        if (lx > ly) { const xi = x0 + (lx / n) * i; el("line", { x1: P(xi, y0, z)[0], y1: P(xi, y0, z)[1], x2: P(xi, y0 + ly, z)[0], y2: P(xi, y0 + ly, z)[1], stroke: "#8fb3c2", "stroke-width": 0.6 }, pv); }
        else { const yi = y0 + (ly / n) * i; el("line", { x1: P(x0, yi, z)[0], y1: P(x0, yi, z)[1], x2: P(x0 + lx, yi, z)[0], y2: P(x0 + lx, yi, z)[1], stroke: "#8fb3c2", "stroke-width": 0.6 }, pv); }
      }
      // posts
      [[x0, y0 + ly], [x0 + lx, y0 + ly], [x0 + lx, y0]].forEach(([a, b]) => el("line", { x1: P(a, b, z)[0], y1: P(a, b, z)[1], x2: P(a, b, z - 0.55)[0], y2: P(a, b, z - 0.55)[1], stroke: "var(--ink-3)", "stroke-width": 1.2 }, pv));
    };
    roof(-0.3, -0.3, 13.0, 3.0, 3 * Hc + 0.55);
    roof(-0.3, 5.0, 3.0, 9.9, 2 * Hc + 0.55);

    // rainwater tank
    const tank = el("g", {}, svg);
    const [tcx, tcy] = P(16.4, 1.3, 0), r = 0.85 * s, th = 2.4 * s;
    el("rect", { x: tcx - r, y: tcy - th, width: 2 * r, height: th, fill: "#3d7f95" }, tank);
    el("ellipse", { cx: tcx, cy: tcy, rx: r, ry: r * 0.5, fill: "#3d7f95" }, tank);
    el("ellipse", { cx: tcx, cy: tcy - th, rx: r, ry: r * 0.5, fill: "#6aa7ba" }, tank);

    // palms / trees as simple canopies in front
    const tree = (x, y, h) => {
      const [bx, by] = P(x, y, 0), [tx2, ty2] = P(x, y, h);
      el("line", { x1: bx, y1: by, x2: tx2, y2: ty2, stroke: "#6b5a44", "stroke-width": 2.4 }, svg);
      el("circle", { cx: tx2, cy: ty2, r: 17, fill: "#3c8a55", opacity: 0.85 }, svg);
      el("circle", { cx: tx2 + 9, cy: ty2 + 5, r: 12, fill: "#2f7a47", opacity: 0.85 }, svg);
    };
    stalls.forEach(([a, b]) => { box(svg, a, b, 0, 1.6, 0.9, 0.85, "#d9d2c3"); });
    tree(17.6, 6.5, 5.2);
    tree(1.2, 16.6, 4.6);

    // callouts
    const call = (x, y, z, dx, dy, text, anchor = "start") => {
      const [ax, ay] = P(x, y, z);
      const g = el("g", {}, svg);
      el("circle", { cx: ax, cy: ay, r: 3, fill: "var(--accent)" }, g);
      el("polyline", { points: `${ax},${ay} ${ax + dx},${ay + dy} ${ax + dx + (anchor === "start" ? 14 : -14)},${ay + dy}`, class: "iso-callout-line" }, g);
      const lines = text.split("\n");
      lines.forEach((ln, i) => {
        const t = el("text", { x: ax + dx + (anchor === "start" ? 18 : -18), y: ay + dy + 4 + i * 15, "text-anchor": anchor, class: "iso-callout", "font-weight": i === 0 ? 650 : 400 }, g);
        t.textContent = ln;
      });
    };
    const C = opts.callouts || {};
    call(6.5, 1.2, 3 * Hc + 0.55, 30, -52, C.solar || "Solar fly roof\nshades the steel below");
    call(16.4, 1.3, 0.4, 0, 74, C.water || "Rainwater harvesting", "end");
    call(9, 12.5, 0.2, 60, 46, C.commons || "Open Commons\nmarkets, expos, demos");
    call(14, 1.2, Hc, 56, -60, C.stage || "Covered stage");
    call(0.3, 2.3, 2 * Hc, -40, -60, C.core || "Stair + platform\nlift core", "end");

    host.innerHTML = "";
    host.appendChild(svg);
    return { svg, groups };
  }

  /* ---------------- Circular economy loop ---------------- */
  function loop(host, steps) {
    const W = 720, H = 620, cx = W / 2, cy = H / 2, R = 190;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Waste Bridge circular economy loop: " + steps.map((s) => s.t).join(", "), class: "draw" });
    const n = steps.length;
    const defs = el("defs", {}, svg);
    const m = el("marker", { id: "arr", viewBox: "0 0 10 10", refX: 6, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" }, defs);
    el("path", { d: "M0,0 L10,5 L0,10 z", fill: "var(--lagoon)" }, m);
    for (let i = 0; i < n; i++) {
      const a0 = (-90 + (360 / n) * i + 14) * Math.PI / 180;
      const a1 = (-90 + (360 / n) * (i + 1) - 14) * Math.PI / 180;
      const p0 = [cx + R * Math.cos(a0), cy + R * Math.sin(a0)], p1 = [cx + R * Math.cos(a1), cy + R * Math.sin(a1)];
      const path = el("path", { d: `M${p0[0]},${p0[1]} A${R},${R} 0 0 1 ${p1[0]},${p1[1]}`, fill: "none", stroke: "var(--lagoon)", "stroke-width": 3, "marker-end": "url(#arr)", class: "flow" }, svg);
      path.style.setProperty("--len", Math.ceil(R * (a1 - a0)) + 4);
      path.style.transitionDelay = i * 120 + "ms";
    }
    steps.forEach((st, i) => {
      const a = (-90 + (360 / n) * i) * Math.PI / 180;
      const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
      const g = el("g", {}, svg);
      const last = i === n - 1;
      el("circle", { cx: x, cy: y, r: 34, fill: last ? "var(--accent)" : "var(--paper)", stroke: last ? "var(--accent)" : "var(--lagoon)", "stroke-width": 2.5 }, g);
      const num = el("text", { x, y: y + 6, "text-anchor": "middle", "font-family": "Inter, sans-serif", "font-weight": 800, "font-size": 19, fill: last ? "var(--accent-ink)" : "var(--ink)" }, g);
      num.textContent = String(i + 1);
      const lx = cx + (R + 64) * Math.cos(a), ly = cy + (R + 64) * Math.sin(a);
      const anchor = Math.abs(Math.cos(a)) < 0.3 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
      const adj = anchor === "start" ? -8 : anchor === "end" ? 8 : 0;
      const t = el("text", { x: lx + adj, y: ly + (Math.sin(a) < -0.9 ? -8 : 5), "text-anchor": anchor, "font-weight": 700, "font-size": 15, fill: "var(--ink)" }, g);
      t.textContent = st.t;
      if (st.s) {
        const t2 = el("text", { x: lx + adj, y: ly + (Math.sin(a) < -0.9 ? 9 : 22), "text-anchor": anchor, "font-size": 12, fill: "var(--ink-3)" }, g);
        t2.textContent = st.s;
      }
    });
    const c1 = el("text", { x: cx, y: cy - 8, "text-anchor": "middle", "font-family": "Inter, sans-serif", "font-weight": 800, "font-size": 26, fill: "var(--ink)", "letter-spacing": "-0.5" }, svg);
    c1.textContent = "WASTE BRIDGE";
    const c2 = el("text", { x: cx, y: cy + 18, "text-anchor": "middle", "font-size": 13, fill: "var(--ink-3)" }, svg);
    c2.textContent = "digital platform + physical loop";
    host.innerHTML = "";
    host.appendChild(svg);
  }

  /* ---------------- Innovation funnel ---------------- */
  function funnel(host, stages) {
    const W = 700, rowH = 50, H = stages.length * rowH + 10;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Innovation pipeline with indicative annual volumes per stage" });
    const max = Math.max(...stages.map((s) => s.v));
    const barMax = 280, left = 260;
    stages.forEach((st, i) => {
      const y = i * rowH + 6;
      const w = Math.max(26, Math.sqrt(st.v / max) * barMax);
      const g = el("g", {}, svg);
      const t = el("text", { x: 0, y: y + 20, "font-weight": 700, "font-size": 15, fill: "var(--ink)", "font-family": "Inter, sans-serif", "letter-spacing": "0.4" }, g);
      t.textContent = st.t.toUpperCase();
      const t2 = el("text", { x: 0, y: y + 37, "font-size": 12, fill: "var(--ink-3)" }, g);
      t2.textContent = st.s;
      const x0 = left + (barMax - w) / 2;
      const depth = Math.round((i / (stages.length - 1)) * 100);
      const r = el("rect", { x: x0, y: y + 4, width: w, height: rowH - 14, rx: 4 }, g);
      r.setAttribute("style", `fill: color-mix(in srgb, var(--sea) ${depth}%, var(--lagoon))`);
      const v = el("text", { x: left + barMax + 18, y: y + 28, "font-family": "Inter, sans-serif", "font-size": 14, fill: "var(--ink)", "font-weight": 600 }, g);
      v.textContent = st.label || st.v.toLocaleString("en-KE");
    });
    host.innerHTML = "";
    host.appendChild(svg);
  }

  /* ---------------- Gantt ---------------- */
  function gantt(host, g) {
    const months = g.months; // array of labels
    const lanes = g.lanes;
    const W = 980, left = 210, top = 44, rowH = 44, colW = (W - left - 20) / months.length;
    const H = top + lanes.length * rowH + 30;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Implementation roadmap from October 2026 to the May 2027 opening and beyond" });
    months.forEach((m, i) => {
      const x = left + i * colW;
      el("line", { x1: x, y1: top - 12, x2: x, y2: H - 20, stroke: "var(--line)", "stroke-width": 1 }, svg);
      const t = el("text", { x: x + colW / 2, y: top - 20, "text-anchor": "middle", "font-size": 11.5, fill: "var(--ink-3)", "font-family": "Inter, sans-serif" }, svg);
      t.textContent = m;
    });
    lanes.forEach((ln, i) => {
      const y = top + i * rowH;
      const t = el("text", { x: 0, y: y + rowH / 2 + 1, "font-size": 13.5, "font-weight": 650, fill: "var(--ink)" }, svg);
      t.textContent = ln.t;
      const t2 = el("text", { x: 0, y: y + rowH / 2 + 17, "font-size": 11, fill: "var(--ink-3)" }, svg);
      t2.textContent = ln.s || "";
      const x = left + ln.a * colW + 3, w = (ln.b - ln.a) * colW - 6;
      el("rect", { x, y: y + 9, width: w, height: rowH - 18, rx: 6, fill: ln.c }, svg);
      if (ln.m) {
        const mt = el("text", { x: x + 10, y: y + rowH / 2 + 4, "font-size": 11.5, "font-weight": 650, fill: ln.dark ? "#1b1606" : "#fff" }, svg);
        mt.textContent = ln.m;
      }
    });
    if (g.milestone != null) {
      const x = left + g.milestone * colW;
      el("line", { x1: x, y1: top - 8, x2: x, y2: H - 18, stroke: "var(--accent)", "stroke-width": 2.5, "stroke-dasharray": "5 4" }, svg);
      const bx = el("g", {}, svg);
      el("rect", { x: x - 58, y: H - 22, width: 116, height: 20, rx: 10, fill: "var(--accent)" }, bx);
      const t = el("text", { x, y: H - 8, "text-anchor": "middle", "font-size": 11.5, "font-weight": 700, fill: "var(--accent-ink)" }, bx);
      t.textContent = g.milestoneLabel;
    }
    host.innerHTML = "";
    host.appendChild(svg);
  }

  /* ---------------- Stacked bars (cost coverage) ---------------- */
  function stackedBars(host, d) {
    const W = 560, H = 300, left = 44, bottom = 34, top = 16, right = 10;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": d.aria });
    const max = d.max, ih = H - top - bottom, bw = (W - left - right) / d.years.length;
    for (let v = 0; v <= max; v += d.step) {
      const y = top + ih - (v / max) * ih;
      el("line", { x1: left, x2: W - right, y1: y, y2: y, class: "grid" }, svg);
      const t = el("text", { x: left - 8, y: y + 4, "text-anchor": "end", class: "tick" }, svg);
      t.textContent = d.fmt(v);
    }
    d.years.forEach((yr, i) => {
      let acc = 0;
      const x = left + i * bw + bw * 0.2, w = bw * 0.6;
      d.series.forEach((s) => {
        const v = s.v[i];
        const h = (v / max) * ih, y = top + ih - ((acc + v) / max) * ih;
        el("rect", { x, y, width: w, height: Math.max(0, h - 1), fill: s.c, rx: 2 }, svg);
        acc += v;
      });
      const tl = el("text", { x: x + w / 2, y: H - 12, "text-anchor": "middle", class: "tick" }, svg);
      tl.textContent = yr;
      if (d.labels) {
        const lv = el("text", { x: x + w / 2, y: top + ih - (acc / max) * ih - 7, "text-anchor": "middle", class: "val" }, svg);
        lv.textContent = d.labels[i];
      }
    });
    el("line", { x1: left, x2: W - right, y1: top + ih, y2: top + ih, class: "axis" }, svg);
    host.innerHTML = "";
    host.appendChild(svg);
  }

  /* ---------------- Donut ---------------- */
  function donut(host, items, centre) {
    const W = 320, cx = 160, cy = 160, R = 138, r = 86;
    const svg = el("svg", { viewBox: `0 0 ${W} ${W}`, role: "img", "aria-label": "Use of funds: " + items.map((i) => `${i.t} ${i.p}%`).join(", ") });
    let a = -Math.PI / 2;
    const tot = items.reduce((s, i) => s + i.v, 0);
    items.forEach((it) => {
      const da = (it.v / tot) * Math.PI * 2, a2 = a + da, large = da > Math.PI ? 1 : 0;
      const p = (rad, ang) => [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)];
      const [x1, y1] = p(R, a), [x2, y2] = p(R, a2), [x3, y3] = p(r, a2), [x4, y4] = p(r, a);
      el("path", { d: `M${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} L${x3},${y3} A${r},${r} 0 ${large} 0 ${x4},${y4} Z`, fill: it.c, stroke: "var(--paper)", "stroke-width": 2 }, svg);
      a = a2;
    });
    const t1 = el("text", { x: cx, y: cy - 4, "text-anchor": "middle", "font-family": "Inter, sans-serif", "font-weight": 800, "font-size": 30, fill: "var(--ink)" }, svg);
    t1.textContent = centre[0];
    const t2 = el("text", { x: cx, y: cy + 20, "text-anchor": "middle", "font-size": 12.5, fill: "var(--ink-3)" }, svg);
    t2.textContent = centre[1];
    host.innerHTML = "";
    host.appendChild(svg);
  }

  /* ---------------- Africa map (d3-geo + topojson, lazy) ---------------- */
  async function africaMap(host, cfg) {
    const load = (src) => new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    try {
      if (!window.d3) await load("https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js");
      if (!window.topojson) await load("https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js");
      const world = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json").then((r) => r.json());
      const all = topojson.feature(world, world.objects.countries).features;
      const africaIds = new Set(cfg.africa);
      const eaIds = new Set(cfg.eastAfrica);
      const af = all.filter((f) => africaIds.has(f.id));
      const W = 560, H = 600;
      const proj = d3.geoMercator().fitExtent([[10, 10], [W - 130, H - 10]], { type: "FeatureCollection", features: af });
      const path = d3.geoPath(proj);
      const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Map of Africa highlighting Kenya, East Africa and the Mombasa flagship hub" });
      el("rect", { x: 0, y: 0, width: W, height: H, rx: 18, class: "sea" }, svg);
      el("path", { d: path(d3.geoGraticule().step([10, 10])()), class: "grat" }, svg);
      af.forEach((f) => el("path", { d: path(f), class: f.id === cfg.kenya ? "land kenya" : eaIds.has(f.id) ? "land ea" : "land" }, svg));
      const [mx, my] = proj(cfg.mombasa);
      [42, 26].forEach((rr, i) => el("circle", { cx: mx, cy: my, r: rr, class: "ring", opacity: i ? 0.9 : 0.45 }, svg));
      el("circle", { cx: mx, cy: my, r: 6.5, fill: "var(--accent)", stroke: "var(--paper)", "stroke-width": 2 }, svg);
      const lab = el("text", { x: mx + 16, y: my + 44, "font-family": "Inter, sans-serif", "font-weight": 800, "font-size": 15, fill: "var(--ink)" }, svg);
      lab.textContent = "MOMBASA";
      const lab2 = el("text", { x: mx + 16, y: my + 60, "font-size": 12, fill: "var(--ink-3)" }, svg);
      lab2.textContent = "flagship hub, 2027";
      host.innerHTML = "";
      host.appendChild(svg);
    } catch (e) {
      host.innerHTML = '<p class="small muted">Map could not load. Mombasa (flagship) to Kenya county network, then East Africa, then pan-African network.</p>';
    }
  }

  window.SAVITDiagrams = { isoBuilding, loop, funnel, gantt, stackedBars, donut, africaMap, css };
})();
