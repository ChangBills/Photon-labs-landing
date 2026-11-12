/* Animación didáctica del efecto fotoeléctrico / fotovoltaico dentro de una celda.
   No usa datos oficiales: es una ilustración. Física de referencia: E = h·f = hc/λ. */
(function () {
  'use strict';
  const cv = document.getElementById('c-foto');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const EG = 1.12, HC = 1239.84, C_THZ = 299792.458, E_MAX = 3.4, VIS = [1.65, 3.1];
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const f = (x, n = 2) => Number(x).toFixed(n);
  const sci = (x) => { const e = Math.floor(Math.log10(x)); return `${f(x / Math.pow(10, e), 1)} × 10<sup>${e}</sup>`; };

  let W = 600, H = 380, dpr = 1;
  let st = { gInc: 1, cf: 1, theta: 30, luz: 'sol', nm: null, ratioI: 1, pRatio: 1, iOp: 1, vTxt: '', iTxt: '', pTxt: '', rTxt: '' };
  let parts = [], flowOff = 0, spawnAcc = 0;
  let playing = !reduce, visible = true, last = 0, raf = 0;
  const $ = (s) => document.querySelector(s);

  /* ---------- Geometría ---------- */
  function L() {
    const m = W < 480;
    return {
      m,
      x0: W * (m ? 0.035 : 0.05), x1: W * 0.64, xw: W * 0.855,
      yN: H * 0.25, yJ0: H * 0.38, yJ1: H * 0.45, yP1: H * 0.88, yB: H * 0.93,
      yR0: H * 0.46, yR1: H * 0.70, fs: m ? 10.5 : 12.5,
    };
  }
  function pathPts(l) {
    const yT = l.yN - 2, yBot = l.yB + 2;
    return [[l.x1, yT], [l.xw, yT], [l.xw, yBot], [l.x1, yBot]];
  }
  function pathLen(pts) { let t = 0; for (let i = 1; i < pts.length; i++) t += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return t; }
  function pathAt(pts, s) {
    for (let i = 1; i < pts.length; i++) {
      const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (s <= d) { const k = d ? s / d : 0; return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]; }
      s -= d;
    }
    return pts[pts.length - 1];
  }

  /* ---------- Partículas ---------- */
  const rnd = (a, b) => a + Math.random() * (b - a);
  const hue = (nm) => Math.max(0, Math.min(240, 240 - (nm - 450) * 1.18));
  function pickWl() {
    if (st.nm) return st.nm;
    return Math.random() < 0.18 ? rnd(1250, 1500) : rnd(430, 700);
  }
  function spawnPhoton() {
    const l = L(), nm = pickWl(), ir = nm > HC / EG;
    const back = st.theta === null;
    const phi = back ? 0 : Math.min(st.theta, 50) * Math.PI / 180;
    const tn = Math.tan(phi), v = 170;
    if (back) {
      parts.push({ t: 'ph', x: rnd(l.x0 + 6, l.x1 - 6), y: H + 4, vx: 0, vy: -v, nm, ir, up: true });
      return;
    }
    const lo = Math.max(l.x0 + 4, 4 + tn * l.yN), hi = l.x1 - 4;
    const land = rnd(lo, Math.max(lo + 1, hi));
    const tt = (nm - 400) / 300;
    const yAbs = ir ? 1e9 : H * (0.27 + 0.5 * Math.max(0, Math.min(1, tt)));
    parts.push({ t: 'ph', x: land - tn * l.yN, y: 0, vx: v * Math.sin(phi), vy: v * Math.cos(phi), nm, ir, yAbs });
  }
  function flash(x, y, col) { parts.push({ t: 'f', x, y, life: 0.35, col }); }
  function absorb(p) {
    const e = HC / p.nm, frac = Math.max(0, 1 - EG / e);
    parts.push({ t: 'e', x: p.x, y: p.y, life: 0, ph: 'x' });
    parts.push({ t: 'h', x: p.x + rnd(-3, 3), y: p.y + rnd(2, 5), life: 0, ph: 'x' });
    flash(p.x, p.y, 'hsl(' + hue(p.nm) + ',90%,55%)');
    if (Math.random() < frac * 1.2) parts.push({ t: 'q', x: p.x, y: p.y, life: 0.9, s: rnd(0, 6.28) });
  }
  function flowing() { return st.iOp >= 0.002; }

  function step(dt) {
    const l = L(), pts = pathPts(l), len = pathLen(pts);
    const rate = st.gInc > 0.004 ? Math.min(40, 3 + 32 * st.gInc) : 0;
    spawnAcc += rate * dt;
    while (spawnAcc >= 1) { spawnAcc -= 1; if (parts.length < 260) spawnPhoton(); }
    const speed = st.iOp >= 0.002 ? 14 + 150 * Math.sqrt(Math.min(1, st.ratioI)) : 0;
    flowOff = (flowOff + speed * dt) % 22;
    let piles = 0;
    for (const p of parts) if (p.ph === 'pile') piles++;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.t === 'ph') {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.up) { if (p.y <= l.yB) { flash(p.x, l.yB, '#8EC5FF'); parts.splice(i, 1); } continue; }
        if (!p.ir && p.y >= p.yAbs) { absorb(p); parts.splice(i, 1); continue; }
        if (p.y > H + 6 || p.x > W + 6) parts.splice(i, 1);
      } else if (p.t === 'e') {
        p.life += dt;
        if (p.ph === 'pile') { p.x += rnd(-8, 8) * dt; if (p.life > 2.4) parts.splice(i, 1); continue; }
        const ay = p.y > l.yJ1 ? 40 : p.y > l.yJ0 ? 170 : 90;
        p.y -= ay * dt; p.x += rnd(-14, 14) * dt;
        p.x = Math.max(l.x0 + 4, Math.min(l.x1 - 4, p.x));
        if (p.y <= l.yN + 2) {
          if (flowing()) { flash(p.x, l.yN - 2, '#2F80ED'); parts.splice(i, 1); }
          else if (piles < 36) { p.ph = 'pile'; p.life = 0; p.y = rnd(l.yN + 6, l.yJ0 - 5); piles++; }
          else parts.splice(i, 1);
        }
      } else if (p.t === 'h') {
        p.life += dt;
        if (p.ph === 'pile') { p.x += rnd(-8, 8) * dt; if (p.life > 2.4) parts.splice(i, 1); continue; }
        const ay = p.y < l.yJ0 ? 90 : p.y < l.yJ1 ? 170 : 95;
        p.y += ay * dt; p.x += rnd(-14, 14) * dt;
        p.x = Math.max(l.x0 + 4, Math.min(l.x1 - 4, p.x));
        if (p.y >= l.yP1 - 3) {
          if (flowing()) { flash(p.x, l.yP1, '#F5A300'); parts.splice(i, 1); }
          else if (piles < 36) { p.ph = 'pile'; p.life = 0; p.y = rnd(l.yP1 - 26, l.yP1 - 5); piles++; }
          else parts.splice(i, 1);
        }
      } else if (p.t === 'q') {
        p.life -= dt; p.y -= 12 * dt; p.x += Math.sin(p.s + p.life * 14) * 0.6;
        if (p.life <= 0) parts.splice(i, 1);
      } else if (p.t === 'f') {
        p.life -= dt; if (p.life <= 0) parts.splice(i, 1);
      }
    }
    return { pts, len };
  }

  /* ---------- Dibujo ---------- */
  function lbl(t, x, y, o) {
    o = o || {};
    ctx.font = `${o.b ? '600 ' : ''}${o.fs || L().fs}px Inter, system-ui, sans-serif`;
    ctx.fillStyle = o.c || '#101828'; ctx.textAlign = o.a || 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(t, x, y);
  }
  function draw() {
    const l = L(), pts = pathPts(l), len = pathLen(pts);
    ctx.clearRect(0, 0, W, H);
    const w = l.x1 - l.x0;
    // capas
    ctx.fillStyle = 'rgba(47,128,237,.17)'; ctx.fillRect(l.x0, l.yN, w, l.yJ0 - l.yN);
    ctx.fillStyle = 'rgba(25,195,230,.28)'; ctx.fillRect(l.x0, l.yJ0, w, l.yJ1 - l.yJ0);
    ctx.fillStyle = 'rgba(245,163,0,.15)'; ctx.fillRect(l.x0, l.yJ1, w, l.yP1 - l.yJ1);
    ctx.strokeStyle = 'rgba(11,42,91,.35)'; ctx.lineWidth = 1; ctx.strokeRect(l.x0 + .5, l.yN + .5, w - 1, l.yP1 - l.yN - 1);
    // campo eléctrico en la unión (de n hacia p, hacia abajo)
    ctx.strokeStyle = '#0F4DBC'; ctx.fillStyle = '#0F4DBC'; ctx.lineWidth = 1.5;
    const na = l.m ? 4 : 6;
    for (let i = 0; i < na; i++) {
      const x = l.x0 + w * (0.08 + 0.84 * (i / (na - 1))), y0 = l.yJ0 + 4, y1 = l.yJ1 - 4;
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 3, y1 - 4); ctx.lineTo(x, y1); ctx.lineTo(x + 3, y1 - 4); ctx.stroke();
    }
    // contactos
    ctx.fillStyle = '#0B2A5B';
    const dx = 18;
    for (let x = l.x0; x < l.x1 - 2; x += dx) ctx.fillRect(x, l.yN - 5, 5, 5); // rejilla frontal (dedos)
    ctx.fillRect(l.x0, l.yN - 5, w, 2);
    ctx.fillRect(l.x0, l.yP1, w, l.yB - l.yP1 + 2);
    // cable
    ctx.strokeStyle = '#0B2A5B'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    const yT = pts[0][1], yBot = pts[2][1];
    ctx.beginPath(); ctx.moveTo(l.x1, yT); ctx.lineTo(l.xw, yT); ctx.lineTo(l.xw, l.yR0); ctx.moveTo(l.xw, l.yR1); ctx.lineTo(l.xw, yBot); ctx.lineTo(l.x1, yBot); ctx.stroke();
    // resistencia (brilla según potencia)
    const glow = Math.max(0, Math.min(1, st.pRatio));
    if (glow > 0.01) {
      const g = ctx.createRadialGradient(l.xw, (l.yR0 + l.yR1) / 2, 2, l.xw, (l.yR0 + l.yR1) / 2, 46);
      g.addColorStop(0, `rgba(255,194,46,${0.15 + 0.6 * glow})`); g.addColorStop(1, 'rgba(255,194,46,0)');
      ctx.fillStyle = g; ctx.fillRect(l.xw - 50, l.yR0 - 20, 100, l.yR1 - l.yR0 + 40);
    }
    ctx.strokeStyle = glow > 0.4 ? '#F5A300' : '#0B2A5B'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(l.xw, l.yR0);
    const nz = 7, h = l.yR1 - l.yR0;
    for (let i = 0; i < nz; i++) { ctx.lineTo(l.xw + (i % 2 ? 9 : -9), l.yR0 + h * (i + 0.5) / nz); }
    ctx.lineTo(l.xw, l.yR1); ctx.stroke();
    // puntos de electrones en el cable
    const n = Math.round(len / 22), mov = flowing();
    ctx.fillStyle = mov ? '#2F80ED' : 'rgba(47,128,237,.35)';
    for (let i = 0; i < n; i++) {
      let s = (i * 22 + flowOff) % len, pt = pathAt(pts, s);
      if (pt[0] === l.xw && pt[1] > l.yR0 - 1 && pt[1] < l.yR1 + 1) pt = [l.xw + ((Math.floor(pt[1] / 6) % 2) ? 6 : -6), pt[1]];
      ctx.beginPath(); ctx.arc(pt[0], pt[1], 2.6, 0, 6.283); ctx.fill();
    }
    // partículas
    for (const p of parts) {
      if (p.t === 'ph') {
        const col = p.ir ? '#7A1F5C' : `hsl(${hue(p.nm)},92%,52%)`;
        const sp = Math.hypot(p.vx, p.vy) || 1;
        ctx.strokeStyle = p.ir ? 'rgba(122,31,92,.35)' : `hsla(${hue(p.nm)},92%,52%,.4)`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p.x - p.vx / sp * 12, p.y - p.vy / sp * 12); ctx.lineTo(p.x, p.y); ctx.stroke();
        ctx.beginPath(); ctx.arc(p.x, p.y, 3.4, 0, 6.283);
        if (p.ir) { ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.stroke(); } else { ctx.fillStyle = col; ctx.fill(); }
      } else if (p.t === 'e') {
        const a = p.ph === 'pile' ? Math.max(0, Math.min(1, (2.4 - p.life) / 0.8)) : 1;
        ctx.globalAlpha = a; ctx.fillStyle = '#2F80ED'; ctx.beginPath(); ctx.arc(p.x, p.y, 4.3, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(p.x - 2, p.y - .6, 4, 1.3); ctx.globalAlpha = 1;
      } else if (p.t === 'h') {
        const a = p.ph === 'pile' ? Math.max(0, Math.min(1, (2.4 - p.life) / 0.8)) : 1;
        ctx.globalAlpha = a; ctx.strokeStyle = '#B87400'; ctx.fillStyle = '#FFF4D1'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, 4.3, 0, 6.283); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#B87400'; ctx.fillRect(p.x - 2, p.y - .6, 4, 1.3); ctx.fillRect(p.x - .6, p.y - 2, 1.3, 4); ctx.globalAlpha = 1;
      } else if (p.t === 'q') {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 0.5)); ctx.fillStyle = '#E8590C';
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
      } else if (p.t === 'f') {
        const k = 1 - p.life / 0.35; ctx.globalAlpha = 1 - k; ctx.strokeStyle = p.col; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, 4 + 10 * k, 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    // etiquetas
    const m = l.m;
    lbl(m ? 'Capa n (sobran e⁻)' : 'Capa n · sobran electrones', l.x0 + 6, (l.yN + l.yJ0) / 2 + 1, { b: 1, c: '#0F4DBC', fs: l.fs - 1 });
    lbl(m ? 'Unión p‑n' : 'Unión p‑n · campo eléctrico', l.x0 + 6, (l.yJ0 + l.yJ1) / 2, { b: 1, c: '#0B2A5B', fs: l.fs - 2 });
    lbl(m ? 'Capa p (huecos)' : 'Capa p · faltan electrones (huecos)', l.x0 + 6, l.yP1 - 11, { b: 1, c: '#8A5A00', fs: l.fs - 1 });
    lbl('Contacto trasero', l.x0 + w / 2, (l.yP1 + l.yB) / 2 + 1, { c: '#fff', a: 'center', fs: l.fs - 2, b: 1 });
    lbl('Rejilla frontal', l.x0, l.yN - 12, { c: '#0B2A5B', fs: l.fs - 2 });
    lbl('Carga', l.xw, l.yR0 - 14, { b: 1, c: '#0B2A5B', a: 'center' });
    const x = l.xw, y = l.yR1 + 16;
    lbl(st.rTxt, x, y, { a: 'center', fs: l.fs - 1, c: '#475467' });
    lbl(st.vTxt, x, y + 16, { a: 'center', b: 1 });
    lbl(st.iTxt, x, y + 32, { a: 'center', b: 1 });
    lbl(st.pTxt, x, y + 48, { a: 'center', b: 1, c: '#8A5A00' });
    const info = st.theta === null ? 'Luz por detrás: solo llega luz difusa' : `Luz a ${f(st.theta, 0)}° de la perpendicular`;
    lbl(info, W - 6, 10, { a: 'right', fs: l.fs - 1.5, c: '#475467' });
  }

  /* ---------- Ciclo ---------- */
  function frame(ts) {
    raf = 0;
    if (!playing || !visible || document.hidden) { last = 0; return; }
    if (!last) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    step(dt); draw();
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf && playing && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }

  function size() {
    const w = Math.max(280, Math.round(cv.parentElement.clientWidth));
    W = w; H = w < 480 ? 340 : w < 760 ? 360 : 380;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    parts = [];
    for (let i = 0; i < 90; i++) step(0.04);
    draw();
  }

  /* ---------- Textos de energía ---------- */
  function textos() {
    const pos = (e) => `${Math.min(100, e / E_MAX * 100)}%`;
    $('#eg-umbral').style.left = pos(EG);
    $('#eg-vis').style.left = pos(VIS[0]); $('#eg-vis').style.width = `${(VIS[1] - VIS[0]) / E_MAX * 100}%`;
    const fo = $('#eg-foton'), tx = $('#eg-texto'), rs = $('#foto-resumen');
    const lambda0 = HC / EG, f0 = C_THZ / lambda0;
    if (st.nm) {
      const e = HC / st.nm, fr = C_THZ / st.nm, ok = e >= EG;
      fo.style.display = 'block'; fo.style.left = pos(e); fo.style.background = ok ? '#1a7f4e' : '#b42318';
      tx.innerHTML = `Luz de <b>${f(st.nm, 0)} nm</b>: f = c/λ = ${f(fr, 0)} THz, y cada fotón trae E = h·f = <b>${f(e, 2)} eV</b>. ` +
        (ok ? `Como ${f(e, 2)} ≥ ${EG}, <b>sí libera un electrón</b>${e - EG > 0.02 ? ` y los ${f(e - EG, 2)} eV que sobran se vuelven calor` : ''}.`
            : `Como ${f(e, 2)} &lt; ${EG}, <b>no alcanza para liberar un electrón</b>: el fotón atraviesa el silicio. El mínimo del silicio es ${f(f0, 0)} THz (${f(lambda0, 0)} nm); por debajo de esa frecuencia no hay efecto.`);
    } else {
      fo.style.display = 'none';
      tx.innerHTML = `La luz del Sol mezcla todos los colores. La banda coloreada es la luz visible (≈ 1.65 a 3.10 eV): cada fotón visible supera los ${EG} eV y libera un electrón. El infrarrojo lejano (más allá de ${f(lambda0, 0)} nm) no alcanza y atraviesa la celda. Elige un solo color para ver la diferencia.`;
    }
    let r;
    if (st.gInc <= 0.004) r = 'Sin luz no llegan fotones: no hay electrones libres ni corriente.';
    else if (st.nm && st.cf === 0) r = 'Llegan fotones, pero ninguno trae energía suficiente: no se libera ningún electrón y el cable queda quieto. Más intensidad solo significa más fotones inútiles.';
    else if (st.iOp < 0.002) r = 'Los electrones liberados suben a la capa n pero el circuito está abierto, no tienen por dónde salir y se acumulan. Esa acumulación es el voltaje.';
    else {
      const q = 1.602176634e-19, ne = st.iOp / q;
      r = `Con esta carga pasan unos ${sci(ne)} electrones por segundo por el cable (I ÷ carga del electrón, cálculo). La corriente convencional se dibuja al revés: va del contacto trasero al frontal.`;
      if (st.nm) { const ph = st.G * st.gInc / (HC / st.nm * q); r += ` Llegan ≈ ${sci(ph)} fotones por m² por segundo.`; }
    }
    rs.innerHTML = r;
  }

  function update(p) {
    st = Object.assign(st, p);
    textos();
    if (!playing) draw();
  }

  /* ---------- Inicio ---------- */
  const esc = $('#eg-escala');
  if (esc) esc.innerHTML = [0, 1, 2, 3].map((v) => `<span style="left:${v / E_MAX * 100}%">${v}${v === 3 ? ' eV' : ''}</span>`).join('');
  const btn = $('#foto-play');
  function setPlay(v) {
    playing = v;
    btn.setAttribute('aria-pressed', String(v));
    btn.textContent = v ? '⏸ Pausar' : '▶ Reproducir';
    if (v) kick(); else draw();
  }
  btn.addEventListener('click', () => setPlay(!playing));
  if (!playing) { btn.setAttribute('aria-pressed', 'false'); btn.textContent = '▶ Reproducir'; }
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) kick(); }, { threshold: 0.05 }).observe(cv);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });
  let rt = 0;
  const ro = new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(() => { size(); kick(); }, 120); });
  ro.observe(cv.parentElement);
  size(); textos(); kick();

  window.CeldaAnim = { update, setPlay };
})();
