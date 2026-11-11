/* Laboratorio solar (landing) · A01744124
   Modelo de diodo simplificado ajustado con la etiqueta del panel.
   I(V) = g·Isc − I0·(exp(V/a) − 1)   con   a = C2·Voc,  I0 = Isc·C1
   C2 = (Vmp/Voc − 1) / ln(1 − Imp/Isc),  C1 = (1 − Imp/Isc)·exp(−Vmp/a)
   La luz solo escala la fotocorriente (g = G_total / 1000 W/m²). Sin temperatura. */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const rad = (d) => (d * Math.PI) / 180;
  const deg = (r) => (r * 180) / Math.PI;
  const f = (x, n = 2) => Number(x).toFixed(n);
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';

  let D = null;            // datos/solar.json
  let M = null;            // parámetros del modelo ajustado
  let chart = null;
  let pendiente = false;
  const S = { beta: 30, h: 60, G: 1000, d: 0, op: 'mpp', rIdx: 50, pos: 'optimo' };
  const P = { voc: 0, isc: 0, vmp: 0, imp: 0 };

  /* ---------- Modelo ---------- */
  function ajusta(p) {
    if (!(p.voc > 0 && p.isc > 0 && p.vmp > 0 && p.imp > 0)) return null;
    if (!(p.vmp < p.voc && p.imp < p.isc)) return null;
    const r = 1 - p.imp / p.isc;
    const c2 = (p.vmp / p.voc - 1) / Math.log(r);
    const a = c2 * p.voc;
    const c1 = r * Math.exp(-p.vmp / a);
    if (!isFinite(a) || !isFinite(c1) || a <= 0) return null;
    return { a, i0: p.isc * c1, isc: p.isc, voc: p.voc };
  }
  const corr = (m, g, v) => g * m.isc - m.i0 * (Math.exp(v / m.a) - 1);
  const vocG = (m, g) => (g <= 0 ? 0 : m.a * Math.log(1 + (g * m.isc) / m.i0));
  const gEq = (m, v) => (m.i0 / m.isc) * (Math.exp(v / m.a) - 1);
  function mpp(m, g) {
    const vo = vocG(m, g);
    let b = { v: 0, i: 0, p: 0 };
    if (vo <= 0) return b;
    for (let k = 0; k <= 800; k++) {
      const v = (vo * k) / 800, i = Math.max(0, corr(m, g, v)), pw = v * i;
      if (pw > b.p) b = { v, i, p: pw };
    }
    return b;
  }
  function resuelveCarga(m, g, R) {
    const vo = vocG(m, g);
    if (vo <= 0) return { v: 0, i: 0 };
    let lo = 0, hi = vo;
    for (let k = 0; k < 70; k++) {
      const mid = (lo + hi) / 2;
      if (corr(m, g, mid) - mid / R > 0) lo = mid; else hi = mid;
    }
    const v = (lo + hi) / 2;
    return { v, i: v / R };
  }
  const rDeIdx = (i) => Math.pow(10, -1 + (4 * i) / 100);
  const idxDeR = (r) => Math.max(0, Math.min(100, Math.round(((Math.log10(r) + 1) / 4) * 100)));

  function geometria() {
    const cosT = Math.sin(rad(S.beta + S.h));
    const directo = Math.max(0, cosT);
    const theta = cosT >= 0 ? deg(Math.acos(Math.min(1, cosT))) : null;
    const g = (S.G * directo + (S.G * S.d) / 100) / 1000;
    return { cosT, directo, theta, g };
  }

  /* ---------- Formatos ---------- */
  function fPct(g) {
    const p = g * 100;
    if (p < 0.1) return p.toFixed(3);
    if (p < 10) return p.toFixed(1);
    return p.toFixed(0);
  }
  function fCorr(a) {
    if (a >= 1) return f(a, 2) + ' A';
    const ma = a * 1000;
    return (ma < 1 ? f(ma, 2) : ma < 10 ? f(ma, 1) : f(ma, 0)) + ' mA';
  }

  /* ---------- Tarjetas de las 3 posiciones ---------- */
  function iconoPos(beta) {
    const b = beta === null ? 30 : beta;
    return `<svg viewBox="0 0 52 42" aria-hidden="true"><line x1="0" y1="39" x2="52" y2="39" stroke="#8EC5FF" stroke-width="2"/>
      <g transform="translate(26 24) rotate(${b})"><rect x="-17" y="-5" width="34" height="5" rx="1.5" fill="#0F4DBC"/><rect x="-17" y="0" width="34" height="3" rx="1.5" fill="#D3E3FA" stroke="#8EC5FF" stroke-width=".8"/></g>
      <line x1="26" y1="24" x2="26" y2="39" stroke="#0B2A5B" stroke-width="2"/>
      ${beta === 180 ? '' : '<circle cx="44" cy="8" r="5" fill="#FFC22E"/>'}</svg>`;
  }
  function tarjetas() {
    const cont = $('#pos-cards');
    cont.innerHTML = D.posiciones.map((p) => {
      const v = p.voltaje, c = p.corriente;
      const g = M ? gEq(M, v.v) : null;
      const calc = M
        ? `Con ese voltaje, el modelo estima una luz equivalente de <b>≈ ${fPct(g)} %</b> de 1000 W/m² <span class="sello calculo">Cálculo</span><br>Con esa luz esperaría una corriente de <b>≈ ${fCorr(g * M.isc)}</b>; mediste <b>${c.v < 1 ? f(c.v * 1000, 0) + ' mA' : f(c.v, 2) + ' A'}</b>.`
        : '<span class="sello nd">Dato no disponible</span> Revisa los datos de la placa.';
      return `<article class="pos-card" data-pos="${p.id}">
        <div class="pos-cab"><span class="pos-ico">${iconoPos(p.beta)}</span><div><h3>${p.titulo}</h3><p>${p.detalle}</p></div></div>
        <div class="pos-med">
          <div class="pos-m"><span class="k">Voltaje</span><b>${f(v.v)}<small>${v.u}</small></b>
            <img src="assets/solar/lectura-${v.foto}.jpg" width="360" height="290" loading="lazy" alt="Pantalla del multímetro con ${f(v.v)} V">
            ${v.nota ? '<span class="sello confirmar">Lectura borrosa</span>' : '<span class="sello medido">Medición propia</span>'}</div>
          <div class="pos-m"><span class="k">Corriente</span><b>${c.v * 1000 < 1000 ? f(c.v * 1000, 0) : f(c.v, 2)}<small>${c.v * 1000 < 1000 ? 'mA' : 'A'}</small></b>
            <img src="assets/solar/lectura-${c.foto}.jpg" width="360" height="290" loading="lazy" alt="Pantalla del multímetro con ${f(c.v, 3)} A">
            <span class="sello medido">Medición propia</span></div>
        </div>
        <p class="pos-calc">${calc}</p>
        <div class="pos-pie"><button type="button" class="filtro" data-sim="${p.id}">Simular esta posición</button></div>
      </article>`;
    }).join('');
    cont.querySelectorAll('[data-sim]').forEach((b) => b.addEventListener('click', () => {
      setPos(b.dataset.sim);
      $('#t-ctrl-solar').scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'start' });
    }));
    marcaActiva();
  }
  function avisoCorriente() {
    const el = $('#aviso-corriente');
    const mA = D.posiciones.map((p) => f(p.corriente.v * 1000, 0)).join(', ');
    el.hidden = false;
    el.innerHTML = `<strong>Ojo con las corrientes.</strong> El multímetro marcó ${mA} mA, pero la etiqueta de un panel de 100 W indica unos ${f(D.panel.isc.v, 2)} A de corriente de cortocircuito (<span class="sello confirmar">por confirmar</span>). Tocaste las puntas directo a los cables del panel y la punta roja estaba en la entrada de mA, que se protege a 400 mA. Con el panel en cortocircuito debería marcar mucho más, así que lo más probable es que el contacto de las puntas limitara la corriente. Por eso <strong>el simulador parte de la etiqueta</strong> y no de esas corrientes. Si repites la medición con la punta roja en la entrada de 10 A, cambia los valores en <code>datos/solar.json</code>.`;
  }
  function marcaActiva() {
    document.querySelectorAll('.pos-card').forEach((c) => c.classList.toggle('activa', c.dataset.pos === S.pos));
    document.querySelectorAll('#seg-pos [data-pos]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pos === S.pos)));
  }

  /* ---------- Controles ---------- */
  function setPos(id) {
    S.pos = id;
    if (id === 'abajo') S.beta = 180;
    else if (id === 'piso') S.beta = 0;
    else S.beta = Math.round(90 - S.h);
    S.d = S.d; // la luz difusa es del usuario
    sincroniza(); marcaActiva(); pide();
  }
  function setOp(op) {
    S.op = op;
    document.querySelectorAll('#op-rapidos [data-op]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.op === op)));
    if (op === 'cc') S.rIdx = 0;
    if (op === 'ca') S.rIdx = 100;
    $('#s-r').value = S.rIdx;
    pide();
  }
  function sincroniza() {
    $('#s-beta').value = S.beta; $('#n-beta').value = S.beta;
    $('#s-h').value = S.h; $('#n-h').value = S.h;
    $('#s-g').value = S.G; $('#n-g').value = S.G;
    $('#s-d').value = S.d; $('#n-d').value = S.d;
    $('#s-r').value = S.rIdx;
  }
  function liga(rId, nId, clave, min, max, alCambiar) {
    const r = $(rId), n = $(nId);
    const aplica = (val) => {
      let x = parseFloat(val);
      if (!isFinite(x)) return;
      x = Math.max(min, Math.min(max, x));
      S[clave] = x; r.value = x;
      if (document.activeElement !== n) n.value = x;
      alCambiar && alCambiar();
      pide();
    };
    r.addEventListener('input', () => { n.value = r.value; aplica(r.value); });
    n.addEventListener('input', () => aplica(n.value));
    n.addEventListener('change', () => { n.value = S[clave]; });
  }

  /* ---------- Dibujo ---------- */
  function dibuja(geo) {
    const C = { x: 230, y: 176 };
    const sx = Math.cos(rad(S.h)), sy = -Math.sin(rad(S.h));
    const px = Math.sin(rad(S.h)), py = Math.cos(rad(S.h));
    $('#sv-sol-g').setAttribute('transform', `translate(${(C.x + 150 * sx).toFixed(1)} ${(C.y + 150 * sy).toFixed(1)})`);
    $('#sv-panel').setAttribute('transform', `translate(${C.x} ${C.y}) rotate(${S.beta})`);
    const rayos = $('#sv-rayos');
    const op = (0.25 + 0.75 * Math.min(1, geo.g)).toFixed(2);
    rayos.setAttribute('stroke-opacity', geo.g > 0 ? op : '0.12');
    rayos.innerHTML = [-40, -14, 14, 40].map((o) => {
      const x1 = C.x + sx * 118 + px * o, y1 = C.y + sy * 118 + py * o;
      const x2 = C.x + sx * 20 + px * o * 0.9, y2 = C.y + sy * 20 + py * o * 0.9;
      return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
    }).join('');
    const nx = Math.sin(rad(S.beta)), ny = -Math.cos(rad(S.beta));
    let len = 58;
    if (ny > 0) len = Math.min(len, (236 - C.y) / ny);
    const nl = $('#sv-normal');
    nl.setAttribute('x1', C.x); nl.setAttribute('y1', C.y);
    nl.setAttribute('x2', (C.x + nx * len).toFixed(1)); nl.setAttribute('y2', (C.y + ny * len).toFixed(1));
    const t = $('#sv-txt');
    t.textContent = geo.theta === null ? 'La luz directa pega por detrás' : `θ = ${f(geo.theta, 0)}°`;
    const desc = `Panel con inclinación ${S.beta}°, sol a ${S.h}° sobre el horizonte. ` +
      (geo.theta === null ? 'La luz directa llega por la parte de atrás del panel.' : `Ángulo de incidencia ${f(geo.theta, 0)}°.`);
    $('#sv-desc').textContent = desc;
    $('#solar-svg').setAttribute('aria-label', 'Ilustración del panel solar y el sol. ' + desc);
  }

  /* ---------- Gráfica ---------- */
  function creaGrafica() {
    if (typeof Chart === 'undefined') {
      $('#g-iv').parentElement.innerHTML = '<p class="nodisp"><strong>Dato no disponible</strong>No se cargó la librería de gráficas.</p>';
      return;
    }
    Chart.defaults.font.family = '"Inter", system-ui, sans-serif';
    Chart.defaults.color = '#101828';
    const eje = (t, pos, color, grid) => ({
      type: 'linear', position: pos, min: 0,
      title: { display: true, text: t, color },
      ticks: { color, maxTicksLimit: 7 },
      grid: { color: grid ? '#EEF3FB' : 'transparent', drawOnChartArea: grid },
      border: { display: false },
    });
    chart = new Chart($('#g-iv'), {
      type: 'line',
      data: {
        datasets: [
          { label: 'Corriente', data: [], yAxisID: 'y', borderColor: '#0F4DBC', backgroundColor: '#0F4DBC', borderWidth: 3, pointRadius: 0, tension: 0 },
          { label: 'Potencia', data: [], yAxisID: 'y2', borderColor: '#C77D00', backgroundColor: '#C77D00', borderWidth: 3, pointRadius: 0, tension: 0 },
          { label: 'Carga', data: [], yAxisID: 'y', borderColor: '#8A97AD', borderWidth: 2, borderDash: [6, 5], pointRadius: 0 },
          { label: 'Máxima potencia', data: [], yAxisID: 'y2', showLine: false, pointStyle: 'rectRot', pointRadius: 7, borderColor: '#C77D00', backgroundColor: '#FFF4D1', borderWidth: 2 },
          { label: 'Tu punto', data: [], yAxisID: 'y', showLine: false, pointRadius: 8, borderColor: '#0B2A5B', backgroundColor: '#FFC22E', borderWidth: 3 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false, parsing: false,
        interaction: { mode: 'nearest', axis: 'x', intersect: false },
        scales: {
          x: eje('Voltaje (V)', 'bottom', '#101828', true),
          y: eje('Corriente (A)', 'left', '#0F4DBC', true),
          y2: eje('Potencia (W)', 'right', '#8A5600', false),
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0B2A5B', padding: 10, cornerRadius: 10,
            filter: (c) => c.datasetIndex !== 2,
            callbacks: {
              title: (it) => `${f(it[0].parsed.x, 2)} V`,
              label: (c) => (c.datasetIndex === 1 || c.datasetIndex === 3) ? ` Potencia: ${f(c.parsed.y, 2)} W` : ` Corriente: ${f(c.parsed.y, 3)} A`,
            },
          },
        },
      },
    });
  }
  function actualizaGrafica(geo, op) {
    if (!chart) return;
    const g = geo.g, vo = vocG(M, g);
    const xmax = Math.ceil(P.voc * 1.05), xmaxFin = Math.max(xmax, Math.ceil(vocG(M, Math.max(1, g)) * 1.03));
    const gRef = Math.max(1, g);
    const ymaxI = Math.ceil(P.isc * gRef * 1.12);
    const pRef = mpp(M, gRef).p;
    const ymaxP = Math.max(Math.ceil((pRef * 1.12) / 10) * 10, 10);
    const iv = [], pw = [];
    if (vo > 0) {
      const N = 160;
      for (let k = 0; k <= N; k++) {
        const v = (vo * k) / N, i = Math.max(0, corr(M, g, v));
        iv.push({ x: v, y: i }); pw.push({ x: v, y: v * i });
      }
      iv.push({ x: vo, y: 0 }); pw.push({ x: vo, y: 0 });
    }
    const carga = [];
    if (S.op === 'R' && g > 0) {
      const R = rDeIdx(S.rIdx);
      const xe = Math.min(xmaxFin, R * ymaxI);
      carga.push({ x: 0, y: 0 }, { x: xe, y: xe / R });
    }
    const m = mpp(M, g);
    const d = chart.data.datasets;
    d[0].data = iv; d[1].data = pw; d[2].data = carga;
    d[3].data = g > 0 ? [{ x: m.v, y: m.p }] : [];
    d[4].data = [{ x: op.v, y: op.i }];
    chart.options.scales.x.max = xmaxFin;
    chart.options.scales.y.max = ymaxI;
    chart.options.scales.y2.max = ymaxP;
    chart.update('none');
  }

  /* ---------- Cálculo y salida ---------- */
  function render() {
    pendiente = false;
    if (!M) return;
    const geo = geometria();
    const g = geo.g, vo = vocG(M, g), m = mpp(M, g);
    let op, rTxt;
    if (S.op === 'cc') { op = { v: 0, i: Math.max(0, corr(M, g, 0)) }; rTxt = '0 Ω (cortocircuito)'; }
    else if (S.op === 'ca') { op = { v: vo, i: 0 }; rTxt = '∞ (circuito abierto)'; }
    else if (S.op === 'mpp') {
      op = { v: m.v, i: m.i };
      const R = m.i > 0 ? m.v / m.i : null;
      rTxt = R ? `${f(R, R < 10 ? 2 : 1)} Ω` : '—';
      if (R) { S.rIdx = idxDeR(R); $('#s-r').value = S.rIdx; }
    } else {
      const R = rDeIdx(S.rIdx);
      op = resuelveCarga(M, g, R);
      rTxt = `${f(R, R < 10 ? 2 : R < 100 ? 1 : 0)} Ω`;
    }
    $('#o-r').textContent = rTxt;
    $('#k-theta').textContent = geo.theta === null ? '> 90°' : `${f(geo.theta, 0)}°`;
    $('#k-g').innerHTML = `${f(g * 1000, 0)}<small> W/m²</small>`;
    $('#k-voc').innerHTML = `${f(vo, 2)}<small> V</small>`;
    $('#k-isc').innerHTML = `${f(g * M.isc, 2)}<small> A</small>`;
    const pOp = op.v * op.i;
    $('#o-v').innerHTML = `${f(op.v, 2)} <small>V</small>`;
    $('#o-i').innerHTML = op.i >= 0.1 ? `${f(op.i, 2)} <small>A</small>` : `${f(op.i * 1000, 0)} <small>mA</small>`;
    $('#o-p').innerHTML = `${f(pOp, 2)} <small>W</small>`;
    const nom = D.panel.pmax.v;
    $('#o-pm').innerHTML = `${f(m.p, 1)} <small>W · ${f((100 * m.p) / nom, 0)} % de los ${nom} W de la etiqueta</small>`;
    const frac = m.p > 0 ? Math.min(1, pOp / m.p) : 0;
    const bar = $('#o-bar');
    bar.style.width = `${(frac * 100).toFixed(0)}%`;
    bar.style.background = frac >= 0.9 ? '#1a7f4e' : frac >= 0.6 ? '#F5A300' : '#b42318';
    let msg;
    if (g <= 0) msg = 'Sin luz directa ni difusa el modelo no genera nada. Tu panel boca abajo sí marcó ' + f(D.posiciones[0].voltaje.v, 2) + ' V: algo de luz llegó, y el voltaje responde a muy poca luz.';
    else if (S.op === 'cc') msg = 'En cortocircuito la corriente es la máxima, pero el voltaje es cero, así que la potencia es cero. Así se mide la corriente con el amperímetro.';
    else if (S.op === 'ca') msg = 'En circuito abierto el voltaje es el máximo, pero la corriente es cero, así que la potencia es cero. Así se mide el voltaje con el voltímetro.';
    else if (S.op === 'mpp') msg = `Es el punto de máxima potencia. Con una carga de ${rTxt} el panel entrega todo lo que puede con esta luz.`;
    else msg = `Con esta carga el panel aprovecha ${f(frac * 100, 0)} % de su potencia máxima. Para sacarle todo, la carga ideal sería de ${m.i > 0 ? f(m.v / m.i, 1) : '—'} Ω.`;
    $('#o-aviso').textContent = msg;
    dibuja(geo);
    actualizaGrafica(geo, op);
  }
  function pide() { if (!pendiente) { pendiente = true; requestAnimationFrame(render); } }

  /* ---------- Datos de la placa ---------- */
  function leePlaca() {
    P.voc = parseFloat($('#p-voc').value); P.isc = parseFloat($('#p-isc').value);
    P.vmp = parseFloat($('#p-vmp').value); P.imp = parseFloat($('#p-imp').value);
    const nuevo = ajusta(P);
    const nota = $('#nota-placa');
    if (!nuevo) {
      nota.className = 'nota-placa error';
      nota.textContent = 'Revisa los datos: Voc debe ser mayor que Vmp, e Isc mayor que Imp.';
      return;
    }
    M = nuevo;
    nota.className = 'nota-placa';
    nota.innerHTML = `Vmp, Imp y los ${D.panel.pmax.v} W salen bien en la foto de la etiqueta. <strong>Voc y Isc están borrosos</strong>: se leyeron ${f(D.panel.voc.v, 1)} V y ${f(D.panel.isc.v, 2)} A. Si tu etiqueta dice otra cosa, corrígelo aquí. ${D.panel.stc}`;
    const chip = (t, v, u, est, cls) => `<span class="chip-p"><b>${t}</b> ${f(v, t === 'Imp' || t === 'Isc' ? 2 : 1)} ${u} <span class="sello ${cls}">${est}</span></span>`;
    const igual = (x, y) => Math.abs(x - y) < 1e-9;
    const conf = (k) => !igual(P[k], D.panel[k].v) ? ['Corregido por ti', 'medido'] : D.panel[k].estado === 'confirmar' ? ['Por confirmar', 'confirmar'] : ['Etiqueta', 'placa'];
    $('#placa-chips').innerHTML = [['Vmp', 'vmp', 'V'], ['Imp', 'imp', 'A'], ['Voc', 'voc', 'V'], ['Isc', 'isc', 'A']]
      .map(([t, k, u]) => chip(t, P[k], u, conf(k)[0], conf(k)[1])).join('');
    tarjetas(); pide();
  }
  function ponPlacaInicial() {
    $('#p-voc').value = D.panel.voc.v; $('#p-isc').value = D.panel.isc.v;
    $('#p-vmp').value = D.panel.vmp.v; $('#p-imp').value = D.panel.imp.v;
    leePlaca();
  }

  /* ---------- Inicio ---------- */
  function iniciaSvg() {
    const c = $('#sv-celdas');
    c.innerHTML = [-48, -24, 0, 24, 48].map((x) => `<line x1="${x}" y1="-8" x2="${x}" y2="0"/>`).join('');
  }
  function iniciar() {
    iniciaSvg(); creaGrafica();
    ponPlacaInicial(); avisoCorriente();
    S.beta = Math.round(90 - S.h);
    sincroniza();
    liga('#s-beta', '#n-beta', 'beta', 0, 180, () => { S.pos = null; marcaActiva(); });
    liga('#s-h', '#n-h', 'h', 5, 90, () => { if (S.pos === 'optimo') { S.beta = Math.round(90 - S.h); $('#s-beta').value = S.beta; $('#n-beta').value = S.beta; } });
    liga('#s-g', '#n-g', 'G', 100, 1000);
    liga('#s-d', '#n-d', 'd', 0, 30);
    $('#s-r').addEventListener('input', () => {
      S.rIdx = +$('#s-r').value; S.op = 'R';
      document.querySelectorAll('#op-rapidos [data-op]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      pide();
    });
    document.querySelectorAll('#seg-pos [data-pos]').forEach((b) => b.addEventListener('click', () => setPos(b.dataset.pos)));
    document.querySelectorAll('#op-rapidos [data-op]').forEach((b) => b.addEventListener('click', () => setOp(b.dataset.op)));
    ['#p-voc', '#p-isc', '#p-vmp', '#p-imp'].forEach((id) => $(id).addEventListener('input', leePlaca));
    $('#p-reset').addEventListener('click', ponPlacaInicial);
    marcaActiva(); pide();
  }

  const root = $('#solar');
  if (!root) return;
  fetch('datos/solar.json', { cache: 'no-cache' })
    .then((r) => r.json())
    .then((d) => { D = d; iniciar(); })
    .catch((e) => {
      console.error(e);
      $('#pos-cards').innerHTML = '<p class="nodisp"><strong>Dato no disponible</strong>No se pudieron cargar las mediciones del experimento. Abre el sitio desde su dirección publicada o desde un servidor local.</p>';
    });
})();
