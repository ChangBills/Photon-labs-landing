/* Atlas Eléctrico · Módulo 4 · ¿Sabías que?
   Datos: datos/sabias.json (scripts/construir_sabias.py). Ninguna cifra se escribe a mano aquí. */
(function () {
  const fmt = (x, d = 0) => Number(x).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d });
  const dec = (x) => { if (Number.isInteger(x)) return 0; const t = String(+x.toFixed(2)).split('.')[1]; return t ? t.length : 0; };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
  Chart.defaults.color = '#5B6B85';
  if (reduce) Chart.defaults.animation = false;
  const TIP = { backgroundColor: '#0B2A5B', padding: 10, titleFont: { family: 'Poppins' } };
  const TEMAS = { recursos: { n: 'Recursos', c: '#1baf7a', ct: '#0E7A55', num: 0 }, generacion: { n: 'Generación', c: '#eb6834', ct: '#B5461C', num: 1 }, transmision: { n: 'Transmisión', c: '#0F4DBC', ct: '#0F4DBC', num: 2 }, distribucion: { n: 'Distribución', c: '#F5A300', ct: '#8A5A00', num: 3 } };
  const SELLO = { oficial: '<span class="sello oficial">Dato oficial</span>', calculo: '<span class="sello calculo">Cálculo</span>' };
  let S, filtro = 'todos', ep = 'r2013', ev = 0, rep = 0;
  const charts = {};

  fetch('datos/sabias.json', { cache: 'no-cache' }).then((r) => r.json()).then((d) => { S = d; iniciar(); }).catch((e) => { console.error(e);
    $('#rejilla').innerHTML = '<div class="nodisp"><strong>No se pudieron cargar los datos.</strong>Abre el sitio desde un servidor (GitHub Pages o «python -m http.server»).</div>'; });

  const fuente = (f) => `${f.url ? `<a href="${f.url}" target="_blank" rel="noopener">${f.doc}</a>` : f.doc}${f.pag && f.pag !== 'web' && f.pag !== '—' ? (/^arts?\./.test(f.pag) ? `, ${f.pag}` : `, p. ${f.pag}`) : ''}${f.extra ? ` (${f.extra})` : ''}`;

  function iniciar() {
    $('#temas').innerHTML = `<button type="button" class="filtro" data-t="todos" aria-pressed="true">Todos <b>20</b></button>` +
      Object.entries(TEMAS).map(([k, t]) => `<button type="button" class="filtro" data-t="${k}" aria-pressed="false"><i class="pt" style="background:${t.c}"></i>${t.n} <b>${S.hallazgos.filter((h) => h.tema === k).length}</b></button>`).join('');
    $$('[data-t]').forEach((b) => b.addEventListener('click', () => { filtro = b.dataset.t; tarjetas(); }));
    $('#sorpresa').addEventListener('click', sorpresa);
    tarjetas(); linea(); estructura(); repercusiones(); revelar();
  }

  /* ---------- Tarjetas ---------- */
  function tarjetas() {
    $$('[data-t]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.t === filtro)));
    Object.keys(charts).filter((k) => k.startsWith('h')).forEach((k) => { charts[k].destroy(); delete charts[k]; });
    const hs = S.hallazgos.filter((h) => filtro === 'todos' || h.tema === filtro);
    $('#cuenta').textContent = `${hs.length} hallazgo${hs.length === 1 ? '' : 's'}${filtro === 'todos' ? '' : ' de ' + TEMAS[filtro].n.toLowerCase()}.`;
    $('#rejilla').innerHTML = hs.map((h) => {
      const t = TEMAS[h.tema];
      return `<article class="hallazgo-c" id="c-${h.id}" style="--c:${t.c}">
        <div class="h-cab"><span class="h-tema" style="color:${t.ct}">${t.num} · ${t.n}</span><span class="h-num">${h.id.toUpperCase()}</span></div>
        <h3>${h.pregunta}</h3>
        <div class="h-valor"><b data-v="${h.valor}">${fmt(h.valor, dec(h.valor))}</b><span>${h.unidad}</span></div>
        ${SELLO[h.sello]}
        <div class="h-viz" id="v-${h.id}"></div>
        <details class="h-mas"><summary>¿Por qué?</summary><p>${h.explica}</p></details>
        <p class="fuente"><strong>Fuente:</strong> ${h.fuentes.map(fuente).join(' · ')}</p>
      </article>`;
    }).join('');
    hs.forEach(viz);
    if (!reduce) $$('.hallazgo-c').forEach((el, i) => { el.style.animationDelay = `${i * 40}ms`; el.classList.add('entra'); });
  }
  function sorpresa() {
    if (filtro !== 'todos') { filtro = 'todos'; tarjetas(); }
    const h = S.hallazgos[Math.floor(Math.random() * S.hallazgos.length)], el = $('#c-' + h.id);
    $$('.hallazgo-c.destaca').forEach((e) => e.classList.remove('destaca'));
    el.classList.add('destaca'); el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    $('details', el).open = true;
  }
  function lienzo(id, h = 150) { $('#v-' + id).innerHTML = `<div style="position:relative;height:${h}px"><canvas aria-label="Gráfica del hallazgo"></canvas></div>`; return $('#v-' + id + ' canvas'); }
  function viz(h) {
    const v = h.viz, u = v.u || '';
    const opt = ({ plugins: pX = {}, ...extra } = {}) => ({ maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (c) => `${c.dataset.label ? c.dataset.label + ': ' : ''}${fmt(c.raw?.y ?? c.raw, 1)} ${u}` } }, ...pX }, ...extra });
    if (v.tipo === 'barrasH') {
      charts['h' + h.id] = new Chart(lienzo(h.id, 30 + 26 * v.etiquetas.length), { type: 'bar', data: { labels: v.etiquetas, datasets: [{ label: v.directas ? 'Ciclo de vida' : '', data: v.valores, backgroundColor: v.colores, borderRadius: 4 }].concat(v.directas ? [{ label: 'Directas (chimenea)', data: v.directas, backgroundColor: '#98A2B3', borderRadius: 4 }] : []) },
        options: opt({ indexAxis: 'y', ...(v.directas ? { plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } } : {}), scales: { x: { type: v.log ? 'logarithmic' : 'linear', grid: { color: '#EAF3FF' }, ticks: { callback: (x) => (v.log && ![10, 100, 1000, 10000, 100000].includes(x) ? '' : fmt(x)), font: { size: 10 } } }, y: { grid: { display: false }, ticks: { font: { size: 11 } } } } }) });
    } else if (v.tipo === 'barras100') {
      charts['h' + h.id] = new Chart(lienzo(h.id, 40 + 34 * v.etiquetas.length), { type: 'bar', data: { labels: v.etiquetas, datasets: v.series.map((s) => ({ label: s.n, data: s.v, backgroundColor: s.c, borderColor: '#fff', borderWidth: 2, borderSkipped: false })) },
        options: opt({ indexAxis: 'y', plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }, tooltip: { ...TIP, callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.raw, 1)} ${u}` } } },
          scales: { x: { stacked: true, max: v.absoluto ? undefined : 100, grid: { color: '#EAF3FF' }, ticks: { font: { size: 10 }, callback: (x) => (v.absoluto ? fmt(x / 1000) + ' mil' : x + ' %') } }, y: { stacked: true, grid: { display: false } } } }) });
    } else if (v.tipo === 'linea') {
      charts['h' + h.id] = new Chart(lienzo(h.id, 160), { type: 'line', data: { labels: v.etiquetas, datasets: v.series.map((s) => ({ label: s.n, data: s.v, borderColor: s.c, backgroundColor: s.c, pointRadius: 2, borderWidth: 2.5, tension: 0.2 })) },
        options: opt({ plugins: { legend: { display: v.series.length > 1, position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } }, tooltip: { ...TIP, mode: 'index', intersect: false, callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.raw, 2)} ${u}` } } },
          scales: { x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 8 } }, y: { grid: { color: '#EAF3FF' }, ticks: { font: { size: 10 }, callback: (x) => fmt(x, Math.abs(x) < 50 ? 2 : 0) } } } }) });
    } else if (v.tipo === 'dona') {
      charts['h' + h.id] = new Chart(lienzo(h.id, 170), { type: 'doughnut', data: { labels: v.etiquetas, datasets: [{ data: v.valores, backgroundColor: v.colores, borderColor: '#fff', borderWidth: 2 }] },
        options: { maintainAspectRatio: false, cutout: '58%', plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11 } } }, tooltip: { ...TIP, callbacks: { label: (c) => { const t = c.dataset.data.reduce((a, b) => a + b, 0); return `${c.label}: ${fmt((100 * c.raw) / t, 1)} %`; } } } } } });
    } else if (v.tipo === 'conjuntos') {
      $('#v-' + h.id).innerHTML = `<div class="conj" role="img" aria-label="Diagrama: lo renovable está dentro de lo limpio; la nuclear es limpia pero no renovable">
        <div class="cj limpia" style="--c:${v.items[1].c}"><span>${v.items[1].n}</span>
          <div class="cj renov" style="--c:${v.items[0].c}"><span>${v.items[0].n}</span><small>sol · viento · agua · geotermia · bioenergía</small></div>
          <div class="cj nuc" style="--c:${v.items[2].c}"><span>${v.items[2].n}</span></div></div></div>
        <ul class="conj-l">${v.items.map((x) => `<li><i style="background:${x.c}"></i><strong>${x.n}:</strong> ${x.d}</li>`).join('')}</ul>`;
    } else if (v.tipo === 'comparar') {
      $('#v-' + h.id).innerHTML = `<div class="comp"><div><b>${fmt(v.a.v)}</b><span>${v.a.u}</span><small>${v.a.n}</small></div><span class="op">÷</span><div><b>${fmt(v.b.v)}</b><span>${v.b.u}</span><small>${v.b.n}</small></div></div>
        <div class="casitas" aria-hidden="true">${Array.from({ length: Math.round(h.valor) }, () => '<svg viewBox="0 0 24 24"><path d="M3 11l9-7 9 7v9H3z" fill="currentColor"/></svg>').join('')}<small>1 casa = 1 millón de hogares</small></div>`;
    } else if (v.tipo === 'escalera') {
      $('#v-' + h.id).innerHTML = `<ol class="mini-esc">${v.pasos.map((p, i) => `<li style="--h:${100 - i * 22}%"><span>${p}</span></li>`).join('')}</ol>`;
    }
  }

  /* ---------- Línea de tiempo ---------- */
  const ETAPAS = { antes: 'Antes de 2013', reforma: '2013-2017: reforma y leyes', 2024: '2024-2025: nuevo marco' };
  const ORDEN_ET = ['antes', 'reforma', '2024'];
  function linea() {
    const L = S.reforma.linea;
    $('#etapas').innerHTML = ORDEN_ET.map((k) => [k, ETAPAS[k]]).map(([k, n]) => `<button type="button" class="filtro" data-et="${k}"><i class="pt et-${k}"></i>${n}</button>`).join('');
    $$('[data-et]').forEach((b) => b.addEventListener('click', () => { ev = L.findIndex((x) => x.etapa === b.dataset.et); pintarLinea(); }));
    pintarLinea();
  }
  function pintarLinea() {
    const L = S.reforma.linea, e = L[ev];
    $$('[data-et]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.et === e.etapa)));
    $('#tiempo').innerHTML = L.map((x, i) => `<button type="button" role="tab" class="hito et-${x.etapa}" aria-selected="${i === ev}" data-i="${i}"><span class="punto"></span><span class="h-fecha">${x.fecha}</span><span class="h-tit">${x.titulo}</span></button>`).join('');
    $$('.hito').forEach((b) => b.addEventListener('click', () => { ev = +b.dataset.i; pintarLinea(); }));
    const sel = $('.hito[aria-selected="true"]'); sel && sel.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduce ? 'auto' : 'smooth' });
    const votos = e.votos ? `<div class="votos"><div class="vb"><i style="width:${(100 * e.votos.favor) / (e.votos.favor + e.votos.contra)}%"></i></div><span><b>${e.votos.favor}</b> a favor · <b>${e.votos.contra}</b> en contra (${fmt((100 * e.votos.favor) / (e.votos.favor + e.votos.contra), 1)} % a favor)</span></div>` : '';
    $('#evento').innerHTML = `<span class="h-fecha grande">${e.fecha}${e.fecha === ETAPAS[e.etapa] ? '' : ` · ${ETAPAS[e.etapa]}`}</span><h3>${e.titulo}</h3><p class="actores"><strong>Actores:</strong> ${e.actores}</p><p>${e.texto}</p>${votos}
      <div class="nav-ev"><button type="button" class="filtro" id="ev-ant" ${ev === 0 ? 'disabled' : ''}>← Anterior</button><span class="gris">${ev + 1} de ${L.length}</span><button type="button" class="filtro" id="ev-sig" ${ev === L.length - 1 ? 'disabled' : ''}>Siguiente →</button></div>
      <p class="fuente"><strong>Fuente:</strong> ${e.fuentes.map(fuente).join(' · ')}${e.fuentes.some((f) => f.url) ? ' <span class="sello nd" style="margin-left:4px">Fuente externa</span>' : ''}</p>`;
    $('#ev-ant').onclick = () => { ev--; pintarLinea(); }; $('#ev-sig').onclick = () => { ev++; pintarLinea(); };
  }

  /* ---------- Estructura ---------- */
  const EPN = { antes: 'Antes de 2013', r2013: 'Reforma 2013-2014', r2025: 'Cambios 2024-2025' };
    function estructura() {
    $$('[data-ep]').forEach((b) => b.addEventListener('click', () => { ep = b.dataset.ep; pintarEst(); }));
    const E = S.reforma.estructura;
    $('#tabla-ref').innerHTML = `<table><thead><tr><th>Actividad</th>${Object.values(EPN).map((n) => `<th>${n}</th>`).join('')}</tr></thead><tbody>${E.map((x) => `<tr><td><strong>${x.act}</strong></td><td>${x.antes}</td><td>${x.r2013}</td><td>${x.r2025}</td></tr>`).join('')}</tbody></table><p class="fuente" style="padding:10px">${[...new Set(E.flatMap((x) => x.f.map(fuente)))].join(' · ')}</p>`;
    pintarEst();
  }
  function pintarEst() {
    $$('[data-ep]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ep === ep)));
    const prev = { antes: null, r2013: 'antes', r2025: 'r2013' }[ep];
    const estatal = (t) => /exclusiv|reservada|organismo|Centro de control|CENACE|Empresa|a cargo de la CFE/.test(t);
    const cambia = (t) => prev && !/^Sigue|conserva/.test(t);
    $('#cadena-ref').innerHTML = S.reforma.estructura.map((x, i) => `<article class="act ${cambia(x[ep]) ? 'cambia' : ''}" style="animation-delay:${i * 60}ms">
      <div class="act-cab"><span class="act-i" aria-hidden="true">${i + 1}</span><h4>${x.act}</h4>${cambia(x[ep]) ? '<span class="cambio">Cambió</span>' : '<span class="cambio igual">Sin cambio</span>'}</div>
      <p>${x[ep]}</p>
      <span class="quien ${estatal(x[ep]) ? 'est' : 'mix'}">${estatal(x[ep]) ? 'Estado' : 'Estado y particulares'}</span>
      <p class="fuente">${x.f.map(fuente).join(' · ')}</p></article>`).join('');
  }

  /* ---------- Repercusiones ---------- */
  function repercusiones() {
    const R = S.reforma.repercusiones;
    $('#rep-tabs').innerHTML = R.map((r, i) => `<button type="button" role="tab" class="filtro" data-rep="${i}" aria-selected="${i === 0}"><b>${i + 1}</b> ${r.n}</button>`).join('');
    $$('[data-rep]').forEach((b) => b.addEventListener('click', () => { rep = +b.dataset.rep; pintarRep(); }));
    pintarRep();
  }
  function pintarRep() {
    const R = S.reforma.repercusiones, r = R[rep];
    $$('[data-rep]').forEach((b) => { b.setAttribute('aria-selected', String(+b.dataset.rep === rep)); b.setAttribute('aria-pressed', String(+b.dataset.rep === rep)); });
    if (charts.rep) { charts.rep.destroy(); delete charts.rep; }
    let extra = '';
    if (r.viz === 'tarifas') extra = `<div class="debate"><div class="lado-d pro"><h4>Lo que planteaba la reforma</h4><p>${r.defensores}</p><p class="fuente">DOF 20/12/2013, art. 25 y transitorio 17 · Plan, Tabla 2.1, p. 19</p></div><div class="lado-d contra"><h4>Lo que critica la CFE</h4><p>${r.criticos}</p><p class="fuente">CFE, Informe Anual 2024, p. 4</p></div></div><p class="mini-nota">Son dos interpretaciones documentadas, no hechos neutrales: la primera es el objetivo escrito en la ley; la segunda, la postura de la CFE en su informe.</p>`;
    const fl = (x) => (Array.isArray(x) ? x : [x]).map(fuente).join(' · ');
    const tri = r.obj ? `<div class="tri-ref"><div><span class="tri-et obj">Objetivo declarado</span><p>${r.obj.t}</p><small>${fl(r.obj.f)}</small></div><div><span class="tri-et ley">Cambio legal</span><p>${r.ley.t}</p><small>${fl(r.ley.f)}</small></div><div><span class="tri-et res">Resultado observado</span><p>${r.texto}</p></div></div>` : `<p>${r.texto}</p>`;
    $('#rep').innerHTML = `<h3>${rep + 1}. ${r.n}</h3>${tri}${r.viz === 'mercado' ? `<div class="hechos-mem">${r.roles.map((x) => `<div class="panel"><h4>${x.q}</h4><p>${x.t}</p><p class="fuente">${fuente(x.f)}</p></div>`).join('')}</div>` : '<div class="lienzo" style="height:300px"><canvas id="g-rep" role="img" aria-label="Gráfica de la repercusión"></canvas></div>'}${extra}<p class="fuente"><strong>Fuentes:</strong> ${r.f.map(fuente).join(' · ')}</p>`;
    const g = $('#g-rep'), base = { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } }, tooltip: { ...TIP } } };
    const marca2013 = { id: 'm13', afterDraw: (c) => { const x = c.scales.x; if (!x || r.viz === 'participacion' || r.viz === 'tarifas') return; const px = x.getPixelForValue(x.getLabels ? x.getLabels().indexOf(2013) : 2013); if (!(px > 0)) return; const { top, bottom } = c.chartArea, k = c.ctx; k.save(); k.strokeStyle = '#F5A300'; k.setLineDash([5, 4]); k.lineWidth = 2; k.beginPath(); k.moveTo(px, top); k.lineTo(px, bottom); k.stroke(); k.fillStyle = '#0B2A5B'; k.font = '600 11px Inter'; k.fillText('Reforma 2013', px + 4, top + 12); k.restore(); } };
    if (r.viz === 'participacion') {
      const d = [...r.datos].sort((a, b) => a.anio - b.anio);
      charts.rep = new Chart(g, { type: 'bar', data: { labels: d.map((x) => `${x.anio} · ${x.n}`), datasets: [{ data: d.map((x) => x.v), backgroundColor: d.map((x) => (x.anio >= 2025 ? '#1baf7a' : '#eb6834')), borderRadius: 6 }] },
        options: { ...base, indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (c) => `${c.raw} %` } } }, scales: { x: { max: 100, ticks: { callback: (x) => x + ' %' }, grid: { color: '#EAF3FF' } }, y: { grid: { display: false } } } } });
    } else if (r.viz === 'capacidad') {
      charts.rep = new Chart(g, { type: 'line', plugins: [marca2013], data: { labels: r.anios, datasets: [{ label: 'Capacidad total (MW)', data: r.total, borderColor: '#0F4DBC', backgroundColor: '#0F4DBC', borderWidth: 3, pointRadius: 3 }, { label: 'Capacidad limpia (MW)', data: r.limpias, borderColor: '#1baf7a', backgroundColor: '#1baf7a', borderWidth: 3, pointRadius: 3 }] },
        options: { ...base, scales: { y: { beginAtZero: true, ticks: { callback: (x) => fmt(x / 1000) + ' mil' }, grid: { color: '#EAF3FF' } }, x: { grid: { display: false } } } } });
    } else if (r.viz === 'limpias') {
      charts.rep = new Chart(g, { type: 'bar', plugins: [marca2013], data: { labels: r.anios, datasets: [{ label: 'Eólica (GWh)', data: r.eol, backgroundColor: '#1baf7a', stack: 'g' }, { label: 'Solar (GWh)', data: r.sol, backgroundColor: '#eda100', stack: 'g' }, { type: 'line', label: '% de la generación', data: r.pct, borderColor: '#0B2A5B', backgroundColor: '#0B2A5B', yAxisID: 'y1', pointRadius: 3 }] },
        options: { ...base, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: (x) => fmt(x / 1000) + ' mil' }, grid: { color: '#EAF3FF' } }, y1: { position: 'right', ticks: { callback: (x) => x + ' %' }, grid: { display: false } } } } });
    } else if (r.viz === 'tarifas') {
      charts.rep = new Chart(g, { type: 'bar', data: { labels: r.precios.map((x) => x.s), datasets: [{ label: 'Valor más bajo 2010-2024 ($/kWh)', data: r.precios.map((x) => x.min), backgroundColor: '#8EC5FF' }, { label: 'Valor de 2024 ($/kWh)', data: r.precios.map((x) => x.v24), backgroundColor: '#e34948' }] },
        options: { ...base, plugins: { ...base.plugins, tooltip: { ...TIP, callbacks: { label: (c) => `${c.dataset.label.split(' (')[0]}${c.datasetIndex === 0 ? ` (${r.precios[c.dataIndex].amin})` : ''}: ${fmt(c.raw, 2)} $/kWh` } } }, scales: { y: { beginAtZero: true, ticks: { callback: (x) => '$' + fmt(x, 2) }, grid: { color: '#EAF3FF' } }, x: { grid: { display: false } } } } });
    }
  }

  function revelar() {
    const els = $$('.revelar');
    if (reduce || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('visible')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); Object.values(charts).forEach((c) => c.resize()); } }), { threshold: 0.03 });
    els.forEach((e) => io.observe(e));
  }
})();
