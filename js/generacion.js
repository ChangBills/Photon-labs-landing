/* Atlas Eléctrico · Módulo 1 · Generación
   Datos: datos/atlas-datos.json (validado en la Etapa 2). Ningún valor se escribe a mano aquí
   salvo textos de definición; las cifras se leen del JSON o se calculan con él. */
(function () {
  const css = getComputedStyle(document.documentElement);
  const v = (n) => css.getPropertyValue(n).trim();
  const fmt = (x, d = 0) => Number(x).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d });
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
  Chart.defaults.color = '#5B6B85';
  if (reduce) Chart.defaults.animation = false;
  const TIP = { backgroundColor: '#0B2A5B', padding: 10, titleFont: { family: 'Poppins' } };
  const ND = '<span class="sello nd">Dato no disponible</span>';
  const alfa = (hex, a) => hex + Math.round(a * 255).toString(16).padStart(2, '0');

  // Íconos de línea (sin emoji)
  const ICO = {
    carbon: '<path d="M3 21V11l5 3v-3l5 3V7l5 3v11z"/><path d="M17 8V3h3v7"/>',
    termica: '<path d="M12 3c2.5 3 5 5.2 5 9a5 5 0 0 1-10 0c0-2 .8-3.3 2-4.4.2 1.9 1.1 3 2.2 3.2C10.8 8.3 11 5.7 12 3z"/>',
    cc: '<circle cx="12" cy="12" r="2.5"/><path d="M12 3.5a8.5 8.5 0 0 1 7.6 4.7M20.5 12a8.5 8.5 0 0 1-4.7 7.6M12 20.5a8.5 8.5 0 0 1-7.6-4.7M3.5 12a8.5 8.5 0 0 1 4.7-7.6"/><path d="M19.6 8.2l.3-3.1M15.8 19.6l3 .4M4.4 15.8l-.4 3M8.2 4.4l-3-.3"/>',
    nuclear: '<circle cx="12" cy="12" r="1.6"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(120 12 12)"/>',
    otras: '<path d="M2 20l6-9 4 5 3-4 7 8z"/><path d="M13 2.5c-1 1-1 2 0 3s1 2 0 3M17 2.5c-1 1-1 2 0 3s1 2 0 3"/>',
    hidro: '<path d="M12 3s6 6.8 6 11a6 6 0 0 1-12 0c0-4.2 6-11 6-11z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
    eolica: '<path d="M12 11v10M8.5 21h7"/><circle cx="12" cy="9.5" r="1.5"/><path d="M12 8V2.5M13.3 10.3l4.8 2.8M10.7 10.3l-4.8 2.8"/>',
    solar: '<rect x="3" y="12" width="18" height="8" rx="1"/><path d="M3 16h18M9 12v8M15 12v8M12 2.5v3M5.5 5.5l2 2M18.5 5.5l-2 2"/>',
  };
  const svg = (k, sw = 1.8) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICO[k]}</svg>`;

  // Familias de tecnologías (orden fijo de la paleta validada)
  const G = [
    { id: 'carbon', n: 'Carboeléctrica', c: v('--t-carbon'), tipo: 'Fósil', def: 'Quema carbón pulverizado en una caldera; el vapor mueve una turbina (ciclo Rankine).' },
    { id: 'termica', n: 'Vapor, turbogás y combustión interna', c: v('--t-termica'), tipo: 'Fósil', def: 'Vapor convencional: caldera de combustóleo o gas y turbina de vapor. Turbogás: turbina de gas sola, de arranque rápido. Combustión interna: motores, sobre todo en sistemas aislados.' },
    { id: 'cc', n: 'Ciclo combinado', c: v('--t-cc'), tipo: 'Fósil', def: 'Turbina de gas más turbina de vapor que aprovecha el calor del escape de la primera.' },
    { id: 'nuclear', n: 'Nucleoeléctrica', c: v('--t-nuclear'), tipo: 'Limpia, no renovable', def: 'El calor de la fisión de uranio produce vapor que mueve una turbina.' },
    { id: 'otras', n: 'Geotérmica y otras limpias', c: v('--t-otras'), tipo: 'Limpia', def: 'Geotermia (vapor del subsuelo). En el dato nacional incluye también bioenergía y cogeneración eficiente (limpia por ley, usa gas).' },
    { id: 'hidro', n: 'Hidroeléctrica', c: v('--t-hidro'), tipo: 'Renovable', def: 'El agua de una presa o río mueve turbinas acopladas a generadores.' },
    { id: 'eolica', n: 'Eólica', c: v('--t-eolica'), tipo: 'Renovable', def: 'Aerogeneradores que convierten la energía cinética del viento.' },
    { id: 'solar', n: 'Solar fotovoltaica', c: v('--t-solar'), tipo: 'Renovable', def: 'Paneles que convierten la luz en corriente directa; un inversor la pasa a alterna.' },
  ];
  const GI = Object.fromEntries(G.map((x) => [x.id, x]));
  const PLAN_G = { 'Carboeléctrica': 'carbon', 'Térmica convencional': 'termica', 'Turbogás': 'termica', 'Combustión interna': 'termica', 'Ciclo combinado': 'cc', 'Nucleoeléctrica': 'nuclear', 'Geotérmica': 'otras', 'Bioenergía': 'otras', 'Cogeneración eficiente': 'otras', 'Hidroeléctrica': 'hidro', 'Eólica': 'eolica', 'Solar fotovoltaica': 'solar' };
  const CFE_G = { 'Ciclo combinado': 'cc', 'Diésel (combustión interna)': 'termica', 'Turbogás': 'termica', 'Vapor convencional': 'termica', 'Turbojet': 'termica', 'Carboeléctrica': 'carbon', 'Geotermoeléctrica': 'otras', 'Nucleoeléctrica': 'nuclear', 'Hidroeléctrica': 'hidro', 'Eoloeléctrica': 'eolica', 'Solar fotovoltaica': 'solar' };
  const MAPA_G = { 'Nucleoeléctrica': 'nuclear', 'Carboeléctrica': 'carbon', 'Hidroeléctrica': 'hidro', 'Geotermoeléctrica': 'otras', 'Vapor convencional': 'termica', 'Ciclo combinado': 'cc' };
  const LETRA = { nuclear: 'N', carbon: 'C', hidro: 'H', otras: 'G', termica: 'V', cc: 'CC' };
  const COMB = { Oil: 'petróleo: combustóleo o diésel', Gas: 'gas natural', Coal: 'carbón', Hydro: 'agua', Nuclear: 'uranio', Geothermal: 'vapor geotérmico' };

  const st = { alc: 'nac', anio: 2024, tecs: new Set(G.map((x) => x.id)) };
  let D, P, C;   // datos completos, Plan y CFE
  const charts = {};

  fetch('datos/atlas-datos.json').then((r) => r.json()).then((d) => { D = d; iniciar(); }).catch((err) => { console.error(err);
    $('#hero-stats').innerHTML = '<div class="nodisp" style="grid-column:1/-1"><strong>No se pudieron cargar los datos.</strong>Abre el sitio desde un servidor (GitHub Pages o «python -m http.server»).</div>';
  });

  /* ---------- acceso a datos ---------- */
  function nacional(anio) { const i = P.anios.indexOf(anio); const t = {}; Object.keys(P.datos).forEach((k) => (t[k] = P.datos[k][i])); return { tec: t, total: P.total[i], limpias: P.limpias[i] }; }
  function cfe(anio) {
    if (anio === 2022) return { tec: null, total: D.generacion.cfe_total_2022_gwh.valor };
    const j = C.anios.indexOf(anio); const t = {}; Object.keys(C.datos).forEach((k) => (t[k] = C.datos[k][j]));
    return { tec: t, total: C.total[String(anio)] ?? C.total[anio] };
  }
  const porGrupo = (tec, mapa) => { const o = Object.fromEntries(G.map((x) => [x.id, 0])); Object.entries(tec).forEach(([k, x]) => (o[mapa[k]] += x)); return o; };
  const actual = () => (st.alc === 'nac' ? nacional(st.anio) : cfe(st.anio));
  const mapaAlc = () => (st.alc === 'nac' ? PLAN_G : CFE_G);
  const hito = (id) => D.generacion.cfe_hitos.find((h) => h.id === id);
  const limpiaCFE = (a) => hito({ 2022: 'cfe22_limpia', 2023: 'cfe23_limpia', 2024: 'cfe24_limpia' }[a]);

  function iniciar() {
    P = D.generacion.nacional_generacion_neta_gwh; C = D.generacion.cfe_generacion_bruta_gwh;
    // Filtros
    $('#tecs').innerHTML = `<button type="button" class="filtro" data-todas aria-pressed="true">Todas</button>` +
      G.map((x) => `<button type="button" class="filtro" data-g="${x.id}" aria-pressed="true"><i style="background:${x.c}"></i>${x.n.split(',')[0].replace(' y otras limpias', '')}</button>`).join('');
    $('#tecs').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-todas')) G.forEach((x) => st.tecs.add(x.id));
      else { const id = b.dataset.g; if (st.tecs.size === G.length) { st.tecs.clear(); st.tecs.add(id); } else if (st.tecs.has(id)) { st.tecs.delete(id); if (!st.tecs.size) G.forEach((x) => st.tecs.add(x.id)); } else st.tecs.add(id); }
      todo();
    });
    document.querySelectorAll('[data-alc]').forEach((b) => b.addEventListener('click', () => { st.alc = b.dataset.alc; todo(); }));
    document.querySelectorAll('[data-anio]').forEach((b) => b.addEventListener('click', () => { st.anio = +b.dataset.anio; todo(); }));
    document.querySelectorAll('[data-tabla]').forEach((bt) => bt.addEventListener('click', () => {
      const t = document.getElementById(bt.dataset.tabla); const ab = t.hidden; t.hidden = !ab; bt.setAttribute('aria-expanded', String(ab)); bt.textContent = ab ? 'Ocultar tabla' : 'Ver tabla'; }));
    crearGraficas(); mapa(); todo(); revelar();
  }

  function todo() {
    document.querySelectorAll('[data-alc]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.alc === st.alc)));
    document.querySelectorAll('[data-anio]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.anio === st.anio)));
    $('[data-todas]').setAttribute('aria-pressed', String(st.tecs.size === G.length));
    document.querySelectorAll('[data-g]').forEach((b) => b.setAttribute('aria-pressed', String(st.tecs.size !== G.length && st.tecs.has(b.dataset.g))));
    heroStats(); explorador(); actualizarMapa(); graficaAnual(); graficaVar(); graficaPart(); graficaLimp(); duelo(); graficaHist();
  }

  /* ---------- Hero: cifras animadas ---------- */
  const prev = {};
  function contar(el, hasta, dec, suf) {
    const desde = prev[el.id] ?? 0; prev[el.id] = hasta;
    if (reduce) { el.textContent = (el.dataset.mas && hasta > 0 ? '+' : '') + fmt(hasta, dec); return; }
    const t0 = performance.now(), dur = 700;
    const paso = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = (el.dataset.mas && hasta > 0 ? '+' : '') + fmt(desde + (hasta - desde) * e, dec); if (k < 1) requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  }
  function heroStats() {
    const a = st.anio, n = nacional(a), c = cfe(a), np = nacional(a - 1);
    const varN = 100 * (n.total / np.total - 1);
    const L = limpiaCFE(a);
    const items = [
      ['hs1', `Generación ${a}`, 'Nacional', n.total, 0, 'GWh', 'Neta inyectada · Plan, T. 2.2, p. 20'],
      ['hs2', `Generación ${a}`, 'CFE', c.total, 0, 'GWh', `Bruta · Informe ${a === 2022 ? '2023, p. 15' : '2024, p. 26'}`],
      ['hs3', `Variación vs ${a - 1}`, 'Nacional', varN, 1, '%', 'Cálculo · Plan, T. 2.2, p. 20'],
      ['hs4', `Energía limpia ${a}`, 'CFE', L.valor, 1, '%', `Informe ${L.fuente.replace('CFE', '20')}, p. ${L.pagina}`],
    ];
    const cont = $('#hero-stats');
    if (!cont.children.length) cont.innerHTML = items.map((x) => `<div class="hstat"><div class="k"><span id="${x[0]}k"></span><em>${x[2]}</em></div><div class="v"><span id="${x[0]}">0</span> <small>${x[5]}</small></div><div class="f" id="${x[0]}f"></div></div>`).join('');
    items.forEach((x) => { $(`#${x[0]}k`).textContent = x[1]; $(`#${x[0]}f`).textContent = x[6]; contar($('#' + x[0]), x[3], x[4]); });
    $('#hs3').dataset.mas = '1';
  }

  /* ---------- Explorador de tecnologías ---------- */
  function explorador() {
    const a = actual();
    const alcTxt = st.alc === 'nac' ? 'nacional (neta inyectada)' : 'de la CFE (bruta)';
    $('#intro-tec').textContent = `Porcentaje de la generación ${alcTxt} en ${st.anio}. Toca una tarjeta para filtrar el mapa y las gráficas por esa tecnología.`;
    const pg = a.tec ? porGrupo(a.tec, mapaAlc()) : null;
    $('#explorador').innerHTML = G.map((x) => {
      const p = pg ? (100 * pg[x.id]) / a.total : null;
      return `<article class="tec${st.tecs.has(x.id) ? '' : ' apagada'}" style="--c:${x.c}" data-g="${x.id}" tabindex="0" role="button" aria-pressed="${st.tecs.size !== G.length && st.tecs.has(x.id)}" aria-label="Filtrar por ${x.n}">
        <div class="ico">${svg(x.id)}</div><span class="tipo">${x.tipo}</span>
        <h3><dfn class="def" tabindex="-1">${x.n}<span class="def-texto" role="tooltip">${x.def}</span></dfn></h3>
        ${p == null ? ND : `<div class="pct">${fmt(p, 1)} <small>% · ${fmt(pg[x.id])} GWh</small></div><div class="barra-pct"><i style="width:${Math.min(100, p)}%"></i></div>`}
      </article>`;
    }).join('');
    $('#explorador').querySelectorAll('.tec').forEach((el) => {
      const accion = () => { const id = el.dataset.g; if (st.tecs.size === 1 && st.tecs.has(id)) G.forEach((x) => st.tecs.add(x.id)); else { st.tecs.clear(); st.tecs.add(id); } todo(); };
      el.addEventListener('click', accion); el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); accion(); } });
    });
    $('#fuente-tec').innerHTML = st.alc === 'nac'
      ? '<strong>Fuente:</strong> <span class="alcance">Nacional</span> Plan de Desarrollo del Sector Eléctrico 2025-2030 (DOF 17/10/2025), Tabla 2.2, p. 20. Porcentajes: cálculo propio.'
      : `<strong>Fuente:</strong> <span class="alcance">CFE</span> ${st.anio === 2022 ? 'El Informe Anual 2022 no trae el desglose por tecnología (remite a un anexo que no forma parte de los documentos). Total 2022: 141,342 GWh (Informe 2023, p. 15).' : 'Informe Anual 2024, p. 26. Sin productores independientes. Porcentajes: cálculo propio.'}`;
  }

  /* ---------- Mapa ---------- */
  let M, capas = {}, marcadores = [], guias, selId = null;
  function mapa() {
    M = L.map('mapa', { scrollWheelZoom: false, zoomSnap: 0.5 });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 12, attribution: '© OpenStreetMap' }).addTo(M);
    let fallos = 0;
    M.eachLayer((l) => { if (l instanceof L.TileLayer) l.on('tileerror', () => { if (++fallos === 4) { const a = document.createElement('p'); a.className = 'aviso'; a.textContent = 'No se pudo cargar el mapa base (requiere internet). Las centrales se muestran en su ubicación sin fondo.'; a.style.marginTop = '16px'; $('.mapa-layout').before(a); } }); });
    guias = L.layerGroup().addTo(M);
    G.forEach((x) => (capas[x.id] = L.layerGroup().addTo(M)));
    D.centrales.forEach((c, i) => {
      const g = MAPA_G[c.tecnologia];
      const icon = L.divIcon({ className: '', html: `<div class="marcador" data-m="${i}" style="background:${GI[g].c}">${LETRA[g]}</div>`, iconSize: [26, 26], iconAnchor: [13, 13] });
      const mk = L.marker([c.lat, c.lon], { icon, title: c.nombre, keyboard: true, riseOnHover: true });
      mk._real = mk.getLatLng(); mk._i = i; mk._g = g;
      mk.on('click', () => seleccionar(i));
      capas[g].addLayer(mk); marcadores.push(mk);
    });
    M.fitBounds(L.latLngBounds(D.centrales.map((c) => [c.lat, c.lon])), { padding: [18, 18] });
    M.on('zoomend', separar);
    $('#lista-c').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { seleccionar(+b.dataset.i, true); } });
  }
  function separar() {
    guias.clearLayers();
    const vis = marcadores.filter((mk) => M.hasLayer(capas[mk._g]));
    vis.forEach((mk) => mk.setLatLng(mk._real));
    const pts = vis.map((mk) => M.latLngToLayerPoint(mk._real)), usado = vis.map(() => false);
    for (let i = 0; i < vis.length; i++) {
      if (usado[i]) continue; const grupo = [i]; usado[i] = true;
      for (let j = i + 1; j < vis.length; j++) if (!usado[j] && pts[i].distanceTo(pts[j]) < 26) { grupo.push(j); usado[j] = true; }
      if (grupo.length < 2) continue;
      const cx = grupo.reduce((s, k) => s + pts[k].x, 0) / grupo.length, cy = grupo.reduce((s, k) => s + pts[k].y, 0) / grupo.length, rad = grupo.length === 2 ? 15 : 20;
      grupo.forEach((k, n) => {
        const a = -Math.PI / 2 + (2 * Math.PI * n) / grupo.length, nuevo = M.layerPointToLatLng(L.point(cx + rad * Math.cos(a), cy + rad * Math.sin(a)));
        vis[k].setLatLng(nuevo);
        L.polyline([vis[k]._real, nuevo], { color: '#0B2A5B', weight: 1, opacity: .6, interactive: false }).addTo(guias);
        L.circleMarker(vis[k]._real, { radius: 2.5, color: '#0B2A5B', weight: 1, fillOpacity: 1, interactive: false }).addTo(guias);
      });
    }
  }
  function actualizarMapa() {
    G.forEach((x) => (st.tecs.has(x.id) ? M.addLayer(capas[x.id]) : M.removeLayer(capas[x.id])));
    separar();
    const lista = D.centrales.map((c, i) => ({ c, i, g: MAPA_G[c.tecnologia] })).filter((x) => st.tecs.has(x.g))
      .sort((a, b) => (b.c.capacidad_documental_mw || b.c.capacidad_2016_mw) - (a.c.capacidad_documental_mw || a.c.capacidad_2016_mw));
    $('#lista-c').innerHTML = lista.length ? lista.map((x) => `<li><button type="button" data-i="${x.i}" aria-current="${x.i === selId}"><i style="background:${GI[x.g].c}"></i><span>${x.c.nombre}<br><small style="color:#5B6B85">${x.c.estado}</small></span><b>${fmt(x.c.capacidad_documental_mw || x.c.capacidad_2016_mw)} MW</b></button></li>`).join('')
      : '<li style="padding:10px;color:#5B6B85">No hay centrales del mapa con esta tecnología. Las 15 centrales son nucleares, de carbón, hidroeléctricas, geotérmicas, de vapor y de ciclo combinado.</li>';
    if (selId != null && !st.tecs.has(MAPA_G[D.centrales[selId].tecnologia])) { selId = null; $('#ficha').hidden = true; $('#vacio').hidden = false; }
  }
  function seleccionar(i, volar) {
    selId = i; const c = D.centrales[i], g = MAPA_G[c.tecnologia], x = GI[g];
    document.querySelectorAll('.marcador').forEach((m) => m.classList.toggle('sel', +m.dataset.m === i));
    $('#lista-c').querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', String(+b.dataset.i === i)));
    if (volar) M.flyTo(marcadores[i]._real, Math.max(M.getZoom(), 7), { duration: reduce ? 0 : 0.8 });
    const capDoc = c.capacidad_documental_mw;
    const cap = capDoc ? `${fmt(capDoc, 1)} MW <span class="sello oficial">Dato oficial</span>` : `${fmt(c.capacidad_2016_mw, 1)} MW <span class="sello nd">Dato de 2016</span>`;
    const capF = capDoc ? `CFE, Informe Anual ${c.fuente_capacidad.replace('CFE24', '2024,').replace('CFE23', '2023,')}` : 'NACEI (SENER/CRE) 2016, vía Centrales_Mexico.csv. Los informes de la CFE no reportan la capacidad de esta central';
    const gen = c.generacion_2024_gwh ? `${fmt(c.generacion_2024_gwh, 1)} GWh` : ND;
    const fp = capDoc && c.generacion_2024_gwh ? (100 * c.generacion_2024_gwh * 1000) / (capDoc * 8760) : null;
    const comb = COMB[c.combustible_csv] || c.combustible_csv;
    $('#vacio').hidden = true; const f = $('#ficha'); f.hidden = false;
    f.innerHTML = `<div class="cab-c" style="--c:${x.c}"><div class="ico">${svg(g, 2)}</div><div><h3>${c.nombre}</h3><div class="ubic">${c.estado} · ${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}</div></div></div>
      <dl>
        <dt>Tecnología</dt><dd><dfn class="def" tabindex="0">${c.tecnologia}<span class="def-texto" role="tooltip">${x.def}</span></dfn></dd>
        <dt>Combustible o recurso</dt><dd>${comb} <small style="color:#5B6B85;font-weight:400">(NACEI)</small></dd>
        <dt>Capacidad</dt><dd><span class="grande">${cap}</span></dd>
        <dt>Generación 2024</dt><dd>${gen}</dd>
        ${fp != null ? `<dt><dfn class="def" tabindex="0">Factor de planta<span class="def-texto" role="tooltip">Qué porcentaje del año habría tenido que operar la central a toda su capacidad para producir lo que produjo. 100 % = todo el año a plena carga.</span></dfn></dt><dd>${fmt(fp, 1)} % <span class="sello calculo">Cálculo</span></dd>` : ''}
      </dl>
      <p class="fuente" style="margin:0"><strong>Capacidad:</strong> ${capF}. <strong>Generación:</strong> ${c.fuente_generacion.replace('CFE24', 'CFE, Informe Anual 2024,')}. <strong>Ubicación:</strong> NACEI (SENER/CRE).</p>`;
  }

  /* ---------- Gráficas ---------- */
  const anios = [2022, 2023, 2024];
  function crearGraficas() {
    const ejeX = { grid: { display: false }, border: { display: false }, ticks: { color: '#0B2A5B', font: { weight: 600 } } };
    const ejeY = (cb) => ({ grid: { color: '#EEF3FB' }, border: { display: false }, ticks: { callback: cb } });
    charts.anual = new Chart($('#g-anual'), { type: 'bar', data: { labels: anios.map(String), datasets: [
      { label: 'Nacional', data: anios.map((a) => nacional(a).total), backgroundColor: '#2a78d6', borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: false, maxBarThickness: 46 },
      { label: 'CFE', data: anios.map((a) => cfe(a).total), backgroundColor: '#eb6834', borderRadius: { topLeft: 4, topRight: 4 }, borderSkipped: false, maxBarThickness: 46 }] },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: ejeX, y: { ...ejeY((x) => fmt(x / 1000) + ' TWh'), beginAtZero: true } },
        plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (c) => ` ${c.dataset.label}: ${fmt(c.raw)} GWh` } } } } });
    $('#tabla-anual').innerHTML = `<table><thead><tr><th>Año</th><th class="n">Nacional, neta (GWh)</th><th class="n">CFE, bruta (GWh)</th></tr></thead><tbody>${anios.map((a) => `<tr><td>${a}</td><td class="n">${fmt(nacional(a).total)}</td><td class="n">${fmt(cfe(a).total)}</td></tr>`).join('')}</tbody></table>`;

    const etiquetas = (fn) => ({ id: 'et', afterDatasetsDraw(ch) { const ctx = ch.ctx; ctx.save(); ctx.font = '600 11px Inter, sans-serif'; ctx.fillStyle = '#101828'; ctx.textBaseline = 'middle'; fn(ch, ctx); ctx.restore(); } });
    charts.var = new Chart($('#g-var'), { type: 'bar', data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderRadius: 4, borderSkipped: false, maxBarThickness: 20 }] },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { grid: { color: (c) => (c.tick.value === 0 ? '#5B6B85' : '#EEF3FB') }, border: { display: false }, ticks: { callback: (x) => x + ' %' } }, y: { grid: { display: false }, border: { display: false }, ticks: { color: '#101828', font: { size: 11 } } } },
        plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (c) => { const r = charts.var._d[c.dataIndex]; return ` ${c.raw > 0 ? '+' : ''}${fmt(c.raw, 1)} % · ${fmt(r.a)} → ${fmt(r.b)} GWh`; } } } } },
      plugins: [etiquetas((ch, ctx) => ch.getDatasetMeta(0).data.forEach((b, i) => { const val = ch.data.datasets[0].data[i]; ctx.textAlign = val >= 0 ? 'left' : 'right'; ctx.fillText(`${val > 0 ? '+' : ''}${fmt(val, 1)} %`, b.x + (val >= 0 ? 6 : -6), b.y); }))] });

    charts.part = new Chart($('#g-part'), { type: 'bar', data: { labels: [], datasets: [{ data: [], backgroundColor: [], borderRadius: { topRight: 4, bottomRight: 4 }, borderSkipped: false, maxBarThickness: 18 }] },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { grid: { color: '#EEF3FB' }, border: { display: false }, ticks: { callback: (x) => x + ' %' } }, y: { grid: { display: false }, border: { display: false }, ticks: { color: '#101828', font: { size: 11 } } } },
        plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (c) => { const r = charts.part._d[c.dataIndex]; return ` ${fmt(r.p, 1)} % · ${fmt(r.v)} GWh`; } } } } },
      plugins: [etiquetas((ch, ctx) => ch.getDatasetMeta(0).data.forEach((b, i) => { ctx.textAlign = 'left'; ctx.fillText(fmt(ch.data.datasets[0].data[i], 1) + ' %', b.x + 6, b.y); }))] });

    charts.limp = new Chart($('#g-limp'), { type: 'bar', data: { labels: ['Nacional 2022', 'Nacional 2023', 'Nacional 2024', 'CFE 2022', 'CFE 2023', 'CFE 2024'], datasets: [
      { label: 'Fósil', data: [], backgroundColor: [], borderColor: '#fff', borderWidth: { right: 2 }, borderSkipped: false, maxBarThickness: 34 },
      { label: 'Limpia', data: [], backgroundColor: [], borderColor: '#fff', borderWidth: { right: 2 }, borderSkipped: false, maxBarThickness: 34 }] },
      options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { stacked: true, max: 100, grid: { color: '#EEF3FB' }, border: { display: false }, ticks: { callback: (x) => x + ' %' } }, y: { stacked: true, grid: { display: false }, border: { display: false }, ticks: { color: '#0B2A5B', font: { weight: 600 } } } },
        plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (c) => ` ${c.dataset.label}: ${fmt(c.raw, 1)} %` } } } },
      plugins: [etiquetas((ch, ctx) => { ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ch.data.datasets.forEach((ds, k) => ch.getDatasetMeta(k).data.forEach((b, i) => { const w = Math.abs(b.x - b.base); if (w > 46) ctx.fillText(fmt(ds.data[i], 1) + ' %', b.base + (b.x - b.base) / 2, b.y); })); })] });

    const hist = P.anios.map(String);
    charts.hist = new Chart($('#g-hist'), { type: 'line', data: { labels: hist, datasets: [
      { label: 'Ciclo combinado', data: P.datos['Ciclo combinado'], borderColor: GI.cc.c, backgroundColor: GI.cc.c, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 6 },
      { label: 'Vapor convencional (térmica convencional)', data: P.datos['Térmica convencional'], borderColor: GI.termica.c, backgroundColor: GI.termica.c, borderWidth: 2.5, pointRadius: 0, pointHoverRadius: 6 }] },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, layout: { padding: { right: 150 } },
        scales: { x: { grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: 8 } }, y: { beginAtZero: true, grid: { color: '#EEF3FB' }, border: { display: false }, ticks: { callback: (x) => fmt(x / 1000) + ' TWh' } } },
        plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (c) => ` ${c.dataset.label}: ${fmt(c.raw)} GWh` } } } },
      plugins: [{ id: 'fin', afterDatasetsDraw(ch) { const ctx = ch.ctx; ctx.save(); ctx.font = '600 12px Inter, sans-serif'; ctx.textBaseline = 'middle';
        ch.data.datasets.forEach((ds, k) => { const p = ch.getDatasetMeta(k).data.at(-1); ctx.fillStyle = '#101828'; ctx.fillText(k ? 'Vapor convencional' : 'Ciclo combinado', p.x + 10, p.y); });
        const i = hist.indexOf(String(st.anio)), x = ch.scales.x.getPixelForValue(i); ctx.strokeStyle = '#FFC22E'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(x, ch.chartArea.top); ctx.lineTo(x, ch.chartArea.bottom); ctx.stroke(); ctx.restore(); } }] });
  }

  function graficaAnual() {
    const sel = anios.indexOf(st.anio);
    charts.anual.data.datasets.forEach((ds, k) => (ds.backgroundColor = anios.map((a, i) => alfa(k ? '#eb6834' : '#2a78d6', i === sel ? 1 : 0.35))));
    charts.anual.update();
  }
  function graficaVar() {
    const cv = $('#g-var').parentElement, nd = $('#nd-var');
    let a, b, fuente;
    if (st.alc === 'nac') { a = porGrupo(nacional(st.anio - 1).tec, PLAN_G); b = porGrupo(nacional(st.anio).tec, PLAN_G); fuente = '<span class="alcance">Nacional</span> Plan, Tabla 2.2, p. 20 (incluye 2021 para calcular 2022). Variación = (año ÷ año anterior − 1) × 100.'; }
    else if (st.anio === 2024) { a = porGrupo(cfe(2023).tec, CFE_G); b = porGrupo(cfe(2024).tec, CFE_G); fuente = '<span class="alcance">CFE</span> Informe Anual 2024, p. 26. Variación = (2024 ÷ 2023 − 1) × 100.'; }
    $('#desc-var').textContent = `${st.anio} contra ${st.anio - 1}, ${st.alc === 'nac' ? 'nacional' : 'CFE'}. Azul: creció. Naranja: bajó.`;
    if (!a) { cv.hidden = true; nd.hidden = false; nd.innerHTML = `<div class="nodisp"><strong>Variación por tecnología de la CFE ${st.anio} contra ${st.anio - 1}</strong>${ND}<span>El desglose por tecnología de la CFE solo existe para 2023 y 2024. Total CFE: ${st.anio === 2023 ? '+6.5 % (150,461 contra 141,342 GWh; Informe 2023, p. 15)' : 'sin dato de 2021 en los documentos'}.</span></div>`; $('#fuente-var').innerHTML = ''; return; }
    cv.hidden = false; nd.hidden = true;
    const filas = G.filter((x) => a[x.id] > 0).map((x) => ({ g: x, a: a[x.id], b: b[x.id], v: 100 * (b[x.id] / a[x.id] - 1) })).sort((p, q) => q.v - p.v);
    charts.var._d = filas;
    charts.var.data.labels = filas.map((f) => f.g.n.replace(', turbogás y combustión interna', ' y otras').replace(' y otras limpias', ''));
    charts.var.data.datasets[0].data = filas.map((f) => f.v);
    charts.var.data.datasets[0].backgroundColor = filas.map((f) => alfa(f.v >= 0 ? '#2a78d6' : '#eb6834', st.tecs.has(f.g.id) ? 1 : 0.25));
    charts.var.update();
    $('#fuente-var').innerHTML = fuente;
  }
  function graficaPart() {
    const a = actual(), cv = $('#g-part').parentElement, nd = $('#nd-part');
    $('#desc-part').textContent = `${st.alc === 'nac' ? 'Nacional, generación neta inyectada' : 'CFE, generación bruta'} · ${st.anio}. Las tecnologías fuera del filtro se ven tenues.`;
    if (!a.tec) { cv.hidden = true; nd.hidden = false; nd.innerHTML = `<div class="nodisp"><strong>Participación por tecnología de la CFE en 2022</strong>${ND}<span>El Informe Anual 2022 no incluye el desglose. Total: 141,342 GWh (Informe 2023, p. 15).</span></div>`; $('#fuente-part').innerHTML = ''; return; }
    cv.hidden = false; nd.hidden = true;
    const m = mapaAlc();
    const filas = Object.keys(a.tec).map((k) => ({ k, v: a.tec[k], p: (100 * a.tec[k]) / a.total, g: m[k] })).sort((x, y) => y.v - x.v);
    charts.part._d = filas;
    charts.part.data.labels = filas.map((f) => f.k);
    charts.part.data.datasets[0].data = filas.map((f) => f.p);
    charts.part.data.datasets[0].backgroundColor = filas.map((f) => alfa(GI[f.g].c, st.tecs.has(f.g) ? 1 : 0.22));
    charts.part.update();
    $('#fuente-part').innerHTML = st.alc === 'nac' ? '<span class="alcance">Nacional</span> Plan, Tabla 2.2, p. 20. Porcentajes: cálculo propio.' : '<span class="alcance">CFE</span> Informe Anual 2024, p. 26. Porcentajes: cálculo propio.';
  }
  function graficaLimp() {
    const nl = anios.map((a) => { const n = nacional(a); return (100 * n.limpias) / n.total; });
    const cl = anios.map((a) => limpiaCFE(a).valor);
    const limp = [...nl, ...cl], fos = limp.map((x) => 100 - x);
    const resalta = (i) => anios[i % 3] === st.anio;
    charts.limp.data.datasets[0].data = fos; charts.limp.data.datasets[1].data = limp;
    charts.limp.data.datasets[0].backgroundColor = fos.map((_, i) => alfa('#eb6834', resalta(i) ? 1 : 0.35));
    charts.limp.data.datasets[1].backgroundColor = limp.map((_, i) => alfa('#1baf7a', resalta(i) ? 1 : 0.35));
    charts.limp.update();
  }
  function graficaHist() { charts.hist.update('none'); }

  /* ---------- Ciclo combinado contra vapor ---------- */
  function duelo() {
    const a = st.anio, nac = st.alc === 'nac';
    let cap, gen, tot, capF, genF;
    if (nac) {
      const i = P.anios.indexOf(a), K = D.generacion.nacional_capacidad_mw;
      cap = { cc: K.datos['Ciclo combinado'][i], v: K.datos['Térmica convencional'][i] };
      gen = { cc: P.datos['Ciclo combinado'][i], v: P.datos['Térmica convencional'][i] }; tot = P.total[i];
      capF = 'Plan, Tabla 2.1, p. 19'; genF = 'Plan, Tabla 2.2, p. 20';
    } else {
      if (a === 2022) { const K = D.generacion.cfe_capacidad_2022_mw.datos; cap = { cc: K['Ciclo combinado'][0], v: K['Vapor convencional'][0] }; gen = null; capF = 'CFE, Informe 2023, p. 16'; }
      else { const j = a === 2023 ? 0 : 1, K = D.generacion.cfe_capacidad_mw.datos; cap = { cc: K['Ciclo combinado'][j], v: K['Vapor convencional'][j] }; gen = { cc: C.datos['Ciclo combinado'][j], v: C.datos['Vapor convencional'][j] }; tot = cfe(a).total; capF = 'CFE, Informe 2024, p. 21'; genF = 'CFE, Informe 2024, p. 26'; }
    }
    const eta = hito('ipcc_eta_cc').valor.split('/');
    const lados = [
      { k: 'cc', t: 'Ciclo combinado', c: GI.cc.c, esq: esquema('cc'), eta: `${eta[1]} % <small>(${eta[0]}–${eta[2]} %)</small>` },
      { k: 'v', t: 'Vapor convencional', c: GI.termica.c, esq: esquema('v'), eta: ND },
    ];
    const mx = (o) => Math.max(o.cc, o.v);
    const fp = (k) => (gen ? (100 * gen[k] * 1000) / (cap[k] * 8760) : null);
    const filaB = (lbl, val, txt, max, extra = '') => `<div class="metrica"><span>${lbl}${extra}</span><b>${txt}</b>${val != null ? `<div class="bar"><i style="width:${(100 * val) / max}%"></i></div>` : ''}</div>`;
    $('#duelo-cards').innerHTML = lados.map((l, n) => `${n ? '<div class="vs" aria-hidden="true">vs</div>' : ''}<article class="lado" style="--c:${l.c}">
      <h3>${l.t}</h3><p class="desc" style="margin:0">${nac ? 'Nacional' : 'CFE'} · ${a}</p>
      <div class="esq">${l.esq}</div>
      ${filaB('Capacidad', cap[l.k], fmt(cap[l.k], 1) + ' MW', mx(cap))}
      ${gen ? filaB('Generación', gen[l.k], fmt(gen[l.k]) + ' GWh', mx(gen)) : `<div class="metrica"><span>Generación</span><b>${ND}</b></div>`}
      ${gen ? filaB('Participación en el total', (100 * gen[l.k]) / tot, fmt((100 * gen[l.k]) / tot, 1) + ' %', 100) : ''}
      ${gen ? filaB('Factor de planta', fp(l.k), fmt(fp(l.k), 1) + ' %', 100, ' <span class="sello calculo">Cálculo</span>') : `<div class="metrica"><span>Factor de planta</span><b>${ND}</b></div>`}
      <div class="metrica"><span>Eficiencia típica (IPCC, mundial)</span><b>${l.eta}</b></div>
    </article>`).join('');
    let nota = $('#nota-duelo');
    if (!nota) { nota = document.createElement('p'); nota.id = 'nota-duelo'; nota.className = 'fuente'; $('#duelo-cards').after(nota); }
    nota.innerHTML = `<strong>Fuentes:</strong> capacidad: ${capF}${gen ? `; generación: ${genF}` : '; generación por tecnología de la CFE 2022: no disponible'}. ${nac ? 'El Plan llama «térmica convencional» al vapor convencional.' : 'Datos de la CFE sin productores independientes.'} Factor de planta = generación ÷ (capacidad × 8,760 h). Eficiencia: IPCC AR5, Anexo III, Tabla A.III.1, p. 1333 (mínimo/mediana/máximo); el IPCC no da eficiencia para centrales de vapor con combustóleo (para carbón con ciclo de vapor reporta 39 % de mediana).`;
  }
  function esquema(k) {
    const caja = (x, y, w, t, f = '#EAF3FF') => `<rect x="${x}" y="${y}" width="${w}" height="34" rx="8" fill="${f}" stroke="#0F4DBC" stroke-width="1.5"/><text x="${x + w / 2}" y="${y + 21}" text-anchor="middle" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#0B2A5B">${t}</text>`;
    const fl = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0F4DBC" stroke-width="1.8" marker-end="url(#fl${k})"/>`;
    const def = `<defs><marker id="fl${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#0F4DBC"/></marker></defs>`;
    if (k === 'cc') return `<svg viewBox="0 0 340 104" role="img" aria-label="Esquema: gas y aire a la turbina de gas, que mueve un generador; su escape va a la caldera de recuperación, cuyo vapor mueve una turbina de vapor">${def}
      ${caja(0, 4, 78, 'Gas + aire', '#FFF1EA')}${fl(78, 21, 96, 21)}${caja(98, 4, 100, 'Turbina de gas')}${fl(198, 21, 216, 21)}${caja(218, 4, 120, 'Generador 1', '#FFF4D1')}
      ${fl(148, 38, 148, 62)}<text x="154" y="54" font-family="Inter" font-size="9" fill="#5B6B85">gases calientes</text>
      ${caja(70, 64, 156, 'Caldera de recuperación')}${fl(226, 81, 242, 81)}${caja(244, 64, 94, 'Turbina vapor')}</svg>`;
    return `<svg viewBox="0 0 340 104" role="img" aria-label="Esquema: combustóleo o gas a la caldera; el vapor mueve la turbina y el generador; luego se condensa y vuelve a la caldera">${def}
      ${caja(0, 4, 112, 'Combustóleo o gas', '#FFF1EA')}${fl(112, 21, 128, 21)}${caja(130, 4, 70, 'Caldera')}${fl(200, 21, 216, 21)}${caja(218, 4, 120, 'Turbina y generador')}
      ${fl(278, 38, 278, 62)}${caja(218, 64, 120, 'Condensador')}<path d="M218 81 H165 V40" fill="none" stroke="#0F4DBC" stroke-width="1.8" marker-end="url(#fl${k})"/>
      <text x="20" y="85" font-family="Inter" font-size="10" font-weight="600" fill="#5B6B85">ciclo Rankine</text></svg>`;
  }

  /* ---------- Aparición suave ---------- */
  function revelar() {
    const els = document.querySelectorAll('.revelar');
    if (reduce || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('visible')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); Object.values(charts).forEach((c) => c.resize()); M && M.invalidateSize(); } }), { threshold: 0.08 });
    els.forEach((e) => io.observe(e));
  }
})();
