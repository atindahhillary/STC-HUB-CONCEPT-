(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const D = window.SAVITDiagrams, S = window.SAVIT;
  const fmtKES = (n) => "KES " + Math.round(n).toLocaleString("en-KE");
  const fmtM = (n) => "KES " + (n / 1e6).toFixed(n >= 1e7 ? 1 : 2) + "M";

  /* theme toggle: stored per viewer, page still renders without storage */
  const root = document.documentElement;
  const getStored = () => { try { return localStorage.getItem("savit-theme"); } catch (e) { return null; } };
  const store = (v) => { try { localStorage.setItem("savit-theme", v); } catch (e) {} };
  const applyTheme = (t) => { if (t) root.setAttribute("data-theme", t); };
  applyTheme(getStored());
  const isDark = () => root.getAttribute("data-theme") === "dark" || (!root.getAttribute("data-theme") && matchMedia("(prefers-color-scheme: dark)").matches);
  const syncIcon = () => $$(".theme-toggle i").forEach((i) => (i.className = isDark() ? "ph ph-sun" : "ph ph-moon"));
  syncIcon();
  $$(".theme-toggle").forEach((b) => b.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    applyTheme(next); store(next); syncIcon();
  }));

  /* nav */
  const nav = $(".nav");
  const sentinel = $("#top-sentinel");
  if (sentinel && "IntersectionObserver" in window) {
    new IntersectionObserver(([e]) => nav.classList.toggle("is-scrolled", !e.isIntersecting)).observe(sentinel);
  }
  const menuBtn = $(".nav__menu"), drawer = $(".drawer");
  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      const open = drawer.classList.toggle("is-open");
      menuBtn.setAttribute("aria-expanded", open);
      menuBtn.querySelector("i").className = open ? "ph ph-x" : "ph ph-list";
    });
    $$(".drawer a").forEach((a) => a.addEventListener("click", () => { drawer.classList.remove("is-open"); menuBtn.setAttribute("aria-expanded", false); menuBtn.querySelector("i").className = "ph ph-list"; }));
  }
  // active link by section in view
  const links = $$(".nav__links a");
  const secs = links.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => {
        if (e.isIntersecting) links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    secs.forEach((s) => io.observe(s));
  }

  /* reveal on scroll */
  const reveal = $$(".reveal, .draw");
  if ("IntersectionObserver" in window) {
    const ro = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("is-in"); ro.unobserve(e.target); } }), { threshold: 0.15 });
    reveal.forEach((r) => ro.observe(r));
  } else reveal.forEach((r) => r.classList.add("is-in"));

  /* ---------- building explorer ---------- */
  const isoHost = $("#iso");
  if (isoHost) {
    const { svg, groups } = D.isoBuilding(isoHost, S.zones, { callouts: S.callouts });
    const panel = $("#zone-panel");
    const chips = $$(".zone-chip");
    const show = (key, focusPanel) => {
      const z = S.zones[key];
      svg.classList.add("has-active");
      Object.entries(groups).forEach(([k, g]) => g.classList.toggle("is-active", k === key));
      chips.forEach((c) => c.setAttribute("aria-pressed", c.dataset.zone === key));
      const img = $("img", panel);
      img.style.opacity = 0;
      const next = new Image();
      next.onload = () => { img.src = z.img; img.alt = z.alt; img.style.opacity = 1; };
      next.onerror = () => { img.style.opacity = 1; };
      next.src = z.img;
      const code = $(".zone-code", panel);
      code.style.setProperty("--zc", z.color);
      code.classList.toggle("is-light", !!z.lightText);
      code.innerHTML = "";
      const a = document.createElement("span"); a.textContent = z.code;
      const b = document.createElement("span"); b.textContent = "45G1 · " + z.zone;
      code.append(a, b);
      $("h3", panel).textContent = z.name;
      $(".where", panel).textContent = z.level;
      $(".summary", panel).textContent = z.summary;
      const ul = $(".tags", panel); ul.innerHTML = "";
      z.tags.forEach((t) => { const li = document.createElement("li"); li.textContent = t; ul.appendChild(li); });
      $("[data-k=inside]", panel).textContent = z.inside;
      $("[data-k=users]", panel).textContent = z.users;
      $("[data-k=earns]", panel).textContent = z.earns;
      if (focusPanel) panel.focus({ preventScroll: false });
    };
    Object.entries(groups).forEach(([k, g]) => {
      g.addEventListener("click", () => show(k));
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(k, true); } });
    });
    chips.forEach((c) => c.addEventListener("click", () => show(c.dataset.zone)));
    show("digital");
  }

  /* ---------- other diagrams ---------- */
  const loopHost = $("#loop");
  if (loopHost) D.loop(loopHost, S.loop);
  const fHost = $("#funnel");
  if (fHost && S.pipeline) D.funnel(fHost, S.pipeline);
  const gHost = $("#gantt");
  if (gHost) D.gantt(gHost, S.gantt);
  const F = S.finance;
  if (F) {
    const cov = $("#coverage");
    if (cov) D.stackedBars(cov, {
      aria: "Operating cost cover by source, years 1 to 5",
      years: F.coverage.years,
      series: F.coverage.series,
      max: F.coverage.max, step: F.coverage.step,
      fmt: (v) => (v / 1e6).toFixed(0) + "M",
      labels: F.coverage.labels,
    });
    const dn = $("#donut");
    if (dn) D.donut(dn, F.useOfFunds, F.donutCentre);
  }
  const mapHost = $("#map");
  if (mapHost && "IntersectionObserver" in window) {
    const mo = new IntersectionObserver((ents) => { if (ents[0].isIntersecting) { D.africaMap(mapHost, S.map); mo.disconnect(); } }, { rootMargin: "400px" });
    mo.observe(mapHost);
  } else if (mapHost) D.africaMap(mapHost, S.map);

  /* ---------- sustainability calculator ---------- */
  const calc = $("#calc");
  if (calc && S.calc) {
    const C = S.calc;
    const inputs = $$("input[type=range]", calc);
    let base = "y1";
    const update = () => {
      let monthly = 0;
      inputs.forEach((inp) => {
        const def = C.inputs[inp.name];
        const v = +inp.value;
        $(`output[for=${inp.id}]`, calc).textContent = def.show(v);
        monthly += def.rev(v);
      });
      const opex = C.opex[base];
      const annual = monthly * 12;
      const gap = Math.max(0, opex - annual);
      $("#o-month").textContent = fmtKES(monthly);
      $("#o-year").textContent = fmtM(annual);
      $("#o-cover").textContent = Math.round((annual / opex) * 100) + "%";
      $("#o-gap").textContent = gap ? fmtM(gap) : "Surplus";
      $("#o-base").textContent = (base === "y1" ? "Year 1" : "Year 3") + " costs, " + fmtM(opex);
    };
    const presetBtns = $$("[data-preset]", calc);
    presetBtns.forEach((b) => b.addEventListener("click", () => {
      base = b.dataset.preset;
      const p = C.presets[base];
      inputs.forEach((inp) => { if (p[inp.name] != null) inp.value = p[inp.name]; });
      presetBtns.forEach((x) => {
        const on = x === b;
        x.classList.toggle("btn--ghost", !on);
        x.style.color = on ? "" : "var(--salt)";
        x.style.borderColor = on ? "" : "rgb(255 255 255 / .35)";
      });
      update();
    }));
    inputs.forEach((i) => i.addEventListener("input", update));
    update();
  }

  /* use-of-funds list */
  const ul = $("#use-list");
  if (ul && F) {
    const tot = F.useOfFunds.reduce((s, i) => s + i.v, 0);
    F.useOfFunds.forEach((it) => {
      const row = document.createElement("div");
      row.className = "use-row";
      const sw = document.createElement("i"); sw.style.background = it.c;
      const t = document.createElement("span"); t.textContent = it.t;
      const v = document.createElement("b"); v.textContent = it.v.toFixed(1) + "M · " + Math.round((it.v / tot) * 100) + "%";
      row.append(sw, t, v);
      ul.appendChild(row);
    });
  }

  const y = $("#year"); if (y) y.textContent = new Date().getFullYear();
})();
