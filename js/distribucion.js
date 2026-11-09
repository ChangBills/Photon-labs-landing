/* Atlas Eléctrico · Módulo 3 · Distribución
   Datos: datos/atlas-datos.json, datos/transmision.json (regiones y ciudades) y datos/distribucion.json.
   Ninguna cifra se escribe a mano aquí; los valores del simulador son de ejemplo y los elige el usuario. */
(function () {
  const fmt = (x, d = 0) => Number(x).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d });
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
  Chart.defaults.color = '#5B6B85';
  if (reduce) Chart.defaults.animation = false;
  const TIP = { backgroundColor: '#0B2A5B', padding: 10, titleFont: { family: 'Poppins' } };
  const ND = '<span class="sello nd">Dato no disponible</span>';
  const OF = '<span class="sello oficial">Dato oficial</span>';
  const CA = '<span class="sello calculo">Cálculo</span>';
  const PLAN = 'Plan de Desarrollo del Sector Eléctrico 2025-2030 (DOF 17/10/2025)';
  const CFE24 = 'CFE, Informe Anual 2024';

  let D, T, X, GEO, M, burbujas;
  const st = { ind: 'usuarios', anio: 2024, div: 'gd', da: 2024, sel: null };
  const charts = {};
  const SIS_C = { SIN: '#2a78d6', SIBC: '#eb6834', SIBCS: '#6250d6', SIMUL: '#1baf7a' };

  Promise.all(['datos/atlas-datos.json', 'datos/transmision.json', 'datos/distribucion.json', 'datos/mx-estados.geojson'].map((u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u); return r.json(); })))
    .then(([d, t, x, g]) => { D = d; T = t; X = x; GEO = g; iniciar(); })
    .catch((err) => { console.error(err);
      $('#hero-stats').innerHTML = '<div class="nodisp" style="grid-column:1/-1"><strong>No se pudieron cargar los datos.</strong>Abre el sitio desde un servidor (GitHub Pages o «python -m http.server»).</div>'; });

  const nac = (id) => D.distribucion.nacional.find((x) => x.id === id);

  function iniciar() {
    heroStats(); escalera(); mapa(); divisiones(); red(); calidad(); tarifas(); simulador();
    $$('[data-ind]').forEach((b) => b.addEventListener('click', () => { st.ind = b.dataset.ind; pintar(); }));
    $$('[data-anio]').forEach((b) => b.addEventListener('click', () => { st.anio = +b.dataset.anio; pintar(); }));
    $$('[data-div]').forEach((b) => b.addEventListener('click', () => { st.div = b.dataset.div; divisiones(); }));
    $$('[data-da]').forEach((b) => b.addEventListener('click', () => { st.da = +b.dataset.da; divisiones(); }));
    $$('[data-tabla]').forEach((bt) => bt.addEventListener('click', () => {
      const el = document.getElementById(bt.dataset.tabla); el.hidden = !el.hidden;
      bt.setAttribute('aria-expanded', String(!el.hidden)); bt.textContent = el.hidden ? 'Ver tabla' : 'Ocultar tabla';
    }));
    revelar();
  }

  /* ---------- Hero ---------- */
  function contar(el, hasta, dec) {
    if (reduce) { el.textContent = fmt(hasta, dec); return; }
    const t0 = performance.now(), dur = 900;
    const paso = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(hasta * e, dec); if (k < 1) requestAnimationFrame(paso); };
    requestAnimationFrame(paso);
  }
  function heroStats() {
    const u = nac('usuarios'), k = nac('km_rgd'), td = nac('tr_dist'), tb = D.distribucion.tablero_2022_2024;
    const per = tb.datos['Pérdidas de energía (MT+BT)'][1][2];
    const items = [
      ['h1', 'Usuarios 2024', 'CFE', u.valor, 1, 'millones', `${CFE24}, p. ${u.pagina}`],
      ['h2', 'Redes de distribución', 'CFE', k.valor, 0, 'mil km', `${CFE24}, p. ${k.pagina}`],
      ['h3', 'Transformadores de distribución', 'CFE', td.valor, 0, '', `${CFE24}, p. ${td.pagina}`],
      ['h4', 'Pérdidas en MT y BT 2024', 'CFE', per, 2, '%', `${CFE24}, p. ${tb.pagina}`],
    ];
    $('#hero-stats').innerHTML = items.map((x) => `<div class="hstat"><div class="k"><span>${x[1]}</span><em>${x[2]}</em></div><div class="v"><span id="${x[0]}">0</span> <small>${x[5]}</small></div><div class="f">${x[6]}</div></div>`).join('');
    items.forEach((x) => contar($('#' + x[0]), x[3], x[4]));
  }

  /* ---------- Escalera de tensión ---------- */
  function escalera() {
    const km = D.transmision.km_por_tension, i = km.anios.indexOf(2024);
    const sub = nac('km_subt'), mt = nac('km_mt'), bt = nac('km_bt'), tp = nac('tr_pot'), td = nac('tr_dist'), sb = nac('subest_d');
    const P = [
      { n: 'Transmisión', v: '400 y 230 kV', c: '#0B2A5B', t: `Las líneas troncales de la Red Nacional de Transmisión unen centrales y regiones. En 2024 había ${fmt(km.datos['400 kV'][i])} km a 400 kV y ${fmt(km.datos['230 kV'][i])} km a 230 kV.`, f: `${PLAN}, Tabla 2.3, p. ${km.pagina}` },
      { n: 'Subtransmisión', v: '138 a 69 kV', c: '#0F4DBC', t: `Llevan la energía hacia las ciudades. La RNT incluye las tensiones iguales o mayores a 69 kV. CFE Distribución atiende ${fmt(sub.valor)} km de líneas de subtransmisión.`, f: `${PLAN}, p. 21 · ${CFE24}, p. ${sub.pagina}` },
      { n: 'Subestación de distribución', v: 'Alta → media', c: '#2F80ED', t: `Transformadores de potencia bajan la tensión a media tensión. CFE Distribución opera ${fmt(sb.valor)} subestaciones y ${fmt(tp.valor)} transformadores de potencia ${tp.unidad.replace(/^unidades /, '')}.`, f: `${CFE24}, p. ${sb.pagina}` },
      { n: 'Media tensión', v: 'Más de 1 kV y menos de 69 kV', c: '#8EC5FF', t: `Los circuitos que recorren calles y carreteras. En el Plan aparecen obras a 34.5 kV y 13.8 kV. CFE tiene ${fmt(mt.valor)} km de líneas de media tensión.`, f: `${PLAN}, p. 21 y Tabla 4.10 · ${CFE24}, p. ${mt.pagina}` },
      { n: 'Transformador de distribución', v: 'Media → baja', c: '#F5A300', t: `El transformador del poste o de la banqueta baja la tensión para los usuarios. Hay ${fmt(td.valor)} transformadores de distribución ${td.unidad.replace(/^unidades /, '')}. Pruébalo en el simulador de abajo.`, f: `${CFE24}, p. ${td.pagina}` },
      { n: 'Baja tensión', v: '1 kV o menos', c: '#FFC22E', t: `La red que llega a casas y comercios. CFE tiene ${fmt(bt.valor)} km de líneas de baja tensión. Los documentos del proyecto definen la baja tensión como «igual o menor a 1 kV»; no indican la tensión exacta de un contacto doméstico.`, f: `${PLAN}, p. 21 · ${CFE24}, p. ${bt.pagina}` },
    ];
    $('#escalera').innerHTML = P.map((p, k) => `<button type="button" role="tab" class="escalon" style="--c:${p.c};--h:${100 - k * 13}%" data-k="${k}" aria-selected="${k === 0}"><span class="esc-v">${p.v}</span><span class="esc-n">${p.n}</span></button>`).join('');
    const ver = (k) => { $$('.escalon').forEach((b) => b.setAttribute('aria-selected', String(+b.dataset.k === k))); $('#escalera-explica').innerHTML = `<strong>${P[k].n} · ${P[k].v}</strong><p style="margin:6px 0 0">${P[k].t}</p><small class="gris">${P[k].f}</small>`; };
    $$('.escalon').forEach((b) => b.addEventListener('click', () => ver(+b.dataset.k)));
    ver(0);
  }

  /* ---------- Mapa de burbujas por región ---------- */
  // Ancla de cada región: la ciudad que el Plan nombra como zona de mayor demanda (transmision.json)
  const ANCLA = { CEN: 'Ciudad de México', ORI: 'Coatzacoalcos', OCC: 'Guadalajara', NOR: 'Hermosillo', NTE: 'Torreón', NES: 'Monterrey', PEN: 'Mérida', SIBC: 'Mexicali', SIBCS: 'La Paz', SIMUL: 'Santa Rosalía' };
  const REG = ['CEN', 'ORI', 'OCC', 'NOR', 'NTE', 'NES', 'PEN', 'SIBC', 'SIBCS', 'SIMUL'];
  const IND = {
    usuarios: { n: 'Usuarios del país', u: '%', d: 1, anual: false },
    consumo: { n: 'Consumo final', u: 'GWh', d: 0, anual: true },
    perdidas: { n: 'Pérdidas de energía', u: 'GWh', d: 0, anual: true },
    pperd: { n: 'Pérdidas respecto a la energía entregada', u: '%', d: 1, anual: true, calc: true },
    kwh: { n: 'Consumo por habitante', u: 'kWh', d: 0, anual: false },
  };
  const nombre = (k) => { const g = T.gcr.find((x) => x.id === k); return g ? 'GCR ' + g.nombre : k; };
  const sisDe = (k) => (k.startsWith('SIB') || k === 'SIMUL' ? k : 'SIN');
  function valor(k, ind, anio) {
    const R = D.regiones, i = R.claves.indexOf(k), a = String(anio);
    const g = T.gcr.find((x) => x.id === k);
    const sb = (id) => T.subsistemas_bc.find((x) => x.id === id);
    if (ind === 'consumo') return R.consumo_final_gwh[a][i];
    if (ind === 'perdidas') return R.perdidas_gwh[a][i];
    if (ind === 'pperd') { const p = R.perdidas_gwh[a][i], c = R.consumo_final_gwh[a][i]; return (100 * p) / (p + c); }
    if (ind === 'usuarios' || ind === 'kwh') {
      const campo = ind === 'usuarios' ? 'usuarios_pct' : 'kwh_hab';
      if (g) return g[campo];
      if (k === 'SIBC') return sb('SIBC')[campo];
      if (k === 'SIBCS') return sb('SIBCS+SIMUL')[campo]; // dato conjunto
      return null; // SIMUL: incluido en SIBCS
    }
    return null;
  }
  function mapa() {
    M = L.map('mapa', { scrollWheelZoom: false, zoomSnap: 0.25 });
    M.attributionControl.setPrefix(false).addAttribution('Contorno: Natural Earth');
    const edoSis = { 'Baja California': 'SIBC', 'Baja California Sur': 'SIBCS' };
    const capa = L.geoJSON(GEO, { style: (f) => ({ color: '#fff', weight: 1, fillColor: SIS_C[edoSis[f.properties.nombre] || 'SIN'], fillOpacity: 0.16 }), interactive: false }).addTo(M);
    M.fitBounds(capa.getBounds(), { padding: [10, 10] });
    burbujas = L.layerGroup().addTo(M);
    pintar();
  }
  function pintar() {
    $$('[data-ind]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.ind === st.ind)));
    $$('[data-anio]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.anio === st.anio)));
    const I = IND[st.ind];
    $('#anio-r').classList.toggle('inactivo', !I.anual);
    burbujas.clearLayers();
    const vals = REG.map((k) => valor(k, st.ind, st.anio)).filter((v) => v != null);
    const max = Math.max(...vals);
    REG.forEach((k) => {
      const v = valor(k, st.ind, st.anio), z = T.zonas.find((x) => x.nombre === ANCLA[k]);
      if (v == null) return;
      const r = 6 + 34 * Math.sqrt(v / max);
      const et = k === 'SIBCS' && !I.anual ? 'SIBCS+SIMUL' : k;
      const c = L.circleMarker([z.lat, z.lon], { radius: r, color: '#fff', weight: 2, fillColor: SIS_C[sisDe(k)], fillOpacity: st.sel && st.sel !== k ? 0.35 : 0.8 })
        .bindTooltip(`<strong>${et}</strong> · ${fmt(v, I.d)} ${I.u}`, { direction: 'top' })
        .on('click', () => { st.sel = k; pintar(); });
      burbujas.addLayer(c);
      if (r > 16) burbujas.addLayer(L.marker([z.lat, z.lon], { icon: L.divIcon({ className: '', html: `<span class="b-et">${k}</span>`, iconSize: null }), interactive: false }));
    });
    $('#ley-mapa').innerHTML = Object.entries(SIS_C).map(([k, c]) => `<li><i style="background:${c};border-radius:50%"></i>${k}</li>`).join('') + `<li class="gris">Área del círculo proporcional al indicador</li>`;
    detalle();
    $('#fuente-mapa').innerHTML = `<strong>Usuarios y kWh por habitante:</strong> ${PLAN}, sección 2.5 (pp. 27-33), solo 2024; el Plan da SIBCS y SIMUL juntos. <strong>Consumo final y pérdidas:</strong> Plan, Anexo, Tablas A1.1 y A1.2 (p. 101). ${CA} <strong>Pérdidas %</strong> = pérdidas ÷ (consumo final + pérdidas); para todo el SEN da ${fmt(valor('SEN', 'pperd', 2024), 1)} % en 2024, mientras que el Plan publica 12.3 % «respecto del consumo neto» (p. 15), que usa otra base. Las burbujas se ubican en la ciudad que el Plan nombra como zona principal de cada región (coordenadas de Natural Earth).`;
  }
  function detalle() {
    const el = $('#detalle'), k = st.sel;
    if (!k) {
      el.innerHTML = `<div class="cab-det"><h3>Todo el país</h3>${OF}</div>
        <dl><dt>Usuarios de CFE</dt><dd>${fmt(nac('usuarios').valor, 1)} millones</dd><dt>Redes de distribución</dt><dd>${fmt(nac('km_rgd').valor)} mil km</dd><dt>Consumo final ${st.anio}</dt><dd>${fmt(valor('SEN', 'consumo', st.anio))} GWh</dd><dt>Pérdidas ${st.anio}</dt><dd>${fmt(valor('SEN', 'perdidas', st.anio))} GWh</dd><dt>Electrificación</dt><dd>${fmt(nac('electrif').valor, 2)} %</dd></dl>
        <p class="mini-nota">Toca una burbuja para ver una región.</p>
        <p class="fuente">${CFE24}, pp. 95-96; Plan, Anexo A1, p. 101.</p>`;
      return;
    }
    const a = st.anio, f = (ind) => { const v = valor(k, ind, a); return v == null ? ND : `${fmt(v, IND[ind].d)} ${IND[ind].u}`; };
    const conj = k === 'SIBCS' || k === 'SIMUL';
    el.innerHTML = `<div class="cab-det"><span class="zona grande-z" style="--c:${SIS_C[sisDe(k)]}">${k}</span><div><h3>${nombre(k)}</h3><p class="ubic">${sisDe(k) === 'SIN' ? 'Sistema Interconectado Nacional' : 'GCR Baja California'}</p></div></div>
      <h4 class="sub-det">Usuarios atendidos</h4><dl><dt>Del total del país, 2024</dt><dd>${k === 'SIMUL' ? 'Incluido en SIBCS + SIMUL' : f('usuarios')}${conj && k === 'SIBCS' ? ' (SIBCS + SIMUL)' : ''}</dd><dt>Consumo por habitante</dt><dd>${k === 'SIMUL' ? 'Incluido en SIBCS + SIMUL' : f('kwh')}</dd></dl>
      <h4 class="sub-det">Energía ${a}</h4><dl><dt>Consumo final</dt><dd>${f('consumo')}</dd><dt>Pérdidas (RNT + RGD)</dt><dd>${f('perdidas')}</dd><dt>Pérdidas % ${CA}</dt><dd>${f('pperd')}</dd></dl>
      <h4 class="sub-det">Longitud de red</h4><p>${ND}</p><p class="gris">La CFE solo publica el total nacional: ${fmt(nac('km_rgd').valor)} mil km.</p>
      <button type="button" class="enlace" id="ver-pais">Ver todo el país</button>`;
    $('#ver-pais').onclick = () => { st.sel = null; pintar(); };
  }

  /* ---------- Divisiones ---------- */
  function divisiones() {
    $$('[data-div]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.div === st.div)));
    $$('[data-da]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.da === st.da)));
    const gd = D.distribucion.divisiones_gd_solicitudes, q = X.quejas_profeco;
    const S = st.div === 'gd' ? { datos: gd.datos, nac: gd.nacional, anios: gd.anios, n: 'solicitudes', pag: gd.pagina, col: '#1baf7a' } : { datos: q.datos, nac: q.nacional, anios: q.anios, n: 'quejas', pag: q.pagina, col: '#e34948' };
    const i = S.anios.indexOf(st.da);
    const filas = Object.entries(S.datos).map(([k, v]) => [k, v[i], v]).sort((a, b) => b[1] - a[1]);
    const data = { labels: filas.map((x) => x[0]), datasets: [{ data: filas.map((x) => x[1]), backgroundColor: S.col, borderRadius: 4 }] };
    if (charts.div) { charts.div.data = data; charts.div.update(); }
    else charts.div = new Chart($('#g-div'), { type: 'bar', data,
      options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (c) => `${fmt(c.raw)} ${st.div === 'gd' ? 'solicitudes' : 'quejas'}` } } },
        scales: { x: { ticks: { callback: (x) => fmt(x) }, grid: { color: '#EAF3FF' } }, y: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 11 } } } } } });
    const tot = S.nac[i], top3 = filas.slice(0, 3), pct3 = (100 * top3.reduce((s, x) => s + x[1], 0)) / tot;
    $('#intro-div').textContent = `La CFE organiza la distribución en 16 divisiones y 150 zonas (${CFE24}, p. ${nac('divisiones').pagina}). No publica usuarios, kilómetros ni pérdidas por división; sí publica estos dos indicadores.`;
    $('#desc-div').textContent = st.div === 'gd'
      ? `${fmt(tot)} solicitudes en ${st.da}. ${X.solicitudes_gd_texto.texto} Las tres divisiones con más: ${top3.map((x) => x[0]).join(', ')} (${fmt(pct3, 0)} % del total).`
      : `${fmt(tot)} quejas en ${st.da}. Las tres divisiones con más: ${top3.map((x) => x[0]).join(', ')} (${fmt(pct3, 0)} % del total).`;
    $('#tabla-div').innerHTML = `<table><thead><tr><th>División</th>${S.anios.map((a) => `<th>${a}</th>`).join('')}</tr></thead><tbody>${Object.entries(S.datos).map(([k, v]) => `<tr><td>${k}</td>${v.map((x) => `<td>${fmt(x)}</td>`).join('')}</tr>`).join('')}<tr><td><strong>Nacional (impreso)</strong></td>${S.nac.map((x) => `<td><strong>${fmt(x)}</strong></td>`).join('')}</tr></tbody></table>`;
    $('#fuente-div').innerHTML = `<span class="alcance">CFE</span> ${CFE24}, p. ${S.pag}${st.div === 'gd' ? '-124' : ''}. ${st.div === 'gd' ? 'Nota: en 2023 la suma de las 16 divisiones da 82,392 y el total impreso es 82,528 (diferencia de 136 en el propio informe).' : X.quejas_profeco.nota}`;
  }

  /* ---------- Red y calidad ---------- */
  function red() {
    const mt = nac('km_mt'), bt = nac('km_bt'), sub = nac('km_subt');
    charts.redes = new Chart($('#g-redes'), { type: 'bar',
      data: { labels: ['Media tensión', 'Baja tensión', 'Subtransmisión'], datasets: [{ data: [mt.valor, bt.valor, sub.valor], backgroundColor: ['#2F80ED', '#FFC22E', '#0F4DBC'], borderRadius: 6 }] },
      options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (c) => `${fmt(c.raw)} km` } } },
        scales: { x: { ticks: { callback: (x) => fmt(x / 1000) + ' mil' }, grid: { color: '#EAF3FF' } }, y: { grid: { display: false } } } } });
    const sb = nac('subest_d'), tp = nac('tr_pot'), td = nac('tr_dist');
    $('#equipos').innerHTML = [[sb.valor, 'subestaciones'], [tp.valor, 'transformadores de potencia'], [td.valor, 'transformadores de distribución']].map((x) => `<div><b>${fmt(x[0])}</b><span>${x[1]}</span></div>`).join('');
    $('#fuente-redes').innerHTML = `<span class="alcance">CFE</span> ${CFE24}, p. ${mt.pagina}. Media + baja tensión = ${fmt(mt.valor + bt.valor)} km ${CA}, que coincide con los 901 mil km de la p. 95. Definiciones de media y baja tensión: ${PLAN}, p. 21.`;
  }
  function calidad() {
    const tb = D.distribucion.tablero_2022_2024, an = [2022, 2023, 2024];
    const def = {
      'Pérdidas de energía (incluye alta tensión)': 'Energía que entra a la red de CFE Distribución y no se factura, contando también la alta tensión.',
      'Pérdidas de energía (MT+BT)': 'Lo mismo, solo en media y baja tensión, donde ocurren las pérdidas técnicas y no técnicas de la distribución.',
      SAIDI: 'Minutos promedio que cada usuario se quedó sin luz en el año.',
      SAIFI: 'Número promedio de interrupciones por usuario en el año.',
    };
    $('#calidad').innerHTML = Object.entries(tb.datos).map(([k, [u, v]], j) => {
      const cambio = 100 * (v[2] / v[0] - 1);
      return `<div class="kpi-mini"><span class="k"><dfn class="def" tabindex="0">${k.replace('Pérdidas de energía', 'Pérdidas')}<span class="def-texto" role="tooltip">${def[k]}</span></dfn></span><b>${fmt(v[2], 3).replace(/0+$/, '').replace(/\.$/, '')} <small>${u}</small></b><div class="mini"><canvas id="c-${j}" role="img" aria-label="${k} 2022 a 2024"></canvas></div><small class="${cambio < 0 ? 'mejora' : 'empeora'}">${cambio < 0 ? '▼' : '▲'} ${fmt(Math.abs(cambio), 1)} % desde 2022</small></div>`;
    }).join('');
    Object.entries(tb.datos).forEach(([k, [u, v]], j) => {
      charts['c' + j] = new Chart($('#c-' + j), { type: 'line',
        data: { labels: an, datasets: [{ data: v, borderColor: '#0F4DBC', backgroundColor: '#0F4DBC', pointRadius: 3, borderWidth: 2.5 }] },
        options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (c) => `${fmt(c.raw, 3)} ${u}` } } },
          scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { display: false, grace: '20%' } } } });
    });
    $('#fuente-cal').innerHTML = `<span class="alcance">CFE</span> ${CFE24}, tablero de CFE Distribución, p. ${tb.pagina}. ▼ = bajó (mejora). No confundir con el SAIDI de CFE Transmisión (10.812 min en 2024, p. 90), que mide otra red.`;
  }

  /* ---------- Tarifas ---------- */
  function tarifas() {
    const t = D.distribucion.usuarios_por_tarifa_2024, d = t.datos;
    const G = [
      ['Doméstico', ['Doméstico bajo consumo', 'Doméstico alto consumo'], '#2a78d6'],
      ['Comercial', ['Comercial'], '#6250d6'],
      ['Agrícola', ['Agrícola con subsidio', 'Agrícola sin subsidio'], '#1baf7a'],
      ['Alumbrado público', ['Alumbrado público'], '#e87ba4'],
      ['Mediana industria', ['Mediana industria'], '#eb6834'],
      ['Gran industria', ['Gran industria'], '#e34948'],
      ['Último recurso', ['Último recurso'], '#98A2B3'],
    ];
    const tot = [0, 1].map((j) => Object.values(d).reduce((s, x) => s + x[j], 0));
    const val = G.map(([n, ks, c]) => ({ n, c, u: ks.reduce((s, k) => s + d[k][0], 0), e: ks.reduce((s, k) => s + d[k][1], 0) }));
    $('#ley-tar').innerHTML = val.map((x) => `<li><i style="background:${x.c}"></i>${x.n}</li>`).join('');
    charts.tar = new Chart($('#g-tar'), { type: 'bar',
      data: { labels: ['Usuarios', 'Consumo (GWh)'], datasets: val.map((x) => ({ label: x.n, data: [(100 * x.u) / tot[0], (100 * x.e) / tot[1]], backgroundColor: x.c, borderColor: '#fff', borderWidth: 2, borderSkipped: false, abs: [x.u, x.e] })) },
      options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.raw, 2)} % (${fmt(c.dataset.abs[c.dataIndex])} ${c.dataIndex ? 'GWh' : 'usuarios'})` } } },
        scales: { x: { stacked: true, max: 100, ticks: { callback: (x) => x + ' %' }, grid: { color: '#EAF3FF' } }, y: { stacked: true, grid: { display: false } } } } });
    $('#tabla-tar').innerHTML = `<table><thead><tr><th>Tarifa</th><th>Usuarios</th><th>Consumo (GWh)</th></tr></thead><tbody>${Object.entries(d).map(([k, v]) => `<tr><td>${k}</td><td>${fmt(v[0])}</td><td>${fmt(v[1])}</td></tr>`).join('')}<tr><td><strong>Total (cálculo)</strong></td><td><strong>${fmt(tot[0])}</strong></td><td><strong>${fmt(tot[1])}</strong></td></tr></tbody></table>`;
    const dom = val[0], ind = { u: val[4].u + val[5].u, e: val[4].e + val[5].e };
    const kd = (dom.e * 1e6) / dom.u, ki = (ind.e * 1e6) / ind.u;
    $('#contraste').innerHTML = `
      <div class="contraste" style="--c:#2a78d6"><span class="k">Doméstico</span><b>${fmt((100 * dom.u) / tot[0], 1)} %</b><span>de los usuarios</span><b>${fmt((100 * dom.e) / tot[1], 1)} %</b><span>del consumo</span><small>${fmt(kd)} kWh al año por usuario ${CA}</small></div>
      <div class="contraste" style="--c:#eb6834"><span class="k">Mediana y gran industria</span><b>${fmt((100 * ind.u) / tot[0], 1)} %</b><span>de los usuarios</span><b>${fmt((100 * ind.e) / tot[1], 1)} %</b><span>del consumo</span><small>${fmt(ki)} kWh al año por usuario ${CA}, unas ${fmt(ki / kd)} veces lo de un usuario doméstico</small></div>`;
    $('#fuente-tar').innerHTML = `<span class="alcance">CFE</span> ${CFE24}, pp. ${t.pagina}, Suministro Básico. Porcentajes y kWh por usuario: cálculo propio. <strong>Aviso:</strong> el informe imprime intercambiadas las filas de mediana y gran industria; se corrigieron con el Informe 2023 (ver bitácora de verificación). Todo el SEN (incluye suministro calificado): residencial 89.2 % de usuarios y 27.1 % del consumo; empresa mediana y gran industria 0.9 % y 60.6 % (${PLAN}, p. 13).`;
  }

  /* ---------- Simulador de transformador ---------- */
  const DEF = { vp: 13800, a: 60, s: 75 };
  function simulador() {
    $('#vp-rapidos').innerHTML = [13800, 34500].map((v) => `<button type="button" class="filtro" data-vp="${v}">${fmt(v)} V</button>`).join('');
    ['vp', 'a', 's'].forEach((k) => {
      const s = $('#s-' + k), n = $('#n-' + k);
      s.addEventListener('input', () => { n.value = s.value; calc(); });
      n.addEventListener('input', () => { const x = Math.min(+n.max, Math.max(+n.min, +n.value || +n.min)); s.value = x; calc(); });
      n.addEventListener('change', () => { n.value = s.value; });
    });
    $$('[data-vp]').forEach((b) => b.addEventListener('click', () => { $('#s-vp').value = $('#n-vp').value = b.dataset.vp; calc(); }));
    $('#t-reset').addEventListener('click', () => { Object.entries(DEF).forEach(([k, x]) => { $('#s-' + k).value = $('#n-' + k).value = x; }); calc(); });
    charts.tv = new Chart($('#g-tv'), { type: 'bar',
      data: { labels: ['Tensión (V)', 'Corriente (A)'], datasets: [{ label: 'Primario', data: [], backgroundColor: '#0F4DBC', borderRadius: 4 }, { label: 'Secundario', data: [], backgroundColor: '#F5A300', borderRadius: 4 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.raw, 2)} ${c.dataIndex ? 'A' : 'V'}` } } },
        scales: { y: { type: 'logarithmic', ticks: { callback: (x) => ([1, 10, 100, 1000, 10000, 100000, 1e6].includes(x) ? fmt(x) : '') }, grid: { color: '#EAF3FF' } }, x: { grid: { display: false } } } } });
    const as = []; for (let a = 1; a <= 200; a += 1) as.push(a);
    charts.ta = new Chart($('#g-ta'), { type: 'line',
      data: { datasets: [{ label: 'Vs', data: [], borderColor: '#F5A300', pointRadius: 0, borderWidth: 3 }, { label: 'Tu relación', type: 'scatter', data: [], pointRadius: 8, pointBackgroundColor: '#FFC22E', pointBorderColor: '#0B2A5B', pointBorderWidth: 2 }] },
      options: { maintainAspectRatio: false, parsing: false, plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { title: (it) => `Np/Ns = ${fmt(it[0].parsed.x, 1)}`, label: (c) => `Vs = ${fmt(c.parsed.y, 1)} V` } } },
        scales: { x: { type: 'logarithmic', min: 0.5, max: 200, title: { display: true, text: 'Relación de espiras Np/Ns (escala log)' }, ticks: { callback: (x) => ([0.5, 1, 2, 5, 10, 20, 50, 100, 200].includes(x) ? x : '') }, grid: { color: '#EAF3FF' } },
          y: { type: 'logarithmic', title: { display: true, text: 'Vs (V, escala log)' }, ticks: { callback: (x) => ([1, 10, 100, 1000, 10000, 100000].includes(x) ? fmt(x) : '') }, grid: { color: '#EAF3FF' } } } } });
    charts.ta._as = [0.5, ...as];
    calc();
  }
  function calc() {
    const Vp = +$('#s-vp').value, a = +$('#s-a').value, S = +$('#s-s').value * 1000;
    const Vs = Vp / a, Ip = S / Vp, Is = S / Vs;
    $('#o-vs').textContent = `${fmt(Vs, Vs < 100 ? 2 : 1)} V`;
    $('#o-ip').textContent = `${fmt(Ip, 2)} A`;
    $('#o-is').textContent = `${fmt(Is, Is < 100 ? 2 : 1)} A`;
    $('#o-chk').textContent = `${fmt(Vp * Ip)} VA = ${fmt(Vs * Is)} VA ✓`;
    $('#o-tipo').innerHTML = `<p class="mini-nota">${a > 1 ? `<strong>Reductor:</strong> la tensión baja ${fmt(a, 1)} veces y la corriente sube ${fmt(a, 1)} veces.` : a < 1 ? `<strong>Elevador:</strong> la tensión sube ${fmt(1 / a, 2)} veces y la corriente baja lo mismo. Así trabajan los transformadores a la salida de una central.` : '<strong>Relación 1:1:</strong> la tensión y la corriente no cambian (transformador de aislamiento).'}</p>`;
    $('#o-pasos').innerHTML = `<ol>
      <li>Unidades: S = ${fmt(S / 1000)} kVA = ${fmt(S)} VA; V<sub>p</sub> = ${fmt(Vp)} V.</li>
      <li>V<sub>s</sub> = V<sub>p</sub> / (N<sub>p</sub>/N<sub>s</sub>) = ${fmt(Vp)} / ${fmt(a, 1)} = <strong>${fmt(Vs, 2)} V</strong></li>
      <li>I<sub>p</sub> = S / V<sub>p</sub> = ${fmt(S)} / ${fmt(Vp)} = <strong>${fmt(Ip, 3)} A</strong></li>
      <li>I<sub>s</sub> = S / V<sub>s</sub> = ${fmt(S)} / ${fmt(Vs, 2)} = <strong>${fmt(Is, 2)} A</strong></li>
      <li>Comprobación: I<sub>s</sub> / I<sub>p</sub> = ${fmt(Is / Ip, 2)} = N<sub>p</sub>/N<sub>s</sub>.</li></ol>`;
    trafo(a, Vp, Vs, Ip, Is);
    charts.tv.data.datasets[0].data = [Vp, Ip]; charts.tv.data.datasets[1].data = [Vs, Is]; charts.tv.update('none');
    charts.ta.data.datasets[0].data = charts.ta._as.map((x) => ({ x, y: Vp / x }));
    charts.ta.data.datasets[1].data = [{ x: a, y: Vs }]; charts.ta.update('none');
  }
  function trafo(a, Vp, Vs, Ip, Is) {
    // Número de vueltas dibujadas: proporcional a la relación, acotado para que se lea
    const np = a >= 1 ? 9 : Math.max(2, Math.round(9 * a)), ns = a >= 1 ? Math.max(2, Math.round(9 / a)) : 9;
    const bob = (x, n, col) => { const h = 120 / n; let d = ''; for (let i = 0; i < n; i++) { const y = 40 + i * h; d += `<path d="M${x - 14} ${y} q 28 ${h / 2} 0 ${h}" fill="none" stroke="${col}" stroke-width="4" stroke-linecap="round"/>`; } return d; };
    const w = (I) => Math.max(2, Math.min(12, 1.5 + Math.log10(I + 1) * 3));
    $('#trafo').innerHTML = `<svg viewBox="0 0 360 200">
      <rect x="120" y="30" width="120" height="140" rx="14" fill="none" stroke="#98A2B3" stroke-width="16"/>
      ${bob(128, np, '#0F4DBC')}${bob(232, ns, '#F5A300')}
      <line x1="20" y1="40" x2="114" y2="40" stroke="#0F4DBC" stroke-width="${w(Ip)}" stroke-linecap="round"/><line x1="20" y1="160" x2="114" y2="160" stroke="#0F4DBC" stroke-width="${w(Ip)}" stroke-linecap="round"/>
      <line x1="246" y1="40" x2="340" y2="40" stroke="#F5A300" stroke-width="${w(Is)}" stroke-linecap="round"/><line x1="246" y1="160" x2="340" y2="160" stroke="#F5A300" stroke-width="${w(Is)}" stroke-linecap="round"/>
      <text x="20" y="100" class="tr-t">${fmt(Vp)} V</text><text x="20" y="118" class="tr-s">${fmt(Ip, 2)} A</text>
      <text x="340" y="100" class="tr-t" text-anchor="end">${fmt(Vs, Vs < 100 ? 1 : 0)} V</text><text x="340" y="118" class="tr-s" text-anchor="end">${fmt(Is, 1)} A</text>
      <text x="180" y="195" class="tr-s" text-anchor="middle">Np : Ns = ${fmt(a, 1)} : 1 · grosor del cable ∝ corriente</text></svg>`;
  }

  function revelar() {
    const els = $$('.revelar');
    if (reduce || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('visible')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); Object.values(charts).forEach((c) => c.resize && c.resize()); M && M.invalidateSize(); } }), { threshold: 0.05 });
    els.forEach((e) => io.observe(e));
  }
})();
