/* Atlas Eléctrico · Módulo 2 · Transmisión
   Datos: datos/atlas-datos.json (Etapa 2) y datos/transmision.json (scripts/construir_transmision.py).
   Contorno de estados: datos/mx-estados.geojson (Natural Earth). Ninguna cifra se escribe a mano aquí. */
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

  const DOC = { PLAN: 'Plan de Desarrollo del Sector Eléctrico 2025-2030 (DOF 17/10/2025)', CFE24: 'CFE, Informe Anual 2024', CFE23: 'CFE, Informe Anual 2023' };
  const cita = (f, p) => `${DOC[f] || f}, p. ${p}`;

  // Sistemas: color validado + código corto (la identidad nunca va solo por color)
  const SIS = {
    SIN: { n: 'Sistema Interconectado Nacional', c: '#2a78d6', cod: 'SIN' },
    SIBC: { n: 'Sistema Interconectado Baja California', c: '#eb6834', cod: 'BC' },
    SIBCS: { n: 'Sistema Interconectado Baja California Sur', c: '#6250d6', cod: 'BCS' },
    SIMUL: { n: 'Sistema Interconectado Mulegé', c: '#1baf7a', cod: 'MU' },
  };
  const EDO_SIS = { 'Baja California': ['SIBC'], 'Baja California Sur': ['SIBCS', 'SIMUL'], 'Sonora': ['SIN', 'SIBC'] };
  const sisDe = (edo) => EDO_SIS[edo] || ['SIN'];
  const SEQ = ['#DCEBFF', '#8EC5FF', '#2F80ED', '#0F4DBC', '#0B2A5B'];
  const SIN_META = '#F2F4F7';

  let D, T, GEO, M, capaEdos, zonasCapa;
  const st = { capa: 'sis', met: 'km_c', gcr: null, edo: null, rubro: 'km_c' };
  const charts = {};

  Promise.all(['datos/atlas-datos.json', 'datos/transmision.json', 'datos/mx-estados.geojson'].map((u) => fetch(u).then((r) => { if (!r.ok) throw new Error(u); return r.json(); })))
    .then(([d, t, g]) => { D = d; T = t; GEO = g; iniciar(); })
    .catch((err) => { console.error(err);
      $('#hero-stats').innerHTML = '<div class="nodisp" style="grid-column:1/-1"><strong>No se pudieron cargar los datos.</strong>Abre el sitio desde un servidor (GitHub Pages o «python -m http.server»).</div>'; });

  function iniciar() {
    heroStats(); mapa(); chipsGcr(); detalle(); esquema(); hechos();
    graficaKm(); graficaMva(); graficaDem(); graficaObras(); simulador();
    $$('[data-capa]').forEach((b) => b.addEventListener('click', () => { st.capa = b.dataset.capa; pintar(); }));
    $$('[data-met]').forEach((b) => b.addEventListener('click', () => { st.met = b.dataset.met; pintar(); }));
    $$('[data-r]').forEach((b) => b.addEventListener('click', () => { st.rubro = b.dataset.r; graficaObras(); }));
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
    const tx = D.transmision, km = tx.km_por_tension, i = km.anios.indexOf(2024);
    const cfe = (id) => tx.cfe_transmision.find((x) => x.id === id);
    const lt = cfe('km_lt'), mv = cfe('mva_t');
    const items = [
      ['h1', 'Líneas de transmisión 2024', 'CFE', lt.valor[2], 0, 'km', `${cita('CFE24', lt.pagina)}`],
      ['h2', 'Líneas de 400 kV 2024', 'Nacional', km.datos['400 kV'][i], 0, 'km', `Plan, Tabla 2.3, p. ${km.pagina}`],
      ['h3', 'Transformación 2024', 'CFE', mv.valor[2], 0, 'MVA', `${cita('CFE24', mv.pagina)}`],
      ['h4', 'Obras de línea instruidas', 'Nacional', T.metas.instruidas.por_tension.km_c_total, 1, 'km-c', `Plan, Tabla 4.10, p. ${T.metas.instruidas.por_tension.pagina}`],
    ];
    $('#hero-stats').innerHTML = items.map((x) => `<div class="hstat"><div class="k"><span>${x[1]}</span><em>${x[2]}</em></div><div class="v"><span id="${x[0]}">0</span> <small>${x[5]}</small></div><div class="f">${x[6]}</div></div>`).join('');
    items.forEach((x) => contar($('#' + x[0]), x[3], x[4]));
  }

  /* ---------- Mapa ---------- */
  function mapa() {
    M = L.map('mapa', { scrollWheelZoom: false, zoomSnap: 0.25, attributionControl: true, zoomControl: true });
    M.attributionControl.setPrefix(false).addAttribution('Contorno: Natural Earth');
    capaEdos = L.geoJSON(GEO, {
      style: estilo,
      onEachFeature: (f, ly) => {
        ly.on({ click: () => { st.edo = f.properties.nombre; st.gcr = null; pintar(); },
                mouseover: () => ly.setStyle({ weight: 3 }), mouseout: () => capaEdos.resetStyle(ly) });
        ly.bindTooltip(() => tip(f.properties.nombre), { sticky: true, className: 'tip-edo' });
      },
    }).addTo(M);
    zonasCapa = L.layerGroup(T.zonas.map((z) => {
      const s = SIS[z.sistema];
      const ic = L.divIcon({ className: '', html: `<span class="zona" style="--c:${s.c}">${z.sistema === 'SIN' ? z.gcr : s.cod}</span>`, iconSize: null, iconAnchor: [0, 0] });
      return L.marker([z.lat, z.lon], { icon: ic, keyboard: true, title: z.nombre })
        .bindPopup(`<strong>${z.nombre}</strong> · ${s.n}<br>${z.texto}<br><small>${cita(z.fuente, z.pagina)}</small>`);
    })).addTo(M);
    M.fitBounds(capaEdos.getBounds(), { padding: [10, 10] });
    window.addEventListener('resize', () => M.fitBounds(capaEdos.getBounds(), { padding: [10, 10] }));
    pintar();
  }
  const gcrDe = (edo) => T.gcr.filter((g) => g.estados.includes(edo));
  const obraDe = (edo) => T.metas.instruidas.por_entidad.find((x) => x.entidad === edo);
  function cortes() {
    const vals = T.metas.instruidas.por_entidad.map((x) => x[st.met]).filter((x) => x != null && x > 0).sort((a, b) => a - b);
    const q = (p) => vals[Math.min(vals.length - 1, Math.floor(p * vals.length))];
    return [q(0.2), q(0.4), q(0.6), q(0.8)];
  }
  function colorObra(v) {
    if (v == null || v === 0) return SIN_META;
    const c = cortes(); let k = 0; while (k < 4 && v > c[k]) k++; return SEQ[k];
  }
  function estilo(f) {
    const n = f.properties.nombre;
    if (st.capa === 'obras') {
      const o = obraDe(n), v = o ? o[st.met] : null;
      return { color: '#fff', weight: 1, fillColor: colorObra(v), fillOpacity: 1, dashArray: v ? null : '3 3' };
    }
    const s = sisDe(n), comp = s.length > 1;
    const enGcr = st.gcr ? T.gcr.find((g) => g.id === st.gcr).estados.includes(n) : true;
    const selEdo = st.edo === n;
    return {
      color: selEdo ? '#FFC22E' : comp ? SIS[s[1]].c : '#fff', weight: selEdo ? 4 : comp ? 2.5 : 1, dashArray: comp && !selEdo ? '6 4' : null,
      fillColor: SIS[s[0]].c, fillOpacity: st.gcr ? (enGcr ? 0.85 : 0.12) : 0.55,
    };
  }
  function tip(n) {
    if (st.capa === 'obras') {
      const o = obraDe(n); const u = { km_c: 'km-c', mva: 'MVA', mvar: 'MVAr' }[st.met];
      const v = o ? o[st.met] : null;
      return `<strong>${n}</strong><br>${v == null ? 'Sin meta registrada («---»)' : fmt(v, 1) + ' ' + u}`;
    }
    const g = gcrDe(n).map((x) => x.nombre).join(', ') || '—';
    return `<strong>${n}</strong><br>${sisDe(n).join(' y ')}<br><small>GCR: ${g}</small>`;
  }
  function pintar() {
    $$('[data-capa]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.capa === st.capa)));
    $$('[data-met]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.met === st.met)));
    $('#metrica').hidden = st.capa !== 'obras';
    $('#chips-gcr').hidden = st.capa !== 'sis';
    $$('#chips-gcr button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.gcr === st.gcr)));
    capaEdos.setStyle(estilo);
    if (st.capa === 'sis') zonasCapa.addTo(M); else zonasCapa.remove();
    leyenda(); detalle();
    $('#fuente-mapa').innerHTML = st.capa === 'sis'
      ? `<strong>Sistemas:</strong> ${cita('PLAN', T.conexion[0].pagina)}. <strong>Estados de cada GCR:</strong> los que el Plan menciona en la sección 2.5 (pp. ${T.gcr[0].pagina}-${T.gcr[7].pagina_estados}); un estado puede aparecer en dos GCR porque sus límites no siguen los límites estatales. <strong>Zonas:</strong> ciudades que el Plan nombra en cada GCR, ubicadas con Natural Earth. El Plan dibuja las 100 regiones de transmisión en su Figura 2.1 (p. ${T.conexion[0].pagina}); aquí no se reproducen sus límites ni sus enlaces.`
      : `<strong>Fuente:</strong> ${cita('PLAN', T.metas.instruidas.pagina_entidad)}, Tabla 4.11 «Metas físicas de los proyectos de ampliación y modernización de la RNT por entidad federativa instruidos hasta 2024». Gris punteado: la tabla marca «---». Colores por quintiles de los estados con meta. ${T.metas.instruidas.nota}`;
  }
  function leyenda() {
    if (st.capa === 'sis') {
      $('#ley-mapa').innerHTML = `<ul class="leyenda">${Object.entries(SIS).map(([k, s]) => `<li><span class="zona" style="--c:${s.c}">${s.cod}</span>${k}</li>`).join('')}<li><i class="rayado"></i>Estado con dos sistemas</li></ul>`;
    } else {
      const c = cortes(), u = { km_c: 'km-c', mva: 'MVA', mvar: 'MVAr' }[st.met];
      const r = [`≤ ${fmt(c[0])}`, `${fmt(c[0])}–${fmt(c[1])}`, `${fmt(c[1])}–${fmt(c[2])}`, `${fmt(c[2])}–${fmt(c[3])}`, `> ${fmt(c[3])}`];
      $('#ley-mapa').innerHTML = `<ul class="leyenda"><li class="grupo-ley">${u}</li>${SEQ.map((col, k) => `<li><i style="background:${col}"></i>${r[k]}</li>`).join('')}<li><i style="background:${SIN_META};border:1px dashed #98A2B3"></i>Sin meta</li></ul>`;
    }
  }
  function chipsGcr() {
    $('#chips-gcr').innerHTML = `<span class="grupo-ley">Gerencia</span>` + T.gcr.map((g) => `<button type="button" class="filtro" data-gcr="${g.id}" aria-pressed="false"><b>${g.id}</b> ${g.nombre}</button>`).join('');
    $$('#chips-gcr button').forEach((b) => b.addEventListener('click', () => { st.gcr = st.gcr === b.dataset.gcr ? null : b.dataset.gcr; st.edo = null; pintar(); }));
  }

  /* ---------- Panel de detalle ---------- */
  const R = () => D.regiones;
  function regional(clave) {
    const i = R().claves.indexOf(clave); if (i < 0) return null;
    return { cf: R().consumo_final_gwh['2024'][i], per: R().perdidas_gwh['2024'][i], cb: R().consumo_bruto_gwh['2024'][i], dem: D.transmision.sistemas.demanda_max_2024_mwh_h[clave] };
  }
  function bloqueReg(clave, titulo) {
    const r = regional(clave); if (!r) return '';
    return `<h4 class="sub-det">${titulo} · 2024</h4><dl>
      <dt>Demanda máxima</dt><dd>${fmt(r.dem)} MWh/h</dd>
      <dt>Consumo bruto</dt><dd>${fmt(r.cb)} GWh</dd>
      <dt>Consumo final</dt><dd>${fmt(r.cf)} GWh</dd>
      <dt>Pérdidas (RNT + RGD)</dt><dd>${fmt(r.per)} GWh</dd></dl>`;
  }
  function detalle() {
    const el = $('#detalle');
    if (st.capa === 'obras') {
      const n = st.edo;
      if (!n) { el.innerHTML = rankingObras(); return; }
      const o = obraDe(n), id = T.metas.identificadas_2025.por_entidad.find((x) => x.entidad === n);
      const v = (x, u) => (x == null ? '<span class="gris">Sin meta («---»)</span>' : `${fmt(x, 1)} ${u}`);
      el.innerHTML = `<div class="cab-det"><h3>${n}</h3>${OF}</div>
        <h4 class="sub-det">Obras instruidas hasta 2024</h4>
        <dl><dt>Líneas</dt><dd>${v(o && o.km_c, 'km-c')}</dd><dt>Transformación</dt><dd>${v(o && o.mva, 'MVA')}</dd><dt>Compensación</dt><dd>${v(o && o.mvar, 'MVAr')}</dd></dl>
        <h4 class="sub-det">Obras identificadas en 2025 (no instruidas)</h4>
        ${id ? `<dl><dt>Líneas</dt><dd>${v(id.km_c, 'km-c')}</dd><dt>Transformación</dt><dd>${v(id.mva, 'MVA')}</dd><dt>Compensación</dt><dd>${v(id.mvar, 'MVAr')}</dd></dl>` : '<p class="gris">El estado no aparece en la Tabla 4.13.</p>'}
        <p class="fuente">Plan, Tabla 4.11 (p. ${T.metas.instruidas.pagina_entidad}) y Tabla 4.13 (p. ${T.metas.identificadas_2025.pagina}). <button type="button" class="enlace" id="ver-rank">Ver el ranking</button></p>`;
      $('#ver-rank').onclick = () => { st.edo = null; detalle(); };
      return;
    }
    if (st.gcr) {
      const g = T.gcr.find((x) => x.id === st.gcr);
      const datos = g.id === 'BC'
        ? T.subsistemas_bc.map((s) => `<h4 class="sub-det">${s.nombre}</h4><dl><dt>Territorio</dt><dd>${fmt(s.territorio, 1)} %</dd><dt>Población</dt><dd>${fmt(s.poblacion_mill, 1)} millones (${fmt(s.poblacion_pct, 1)} %)</dd><dt>Usuarios del país</dt><dd>${fmt(s.usuarios_pct, 1)} %</dd><dt>Consumo por habitante</dt><dd>${fmt(s.kwh_hab)} kWh</dd>${s.reparto_demanda ? `<dt>Reparto de demanda</dt><dd>SIBCS ${fmt(s.reparto_demanda.SIBCS, 1)} % · SIMUL ${fmt(s.reparto_demanda.SIMUL, 1)} %</dd>` : ''}</dl>`).join('') +
          ['SIBC', 'SIBCS', 'SIMUL'].map((k) => bloqueReg(k, k)).join('')
        : `<dl><dt>Territorio</dt><dd>${fmt(g.territorio, 1)} %</dd><dt>Población</dt><dd>${fmt(g.poblacion_mill, 1)} millones (${fmt(g.poblacion_pct, 1)} %)</dd><dt>Usuarios del país</dt><dd>${fmt(g.usuarios_pct, 1)} %</dd><dt>Consumo por habitante</dt><dd>${fmt(g.kwh_hab)} kWh</dd><dt>Localidades sin electrificar</dt><dd>${fmt(g.localidades)}</dd></dl>` + bloqueReg(g.id, 'Energía');
      el.innerHTML = `<div class="cab-det"><span class="zona grande-z" style="--c:${SIS[g.id === 'BC' ? 'SIBC' : 'SIN'].c}">${g.id}</span><div><h3>GCR ${g.nombre}</h3><p class="ubic">${g.sistema}</p></div></div>
        ${OF}${datos}
        <p class="mini-nota"><strong>Estados que menciona el Plan:</strong> ${g.estados.join(', ')}.${g.nota_edos ? ' ' + g.nota_edos : ''}</p>
        <p class="fuente">${cita('PLAN', g.pagina)} (sección 2.5)${g.pagina_estados !== g.pagina ? ` y p. ${g.pagina_estados}` : ''}; energía 2024: Plan, Anexo A1 (pp. 101-103).</p>`;
      return;
    }
    if (st.edo) {
      const n = st.edo, s = sisDe(n), gs = gcrDe(n);
      el.innerHTML = `<div class="cab-det"><h3>${n}</h3></div>
        <p>${s.map((k) => `<span class="zona" style="--c:${SIS[k].c}">${SIS[k].cod}</span> ${SIS[k].n}`).join('<br>')}</p>
        <p class="mini-nota">${gs.length ? `El Plan menciona este estado en ${gs.length === 1 ? 'la GCR' : 'las GCR'} ${gs.map((g) => `<button type="button" class="enlace" data-ir="${g.id}">${g.nombre}</button>`).join(' y ')}.` : 'El Plan no menciona este estado en las listas de la sección 2.5.'}
        ${s.length > 1 ? ' Parte del estado pertenece a un sistema y parte a otro; el Plan no publica el límite exacto en texto.' : ''}</p>
        <p class="gris">Los datos de energía se publican por gerencia, no por estado. Elige una gerencia para verlos.</p>`;
      $$('[data-ir]', el).forEach((b) => b.addEventListener('click', () => { st.gcr = b.dataset.ir; st.edo = null; pintar(); }));
      return;
    }
    const sen = regional('SEN');
    el.innerHTML = `<div class="cab-det"><h3>Sistema Eléctrico Nacional</h3></div>${OF}
      <dl><dt>Gerencias de control</dt><dd>8</dd><dt>Regiones de transmisión</dt><dd>100</dd><dt>Sistemas interconectados</dt><dd>4</dd></dl>
      ${bloqueReg('SEN', 'Todo el país')}
      <p class="mini-nota">Toca una gerencia arriba o un estado en el mapa. Los marcadores son ciudades que el Plan menciona como zonas importantes de cada sistema.</p>
      <p class="fuente">${cita('PLAN', T.conexion[0].pagina)}; energía: Plan, Anexo A1 (pp. 101-103).</p>`;
    void sen;
  }
  function rankingObras() {
    const u = { km_c: 'km-c', mva: 'MVA', mvar: 'MVAr' }[st.met];
    const filas = T.metas.instruidas.por_entidad.filter((x) => x[st.met]).sort((a, b) => b[st.met] - a[st.met]);
    const max = filas[0][st.met];
    const tot = T.metas.instruidas.por_tension[st.met + '_total'];
    return `<div class="cab-det"><h3>Estados con más obras</h3>${OF}</div>
      <p class="gris">${fmt(tot, 1)} ${u} en total. Toca un estado para ver su detalle.</p>
      <ol class="ranking">${filas.map((x) => `<li><button type="button" data-e="${x.entidad}"><span>${x.entidad}</span><i style="width:${(100 * x[st.met]) / max}%"></i><b>${fmt(x[st.met], 1)}</b></button></li>`).join('')}</ol>`;
  }
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-e]'); if (b) { st.edo = b.dataset.e; pintar(); } });

  /* ---------- Esquema de conexiones ---------- */
  function esquema() {
    const sin = T.gcr.filter((g) => g.sistema === 'SIN');
    const C = T.comercio.por_gcr;
    // Posiciones de los nodos dentro de la caja del SIN (disposición esquemática, no geográfica)
    const pos = { NOR: [75, 140], NTE: [185, 140], NES: [295, 140], PEN: [405, 140], OCC: [120, 225], CEN: [240, 225], ORI: [360, 225] };
    const nodo = (g) => { const [x, y] = pos[g.id]; return `<g class="nodo" tabindex="0" data-n="${g.id}" role="button" aria-label="GCR ${g.nombre}"><circle cx="${x}" cy="${y}" r="30"/><text x="${x}" y="${y + 5}">${g.id}</text></g>`; };
    const comercio = Object.keys(C).filter((k) => k !== 'BC').map((k) => { const [x, y] = pos[k]; return `<path class="flujo-int" d="M${x} ${y - 30} Q ${x} 40 ${560} 40"/>`; }).join('');
    $('#esquema').innerHTML = `<svg viewBox="0 0 760 305" role="img" aria-labelledby="esq-t esq-d">
      <title id="esq-t">Esquema de conexión de los sistemas eléctricos de México</title>
      <desc id="esq-d">El SIN agrupa siete gerencias. SIBC, SIBCS y SIMUL son tres sistemas distintos, fuera del SIN. Cuatro gerencias intercambian energía con otros países.</desc>
      <rect class="caja-sin" x="20" y="70" width="440" height="220" rx="22"/>
      <text class="et-caja" x="36" y="96">SIN · 7 gerencias</text>
      <text class="et-mini" x="36" y="278">Enlaces entre regiones: Plan, Figura 2.1 (no reproducida)</text>
      ${sin.map(nodo).join('')}
      <rect class="caja-int" x="500" y="16" width="240" height="48" rx="14"/>
      <text class="et-caja" x="620" y="38" text-anchor="middle">Otros países</text>
      <text class="et-mini" x="620" y="55" text-anchor="middle">EUA · Belice · Guatemala</text>
      ${comercio}
      <path class="flujo-int" d="M560 120 Q 600 90 610 64"/>
      <g class="sis-bc" data-n="SIBC" tabindex="0" role="button" aria-label="SIBC"><rect x="520" y="120" width="210" height="44" rx="12" style="--c:#eb6834"/><text x="625" y="147">SIBC</text></g>
      <g class="sis-bc" data-n="SIBCS" tabindex="0" role="button" aria-label="SIBCS"><rect x="520" y="190" width="100" height="44" rx="12" style="--c:#6250d6"/><text x="570" y="217">SIBCS</text></g>
      <g class="sis-bc" data-n="SIMUL" tabindex="0" role="button" aria-label="SIMUL"><rect x="630" y="190" width="100" height="44" rx="12" style="--c:#1baf7a"/><text x="680" y="217">SIMUL</text></g>
      <text class="et-caja" x="625" y="268" text-anchor="middle">GCR Baja California</text>
      <text class="et-mini" x="625" y="286" text-anchor="middle">3 sistemas distintos</text>
      <g class="corte"><line x1="466" y1="180" x2="514" y2="180"/><line x1="481" y1="165" x2="491" y2="195"/><line x1="489" y1="165" x2="499" y2="195"/></g>
      <text class="et-mini" x="490" y="212" text-anchor="middle">sin</text><text class="et-mini" x="490" y="225" text-anchor="middle">enlace</text>
    </svg>
    <ul class="leyenda" style="margin-top:8px"><li><i style="background:#FFC22E"></i>Intercambio con otros países (2024)</li><li><i class="corte-i"></i>Sin enlace</li></ul>`;
    const info = (k) => {
      const g = T.gcr.find((x) => x.id === k);
      const c = C[k] || (k.startsWith('SI') && k !== 'SIN' ? null : null);
      const r = regional(k);
      let t = '';
      if (g) t = `<strong>GCR ${g.nombre}</strong> · forma parte del SIN.`;
      if (k === 'SIBC') t = `<strong>SIBC</strong> · separado del SIN. Su gerencia (Baja California) concentró ${fmt(C.BC.imp, 1)} % de las importaciones y ${fmt(C.BC.exp, 1)} % de las exportaciones del país en 2024.`;
      if (k === 'SIBCS') t = '<strong>SIBCS</strong> · la CFE lo llama «Sistema Eléctrico Aislado Baja California Sur». El Plan lo cuenta como un sistema distinto del SIN y del SIBC.';
      if (k === 'SIMUL') t = '<strong>SIMUL</strong> · sistema pequeño de la zona de Mulegé (Santa Rosalía, Guerrero Negro). Tiene 4.7 % de la demanda de SIBCS + SIMUL.';
      if (c && g) t += ` Comercio exterior 2024: ${fmt(c.imp, 1)} % de las importaciones y ${fmt(c.exp, 1)} % de las exportaciones.`;
      if (r) t += ` Demanda máxima 2024: ${fmt(r.dem)} MWh/h.`;
      $('#esq-info').innerHTML = t;
      $$('#esquema [data-n]').forEach((n) => n.classList.toggle('activo', n.dataset.n === k));
    };
    $$('#esquema [data-n]').forEach((n) => {
      ['mouseenter', 'focus', 'click'].forEach((ev) => n.addEventListener(ev, () => info(n.dataset.n)));
      n.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); info(n.dataset.n); } });
    });
    $('#esquema').insertAdjacentHTML('beforeend', '<p class="esq-info" id="esq-info" aria-live="polite">Pasa el cursor o toca un bloque para ver qué dicen los documentos.</p>');
  }
  function hechos() {
    const C = T.comercio;
    $('#hechos-conexion').innerHTML = `<h3>Lo que dicen los documentos</h3>
      <ol class="hechos">${T.conexion.map((h) => `<li>${h.texto}<small>${cita(h.fuente, h.pagina)}</small></li>`).join('')}</ol>
      <h4 class="sub-det">Comercio exterior de electricidad, 2024</h4>
      <div class="comercio"><div><span>Importaciones</span><b>${fmt(C.importaciones_gwh)} GWh</b></div><div><span>Exportaciones</span><b>${fmt(C.exportaciones_gwh)} GWh</b></div></div>
      <div class="lienzo" style="height:150px"><canvas id="g-com" role="img" aria-label="Participación de cada gerencia en importaciones y exportaciones 2024"></canvas></div>
      <p class="fuente">${cita('PLAN', C.pagina)}. ${C.nota}</p>`;
    const ids = Object.keys(C.por_gcr), nom = (k) => T.gcr.find((g) => g.id === k).nombre;
    charts.com = new Chart($('#g-com'), {
      type: 'bar',
      data: { labels: ['Importaciones', 'Exportaciones'], datasets: ids.map((k, j) => ({ label: nom(k), data: [C.por_gcr[k].imp, C.por_gcr[k].exp], backgroundColor: ['#eb6834', '#6250d6', '#1baf7a', '#2a78d6'][j], borderColor: '#fff', borderWidth: 2, borderSkipped: false })) },
      options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } }, tooltip: { ...TIP, callbacks: { label: (c) => `${c.dataset.label}: ${fmt(c.raw, 1)} %` } } },
        scales: { x: { stacked: true, max: 100, ticks: { callback: (x) => x + ' %' }, grid: { color: '#EAF3FF' } }, y: { stacked: true, grid: { display: false } } } },
    });
  }

  /* ---------- Indicadores ---------- */
  const KV_COL = { '400 kV': '#0B2A5B', '230 kV': '#0F4DBC', '161 kV': '#2F80ED', '138 kV': '#5B9DF0', '115 kV': '#8EC5FF', '85 kV': '#F5A300', '69 kV': '#FFC22E' };
  function graficaKm() {
    const k = D.transmision.km_por_tension, tens = Object.keys(k.datos);
    $('#chips-kv').innerHTML = tens.map((t) => `<button type="button" class="filtro" data-kv="${t}" aria-pressed="true"><i class="pt" style="background:${KV_COL[t]}"></i>${t}</button>`).join('');
    charts.km = new Chart($('#g-km'), {
      type: 'bar',
      data: { labels: k.anios, datasets: tens.map((t) => ({ label: t, data: k.datos[t], backgroundColor: KV_COL[t], borderColor: '#fff', borderWidth: { top: 2 }, borderSkipped: false })) },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...TIP, mode: 'index', callbacks: { label: (c) => `${c.dataset.label}: ${c.raw == null ? 'sin dato' : fmt(c.raw) + ' km'}`, footer: (it) => `Total visible: ${fmt(it.reduce((s, c) => s + (c.raw || 0), 0))} km` } } },
        scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { callback: (x) => fmt(x) }, title: { display: true, text: 'km' }, grid: { color: '#EAF3FF' } } } },
    });
    $$('[data-kv]').forEach((b) => b.addEventListener('click', () => {
      const i = tens.indexOf(b.dataset.kv), vis = charts.km.isDatasetVisible(i);
      charts.km.setDatasetVisibility(i, !vis); b.setAttribute('aria-pressed', String(!vis)); charts.km.update();
    }));
    $('#tabla-km').innerHTML = `<table><thead><tr><th>Año</th>${tens.map((t) => `<th>${t}</th>`).join('')}<th>161-400 kV</th><th>69-138 kV</th></tr></thead><tbody>${k.anios.map((a, i) => `<tr><td>${a}</td>${tens.map((t) => `<td>${k.datos[t][i] == null ? '—' : fmt(k.datos[t][i])}</td>`).join('')}<td>${fmt(k.total_161_400[i])}</td><td>${fmt(k.total_69_138[i])}</td></tr>`).join('')}</tbody></table>`;
    const i = k.anios.indexOf(2024), tot = k.total_161_400[i] + k.total_69_138[i];
    $('#fuente-km').innerHTML = `<span class="alcance">Nacional</span> ${cita('PLAN', k.pagina)}, Tabla 2.3. 85 kV no tiene dato de 2010 a 2016 («—»). ${CA} 2024: ${fmt(k.total_161_400[i])} + ${fmt(k.total_69_138[i])} = ${fmt(tot)} km, la misma cifra que reporta la CFE (${cita('CFE24', D.transmision.cfe_transmision[0].pagina)}). La RNT incluye tensiones iguales o mayores a 69 kV (Plan, p. 21).`;
  }
  function graficaMva() {
    const m = D.transmision.mva, a = D.transmision.km_por_tension.anios;
    charts.mva = new Chart($('#g-mva'), {
      type: 'line',
      data: { labels: a, datasets: [
        { label: 'RNT', data: m.rnt, borderColor: '#0F4DBC', backgroundColor: '#0F4DBC', pointRadius: 3, borderWidth: 2.5, tension: 0.2 },
        { label: 'RGD del MEM', data: m.rgd_mem, borderColor: '#F5A300', backgroundColor: '#F5A300', pointRadius: 3, borderWidth: 2.5, tension: 0.2, spanGaps: false } ] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...TIP, mode: 'index', intersect: false, callbacks: { label: (c) => `${c.dataset.label}: ${c.raw == null ? 'sin dato' : fmt(c.raw) + ' MVA'}` } } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: (x) => fmt(x / 1000) + ' mil' }, grid: { color: '#EAF3FF' } } } },
    });
    $('#fuente-mva').innerHTML = `<span class="alcance">Nacional</span> ${cita('PLAN', m.pagina)}, Tabla 2.4. RGD sin dato antes de 2016. La serie de la RNT baja en 2017 tal como aparece en la tabla. ${m.nota} <span class="alcance">CFE</span> Para comparar: CFE Transmisión reporta ${fmt(D.transmision.cfe_transmision[2].valor[2])} MVA en 2024 (${cita('CFE24', D.transmision.cfe_transmision[2].pagina)}); son conteos con alcance distinto.`;
  }
  function graficaDem() {
    const d = D.transmision.sistemas.demanda_max_2024_mwh_h;
    const ks = ['OCC', 'NES', 'ORI', 'CEN', 'NOR', 'NTE', 'SIBC', 'PEN', 'SIBCS', 'SIMUL'];
    const col = (k) => (SIS[k] ? SIS[k].c : SIS.SIN.c);
    charts.dem = new Chart($('#g-dem'), {
      type: 'bar',
      data: { labels: ks.map((k) => (T.gcr.find((g) => g.id === k) || { nombre: k }).nombre), datasets: [{ data: ks.map((k) => d[k]), backgroundColor: ks.map(col), borderRadius: 4 }] },
      options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (c) => `${fmt(c.raw)} MWh/h` } } },
        scales: { x: { ticks: { callback: (x) => fmt(x) }, grid: { color: '#EAF3FF' } }, y: { grid: { display: false } } } },
    });
    $('#fuente-dem').innerHTML = `<span class="alcance">Nacional</span> Plan, Anexo, Tabla A1.5, p. 103. Azul: gerencias del SIN; naranja, morado y verde: SIBC, SIBCS y SIMUL. SEN: ${fmt(d.SEN)} MWh/h; SIN: ${fmt(d.SIN)} MWh/h. Las demandas de cada región ocurren a horas distintas, por eso no suman el total.`;
  }
  function graficaObras() {
    const t = T.metas.instruidas.por_tension, r = st.rubro, u = { km_c: 'km-c', mva: 'MVA', mvar: 'MVAr' }[r];
    $$('[data-r]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.r === r)));
    const data = { labels: t.tensiones, datasets: [{ data: t[r].map((x) => x ?? 0), backgroundColor: t.tensiones.map((x) => KV_COL[x] || '#98A2B3'), borderRadius: 4 }] };
    if (charts.obras) { charts.obras.data = data; charts.obras.options.plugins.tooltip.callbacks.label = (c) => (t[r][c.dataIndex] == null ? 'Sin meta («---»)' : `${fmt(c.raw, 1)} ${u}`); charts.obras.update(); }
    else charts.obras = new Chart($('#g-obras'), { type: 'bar', data,
      options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { ...TIP, callbacks: { label: (c) => (t[r][c.dataIndex] == null ? 'Sin meta («---»)' : `${fmt(c.raw, 1)} ${u}`) } } },
        scales: { x: { grid: { display: false } }, y: { ticks: { callback: (x) => fmt(x) }, grid: { color: '#EAF3FF' } } } } });
    $('#desc-obras').textContent = `Total: ${fmt(t[r + '_total'], 1)} ${u}. Son proyectos que la SENER instruyó a la CFE y que aún no operan.`;
    $('#fuente-obras').innerHTML = `<span class="alcance">Nacional</span> ${cita('PLAN', t.pagina)}, Tabla 4.10. Barras en cero: la tabla marca «---» o 0. <dfn class="def" tabindex="0">km-c<span class="def-texto" role="tooltip">Kilómetros-circuito: longitud de la línea multiplicada por el número de circuitos. Una línea de doble circuito de 10 km suma 20 km-c.</span></dfn> · <dfn class="def" tabindex="0">MVAr<span class="def-texto" role="tooltip">Megavoltamperes reactivos: capacidad de los equipos de compensación (capacitores, reactores) que controlan la tensión de la red.</span></dfn>.`;
  }

  /* ---------- Simulador ---------- */
  const DEF = { p: 500, v: 400, r: 10, f: 1 };
  const KV_STD = [69, 115, 230, 400];
  function calc(P, V, R, f) { const I = (P * 1e6) / (Math.sqrt(3) * V * 1e3 * f); const Pl = (3 * I * I * R) / 1e6; return { I, Pl, pct: (100 * Pl) / P, S: P / f }; }
  function simulador() {
    $('#kv-rapidos').innerHTML = KV_STD.map((k) => `<button type="button" class="filtro" data-kvr="${k}">${k} kV</button>`).join('');
    const par = (k) => [$('#s-' + k), $('#n-' + k)];
    ['p', 'v', 'r', 'f'].forEach((k) => {
      const [s, n] = par(k);
      s.addEventListener('input', () => { n.value = s.value; actualizar(); });
      n.addEventListener('input', () => { const x = Math.min(+n.max, Math.max(+n.min, +n.value || +n.min)); s.value = x; actualizar(); });
      n.addEventListener('change', () => { n.value = s.value; });
    });
    $$('[data-kvr]').forEach((b) => b.addEventListener('click', () => { $('#s-v').value = $('#n-v').value = b.dataset.kvr; actualizar(); }));
    $('#s-reset').addEventListener('click', () => { Object.entries(DEF).forEach(([k, x]) => { $('#s-' + k).value = $('#n-' + k).value = x; }); actualizar(); });
    const vs = []; for (let v = 69; v <= 400; v += 1) vs.push(v);
    charts.curva = new Chart($('#g-curva'), {
      type: 'line',
      data: { labels: vs, datasets: [
        { label: 'Pérdidas', data: [], borderColor: '#e34948', backgroundColor: '#e34948', pointRadius: 0, borderWidth: 3, yAxisID: 'y', tension: 0 },
        { label: 'Corriente', data: [], borderColor: '#0F4DBC', backgroundColor: '#0F4DBC', pointRadius: 0, borderWidth: 2.5, borderDash: [6, 4], yAxisID: 'y1', tension: 0 },
        { label: 'Tu tensión', data: [], type: 'scatter', pointRadius: 8, pointBackgroundColor: '#FFC22E', pointBorderColor: '#0B2A5B', pointBorderWidth: 2, yAxisID: 'y' } ] },
      options: { maintainAspectRatio: false, parsing: false, interaction: { mode: 'nearest', axis: 'x', intersect: false },
        plugins: { legend: { display: false }, tooltip: { ...TIP, filter: (c) => c.datasetIndex < 2, callbacks: { title: (it) => `${it[0].parsed.x} kV`, label: (c) => (c.datasetIndex === 0 ? `Pérdidas: ${fmt(c.parsed.y, 2)} % de P` : `Corriente: ${fmt(c.parsed.y)} A`) } } },
        scales: { x: { type: 'linear', min: 69, max: 400, title: { display: true, text: 'Tensión entre líneas (kV)' }, ticks: { stepSize: 50 }, grid: { color: '#EAF3FF' } },
          y: { position: 'left', beginAtZero: true, title: { display: true, text: 'Pérdidas (% de P)' }, grid: { color: '#EAF3FF' } },
          y1: { position: 'right', beginAtZero: true, title: { display: true, text: 'Corriente (A)' }, grid: { display: false }, ticks: { callback: (x) => fmt(x) } } } },
    });
    $('#fuente-sim').innerHTML = `Fórmulas del enunciado del proyecto (TE1020). Definición de pérdidas técnicas: ${cita('PLAN', 15)}. Tensiones de botón rápido: niveles de la Tabla 2.3 del Plan (p. ${D.transmision.km_por_tension.pagina}). ${CA} Todos los resultados del simulador son cálculos con los valores que eliges.`;
    animarLinea(); actualizar();
  }
  let animI = 0, animPct = 0;
  function actualizar() {
    const P = +$('#s-p').value, V = +$('#s-v').value, R = +$('#s-r').value, f = +$('#s-f').value;
    const r = calc(P, V, R, f);
    $('#o-i').textContent = `${fmt(r.I)} A`;
    $('#o-pl').textContent = `${fmt(r.Pl, 2)} MW`;
    $('#o-pc').textContent = `${fmt(r.pct, 2)} %`;
    $('#o-pr').textContent = r.Pl < P ? `${fmt(P - r.Pl, 1)} MW` : '—';
    $('#o-s').textContent = `${fmt(r.S, 1)} MVA`;
    $('#o-bar').style.width = Math.min(100, r.pct) + '%';
    $('#o-bar').style.background = r.pct < 5 ? '#1baf7a' : r.pct < 15 ? '#F5A300' : '#e34948';
    $('#o-aviso').innerHTML = r.pct >= 100
      ? '<p class="aviso">Las pérdidas calculadas igualan o superan la potencia enviada: el modelo deja de tener sentido físico. En la realidad la tensión se desplomaría antes.</p>'
      : r.pct >= 15 ? '<p class="aviso">Pérdidas muy altas: con esta corriente la línea se calentaría demasiado. Prueba con una tensión mayor.</p>' : '';
    $('#o-pasos').innerHTML = `<ol>
      <li>Convertir unidades: P = ${fmt(P)} MW = ${fmt(P * 1e6)} W; V = ${fmt(V)} kV = ${fmt(V * 1e3)} V.</li>
      <li>I = ${fmt(P * 1e6)} / (1.732 × ${fmt(V * 1e3)} × ${fmt(f, 2)}) = <strong>${fmt(r.I, 1)} A</strong></li>
      <li>P<sub>pérdidas</sub> = 3 × (${fmt(r.I, 1)})² × ${fmt(R, 1)} = ${fmt(r.Pl * 1e6)} W = <strong>${fmt(r.Pl, 2)} MW</strong></li>
      <li>Porcentaje = ${fmt(r.Pl, 2)} / ${fmt(P)} × 100 = <strong>${fmt(r.pct, 2)} %</strong></li></ol>`;
    $('#lv-i').textContent = `I = ${fmt(r.I)} A`;
    $('#lv-p').textContent = `Pérdidas: ${fmt(r.pct, 1)} %`;
    // color del cable: frío (azul) a caliente (rojo) según pérdidas
    const k = Math.min(1, r.pct / 30); $('#calor-fin').setAttribute('stop-color', mezcla('#2F80ED', '#e34948', k));
    animI = r.I; animPct = r.pct;
    const c = charts.curva, pts = c.data.labels.map((v) => calc(P, v, R, f));
    c.data.datasets[0].data = c.data.labels.map((v, i) => ({ x: v, y: Math.min(pts[i].pct, 200) }));
    c.data.datasets[1].data = c.data.labels.map((v, i) => ({ x: v, y: pts[i].I }));
    c.data.datasets[2].data = [{ x: V, y: Math.min(r.pct, 200) }];
    c.update('none');
    $('#tensiones').innerHTML = `<h3 class="t-tens">Misma potencia, cuatro tensiones de la red mexicana</h3><div class="tens-rej">${KV_STD.map((v) => {
      const x = calc(P, v, R, f), rel = x.Pl / calc(P, 400, R, f).Pl;
      return `<div class="tension${v === V ? ' actual' : ''}"><span class="kv">${v} kV</span><dl><dt>Corriente</dt><dd>${fmt(x.I)} A</dd><dt>Pérdidas</dt><dd>${fmt(x.Pl, 1)} MW</dd><dt>% de P</dt><dd>${x.pct >= 100 ? 'No viable (≥ 100 %)' : `${fmt(x.pct, 1)} %`}</dd></dl><div class="medidor"><div style="width:${Math.min(100, x.pct)}%;background:${x.pct < 5 ? '#1baf7a' : x.pct < 15 ? '#F5A300' : '#e34948'}"></div></div><small>${v === 400 ? 'Referencia' : `${fmt(rel, 1)} veces las pérdidas a 400 kV`}</small></div>`;
    }).join('')}</div><p class="mini-nota">Las pérdidas son proporcionales a 1/V²: al pasar de 115 a 400 kV, la corriente baja ${fmt(400 / 115, 2)} veces y las pérdidas ${fmt((400 / 115) ** 2, 1)} veces. Por eso las líneas troncales que unen regiones operan a 400 kV.</p>`;
  }
  function mezcla(a, b, k) { const h = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16)); const A = h(a), B = h(b); return '#' + A.map((x, i) => Math.round(x + (B[i] - x) * k).toString(16).padStart(2, '0')).join(''); }
  function animarLinea() {
    const g = $('#cargas'), cable = $('#cable'), L0 = cable.getTotalLength();
    const N = 14; g.innerHTML = Array.from({ length: N }, () => '<circle r="5" class="carga"/>').join('');
    const cs = $$('circle', g); let off = 0, t0 = performance.now();
    const paso = (t) => {
      const dt = Math.min(64, t - t0); t0 = t;
      const vel = Math.min(0.5, 0.02 + animI / 9000); // proporcional a la corriente
      off = (off + vel * dt) % (L0 / N);
      cs.forEach((c, i) => { const p = cable.getPointAtLength((off + (i * L0) / N) % L0); c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', 3 + Math.min(4, animI / 900)); });
      if (!reduce) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }

  function revelar() {
    const els = $$('.revelar');
    if (reduce || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('visible')); return; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); Object.values(charts).forEach((c) => c.resize()); M && M.invalidateSize(); } }), { threshold: 0.05 });
    els.forEach((e) => io.observe(e));
  }
})();
